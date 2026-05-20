import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "../lib/logger";
import { requireAdmin } from "../middlewares/auth";

const router = Router();

// ─── DB migration for support_messages table ─────────────────────────────────

(async () => {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS support_messages (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        subject TEXT NOT NULL,
        message TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'unread',
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);
    console.log("support_messages table ready");
  } catch (err: any) {
    console.error("support_messages migration failed:", err);
  }
})();

// ─── POST /support — submit a support message ─────────────────────────────────

router.post("/support", async (req, res): Promise<void> => {
  try {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !subject || !message) {
      res.status(400).json({ error: "All fields are required: name, email, subject, message" });
      return;
    }

    await db.execute(sql`
      INSERT INTO support_messages (name, email, subject, message)
      VALUES (${name}, ${email}, ${subject}, ${message})
    `);

    // Send email to admin if Resend is configured
    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail && process.env.RESEND_API_KEY) {
      try {
        const { Resend } = await import("resend");
        const resend = new Resend(process.env.RESEND_API_KEY);
        const fromAddress = process.env.RESEND_FROM ?? "ShopLux <onboarding@resend.dev>";
        await resend.emails.send({
          from: fromAddress,
          to: adminEmail,
          subject: `[Support] ${subject} — from ${name}`,
          html: `
            <h2 style="font-family:sans-serif;">New Support Message</h2>
            <p><strong>From:</strong> ${name} (${email})</p>
            <p><strong>Subject:</strong> ${subject}</p>
            <hr/>
            <p style="white-space:pre-wrap;">${message}</p>
          `,
        });
      } catch (emailErr) {
        logger.warn({ emailErr }, "support email failed (non-blocking)");
      }
    }

    res.status(201).json({ success: true });
  } catch (error: any) {
    console.error("Error saving support message:", error);
    res.status(500).json({ error: error.message });
  }
});

// ─── GET /admin/support — list support messages ───────────────────────────────

router.get("/admin/support", requireAdmin, async (req, res): Promise<void> => {
  try {
    const result = await db.execute(
      sql`SELECT * FROM support_messages ORDER BY created_at DESC`
    );
    res.json({ messages: result.rows });
  } catch (error: any) {
    console.error("Error listing support messages:", error);
    res.status(500).json({ error: error.message });
  }
});

// ─── PATCH /admin/support/:id/read — mark as read ────────────────────────────

router.patch("/admin/support/:id/read", requireAdmin, async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    await db.execute(sql`UPDATE support_messages SET status = 'read' WHERE id = ${id}`);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
