import {
  useListCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  type CategoryInput,
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
import { Pencil, Trash2, Plus } from "lucide-react";

interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  image?: string | null;
  productCount?: number;
}

function CategoryForm({
  initial,
  onSave,
  onCancel,
  isLoading,
}: {
  initial?: Partial<Category>;
  onSave: (data: CategoryInput) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    slug: initial?.slug ?? "",
    description: initial?.description ?? "",
    image: initial?.image ?? "",
  });

  const handleNameChange = (name: string) => {
    setForm((f) => ({
      ...f,
      name,
      slug: f.slug || name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
    }));
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium">Category Name *</label>
          <input
            className="w-full border border-border px-3 py-2 rounded-md text-sm focus:outline-none focus:border-primary"
            value={form.name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="e.g. Electronics"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Slug</label>
          <input
            className="w-full border border-border px-3 py-2 rounded-md text-sm focus:outline-none focus:border-primary"
            value={form.slug}
            onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
            placeholder="e.g. electronics"
          />
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium">Description</label>
        <textarea
          className="w-full border border-border px-3 py-2 rounded-md text-sm focus:outline-none focus:border-primary resize-none"
          rows={2}
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          placeholder="Short description"
        />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium">Image</label>
        <div className="flex flex-col gap-2">
          <input
            type="file"
            accept="image/*"
            className="w-full border border-border px-3 py-2 rounded-md text-sm focus:outline-none focus:border-primary file:mr-4 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
            onChange={async (e) => {
              if (e.target.files && e.target.files.length > 0) {
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
                    setForm((f) => ({ ...f, image: data.url }));
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
            value={form.image}
            onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))}
            placeholder="Or enter URL manually"
          />
        </div>
        {form.image && (
          <img src={form.image} alt="" className="mt-2 h-16 w-24 object-cover rounded border" />
        )}
      </div>
      <DialogFooter className="mt-4">
        <Button variant="outline" onClick={onCancel} disabled={isLoading}>Cancel</Button>
        <Button
          onClick={() => onSave(form)}
          disabled={isLoading || !form.name}
        >
          {isLoading ? "Saving..." : "Save Category"}
        </Button>
      </DialogFooter>
    </div>
  );
}

export default function AdminCategories() {
  const { data: categories, isLoading, refetch } = useListCategories();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const [dialog, setDialog] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const handleSave = (data: CategoryInput) => {
    if (dialog === "edit" && editing) {
      updateCategory.mutate(
        { id: editing.id, data },
        {
          onSuccess: () => { toast.success("Category updated"); setDialog(null); refetch(); },
          onError: () => toast.error("Failed to update"),
        },
      );
    } else {
      createCategory.mutate(
        { data: { ...data, slug: data.slug || data.name.toLowerCase().replace(/\s+/g, "-") } },
        {
          onSuccess: () => { toast.success("Category created"); setDialog(null); refetch(); },
          onError: () => toast.error("Failed to create"),
        },
      );
    }
  };

  const handleDelete = (id: number) => {
    deleteCategory.mutate(
      { id },
      {
        onSuccess: () => { toast.success("Category deleted"); setDeleteId(null); refetch(); },
        onError: () => toast.error("Cannot delete — category may have products"),
      },
    );
  };

  const isPending = createCategory.isPending || updateCategory.isPending;

  return (
    <AdminLayout title="Categories">
      <div className="flex justify-between items-center mb-6">
        <p className="text-sm text-muted-foreground">{categories?.length ?? 0} categories</p>
        <Button onClick={() => { setEditing(null); setDialog("create"); }} size="sm">
          <Plus className="w-4 h-4 mr-1" /> Add Category
        </Button>
      </div>

      <div className="bg-background border rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-muted-foreground text-left">
            <tr>
              <th className="px-6 py-3 font-medium">Category</th>
              <th className="px-6 py-3 font-medium">Slug</th>
              <th className="px-6 py-3 font-medium">Products</th>
              <th className="px-6 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 4 }).map((__, j) => (
                      <td key={j} className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
                    ))}
                  </tr>
                ))
              : Array.isArray(categories) && categories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {cat.image && (
                          <img src={cat.image} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                        )}
                        <div>
                          <p className="font-medium">{cat.name}</p>
                          {cat.description && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{cat.description}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground font-mono text-xs">{cat.slug}</td>
                    <td className="px-6 py-4">{cat.productCount ?? 0}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => { setEditing(cat as Category); setDialog("edit"); }}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteId(cat.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
        {!isLoading && !categories?.length && (
          <div className="text-center py-16 text-muted-foreground">No categories yet.</div>
        )}
      </div>

      <Dialog open={dialog !== null} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{dialog === "edit" ? "Edit Category" : "Add Category"}</DialogTitle>
          </DialogHeader>
          <CategoryForm
            initial={editing ?? undefined}
            onSave={handleSave}
            onCancel={() => setDialog(null)}
            isLoading={isPending}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Are you sure you want to delete this category? This cannot be undone.</p>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteId && handleDelete(deleteId)}
              disabled={deleteCategory.isPending}
            >
              {deleteCategory.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
