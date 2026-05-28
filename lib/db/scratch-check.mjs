import pg from "pg";
const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });

async function main() {
  try {
    const products = await pool.query(`SELECT * FROM products`);
    console.log("PRODUCTS:");
    console.log(JSON.stringify(products.rows, null, 2));

    const settings = await pool.query(`SELECT * FROM admin_settings`);
    console.log("ADMIN_SETTINGS:");
    console.log(JSON.stringify(settings.rows, null, 2));
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

main();
