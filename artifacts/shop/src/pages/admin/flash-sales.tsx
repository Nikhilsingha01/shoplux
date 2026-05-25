import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useListProducts } from "@workspace/api-client-react";
import { Trash2, Zap, Calendar, Tag, CheckSquare, Square } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface FlashSale {
  id: number;
  title: string;
  discountPercent: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
  createdAt: string;
}

export default function AdminFlashSales() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [discountPercent, setDiscountPercent] = useState(15);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);

  // Fetch all flash sales
  const { data: sales = [], isLoading: isLoadingSales } = useQuery<FlashSale[]>({
    queryKey: ["admin-flash-sales"],
    queryFn: async () => {
      const adminToken = localStorage.getItem("adminToken") || "shopluxadmin";
      const res = await fetch("/api/admin/flash-sales", {
        headers: { "x-admin-token": adminToken },
      });
      if (!res.ok) throw new Error("Failed to fetch flash sales");
      return res.json();
    },
  });

  // Fetch all products to select
  const { data: productsData } = useListProducts({ limit: 100 });
  const products = productsData?.products ?? [];

  // Create flash sale mutation
  const createSaleMutation = useMutation({
    mutationFn: async () => {
      const adminToken = localStorage.getItem("adminToken") || "shopluxadmin";
      const res = await fetch("/api/admin/flash-sales", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": adminToken,
        },
        body: JSON.stringify({
          title,
          discountPercent,
          startTime,
          endTime,
          productIds: selectedProducts,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create flash sale");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Flash sale created successfully!");
      setTitle("");
      setDiscountPercent(15);
      setStartTime("");
      setEndTime("");
      setSelectedProducts([]);
      queryClient.invalidateQueries({ queryKey: ["admin-flash-sales"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create flash sale");
    },
  });

  // Delete flash sale mutation
  const deleteSaleMutation = useMutation({
    mutationFn: async (id: number) => {
      const adminToken = localStorage.getItem("adminToken") || "shopluxadmin";
      const res = await fetch(`/api/admin/flash-sales/${id}`, {
        method: "DELETE",
        headers: { "x-admin-token": adminToken },
      });
      if (!res.ok) throw new Error("Failed to delete flash sale");
    },
    onSuccess: () => {
      toast.success("Flash sale deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-flash-sales"] });
    },
    onError: () => {
      toast.error("Failed to delete flash sale");
    },
  });

  const toggleProductSelect = (id: number) => {
    setSelectedProducts((prev) =>
      prev.includes(id) ? prev.filter((pid) => pid !== id) : [...prev, id]
    );
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !discountPercent || !startTime || !endTime) {
      toast.error("Please fill in all fields");
      return;
    }
    createSaleMutation.mutate();
  };

  return (
    <AdminLayout title="Flash Sales Manager">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl">
        {/* Left Form Panel */}
        <div className="lg:col-span-1 space-y-6">
          <section className="bg-background border rounded-xl p-6 shadow-sm">
            <h2 className="font-semibold text-lg border-b pb-3 mb-5 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500 fill-amber-500" /> Create Flash Sale
            </h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Sale Title *</label>
                <input
                  className="w-full border border-border px-3 py-2 rounded-md text-sm focus:outline-none focus:border-primary"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Mid-Summer Lightning Deal"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Discount Percentage (%) *</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  className="w-full border border-border px-3 py-2 rounded-md text-sm focus:outline-none focus:border-primary"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(Number(e.target.value))}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium flex items-center gap-1">
                  <Calendar className="w-4 h-4 text-muted-foreground" /> Start Time *
                </label>
                <input
                  type="datetime-local"
                  className="w-full border border-border px-3 py-2 rounded-md text-sm focus:outline-none focus:border-primary"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium flex items-center gap-1">
                  <Calendar className="w-4 h-4 text-muted-foreground" /> End Time *
                </label>
                <input
                  type="datetime-local"
                  className="w-full border border-border px-3 py-2 rounded-md text-sm focus:outline-none focus:border-primary"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                />
              </div>

              {/* Product Selection List */}
              <div className="space-y-2 pt-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  <Tag className="w-4 h-4 text-muted-foreground" /> Select Flash Sale Products
                </label>
                <div className="border rounded-md max-h-[220px] overflow-y-auto divide-y">
                  {products.map((product) => {
                    const isSelected = selectedProducts.includes(product.id);
                    return (
                      <button
                        type="button"
                        key={product.id}
                        onClick={() => toggleProductSelect(product.id)}
                        className="w-full flex items-center gap-3 px-3 py-2 text-left text-xs hover:bg-muted transition-colors"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-primary flex-shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        )}
                        <span className="font-medium truncate">{product.name}</span>
                        <span className="ml-auto font-semibold">₹{Number(product.price).toLocaleString("en-IN")}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <Button
                type="submit"
                disabled={createSaleMutation.isPending}
                className="w-full rounded-none tracking-wide font-medium mt-2"
              >
                {createSaleMutation.isPending ? "Creating..." : "Launch Flash Sale"}
              </Button>
            </form>
          </section>
        </div>

        {/* Right Active & History List Panel */}
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-background border rounded-xl p-6 shadow-sm">
            <h2 className="font-semibold text-lg border-b pb-3 mb-5">All Flash Sales</h2>
            {isLoadingSales ? (
              <div className="space-y-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : sales.length === 0 ? (
              <div className="text-center py-12 bg-muted/10 rounded-xl border border-dashed">
                <Zap className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No flash sales created yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {sales.map((sale) => {
                  const now = new Date();
                  const start = new Date(sale.startTime);
                  const end = new Date(sale.endTime);
                  const isCurrentlyActive = sale.isActive && start <= now && end >= now;
                  const isUpcoming = start > now;

                  return (
                    <div
                      key={sale.id}
                      className="border rounded-xl p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-muted/10"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-sm md:text-base">{sale.title}</h3>
                          {isCurrentlyActive ? (
                            <span className="text-[10px] bg-green-100 text-green-800 dark:bg-green-950/20 dark:text-green-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider animate-pulse">
                              Active Now
                            </span>
                          ) : isUpcoming ? (
                            <span className="text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-950/20 dark:text-blue-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                              Upcoming
                            </span>
                          ) : (
                            <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                              Expired
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Discount: <span className="font-semibold text-amber-600">{sale.discountPercent}% Off</span>
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                          {start.toLocaleString("en-IN")} — {end.toLocaleString("en-IN")}
                        </p>
                      </div>

                      <div className="flex items-center justify-end sm:ml-auto">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteSaleMutation.mutate(sale.id)}
                          disabled={deleteSaleMutation.isPending}
                          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </AdminLayout>
  );
}
