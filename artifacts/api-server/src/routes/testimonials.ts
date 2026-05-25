import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, testimonialsTable } from "@workspace/db";
import { requireAdmin } from "../middlewares/auth";
import { logger } from "../lib/logger";

const router = Router();

// GET /testimonials
router.get("/testimonials", async (_req, res): Promise<void> => {
  try {
    const list = await db
      .select()
      .from(testimonialsTable)
      .where(eq(testimonialsTable.isActive, true))
      .orderBy(testimonialsTable.createdAt);
    res.json(list);
  } catch (err: any) {
    logger.error({ err }, "Failed to fetch testimonials");
    res.status(500).json({ error: err.message || "Failed to fetch testimonials" });
  }
});

// GET /admin/testimonials (All including inactive)
router.get("/admin/testimonials", requireAdmin, async (_req, res): Promise<void> => {
  try {
    const list = await db
      .select()
      .from(testimonialsTable)
      .orderBy(testimonialsTable.createdAt);
    res.json(list);
  } catch (err: any) {
    logger.error({ err }, "Failed to fetch admin testimonials");
    res.status(500).json({ error: err.message || "Failed to fetch testimonials" });
  }
});

// POST /admin/testimonials
router.post("/admin/testimonials", requireAdmin, async (req, res): Promise<void> => {
  const { name, role, reviewText, imageUrl, rating, isActive } = req.body;

  if (!name || !reviewText) {
    res.status(400).json({ error: "Name and testimonial text are required" });
    return;
  }

  try {
    const [testimonial] = await db
      .insert(testimonialsTable)
      .values({
        name,
        role: role || "Verified Buyer",
        reviewText,
        imageUrl: imageUrl || null,
        rating: rating != null ? Number(rating) : 5,
        isActive: isActive !== false,
      })
      .returning();

    res.status(201).json(testimonial);
  } catch (err: any) {
    logger.error({ err }, "Failed to create testimonial");
    res.status(500).json({ error: err.message || "Failed to create testimonial" });
  }
});

// PATCH /admin/testimonials/:id
router.patch("/admin/testimonials/:id", requireAdmin, async (req, res): Promise<void> => {
  const testId = parseInt(req.params.id as string, 10);
  if (isNaN(testId)) {
    res.status(400).json({ error: "Invalid testimonial ID" });
    return;
  }

  const { name, role, reviewText, imageUrl, rating, isActive } = req.body;

  try {
    const [updated] = await db
      .update(testimonialsTable)
      .set({
        name,
        role,
        reviewText,
        imageUrl,
        rating: rating != null ? Number(rating) : undefined,
        isActive,
      })
      .where(eq(testimonialsTable.id, testId))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Testimonial not found" });
      return;
    }

    res.json(updated);
  } catch (err: any) {
    logger.error({ err }, "Failed to update testimonial");
    res.status(500).json({ error: err.message || "Failed to update testimonial" });
  }
});

// DELETE /admin/testimonials/:id
router.delete("/admin/testimonials/:id", requireAdmin, async (req, res): Promise<void> => {
  const testId = parseInt(req.params.id as string, 10);
  if (isNaN(testId)) {
    res.status(400).json({ error: "Invalid testimonial ID" });
    return;
  }

  try {
    const [deleted] = await db
      .delete(testimonialsTable)
      .where(eq(testimonialsTable.id, testId))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "Testimonial not found" });
      return;
    }

    res.sendStatus(204);
  } catch (err: any) {
    logger.error({ err }, "Failed to delete testimonial");
    res.status(500).json({ error: err.message || "Failed to delete testimonial" });
  }
});

export default router;
