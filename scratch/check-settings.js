import { db, adminSettingsTable } from "@workspace/db";

async function run() {
  try {
    const settings = await db.select().from(adminSettingsTable).limit(1);
    console.log("SETTINGS:", JSON.stringify(settings[0], null, 2));
    process.exit(0);
  } catch (err) {
    console.error("ERROR:", err);
    process.exit(1);
  }
}

run();
