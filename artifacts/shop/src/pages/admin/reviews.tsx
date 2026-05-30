import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, Star, MessageSquare, Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { useListProducts } from "@workspace/api-client-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface Review {
  id: number;
  productId: number;
  productName: string | null;
  userId: string;
  customerName: string;
  rating: number;
  reviewText: string;
  createdAt: string;
}

export default function AdminReviews() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({
    productId: "",
    customerName: "",
    rating: 5,
    reviewText: "",
    createdAt: new Date().toISOString().split("T")[0],
  });

  // Fetch all products for selection dropdown
  const { data: productsData } = useListProducts({ limit: 200 });
  const products = productsData?.products ?? [];

  // Fetch all reviews for moderation
  const { data: reviews = [], isLoading } = useQuery<Review[]>({
    queryKey: ["admin-reviews"],
    queryFn: async () => {
      const adminToken = localStorage.getItem("adminToken") || "shopluxadmin";
      const res = await fetch("/api/admin/reviews", {
        headers: { "x-admin-token": adminToken },
      });
      if (!res.ok) throw new Error("Failed to fetch reviews");
      return res.json();
    },
  });

  // Create manual/fake review mutation
  const createReviewMutation = useMutation({
    mutationFn: async (data: {
      productId: number;
      customerName: string;
      rating: number;
      reviewText: string;
      createdAt?: string;
    }) => {
      const adminToken = localStorage.getItem("adminToken") || "shopluxadmin";
      const res = await fetch("/api/admin/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": adminToken,
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData?.error || "Failed to create review");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Manual review created successfully!");
      setIsOpen(false);
      setForm({
        productId: "",
        customerName: "",
        rating: 5,
        reviewText: "",
        createdAt: new Date().toISOString().split("T")[0],
      });
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create review");
    },
  });

  // Delete review mutation
  const deleteReviewMutation = useMutation({
    mutationFn: async (id: number) => {
      const adminToken = localStorage.getItem("adminToken") || "shopluxadmin";
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: "DELETE",
        headers: { "x-admin-token": adminToken },
      });
      if (!res.ok) throw new Error("Failed to delete review");
    },
    onSuccess: () => {
      toast.success("Review deleted and product rating updated successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
    },
    onError: () => {
      toast.error("Failed to delete review");
    },
  });

  // Render star ratings
  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`w-3.5 h-3.5 ${
              i < rating ? "text-amber-500 fill-amber-500" : "text-border"
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <AdminLayout title="Reviews Moderator">
      <div className="space-y-6 max-w-6xl">
        <section className="bg-background border rounded-xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4 mb-6">
            <div>
              <h2 className="font-semibold text-lg">Product Reviews & Ratings</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Moderate, delete, or inject manual product reviews for all products.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button size="sm" onClick={() => setIsOpen(true)}>
                <Plus className="w-4 h-4 mr-1" /> Add Manual Review
              </Button>
              <span className="text-xs font-semibold px-2.5 py-1 bg-primary/10 text-primary rounded-full">
                {reviews.length} Total Reviews
              </span>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-16 bg-muted/10 rounded-xl border border-dashed">
              <MessageSquare className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No customer reviews found.</p>
            </div>
          ) : (
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-muted border-b text-muted-foreground uppercase font-bold tracking-wider text-[10px]">
                      <th className="px-4 py-3 w-1/4">Product</th>
                      <th className="px-4 py-3 w-40">Customer</th>
                      <th className="px-4 py-3 w-28">Rating</th>
                      <th className="px-4 py-3">Review Comment</th>
                      <th className="px-4 py-3 w-16 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {reviews.map((rev) => (
                      <tr key={rev.id} className="hover:bg-muted/10 transition-colors">
                        <td className="px-4 py-4">
                          <p className="font-semibold text-foreground text-sm line-clamp-2">
                            {rev.productName || `Product #${rev.productId}`}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-semibold text-foreground">{rev.customerName}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(rev.createdAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </p>
                        </td>
                        <td className="px-4 py-4">{renderStars(rev.rating)}</td>
                        <td className="px-4 py-4 text-sm text-muted-foreground font-medium leading-relaxed">
                          {rev.reviewText}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteReviewMutation.mutate(rev.id)}
                            disabled={deleteReviewMutation.isPending}
                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Manual Review</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Select Product *</label>
              <select
                className="w-full border border-border px-3 py-2 rounded-md text-sm focus:outline-none focus:border-primary"
                value={form.productId}
                onChange={(e) => setForm((f) => ({ ...f, productId: e.target.value }))}
              >
                <option value="">-- Select Product --</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Customer Name (Fake) *</label>
              <input
                className="w-full border border-border px-3 py-2 rounded-md text-sm focus:outline-none focus:border-primary"
                value={form.customerName}
                onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))}
                placeholder="e.g. Jane Doe"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Star Rating *</label>
              <select
                className="w-full border border-border px-3 py-2 rounded-md text-sm focus:outline-none focus:border-primary"
                value={form.rating}
                onChange={(e) => setForm((f) => ({ ...f, rating: Number(e.target.value) }))}
              >
                <option value={5}>5 Stars (Excellent)</option>
                <option value={4}>4 Stars (Very Good)</option>
                <option value={3}>3 Stars (Average)</option>
                <option value={2}>2 Stars (Below Average)</option>
                <option value={1}>1 Star (Poor)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Review Date *</label>
              <input
                type="date"
                className="w-full border border-border px-3 py-2 rounded-md text-sm focus:outline-none focus:border-primary"
                value={form.createdAt}
                onChange={(e) => setForm((f) => ({ ...f, createdAt: e.target.value }))}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Review Text *</label>
              <textarea
                className="w-full border border-border px-3 py-2 rounded-md text-sm focus:outline-none focus:border-primary min-h-[100px] resize-none"
                value={form.reviewText}
                onChange={(e) => setForm((f) => ({ ...f, reviewText: e.target.value }))}
                placeholder="Write a beautiful, detailed product review..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)} disabled={createReviewMutation.isPending}>
              Cancel
            </Button>
            <Button
              disabled={
                createReviewMutation.isPending ||
                !form.productId ||
                !form.customerName.trim() ||
                !form.reviewText.trim()
              }
              onClick={() =>
                createReviewMutation.mutate({
                  productId: Number(form.productId),
                  customerName: form.customerName,
                  rating: form.rating,
                  reviewText: form.reviewText,
                  createdAt: form.createdAt,
                })
              }
            >
              {createReviewMutation.isPending ? "Creating..." : "Add Review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
