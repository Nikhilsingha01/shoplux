import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../.env") });

import { db, productsTable, categoriesTable } from "./src/index.js";
import { and, eq, or, isNull } from "drizzle-orm";

function resolveImageUrl(imageName) {
  if (!imageName) return "";
  if (imageName.startsWith("http://") || imageName.startsWith("https://")) {
    return imageName;
  }
  // supabase url resolve mockup
  const supabaseUrl = process.env.SUPABASE_URL || "https://xxxx.supabase.co";
  return `${supabaseUrl}/storage/v1/object/public/products/${imageName}`;
}

function formatProduct(p, categoryName) {
  const images = Array.isArray(p.images)
    ? p.images.map((img) => resolveImageUrl(img) || img)
    : p.images;
  return {
    ...p,
    images,
    price: Number(p.price),
    comparePrice: p.comparePrice != null ? Number(p.comparePrice) : null,
    discount: p.discount != null ? Number(p.discount) : null,
    rating: p.rating != null ? Number(p.rating) : null,
    deliveryCharge: p.deliveryCharge != null ? Number(p.deliveryCharge) : 0,
    isDeliveryChargeApplicable: p.isDeliveryChargeApplicable ?? false,
    categoryName: categoryName ?? null,
    createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
  };
}

async function main() {
  try {
    console.log("Running drizzle query for featured/trending/newArrivals/bestSellers...");
    
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

    const result = {
      featured: featured.map((r) => formatProduct(r.product, r.categoryName)),
      trending: trending.map((r) => formatProduct(r.product, r.categoryName)),
      newArrivals: newArrivals.map((r) => formatProduct(r.product, r.categoryName)),
      bestSellers: bestSellers.map((r) => formatProduct(r.product, r.categoryName)),
    };

    console.log("Featured result count:", result.featured.length);
    console.log("Trending result count:", result.trending.length);
    console.log("New Arrivals result count:", result.newArrivals.length);
    console.log("Best Sellers result count:", result.bestSellers.length);

    console.log("Featured items:", result.featured);
  } catch (error) {
    console.error("Drizzle query failed:", error);
  } finally {
    process.exit(0);
  }
}

main();
