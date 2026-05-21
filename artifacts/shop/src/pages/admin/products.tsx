import {
  useListProducts,
  useListCategories,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  type ProductInput,
  customFetch,
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
import { Pencil, Trash2, Plus, Search, ChevronLeft, ChevronRight } from "lucide-react";

interface Product {
  id: number;
  name: string;
  slug?: string | null;
  description?: string | null;
  price: number;
  comparePrice?: number | null;
  discount?: number | null;
  stock: number;
  categoryId?: number | null;
  images: string[];
  variants?: string | null;
  tags?: string[] | null;
  isFeatured?: boolean | null;
  isTrending?: boolean | null;
  isNewArrival?: boolean | null;
  isBestSeller?: boolean | null;
  deliveryCharge?: number | null;
  isDeliveryChargeApplicable?: boolean | null;
}

interface Category { id: number; name: string; slug: string; }

function ProductForm({
  initial,
  categories,
  onSave,
  onCancel,
  isLoading,
}: {
  initial?: Partial<Product>;
  categories: Category[];
  onSave: (data: ProductInput) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    slug: initial?.slug ?? "",
    description: initial?.description ?? "",
    price: initial?.price ?? 0,
    comparePrice: initial?.comparePrice ?? "",
    discount: initial?.discount ?? "",
    stock: initial?.stock ?? 0,
    categoryId: initial?.categoryId ?? "",
    images: (initial?.images ?? []).join("\n"),
    variants: initial?.variants ?? "",
    tags: (initial?.tags ?? []).join(", "),
    isFeatured: initial?.isFeatured ?? false,
    isTrending: initial?.isTrending ?? false,
    isNewArrival: initial?.isNewArrival ?? false,
    isBestSeller: initial?.isBestSeller ?? false,
    deliveryCharge: initial?.deliveryCharge ?? 0,
    isDeliveryChargeApplicable: initial?.isDeliveryChargeApplicable ?? false,
  });

  const handleNameChange = (name: string) => {
    setForm((f) => ({
      ...f,
      name,
      slug: f.slug || name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
    }));
  };

  const imageList = form.images.split("\n").map((s) => s.trim()).filter(Boolean);

  return (
    <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 space-y-1">
          <label className="text-sm font-medium">Product Name *</label>
          <input
            className="w-full border border-border px-3 py-2 rounded-md text-sm focus:outline-none focus:border-primary"
            value={form.name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="e.g. Sony WH-1000XM5 Headphones"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Slug</label>
          <input
            className="w-full border border-border px-3 py-2 rounded-md text-sm focus:outline-none focus:border-primary"
            value={form.slug}
            onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
            placeholder="auto-generated"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Category</label>
          <select
            className="w-full border border-border px-3 py-2 rounded-md text-sm focus:outline-none focus:border-primary"
            value={form.categoryId}
            onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value ? Number(e.target.value) : "" }))}
          >
            <option value="">No Category</option>
            {Array.isArray(categories) && categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Description</label>
        <textarea
          className="w-full border border-border px-3 py-2 rounded-md text-sm focus:outline-none focus:border-primary resize-none"
          rows={3}
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          placeholder="Detailed product description..."
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium">Price (₹) *</label>
          <input
            type="number"
            className="w-full border border-border px-3 py-2 rounded-md text-sm focus:outline-none focus:border-primary"
            value={form.price}
            onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))}
            min={0}
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Compare Price (₹)</label>
          <input
            type="number"
            className="w-full border border-border px-3 py-2 rounded-md text-sm focus:outline-none focus:border-primary"
            value={form.comparePrice}
            onChange={(e) => setForm((f) => ({ ...f, comparePrice: e.target.value }))}
            placeholder="MRP"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Stock *</label>
          <input
            type="number"
            className="w-full border border-border px-3 py-2 rounded-md text-sm focus:outline-none focus:border-primary"
            value={form.stock}
            onChange={(e) => setForm((f) => ({ ...f, stock: Number(e.target.value) }))}
            min={0}
          />
        </div>
      </div>

      {/* Delivery Charges configuration */}
      <div className="bg-muted/30 border rounded-lg p-4 space-y-4">
        <label className="flex items-center gap-2 text-sm font-medium select-none cursor-pointer">
          <input
            type="checkbox"
            checked={form.isDeliveryChargeApplicable}
            onChange={(e) => setForm((f) => ({ ...f, isDeliveryChargeApplicable: e.target.checked }))}
            className="rounded text-primary focus:ring-primary"
          />
          <span>Apply per-product delivery charge</span>
        </label>
        {form.isDeliveryChargeApplicable && (
          <div className="space-y-1">
            <label className="text-sm font-medium">Delivery Charge (₹)</label>
            <input
              type="number"
              className="w-full border border-border px-3 py-2 rounded-md text-sm focus:outline-none focus:border-primary"
              value={form.deliveryCharge}
              onChange={(e) => setForm((f) => ({ ...f, deliveryCharge: Number(e.target.value) }))}
              min={0}
              placeholder="e.g. 50"
            />
          </div>
        )}
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Images</label>
        <div className="flex flex-col gap-2">
          <input
            type="file"
            accept="image/*"
            multiple
            className="w-full border border-border px-3 py-2 rounded-md text-sm focus:outline-none focus:border-primary file:mr-4 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
            onChange={async (e) => {
              if (e.target.files && e.target.files.length > 0) {
                const newUrls: string[] = [];
                for (let i = 0; i < e.target.files.length; i++) {
                  const file = e.target.files[i];
                  const formData = new FormData();
                  formData.append("image", file);
                  try {
                    const data = await customFetch<{ url: string }>("/api/admin/upload", {
                      method: "POST",
                      body: formData,
                    });
                    newUrls.push(data.url);
                  } catch (err: any) {
                    toast.error(err?.message || "Error uploading image");
                  }
                }
                
                if (newUrls.length > 0) {
                  setForm((f) => {
                    const existing = f.images.trim();
                    const appended = newUrls.join("\n");
                    return { ...f, images: existing ? existing + "\n" + appended : appended };
                  });
                }
              }
            }}
          />
          <textarea
            className="w-full border border-border px-3 py-2 rounded-md text-sm focus:outline-none focus:border-primary resize-none font-mono"
            rows={3}
            value={form.images}
            onChange={(e) => setForm((f) => ({ ...f, images: e.target.value }))}
            placeholder={"Or enter URLs manually (one per line)"}
          />
        </div>
        {imageList.length > 0 && (
          <div className="flex gap-4 mt-4 flex-wrap">
            {imageList.map((url, i) => (
              <div key={i} className="relative group border rounded-lg p-2 bg-muted/30 flex flex-col items-center">
                <img src={url} alt="" className="h-24 w-24 object-cover rounded" />
                <div className="flex items-center gap-1 mt-3">
                  <button
                    type="button"
                    disabled={i === 0}
                    onClick={() => {
                      const newImages = [...imageList];
                      [newImages[i - 1], newImages[i]] = [newImages[i], newImages[i - 1]];
                      setForm(f => ({ ...f, images: newImages.join("\n") }));
                    }}
                    className="p-1 rounded bg-background shadow-sm disabled:opacity-30 hover:bg-muted"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={i === imageList.length - 1}
                    onClick={() => {
                      const newImages = [...imageList];
                      [newImages[i], newImages[i + 1]] = [newImages[i + 1], newImages[i]];
                      setForm(f => ({ ...f, images: newImages.join("\n") }));
                    }}
                    className="p-1 rounded bg-background shadow-sm disabled:opacity-30 hover:bg-muted"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const newImages = imageList.filter((_, idx) => idx !== i);
                      setForm(f => ({ ...f, images: newImages.join("\n") }));
                    }}
                    className="p-1.5 rounded bg-destructive/10 text-destructive shadow-sm hover:bg-destructive hover:text-destructive-foreground ml-3"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium">Variants</label>
          <input
            className="w-full border border-border px-3 py-2 rounded-md text-sm focus:outline-none focus:border-primary"
            value={form.variants}
            onChange={(e) => setForm((f) => ({ ...f, variants: e.target.value }))}
            placeholder="S, M, L, XL (comma separated)"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Tags</label>
          <input
            className="w-full border border-border px-3 py-2 rounded-md text-sm focus:outline-none focus:border-primary"
            value={form.tags}
            onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
            placeholder="electronics, wireless (comma separated)"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(["isFeatured", "isTrending", "isNewArrival", "isBestSeller"] as const).map((key) => (
          <label key={key} className="flex items-center gap-2 text-sm cursor-pointer select-none border rounded-md px-3 py-2 hover:bg-muted">
            <input
              type="checkbox"
              checked={form[key] as boolean}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.checked }))}
              className="rounded"
            />
            <span className="capitalize">{key.replace("is", "")}</span>
          </label>
        ))}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel} disabled={isLoading}>Cancel</Button>
        <Button
          onClick={() => onSave({
            name: form.name,
            slug: form.slug || undefined,
            description: form.description || undefined,
            price: Number(form.price),
            comparePrice: form.comparePrice ? Number(form.comparePrice) : undefined,
            stock: Number(form.stock),
            categoryId: form.categoryId ? Number(form.categoryId) : undefined,
            images: imageList,
            variants: form.variants || undefined,
            tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
            isFeatured: form.isFeatured,
            isTrending: form.isTrending,
            isNewArrival: form.isNewArrival,
            isBestSeller: form.isBestSeller,
            deliveryCharge: form.isDeliveryChargeApplicable ? Number(form.deliveryCharge) : 0,
            isDeliveryChargeApplicable: form.isDeliveryChargeApplicable,
          })}
          disabled={isLoading || !form.name || !form.price}
        >
          {isLoading ? "Saving..." : "Save Product"}
        </Button>
      </DialogFooter>
    </div>
  );
}

export default function AdminProducts() {
  const [search, setSearch] = useState("");
  const { data: productsData, isLoading, refetch } = useListProducts({ limit: 200, search: search || undefined });
  const { data: categories } = useListCategories();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const [dialog, setDialog] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<Product | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const handleSave = (data: ProductInput) => {
    if (dialog === "edit" && editing) {
      updateProduct.mutate(
        { id: editing.id, data },
        {
          onSuccess: () => { toast.success("Product updated"); setDialog(null); refetch(); },
          onError: (err: any) => toast.error(err?.data?.error || err?.message || "Failed to update product"),
        },
      );
    } else {
      createProduct.mutate(
        { data: data as ProductInput },
        {
          onSuccess: () => { toast.success("Product created"); setDialog(null); refetch(); },
          onError: (err: any) => toast.error(err?.data?.error || err?.message || "Failed to create product"),
        },
      );
    }
  };

  const handleDelete = (id: number) => {
    deleteProduct.mutate(
      { id },
      {
        onSuccess: () => { toast.success("Product deleted"); setDeleteId(null); refetch(); },
        onError: () => toast.error("Failed to delete"),
      },
    );
  };

  const isPending = createProduct.isPending || updateProduct.isPending;
  const cats = (categories as Category[] | undefined) ?? [];

  return (
    <AdminLayout title="Products">
      <div className="flex flex-col sm:flex-row gap-3 mb-6 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            className="w-full border border-border pl-9 pr-3 py-2 rounded-md text-sm focus:outline-none focus:border-primary"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button onClick={() => { setEditing(null); setDialog("create"); }} size="sm">
          <Plus className="w-4 h-4 mr-1" /> Add Product
        </Button>
      </div>

      <div className="bg-background border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-muted-foreground text-left">
              <tr>
                <th className="px-6 py-3 font-medium">Product</th>
                <th className="px-6 py-3 font-medium">Price</th>
                <th className="px-6 py-3 font-medium">Stock</th>
                <th className="px-6 py-3 font-medium">Category</th>
                <th className="px-6 py-3 font-medium">Flags</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 6 }).map((__, j) => (
                        <td key={j} className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
                      ))}
                    </tr>
                  ))
                : productsData?.products.map((product) => (
                    <tr key={product.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                            {product.images[0] && (
                              <img src={product.images[0]} alt="" className="w-full h-full object-cover" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium line-clamp-1 max-w-[180px]">{product.name}</p>
                            {product.discount && product.discount > 0 && (
                              <p className="text-xs text-destructive">{product.discount}% off</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold">₹{product.price.toLocaleString("en-IN")}</p>
                        {product.comparePrice && product.comparePrice > product.price && (
                          <p className="text-xs text-muted-foreground line-through">₹{product.comparePrice.toLocaleString("en-IN")}</p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`font-medium ${product.stock < 10 ? "text-destructive" : product.stock === 0 ? "text-muted-foreground" : ""}`}>
                          {product.stock === 0 ? "Out of stock" : product.stock}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{product.categoryName ?? "—"}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-1 flex-wrap">
                          {product.isFeatured && <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">Featured</span>}
                          {product.isTrending && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Trending</span>}
                          {product.isNewArrival && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded">New</span>}
                          {product.isBestSeller && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Best</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => { setEditing(product as unknown as Product); setDialog("edit"); }}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleteId(product.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
          {!isLoading && productsData?.products.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">No products found.</div>
          )}
        </div>
      </div>

      <Dialog open={dialog !== null} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{dialog === "edit" ? "Edit Product" : "Add Product"}</DialogTitle>
          </DialogHeader>
          <ProductForm
            initial={editing ?? undefined}
            categories={cats}
            onSave={handleSave}
            onCancel={() => setDialog(null)}
            isLoading={isPending}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Product</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This will permanently delete the product and cannot be undone.</p>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId && handleDelete(deleteId)} disabled={deleteProduct.isPending}>
              {deleteProduct.isPending ? "Deleting..." : "Delete Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
