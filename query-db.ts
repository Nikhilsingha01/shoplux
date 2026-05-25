import dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(__dirname, ".env") });

import { db } from "./lib/db/src";

async function main() {
  try {
    console.log("Checking products table...");
    const products = await db.execute(`SELECT id, name, price, stock, is_deleted, category_id, flash_sale_id, is_featured, is_trending FROM products`);
    console.log("Total products:", products.rows.length);
    console.log("First 5 products:", products.rows.slice(0, 5));
  } catch (error) {
    console.error("Error executing query:", error);
  } finally {
    process.exit(0);
  }
}

main();
