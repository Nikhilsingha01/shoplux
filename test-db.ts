import dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(__dirname, ".env") });

import { db } from "./lib/db/src";

async function main() {
  try {
    console.log("DATABASE_URL:", process.env.DATABASE_URL);
    console.log("Checking admin_settings, orders, app_users tables...");
    const settings = await db.execute(`SELECT * FROM admin_settings`);
    console.log("admin_settings rows:", settings.rows);
    const orders = await db.execute(`SELECT id, user_id, status, payment_status, total_amount FROM orders`);
    console.log("orders rows:", orders.rows);
    const users = await db.execute(`SELECT id, clerk_user_id, email, is_admin FROM app_users`);
    console.log("users rows:", users.rows);
  } catch (error) {
    console.error("Error executing query:", error);
  } finally {
    process.exit(0);
  }
}

main();
