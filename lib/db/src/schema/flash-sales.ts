import { pgTable, text, serial, numeric, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const flashSalesTable = pgTable("flash_sales", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  discountPercent: numeric("discount_percent", { precision: 5, scale: 2 }).notNull(),
  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  endTime: timestamp("end_time", { withTimezone: true }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertFlashSaleSchema = createInsertSchema(flashSalesTable).omit({ id: true, createdAt: true });
export type InsertFlashSale = z.infer<typeof insertFlashSaleSchema>;
export type FlashSale = typeof flashSalesTable.$inferSelect;
