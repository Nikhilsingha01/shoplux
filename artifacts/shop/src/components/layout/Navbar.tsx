import { Link } from "wouter";
import { useCart } from "@/lib/cart";
import { useUser, useClerk } from "@clerk/react";
import { ShoppingBag, Search, User, Menu, X, LogOut, LayoutDashboard } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export function Navbar() {
  const cartItemsCount = useCart((state) => state.getTotalItems());
  const { user, isSignedIn } = useUser();
  const { signOut } = useClerk();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
            <SheetContent side="left" className="w-[300px] sm:w-[400px]">
              <nav className="flex flex-col gap-4 mt-8">
                <Link href="/" onClick={() => setIsMobileMenuOpen(false)} className="text-lg font-medium">Home</Link>
                <Link href="/products" onClick={() => setIsMobileMenuOpen(false)} className="text-lg font-medium">Shop</Link>
                <Link href="/categories" onClick={() => setIsMobileMenuOpen(false)} className="text-lg font-medium">Categories</Link>
              </nav>
            </SheetContent>
          </Sheet>
          <Link href="/" className="flex items-center gap-2">
            <img src={`${import.meta.env.BASE_URL.replace(/\/$/, "")}/logo.svg`} alt="ShopLux" className="h-8" />
          </Link>
          <nav className="hidden md:flex items-center gap-6 ml-8">
            <Link href="/products" className="text-sm font-medium hover:text-primary transition-colors">Shop</Link>
            <Link href="/products?featured=true" className="text-sm font-medium hover:text-primary transition-colors">Featured</Link>
            <Link href="/products?new=true" className="text-sm font-medium hover:text-primary transition-colors">New Arrivals</Link>
          </nav>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <Button variant="ghost" size="icon" className="hidden sm:inline-flex">
            <Search className="h-5 w-5" />
          </Button>
          
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
