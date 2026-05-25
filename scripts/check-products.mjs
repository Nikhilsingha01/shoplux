import pg from "pg";
const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set!");
  process.exit(1);
}

const pool = new Pool({ connectionString });

async function main() {
  try {
    const productsRes = await pool.query(`
      SELECT p.id, p.name, p.slug, p.category_id, c.name as category_name, p.is_deleted
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ORDER BY c.name, p.name
    `);
    console.log("PRODUCTS IN DATABASE:");
    console.table(productsRes.rows);

    const categoriesRes = await pool.query(`
      SELECT c.id, c.name, c.slug, 
             COUNT(p.id) as total_products,
             SUM(CASE WHEN p.is_deleted = false OR p.is_deleted IS NULL THEN 1 ELSE 0 END) as active_products
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id
      GROUP BY c.id
      ORDER BY c.name
    `);
    console.log("CATEGORIES IN DATABASE WITH PRODUCTS COUNT:");
    console.table(categoriesRes.rows);
  } catch (error) {
    console.error("Error executing query:", error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

main();
