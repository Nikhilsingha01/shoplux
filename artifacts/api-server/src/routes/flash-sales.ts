import { Router } from "express";
import { eq, and, lte, gte, or, isNull, inArray } from "drizzle-orm";
import { db, flashSalesTable, productsTable } from "@workspace/db";
import { requireAdmin } from "../middlewares/auth";
import { logger } from "../lib/logger";

const router = Router();

// GET /flash-sales/active
router.get("/flash-sales/active", async (_req, res): Promise<void> => {
  try {
    const now = new Date();
    // Fetch active sale
    const sales = await db
      .select()
      .from(flashSalesTable)
      .where(
        and(
          eq(flashSalesTable.isActive, true),
          lte(flashSalesTable.startTime, now),
          gte(flashSalesTable.endTime, now)
        )
      )
      .limit(1);

    const sale = sales[0] || null;
    if (!sale) {
      res.json({ sale: null, products: [] });
      return;
    }

    // Fetch products belonging to this sale
    const products = await db
      .select()
      .from(productsTable)
      .where(
        and(
          eq(productsTable.flashSaleId, sale.id),
          or(eq(productsTable.isDeleted, false), isNull(productsTable.isDeleted))
        )
      );

    const formattedProducts = products.map((p) => ({
      ...p,
      price: Number(p.price),
      comparePrice: p.comparePrice != null ? Number(p.comparePrice) : null,
      discount: Number(sale.discountPercent), // Flash sale override discount percent!
      flashPrice: Number(p.price) * (1 - Number(sale.discountPercent) / 100),
    }));

    res.json({
      sale,
      products: formattedProducts,
    });
  } catch (err: any) {
    logger.error({ err }, "Failed to fetch active flash sale");
    res.status(500).json({ error: err.message || "Failed to fetch active flash sale" });
  }
});

// GET /admin/flash-sales (List all for admin panel)
router.get("/admin/flash-sales", requireAdmin, async (_req, res): Promise<void> => {
  try {
    const sales = await db
      .select()
      .from(flashSalesTable)
      .orderBy(flashSalesTable.createdAt);
    res.json(sales);
  } catch (err: any) {
    logger.error({ err }, "Failed to fetch flash sales");
    res.status(500).json({ error: err.message || "Failed to fetch flash sales" });
  }
});

// POST /admin/flash-sales (Create flash sale)
router.post("/admin/flash-sales", requireAdmin, async (req, res): Promise<void> => {
  const { title, discountPercent, startTime, endTime, productIds } = req.body;

  if (!title || !discountPercent || !startTime || !endTime) {
    res.status(400).json({ error: "Missing required fields (title, discountPercent, startTime, endTime)" });
    return;
  }

  try {
    // Deactivate previous active sales
    await db
      .update(flashSalesTable)
      .set({ isActive: false })
      .where(eq(flashSalesTable.isActive, true));

    // Insert new sale
    const [sale] = await db
      .insert(flashSalesTable)
      .values({
        title,
        discountPercent: String(discountPercent),
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        isActive: true,
      })
      .returning();

    // Associate products with flash sale
    if (Array.isArray(productIds) && productIds.length > 0) {
      // Clear flashSaleId from other products
      await db
        .update(productsTable)
        .set({ flashSaleId: null })
        .where(eq(productsTable.flashSaleId, sale.id));

      await db
        .update(productsTable)
        .set({ flashSaleId: sale.id })
        .where(inArray(productsTable.id, productIds));
    }

    res.status(201).json(sale);
  } catch (err: any) {
    logger.error({ err }, "Failed to create flash sale");
    res.status(500).json({ error: err.message || "Failed to create flash sale" });
  }
});

// DELETE /admin/flash-sales/:id
router.delete("/admin/flash-sales/:id", requireAdmin, async (req, res): Promise<void> => {
  const saleId = parseInt(req.params.id as string, 10);
  if (isNaN(saleId)) {
    res.status(400).json({ error: "Invalid flash sale ID" });
    return;
  }

  try {
    // Reset products flash sale ID
    await db
      .update(productsTable)
      .set({ flashSaleId: null })
      .where(eq(productsTable.flashSaleId, saleId));

    // Delete sale
    const [deleted] = await db
      .delete(flashSalesTable)
      .where(eq(flashSalesTable.id, saleId))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "Flash sale not found" });
      return;
    }

    res.sendStatus(204);
  } catch (err: any) {
    logger.error({ err }, "Failed to delete flash sale");
    res.status(500).json({ error: err.message || "Failed to delete flash sale" });
  }
});

export default router;
