import pg from "pg";
const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });

async function main() {
  try {
    const tables = await pool.query(`
      SELECT table_name FROM information_schema.tables WHERE table_schema='public'
    `);
    console.log("TABLES:");
    console.table(tables.rows);

    const categories = await pool.query(`SELECT * FROM categories`);
    console.log("CATEGORIES:");
    console.table(categories.rows);

    const products = await pool.query(`SELECT id, name, category_id, is_deleted FROM products`);
    console.log("PRODUCTS:");
    console.table(products.rows);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

main();
