import { Router } from "express";
import { eq, ilike, and, asc, desc, sql, or, isNull } from "drizzle-orm";
import { db, productsTable, categoriesTable } from "@workspace/db";
import {
  ListProductsQueryParams,
  CreateProductBody,
  GetProductParams,
  UpdateProductParams,
  UpdateProductBody,
  DeleteProductParams,
} from "@workspace/api-zod";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { resolveImageUrl } from "../lib/supabase";
import { logger } from "../lib/logger";

const router = Router();

function formatProduct(p: Record<string, unknown>, categoryName?: string | null) {
  const images = Array.isArray(p.images)
    ? p.images.map((img: string) => resolveImageUrl(img) || img)
    : p.images;
  return {
    ...p,
    images,
    price: Number(p.price),
    comparePrice: p.comparePrice != null ? Number(p.comparePrice) : null,
    discount: p.discount != null ? Number(p.discount) : null,
    rating: p.rating != null ? Number(p.rating) : null,
    deliveryCharge: p.deliveryCharge != null ? Number(p.deliveryCharge) : 0,
    isDeliveryChargeApplicable: p.isDeliveryChargeApplicable ?? false,
    categoryName: categoryName ?? null,
    createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
  };
}

router.get("/products", async (req, res): Promise<void> => {
  const parsed = ListProductsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { category, search, sort, featured, page = 1, limit = 20 } = parsed.data;
  const offset = (page - 1) * limit;

  const conditions = [or(eq(productsTable.isDeleted, false), isNull(productsTable.isDeleted))];
  if (category) {
    const cat = await db.select().from(categoriesTable).where(eq(categoriesTable.slug, category)).limit(1);
    if (cat[0]) conditions.push(eq(productsTable.categoryId, cat[0].id));
  }
  if (search) conditions.push(ilike(productsTable.name, `%${search}%`));
  if (featured === "true") conditions.push(eq(productsTable.isFeatured, true));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  let orderByClause;
  if (sort === "price_asc") orderByClause = [asc(productsTable.price)];
  else if (sort === "price_desc") orderByClause = [desc(productsTable.price)];
  else orderByClause = [asc(productsTable.sortOrder), desc(productsTable.createdAt)];

  const [products, countResult] = await Promise.all([
    db
      .select({
        product: productsTable,
        categoryName: categoriesTable.name,
      })
      .from(productsTable)
      .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
      .where(whereClause)
      .orderBy(...orderByClause)
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(productsTable).where(whereClause),
  ]);

  res.json({
    products: products.map((r) => formatProduct(r.product as unknown as Record<string, unknown>, r.categoryName)),
    total: Number(countResult[0].count),
    page,
    limit,
  });
});

router.get("/products/featured", async (_req, res): Promise<void> => {
  try {
    const [featured, trending, newArrivals, bestSellers] = await Promise.all([
      db
        .select({ product: productsTable, categoryName: categoriesTable.name })
        .from(productsTable)
        .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
        .where(and(eq(productsTable.isFeatured, true), or(eq(productsTable.isDeleted, false), isNull(productsTable.isDeleted))))
        .orderBy(asc(productsTable.sortOrder))
        .limit(8),
      db
        .select({ product: productsTable, categoryName: categoriesTable.name })
        .from(productsTable)
        .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
        .where(and(eq(productsTable.isTrending, true), or(eq(productsTable.isDeleted, false), isNull(productsTable.isDeleted))))
        .orderBy(asc(productsTable.sortOrder))
        .limit(8),
      db
        .select({ product: productsTable, categoryName: categoriesTable.name })
        .from(productsTable)
        .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
        .where(and(eq(productsTable.isNewArrival, true), or(eq(productsTable.isDeleted, false), isNull(productsTable.isDeleted))))
        .orderBy(asc(productsTable.sortOrder))
        .limit(8),
      db
        .select({ product: productsTable, categoryName: categoriesTable.name })
        .from(productsTable)
        .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
        .where(and(eq(productsTable.isBestSeller, true), or(eq(productsTable.isDeleted, false), isNull(productsTable.isDeleted))))
        .orderBy(asc(productsTable.sortOrder))
        .limit(8),
    ]);

    res.json({
      featured: featured.map((r) => formatProduct(r.product as unknown as Record<string, unknown>, r.categoryName)),
      trending: trending.map((r) => formatProduct(r.product as unknown as Record<string, unknown>, r.categoryName)),
      newArrivals: newArrivals.map((r) => formatProduct(r.product as unknown as Record<string, unknown>, r.categoryName)),
      bestSellers: bestSellers.map((r) => formatProduct(r.product as unknown as Record<string, unknown>, r.categoryName)),
    });
  } catch (err: any) {
    logger.error({ err }, "Featured products fetch failed");
    res.status(500).json({
      error: "Internal Server Error in featured products",
      message: err.message,
      stack: err.stack,
      cause: err.cause ? {
        message: err.cause.message,
        code: err.cause.code,
        detail: err.cause.detail,
        stack: err.cause.stack,
      } : null,
    });
  }
});

router.get("/products/:id", async (req, res): Promise<void> => {
  const params = GetProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const result = await db
    .select({ product: productsTable, categoryName: categoriesTable.name })
    .from(productsTable)
    .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
    .where(and(eq(productsTable.id, params.data.id), or(eq(productsTable.isDeleted, false), isNull(productsTable.isDeleted))))
    .limit(1);

  if (!result[0]) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  res.json(formatProduct(result[0].product as unknown as Record<string, unknown>, result[0].categoryName));
});

router.post("/products", requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { name, slug, price, stock, images, ...rest } = parsed.data;
  const autoSlug = slug ?? name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

  const insertData: Record<string, unknown> = {
    name,
    slug: autoSlug,
    price: String(price),
    stock: stock ?? 0,
    images: images ?? [],
    ...rest,
  };
  if ((rest as any).deliveryCharge != null) {
    insertData.deliveryCharge = String((rest as any).deliveryCharge);
  }

  try {
    const [product] = await db
      .insert(productsTable)
      .values(insertData as any)
      .returning();

    res.status(201).json(formatProduct(product as unknown as Record<string, unknown>));
  } catch (err: any) {
    logger.error({ err }, "Failed to create product");
    if (err.code === "23505") {
      res.status(400).json({ error: "A product with this name or slug already exists." });
      return;
    }
    res.status(500).json({ error: err.message || "Failed to create product due to an internal error." });
  }
});

router.patch("/products/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = UpdateProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.price != null) updateData.price = String(parsed.data.price);
  if (parsed.data.comparePrice != null) updateData.comparePrice = String(parsed.data.comparePrice);
  if (parsed.data.discount != null) updateData.discount = String(parsed.data.discount);
  if ((parsed.data as any).deliveryCharge != null) {
    updateData.deliveryCharge = String((parsed.data as any).deliveryCharge);
  }

  try {
    const [product] = await db
      .update(productsTable)
      .set(updateData)
      .where(eq(productsTable.id, params.data.id))
      .returning();

    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }

    res.json(formatProduct(product as unknown as Record<string, unknown>));
  } catch (err: any) {
    logger.error({ err }, "Failed to update product");
    if (err.code === "23505") {
      res.status(400).json({ error: "A product with this name or slug already exists." });
      return;
    }
    res.status(500).json({ error: err.message || "Failed to update product." });
  }
});

router.delete("/products/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = DeleteProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  try {
    const [product] = await db
      .update(productsTable)
      .set({ isDeleted: true })
      .where(eq(productsTable.id, params.data.id))
      .returning();

    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }

    res.sendStatus(204);
  } catch (err: any) {
    logger.error({ err }, "Failed to soft-delete product");
    res.status(500).json({ error: err.message || "Failed to delete product." });
  }
});

export default router;
