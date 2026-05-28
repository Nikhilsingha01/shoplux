import { useGetAdminSettings, useUpdateAdminSettings, customFetch } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";

export default function AdminSettings() {
  const { data: settings, isLoading } = useGetAdminSettings();
  const updateSettings = useUpdateAdminSettings();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    storeName: "",
    storeTagline: "",
    logoUrl: undefined as string | undefined,
    currency: "INR",
    deliveryCharge: 49,
    freeDeliveryAbove: 999,
    gstPercent: 18,
    whatsappNumber: "",
    instagramUrl: "",
    adminClerkUserId: "",
    isChatbotEnabled: true,
    trustBadge1: "Free delivery on orders above ₹999",
    trustBadge2: "Secure & encrypted payments",
    trustBadge3: "7-day hassle-free returns",
  });

  useEffect(() => {
    if (settings) {
      const s = settings as unknown as Record<string, unknown>;
      setForm({
        storeName: settings.storeName ?? "ShopLux",
        storeTagline: (s.storeTagline as string) ?? "",
        logoUrl: (s.logoUrl as string) || undefined,
        currency: (s.currency as string) ?? "INR",
        deliveryCharge: settings.deliveryCharge ?? 49,
        freeDeliveryAbove: settings.freeDeliveryAbove ?? 999,
        gstPercent: settings.gstPercent ?? 18,
        whatsappNumber: (s.whatsappNumber as string) ?? "",
        instagramUrl: (s.instagramUrl as string) ?? "",
        adminClerkUserId: (s.adminClerkUserId as string) ?? "",
        isChatbotEnabled: s.isChatbotEnabled !== false,
        trustBadge1: (s.trustBadge1 as string) ?? "Free delivery on orders above ₹999",
        trustBadge2: (s.trustBadge2 as string) ?? "Secure & encrypted payments",
        trustBadge3: (s.trustBadge3 as string) ?? "7-day hassle-free returns",
      });
    }
  }, [settings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings.mutate(
      { data: form },
      {
        onSuccess: () => {
          toast.success("Settings saved successfully");
          queryClient.invalidateQueries({ queryKey: ["me"] });
        },
        onError: () => toast.error("Failed to save settings"),
      },
    );
  };

  const Field = ({
    label,
    help,
    children,
  }: {
    label: string;
    help?: string;
    children: React.ReactNode;
  }) => (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      {children}
      {help && <p className="text-xs text-muted-foreground">{help}</p>}
    </div>
  );

  return (
    <AdminLayout title="Store Settings">
      <div className="max-w-2xl">
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Store Identity */}
            <section className="bg-background border rounded-xl p-6 space-y-5 shadow-sm">
              <h2 className="font-semibold text-base border-b pb-3">Store Identity</h2>
              <div className="grid grid-cols-2 gap-5">
                <Field label="Store Name">
                  <input
                    className="w-full border border-border px-3 py-2 rounded-md text-sm focus:outline-none focus:border-primary"
                    value={form.storeName}
                    onChange={(e) => setForm((f) => ({ ...f, storeName: e.target.value }))}
                    placeholder="ShopLux"
                  />
                </Field>
                <Field label="Currency">
                  <select
                    className="w-full border border-border px-3 py-2 rounded-md text-sm focus:outline-none focus:border-primary"
                    value={form.currency}
                    onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </Field>
              </div>
              <Field label="Store Tagline" help="Shown in the footer and meta description">
                <input
                  className="w-full border border-border px-3 py-2 rounded-md text-sm focus:outline-none focus:border-primary"
                  value={form.storeTagline}
                  onChange={(e) => setForm((f) => ({ ...f, storeTagline: e.target.value }))}
                  placeholder="Premium Shopping, Delivered."
                />
              </Field>
              <Field label="Custom Store Logo" help="Stylish custom logo shown in the Navbar. Fallback is stylish golden text.">
                <div className="flex flex-col gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    className="w-full border border-border px-3 py-2 rounded-md text-sm focus:outline-none focus:border-primary file:mr-4 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                    onChange={async (e) => {
                      if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0];
                        const formData = new FormData();
                        formData.append("image", file);
                        try {
                          const data = await customFetch<{ url: string }>("/api/admin/upload", {
                            method: "POST",
                            body: formData,
                          });
                          setForm((f) => ({ ...f, logoUrl: data.url }));
                          toast.success("Logo uploaded successfully");
                        } catch (err: any) {
                          toast.error(err?.message || "Error uploading logo");
                        }
                      }
                    }}
                  />
                  <input
                    className="w-full border border-border px-3 py-2 rounded-md text-sm focus:outline-none focus:border-primary"
                    value={form.logoUrl || ""}
                    onChange={(e) => setForm((f) => ({ ...f, logoUrl: e.target.value || undefined }))}
                    placeholder="Or enter logo URL directly"
                  />
                  {form.logoUrl && (
                    <div className="mt-2 p-3 bg-muted/40 border rounded-lg flex items-center justify-center">
                      <img src={form.logoUrl} alt="Store Logo Preview" className="h-10 object-contain max-w-full" />
                    </div>
                  )}
                </div>
              </Field>
            </section>

            {/* Store Promotional Badges */}
            <section className="bg-background border rounded-xl p-6 space-y-5 shadow-sm">
              <h2 className="font-semibold text-base border-b pb-3">Store Trust Badges</h2>
              <Field label="Badge 1: Free Delivery Customization" help="Shown as badge 1 on product detail pages">
                <input
                  className="w-full border border-border px-3 py-2 rounded-md text-sm focus:outline-none focus:border-primary"
                  value={form.trustBadge1}
                  onChange={(e) => setForm((f) => ({ ...f, trustBadge1: e.target.value }))}
                  placeholder="Free delivery on orders above ₹999"
                />
              </Field>
              <Field label="Badge 2: Payment Security Customization" help="Shown as badge 2 on product detail pages">
                <input
                  className="w-full border border-border px-3 py-2 rounded-md text-sm focus:outline-none focus:border-primary"
                  value={form.trustBadge2}
                  onChange={(e) => setForm((f) => ({ ...f, trustBadge2: e.target.value }))}
                  placeholder="Secure & encrypted payments"
                />
              </Field>
              <Field label="Badge 3: Returns Customization" help="Shown as badge 3 on product detail pages">
                <input
                  className="w-full border border-border px-3 py-2 rounded-md text-sm focus:outline-none focus:border-primary"
                  value={form.trustBadge3}
                  onChange={(e) => setForm((f) => ({ ...f, trustBadge3: e.target.value }))}
                  placeholder="7-day hassle-free returns"
                />
              </Field>
            </section>

            {/* Delivery & Pricing */}
            <section className="bg-background border rounded-xl p-6 space-y-5 shadow-sm">
              <h2 className="font-semibold text-base border-b pb-3">Delivery & Pricing</h2>
              <div className="grid grid-cols-3 gap-5">
                <Field label="Delivery Charge (₹)" help="Charged below free threshold">
                  <input
                    type="number"
                    className="w-full border border-border px-3 py-2 rounded-md text-sm focus:outline-none focus:border-primary"
                    value={form.deliveryCharge}
                    onChange={(e) => setForm((f) => ({ ...f, deliveryCharge: Number(e.target.value) }))}
                    min={0}
                  />
                </Field>
                <Field label="Free Delivery Above (₹)" help="Order value for free delivery">
                  <input
                    type="number"
                    className="w-full border border-border px-3 py-2 rounded-md text-sm focus:outline-none focus:border-primary"
                    value={form.freeDeliveryAbove}
                    onChange={(e) => setForm((f) => ({ ...f, freeDeliveryAbove: Number(e.target.value) }))}
                    min={0}
                  />
                </Field>
                <Field label="GST (%)" help="Tax percentage applied">
                  <input
                    type="number"
                    className="w-full border border-border px-3 py-2 rounded-md text-sm focus:outline-none focus:border-primary"
                    value={form.gstPercent}
                    onChange={(e) => setForm((f) => ({ ...f, gstPercent: Number(e.target.value) }))}
                    min={0}
                    max={100}
                  />
                </Field>
              </div>
            </section>

            {/* Contact */}
            <section className="bg-background border rounded-xl p-6 space-y-5 shadow-sm">
              <h2 className="font-semibold text-base border-b pb-3">Contact & Social</h2>
              <div className="grid grid-cols-2 gap-5">
                <Field label="WhatsApp Number" help="Include country code, e.g. +91-9876543210">
                  <input
                    className="w-full border border-border px-3 py-2 rounded-md text-sm focus:outline-none focus:border-primary"
                    value={form.whatsappNumber}
                    onChange={(e) => setForm((f) => ({ ...f, whatsappNumber: e.target.value }))}
                    placeholder="+91-9876543210"
                  />
                </Field>
                <Field label="Admin Clerk User ID" help="Your Clerk User ID (found in Clerk Dashboard -> Users)">
                  <input
                    type="text"
                    className="w-full border border-border px-3 py-2 rounded-md text-sm focus:outline-none focus:border-primary"
                    value={form.adminClerkUserId}
                    onChange={(e) => setForm((f) => ({ ...f, adminClerkUserId: e.target.value }))}
                    placeholder="user_xxxx"
                  />
                </Field>
              </div>
              <Field label="Instagram URL">
                <input
                  className="w-full border border-border px-3 py-2 rounded-md text-sm focus:outline-none focus:border-primary"
                  value={form.instagramUrl}
                  onChange={(e) => setForm((f) => ({ ...f, instagramUrl: e.target.value }))}
                  placeholder="https://instagram.com/shoplux"
                />
              </Field>
            </section>

            {/* AI Assistant Configurations */}
            <section className="bg-background border rounded-xl p-6 space-y-5 shadow-sm">
              <h2 className="font-semibold text-base border-b pb-3 flex items-center gap-2">
                🤖 AI Customer Chatbot Settings
              </h2>
              <div className="flex items-center justify-between p-4 bg-muted/40 rounded-lg border">
                <div>
                  <h3 className="text-sm font-semibold">Enable AI Customer Chatbot</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Toggle to activate the premium AI Shopping Assistant for storefront visitors.
                  </p>
                </div>
                <input
                  type="checkbox"
                  className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer accent-primary"
                  checked={form.isChatbotEnabled}
                  onChange={(e) => setForm((f) => ({ ...f, isChatbotEnabled: e.target.checked }))}
                />
              </div>
            </section>

            <div className="flex justify-end">
              <Button type="submit" disabled={updateSettings.isPending} className="px-8">
                {updateSettings.isPending ? "Saving..." : "Save All Settings"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </AdminLayout>
  );
}
