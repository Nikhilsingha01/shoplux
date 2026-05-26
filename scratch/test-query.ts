import { db, productsTable, categoriesTable } from "../lib/db/src/index.ts";
import { and, eq, or, isNull } from "drizzle-orm";

async function run() {
  try {
    console.log("Running Drizzle query locally against Supabase...");
    const [featured, trending, newArrivals, bestSellers] = await Promise.all([
      db
        .select({ product: productsTable, categoryName: categoriesTable.name })
        .from(productsTable)
        .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
        .where(and(eq(productsTable.isFeatured, true), or(eq(productsTable.isDeleted, false), isNull(productsTable.isDeleted))))
        .limit(8),
      db
        .select({ product: productsTable, categoryName: categoriesTable.name })
        .from(productsTable)
        .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
        .where(and(eq(productsTable.isTrending, true), or(eq(productsTable.isDeleted, false), isNull(productsTable.isDeleted))))
        .limit(8),
      db
        .select({ product: productsTable, categoryName: categoriesTable.name })
        .from(productsTable)
        .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
        .where(and(eq(productsTable.isNewArrival, true), or(eq(productsTable.isDeleted, false), isNull(productsTable.isDeleted))))
        .limit(8),
      db
        .select({ product: productsTable, categoryName: categoriesTable.name })
        .from(productsTable)
        .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
        .where(and(eq(productsTable.isBestSeller, true), or(eq(productsTable.isDeleted, false), isNull(productsTable.isDeleted))))
        .limit(8),
    ]);

    console.log("SUCCESS!");
    console.log("Featured count:", featured.length);
    console.log("Trending count:", trending.length);
    console.log("New Arrivals count:", newArrivals.length);
    console.log("Best Sellers count:", bestSellers.length);
  } catch (error: any) {
    console.error("FAILED WITH ERROR:");
    console.error("Message:", error.message);
    console.error("Stack:", error.stack);
    if (error.cause) {
      console.error("Cause message:", error.cause.message);
      console.error("Cause code:", error.cause.code);
      console.error("Cause detail:", error.cause.detail);
      console.error("Cause stack:", error.cause.stack);
    }
  }
  process.exit(0);
}

run();
