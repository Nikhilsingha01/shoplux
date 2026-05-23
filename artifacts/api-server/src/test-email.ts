import dotenv from "dotenv";
import path from "path";
import { Resend } from "resend";

// Load environment variables from root folder
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });

const resend = new Resend(process.env.RESEND_API_KEY);

async function main() {
  console.log("Starting Resend email test inside api-server...");
  console.log("API Key present:", !!process.env.RESEND_API_KEY);
  if (process.env.RESEND_API_KEY) {
    console.log("API Key Prefix:", process.env.RESEND_API_KEY.substring(0, 7));
  }

  try {
    const { data, error } = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: "singhalnikhil01@gmail.com",
      subject: "ShopLux Sandbox Diagnostic Test",
      html: "<h3>Diagnostic Test Successful</h3><p>If you see this, Resend API is fully functional!</p>",
    });

    if (error) {
      console.error("Resend API returned error:", error);
    } else {
      console.log("Resend API returned success:", data);
    }
  } catch (err: any) {
    console.error("Resend send threw unexpectedly:", err);
  }
}

main();
