import { Router } from "express";
import { desc, sql, eq, and, or, isNull } from "drizzle-orm";
import { db, adminSettingsTable, ordersTable, productsTable, appUsersTable, categoriesTable } from "@workspace/db";
import { UpdateAdminSettingsBody, ListUsersQueryParams, ReorderProductsBody } from "@workspace/api-zod";
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
    db.select({ count: sql<number>`count(*)` }).from(productsTable).where(or(eq(productsTable.isDeleted, false), isNull(productsTable.isDeleted))),
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

function parseCSVLine(line: string) {
  const result = [];
  let current = "";
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  
  return result.map(v => v.replace(/^"|"$/g, '').trim());
}

function parseCSV(csvText: string) {
  const lines = csvText.split(/\r?\n/);
  if (lines.length < 2) return { headers: [], rows: [] };
  
  const headers = parseCSVLine(lines[0]);
  const rows = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseCSVLine(line);
    
    const rowObj: Record<string, string> = {};
    headers.forEach((header, index) => {
      rowObj[header.trim().toLowerCase()] = values[index] ? values[index].trim() : "";
    });
    rows.push(rowObj);
  }
  
  return { headers, rows };
}

// POST /admin/products/bulk-import (CSV Uploader)
router.post("/admin/products/bulk-import", requireAdmin, upload.single("file"), async (req, res): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: "No CSV file uploaded." });
    return;
  }

  const csvText = req.file.buffer.toString("utf-8");
  const { rows } = parseCSV(csvText);

  if (rows.length === 0) {
    res.status(400).json({ error: "CSV file is empty or missing data rows." });
    return;
  }

  const results = [];
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const name = row.name || row.title || "";
    const priceStr = row.price || "";
    const stockStr = row.stock || row.quantity || "0";
    const description = row.description || row.desc || "";
    const comparePriceStr = row.compareprice || row.compare_price || "";
    const categoryName = row.category || "";
    const imagesStr = row.images || row.image || "";

    const rowNum = i + 2; // Row number in CSV file (1-indexed header + 1-indexed loop)

    if (!name) {
      results.push({ row: rowNum, name: "Unknown", status: "error", error: "Product name is missing." });
      errorCount++;
      continue;
    }

    const price = parseFloat(priceStr);
    if (isNaN(price)) {
      results.push({ row: rowNum, name, status: "error", error: `Invalid price value: '${priceStr}'` });
      errorCount++;
      continue;
    }

    try {
      // Find or create category
      let categoryId: number | null = null;
      if (categoryName) {
        const catSlug = categoryName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
        const catList = await db.select().from(categoriesTable).where(eq(categoriesTable.slug, catSlug)).limit(1);
        if (catList[0]) {
          categoryId = catList[0].id;
        } else {
          // Auto-create category
          const [newCat] = await db
            .insert(categoriesTable)
            .values({ name: categoryName, slug: catSlug })
            .returning();
          categoryId = newCat.id;
        }
      }

      // Generate slug and parse images
      const baseSlug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      const finalSlug = `${baseSlug}-${Math.floor(Math.random() * 90000) + 10000}`;
      const images = imagesStr ? imagesStr.split(",").map((url) => url.trim()).filter((url) => url.length > 0) : [];
      const stock = parseInt(stockStr, 10) || 0;
      const comparePrice = comparePriceStr ? String(parseFloat(comparePriceStr)) : null;

      // Insert product
      await db
        .insert(productsTable)
        .values({
          name,
          slug: finalSlug,
          price: String(price),
          comparePrice: comparePrice || undefined as any,
          description,
          stock,
          categoryId,
          images,
        });

      results.push({ row: rowNum, name, status: "success" });
      successCount++;
    } catch (err: any) {
      results.push({ row: rowNum, name, status: "error", error: err.message || "Failed to save product." });
      errorCount++;
    }
  }

  res.json({
    successCount,
    errorCount,
    results,
  });
});

router.post("/admin/products/reorder", requireAdmin, async (req, res): Promise<void> => {
  const parsed = ReorderProductsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { ids } = parsed.data;

  try {
    await db.transaction(async (tx) => {
      for (let i = 0; i < ids.length; i++) {
        await tx
          .update(productsTable)
          .set({ sortOrder: i })
          .where(eq(productsTable.id, ids[i]));
      }
    });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to reorder products" });
  }
});

export default router;
