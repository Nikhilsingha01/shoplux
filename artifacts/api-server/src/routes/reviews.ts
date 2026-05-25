import { Router } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, reviewsTable, productsTable, ordersTable, orderItemsTable, appUsersTable } from "@workspace/db";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { clerkClient } from "@clerk/express";
import { logger } from "../lib/logger";

const router = Router();

// GET /products/:id/reviews
router.get("/products/:id/reviews", async (req, res): Promise<void> => {
  const productId = parseInt(req.params.id, 10);
  if (isNaN(productId)) {
    res.status(400).json({ error: "Invalid product ID" });
    return;
  }

  try {
    const reviews = await db
      .select()
      .from(reviewsTable)
      .where(eq(reviewsTable.productId, productId))
      .orderBy(sql`${reviewsTable.createdAt} DESC`);

    res.json(reviews);
  } catch (err: any) {
    logger.error({ err }, "Failed to fetch reviews");
    res.status(500).json({ error: err.message || "Failed to fetch reviews" });
  }
});

// POST /products/:id/reviews
router.post("/products/:id/reviews", requireAuth, async (req, res): Promise<void> => {
  const productId = parseInt(req.params.id as string, 10);
  if (isNaN(productId)) {
    res.status(400).json({ error: "Invalid product ID" });
    return;
  }

  const { rating, reviewText } = req.body;
  if (!rating || rating < 1 || rating > 5) {
    res.status(400).json({ error: "Rating must be an integer between 1 and 5" });
    return;
  }
  if (!reviewText || !reviewText.trim()) {
    res.status(400).json({ error: "Review text is required" });
    return;
  }

  // requireAuth sets req.userId (not req.user)
  const userId = (req as any).userId as string | undefined;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  // Try to get customer name from app_users table, then fallback to Clerk
  let customerName = "Anonymous";
  try {
    const [appUser] = await db.select().from(appUsersTable).where(eq(appUsersTable.clerkUserId, userId)).limit(1);
    if (appUser?.fullName) {
      customerName = appUser.fullName;
    } else if (appUser?.email) {
      customerName = appUser.email.split("@")[0];
    } else {
      // fallback to Clerk API
      const clerkUser = await clerkClient.users.getUser(userId).catch(() => null);
      if (clerkUser) {
        customerName = `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim() || clerkUser.emailAddresses[0]?.emailAddress?.split("@")[0] || "Anonymous";
      }
    }
  } catch (e) {
    logger.warn({ e }, "Could not resolve customer name for review");
  }

  try {
    // Check if user has purchased the product
    const purchased = await db
      .select({ id: ordersTable.id })
      .from(ordersTable)
      .innerJoin(orderItemsTable, eq(orderItemsTable.orderId, ordersTable.id))
      .where(
        and(
          eq(ordersTable.userId, userId),
          eq(orderItemsTable.productId, productId)
        )
      )
      .limit(1);

    if (!purchased.length) {
      res.status(403).json({ error: "Only customers who have purchased this product can leave a review." });
      return;
    }

    // Insert review
    const [review] = await db
      .insert(reviewsTable)
      .values({
        productId,
        userId,
        customerName,
        rating,
        reviewText: reviewText.trim(),
      })
      .returning();

    // Recalculate average rating
    const allReviews = await db
      .select()
      .from(reviewsTable)
      .where(eq(reviewsTable.productId, productId));

    const count = allReviews.length;
    const avg = count > 0 ? allReviews.reduce((sum, r) => sum + r.rating, 0) / count : 0;

    await db
      .update(productsTable)
      .set({
        rating: String(avg.toFixed(2)),
        reviewCount: count,
      })
      .where(eq(productsTable.id, productId));

    res.status(201).json(review);
  } catch (err: any) {
    logger.error({ err }, "Failed to create review");
    res.status(500).json({ error: err.message || "Failed to create review" });
  }
});

// DELETE /admin/reviews/:id (Requires Admin)
router.delete("/admin/reviews/:id", requireAdmin, async (req, res): Promise<void> => {
  const reviewId = parseInt(req.params.id as string, 10);
  if (isNaN(reviewId)) {
    res.status(400).json({ error: "Invalid review ID" });
    return;
  }

  try {
    // Fetch review before deleting to know the productId
    const [review] = await db
      .select()
      .from(reviewsTable)
      .where(eq(reviewsTable.id, reviewId))
      .limit(1);

    if (!review) {
      res.status(404).json({ error: "Review not found" });
      return;
    }

    const productId = review.productId;

    // Delete review
    await db.delete(reviewsTable).where(eq(reviewsTable.id, reviewId));

    // Recalculate average rating
    const allReviews = await db
      .select()
      .from(reviewsTable)
      .where(eq(reviewsTable.productId, productId));

    const count = allReviews.length;
    const avg = count > 0 ? allReviews.reduce((sum, r) => sum + r.rating, 0) / count : 0;

    await db
      .update(productsTable)
      .set({
        rating: String(avg.toFixed(2)),
        reviewCount: count,
      })
      .where(eq(productsTable.id, productId));

    res.sendStatus(204);
  } catch (err: any) {
    logger.error({ err }, "Failed to delete review");
    res.status(500).json({ error: err.message || "Failed to delete review" });
  }
});

// GET /admin/reviews (All reviews for moderation)
router.get("/admin/reviews", requireAdmin, async (_req, res): Promise<void> => {
  try {
    const reviews = await db
      .select({
        id: reviewsTable.id,
        productId: reviewsTable.productId,
        productName: productsTable.name,
        userId: reviewsTable.userId,
        customerName: reviewsTable.customerName,
        rating: reviewsTable.rating,
        reviewText: reviewsTable.reviewText,
        createdAt: reviewsTable.createdAt,
      })
      .from(reviewsTable)
      .leftJoin(productsTable, eq(reviewsTable.productId, productsTable.id))
      .orderBy(sql`${reviewsTable.createdAt} DESC`);

    res.json(reviews);
  } catch (err: any) {
    logger.error({ err }, "Failed to fetch admin reviews");
    res.status(500).json({ error: err.message || "Failed to fetch reviews" });
  }
});

export default router;
