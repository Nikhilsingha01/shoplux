import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { Home, Search, ShoppingBag, User } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useCart } from "@/lib/cart";

function MobileNav() {
  const [location] = useLocation();
  const cartItemsCount = useCart((state) => state.getTotalItems());

  const navItems = [
    { href: "/", icon: Home, label: "Home" },
    { href: "/products", icon: Search, label: "Shop" },
    { href: "/cart", icon: ShoppingBag, label: "Cart", badge: cartItemsCount },
    { href: "/account", icon: User, label: "Account" },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-background/90 backdrop-blur-lg z-50 pb-safe">
      <div className="flex items-center justify-around h-16 px-4">
        {navItems.map((item) => {
          const isActive = location === item.href;
          const Icon = item.icon;
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground transition-colors'}`}
            >
              <div className="relative">
                <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
                {item.badge ? (
                  <span className="absolute -top-1.5 -right-2 h-4 min-w-4 px-1 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center">
                    {item.badge}
                  </span>
                ) : null}
              </div>
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] flex flex-col w-full overflow-x-hidden">
      <Navbar />
      <main className="flex-1 flex flex-col w-full pb-16 md:pb-0">
        {children}
      </main>
      <Footer />
      <MobileNav />
    </div>
  );
}
