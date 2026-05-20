import { Router } from "express";
import { desc, sql, eq } from "drizzle-orm";
import { db, adminSettingsTable, ordersTable, productsTable, appUsersTable } from "@workspace/db";
import { UpdateAdminSettingsBody, ListUsersQueryParams } from "@workspace/api-zod";
import { requireAdmin } from "../middlewares/auth";
import multer from "multer";
import path from "path";
import fs from "fs";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

const router = Router();

router.get("/admin/stats", requireAdmin, async (_req, res): Promise<void> => {
  const [revenueResult, ordersResult, productsResult, usersResult, pendingResult] = await Promise.all([
    db.select({ total: sql<number>`sum(cast(total_amount as numeric))` }).from(ordersTable).where(eq(ordersTable.paymentStatus, "paid")),
    db.select({ count: sql<number>`count(*)` }).from(ordersTable),
    db.select({ count: sql<number>`count(*)` }).from(productsTable),
    db.select({ count: sql<number>`count(*)` }).from(appUsersTable),
    db.select({ count: sql<number>`count(*)` }).from(ordersTable).where(eq(ordersTable.status, "pending")),
  ]);

  const recentOrders = await db
    .select()
    .from(ordersTable)
    .orderBy(desc(ordersTable.createdAt))
    .limit(10);

  const ordersByStatus = await db
    .select({
      status: ordersTable.status,
      count: sql<number>`count(*)`,
    })
    .from(ordersTable)
    .groupBy(ordersTable.status);

  const revenueByDay = await db.execute(sql`
    SELECT 
      DATE(created_at) as date,
      SUM(CAST(total_amount AS NUMERIC)) as revenue
    FROM orders
    WHERE payment_status = 'paid'
      AND created_at >= NOW() - INTERVAL '30 days'
    GROUP BY DATE(created_at)
    ORDER BY date DESC
    LIMIT 30
  `);

  res.json({
    totalRevenue: Number(revenueResult[0]?.total ?? 0),
    totalOrders: Number(ordersResult[0]?.count ?? 0),
    totalProducts: Number(productsResult[0]?.count ?? 0),
    totalUsers: Number(usersResult[0]?.count ?? 0),
    pendingOrders: Number(pendingResult[0]?.count ?? 0),
    recentOrders: recentOrders.map((o) => ({
      ...o,
      totalAmount: Number(o.totalAmount),
      subtotal: Number(o.subtotal),
      deliveryCharge: Number(o.deliveryCharge),
      discount: Number(o.discount),
      createdAt: o.createdAt instanceof Date ? o.createdAt.toISOString() : o.createdAt,
      items: [],
      address: null,
    })),
    ordersByStatus: ordersByStatus.map((s) => ({
      status: s.status,
      count: Number(s.count),
    })),
    revenueByDay: (revenueByDay.rows as Array<{ date: string; revenue: string | number }>).map((r) => ({
      date: String(r.date),
      revenue: Number(r.revenue),
    })),
  });
});

router.get("/admin/settings", async (_req, res): Promise<void> => {
  let [settings] = await db.select().from(adminSettingsTable).limit(1);

  if (!settings) {
    [settings] = await db.insert(adminSettingsTable).values({}).returning();
  }

  res.json({
    ...settings,
    deliveryCharge: Number(settings.deliveryCharge),
    freeDeliveryAbove: settings.freeDeliveryAbove != null ? Number(settings.freeDeliveryAbove) : null,
    gstPercent: Number(settings.gstPercent),
    trustBadge1: settings.trustBadge1 ?? "Free delivery on orders above ₹999",
    trustBadge2: settings.trustBadge2 ?? "Secure & encrypted payments",
    trustBadge3: settings.trustBadge3 ?? "7-day hassle-free returns",
    updatedAt: settings.updatedAt instanceof Date ? settings.updatedAt.toISOString() : settings.updatedAt,
  });
});

router.patch("/admin/settings", requireAdmin, async (req, res): Promise<void> => {
  const parsed = UpdateAdminSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.deliveryCharge != null) updateData.deliveryCharge = String(parsed.data.deliveryCharge);
  if (parsed.data.freeDeliveryAbove != null) updateData.freeDeliveryAbove = String(parsed.data.freeDeliveryAbove);
  if (parsed.data.gstPercent != null) updateData.gstPercent = String(parsed.data.gstPercent);

  let [settings] = await db.select().from(adminSettingsTable).limit(1);

  if (settings) {
    [settings] = await db
      .update(adminSettingsTable)
      .set(updateData)
      .where(eq(adminSettingsTable.id, settings.id))
      .returning();
  } else {
    [settings] = await db.insert(adminSettingsTable).values(updateData).returning();
  }

  res.json({
    ...settings,
    deliveryCharge: Number(settings.deliveryCharge),
    freeDeliveryAbove: settings.freeDeliveryAbove != null ? Number(settings.freeDeliveryAbove) : null,
    gstPercent: Number(settings.gstPercent),
    trustBadge1: settings.trustBadge1 ?? "Free delivery on orders above ₹999",
    trustBadge2: settings.trustBadge2 ?? "Secure & encrypted payments",
    trustBadge3: settings.trustBadge3 ?? "7-day hassle-free returns",
  });
});

router.get("/admin/users", requireAdmin, async (req, res): Promise<void> => {
  const parsed = ListUsersQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { page = 1, limit = 20 } = parsed.data;
  const offset = (page - 1) * limit;

  const [users, countResult] = await Promise.all([
    db.select().from(appUsersTable).orderBy(desc(appUsersTable.createdAt)).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(appUsersTable),
  ]);

  res.json({
    users: users.map((u) => ({
      ...u,
      createdAt: u.createdAt instanceof Date ? u.createdAt.toISOString() : u.createdAt,
    })),
    total: Number(countResult[0].count),
    page,
    limit,
  });
});

router.post("/admin/upload", requireAdmin, upload.single("image"), (req, res): void => {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }
  
  // Return relative URL so frontend can display it
  res.json({ url: `/uploads/${req.file.filename}` });
});

export default router;
