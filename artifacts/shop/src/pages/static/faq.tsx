import { AppLayout } from "@/components/layout/AppLayout";
import { Link } from "wouter";

export default function FAQ() {
  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-16 md:py-24 max-w-3xl">
        <h1 className="text-4xl font-serif font-bold text-center mb-12">Frequently Asked Questions</h1>
        
        <div className="space-y-8">
          <div>
            <h3 className="font-semibold text-xl mb-2">How long will my order take to arrive?</h3>
            <p className="text-muted-foreground leading-relaxed">Orders are typically processed within 1-2 business days. Delivery within India takes 3-5 business days depending on your location.</p>
          </div>
          
          <div>
            <h3 className="font-semibold text-xl mb-2">Do you ship internationally?</h3>
            <p className="text-muted-foreground leading-relaxed">Currently, we only ship within India. We are working on expanding our reach globally soon.</p>
          </div>
          
          <div>
            <h3 className="font-semibold text-xl mb-2">What is your return policy?</h3>
            <p className="text-muted-foreground leading-relaxed">We offer a 15-day return policy for unused items in their original packaging. Please check our <Link href="/return-policy" className="text-primary underline">Return Policy</Link> page for full details.</p>
          </div>

          <div>
            <h3 className="font-semibold text-xl mb-2">How can I track my order?</h3>
            <p className="text-muted-foreground leading-relaxed">Once your order ships, you will receive an email and SMS with a tracking link. You can also view the status in your account under Order History.</p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
