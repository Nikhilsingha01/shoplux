import { getAuth } from "@clerk/express";
import { db, appUsersTable, adminSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { Request, Response, NextFunction } from "express";

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  // 1. Real Clerk session
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (userId) {
    (req as Request & { userId: string }).userId = userId;
    next();
    return;
  }

  // 2. Dev fallback: explicit dev user headers (set by frontend from Clerk localStorage)
  const devUserId = req.headers["x-dev-user-id"] as string;
  const devUserEmail = req.headers["x-dev-user-email"] as string;
  const devUserName = req.headers["x-dev-user-name"] as string;

  if (devUserId && devUserEmail && process.env.NODE_ENV !== "production") {
    console.log(`DIAGNOSTIC requireAuth - Using dev user from headers: ${devUserEmail}`);
    ensureUser(devUserId, devUserEmail, devUserName)
      .then(() => {
        (req as Request & { userId: string }).userId = devUserId;
        next();
      })
      .catch((err) => {
        console.error("Failed to ensure dev user:", err);
        res.status(500).json({ error: "Failed to initialize dev user" });
      });
    return;
  }

  // 3. Admin token bypass - only fallback to "admin" if no real customer identity exists
  const adminToken = req.headers["x-admin-token"];
  if (adminToken === "shopluxadmin") {
    (req as Request & { userId: string }).userId = "admin";
    next();
    return;
  }

  // 4. No valid auth — return 401 (do NOT fall back to a shared dev user)
  res.status(401).json({ error: "Unauthorized" });
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const adminToken = req.headers["x-admin-token"];
  if (adminToken === "shopluxadmin") {
    (req as Request & { userId: string }).userId = "admin";
    next();
    return;
  }

  const auth = getAuth(req);
  let userId = auth?.userId;

  // Robust Developer Fallback
  if (!userId && process.env.NODE_ENV !== "production") {
    const devUserId = req.headers["x-dev-user-id"] as string;
    if (devUserId) {
      console.log(`DIAGNOSTIC requireAdmin - Clerk auth failed in development. Using fallback admin user from headers: ${devUserId}`);
      userId = devUserId;
    } else {
      console.log("DIAGNOSTIC requireAdmin - Clerk auth failed in development. Using fallback admin user.");
      userId = "admin";
    }
  }

  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const [settings] = await db.select().from(adminSettingsTable).limit(1);
  const [appUser] = await db.select().from(appUsersTable).where(eq(appUsersTable.clerkUserId, userId)).limit(1);

  const isSettingAdmin = settings?.adminClerkUserId && settings.adminClerkUserId === userId;
  const isUserTableAdmin = appUser?.isAdmin === true;
  const isAuthorizedAdmin = userId === "admin" || !!isSettingAdmin || isUserTableAdmin;

  if (!isAuthorizedAdmin) {
    res.status(403).json({ error: "Forbidden: Admin access required" });
    return;
  }

  (req as Request & { userId: string }).userId = userId;
  next();
}

export async function ensureUser(clerkUserId: string, email: string, fullName?: string | null): Promise<void> {
  const existing = await db.select().from(appUsersTable).where(eq(appUsersTable.clerkUserId, clerkUserId)).limit(1);
  if (!existing[0]) {
    await db.insert(appUsersTable).values({ clerkUserId, email, fullName }).onConflictDoNothing();
  }
}
