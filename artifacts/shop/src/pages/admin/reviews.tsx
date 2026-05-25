import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, Star, MessageSquare } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

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
          <div className="flex justify-between items-center border-b pb-4 mb-6">
            <div>
              <h2 className="font-semibold text-lg">Product Reviews & Ratings</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Moderate and delete customer-submitted reviews for all products.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-primary/10 text-primary rounded-full">
              {reviews.length} Total Reviews
            </span>
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
    </AdminLayout>
  );
}
