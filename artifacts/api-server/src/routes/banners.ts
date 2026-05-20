import { Router } from "express";
import { eq, asc } from "drizzle-orm";
import { db, bannersTable } from "@workspace/db";
import {
  CreateBannerBody,
  UpdateBannerParams,
  UpdateBannerBody,
  DeleteBannerParams,
} from "@workspace/api-zod";
import { requireAdmin } from "../middlewares/auth";

const router = Router();

router.get("/banners", async (_req, res): Promise<void> => {
  const banners = await db
    .select()
    .from(bannersTable)
    .where(eq(bannersTable.isActive, true))
    .orderBy(asc(bannersTable.sortOrder));

  const cleanedBanners = banners.map(b => ({
    ...b,
    imageUrl: b.imageUrl.startsWith("/api/uploads/") ? b.imageUrl.replace("/api/uploads/", "/uploads/") : b.imageUrl
  }));

  res.json(cleanedBanners);
});

router.post("/banners", requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreateBannerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [banner] = await db.insert(bannersTable).values(parsed.data).returning();
  if (banner) {
    banner.imageUrl = banner.imageUrl.startsWith("/api/uploads/") ? banner.imageUrl.replace("/api/uploads/", "/uploads/") : banner.imageUrl;
  }
  res.status(201).json(banner);
});

router.patch("/banners/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = UpdateBannerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateBannerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [banner] = await db
    .update(bannersTable)
    .set(parsed.data)
    .where(eq(bannersTable.id, params.data.id))
    .returning();

  if (!banner) {
    res.status(404).json({ error: "Banner not found" });
    return;
  }

  banner.imageUrl = banner.imageUrl.startsWith("/api/uploads/") ? banner.imageUrl.replace("/api/uploads/", "/uploads/") : banner.imageUrl;
  res.json(banner);
});

router.delete("/banners/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = DeleteBannerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [banner] = await db
    .delete(bannersTable)
    .where(eq(bannersTable.id, params.data.id))
    .returning();

  if (!banner) {
    res.status(404).json({ error: "Banner not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
