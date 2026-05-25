import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, couponsTable } from "@workspace/db";
import {
  ValidateCouponBody,
  CreateCouponBody,
  UpdateCouponParams,
  UpdateCouponBody,
  DeleteCouponParams,
} from "@workspace/api-zod";
import { requireAuth, requireAdmin } from "../middlewares/auth";

const router = Router();

function formatCoupon(c: typeof couponsTable.$inferSelect) {
  return {
    ...c,
    discountValue: Number(c.discountValue),
    minOrderAmount: c.minOrderAmount != null ? Number(c.minOrderAmount) : null,
    maxDiscount: c.maxDiscount != null ? Number(c.maxDiscount) : null,
    expiresAt: c.expiresAt instanceof Date ? c.expiresAt.toISOString() : c.expiresAt,
  };
}

router.post("/coupons/validate", requireAuth, async (req, res): Promise<void> => {
  const parsed = ValidateCouponBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { code, orderAmount } = parsed.data;
  const [coupon] = await db
    .select()
    .from(couponsTable)
    .where(eq(couponsTable.code, code.toUpperCase()))
    .limit(1);

  if (!coupon) {
    res.status(400).json({ error: "Invalid coupon code" });
    return;
  }

  if (!coupon.isActive) {
    res.status(400).json({ error: "Coupon is not active" });
    return;
  }

  if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
    res.status(400).json({ error: "Coupon has expired" });
    return;
  }

  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
    res.status(400).json({ error: "Coupon usage limit reached" });
    return;
  }

  if (coupon.minOrderAmount != null && orderAmount != null && Number(orderAmount) < Number(coupon.minOrderAmount)) {
    res.status(400).json({ error: `Minimum order amount is ₹${Number(coupon.minOrderAmount).toLocaleString("en-IN")}` });
    return;
  }

  res.json(formatCoupon(coupon));
});

router.get("/coupons", requireAdmin, async (_req, res): Promise<void> => {
  const coupons = await db.select().from(couponsTable).orderBy(couponsTable.id);
  res.json(coupons.map(formatCoupon));
});

router.post("/coupons", requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreateCouponBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const data = {
    ...parsed.data,
    code: parsed.data.code.toUpperCase(),
    discountValue: String(parsed.data.discountValue),
    minOrderAmount: parsed.data.minOrderAmount != null ? String(parsed.data.minOrderAmount) : undefined,
    maxDiscount: parsed.data.maxDiscount != null ? String(parsed.data.maxDiscount) : undefined,
    expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : undefined,
  };

  const [coupon] = await db.insert(couponsTable).values(data).returning();
  res.status(201).json(formatCoupon(coupon));
});

router.patch("/coupons/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = UpdateCouponParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateCouponBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.code) updateData.code = parsed.data.code.toUpperCase();
  if (parsed.data.discountValue != null) updateData.discountValue = String(parsed.data.discountValue);
  if (parsed.data.minOrderAmount != null) updateData.minOrderAmount = String(parsed.data.minOrderAmount);
  if (parsed.data.maxDiscount != null) updateData.maxDiscount = String(parsed.data.maxDiscount);
  if (parsed.data.expiresAt) updateData.expiresAt = new Date(parsed.data.expiresAt);

  const [coupon] = await db
    .update(couponsTable)
    .set(updateData)
    .where(eq(couponsTable.id, params.data.id))
    .returning();

  if (!coupon) {
    res.status(404).json({ error: "Coupon not found" });
    return;
  }

  res.json(formatCoupon(coupon));
});

router.delete("/coupons/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = DeleteCouponParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [coupon] = await db
    .delete(couponsTable)
    .where(eq(couponsTable.id, params.data.id))
    .returning();

  if (!coupon) {
    res.status(404).json({ error: "Coupon not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
