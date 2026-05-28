import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db, adminSettingsTable, productsTable, ordersTable, categoriesTable } from "@workspace/db";
import { eq, desc, and, or, isNull } from "drizzle-orm";
import { SendChatMessageBody } from "@workspace/api-zod";
import axios from "axios";
import { logger } from "../lib/logger";

const router = Router();

router.post("/chatbot/chat", async (req, res): Promise<void> => {
  try {
    const parsed = SendChatMessageBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const { messages } = parsed.data;

    // 1. Fetch Store Settings
    const [settings] = await db
      .select()
      .from(adminSettingsTable)
      .limit(1);

    const storeName = settings?.storeName ?? "ShopLux";
    const supportEmail = "support@shoplux.com";
    const deliveryCharge = settings?.deliveryCharge != null ? Number(settings.deliveryCharge) : 49;
    const freeDeliveryAbove = settings?.freeDeliveryAbove != null ? Number(settings.freeDeliveryAbove) : 999;
    const isChatbotEnabled = settings?.isChatbotEnabled ?? true;

    if (!isChatbotEnabled) {
      res.json({ reply: `Thank you for reaching out to ${storeName}! Our AI shopping assistant is currently resting, but you can contact us directly at ${supportEmail} for any assistance.` });
      return;
    }

    // Fetch Categories
    const categories = await db
      .select()
      .from(categoriesTable);

    const categoriesText = categories
      .map((c) => `- **${c.name}** (slug: ${c.slug}): ${c.description || "Premium collection."}`)
      .join("\n");

    // 2. Fetch Active Products
    const activeProducts = await db
      .select()
      .from(productsTable)
      .where(and(eq(productsTable.isDeleted, false), or(eq(productsTable.isDeleted, false), isNull(productsTable.isDeleted))))
      .orderBy(productsTable.sortOrder);

    const productsText = activeProducts
      .map(
        (p) =>
          `- **${p.name}**: ₹${Number(p.price)} (Original: ₹${p.comparePrice ? Number(p.comparePrice) : "N/A"}). ${p.description || "Premium quality product."} (Availability: ${p.stock && p.stock > 0 ? "In Stock" : "Out of Stock"})`
      )
      .join("\n");

    // 3. Fetch User Orders if logged in
    const auth = getAuth(req);
    const userId = auth?.userId;
    let isSignedIn = false;
    let userOrdersText = "";

    if (userId) {
      isSignedIn = true;
      const orders = await db
        .select()
        .from(ordersTable)
        .where(eq(ordersTable.userId, userId))
        .orderBy(desc(ordersTable.createdAt))
        .limit(5);

      if (orders.length > 0) {
        userOrdersText = "Recent Orders for this user:\n" + orders
          .map(
            (o) =>
              `- **Order #${o.id}**: Total ₹${Number(o.totalAmount)}, Status: ${o.status.toUpperCase()}, Placed on: ${o.createdAt ? new Date(o.createdAt).toLocaleDateString() : "N/A"}`
          )
          .join("\n");
      } else {
        userOrdersText = "This user hasn't placed any orders yet.";
      }
    } else {
      userOrdersText = "User is not logged in. Ask them for their Order ID or email if they want to check their status.";
    }

    // 4. Construct System Instructions
    const systemPrompt = `You are a premium, highly professional, and elegant shopping assistant for ${storeName}.
Store details:
- Store Name: ${storeName}
- Support Email: ${supportEmail}
- Return/Refund Policy: 7-day hassle-free return policy.
- Shipping Info: Free shipping on orders above ₹${freeDeliveryAbove}, otherwise ₹${deliveryCharge} delivery fee.

Product Categories:
${categoriesText}

Available Product Catalog:
${productsText}

User Session Details:
- Signed In: ${isSignedIn ? "Yes" : "No"}
${userOrdersText}

Guidelines:
- Maintain a luxury, professional, polite, and extremely friendly tone.
- Help customers with their shopping and store-related queries.
- When recommending products, highlight their premium value, list their prices, and encourage users to check them out.
- Keep answers concise, helpful, and format beautiful Markdown responses with clean spacing and bullet points.
- If a customer asks about order status:
  - If they are signed in, refer to the Order details above.
  - If they are not signed in or need specific details, explain how they can sign in or contact support at ${supportEmail} with their order ID.`;

    const groqApiKey = process.env.GROQ_API_KEY;

    if (groqApiKey) {
      try {
        const groqMessages = [
          { role: "system", content: systemPrompt },
          ...messages.map((m) => ({
            role: m.role === "user" ? ("user" as const) : ("assistant" as const),
            content: m.content,
          })),
        ];

        const response = await axios.post(
          "https://api.groq.com/openai/v1/chat/completions",
          {
            model: "llama-3.3-70b-versatile",
            messages: groqMessages,
            max_tokens: 1024,
            temperature: 0.7,
          },
          {
            headers: {
              Authorization: `Bearer ${groqApiKey}`,
              "Content-Type": "application/json",
            },
          }
        );

        const reply = response.data.choices?.[0]?.message?.content || "I apologize, I am unable to process your request at the moment.";
        res.json({ reply });
        return;
      } catch (err: any) {
        logger.error({ err: err.response?.data || err.message }, "Groq API call failed. Falling back to intelligent rule-based simulation.");
      }
    }

    // 5. Intelligent, Premium Mock Fallback (if API key is missing or calls fail)
    const userQuery = messages[messages.length - 1]?.content?.toLowerCase() || "";
    let reply = "";

    if (userQuery.includes("product") || userQuery.includes("recommend") || userQuery.includes("buy") || userQuery.includes("show") || userQuery.includes("catalog")) {
      const recommendations = activeProducts.slice(0, 3);
      if (recommendations.length > 0) {
        reply = `I would be delighted to assist you with our catalog at **${storeName}**! Here are some of our finest selections today:\n\n` +
          recommendations
            .map((p) => `- **${p.name}**\n  *Price: ₹${Number(p.price)}*\n  ${p.description || "A gorgeous, high-quality premium item."}\n  *Status: ${p.stock && p.stock > 0 ? "In Stock & Ready to Ship" : "Limited Availability"}*`)
            .join("\n\n") +
          `\n\nWould you like me to tell you more about any of these?`;
      } else {
        reply = `Welcome to **${storeName}**! We are currently curating an exclusive collection of luxury items just for you. Please check back shortly to explore our brand new catalog, or reach out to us at **${supportEmail}** for direct requests!`;
      }
    } else if (userQuery.includes("order") || userQuery.includes("status") || userQuery.includes("track")) {
      if (isSignedIn && userOrdersText !== "This user hasn't placed any orders yet.") {
        const latestOrder = userOrdersText.split("\n")[1] || "";
        reply = `I have located your recent order details for your **${storeName}** account:\n\n${latestOrder}\n\nWe are processing your items with utmost care. Should you require further updates or modification, please don't hesitate to write to us at **${supportEmail}**!`;
      } else if (isSignedIn) {
        reply = `You are currently logged into **${storeName}**, but it looks like you haven't placed any orders with us yet! Discover our latest arrivals and complete your first purchase today. Let me know if you need any recommendations!`;
      } else {
        reply = `I would be happy to help check your order status! To do so, please ensure you are signed in to your **${storeName}** account. Alternatively, you can share your **Order ID** and the **email address** associated with your purchase, or contact our support team at **${supportEmail}** directly.`;
      }
    } else if (userQuery.includes("shipping") || userQuery.includes("delivery") || userQuery.includes("charge") || userQuery.includes("fee")) {
      reply = `At **${storeName}**, we strive to deliver your luxury purchases safely and swiftly:\n\n- **Free Shipping**: For all orders above **₹${freeDeliveryAbove}**.\n- **Standard Delivery**: A flat fee of **₹${deliveryCharge}** is applied to orders below ₹${freeDeliveryAbove}.\n- **Delivery Timeline**: Typically takes 3-5 business days depending on your location.\n\nLet me know if you would like to estimate shipping for a specific item!`;
    } else if (userQuery.includes("return") || userQuery.includes("refund") || userQuery.includes("exchange")) {
      reply = `We stand behind the premium quality of our collection. If you are not completely satisfied with your purchase, **${storeName}** offers:\n\n- **7-Day Hassle-Free Returns**: You can initiate a return or exchange within 7 days of delivery.\n- **Condition**: Items must be unworn, in their original packaging, with tags intact.\n- **How to return**: Send a brief mail to our support team at **${supportEmail}** with your Order ID, and we will guide you through the process step-by-step.`;
    } else if (userQuery.includes("hi") || userQuery.includes("hello") || userQuery.includes("hey") || userQuery.includes("welcome")) {
      reply = `Hello! Welcome to **${storeName}** Customer Support. ✨\n\nI am your digital shopping assistant, dedicated to making your experience here seamless and enjoyable. I can help you:\n\n- 🛍️ Recommend and browse our **Premium Products**\n- 📦 Track the status of your **Orders**\n- 🚚 Explain **Shipping & Delivery** rates\n- 🔄 Assist with **Returns & Exchange** policies\n\nHow may I help elevate your shopping journey today?`;
    } else {
      reply = `Thank you for your message! I'm here to help you enjoy a premium shopping experience at **${storeName}**. \n\nYou can ask me about our **Product Catalog**, your **Order Status**, our **Shipping Rates**, or our **7-day Return Policy**.\n\nCould you please clarify how I can best assist you with these topics, or would you like to speak to our support team at **${supportEmail}**?`;
    }

    res.json({ reply });
  } catch (err: any) {
    logger.error({ err }, "Chatbot endpoint failed");
    res.status(500).json({ error: "Internal Server Error in Chatbot" });
  }
});

export default router;
