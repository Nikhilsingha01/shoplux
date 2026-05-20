import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db, adminSettingsTable, appUsersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/me", async (req, res): Promise<void> => {
  try {
    const auth = getAuth(req);
    const userId = auth?.userId;

    const [settings] = await db
      .select()
      .from(adminSettingsTable)
      .limit(1);

    if (!userId) {
      res.json({
        isAdmin: false,
        isSignedIn: false,
        storeName: settings?.storeName ?? "ShopLux",
        deliveryCharge: settings?.deliveryCharge != null ? Number(settings.deliveryCharge) : 49,
        freeDeliveryAbove: settings?.freeDeliveryAbove != null ? Number(settings.freeDeliveryAbove) : 999,
        trustBadge1: settings?.trustBadge1 ?? "Free delivery on orders above ₹999",
        trustBadge2: settings?.trustBadge2 ?? "Secure & encrypted payments",
        trustBadge3: settings?.trustBadge3 ?? "7-day hassle-free returns",
      });
      return;
    }

    const [existingUser] = await db
      .select()
      .from(appUsersTable)
      .where(eq(appUsersTable.clerkUserId, userId))
      .limit(1);

    let currentUser = existingUser;

    if (!currentUser) {
      const inserted = await db
        .insert(appUsersTable)
        .values({
          clerkUserId: userId,
          fullName: "Customer",
          email: userId,
        })
        .returning();

      currentUser = inserted[0];
    }

    const adminUserIds = [
      "user_3DqbcqmmaNNaPK7aWeBr0TCkXmW",
    ];

    const isAdmin = adminUserIds.includes(userId);

    res.json({
      isSignedIn: true,
      isAdmin,
      clerkUserId: userId,
      user: currentUser,
      storeName: settings?.storeName ?? "ShopLux",
      deliveryCharge:
        settings?.deliveryCharge != null
          ? Number(settings.deliveryCharge)
          : 49,
      freeDeliveryAbove:
        settings?.freeDeliveryAbove != null
          ? Number(settings.freeDeliveryAbove)
          : 999,
      trustBadge1: settings?.trustBadge1 ?? "Free delivery on orders above ₹999",
      trustBadge2: settings?.trustBadge2 ?? "Secure & encrypted payments",
      trustBadge3: settings?.trustBadge3 ?? "7-day hassle-free returns",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Failed to fetch user",
    });
  }
});

export default router;