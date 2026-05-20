import "dotenv/config";
import app from "./app";
import { logger } from "./lib/logger";

console.log("DIAGNOSTIC - backend startup environment:");
console.log("CLERK_PUBLISHABLE_KEY:", process.env.CLERK_PUBLISHABLE_KEY ? `${process.env.CLERK_PUBLISHABLE_KEY.substring(0, 12)}...` : "UNDEFINED");
console.log("CLERK_SECRET_KEY:", process.env.CLERK_SECRET_KEY ? `${process.env.CLERK_SECRET_KEY.substring(0, 12)}...` : "UNDEFINED");
console.log("NODE_ENV:", process.env.NODE_ENV);

const rawPort = process.env["PORT"] || "5000";

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
