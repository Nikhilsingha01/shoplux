import { AppLayout } from "@/components/layout/AppLayout";
import { ShieldCheck, Award, Heart, Sparkles } from "lucide-react";

export default function About() {
  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-16 md:py-24 max-w-4xl">
        <div className="text-center space-y-6 mb-16">
          <h1 className="text-4xl md:text-6xl font-serif font-bold tracking-tight">Our Philosophy</h1>
          <p className="text-lg md:text-xl text-muted-foreground font-light max-w-2xl mx-auto">
            ShopLux was founded on a simple promise: to elevate the everyday. We curate premium essentials that combine functional perfection with a polished, minimalist design language.
          </p>
        </div>

        {/* Brand Values */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
          <div className="border border-border p-8 rounded-xl space-y-4 hover:border-primary/50 transition-colors bg-muted/10">
            <div className="h-10 w-10 bg-primary/10 text-primary flex items-center justify-center rounded-lg">
              <Award className="h-5 w-5" />
            </div>
            <h3 className="text-xl font-semibold">Curated Quality</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              We believe in fewer, better things. Every single product in our catalog undergoes rigorous quality assessments and design critiques before it reaches your hands.
            </p>
          </div>

          <div className="border border-border p-8 rounded-xl space-y-4 hover:border-primary/50 transition-colors bg-muted/10">
            <div className="h-10 w-10 bg-primary/10 text-primary flex items-center justify-center rounded-lg">
              <Sparkles className="h-5 w-5" />
            </div>
            <h3 className="text-xl font-semibold">Minimalist Aesthetics</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Inspired by Apple's engineering and Indian craftsmanship, our design DNA is clean, purposeful, and free of unnecessary clutter.
            </p>
          </div>

          <div className="border border-border p-8 rounded-xl space-y-4 hover:border-primary/50 transition-colors bg-muted/10">
            <div className="h-10 w-10 bg-primary/10 text-primary flex items-center justify-center rounded-lg">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="text-xl font-semibold">Uncompromised Support</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Your trust is our most valuable asset. We provide a completely transparent return structure and 24/7 personalized customer resolution.
            </p>
          </div>

          <div className="border border-border p-8 rounded-xl space-y-4 hover:border-primary/50 transition-colors bg-muted/10">
            <div className="h-10 w-10 bg-primary/10 text-primary flex items-center justify-center rounded-lg">
              <Heart className="h-5 w-5" />
            </div>
            <h3 className="text-xl font-semibold">Made for India</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Designed specifically for the modern Indian lifestyle, incorporating seamless digital payments, fast shipping, and localized support.
            </p>
          </div>
        </div>

        {/* Narrative Section */}
        <div className="border-t border-border pt-16 space-y-8 text-justify leading-relaxed text-muted-foreground font-light">
          <p>
            At ShopLux, we reject the noise of hyper-consumerism. We believe that the items you bring into your life should serve a purpose, perform flawlessly, and bring aesthetic joy every time you interact with them.
          </p>
          <p>
            Our dedicated sourcing team collaborates with elite designers and boutique manufacturers worldwide to bring unique products directly to you, cutting out middlemen to offer true luxury value. Thank you for being a part of our journey as we redefine the Indian ecommerce landscape.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
