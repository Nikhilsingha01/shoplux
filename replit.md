# ShopLux

A premium, mobile-first Indian ecommerce web app with a cinematic, Apple-level polished design.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind CSS, Shadcn UI, Wouter (routing), TanStack Query
- Auth: Clerk (`@clerk/react` on frontend, `@clerk/express` on server)
- Payments: Razorpay (set `RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET`; falls back to dev mock if absent)
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — source-of-truth OpenAPI spec
- `lib/api-zod/` — generated Zod schemas (from codegen)
- `lib/api-client-react/` — generated React Query hooks (from codegen)
- `lib/db/src/schema/` — Drizzle ORM schema (products, orders, store, addresses, wishlist, coupons)
- `artifacts/api-server/src/routes/` — all Express route handlers
- `artifacts/api-server/src/middlewares/auth.ts` — `requireAuth`, `requireAdmin`, `ensureUser`
- `artifacts/shop/src/` — React frontend (pages, components, lib)

## Architecture decisions

- Contract-first API: OpenAPI spec defines the contract; Orval generates typed hooks + Zod schemas
- Clerk auth proxied through the Express API server for security (no direct Clerk calls from client)
- Admin access gated by `admin_settings.admin_clerk_user_id` stored in the DB
- Razorpay payment flow: create order server-side → client loads Razorpay checkout → verify signature server-side
- All numeric DB columns (price, amounts) stored as `numeric` strings and converted to `Number` in responses

## Product

- Home page with hero banner, featured/trending/new arrival product sections
- Product listing with category filter, search, and sort
- Product detail with image gallery, add to cart, wishlist
- Cart with quantity management and coupon code entry
- Checkout with saved addresses and Razorpay / COD payment
- User account with order history, wishlist, and address book
- Full admin dashboard: products, orders, categories, banners, coupons, users, store settings
- Dark mode, mobile-first responsive design

## User preferences

- Premium, cinematic, Apple-level polish — no emojis in UI
- Indian market: INR currency, Razorpay payments, Indian phone/address formats
- No Next.js — React + Vite only

## Gotchas

- Run `pnpm --filter @workspace/api-spec run codegen` after any OpenAPI spec changes
- Run `pnpm --filter @workspace/db run push` after any schema changes in `lib/db/src/schema/`
- Admin user ID must be set manually in `admin_settings` table: `UPDATE admin_settings SET admin_clerk_user_id = 'user_xxx'`
- Razorpay keys optional in dev — returns mock order if absent

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
