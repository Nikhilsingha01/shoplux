import { Link, useLocation } from "wouter";
import { useCart } from "@/lib/cart";
import { useUser, useClerk } from "@clerk/react";
import { ShoppingBag, Search, User, Menu, LogOut, ChevronDown } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

import { useAdminStatus } from "@/lib/useAdmin";

export function Navbar() {
  const { logoUrl, storeName } = useAdminStatus();
  const cartItemsCount = useCart((state) => state.getTotalItems());
  const { user, isSignedIn } = useUser();
  const { signOut } = useClerk();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setLocation(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] sm:w-[400px] flex flex-col gap-6 pt-12">
              {/* Mobile Search Form */}
              <form onSubmit={handleSearchSubmit} className="relative flex items-center w-full">
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-muted/60 border border-border px-3 py-2 pl-9 rounded-full text-sm focus:outline-none focus:border-primary focus:bg-background transition-all"
                />
                <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
              </form>

              <nav className="flex flex-col gap-4">
                <Link href="/" onClick={() => setIsMobileMenuOpen(false)} className="text-base font-medium hover:text-primary transition-colors">Home</Link>
                <Link href="/products" onClick={() => setIsMobileMenuOpen(false)} className="text-base font-medium hover:text-primary transition-colors">Shop</Link>
                <Link href="/about" onClick={() => setIsMobileMenuOpen(false)} className="text-base font-medium hover:text-primary transition-colors">About Us</Link>
                
                <div className="h-px bg-border my-2" />
                
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Policies</p>
                <div className="flex flex-col gap-3 pl-2 border-l border-border mt-1">
                  <Link href="/terms" onClick={() => setIsMobileMenuOpen(false)} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Terms & Conditions</Link>
                  <Link href="/privacy" onClick={() => setIsMobileMenuOpen(false)} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</Link>
                  <Link href="/return-policy" onClick={() => setIsMobileMenuOpen(false)} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Return & Refund</Link>
                  <Link href="/faq" onClick={() => setIsMobileMenuOpen(false)} className="text-sm text-muted-foreground hover:text-foreground transition-colors">FAQs & Shipping</Link>
                </div>
              </nav>
            </SheetContent>
          </Sheet>
          <Link href="/" className="flex items-center gap-2">
            {logoUrl ? (
              <img src={logoUrl} alt={storeName} className="h-8 max-w-[150px] object-contain" />
            ) : (
              <span className="font-extrabold text-xl tracking-wider bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 bg-clip-text text-transparent select-none drop-shadow-sm font-sans">
                {storeName}
              </span>
            )}
          </Link>
          <nav className="hidden md:flex items-center gap-6 ml-8">
            <Link href="/products" className="text-sm font-medium hover:text-primary transition-colors">Shop</Link>
            <Link href="/products?featured=true" className="text-sm font-medium hover:text-primary transition-colors">Featured</Link>
            <Link href="/products?new=true" className="text-sm font-medium hover:text-primary transition-colors">New Arrivals</Link>
            <Link href="/about" className="text-sm font-medium hover:text-primary transition-colors">About Us</Link>
            
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1 text-sm font-medium hover:text-primary transition-colors focus:outline-none cursor-pointer">
                Policies <ChevronDown className="h-3.5 w-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48 bg-background border rounded-md shadow-md p-1 z-[100]">
                <DropdownMenuItem asChild>
                  <Link href="/terms" className="w-full text-left px-2 py-1.5 text-xs hover:bg-accent rounded cursor-pointer block">Terms & Conditions</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/privacy" className="w-full text-left px-2 py-1.5 text-xs hover:bg-accent rounded cursor-pointer block">Privacy Policy</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/return-policy" className="w-full text-left px-2 py-1.5 text-xs hover:bg-accent rounded cursor-pointer block">Return & Refund</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/faq" className="w-full text-left px-2 py-1.5 text-xs hover:bg-accent rounded cursor-pointer block">FAQs & Shipping</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
        </div>

        <div className="flex items-center gap-3 md:gap-4">
          {/* Desktop Search Bar */}
          <form onSubmit={handleSearchSubmit} className="relative hidden md:flex items-center">
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-muted/50 border border-border px-3 py-1.5 pl-8 rounded-full text-xs focus:outline-none focus:border-primary focus:bg-background transition-all w-40 lg:w-48 focus:w-56"
            />
            <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
          </form>
          
          <Link href="/cart">
            <Button variant="ghost" size="icon" className="relative">
              <ShoppingBag className="h-5 w-5" />
              {cartItemsCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center">
                  {cartItemsCount}
                </span>
              )}
            </Button>
          </Link>

          {isSignedIn ? (
            <div className="hidden sm:flex items-center gap-2">
              <Link href="/account">
                <Button variant="ghost" size="icon">
                  <User className="h-5 w-5" />
                </Button>
              </Link>
              <Button variant="ghost" size="icon" onClick={() => signOut({ redirectUrl: import.meta.env.BASE_URL || "/" })}>
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          ) : (
            <Link href="/sign-in" className="hidden sm:block">
              <Button variant="default" size="sm" className="font-medium tracking-wide">Sign In</Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
