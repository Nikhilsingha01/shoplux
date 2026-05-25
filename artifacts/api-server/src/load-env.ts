import dotenv from "dotenv";
import path from "path";

// Ensure environment variables are loaded from any possible location (.env in process.cwd(), or parent folders)
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
dotenv.config({ path: path.resolve(process.cwd(), "../.env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
