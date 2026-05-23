import { Router } from "express";
import { desc, sql, eq, and } from "drizzle-orm";
import { db, adminSettingsTable, ordersTable, productsTable, appUsersTable } from "@workspace/db";
import { UpdateAdminSettingsBody, ListUsersQueryParams } from "@workspace/api-zod";
import { requireAdmin, requireAuth } from "../middlewares/auth";
import multer from "multer";
import { uploadToSupabase } from "../lib/supabase";

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

const router = Router();

router.get("/admin/stats", requireAdmin, async (req, res): Promise<void> => {
  const period = (req.query.period as string) || "all";

  let dateFilter = sql`1=1`; // default to no filter (all-time)
  if (period === "today") {
    dateFilter = sql`created_at >= NOW() - INTERVAL '24 hours'`;
  } else if (period === "week") {
    dateFilter = sql`created_at >= NOW() - INTERVAL '7 days'`;
  } else if (period === "month") {
    dateFilter = sql`created_at >= NOW() - INTERVAL '30 days'`;
  } else if (period === "quarter") {
    dateFilter = sql`created_at >= NOW() - INTERVAL '90 days'`;
  } else if (period === "halfyear") {
    dateFilter = sql`created_at >= NOW() - INTERVAL '180 days'`;
  } else if (period === "year") {
    dateFilter = sql`created_at >= NOW() - INTERVAL '365 days'`;
  }

  // Same logic for users table
  let userDateFilter = sql`1=1`;
  if (period === "today") {
    userDateFilter = sql`created_at >= NOW() - INTERVAL '24 hours'`;
  } else if (period === "week") {
    userDateFilter = sql`created_at >= NOW() - INTERVAL '7 days'`;
  } else if (period === "month") {
    userDateFilter = sql`created_at >= NOW() - INTERVAL '30 days'`;
  } else if (period === "quarter") {
    userDateFilter = sql`created_at >= NOW() - INTERVAL '90 days'`;
  } else if (period === "halfyear") {
    userDateFilter = sql`created_at >= NOW() - INTERVAL '180 days'`;
  } else if (period === "year") {
    userDateFilter = sql`created_at >= NOW() - INTERVAL '365 days'`;
  }

  const [revenueResult, ordersResult, productsResult, usersResult, pendingResult] = await Promise.all([
    db.select({ total: sql<number>`sum(cast(total_amount as numeric))` }).from(ordersTable).where(and(eq(ordersTable.paymentStatus, "paid"), dateFilter)),
    db.select({ count: sql<number>`count(*)` }).from(ordersTable).where(dateFilter),
    db.select({ count: sql<number>`count(*)` }).from(productsTable),
    db.select({ count: sql<number>`count(*)` }).from(appUsersTable).where(userDateFilter),
    db.select({ count: sql<number>`count(*)` }).from(ordersTable).where(and(eq(ordersTable.status, "pending"), dateFilter)),
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

  // Monthly sales aggregate for chart
  const monthlySalesResult = await db.execute(sql`
    SELECT 
      TO_CHAR(created_at, 'YYYY-MM') as month,
      COUNT(*) as orders_count,
      SUM(CAST(total_amount AS NUMERIC)) as monthly_revenue
    FROM orders
    WHERE payment_status = 'paid'
    GROUP BY TO_CHAR(created_at, 'YYYY-MM')
    ORDER BY month ASC
    LIMIT 12
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
    monthlySales: (monthlySalesResult.rows as Array<{ month: string; orders_count: string | number; monthly_revenue: string | number }>).map((m) => ({
      month: String(m.month),
      orders: Number(m.orders_count),
      revenue: Number(m.monthly_revenue),
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

router.post("/admin/upload", requireAdmin, upload.single("image"), async (req, res): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }
  
  try {
    const publicUrl = await uploadToSupabase(req.file.buffer, req.file.originalname, req.file.mimetype);
    res.json({ url: publicUrl });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to upload image to Supabase Storage" });
  }
});

router.post("/uploads", upload.single("file"), async (req, res): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }
  
  try {
    const publicUrl = await uploadToSupabase(req.file.buffer, req.file.originalname, req.file.mimetype);
    res.json({ url: publicUrl });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to upload image to Supabase Storage" });
  }
});

import fs from "fs";
import path from "path";

router.get("/admin/debug-emails", requireAdmin, async (req, res): Promise<void> => {
  try {
    const debugEmailPath = path.resolve(process.cwd(), "uploads", "sent-emails.json");
    if (fs.existsSync(debugEmailPath)) {
      const data = fs.readFileSync(debugEmailPath, "utf-8");
      res.json(JSON.parse(data));
    } else {
      res.json([]);
    }
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to read debug emails log" });
  }
});

export default router;
