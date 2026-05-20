import * as dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });
import { db, productsTable, categoriesTable, bannersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

async function main() {
  const products = await db.select().from(productsTable);
  for (const p of products) {
    if (p.images && p.images.length > 0) {
      let changed = false;
      const newImages = p.images.map(img => {
        if (img.startsWith("/api/uploads/")) {
          changed = true;
          return img.replace("/api/uploads/", "/uploads/");
        }
        return img;
      });
      if (changed) {
        await db.update(productsTable).set({ images: newImages }).where(eq(productsTable.id, p.id));
        console.log(`Updated product ${p.id}`);
      }
    }
  }

  const categories = await db.select().from(categoriesTable);
  for (const c of categories) {
    if (c.image && c.image.startsWith("/api/uploads/")) {
      await db.update(categoriesTable).set({ image: c.image.replace("/api/uploads/", "/uploads/") }).where(eq(categoriesTable.id, c.id));
      console.log(`Updated category ${c.id}`);
    }
  }

  const banners = await db.select().from(bannersTable);
  for (const b of banners) {
    if (b.imageUrl && b.imageUrl.startsWith("/api/uploads/")) {
      await db.update(bannersTable).set({ imageUrl: b.imageUrl.replace("/api/uploads/", "/uploads/") }).where(eq(bannersTable.id, b.id));
      console.log(`Updated banner ${b.id}`);
    }
  }
  
  console.log("Cleanup done.");
  process.exit(0);
}

main();
