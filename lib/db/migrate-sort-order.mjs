import pg from "pg";
const { Pool } = pg;

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:Dropshipping%40123@db.mtdclbgzgnsustfdzcuj.supabase.co:5432/postgres";
const pool = new Pool({ connectionString });

async function main() {
  try {
    console.log("Adding sort_order column to live products table...");
    await pool.query(`
      ALTER TABLE products ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;
    `);
    console.log("Successfully migrated sort_order column on live products table!");
  } catch (error) {
    console.error("Error during migration:", error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

main();
