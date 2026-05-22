import { Link, useLocation } from "wouter";
import { useAdminStatus } from "@/lib/useAdmin";
import { Redirect } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Tag,
  Image,
  Ticket,
  Settings,
  Users,
  Menu,
  X,
  ArrowLeftRight,
  MessageCircle,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { href: "/admin/returns", label: "Returns", icon: ArrowLeftRight },
  { href: "/admin/categories", label: "Categories", icon: Tag },
  { href: "/admin/banners", label: "Banners", icon: Image },
  { href: "/admin/coupons", label: "Coupons", icon: Ticket },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/support", label: "Support", icon: MessageCircle },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

function Sidebar({ currentPath, onClose }: { currentPath: string; onClose?: () => void }) {
  return (
    <nav className="flex flex-col h-full">
      <div className="h-16 flex items-center px-6 border-b gap-3">
        <Link href="/" className="font-serif font-bold text-xl tracking-tight">ShopLux</Link>
        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-medium">Admin</span>
        {onClose && (
          <button onClick={onClose} className="ml-auto text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
      <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = item.exact ? currentPath === item.href : currentPath.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </div>
      <div className="p-4 border-t space-y-3">
        <Link href="/" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-2">
          ← Back to Store
        </Link>
        <button
          onClick={() => {
            localStorage.removeItem("isAdmin");
            localStorage.removeItem("adminEmail");
            localStorage.removeItem("adminToken");

            window.location.href = "/admin-login";
          }}
          className="w-full bg-black hover:bg-black/90 text-white py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}

export function AdminLayout({ children, title }: { children: React.ReactNode; title?: string }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAdmin =
    localStorage.getItem("isAdmin") === "true";

  if (!isAdmin) {
    return <Redirect to="/admin-login" />;
  }

  return (
    <div className="min-h-screen bg-muted/20 flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-background border-r fixed h-full z-30">
        <Sidebar currentPath={location} />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-background border-r z-50">
            <Sidebar currentPath={location} onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        <header className="h-16 bg-background border-b flex items-center px-6 gap-4 sticky top-0 z-20">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(true)}>
            <Menu className="w-5 h-5" />
          </Button>
          <h1 className="font-semibold text-lg">{title}</h1>
        </header>
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
