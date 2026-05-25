import pg from "pg";
import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../.env") });

async function main() {
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log("DATABASE_URL resolved successfully.");
    
    // Select all fields of the first product
    const res = await client.query("SELECT * FROM products LIMIT 1");
    console.log("Complete first product fields & types:");
    for (const [key, value] of Object.entries(res.rows[0])) {
      console.log(`- ${key}: ${value} (type: ${typeof value})`);
    }
  } catch (error) {
    console.error("DB query error:", error);
  } finally {
    await client.end();
    process.exit(0);
  }
}

main();
