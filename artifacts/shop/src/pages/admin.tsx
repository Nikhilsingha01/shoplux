import { useGetAdminStats } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Link } from "wouter";
import {
  Package,
  ShoppingCart,
  Users,
  TrendingUp,
  IndianRupee,
  Clock,
  ArrowRight,
} from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  shipped: "bg-indigo-100 text-indigo-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function AdminDashboard() {
  const { data: stats, isLoading } = useGetAdminStats();

  const statCards = [
    {
      label: "Total Revenue",
      value: stats ? `₹${stats.totalRevenue.toLocaleString("en-IN")}` : "—",
      icon: IndianRupee,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "Total Orders",
      value: stats?.totalOrders ?? "—",
      icon: ShoppingCart,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Products",
      value: stats?.totalProducts ?? "—",
      icon: Package,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      label: "Customers",
      value: stats?.totalUsers ?? "—",
      icon: Users,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
    {
      label: "Pending Orders",
      value: stats?.pendingOrders ?? "—",
      icon: Clock,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
  ];

  return (
    <AdminLayout title="Dashboard">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-background border rounded-xl p-5 shadow-sm">
              <div className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center mb-3`}>
                <Icon className={`w-5 h-5 ${card.color}`} />
              </div>
              {isLoading ? (
                <Skeleton className="h-8 w-20 mb-1" />
              ) : (
                <p className="text-2xl font-bold">{card.value}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">{card.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Orders */}
        <div className="bg-background border rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Recent Orders
            </h2>
            <Link href="/admin/orders" className="text-sm text-primary flex items-center gap-1 hover:underline">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4">
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-32 flex-1" />
                  <Skeleton className="h-6 w-20" />
                </div>
              ))
            ) : stats?.recentOrders?.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No orders yet</div>
            ) : (
              stats?.recentOrders?.slice(0, 8).map((order) => (
                <Link
                  key={order.id}
                  href="/admin/orders"
                  className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm text-muted-foreground">#{order.id}</span>
                    <span className="text-sm font-medium truncate max-w-[120px]">
                      {order.customerName || order.customerEmail || order.userId.slice(0, 8)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold">₹{order.totalAmount.toLocaleString("en-IN")}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[order.status] ?? "bg-muted text-muted-foreground"}`}>
                      {order.status}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-background border rounded-xl shadow-sm p-6">
          <h2 className="font-semibold text-lg mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { href: "/admin/products", label: "Add Product", desc: "Create new listing", icon: Package, color: "bg-purple-50 text-purple-600" },
              { href: "/admin/orders", label: "Manage Orders", desc: "View & update status", icon: ShoppingCart, color: "bg-blue-50 text-blue-600" },
              { href: "/admin/categories", label: "Categories", desc: "Organize products", icon: Package, color: "bg-green-50 text-green-600" },
              { href: "/admin/banners", label: "Banners", desc: "Update homepage", icon: TrendingUp, color: "bg-amber-50 text-amber-600" },
              { href: "/admin/coupons", label: "Coupons", desc: "Manage discounts", icon: Clock, color: "bg-rose-50 text-rose-600" },
              { href: "/admin/settings", label: "Settings", desc: "Store config", icon: Users, color: "bg-gray-100 text-gray-600" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors group"
                >
                  <div className={`w-9 h-9 rounded-lg ${item.color} flex items-center justify-center flex-shrink-0`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold group-hover:text-primary transition-colors">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
