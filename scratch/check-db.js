import pg from "pg";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve("../../.env") });
dotenv.config({ path: path.resolve(".env") });
dotenv.config({ path: path.resolve("../.env") });
dotenv.config({ path: path.resolve("../../../.env") });

const { Client } = pg;

async function run() {
  const connectionString = process.env.DATABASE_URL || "postgresql://postgres:Dropshipping%40123@db.mtdclbgzgnsustfdzcuj.supabase.co:5432/postgres";
  console.log("Connecting to:", connectionString);
  const client = new Client({ connectionString });
  await client.connect();
  
  try {
    const res = await client.query("SELECT * FROM admin_settings LIMIT 1");
    console.log("SETTINGS ROWS:", JSON.stringify(res.rows[0], null, 2));
  } catch (err) {
    console.error("Query Error:", err);
  } finally {
    await client.end();
  }
}

run();
