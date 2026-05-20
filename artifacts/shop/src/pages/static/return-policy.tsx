import { AppLayout } from "@/components/layout/AppLayout";

export default function ReturnPolicy() {
  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-16 max-w-3xl prose prose-stone dark:prose-invert">
        <h1 className="font-serif">Returns & Exchanges</h1>
        <p>Last updated: {new Date().toLocaleDateString()}</p>
        
        <p>We want you to be completely satisfied with your purchase. If for any reason you are not, we accept returns and exchanges within 15 days of delivery.</p>
        
        <h2>Return Conditions</h2>
        <ul>
          <li>Items must be unused, unwashed, and in their original condition.</li>
          <li>Original tags and packaging must be intact.</li>
          <li>Items purchased during promotional sales may have different return policies.</li>
        </ul>

        <h2>How to Return</h2>
        <p>To initiate a return, please log into your account, go to Order History, select the order, and click "Request Return". Our delivery partner will pick up the item within 2-3 business days.</p>

        <h2>Refunds</h2>
        <p>Refunds will be processed to the original payment method within 5-7 business days after the returned item passes our quality inspection.</p>
      </div>
    </AppLayout>
  );
}
