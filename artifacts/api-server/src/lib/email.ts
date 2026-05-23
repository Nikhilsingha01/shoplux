import { Resend } from "resend";
import { logger } from "./logger";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_ADDRESS = process.env.RESEND_FROM ?? "onboarding@resend.dev";
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL ?? "support@shoplux.in";
const STORE_URL = process.env.STORE_URL ?? "https://shoplux.in";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OrderEmailData {
  orderId: number;
  customerOrderNumber?: number;
  customerName: string;
  customerEmail: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  totalAmount: number;
  subtotal: number;
  deliveryCharge: number;
  discount: number;
  couponCode?: string | null;
  razorpayPaymentId?: string | null;
  items: Array<{
    productName: string;
    productImage?: string | null;
    quantity: number;
    price: number;
    variant?: string | null;
  }>;
  address?: {
    fullName: string;
    addressLine: string;
    landmark?: string | null;
    city: string;
    state: string;
    pincode: string;
    phone: string;
  } | null;
  storeName?: string;
  createdAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function inr(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

function estimatedDelivery(): string {
  const d = new Date();
  d.setDate(d.getDate() + 5);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

// ─── Base Layout ──────────────────────────────────────────────────────────────

function baseLayout(storeName: string, title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f4f0; color: #1a1a1a; }
    a { color: #c49a2a; text-decoration: none; }
  </style>
</head>
<body>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f4f0; padding: 40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%; background:#ffffff; border-radius:4px; overflow:hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">

        <!-- Header -->
        <tr>
          <td style="background:#1a1a1a; padding: 28px 40px; text-align:center;">
            <div style="font-family:'Playfair Display', Georgia, serif; font-size:28px; font-weight:700; color:#c49a2a; letter-spacing:1px;">${storeName}</div>
            <div style="color:#888; font-size:12px; margin-top:4px; letter-spacing:2px; text-transform:uppercase;">Premium Indian Fashion</div>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding: 40px;">
            ${body}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f5f4f0; border-top:1px solid #e8e6e0; padding:28px 40px; text-align:center;">
            <p style="color:#666; font-size:12px; margin-bottom:8px;">Need help? Write to us at <a href="mailto:${SUPPORT_EMAIL}" style="color:#c49a2a;">${SUPPORT_EMAIL}</a></p>
            <p style="color:#888; font-size:11px; margin-top:12px;">© ${new Date().getFullYear()} ${storeName}. All rights reserved.</p>
            <p style="margin-top:12px;">
              <a href="${STORE_URL}" style="color:#c49a2a; font-size:11px; margin:0 8px;">Visit Store</a>
              <span style="color:#ccc;">|</span>
              <a href="${STORE_URL}/orders" style="color:#c49a2a; font-size:11px; margin:0 8px;">My Orders</a>
              <span style="color:#ccc;">|</span>
              <a href="${STORE_URL}/faq" style="color:#c49a2a; font-size:11px; margin:0 8px;">FAQ</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Shared Partials ──────────────────────────────────────────────────────────

function orderSummaryTable(data: OrderEmailData): string {
  const rows = data.items
    .map(
      (item) => `
      <tr>
        <td style="padding:10px 0; border-bottom:1px solid #f0ede8; vertical-align:top;">
          <div style="display:flex; gap:12px; align-items:flex-start;">
            ${
              item.productImage
                ? `<img src="${item.productImage}" width="56" height="68" style="object-fit:cover; border-radius:2px; background:#f5f4f0; flex-shrink:0;" alt="${item.productName}" />`
                : `<div style="width:56px; height:68px; background:#f0ede8; border-radius:2px; flex-shrink:0;"></div>`
            }
            <div>
              <div style="font-weight:600; font-size:14px; color:#1a1a1a;">${item.productName}</div>
              ${item.variant ? `<div style="font-size:12px; color:#888; margin-top:2px;">Variant: ${item.variant}</div>` : ""}
              <div style="font-size:13px; color:#555; margin-top:4px;">Qty: ${item.quantity}</div>
            </div>
          </div>
        </td>
        <td style="padding:10px 0 10px 16px; border-bottom:1px solid #f0ede8; vertical-align:top; text-align:right; white-space:nowrap;">
          <div style="font-weight:600; font-size:14px;">${inr(item.price * item.quantity)}</div>
          <div style="font-size:12px; color:#888;">${inr(item.price)} each</div>
        </td>
      </tr>`
    )
    .join("");

  return `
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;">
    <thead>
      <tr>
        <th style="text-align:left; font-size:11px; text-transform:uppercase; letter-spacing:1px; color:#888; padding-bottom:10px; border-bottom:2px solid #1a1a1a;">Item</th>
        <th style="text-align:right; font-size:11px; text-transform:uppercase; letter-spacing:1px; color:#888; padding-bottom:10px; border-bottom:2px solid #1a1a1a;">Amount</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
    <tfoot>
      <tr>
        <td style="padding:10px 0 4px; color:#666; font-size:13px;">Subtotal</td>
        <td style="padding:10px 0 4px; text-align:right; font-size:13px;">${inr(data.subtotal)}</td>
      </tr>
      <tr>
        <td style="padding:4px 0; color:#666; font-size:13px;">Delivery</td>
        <td style="padding:4px 0; text-align:right; font-size:13px;">${data.deliveryCharge === 0 ? '<span style="color:#2d7a4f;">Free</span>' : inr(data.deliveryCharge)}</td>
      </tr>
      ${
        data.discount > 0
          ? `<tr>
              <td style="padding:4px 0; color:#2d7a4f; font-size:13px;">Discount${data.couponCode ? ` (${data.couponCode})` : ""}</td>
              <td style="padding:4px 0; text-align:right; font-size:13px; color:#2d7a4f;">−${inr(data.discount)}</td>
            </tr>`
          : ""
      }
      <tr>
        <td style="padding:12px 0 4px; border-top:2px solid #1a1a1a; font-weight:700; font-size:15px;">Total</td>
        <td style="padding:12px 0 4px; border-top:2px solid #1a1a1a; text-align:right; font-weight:700; font-size:15px; color:#c49a2a;">${inr(data.totalAmount)}</td>
      </tr>
    </tfoot>
  </table>`;
}

function addressBlock(address: NonNullable<OrderEmailData["address"]>): string {
  return `
  <div style="background:#f9f8f5; border-left:3px solid #c49a2a; padding:14px 16px; margin-top:20px; border-radius:2px;">
    <div style="font-size:11px; text-transform:uppercase; letter-spacing:1px; color:#888; margin-bottom:8px;">Delivery Address</div>
    <div style="font-weight:600; font-size:14px;">${address.fullName}</div>
    <div style="font-size:13px; color:#555; margin-top:2px; line-height:1.6;">
      ${address.addressLine}${address.landmark ? `, ${address.landmark}` : ""}<br />
      ${address.city}, ${address.state} — ${address.pincode}<br />
      Ph: ${address.phone}
    </div>
  </div>`;
}

function ctaButton(text: string, url: string): string {
  return `<a href="${url}" style="display:inline-block; background:#1a1a1a; color:#fff; font-size:13px; font-weight:600; letter-spacing:1.5px; text-transform:uppercase; padding:14px 32px; border-radius:2px; text-decoration:none; margin-top:24px;">${text}</a>`;
}

function statusBadge(status: string, color = "#c49a2a"): string {
  return `<span style="display:inline-block; background:${color}20; color:${color}; font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:1px; padding:4px 10px; border-radius:20px;">${status}</span>`;
}

// ─── Template Builders ────────────────────────────────────────────────────────

function orderPlacedTemplate(data: OrderEmailData, storeName: string): string {
  const orderDisplayId = data.customerOrderNumber ?? data.orderId;
  const body = `
    <h1 style="font-family:'Playfair Display',Georgia,serif; font-size:26px; font-weight:700; color:#1a1a1a; margin-bottom:4px;">Order Confirmed</h1>
    <p style="color:#888; font-size:13px; margin-bottom:24px;">Order #${orderDisplayId} · Placed on ${new Date(data.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p>

    <p style="font-size:15px; color:#333; line-height:1.6;">Hi <strong>${data.customerName}</strong>,</p>
    <p style="font-size:14px; color:#555; line-height:1.7; margin-top:10px;">
      Thank you for your order! We've received it and it's now being processed.
      ${data.paymentMethod === "cod" ? "You'll pay when your order arrives at your doorstep." : "Your payment has been received successfully."}
    </p>

    ${statusBadge(data.paymentMethod === "cod" ? "Cash on Delivery" : "Paid Online", data.paymentMethod === "cod" ? "#e07b00" : "#2d7a4f")}

    ${orderSummaryTable(data)}
    ${data.address ? addressBlock(data.address) : ""}

    <div style="background:#f9f8f5; border-radius:2px; padding:14px 16px; margin-top:20px;">
      <div style="font-size:11px; text-transform:uppercase; letter-spacing:1px; color:#888; margin-bottom:6px;">Estimated Delivery</div>
      <div style="font-weight:600; font-size:14px; color:#1a1a1a;">${estimatedDelivery()}</div>
    </div>

    <div style="text-align:center; margin-top:8px;">
      ${ctaButton("Track Order", `${STORE_URL}/orders/${data.orderId}`)}
    </div>
  `;
  return baseLayout(storeName, `Order #${orderDisplayId} Confirmed — ${storeName}`, body);
}

function paymentSuccessTemplate(data: OrderEmailData, storeName: string): string {
  const orderDisplayId = data.customerOrderNumber ?? data.orderId;
  const body = `
    <div style="text-align:center; margin-bottom:24px;">
      <div style="width:64px; height:64px; background:#e8f5ee; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; margin-bottom:12px;">
        <div style="font-size:32px;">✓</div>
      </div>
      <h1 style="font-family:'Playfair Display',Georgia,serif; font-size:26px; font-weight:700; color:#2d7a4f; margin-bottom:4px;">Payment Successful</h1>
      <p style="color:#888; font-size:13px;">Order #${orderDisplayId}</p>
    </div>

    <p style="font-size:15px; color:#333; line-height:1.6;">Hi <strong>${data.customerName}</strong>,</p>
    <p style="font-size:14px; color:#555; line-height:1.7; margin-top:10px;">
      Your payment of <strong style="color:#1a1a1a;">${inr(data.totalAmount)}</strong> has been successfully processed. Your order is now confirmed and will be dispatched soon.
    </p>

    ${data.razorpayPaymentId ? `
    <div style="background:#f9f8f5; border-radius:2px; padding:12px 16px; margin-top:16px; font-size:12px; color:#666;">
      <strong>Payment ID:</strong> <span style="font-family:monospace;">${data.razorpayPaymentId}</span>
    </div>` : ""}

    ${orderSummaryTable(data)}
    ${data.address ? addressBlock(data.address) : ""}

    <div style="background:#f9f8f5; border-radius:2px; padding:14px 16px; margin-top:20px;">
      <div style="font-size:11px; text-transform:uppercase; letter-spacing:1px; color:#888; margin-bottom:6px;">Estimated Delivery</div>
      <div style="font-weight:600; font-size:14px; color:#1a1a1a;">${estimatedDelivery()}</div>
    </div>

    <div style="text-align:center; margin-top:8px;">
      ${ctaButton("View Order", `${STORE_URL}/orders/${data.orderId}`)}
    </div>
  `;
  return baseLayout(storeName, `Payment Confirmed — Order #${orderDisplayId}`, body);
}

function orderStatusTemplate(data: OrderEmailData, storeName: string): string {
  const orderDisplayId = data.customerOrderNumber ?? data.orderId;
  const statusConfig: Record<string, { title: string; message: string; color: string; icon: string }> = {
    confirmed: {
      title: "Order Confirmed",
      message: "Great news! Your order has been confirmed and is being prepared for dispatch.",
      color: "#2d7a4f",
      icon: "✓",
    },
    shipped: {
      title: "Order Shipped",
      message: "Your order is on its way! Our delivery partner has picked up your package.",
      color: "#1a6bb5",
      icon: "🚚",
    },
    out_for_delivery: {
      title: "Out for Delivery",
      message: "Your order is out for delivery today! Please ensure someone is available to receive it.",
      color: "#e07b00",
      icon: "📦",
    },
    delivered: {
      title: "Order Delivered",
      message: "Your order has been delivered. We hope you love your purchase!",
      color: "#2d7a4f",
      icon: "🎉",
    },
    cancelled: {
      title: "Order Cancelled",
      message: "Your order has been cancelled. If you paid online, a refund will be processed within 5–7 business days.",
      color: "#c0392b",
      icon: "✕",
    },
  };

  const cfg = statusConfig[data.status] ?? {
    title: `Order ${data.status.charAt(0).toUpperCase() + data.status.slice(1)}`,
    message: `Your order status has been updated to ${data.status}.`,
    color: "#c49a2a",
    icon: "•",
  };

  const body = `
    <div style="border-left:4px solid ${cfg.color}; padding:16px 20px; margin-bottom:24px; background:${cfg.color}10; border-radius:0 2px 2px 0;">
      <h1 style="font-family:'Playfair Display',Georgia,serif; font-size:22px; font-weight:700; color:${cfg.color}; margin-bottom:4px;">${cfg.title}</h1>
      <p style="color:#555; font-size:13px;">Order #${orderDisplayId}</p>
    </div>

    <p style="font-size:15px; color:#333; line-height:1.6;">Hi <strong>${data.customerName}</strong>,</p>
    <p style="font-size:14px; color:#555; line-height:1.7; margin-top:10px;">${cfg.message}</p>

    ${data.status === "shipped" || data.status === "out_for_delivery" ? `
    <div style="background:#f9f8f5; border-radius:2px; padding:14px 16px; margin-top:16px;">
      <div style="font-size:11px; text-transform:uppercase; letter-spacing:1px; color:#888; margin-bottom:6px;">Estimated Delivery</div>
      <div style="font-weight:600; font-size:14px; color:#1a1a1a;">${estimatedDelivery()}</div>
    </div>` : ""}

    <div style="margin-top:20px;">
      <div style="font-size:11px; text-transform:uppercase; letter-spacing:1px; color:#888; margin-bottom:8px;">Order Summary</div>
      <div style="font-size:13px; color:#555; font-weight:500; margin-bottom:4px;">Order #${orderDisplayId} · ${data.items.length} item${data.items.length !== 1 ? "s" : ""}</div>
      <div style="font-size:14px; color:#1a1a1a; font-weight:700;">${inr(data.totalAmount)}</div>
    </div>

    ${data.address && data.status !== "cancelled" ? addressBlock(data.address) : ""}

    <div style="text-align:center; margin-top:8px;">
      ${ctaButton("Track Order", `${STORE_URL}/orders/${data.orderId}`)}
    </div>

    ${data.status === "delivered" ? `
    <div style="text-align:center; margin-top:16px; padding:16px; background:#f9f8f5; border-radius:2px;">
      <p style="font-size:13px; color:#555; margin-bottom:8px;">Loved your purchase? Leave a review and help others discover great products.</p>
      <a href="${STORE_URL}/products" style="font-size:12px; color:#c49a2a; font-weight:600; text-transform:uppercase; letter-spacing:1px;">Shop Again</a>
    </div>` : ""}
  `;
  return baseLayout(storeName, `${cfg.title} — Order #${orderDisplayId}`, body);
}

// ─── Send functions ────────────────────────────────────────────────────────────
async function sendEmail(
  to: string,
  subject: string,
  html: string,
  context: string
): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    logger.warn({ context }, "RESEND_API_KEY not set — skipping email");
    return;
  }

  let recipient = to;
  // Redirect unverified sandbox emails to Nikhil Singhal's registered Resend developer account email
  if (FROM_ADDRESS.includes("onboarding@resend.dev")) {
    const devFallback = process.env.SUPPORT_EMAIL || "singhalnikhil010@gmail.com";
    logger.info(
      { originalRecipient: to, devFallback, context },
      "Resend onboarding sandbox mode detected — redirecting recipient to verified dev email"
    );
    recipient = devFallback;
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: recipient,
      subject,
      html,
    });

    if (error) {
      logger.error({ context, error }, "Email send failed");
    } else {
      logger.info({ context, emailId: data?.id, to: recipient }, "Email sent");
    }
  } catch (err) {
    logger.error({ context, err }, "Email send threw unexpectedly");
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function sendOrderPlacedEmail(data: OrderEmailData): Promise<void> {
  if (!data.customerEmail) return;
  const storeName = data.storeName ?? "ShopLux";
  const orderDisplayId = data.customerOrderNumber ?? data.orderId;
  await sendEmail(
    data.customerEmail,
    `Order #${orderDisplayId} Confirmed — ${storeName}`,
    orderPlacedTemplate(data, storeName),
    "order_placed"
  );
}

export async function sendPaymentSuccessEmail(data: OrderEmailData): Promise<void> {
  if (!data.customerEmail) return;
  const storeName = data.storeName ?? "ShopLux";
  const orderDisplayId = data.customerOrderNumber ?? data.orderId;
  await sendEmail(
    data.customerEmail,
    `Payment Confirmed — Order #${orderDisplayId}`,
    paymentSuccessTemplate(data, storeName),
    "payment_success"
  );
}

export async function sendOrderStatusEmail(data: OrderEmailData): Promise<void> {
  if (!data.customerEmail) return;
  const storeName = data.storeName ?? "ShopLux";
  const orderDisplayId = data.customerOrderNumber ?? data.orderId;

  const subjectMap: Record<string, string> = {
    confirmed: `Your order #${orderDisplayId} is confirmed`,
    shipped: `Order #${orderDisplayId} has been shipped`,
    out_for_delivery: `Order #${orderDisplayId} is out for delivery`,
    delivered: `Order #${orderDisplayId} delivered — enjoy your purchase!`,
    cancelled: `Order #${orderDisplayId} has been cancelled`,
  };

  const subject = subjectMap[data.status] ?? `Update on Order #${orderDisplayId}`;
  await sendEmail(
    data.customerEmail,
    subject,
    orderStatusTemplate(data, storeName),
    `order_status_${data.status}`
  );
}
