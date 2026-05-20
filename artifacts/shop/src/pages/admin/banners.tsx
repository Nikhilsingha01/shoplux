import {
  useListBanners,
  useCreateBanner,
  useUpdateBanner,
  useDeleteBanner,
  type BannerInput,
} from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AdminLayout } from "@/components/layout/AdminLayout";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, GripVertical } from "lucide-react";

interface Banner {
  id: number;
  title: string;
  subtitle?: string | null;
  imageUrl: string;
  linkUrl?: string | null;
  isActive: boolean;
  sortOrder?: number | null;
}

function BannerForm({
  initial,
  onSave,
  onCancel,
  isLoading,
}: {
  initial?: Partial<Banner>;
  onSave: (data: BannerInput) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [form, setForm] = useState({
    title: initial?.title ?? "",
    subtitle: initial?.subtitle ?? "",
    imageUrl: initial?.imageUrl ?? "",
    linkUrl: initial?.linkUrl ?? "",
    isActive: initial?.isActive ?? true,
    sortOrder: initial?.sortOrder ?? 1,
  });

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <label className="text-sm font-medium">Title *</label>
        <input
          className="w-full border border-border px-3 py-2 rounded-md text-sm focus:outline-none focus:border-primary"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          placeholder="e.g. Summer Sale"
        />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium">Subtitle</label>
        <input
          className="w-full border border-border px-3 py-2 rounded-md text-sm focus:outline-none focus:border-primary"
          value={form.subtitle}
          onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
          placeholder="e.g. Up to 50% off on all products"
        />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium">Image *</label>
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
                  const res = await fetch("/api/admin/upload", {
                    method: "POST",
                    headers: {
                      "x-admin-token": localStorage.getItem("adminToken") || "",
                    },
                    body: formData,
                  });
                  if (res.ok) {
                    const data = await res.json();
                    setForm((f) => ({ ...f, imageUrl: data.url }));
                  } else {
                    toast.error("Failed to upload image");
                  }
                } catch (err) {
                  toast.error("Error uploading image");
                }
              }
            }}
          />
          <input
            className="w-full border border-border px-3 py-2 rounded-md text-sm focus:outline-none focus:border-primary"
            value={form.imageUrl}
            onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
            placeholder="Or enter URL directly (e.g. https://...)"
          />
        </div>
        {form.imageUrl && (
          <img src={form.imageUrl} alt="" className="mt-2 h-24 w-full object-cover rounded border" />
        )}
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium">Link URL</label>
        <input
          className="w-full border border-border px-3 py-2 rounded-md text-sm focus:outline-none focus:border-primary"
          value={form.linkUrl}
          onChange={(e) => setForm((f) => ({ ...f, linkUrl: e.target.value }))}
          placeholder="/products?category=fashion"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium">Sort Order</label>
          <input
            type="number"
            className="w-full border border-border px-3 py-2 rounded-md text-sm focus:outline-none focus:border-primary"
            value={form.sortOrder}
            onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))}
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Status</label>
          <select
            className="w-full border border-border px-3 py-2 rounded-md text-sm focus:outline-none focus:border-primary"
            value={form.isActive ? "active" : "inactive"}
            onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.value === "active" }))}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>
      <DialogFooter className="mt-4">
        <Button variant="outline" onClick={onCancel} disabled={isLoading}>Cancel</Button>
        <Button onClick={() => onSave(form)} disabled={isLoading || !form.title || !form.imageUrl}>
          {isLoading ? "Saving..." : "Save Banner"}
        </Button>
      </DialogFooter>
    </div>
  );
}

export default function AdminBanners() {
  const { data: banners, isLoading, refetch } = useListBanners();
  const createBanner = useCreateBanner();
  const updateBanner = useUpdateBanner();
  const deleteBanner = useDeleteBanner();

  const [dialog, setDialog] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const handleSave = (data: BannerInput) => {
    if (dialog === "edit" && editing) {
      updateBanner.mutate(
        { id: editing.id, data },
        {
          onSuccess: () => { toast.success("Banner updated"); setDialog(null); refetch(); },
          onError: () => toast.error("Failed to update"),
        },
      );
    } else {
      createBanner.mutate(
        { data: data as BannerInput },
        {
          onSuccess: () => { toast.success("Banner created"); setDialog(null); refetch(); },
          onError: () => toast.error("Failed to create"),
        },
      );
    }
  };

  const handleDelete = (id: number) => {
    deleteBanner.mutate(
      { id },
      {
        onSuccess: () => { toast.success("Banner deleted"); setDeleteId(null); refetch(); },
        onError: () => toast.error("Failed to delete"),
      },
    );
  };

  const isPending = createBanner.isPending || updateBanner.isPending;

  return (
    <AdminLayout title="Banners">
      <div className="flex justify-between items-center mb-6">
        <p className="text-sm text-muted-foreground">{banners?.length ?? 0} banners</p>
        <Button onClick={() => { setEditing(null); setDialog("create"); }} size="sm">
          <Plus className="w-4 h-4 mr-1" /> Add Banner
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)
          : banners?.map((banner) => (
              <div key={banner.id} className="bg-background border rounded-xl overflow-hidden shadow-sm flex">
                <div className="w-48 md:w-64 flex-shrink-0 relative">
                  <img src={banner.imageUrl} alt={banner.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/20" />
                </div>
                <div className="flex-1 p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-base">{banner.title}</h3>
                        {banner.subtitle && <p className="text-sm text-muted-foreground mt-0.5">{banner.subtitle}</p>}
                        {banner.linkUrl && <p className="text-xs text-primary mt-1">{banner.linkUrl}</p>}
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ${banner.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
                        {banner.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">Sort order: {banner.sortOrder ?? 1}</p>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setEditing(banner as Banner); setDialog("edit"); }}
                    >
                      <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
                      onClick={() => setDeleteId(banner.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
        {!isLoading && !banners?.length && (
          <div className="text-center py-16 text-muted-foreground border rounded-xl">No banners yet.</div>
        )}
      </div>

      <Dialog open={dialog !== null} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dialog === "edit" ? "Edit Banner" : "Add Banner"}</DialogTitle>
          </DialogHeader>
          <BannerForm
            initial={editing ?? undefined}
            onSave={(data) => handleSave(data)}
            onCancel={() => setDialog(null)}
            isLoading={isPending}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Banner</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This will permanently delete the banner from the homepage.</p>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId && handleDelete(deleteId)} disabled={deleteBanner.isPending}>
              {deleteBanner.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
