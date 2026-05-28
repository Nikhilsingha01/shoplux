import pg from "pg";
const { Pool } = pg;

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:Dropshipping%40123@db.mtdclbgzgnsustfdzcuj.supabase.co:5432/postgres";
const pool = new Pool({ connectionString });

async function main() {
  try {
    const cols = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'products'
    `);
    console.log("PRODUCTS COLUMNS:");
    console.table(cols.rows);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

main();
