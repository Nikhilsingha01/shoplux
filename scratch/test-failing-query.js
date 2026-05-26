import pg from "pg";
import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../.env") });

async function main() {
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log("Connected to Supabase.");

    const query = `
      select 
        "products"."id", 
        "products"."name", 
        "products"."slug", 
        "products"."description", 
        "products"."price", 
        "products"."compare_price", 
        "products"."discount", 
        "products"."stock", 
        "products"."category_id", 
        "products"."images", 
        "products"."variants", 
        "products"."tags", 
        "products"."is_featured", 
        "products"."is_trending", 
        "products"."is_new_arrival", 
        "products"."is_best_seller", 
        "products"."rating", 
        "products"."review_count", 
        "products"."delivery_charge", 
        "products"."is_delivery_charge_applicable", 
        "products"."is_deleted", 
        "products"."flash_sale_id", 
        "products"."created_at", 
        "products"."updated_at", 
        "categories"."name" as "category_name"
      from "products" 
      left join "categories" on "products"."category_id" = "categories"."id" 
      where (
        "products"."is_featured" = true 
        and ("products"."is_deleted" = false or "products"."is_deleted" is null)
      ) 
      limit 8
    `;

    console.log("Executing failing query...");
    const res = await client.query(query);
    console.log("Query succeeded! Total rows returned:", res.rows.length);
    console.log("Rows:", res.rows);
  } catch (error) {
    console.error("Query failed with error:", error);
  } finally {
    await client.end();
    process.exit(0);
  }
}

main();
