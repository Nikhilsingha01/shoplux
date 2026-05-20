import { AppLayout } from "@/components/layout/AppLayout";

export default function Terms() {
  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-16 max-w-3xl prose prose-stone dark:prose-invert">
        <h1 className="font-serif">Terms of Service</h1>
        <p>Last updated: {new Date().toLocaleDateString()}</p>
        
        <p>Welcome to ShopLux. By using our website and services, you agree to comply with and be bound by the following terms and conditions.</p>
        
        <h2>1. Use of the Site</h2>
        <p>You may use our site for lawful purposes only. You must not use our site in any way that causes, or may cause, damage to the site or impairment of the availability or accessibility of the site.</p>

        <h2>2. Products and Pricing</h2>
        <p>All prices are in Indian Rupees (INR) and are inclusive of GST. We reserve the right to modify prices without prior notice. We make every effort to display as accurately as possible the colors and images of our products.</p>

        <h2>3. Orders and Payments</h2>
        <p>By placing an order, you agree that you are purchasing the products for personal use and not for resale. We reserve the right to refuse or cancel any order. Payments are processed securely via our payment partners.</p>

        <h2>4. Intellectual Property</h2>
        <p>All content included on this site, such as text, graphics, logos, images, and software, is the property of ShopLux or its content suppliers and protected by copyright laws.</p>
      </div>
    </AppLayout>
  );
}
