import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, wishlistTable, productsTable, categoriesTable } from "@workspace/db";
import { AddToWishlistBody, RemoveFromWishlistParams } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router = Router();

function formatProduct(p: Record<string, unknown>, categoryName?: string | null) {
  return {
    ...p,
    price: Number(p.price),
    comparePrice: p.comparePrice != null ? Number(p.comparePrice) : null,
    discount: p.discount != null ? Number(p.discount) : null,
    rating: p.rating != null ? Number(p.rating) : null,
    categoryName: categoryName ?? null,
    createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
  };
}

router.get("/wishlist", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as typeof req & { userId: string }).userId;

  const items = await db
    .select({
      wishlist: wishlistTable,
      product: productsTable,
      categoryName: categoriesTable.name,
    })
    .from(wishlistTable)
    .innerJoin(productsTable, eq(wishlistTable.productId, productsTable.id))
    .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
    .where(eq(wishlistTable.userId, userId));

  res.json(
    items.map((r) => ({
      id: r.wishlist.id,
      userId: r.wishlist.userId,
      productId: r.wishlist.productId,
      product: formatProduct(r.product as unknown as Record<string, unknown>, r.categoryName),
    })),
  );
});

router.post("/wishlist", requireAuth, async (req, res): Promise<void> => {
  const parsed = AddToWishlistBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const userId = (req as typeof req & { userId: string }).userId;

  // Check if already in wishlist
  const existing = await db
    .select()
    .from(wishlistTable)
    .where(and(eq(wishlistTable.userId, userId), eq(wishlistTable.productId, parsed.data.productId)))
    .limit(1);

  if (existing[0]) {
    // Return existing item with product
    const [item] = await db
      .select({ wishlist: wishlistTable, product: productsTable, categoryName: categoriesTable.name })
      .from(wishlistTable)
      .innerJoin(productsTable, eq(wishlistTable.productId, productsTable.id))
      .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
      .where(eq(wishlistTable.id, existing[0].id))
      .limit(1);
    res.status(201).json({
      id: item.wishlist.id,
      userId: item.wishlist.userId,
      productId: item.wishlist.productId,
      product: formatProduct(item.product as unknown as Record<string, unknown>, item.categoryName),
    });
    return;
  }

  const [wishlistItem] = await db
    .insert(wishlistTable)
    .values({ userId, productId: parsed.data.productId })
    .returning();

  const [fullItem] = await db
    .select({ wishlist: wishlistTable, product: productsTable, categoryName: categoriesTable.name })
    .from(wishlistTable)
    .innerJoin(productsTable, eq(wishlistTable.productId, productsTable.id))
    .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
    .where(eq(wishlistTable.id, wishlistItem.id))
    .limit(1);

  res.status(201).json({
    id: fullItem.wishlist.id,
    userId: fullItem.wishlist.userId,
    productId: fullItem.wishlist.productId,
    product: formatProduct(fullItem.product as unknown as Record<string, unknown>, fullItem.categoryName),
  });
});

router.delete("/wishlist/:productId", requireAuth, async (req, res): Promise<void> => {
  const params = RemoveFromWishlistParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const userId = (req as typeof req & { userId: string }).userId;

  await db
    .delete(wishlistTable)
    .where(and(eq(wishlistTable.userId, userId), eq(wishlistTable.productId, params.data.productId)));

  res.sendStatus(204);
});

export default router;
