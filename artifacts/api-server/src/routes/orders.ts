import { Router } from "express";
import { eq, desc, sql, and } from "drizzle-orm";
import crypto from "crypto";
import { clerkClient } from "@clerk/express";
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
import { resolveImageUrl } from "../lib/supabase";
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

    // ── Base tables (create if not exist - safe for fresh Replit DB) ──
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        description TEXT,
        image TEXT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        description TEXT,
        price NUMERIC(10, 2) NOT NULL,
        compare_price NUMERIC(10, 2),
        discount NUMERIC(5, 2),
        stock INTEGER NOT NULL DEFAULT 0,
        category_id INTEGER REFERENCES categories(id),
        images TEXT[] NOT NULL DEFAULT '{}',
        variants TEXT,
        tags TEXT[] NOT NULL DEFAULT '{}',
        is_featured BOOLEAN NOT NULL DEFAULT false,
        is_trending BOOLEAN NOT NULL DEFAULT false,
        is_new_arrival BOOLEAN NOT NULL DEFAULT false,
        is_best_seller BOOLEAN NOT NULL DEFAULT false,
        rating NUMERIC(3, 2),
        review_count INTEGER NOT NULL DEFAULT 0,
        delivery_charge NUMERIC(10, 2) DEFAULT 0,
        is_delivery_charge_applicable BOOLEAN DEFAULT false,
        is_deleted BOOLEAN NOT NULL DEFAULT false,
        flash_sale_id INTEGER,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS app_users (
        id SERIAL PRIMARY KEY,
        clerk_user_id TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL,
        full_name TEXT,
        phone TEXT,
        is_admin BOOLEAN NOT NULL DEFAULT false,
        loyalty_points INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS addresses (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        full_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT,
        address_line TEXT NOT NULL,
        landmark TEXT,
        city TEXT NOT NULL,
        state TEXT NOT NULL,
        pincode TEXT NOT NULL,
        is_default BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        payment_method TEXT NOT NULL DEFAULT 'cod',
        payment_status TEXT NOT NULL DEFAULT 'pending',
        total_amount NUMERIC(10, 2) NOT NULL,
        subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0,
        delivery_charge NUMERIC(10, 2) NOT NULL DEFAULT 0,
        discount NUMERIC(10, 2) NOT NULL DEFAULT 0,
        coupon_code TEXT,
        razorpay_order_id TEXT,
        razorpay_payment_id TEXT,
        address_id INTEGER REFERENCES addresses(id),
        customer_name TEXT,
        customer_email TEXT,
        customer_phone TEXT,
        loyalty_points_redeemed INTEGER DEFAULT 0,
        loyalty_points_discount NUMERIC(10, 2) DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL REFERENCES orders(id),
        product_id INTEGER REFERENCES products(id),
        product_name TEXT NOT NULL,
        product_image TEXT,
        price NUMERIC(10, 2) NOT NULL,
        quantity INTEGER NOT NULL,
        variant TEXT
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS admin_settings (
        id SERIAL PRIMARY KEY,
        store_name TEXT NOT NULL DEFAULT 'ShopLux',
        store_tagline TEXT,
        logo_url TEXT,
        currency TEXT NOT NULL DEFAULT 'INR',
        delivery_charge NUMERIC(10, 2) NOT NULL DEFAULT 49,
        free_delivery_above NUMERIC(10, 2),
        gst_percent NUMERIC(5, 2) NOT NULL DEFAULT 18,
        whatsapp_number TEXT,
        instagram_url TEXT,
        admin_clerk_user_id TEXT,
        trust_badge_1 TEXT DEFAULT 'Free delivery on orders above ₹999',
        trust_badge_2 TEXT DEFAULT 'Secure & encrypted payments',
        trust_badge_3 TEXT DEFAULT '7-day hassle-free returns',
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);
    // Insert default admin_settings row if table is empty
    await db.execute(sql`INSERT INTO admin_settings (store_name) SELECT 'ShopLux' WHERE NOT EXISTS (SELECT 1 FROM admin_settings);`);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS banners (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        subtitle TEXT,
        image_url TEXT NOT NULL,
        link_url TEXT,
        is_active BOOLEAN NOT NULL DEFAULT true,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS coupons (
        id SERIAL PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        description TEXT,
        discount_type TEXT NOT NULL DEFAULT 'percent',
        discount_value NUMERIC(10, 2) NOT NULL,
        min_order_amount NUMERIC(10, 2),
        max_discount NUMERIC(10, 2),
        usage_limit INTEGER,
        used_count INTEGER NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT true,
        expires_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS wishlist (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        product_id INTEGER NOT NULL REFERENCES products(id),
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

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

    // ── Critical: add newer product columns that may be missing in the Replit production DB ──
    await db.execute(sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;`);
    await db.execute(sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS flash_sale_id INTEGER;`);
    await db.execute(sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS review_count INTEGER NOT NULL DEFAULT 0;`);
    await db.execute(sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS rating NUMERIC(3, 2);`);
    await db.execute(sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false;`);
    await db.execute(sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS is_trending BOOLEAN NOT NULL DEFAULT false;`);
    await db.execute(sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS is_new_arrival BOOLEAN NOT NULL DEFAULT false;`);
    await db.execute(sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS is_best_seller BOOLEAN NOT NULL DEFAULT false;`);
    await db.execute(sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS compare_price NUMERIC(10, 2);`);
    await db.execute(sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS discount NUMERIC(5, 2);`);
    await db.execute(sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW();`);

    // ── Categories table newer columns ──
    await db.execute(sql`ALTER TABLE categories ADD COLUMN IF NOT EXISTS image TEXT;`);
    await db.execute(sql`ALTER TABLE categories ADD COLUMN IF NOT EXISTS description TEXT;`);

    // ── Create flash_sales table if missing ──
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS flash_sales (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        discount_percent NUMERIC(5, 2) NOT NULL,
        start_time TIMESTAMP WITH TIME ZONE NOT NULL,
        end_time TIMESTAMP WITH TIME ZONE NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    // ── Create reviews table if missing ──
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS reviews (
        id SERIAL PRIMARY KEY,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL,
        customer_name TEXT NOT NULL,
        rating INTEGER NOT NULL,
        review_text TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);
    // Add missing columns in case table already existed with old schema
    await db.execute(sql`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS customer_name TEXT NOT NULL DEFAULT 'Anonymous';`);
    await db.execute(sql`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS review_text TEXT NOT NULL DEFAULT '';`);
    await db.execute(sql`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS user_name TEXT;`); // kept for backward compat

    // ── Create testimonials table if missing ──
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS testimonials (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        role TEXT,
        review_text TEXT NOT NULL,
        rating INTEGER NOT NULL DEFAULT 5,
        image_url TEXT,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    // ── Loyalty points column on app_users ──
    await db.execute(sql`ALTER TABLE app_users ADD COLUMN IF NOT EXISTS loyalty_points INTEGER NOT NULL DEFAULT 0;`);

    // ── All orders table columns (using CORRECT column names from schema) ──
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal NUMERIC(10,2) NOT NULL DEFAULT 0;`);
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_charge NUMERIC(10,2) NOT NULL DEFAULT 0;`);
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount NUMERIC(10,2) NOT NULL DEFAULT 0;`);
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_code TEXT;`);
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT;`);
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT;`);
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name TEXT;`);
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_email TEXT;`);
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_phone TEXT;`);
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS loyalty_points_redeemed INTEGER DEFAULT 0;`);
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS loyalty_points_discount NUMERIC(10,2) DEFAULT 0;`);
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW();`);
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS address_id INTEGER;`);
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'pending';`);

    // ── order_items table extra columns ──
    await db.execute(sql`ALTER TABLE order_items ADD COLUMN IF NOT EXISTS variant TEXT;`);
    await db.execute(sql`ALTER TABLE order_items ADD COLUMN IF NOT EXISTS product_image TEXT;`);

    // ── WhatsApp number and other admin_settings columns ──
    await db.execute(sql`ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;`);
    await db.execute(sql`ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS store_tagline TEXT;`);
    await db.execute(sql`ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS logo_url TEXT;`);
    await db.execute(sql`ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS free_delivery_above NUMERIC(10,2);`);
    await db.execute(sql`ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS gst_percent NUMERIC(5,2) NOT NULL DEFAULT 18;`);
    await db.execute(sql`ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS instagram_url TEXT;`);
    await db.execute(sql`ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS admin_clerk_user_id TEXT;`);
    await db.execute(sql`ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW();`);

    // ── app_users table columns ──
    await db.execute(sql`ALTER TABLE app_users ADD COLUMN IF NOT EXISTS full_name TEXT;`);
    await db.execute(sql`ALTER TABLE app_users ADD COLUMN IF NOT EXISTS phone TEXT;`);
    await db.execute(sql`ALTER TABLE app_users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;`);

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

  // Compute customer-relative order number using Drizzle query builder for reliable timezone and parameter mapping
  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(ordersTable)
    .where(
      and(
        eq(ordersTable.userId, order.userId),
        sql`${ordersTable.createdAt} <= ${order.createdAt}`
      )
    );
  const customerOrderNumber = Number(countResult?.count ?? 1);

  const itemsWithReturnStatus = items.map((i) => {
    const ret = itemReturns.find((r) => r.orderItemId === i.id);
    return {
      ...i,
      price: Number(i.price),
      productImage: resolveImageUrl(i.productImage),
      returnStatus: ret ? ret.status : null,
      returnReason: ret ? ret.reason : null,
      returnId: ret ? ret.id : null,
      returnImageUrl: ret ? resolveImageUrl(ret.imageUrl) : null,
      returnBankDetails: ret ? {
        bankName: ret.bankName,
        accountNumber: ret.accountNumber,
        ifscCode: ret.ifscCode,
        accountHolder: ret.accountHolder,
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
  let email = fullOrder.customerEmail;
  let name = fullOrder.customerName ?? "Valued Customer";
  let phone = fullOrder.customerPhone;

  if (email && email.startsWith("user_")) {
    try {
      const clerkUser = await clerkClient.users.getUser(email);
      const realEmail = clerkUser.emailAddresses[0]?.emailAddress;
      const realName = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ");
      const realPhone = clerkUser.phoneNumbers[0]?.phoneNumber;
      
      if (realEmail) {
        email = realEmail;
        name = realName || name;
        phone = realPhone || phone;
        
        // Proactively update the database so this order has clean details going forward!
        await db.update(ordersTable)
          .set({ customerEmail: realEmail, customerName: realName || null, customerPhone: realPhone || null })
          .where(eq(ordersTable.id, fullOrder.id));
      }
    } catch (err) {
      logger.error({ err, orderId: fullOrder.id }, "Failed to resolve customer Clerk email during email data build");
    }
  }

  if (!email || email.startsWith("user_")) return null;

  return {
    orderId: fullOrder.id,
    customerOrderNumber: fullOrder.customerOrderNumber,
    customerName: name,
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
      (fullOrder.createdAt as any) instanceof Date
        ? (fullOrder.createdAt as any).toISOString()
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

async function sendAdminWhatsAppNotification(order: any, items: any[], settings: any) {
  const adminNumber = settings?.whatsappNumber;
  if (!adminNumber) {
    logger.info("Admin WhatsApp number not set. Skipping WhatsApp order notification.");
    return;
  }

  const itemsSummary = items
    .map((item) => `${item.productName || "Product"} (x${item.quantity})`)
    .join(", ");

  const message = `*New Order Placed!*\n\n` +
    `*Order ID:* ${order.id}\n` +
    `*Customer:* ${order.customerName || "Anonymous"}\n` +
    `*Total Amount:* ₹${order.totalAmount}\n` +
    `*Items:* ${itemsSummary}\n\n` +
    `Please check the admin panel to process this order.`;

  logger.info({ adminNumber, message }, "Sending WhatsApp admin notification log");

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioWhatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER || "whatsapp:+14155238886";

  if (accountSid && authToken && adminNumber) {
    try {
      // @ts-ignore
      const twilio = await import("twilio");
      const client = twilio.default(accountSid, authToken);
      const cleanNumber = adminNumber.startsWith("whatsapp:") ? adminNumber : `whatsapp:${adminNumber}`;
      await client.messages.create({
        from: twilioWhatsappNumber,
        to: cleanNumber,
        body: message,
      });
      logger.info("Twilio WhatsApp notification sent successfully!");
    } catch (err) {
      logger.error({ err }, "Failed to send Twilio WhatsApp notification");
    }
  }
}

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

  let finalTotalAmount = totalAmount;
  let pointsRedeemed = 0;
  let pointsDiscount = 0;

  // Loyalty points redemption logic (100 points = ₹10)
  const redeemPointsRequested = req.body.redeemPoints === true || req.body.redeemPoints === "true";
  if (redeemPointsRequested && appUser && appUser.loyaltyPoints >= 100) {
    pointsRedeemed = Math.floor(appUser.loyaltyPoints / 100) * 100;
    pointsDiscount = (pointsRedeemed / 100) * 10;
    finalTotalAmount = Math.max(0, totalAmount - pointsDiscount);

    // Deduct redeemed points from app_users
    await db
      .update(appUsersTable)
      .set({ loyaltyPoints: appUser.loyaltyPoints - pointsRedeemed })
      .where(eq(appUsersTable.clerkUserId, userId));
  }

  const [order] = await db
    .insert(ordersTable)
    .values({
      userId,
      status: "pending",
      paymentMethod,
      paymentStatus: "pending",
      totalAmount: String(finalTotalAmount),
      subtotal: String(subtotal ?? totalAmount),
      deliveryCharge: String(deliveryCharge ?? 0),
      discount: String((discount ?? 0) + pointsDiscount),
      couponCode,
      razorpayOrderId,
      addressId,
      customerName: address?.fullName ?? appUser?.fullName,
      customerEmail: address?.email ?? appUser?.email,
      customerPhone: address?.phone ?? appUser?.phone,
      loyaltyPointsRedeemed: pointsRedeemed,
      loyaltyPointsDiscount: String(pointsDiscount),
    })
    .returning();

  const insertedItems = [];

  // Insert order items and decrement stock
  for (const item of items) {
    const [product] = await db
      .select()
      .from(productsTable)
      .where(eq(productsTable.id, item.productId))
      .limit(1);

    const [orderItem] = await db.insert(orderItemsTable).values({
      orderId: order.id,
      productId: item.productId,
      productName: product?.name ?? "Unknown Product",
      productImage: product?.images?.[0] ?? null,
      price: String(item.price),
      quantity: item.quantity,
      variant: item.variant,
    }).returning();

    insertedItems.push(orderItem);

    if (product) {
      await db
        .update(productsTable)
        .set({ stock: Math.max(0, product.stock - item.quantity) })
        .where(eq(productsTable.id, item.productId));
    }
  }

  // Credit loyalty points earned (1 point per ₹10 spent)
  const pointsEarned = Math.floor(finalTotalAmount / 10);
  if (pointsEarned > 0 && appUser) {
    await db
      .update(appUsersTable)
      .set({ loyaltyPoints: sql`${appUsersTable.loyaltyPoints} + ${pointsEarned}` })
      .where(eq(appUsersTable.clerkUserId, userId));
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

  // Trigger WhatsApp admin order notification
  sendAdminWhatsAppNotification(order, insertedItems, settings).catch((e) =>
    logger.error({ e }, "WhatsApp admin order notification failed")
  );

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
  const orderId = parseInt(req.params.id as string, 10);
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

  const [settings] = await db.select().from(adminSettingsTable).limit(1);
  const storeName = settings?.storeName ?? "ShopLux";
  const fullOrder = await buildOrderResponse(updatedOrder);
  res.json(fullOrder);

  // Send order cancellation email asynchronously
  const emailData = await buildEmailData(fullOrder, storeName);
  if (emailData) {
    sendOrderStatusEmail(emailData).catch((e) =>
      logger.error({ e }, "cancel email failed")
    );
  }
});

// ─── PATCH /orders/:id/address — customer updates address ──────────────────────

router.patch("/orders/:id/address", requireAuth, async (req, res): Promise<void> => {
  const orderId = parseInt(req.params.id as string, 10);
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
  const [originalOrder] = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.id, params.data.id))
    .limit(1);

  if (!originalOrder) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  // Restore stock if transitioning to cancelled status
  if (originalOrder.status !== "cancelled" && parsed.data.status === "cancelled") {
    const orderItems = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, originalOrder.id));
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
    .where(eq(ordersTable.id, originalOrder.id))
    .returning();

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

// ─── DELETE /orders/:id — admin delete order ───────────────────────────────────

router.delete("/orders/:id", requireAdmin, async (req, res): Promise<void> => {
  const orderId = parseInt(req.params.id as string, 10);
  if (isNaN(orderId)) {
    res.status(400).json({ error: "Invalid order ID" });
    return;
  }

  // Check if order exists
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  try {
    // Perform cascaded deletion in a transaction to satisfy foreign key constraints
    await db.transaction(async (tx) => {
      // 1. Delete associated returns
      await tx.delete(returnsTable).where(eq(returnsTable.orderId, orderId));
      // 2. Delete associated order items
      await tx.delete(orderItemsTable).where(eq(orderItemsTable.orderId, orderId));
      // 3. Delete the order itself
      await tx.delete(ordersTable).where(eq(ordersTable.id, orderId));
    });

    res.json({ success: true, message: "Order deleted successfully" });
  } catch (err: any) {
    logger.error({ err, orderId }, "Order deletion failed");
    res.status(500).json({ error: "Failed to delete order" });
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



// ─── PATCH /orders/:id/address — customer change address ─────────────────────

router.patch("/orders/:id/address", requireAuth, async (req, res): Promise<void> => {
  try {
    const orderId = parseInt(req.params.id as string, 10);
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
    const orderId = parseInt(req.params.id as string, 10);
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
    const orderId = parseInt(req.params.id as string, 10);
    const itemId = parseInt(req.params.itemId as string, 10);
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

    // 4. Create return request with details
    const [newReturn] = await db
      .insert(returnsTable)
      .values({
        orderId,
        productId: orderItem.productId,
        orderItemId: itemId,
        userId,
        reason,
        imageUrl: imageUrl || null,
        bankName: bankName || null,
        accountNumber: accountNumber || null,
        ifscCode: ifscCode || null,
        accountHolder: accountHolderName || null,
        status: "pending",
      })
      .returning();

    res.status(201).json(newReturn);

    // Send return request confirmation email asynchronously
    const [settings] = await db.select().from(adminSettingsTable).limit(1);
    const storeName = settings?.storeName ?? "ShopLux";
    const fullOrder = await buildOrderResponse(order);
    const emailData = await buildEmailData(fullOrder, storeName);
    if (emailData) {
      sendOrderStatusEmail({
        ...emailData,
        status: "return_pending",
      }).catch((e) => logger.error({ e }, "Return request email failed"));
    }
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
          imageUrl: resolveImageUrl(ret.imageUrl),
          bankName: ret.bankName ?? null,
          accountNumber: ret.accountNumber ?? null,
          ifscCode: ret.ifscCode ?? null,
          accountHolder: ret.accountHolder ?? null,
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
            productImage: resolveImageUrl(orderItem.productImage),
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
    const returnId = parseInt(req.params.id as string, 10);
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

    // Send return resolution email asynchronously
    try {
      const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, ret.orderId)).limit(1);
      if (order) {
        const [settings] = await db.select().from(adminSettingsTable).limit(1);
        const storeName = settings?.storeName ?? "ShopLux";
        const fullOrder = await buildOrderResponse(order);
        const emailData = await buildEmailData(fullOrder, storeName);
        if (emailData) {
          sendOrderStatusEmail({
            ...emailData,
            status: status === "approved" ? "return_approved" : "return_rejected",
          }).catch((e) => logger.error({ e }, "Return resolution email failed"));
        }
      }
    } catch (e) {
      logger.error({ e }, "Failed to dispatch return resolution email");
    }
  } catch (error: any) {
    console.error("Error updating return request status:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
