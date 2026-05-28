import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import router from "./routes";
import { logger } from "./lib/logger";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "./middlewares/clerkProxyMiddleware";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

app.use(cors({ credentials: true, origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

import path from "path";

app.use(
  clerkMiddleware((req) => {
    const isProd = process.env.NODE_ENV === "production";
    const publishableKey = isProd
      ? publishableKeyFromHost(
          getClerkProxyHost(req) ?? "",
          process.env.CLERK_PUBLISHABLE_KEY,
        )
      : process.env.CLERK_PUBLISHABLE_KEY;
    return {
      publishableKey,
      secretKey: process.env.CLERK_SECRET_KEY,
    };
  }),
);

import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve uploads statically robustly
const uploadsDir = path.resolve(__dirname, "../uploads");
app.use("/uploads", express.static(uploadsDir));

import { getMyProducts } from "./qikink";

app.get("/products", async (req, res) => {
  try {
    const products = await getMyProducts();
    res.json(products);
  } catch (error: any) {
    logger.error({ error: error.message }, "Error fetching products from Qikink");
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

app.use("/api", router);

// Serve frontend statically in production
const isProd = process.env.NODE_ENV === "production";
if (isProd) {
  const shopDistPath = path.resolve(__dirname, "../../shop/dist/public");
  logger.info({ shopDistPath }, "Serving frontend static assets in production");
  app.use(express.static(shopDistPath));
  
  // SPA fallback routing - serve index.html for all non-API / non-upload routes
  app.get(/^\/(?!api|uploads).*$/, (req, res) => {
    res.sendFile(path.join(shopDistPath, "index.html"));
  });
}

export default app;
