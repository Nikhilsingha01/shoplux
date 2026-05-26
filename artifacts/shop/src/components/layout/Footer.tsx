import { Link } from "wouter";
import { Instagram, MessageCircle } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-foreground text-background py-12 md:py-16 mt-auto">
      <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12">
        <div className="space-y-4">
          <img src={`${import.meta.env.BASE_URL.replace(/\/$/, "")}/logo.svg`} alt="ShopLux" className="h-8 invert" />
          <p className="text-background/70 text-sm max-w-xs leading-relaxed">
            A premium Indian ecommerce platform built for discerning shoppers. Curated quality, uncompromising style.
          </p>
        </div>
        
        <div className="space-y-4">
          <h4 className="font-serif font-semibold text-lg">Shop</h4>
          <nav className="flex flex-col gap-2">
            <Link href="/products" className="text-sm text-background/70 hover:text-primary transition-colors">All Products</Link>
            <Link href="/products?featured=true" className="text-sm text-background/70 hover:text-primary transition-colors">Featured Collection</Link>
            <Link href="/products?new=true" className="text-sm text-background/70 hover:text-primary transition-colors">New Arrivals</Link>
          </nav>
        </div>

        <div className="space-y-4">
          <h4 className="font-serif font-semibold text-lg">Support</h4>
          <nav className="flex flex-col gap-2">
            <Link href="/support" className="text-sm text-background/70 hover:text-primary transition-colors">Contact Support</Link>
            <Link href="/faq" className="text-sm text-background/70 hover:text-primary transition-colors">FAQ</Link>
            <Link href="/return-policy" className="text-sm text-background/70 hover:text-primary transition-colors">Returns & Exchanges</Link>
            <Link href="/terms" className="text-sm text-background/70 hover:text-primary transition-colors">Terms of Service</Link>
            <Link href="/privacy-policy" className="text-sm text-background/70 hover:text-primary transition-colors">Privacy Policy</Link>
          </nav>
        </div>

        <div className="space-y-4">
          <h4 className="font-serif font-semibold text-lg">Newsletter</h4>
          <p className="text-sm text-background/70">Subscribe for early access to new collections and exclusive offers.</p>
          <form className="flex gap-2">
            <input 
              type="email" 
              placeholder="Your email address" 
              className="bg-background/10 border border-background/20 rounded px-3 py-2 text-sm w-full focus:outline-none focus:border-primary placeholder:text-background/40 text-background"
            />
            <button type="button" className="bg-primary text-primary-foreground px-4 py-2 rounded text-sm font-medium hover:bg-primary/90 transition-colors">
              Subscribe
            </button>
          </form>
        </div>
      </div>
      <div className="container mx-auto px-4 mt-12 pt-8 border-t border-background/10 text-center md:text-left flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-background/50">
        <p>&copy; {new Date().getFullYear()} ShopLux. All rights reserved.</p>
        <div className="flex gap-4 items-center">
          <a href="/admin-login" className="hover:text-primary transition-colors font-medium">Admin Panel</a>
          <span className="text-background/20">|</span>
          <a href="https://www.instagram.com/shoplux.in?igsh=Yzh5MzZkMWV4ZHM0" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors flex items-center gap-1">
            <Instagram className="w-4 h-4" />
            <span className="sr-only">Instagram</span>
          </a>
          <a href="https://wa.me/911234567890" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors flex items-center gap-1">
            <MessageCircle className="w-4 h-4" />
            <span className="sr-only">WhatsApp</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
