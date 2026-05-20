import { AppLayout } from "@/components/layout/AppLayout";

export default function PrivacyPolicy() {
  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-16 max-w-3xl prose prose-stone dark:prose-invert">
        <h1 className="font-serif">Privacy Policy</h1>
        <p>Last updated: {new Date().toLocaleDateString()}</p>
        
        <p>At ShopLux, we take your privacy seriously. This policy describes how we collect, use, and handle your personal information.</p>
        
        <h2>Information We Collect</h2>
        <p>We collect information you provide directly to us when you create an account, make a purchase, or contact support. This includes your name, email address, phone number, shipping address, and payment details.</p>

        <h2>How We Use Information</h2>
        <p>We use the information to process your orders, communicate with you about your orders or inquiries, improve our services, and send you promotional offers if you have opted in.</p>

        <h2>Data Security</h2>
        <p>We implement reasonable security measures to protect your personal information. Payment processing is handled by secure third-party providers (like Razorpay) and we do not store your raw credit card information on our servers.</p>

        <h2>Contact Us</h2>
        <p>If you have any questions about this privacy policy, please contact our support team.</p>
      </div>
    </AppLayout>
  );
}
