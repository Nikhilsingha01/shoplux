import { Router } from "express";
import { getAuth, clerkClient } from "@clerk/express";
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
        whatsappNumber: settings?.whatsappNumber ?? "",
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

    if (!currentUser || currentUser.email === userId || currentUser.fullName === "Customer") {
      let email = userId;
      let fullName = "Customer";
      let phone = null;

      try {
        const clerkUser = await clerkClient.users.getUser(userId);
        email = clerkUser.emailAddresses[0]?.emailAddress || userId;
        fullName = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || "Customer";
        phone = clerkUser.phoneNumbers[0]?.phoneNumber || null;
      } catch (err) {
        console.error("Failed to fetch user details from Clerk:", err);
      }

      if (!currentUser) {
        const inserted = await db
          .insert(appUsersTable)
          .values({
            clerkUserId: userId,
            fullName,
            email,
            phone,
          })
          .returning();
        currentUser = inserted[0];
      } else if (currentUser.email === userId || currentUser.fullName === "Customer") {
        const updated = await db
          .update(appUsersTable)
          .set({
            fullName,
            email,
            phone: phone || currentUser.phone,
          })
          .where(eq(appUsersTable.id, currentUser.id))
          .returning();
        currentUser = updated[0];
      }
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
      whatsappNumber: settings?.whatsappNumber ?? "",
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