import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, Star, MessageSquareQuote, Check, X, User } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Testimonial {
  id: number;
  name: string;
  role: string;
  reviewText: string;
  imageUrl: string | null;
  rating: number;
  isActive: boolean;
  createdAt: string;
}

export default function AdminTestimonials() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [role, setRole] = useState("Verified Buyer");
  const [reviewText, setReviewText] = useState("");
  const [rating, setRating] = useState(5);
  const [imageUrl, setImageUrl] = useState("");
  const [isActive, setIsActive] = useState(true);

  // Fetch all testimonials for admin
  const { data: testimonials = [], isLoading } = useQuery<Testimonial[]>({
    queryKey: ["admin-testimonials"],
    queryFn: async () => {
      const adminToken = localStorage.getItem("adminToken") || "shopluxadmin";
      const res = await fetch("/api/admin/testimonials", {
        headers: { "x-admin-token": adminToken },
      });
      if (!res.ok) throw new Error("Failed to fetch testimonials");
      return res.json();
    },
  });

  // Create testimonial mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const adminToken = localStorage.getItem("adminToken") || "shopluxadmin";
      const res = await fetch("/api/admin/testimonials", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": adminToken,
        },
        body: JSON.stringify({
          name,
          role,
          reviewText,
          rating,
          imageUrl: imageUrl || null,
          isActive,
        }),
      });

      if (!res.ok) throw new Error("Failed to create testimonial");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Testimonial added successfully!");
      setName("");
      setRole("Verified Buyer");
      setReviewText("");
      setRating(5);
      setImageUrl("");
      setIsActive(true);
      queryClient.invalidateQueries({ queryKey: ["admin-testimonials"] });
    },
    onError: () => {
      toast.error("Failed to add testimonial");
    },
  });

  // Toggle active status mutation
  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: number; active: boolean }) => {
      const adminToken = localStorage.getItem("adminToken") || "shopluxadmin";
      const res = await fetch(`/api/admin/testimonials/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": adminToken,
        },
        body: JSON.stringify({ isActive: active }),
      });
      if (!res.ok) throw new Error("Failed to update testimonial");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Testimonial status updated");
      queryClient.invalidateQueries({ queryKey: ["admin-testimonials"] });
    },
    onError: () => {
      toast.error("Failed to update testimonial");
    },
  });

  // Delete testimonial mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const adminToken = localStorage.getItem("adminToken") || "shopluxadmin";
      const res = await fetch(`/api/admin/testimonials/${id}`, {
        method: "DELETE",
        headers: { "x-admin-token": adminToken },
      });
      if (!res.ok) throw new Error("Failed to delete testimonial");
    },
    onSuccess: () => {
      toast.success("Testimonial deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-testimonials"] });
    },
    onError: () => {
      toast.error("Failed to delete testimonial");
    },
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !reviewText) {
      toast.error("Name and testimonial text are required");
      return;
    }
    createMutation.mutate();
  };

  return (
    <AdminLayout title="Testimonials Manager">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl">
        {/* Form Panel */}
        <div className="lg:col-span-1 space-y-6">
          <section className="bg-background border rounded-xl p-6 shadow-sm">
            <h2 className="font-semibold text-lg border-b pb-3 mb-5 flex items-center gap-2">
              <MessageSquareQuote className="w-5 h-5 text-primary" /> Add Testimonial
            </h2>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Customer Name *</label>
                <input
                  className="w-full border border-border px-3 py-2 rounded-md text-sm focus:outline-none focus:border-primary"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Aarav Mehta"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Role / Title</label>
                <input
                  className="w-full border border-border px-3 py-2 rounded-md text-sm focus:outline-none focus:border-primary"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="Verified Buyer, VIP Member, etc."
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Rating (Stars)</label>
                <select
                  className="w-full border border-border px-3 py-2 rounded-md text-sm focus:outline-none focus:border-primary"
                  value={rating}
                  onChange={(e) => setRating(Number(e.target.value))}
                >
                  <option value={5}>5 Stars</option>
                  <option value={4}>4 Stars</option>
                  <option value={3}>3 Stars</option>
                  <option value={2}>2 Stars</option>
                  <option value={1}>1 Star</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Avatar Image URL (Optional)</label>
                <input
                  className="w-full border border-border px-3 py-2 rounded-md text-sm focus:outline-none focus:border-primary"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/... (or blank)"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Testimonial Text *</label>
                <textarea
                  className="w-full border border-border px-3 py-2 rounded-md text-sm focus:outline-none focus:border-primary resize-none"
                  rows={4}
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="Amazing shopping experience! Fast shipping and highly authentic products."
                  required
                />
              </div>

              <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer accent-primary"
                />
                Show on Storefront Homepage
              </label>

              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="w-full rounded-none tracking-wide font-medium mt-2"
              >
                {createMutation.isPending ? "Adding..." : "Add Testimonial"}
              </Button>
            </form>
          </section>
        </div>

        {/* List Panel */}
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-background border rounded-xl p-6 shadow-sm">
            <h2 className="font-semibold text-lg border-b pb-3 mb-5">All Testimonials</h2>
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : testimonials.length === 0 ? (
              <div className="text-center py-12 bg-muted/10 rounded-xl border border-dashed">
                <MessageSquareQuote className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No testimonials found.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {testimonials.map((test) => (
                  <div
                    key={test.id}
                    className="border rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-muted/10 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex gap-4 items-start min-w-0">
                      {test.imageUrl ? (
                        <img
                          src={test.imageUrl}
                          alt={test.name}
                          className="w-12 h-12 rounded-full object-cover flex-shrink-0 bg-muted"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                          <User className="w-6 h-6" />
                        </div>
                      )}
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-sm md:text-base truncate">{test.name}</h3>
                          <span className="text-[10px] text-muted-foreground bg-white px-2 py-0.5 border rounded-full font-medium">
                            {test.role}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3 h-3 ${
                                i < test.rating ? "text-amber-500 fill-amber-500" : "text-border"
                              }`}
                            />
                          ))}
                        </div>
                        <p className="text-xs md:text-sm text-muted-foreground font-medium leading-relaxed italic">
                          "{test.reviewText}"
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 md:ml-auto w-full md:w-auto justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          toggleMutation.mutate({ id: test.id, active: !test.isActive })
                        }
                        disabled={toggleMutation.isPending}
                        className={`text-xs h-8 ${
                          test.isActive
                            ? "border-green-200 bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800"
                            : "border-border text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {test.isActive ? (
                          <span className="flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Active
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <X className="w-3.5 h-3.5" /> Inactive
                          </span>
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(test.id)}
                        disabled={deleteMutation.isPending}
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </AdminLayout>
  );
}
