import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { Home, Search, ShoppingBag, User } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useCart } from "@/lib/cart";
import { useAdminStatus } from "@/lib/useAdmin";

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
  const { whatsappNumber } = useAdminStatus();
  
  // Clean phone number (strip spaces/dashes)
  const cleanPhone = whatsappNumber ? whatsappNumber.replace(/\s+/g, "").replace(/[+]/g, "") : "";
  const whatsappUrl = cleanPhone 
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent("Hi, I need help with my order")}`
    : null;

  return (
    <div className="min-h-[100dvh] flex flex-col w-full overflow-x-hidden relative">
      <Navbar />
      <main className="flex-1 flex flex-col w-full pb-16 md:pb-0">
        {children}
      </main>
      <Footer />
      <MobileNav />

      {/* Floating WhatsApp button */}
      {whatsappUrl && (
        <a 
          href={whatsappUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="fixed bottom-20 md:bottom-6 right-6 z-40 bg-[#25D366] hover:bg-[#20ba5a] text-white p-3 md:p-3.5 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 flex items-center justify-center cursor-pointer group"
          aria-label="Chat on WhatsApp"
        >
          <svg className="w-5 h-5 md:w-6 md:h-6 fill-current" viewBox="0 0 24 24">
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.625 1.451 5.403.002 9.794-4.382 9.797-9.786.002-2.618-1.01-5.078-2.852-6.92C16.376 2.057 13.924.935 11.3.935c-5.41.002-9.799 4.393-9.802 9.797-.001 1.558.423 3.082 1.229 4.437l-.978 3.57L5.6 19.8l.192.115.855-.761zm11.904-6.84c-.314-.157-1.855-.915-2.143-1.02-.288-.106-.499-.157-.709.157-.21.314-.813 1.02-.996 1.23-.183.21-.366.236-.68.079-.314-.158-1.325-.488-2.525-1.559-.933-.833-1.563-1.862-1.747-2.176-.183-.314-.02-.484.137-.64.142-.141.314-.367.472-.55.157-.183.21-.314.314-.524.105-.21.052-.393-.026-.55-.079-.157-.709-1.708-.971-2.337-.256-.615-.515-.531-.709-.541-.183-.01-.393-.01-.603-.01-.21 0-.55.079-.838.393-.288.314-1.101 1.077-1.101 2.622 0 1.545 1.127 3.039 1.284 3.249.157.21 2.219 3.39 5.378 4.754.752.325 1.339.519 1.797.665.756.24 1.444.207 1.989.126.607-.09 1.854-.759 2.116-1.468.262-.708.262-1.31.183-1.468-.078-.157-.288-.261-.602-.418z" />
          </svg>
          <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 ease-in-out text-xs font-semibold whitespace-nowrap group-hover:ml-2">
            Chat with us
          </span>
        </a>
      )}
    </div>
  );
}
