import { AppLayout } from "@/components/layout/AppLayout";
import { Show, useUser, useClerk } from "@clerk/react";
import { Link, Redirect } from "wouter";
import {
  useListOrders,
  useGetWishlist,
  useListAddresses,
  useCreateAddress,
  useDeleteAddress,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, MapPin, Package, Heart, LogOut, Award, Sparkles } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { useMe } from "@/lib/useAdmin";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  shipped: "bg-indigo-100 text-indigo-800",
  out_for_delivery: "bg-violet-100 text-violet-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

function AddAddressDialog({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const createAddress = useCreateAddress();
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    addressLine: "",
    landmark: "",
    city: "",
    state: "",
    pincode: "",
    isDefault: false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createAddress.mutate(
      { data: form },
      {
        onSuccess: () => {
          toast.success("Address added");
          onSuccess();
          onClose();
          setForm({ fullName: "", phone: "", email: "", addressLine: "", landmark: "", city: "", state: "", pincode: "", isDefault: false });
        },
        onError: (err: any) => {
          console.error("Address save error:", err);
          const errMsg = err?.response?.data?.error || err?.message || "Failed to add address";
          toast.error(errMsg);
        },
      },
    );
  };

  const STATES = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
    "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
    "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
    "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
    "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
    "Delhi", "Jammu and Kashmir", "Ladakh",
  ];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Address</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Full Name *</label>
              <input
                className="w-full border border-border px-3 py-2 rounded-md text-sm focus:outline-none focus:border-primary"
                value={form.fullName}
                onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                required
                placeholder="Rahul Sharma"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Phone *</label>
              <input
                className="w-full border border-border px-3 py-2 rounded-md text-sm focus:outline-none focus:border-primary"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                required
                placeholder="+91-9876543210"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Email</label>
            <input
              type="email"
              className="w-full border border-border px-3 py-2 rounded-md text-sm focus:outline-none focus:border-primary"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="rahul@example.com"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Address Line *</label>
            <textarea
              className="w-full border border-border px-3 py-2 rounded-md text-sm focus:outline-none focus:border-primary resize-none"
              rows={2}
              value={form.addressLine}
              onChange={(e) => setForm((f) => ({ ...f, addressLine: e.target.value }))}
              required
              placeholder="Flat No, Building, Street, Area"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Landmark</label>
            <input
              className="w-full border border-border px-3 py-2 rounded-md text-sm focus:outline-none focus:border-primary"
              value={form.landmark}
              onChange={(e) => setForm((f) => ({ ...f, landmark: e.target.value }))}
              placeholder="Near Metro Station, etc."
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">City *</label>
              <input
                className="w-full border border-border px-3 py-2 rounded-md text-sm focus:outline-none focus:border-primary"
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                required
                placeholder="Mumbai"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">State *</label>
              <select
                className="w-full border border-border px-3 py-2 rounded-md text-sm focus:outline-none focus:border-primary"
                value={form.state}
                onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
                required
              >
                <option value="">Select</option>
                {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Pincode *</label>
              <input
                className="w-full border border-border px-3 py-2 rounded-md text-sm focus:outline-none focus:border-primary"
                value={form.pincode}
                onChange={(e) => setForm((f) => ({ ...f, pincode: e.target.value }))}
                required
                placeholder="400001"
                maxLength={6}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
              className="rounded"
            />
            Set as default address
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={createAddress.isPending}>
              {createAddress.isPending ? "Saving..." : "Save Address"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Account() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const { data: me } = useMe();

  const { data: ordersData } = useListOrders({ limit: 5 });
  const { data: addresses, refetch: refetchAddresses } = useListAddresses();
  const { data: wishlist } = useGetWishlist();
  const deleteAddress = useDeleteAddress();

  const [addAddressOpen, setAddAddressOpen] = useState(false);

  const handleDeleteAddress = (id: number) => {
    deleteAddress.mutate(
      { id },
      {
        onSuccess: () => { toast.success("Address removed"); refetchAddresses(); },
        onError: () => toast.error("Failed to remove address"),
      },
    );
  };

  return (
    <AppLayout>
      <Show when="signed-out">
        <Redirect to="/sign-in" />
      </Show>
      <Show when="signed-in">
        <div className="container mx-auto px-4 py-8 md:py-12">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
            <div>
              <h1 className="text-3xl font-serif font-bold">My Account</h1>
              <p className="text-muted-foreground mt-1">
                Welcome back, {user?.firstName || user?.primaryEmailAddress?.emailAddress}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => signOut({ redirectUrl: "/" })}
              className="flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left column */}
            <div className="lg:col-span-2 space-y-8">
              {/* Recent Orders */}
              <section className="bg-background border rounded-xl p-6 shadow-sm">
                <div className="flex justify-between items-center mb-5">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Package className="w-5 h-5 text-primary" /> Recent Orders
                  </h2>
                  <Link href="/orders" className="text-sm text-primary hover:underline">View All</Link>
                </div>
                {ordersData?.orders && ordersData.orders.length > 0 ? (
                  <div className="space-y-3">
                    {ordersData.orders.map((order) => (
                      <Link
                        key={order.id}
                        href={`/orders/${order.id}`}
                        className="flex justify-between items-center border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                      >
                        <div>
                          <p className="font-medium text-sm">Order #{order.customerOrderNumber ?? order.id}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {new Date(order.createdAt).toLocaleDateString("en-IN", {
                              day: "numeric", month: "short", year: "numeric",
                            })}
                            {" · "}{order.items.length} item{order.items.length !== 1 ? "s" : ""}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-sm">₹{order.totalAmount.toLocaleString("en-IN")}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize mt-1 inline-block ${STATUS_COLORS[order.status] ?? "bg-muted text-muted-foreground"}`}>
                            {order.status.replace("_", " ")}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Package className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground text-sm">No orders yet.</p>
                    <Link href="/products">
                      <Button size="sm" className="mt-3 rounded-none tracking-wide uppercase">Start Shopping</Button>
                    </Link>
                  </div>
                )}
              </section>

              {/* Wishlist */}
              <section className="bg-background border rounded-xl p-6 shadow-sm">
                <div className="flex justify-between items-center mb-5">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Heart className="w-5 h-5 text-primary" /> Wishlist
                  </h2>
                </div>
                {wishlist && wishlist.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {wishlist.slice(0, 6).map((item) => item.product && (
                      <ProductCard key={item.id} product={item.product} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Heart className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground text-sm">Your wishlist is empty.</p>
                  </div>
                )}
              </section>
            </div>

            {/* Right column — Loyalty & Addresses */}
            <div className="space-y-8">
              {/* Loyalty Points VIP Card */}
              <section className="bg-gradient-to-br from-amber-600 to-amber-900 text-white rounded-xl p-6 shadow-md relative overflow-hidden">
                {/* Background decorative shine */}
                <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute left-10 bottom-0 w-24 h-24 bg-amber-500/20 rounded-full blur-xl pointer-events-none" />
                
                <div className="relative z-10 flex flex-col h-full justify-between gap-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-widest bg-white/20 px-2 py-0.5 rounded-full text-amber-100">
                        ShopLux Club VIP
                      </span>
                      <h3 className="font-serif font-bold text-xl mt-2">Loyalty Reward Points</h3>
                    </div>
                    <Award className="w-8 h-8 text-amber-200 animate-pulse" />
                  </div>
                  
                  <div>
                    <p className="text-3xl font-mono font-bold tracking-wider">{(me?.user as any)?.loyaltyPoints ?? 0} pts</p>
                    <p className="text-xs text-amber-200/90 mt-1 font-medium">
                      Estimated Value: ₹{Math.floor(((me?.user as any)?.loyaltyPoints ?? 0) / 10) * 1} (Redeemable at checkout)
                    </p>
                  </div>
                  
                  <div className="border-t border-white/20 pt-4 flex items-center justify-between text-xs text-amber-100">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" /> Earn 1 pt per ₹10 spent
                    </span>
                    <span>100 pts = ₹10</span>
                  </div>
                </div>
              </section>

              <section className="bg-background border rounded-xl p-6 shadow-sm">
                <div className="flex justify-between items-center mb-5">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-primary" /> Addresses
                  </h2>
                </div>
                {addresses && addresses.length > 0 ? (
                  <div className="space-y-3">
                    {addresses.map((address) => (
                      <div key={address.id} className="border rounded-lg p-4 text-sm relative group">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold flex items-center gap-2">
                              {address.fullName}
                              {address.isDefault && (
                                <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                                  Default
                                </span>
                              )}
                            </p>
                            <p className="text-muted-foreground mt-1 leading-relaxed">
                              {address.addressLine}
                              {address.landmark && `, ${address.landmark}`}
                            </p>
                            <p className="text-muted-foreground">
                              {address.city}, {address.state} — {address.pincode}
                            </p>
                            <p className="text-muted-foreground mt-1">{address.phone}</p>
                          </div>
                          <button
                            onClick={() => handleDeleteAddress(address.id)}
                            disabled={deleteAddress.isPending}
                            className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity ml-2 mt-1 flex-shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <MapPin className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground text-sm">No addresses saved yet.</p>
                  </div>
                )}
                <Button
                  variant="outline"
                  className="w-full mt-4 rounded-none tracking-wide"
                  onClick={() => setAddAddressOpen(true)}
                >
                  <Plus className="w-4 h-4 mr-2" /> Add New Address
                </Button>
              </section>
            </div>
          </div>
        </div>

        <AddAddressDialog
          open={addAddressOpen}
          onClose={() => setAddAddressOpen(false)}
          onSuccess={refetchAddresses}
        />
      </Show>
    </AppLayout>
  );
}
