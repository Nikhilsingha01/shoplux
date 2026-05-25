import dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(__dirname, "../.env") });

import { db } from "../lib/db/src";

async function main() {
  try {
    const products = await db.execute(`
      SELECT p.id, p.name, p.slug, p.category_id, c.name as category_name, p.is_deleted
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ORDER BY c.name, p.name
    `);
    console.log("PRODUCTS IN DATABASE:");
    console.table(products.rows);
  } catch (error) {
    console.error("Error executing query:", error);
  } finally {
    process.exit(0);
  }
}

main();
