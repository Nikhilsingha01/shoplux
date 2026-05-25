import { Router } from "express";
import { eq, sql, and, or, isNull } from "drizzle-orm";
import { db, categoriesTable, productsTable } from "@workspace/db";
import {
  CreateCategoryBody,
  UpdateCategoryParams,
  UpdateCategoryBody,
  DeleteCategoryParams,
} from "@workspace/api-zod";
import { requireAdmin } from "../middlewares/auth";
import { resolveImageUrl } from "../lib/supabase";

const router = Router();

router.get("/categories", async (_req, res): Promise<void> => {
  const cats = await db
    .select({
      id: categoriesTable.id,
      name: categoriesTable.name,
      slug: categoriesTable.slug,
      description: categoriesTable.description,
      image: categoriesTable.image,
      productCount: sql<number>`count(${productsTable.id})`,
    })
    .from(categoriesTable)
    .leftJoin(
      productsTable,
      and(
        eq(productsTable.categoryId, categoriesTable.id),
        or(eq(productsTable.isDeleted, false), isNull(productsTable.isDeleted))
      )
    )
    .groupBy(categoriesTable.id)
    .orderBy(categoriesTable.name);

  res.json(cats.map((c) => ({
    ...c,
    image: resolveImageUrl(c.image),
    productCount: Number(c.productCount),
  })));
});

router.post("/categories", requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreateCategoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [cat] = await db.insert(categoriesTable).values(parsed.data).returning();
  if (cat && cat.image) {
    cat.image = resolveImageUrl(cat.image) ?? cat.image;
  }
  res.status(201).json({ ...cat, productCount: 0 });
});

router.patch("/categories/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = UpdateCategoryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateCategoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [cat] = await db
    .update(categoriesTable)
    .set(parsed.data)
    .where(eq(categoriesTable.id, params.data.id))
    .returning();

  if (!cat) {
    res.status(404).json({ error: "Category not found" });
    return;
  }

  if (cat.image) {
    cat.image = resolveImageUrl(cat.image) ?? cat.image;
  }
  res.json({ ...cat, productCount: 0 });
});

router.delete("/categories/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = DeleteCategoryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  // Set categoryId to null for all products in this category to prevent foreign key constraints
  await db
    .update(productsTable)
    .set({ categoryId: null })
    .where(eq(productsTable.categoryId, params.data.id));

  const [cat] = await db
    .delete(categoriesTable)
    .where(eq(categoriesTable.id, params.data.id))
    .returning();

  if (!cat) {
    res.status(404).json({ error: "Category not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
