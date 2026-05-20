import { Router } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, addressesTable } from "@workspace/db";
import {
  CreateAddressBody,
  UpdateAddressParams,
  UpdateAddressBody,
  DeleteAddressParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router = Router();

(async () => {
  try {
    console.log("Running programmatic database migration for addresses table...");
    // 1. Create table if not exists
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS addresses (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        full_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT,
        address_line TEXT NOT NULL,
        landmark TEXT,
        city TEXT NOT NULL,
        state TEXT NOT NULL,
        pincode TEXT NOT NULL,
        is_default BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);
    
    // 2. Add columns if not exists (in case the table existed but without these new columns)
    await db.execute(sql`
      ALTER TABLE addresses ADD COLUMN IF NOT EXISTS email TEXT;
    `);
    await db.execute(sql`
      ALTER TABLE addresses ADD COLUMN IF NOT EXISTS landmark TEXT;
    `);
    await db.execute(sql`
      ALTER TABLE addresses ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT FALSE;
    `);
    console.log("Database migration for addresses table COMPLETED SUCCESSFULLY");
  } catch (err: any) {
    console.error("Database migration for addresses table FAILED:", err);
  }
})();

router.get("/addresses/debug", async (req, res): Promise<void> => {
  try {
    const cols = await db.execute(sql`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'addresses'
    `);
    res.json({ success: true, columns: cols.rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/addresses", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as typeof req & { userId: string }).userId;
  const addresses = await db
    .select()
    .from(addressesTable)
    .where(eq(addressesTable.userId, userId))
    .orderBy(addressesTable.id);

  res.json(addresses);
});

router.post("/addresses", requireAuth, async (req, res): Promise<void> => {
  try {
    const parsed = CreateAddressBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const userId = (req as typeof req & { userId: string }).userId;

    // If setting as default, unset others
    if (parsed.data.isDefault) {
      await db
        .update(addressesTable)
        .set({ isDefault: false })
        .where(eq(addressesTable.userId, userId));
    }

    const [address] = await db
      .insert(addressesTable)
      .values({ ...parsed.data, userId })
      .returning();

    res.status(201).json(address);
  } catch (error: any) {
    console.error("Error saving address:", error);
    res.status(500).json({ error: error.message || "Failed to save address" });
  }
});

router.patch("/addresses/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateAddressParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateAddressBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const userId = (req as typeof req & { userId: string }).userId;

  if (parsed.data.isDefault) {
    await db
      .update(addressesTable)
      .set({ isDefault: false })
      .where(eq(addressesTable.userId, userId));
  }

  const [address] = await db
    .update(addressesTable)
    .set(parsed.data)
    .where(and(eq(addressesTable.id, params.data.id), eq(addressesTable.userId, userId)))
    .returning();

  if (!address) {
    res.status(404).json({ error: "Address not found" });
    return;
  }

  res.json(address);
});

router.delete("/addresses/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteAddressParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const userId = (req as typeof req & { userId: string }).userId;

  const [address] = await db
    .delete(addressesTable)
    .where(and(eq(addressesTable.id, params.data.id), eq(addressesTable.userId, userId)))
    .returning();

  if (!address) {
    res.status(404).json({ error: "Address not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
