import pg from "pg";
const { Pool } = pg;

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:Dropshipping%40123@db.mtdclbgzgnsustfdzcuj.supabase.co:5432/postgres";
const pool = new Pool({ connectionString });

async function main() {
  try {
    console.log("Updating products to enable featured, trending, and new_arrival flags...");
    const res = await pool.query(`
      UPDATE products 
      SET is_featured = true, is_new_arrival = true, is_trending = true
      WHERE is_deleted = false OR is_deleted IS NULL;
    `);
    console.log(`Successfully updated ${res.rowCount} products in database!`);
  } catch (error) {
    console.error("Error during update:", error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

main();
