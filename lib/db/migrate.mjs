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
    console.log("Running migrations...");

    // 1. Add columns to products
    await pool.query(`
      ALTER TABLE products ADD COLUMN IF NOT EXISTS flash_sale_id integer;
    `);
    console.log("- Updated products table columns");

    // 2. Add columns to orders
    await pool.query(`
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS loyalty_points_redeemed integer DEFAULT 0;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS loyalty_points_discount numeric(10, 2) DEFAULT '0';
    `);
    console.log("- Updated orders table columns");

    // 3. Add columns to app_users
    await pool.query(`
      ALTER TABLE app_users ADD COLUMN IF NOT EXISTS loyalty_points integer DEFAULT 0 NOT NULL;
    `);
    console.log("- Updated app_users table columns");

    // 4. Create reviews table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id serial PRIMARY KEY,
        product_id integer NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        user_id text NOT NULL,
        customer_name text NOT NULL,
        rating integer NOT NULL,
        review_text text NOT NULL,
        created_at timestamp with time zone DEFAULT now() NOT NULL
      );
    `);
    console.log("- Created reviews table");

    // 5. Create flash_sales table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS flash_sales (
        id serial PRIMARY KEY,
        title text NOT NULL,
        discount_percent numeric(5, 2) NOT NULL,
        start_time timestamp with time zone NOT NULL,
        end_time timestamp with time zone NOT NULL,
        is_active boolean DEFAULT true NOT NULL,
        created_at timestamp with time zone DEFAULT now() NOT NULL
      );
    `);
    console.log("- Created flash_sales table");

    // 6. Create testimonials table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS testimonials (
        id serial PRIMARY KEY,
        name text NOT NULL,
        role text DEFAULT 'Verified Buyer',
        review_text text NOT NULL,
        image_url text,
        rating integer DEFAULT 5 NOT NULL,
        is_active boolean DEFAULT true NOT NULL,
        created_at timestamp with time zone DEFAULT now() NOT NULL
      );
    `);
    console.log("- Created testimonials table");

    console.log("Migrations completed successfully!");
  } catch (error) {
    console.error("Migration error:", error);
    process.exit(1);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

main();
