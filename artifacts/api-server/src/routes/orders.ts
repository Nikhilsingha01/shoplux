import { Router } from "express";
import { eq, desc, sql, and } from "drizzle-orm";
import crypto from "crypto";
import {
  db,
  ordersTable,
  orderItemsTable,
  addressesTable,
  productsTable,
  couponsTable,
  appUsersTable,
  adminSettingsTable,
  returnsTable,
} from "@workspace/db";
import {
  ListOrdersQueryParams,
  CreateOrderBody,
  GetOrderParams,
  UpdateOrderStatusParams,
  UpdateOrderStatusBody,
  CreatePaymentOrderBody,
  VerifyPaymentBody,
} from "@workspace/api-zod";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { logger } from "../lib/logger";
import {
  sendOrderPlacedEmail,
  sendPaymentSuccessEmail,
  sendOrderStatusEmail,
  type OrderEmailData,
} from "../lib/email";

const router = Router();

(async () => {
  try {
    console.log("Running programmatic database migration for returns table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS returns (
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        order_item_id INTEGER NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL,
        reason TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);
    // Add bank details + image columns if missing
    await db.execute(sql`ALTER TABLE returns ADD COLUMN IF NOT EXISTS image_url TEXT;`);
    await db.execute(sql`ALTER TABLE returns ADD COLUMN IF NOT EXISTS bank_name TEXT;`);
    await db.execute(sql`ALTER TABLE returns ADD COLUMN IF NOT EXISTS account_number TEXT;`);
    await db.execute(sql`ALTER TABLE returns ADD COLUMN IF NOT EXISTS ifsc_code TEXT;`);
    await db.execute(sql`ALTER TABLE returns ADD COLUMN IF NOT EXISTS account_holder TEXT;`);

    // Add per-product delivery charge and trust badges
    await db.execute(sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS delivery_charge NUMERIC(10, 2) DEFAULT 0;`);
    await db.execute(sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS is_delivery_charge_applicable BOOLEAN DEFAULT false;`);
    await db.execute(sql`ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS trust_badge_1 TEXT DEFAULT 'Free delivery on orders above ₹999';`);
    await db.execute(sql`ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS trust_badge_2 TEXT DEFAULT 'Secure & encrypted payments';`);
    await db.execute(sql`ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS trust_badge_3 TEXT DEFAULT '7-day hassle-free returns';`);
    console.log("Database migration for returns table COMPLETED SUCCESSFULLY");
  } catch (err: any) {
    console.error("Database migration for returns table FAILED:", err);
  }
})();

// ─── Helper: build full order response ───────────────────────────────────────

async function buildOrderResponse(order: typeof ordersTable.$inferSelect) {
  const items = await db
    .select()
    .from(orderItemsTable)
    .where(eq(orderItemsTable.orderId, order.id));

  let address = null;
  if (order.addressId) {
    const [addr] = await db.select().from(addressesTable).where(eq(addressesTable.id, order.addressId));
    address = addr ?? null;
  }

  // Fetch returns for these items
  const itemReturns = await db
    .select()
    .from(returnsTable)
    .where(eq(returnsTable.orderId, order.id));

  // Compute customer-relative order number
  const countResult = await db.execute(
    sql`SELECT COUNT(*) as cnt FROM orders WHERE user_id = ${order.userId} AND created_at <= ${order.createdAt}`
  );
  const customerOrderNumber = Number((countResult.rows[0] as any)?.cnt ?? 1);

  const itemsWithReturnStatus = items.map((i) => {
    const ret = itemReturns.find((r) => r.orderItemId === i.id);
    return {
      ...i,
      price: Number(i.price),
      productImage: i.productImage?.startsWith("/api/uploads/") ? i.productImage.replace("/api/uploads/", "/uploads/") : i.productImage,
      returnStatus: ret ? ret.status : null,
      returnReason: ret ? ret.reason : null,
      returnId: ret ? ret.id : null,
      returnImageUrl: ret ? (ret as any).image_url ?? null : null,
      returnBankDetails: ret ? {
        bankName: (ret as any).bank_name,
        accountNumber: (ret as any).account_number,
        ifscCode: (ret as any).ifsc_code,
        accountHolder: (ret as any).account_holder,
      } : null,
    };
  });

  return {
    ...order,
    totalAmount: Number(order.totalAmount),
    subtotal: Number(order.subtotal),
    deliveryCharge: Number(order.deliveryCharge),
    discount: Number(order.discount),
    createdAt: order.createdAt instanceof Date ? order.createdAt.toISOString() : order.createdAt,
    items: itemsWithReturnStatus,
    address,
    customerOrderNumber,
  };
}

// ─── Helper: build email data from a full order response ─────────────────────

async function buildEmailData(
  fullOrder: Awaited<ReturnType<typeof buildOrderResponse>>,
  storeName: string
): Promise<OrderEmailData | null> {
  const email = fullOrder.customerEmail;
  if (!email) return null;

  return {
    orderId: fullOrder.id,
    customerName: fullOrder.customerName ?? "Valued Customer",
    customerEmail: email,
    status: fullOrder.status,
    paymentMethod: fullOrder.paymentMethod,
    paymentStatus: fullOrder.paymentStatus,
    totalAmount: fullOrder.totalAmount,
    subtotal: fullOrder.subtotal,
    deliveryCharge: fullOrder.deliveryCharge,
    discount: fullOrder.discount,
    couponCode: fullOrder.couponCode,
    razorpayPaymentId: fullOrder.razorpayPaymentId,
    items: fullOrder.items.map((i) => ({
      productName: i.productName,
      productImage: i.productImage,
      quantity: i.quantity,
      price: i.price,
      variant: i.variant,
    })),
    address: fullOrder.address
      ? {
          fullName: fullOrder.address.fullName,
          addressLine: fullOrder.address.addressLine,
          landmark: fullOrder.address.landmark,
          city: fullOrder.address.city,
          state: fullOrder.address.state,
          pincode: fullOrder.address.pincode,
          phone: fullOrder.address.phone,
        }
      : null,
    storeName,
    createdAt:
      fullOrder.createdAt instanceof Date
        ? fullOrder.createdAt.toISOString()
        : String(fullOrder.createdAt),
  };
}

// ─── GET /orders — list ───────────────────────────────────────────────────────

router.get("/orders", requireAuth, async (req, res): Promise<void> => {
  const parsed = ListOrdersQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const userId = (req as typeof req & { userId: string }).userId;
  const { status, page = 1, limit = 20 } = parsed.data;
  const offset = (page - 1) * limit;

  const adminToken = req.headers["x-admin-token"];
  const [settings] = await db.select().from(adminSettingsTable).limit(1);
  const [appUser] = await db.select().from(appUsersTable).where(eq(appUsersTable.clerkUserId, userId)).limit(1);

  const isSettingAdmin = settings?.adminClerkUserId && settings.adminClerkUserId === userId;
  const isUserTableAdmin = appUser?.isAdmin === true;
  const isAdmin = userId === "admin" || !!isSettingAdmin || isUserTableAdmin || adminToken === "shopluxadmin";
  
  console.log("DIAGNOSTIC /orders - userId:", userId);
  console.log("DIAGNOSTIC /orders - settings?.adminClerkUserId:", settings?.adminClerkUserId);
  console.log("DIAGNOSTIC /orders - appUser?.isAdmin:", appUser?.isAdmin);
  console.log("DIAGNOSTIC /orders - req.query.admin:", req.query.admin);
  
  // Only grant admin visibility if ?admin=true is explicitly requested
  // This ensures the customer-facing /orders page only shows the user's own orders,
  // even if they happen to be an admin or have the admin token in localStorage.
  const hasAdminRights = userId === "admin" || !!isSettingAdmin || isUserTableAdmin || adminToken === "shopluxadmin";
  const finalIsAdmin = req.query.admin === "true" && hasAdminRights;
  
  console.log("DIAGNOSTIC /orders - finalIsAdmin:", finalIsAdmin);

  const conditions = [];
  if (!finalIsAdmin) {
    conditions.push(eq(ordersTable.userId, userId));
    console.log("DIAGNOSTIC /orders - Filtering by userId:", userId);
  } else {
    console.log("DIAGNOSTIC /orders - Admin detected, fetching ALL orders");
  }
  if (status) conditions.push(eq(ordersTable.status, status));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [orders, countResult] = await Promise.all([
    db
      .select()
      .from(ordersTable)
      .where(whereClause)
      .orderBy(desc(ordersTable.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(ordersTable).where(whereClause),
  ]);

  const ordersWithDetails = await Promise.all(orders.map(buildOrderResponse));

  res.json({
    orders: ordersWithDetails,
    total: Number(countResult[0].count),
    page,
    limit,
  });
});

// ─── POST /orders — create ────────────────────────────────────────────────────

router.post("/orders", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const userId = (req as typeof req & { userId: string }).userId;
  const {
    items,
    addressId,
    paymentMethod,
    totalAmount,
    subtotal,
    deliveryCharge,
    discount,
    couponCode,
    razorpayOrderId,
  } = parsed.data;

  // Get address for customer info
  const [address] = await db.select().from(addressesTable).where(eq(addressesTable.id, addressId));

  // Resolve customer email from app_users
  const [appUser] = await db
    .select()
    .from(appUsersTable)
    .where(eq(appUsersTable.clerkUserId, userId))
    .limit(1);

  const [settings] = await db.select().from(adminSettingsTable).limit(1);
  const storeName = settings?.storeName ?? "ShopLux";

  const [order] = await db
    .insert(ordersTable)
    .values({
      userId,
      status: "pending",
      paymentMethod,
      paymentStatus: "pending",
      totalAmount: String(totalAmount),
      subtotal: String(subtotal ?? totalAmount),
      deliveryCharge: String(deliveryCharge ?? 0),
      discount: String(discount ?? 0),
      couponCode,
      razorpayOrderId,
      addressId,
      customerName: address?.fullName ?? appUser?.fullName,
      customerEmail: address?.email ?? appUser?.email,
      customerPhone: address?.phone ?? appUser?.phone,
    })
    .returning();

  // Insert order items and decrement stock
  for (const item of items) {
    const [product] = await db
      .select()
      .from(productsTable)
      .where(eq(productsTable.id, item.productId))
      .limit(1);

    await db.insert(orderItemsTable).values({
      orderId: order.id,
      productId: item.productId,
      productName: product?.name ?? "Unknown Product",
      productImage: product?.images?.[0] ?? null,
      price: String(item.price),
      quantity: item.quantity,
      variant: item.variant,
    });

    if (product) {
      await db
        .update(productsTable)
        .set({ stock: Math.max(0, product.stock - item.quantity) })
        .where(eq(productsTable.id, item.productId));
    }
  }

  // Increment coupon usage
  if (couponCode) {
    const [coupon] = await db
      .select()
      .from(couponsTable)
      .where(eq(couponsTable.code, couponCode))
      .limit(1);
    if (coupon) {
      await db
        .update(couponsTable)
        .set({ usedCount: coupon.usedCount + 1 })
        .where(eq(couponsTable.id, coupon.id));
    }
  }

  const fullOrder = await buildOrderResponse(order);
  res.status(201).json(fullOrder);

  // Send order confirmation email asynchronously (don't block response)
  const emailData = await buildEmailData(fullOrder, storeName);
  if (emailData) {
    // For COD, the order placement IS the confirmation
    sendOrderPlacedEmail(emailData).catch((e) =>
      logger.error({ e }, "order_placed email failed")
    );
  }
});

// ─── GET /orders/:id ──────────────────────────────────────────────────────────

router.get("/orders/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetOrderParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const userId = (req as typeof req & { userId: string }).userId;
  const [order] = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.id, params.data.id))
    .limit(1);

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  const adminToken = req.headers["x-admin-token"];
  const [settings] = await db.select().from(adminSettingsTable).limit(1);
  const [appUser] = await db.select().from(appUsersTable).where(eq(appUsersTable.clerkUserId, userId)).limit(1);

  const isSettingAdmin = settings?.adminClerkUserId && settings.adminClerkUserId === userId;
  const isUserTableAdmin = appUser?.isAdmin === true;
  const hasAdminRights = userId === "admin" || !!isSettingAdmin || isUserTableAdmin || adminToken === "shopluxadmin";
  
  // Only grant admin visibility if explicitly requested
  const finalIsAdmin = req.query.admin === "true" && hasAdminRights;

  if (!finalIsAdmin && order.userId !== userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  res.json(await buildOrderResponse(order));
});

// ─── POST /orders/:id/cancel — customer cancels order ────────────────────────

router.post("/orders/:id/cancel", requireAuth, async (req, res): Promise<void> => {
  const orderId = parseInt(req.params.id, 10);
  if (isNaN(orderId)) {
    res.status(400).json({ error: "Invalid order ID" });
    return;
  }
  
  const userId = (req as typeof req & { userId: string }).userId;
  const [order] = await db
    .select()
    .from(ordersTable)
    .where(and(eq(ordersTable.id, orderId), eq(ordersTable.userId, userId)))
    .limit(1);

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  if (order.status !== "pending" && order.status !== "confirmed") {
    res.status(400).json({ error: "Order cannot be cancelled at this stage" });
    return;
  }

  // Restore stock
  const orderItems = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));
  for (const item of orderItems) {
    if (item.productId) {
      const [product] = await db.select().from(productsTable).where(eq(productsTable.id, item.productId)).limit(1);
      if (product && product.stock !== null && product.stock !== undefined) {
        await db.update(productsTable)
          .set({ stock: product.stock + item.quantity })
          .where(eq(productsTable.id, product.id));
      }
    }
  }

  const [updatedOrder] = await db
    .update(ordersTable)
    .set({ status: "cancelled" })
    .where(eq(ordersTable.id, order.id))
    .returning();

  res.json(await buildOrderResponse(updatedOrder));
});

// ─── PATCH /orders/:id/address — customer updates address ──────────────────────

router.patch("/orders/:id/address", requireAuth, async (req, res): Promise<void> => {
  const orderId = parseInt(req.params.id, 10);
  const addressId = typeof req.body.addressId === 'number' ? req.body.addressId : parseInt(req.body.addressId, 10);
  if (isNaN(orderId) || isNaN(addressId)) {
    res.status(400).json({ error: "Invalid order ID or address ID" });
    return;
  }
  
  const userId = (req as typeof req & { userId: string }).userId;
  const [order] = await db
    .select()
    .from(ordersTable)
    .where(and(eq(ordersTable.id, orderId), eq(ordersTable.userId, userId)))
    .limit(1);

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  if (order.status === "shipped" || order.status === "delivered" || order.status === "cancelled") {
    res.status(400).json({ error: "Address cannot be changed at this stage" });
    return;
  }

  const [address] = await db.select().from(addressesTable).where(and(eq(addressesTable.id, addressId), eq(addressesTable.userId, userId))).limit(1);
  if (!address) {
    res.status(404).json({ error: "Address not found" });
    return;
  }

  const [updatedOrder] = await db
    .update(ordersTable)
    .set({ 
      addressId: address.id,
      customerName: address.fullName,
      customerEmail: address.email,
      customerPhone: address.phone
    })
    .where(eq(ordersTable.id, order.id))
    .returning();

  res.json(await buildOrderResponse(updatedOrder));
});

// ─── PATCH /orders/:id/status — admin status update ──────────────────────────

router.patch("/orders/:id/status", requireAdmin, async (req, res): Promise<void> => {
  const params = UpdateOrderStatusParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateOrderStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = { status: parsed.data.status };
  if (parsed.data.razorpayPaymentId) {
    updateData.razorpayPaymentId = parsed.data.razorpayPaymentId;
    updateData.paymentStatus = "paid";
  }
  if (parsed.data.status === "delivered") updateData.paymentStatus = "paid";

  const [order] = await db
    .update(ordersTable)
    .set(updateData)
    .where(eq(ordersTable.id, params.data.id))
    .returning();

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  const [settings] = await db.select().from(adminSettingsTable).limit(1);
  const storeName = settings?.storeName ?? "ShopLux";

  const fullOrder = await buildOrderResponse(order);
  res.json(fullOrder);

  // Send status-change email asynchronously
  const emailData = await buildEmailData(fullOrder, storeName);
  if (emailData) {
    sendOrderStatusEmail(emailData).catch((e) =>
      logger.error({ e, status: parsed.data.status }, "status_change email failed")
    );
  }
});

// ─── POST /orders/payment/create ──────────────────────────────────────────────

router.post("/orders/payment/create", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreatePaymentOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
  const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!razorpayKeyId || !razorpayKeySecret) {
    logger.warn("Razorpay keys not configured, returning mock order");
    res.json({
      id: `order_${Date.now()}`,
      amount: Math.round(parsed.data.amount * 100),
      currency: parsed.data.currency ?? "INR",
      receipt: parsed.data.receipt ?? null,
      key: "rzp_test_mock",
    });
    return;
  }

  const amountInPaise = Math.round(parsed.data.amount * 100);
  const body = JSON.stringify({
    amount: amountInPaise,
    currency: parsed.data.currency ?? "INR",
    receipt: parsed.data.receipt ?? `receipt_${Date.now()}`,
  });

  const auth = Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString("base64");
  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Basic ${auth}` },
    body,
  });

  if (!response.ok) {
    const err = await response.json();
    logger.error({ err }, "Razorpay order creation failed");
    res.status(500).json({ error: "Payment order creation failed" });
    return;
  }

  const rzpOrder = (await response.json()) as {
    id: string;
    amount: number;
    currency: string;
    receipt?: string;
  };

  res.json({
    id: rzpOrder.id,
    amount: rzpOrder.amount,
    currency: rzpOrder.currency,
    receipt: rzpOrder.receipt ?? null,
    key: razorpayKeyId,
  });
});

// ─── POST /orders/payment/verify ──────────────────────────────────────────────

router.post("/orders/payment/verify", requireAuth, async (req, res): Promise<void> => {
  const parsed = VerifyPaymentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { razorpayOrderId, razorpayPaymentId, razorpaySignature, orderId } = parsed.data;
  const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

  // Check if this is a mock payment (order ID starts with "order_" but not from Razorpay, or pay_mock_ prefix)
  const isMockPayment =
    !razorpayKeySecret ||
    (razorpayPaymentId && razorpayPaymentId.startsWith("pay_mock_")) ||
    (razorpayOrderId && razorpayOrderId.startsWith("order_") && !razorpayKeySecret);

  if (isMockPayment) {
    const [updatedOrder] = await db
      .update(ordersTable)
      .set({ paymentStatus: "paid", razorpayPaymentId, razorpayOrderId, status: "confirmed" })
      .where(eq(ordersTable.id, orderId))
      .returning();
    res.json({ success: true, message: "Payment verified (mock mode)" });

    // Send payment success email asynchronously
    if (updatedOrder) {
      const [settings] = await db.select().from(adminSettingsTable).limit(1);
      const storeName = settings?.storeName ?? "ShopLux";
      const fullOrder = await buildOrderResponse(updatedOrder);
      const emailData = await buildEmailData(fullOrder, storeName);
      if (emailData) {
        sendPaymentSuccessEmail(emailData).catch((e) =>
          logger.error({ e }, "payment_success email failed")
        );
      }
    }
    return;
  }

  const hmacBody = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expectedSignature = crypto
    .createHmac("sha256", razorpayKeySecret)
    .update(hmacBody)
    .digest("hex");

  if (expectedSignature !== razorpaySignature) {
    logger.warn({ orderId }, "Razorpay signature mismatch");
    res.status(400).json({ success: false, message: "Invalid payment signature" });
    return;
  }

  const [updatedOrder] = await db
    .update(ordersTable)
    .set({ paymentStatus: "paid", razorpayPaymentId, razorpayOrderId, status: "confirmed" })
    .where(eq(ordersTable.id, orderId))
    .returning();

  res.json({ success: true, message: "Payment verified successfully" });

  // Send payment success email asynchronously
  if (updatedOrder) {
    const [settings] = await db.select().from(adminSettingsTable).limit(1);
    const storeName = settings?.storeName ?? "ShopLux";
    const fullOrder = await buildOrderResponse(updatedOrder);
    const emailData = await buildEmailData(fullOrder, storeName);
    if (emailData) {
      sendPaymentSuccessEmail(emailData).catch((e) =>
        logger.error({ e }, "payment_success email failed")
      );
    }
  }
});

// ─── POST /orders/:id/cancel — customer cancel order ─────────────────────────

router.post("/orders/:id/cancel", requireAuth, async (req, res): Promise<void> => {
  try {
    const orderId = parseInt(req.params.id, 10);
    const userId = (req as typeof req & { userId: string }).userId;

    const [order] = await db
      .select()
      .from(ordersTable)
      .where(and(eq(ordersTable.id, orderId), eq(ordersTable.userId, userId)))
      .limit(1);

    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    if (order.status !== "pending" && order.status !== "confirmed") {
      res.status(400).json({ error: `Cannot cancel order in status: ${order.status}` });
      return;
    }

    // Restore stock for each item
    const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, orderId));
    for (const item of items) {
      if (item.productId) {
        const [product] = await db.select().from(productsTable).where(eq(productsTable.id, item.productId)).limit(1);
        if (product) {
          await db.update(productsTable).set({ stock: product.stock + item.quantity }).where(eq(productsTable.id, item.productId));
        }
      }
    }

    const [updated] = await db
      .update(ordersTable)
      .set({ status: "cancelled" })
      .where(eq(ordersTable.id, orderId))
      .returning();

    const [settings] = await db.select().from(adminSettingsTable).limit(1);
    const storeName = settings?.storeName ?? "ShopLux";
    const fullOrder = await buildOrderResponse(updated);
    res.json(fullOrder);

    const emailData = await buildEmailData(fullOrder, storeName);
    if (emailData) {
      sendOrderStatusEmail(emailData).catch((e) => logger.error({ e }, "cancel email failed"));
    }
  } catch (error: any) {
    console.error("Error cancelling order:", error);
    res.status(500).json({ error: error.message });
  }
});

// ─── PATCH /orders/:id/address — customer change address ─────────────────────

router.patch("/orders/:id/address", requireAuth, async (req, res): Promise<void> => {
  try {
    const orderId = parseInt(req.params.id, 10);
    const { addressId } = req.body;
    const userId = (req as typeof req & { userId: string }).userId;

    if (!addressId) {
      res.status(400).json({ error: "addressId is required" });
      return;
    }

    const [order] = await db
      .select()
      .from(ordersTable)
      .where(and(eq(ordersTable.id, orderId), eq(ordersTable.userId, userId)))
      .limit(1);

    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    const lockedStatuses = ["shipped", "out_for_delivery", "delivered", "cancelled"];
    if (lockedStatuses.includes(order.status)) {
      res.status(400).json({ error: `Cannot change address once order is ${order.status}` });
      return;
    }

    // Verify address belongs to user
    const [address] = await db
      .select()
      .from(addressesTable)
      .where(and(eq(addressesTable.id, addressId), eq(addressesTable.userId, userId)))
      .limit(1);

    if (!address) {
      res.status(404).json({ error: "Address not found" });
      return;
    }

    const [updated] = await db
      .update(ordersTable)
      .set({
        addressId,
        customerName: address.fullName,
        customerPhone: address.phone,
      })
      .where(eq(ordersTable.id, orderId))
      .returning();

    res.json(await buildOrderResponse(updated));
  } catch (error: any) {
    console.error("Error changing order address:", error);
    res.status(500).json({ error: error.message });
  }
});

// ─── POST /orders/:id/pay-online — switch COD to Razorpay ────────────────────

router.post("/orders/:id/pay-online", requireAuth, async (req, res): Promise<void> => {
  try {
    const orderId = parseInt(req.params.id, 10);
    const userId = (req as typeof req & { userId: string }).userId;

    const [order] = await db
      .select()
      .from(ordersTable)
      .where(and(eq(ordersTable.id, orderId), eq(ordersTable.userId, userId)))
      .limit(1);

    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    if (order.paymentStatus === "paid") {
      res.status(400).json({ error: "Order is already paid" });
      return;
    }

    if (["delivered", "cancelled"].includes(order.status)) {
      res.status(400).json({ error: `Cannot switch payment for ${order.status} order` });
      return;
    }

    const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!razorpayKeyId || !razorpayKeySecret) {
      // Return mock for testing
      res.json({ id: `order_mock_${Date.now()}`, amount: Math.round(Number(order.totalAmount) * 100), currency: "INR", key: "rzp_test_mock", orderId });
      return;
    }

    const amountInPaise = Math.round(Number(order.totalAmount) * 100);
    const body = JSON.stringify({ amount: amountInPaise, currency: "INR", receipt: `pay_order_${orderId}_${Date.now()}` });
    const auth = Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString("base64");
    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Basic ${auth}` },
      body,
    });

    if (!response.ok) {
      const errText = await response.text();
      logger.error({ errText }, "Razorpay pay-online order creation failed");
      res.status(500).json({ error: "Payment initiation failed" });
      return;
    }

    const rzpOrder = await response.json() as any;
    // Update the order's razorpayOrderId
    await db.update(ordersTable).set({ razorpayOrderId: rzpOrder.id }).where(eq(ordersTable.id, orderId));

    res.json({ ...rzpOrder, key: razorpayKeyId, orderId });
  } catch (error: any) {
    console.error("Error in pay-online:", error);
    res.status(500).json({ error: error.message });
  }
});

// ─── POST /orders/:id/items/:itemId/return — request return ───────────────────

router.post("/orders/:id/items/:itemId/return", requireAuth, async (req, res): Promise<void> => {
  try {
    const orderId = parseInt(req.params.id, 10);
    const itemId = parseInt(req.params.itemId, 10);
    const { reason, imageUrl, bankName, accountNumber, ifscCode, accountHolderName } = req.body;

    if (!reason) {
      res.status(400).json({ error: "Return reason is required" });
      return;
    }

    const userId = (req as typeof req & { userId: string }).userId;

    // 1. Verify order belongs to user and is delivered
    const [order] = await db
      .select()
      .from(ordersTable)
      .where(and(eq(ordersTable.id, orderId), eq(ordersTable.userId, userId)))
      .limit(1);

    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    if (order.status !== "delivered") {
      res.status(400).json({ error: "Only delivered orders can be returned" });
      return;
    }

    // 2. Verify order item exists
    const [orderItem] = await db
      .select()
      .from(orderItemsTable)
      .where(and(eq(orderItemsTable.id, itemId), eq(orderItemsTable.orderId, orderId)))
      .limit(1);

    if (!orderItem) {
      res.status(404).json({ error: "Order item not found" });
      return;
    }

    if (!orderItem.productId) {
      res.status(400).json({ error: "This product cannot be returned" });
      return;
    }

    // 3. Check for duplicate return
    const [existingReturn] = await db
      .select()
      .from(returnsTable)
      .where(eq(returnsTable.orderItemId, itemId))
      .limit(1);

    if (existingReturn) {
      res.status(400).json({ error: "Return request already exists for this item" });
      return;
    }

    // 4. Create return request with extra details
    const [newReturn] = await db
      .insert(returnsTable)
      .values({
        orderId,
        productId: orderItem.productId,
        orderItemId: itemId,
        userId,
        reason,
        status: "pending",
      })
      .returning();

    // 5. Update extra fields using raw SQL (since schema might not have them yet)
    if (imageUrl || bankName || accountNumber || ifscCode || accountHolderName) {
      await db.execute(sql`
        UPDATE returns SET
          image_url = ${imageUrl ?? null},
          bank_name = ${bankName ?? null},
          account_number = ${accountNumber ?? null},
          ifsc_code = ${ifscCode ?? null},
          account_holder = ${accountHolderName ?? null}
        WHERE id = ${newReturn.id}
      `);
    }

    res.status(201).json(newReturn);
  } catch (error: any) {
    console.error("Error creating return request:", error);
    res.status(500).json({ error: error.message });
  }
});

// ─── GET /admin/returns — list return requests ───────────────────────────

router.get("/admin/returns", requireAdmin, async (req, res): Promise<void> => {
  try {
    const returns = await db
      .select()
      .from(returnsTable)
      .orderBy(desc(returnsTable.createdAt));

    const returnsWithDetails = await Promise.all(
      returns.map(async (ret) => {
        const [order] = await db
          .select()
          .from(ordersTable)
          .where(eq(ordersTable.id, ret.orderId))
          .limit(1);

        const [orderItem] = await db
          .select()
          .from(orderItemsTable)
          .where(eq(orderItemsTable.id, ret.orderItemId))
          .limit(1);

        let address = null;
        if (order && order.addressId) {
          const [addr] = await db
            .select()
            .from(addressesTable)
            .where(eq(addressesTable.id, order.addressId))
            .limit(1);
          address = addr ?? null;
        }

        return {
          ...ret,
          imageUrl: (ret as any).image_url ?? null,
          bankName: (ret as any).bank_name ?? null,
          accountNumber: (ret as any).account_number ?? null,
          ifscCode: (ret as any).ifsc_code ?? null,
          accountHolder: (ret as any).account_holder ?? null,
          order: order ? {
            ...order,
            totalAmount: Number(order.totalAmount),
            address,
          } : null,
          orderItem: orderItem ? {
            ...orderItem,
            price: Number(orderItem.price),
          } : null,
          user: order ? {
            id: order.userId,
            email: order.customerEmail || (order as any).email || "customer@example.com",
            name: order.customerName || "Customer",
            phone: order.customerPhone || "",
          } : {
            id: ret.userId || "unknown",
            email: "customer@example.com",
            name: "Customer",
            phone: "",
          },
          item: orderItem ? {
            productName: orderItem.productName,
            productImage: orderItem.productImage?.startsWith("/api/uploads/") ? orderItem.productImage.replace("/api/uploads/", "/uploads/") : orderItem.productImage,
            price: Number(orderItem.price),
            quantity: orderItem.quantity,
            variant: orderItem.variant,
          } : {
            productName: "Unknown Product",
            productImage: null,
            price: 0,
            quantity: 1,
            variant: null,
          },
        };
      })
    );

    res.json({ returns: returnsWithDetails });
  } catch (error: any) {
    console.error("Error listing return requests:", error);
    res.status(500).json({ error: error.message });
  }
});

// ─── PATCH /admin/returns/:id/status — approve/reject return ──────────────────

router.patch("/admin/returns/:id/status", requireAdmin, async (req, res): Promise<void> => {
  try {
    const returnId = parseInt(req.params.id, 10);
    const { status } = req.body; // "approved" or "rejected"

    if (status !== "approved" && status !== "rejected") {
      res.status(400).json({ error: "Invalid status. Must be 'approved' or 'rejected'" });
      return;
    }

    const [ret] = await db
      .select()
      .from(returnsTable)
      .where(eq(returnsTable.id, returnId))
      .limit(1);

    if (!ret) {
      res.status(404).json({ error: "Return request not found" });
      return;
    }

    const [updatedReturn] = await db
      .update(returnsTable)
      .set({ status, updatedAt: new Date() })
      .where(eq(returnsTable.id, returnId))
      .returning();

    res.json(updatedReturn);
  } catch (error: any) {
    console.error("Error updating return request status:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
