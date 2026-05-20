import {
  useListCoupons,
  useCreateCoupon,
  useUpdateCoupon,
  useDeleteCoupon,
  type CouponInput,
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
import { Pencil, Trash2, Plus, Copy } from "lucide-react";

interface Coupon {
  id: number;
  code: string;
  description?: string | null;
  discountType: string;
  discountValue: number;
  minOrderAmount?: number | null;
  maxDiscount?: number | null;
  usageLimit?: number | null;
  usedCount: number;
  isActive: boolean;
  expiresAt?: string | null;
}

function CouponForm({
  initial,
  onSave,
  onCancel,
  isLoading,
}: {
  initial?: Partial<Coupon>;
  onSave: (data: CouponInput) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [form, setForm] = useState({
    code: initial?.code ?? "",
    description: initial?.description ?? "",
    discountType: initial?.discountType ?? "percent",
    discountValue: initial?.discountValue ?? 10,
    minOrderAmount: initial?.minOrderAmount ?? "",
    maxDiscount: initial?.maxDiscount ?? "",
    usageLimit: initial?.usageLimit ?? "",
    isActive: initial?.isActive ?? true,
    expiresAt: initial?.expiresAt ? initial.expiresAt.split("T")[0] : "",
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium">Coupon Code *</label>
          <input
            className="w-full border border-border px-3 py-2 rounded-md text-sm focus:outline-none focus:border-primary uppercase"
            value={form.code}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
            placeholder="SAVE20"
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
      <div className="space-y-1">
        <label className="text-sm font-medium">Description</label>
        <input
          className="w-full border border-border px-3 py-2 rounded-md text-sm focus:outline-none focus:border-primary"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          placeholder="e.g. 20% off on orders above ₹2000"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium">Discount Type *</label>
          <select
            className="w-full border border-border px-3 py-2 rounded-md text-sm focus:outline-none focus:border-primary"
            value={form.discountType}
            onChange={(e) => setForm((f) => ({ ...f, discountType: e.target.value }))}
          >
            <option value="percent">Percentage (%)</option>
            <option value="fixed">Fixed Amount (₹)</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">
            Discount Value * {form.discountType === "percent" ? "(%)" : "(₹)"}
          </label>
          <input
            type="number"
            className="w-full border border-border px-3 py-2 rounded-md text-sm focus:outline-none focus:border-primary"
            value={form.discountValue}
            onChange={(e) => setForm((f) => ({ ...f, discountValue: Number(e.target.value) }))}
            min={0}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium">Min Order Amount (₹)</label>
          <input
            type="number"
            className="w-full border border-border px-3 py-2 rounded-md text-sm focus:outline-none focus:border-primary"
            value={form.minOrderAmount}
            onChange={(e) => setForm((f) => ({ ...f, minOrderAmount: e.target.value }))}
            placeholder="Leave blank for no min"
          />
        </div>
        {form.discountType === "percent" && (
          <div className="space-y-1">
            <label className="text-sm font-medium">Max Discount (₹)</label>
            <input
              type="number"
              className="w-full border border-border px-3 py-2 rounded-md text-sm focus:outline-none focus:border-primary"
              value={form.maxDiscount}
              onChange={(e) => setForm((f) => ({ ...f, maxDiscount: e.target.value }))}
              placeholder="Cap on discount"
            />
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium">Usage Limit</label>
          <input
            type="number"
            className="w-full border border-border px-3 py-2 rounded-md text-sm focus:outline-none focus:border-primary"
            value={form.usageLimit}
            onChange={(e) => setForm((f) => ({ ...f, usageLimit: e.target.value }))}
            placeholder="Blank for unlimited"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Expires On</label>
          <input
            type="date"
            className="w-full border border-border px-3 py-2 rounded-md text-sm focus:outline-none focus:border-primary"
            value={form.expiresAt}
            onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
          />
        </div>
      </div>
      <DialogFooter className="mt-4">
        <Button variant="outline" onClick={onCancel} disabled={isLoading}>Cancel</Button>
        <Button
          onClick={() => onSave({
            ...form,
            discountValue: Number(form.discountValue),
            minOrderAmount: form.minOrderAmount ? Number(form.minOrderAmount) : undefined,
            maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : undefined,
            usageLimit: form.usageLimit ? Number(form.usageLimit) : undefined,
            expiresAt: form.expiresAt || undefined,
          })}
          disabled={isLoading || !form.code || !form.discountValue}
        >
          {isLoading ? "Saving..." : "Save Coupon"}
        </Button>
      </DialogFooter>
    </div>
  );
}

export default function AdminCoupons() {
  const { data: coupons, isLoading, refetch } = useListCoupons();
  const createCoupon = useCreateCoupon();
  const updateCoupon = useUpdateCoupon();
  const deleteCoupon = useDeleteCoupon();

  const [dialog, setDialog] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const handleSave = (data: CouponInput) => {
    if (dialog === "edit" && editing) {
      updateCoupon.mutate(
        { id: editing.id, data },
        {
          onSuccess: () => { toast.success("Coupon updated"); setDialog(null); refetch(); },
          onError: () => toast.error("Failed to update"),
        },
      );
    } else {
      createCoupon.mutate(
        { data: data as CouponInput },
        {
          onSuccess: () => { toast.success("Coupon created"); setDialog(null); refetch(); },
          onError: () => toast.error("Failed to create"),
        },
      );
    }
  };

  const handleDelete = (id: number) => {
    deleteCoupon.mutate(
      { id },
      {
        onSuccess: () => { toast.success("Coupon deleted"); setDeleteId(null); refetch(); },
        onError: () => toast.error("Failed to delete"),
      },
    );
  };

  const isPending = createCoupon.isPending || updateCoupon.isPending;

  return (
    <AdminLayout title="Coupons">
      <div className="flex justify-between items-center mb-6">
        <p className="text-sm text-muted-foreground">{coupons?.length ?? 0} coupons</p>
        <Button onClick={() => { setEditing(null); setDialog("create"); }} size="sm">
          <Plus className="w-4 h-4 mr-1" /> Add Coupon
        </Button>
      </div>

      <div className="bg-background border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-muted-foreground text-left">
              <tr>
                <th className="px-6 py-3 font-medium">Code</th>
                <th className="px-6 py-3 font-medium">Discount</th>
                <th className="px-6 py-3 font-medium">Min Order</th>
                <th className="px-6 py-3 font-medium">Usage</th>
                <th className="px-6 py-3 font-medium">Expires</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 7 }).map((__, j) => (
                        <td key={j} className="px-6 py-4"><Skeleton className="h-4 w-20" /></td>
                      ))}
                    </tr>
                  ))
                : coupons?.map((coupon) => (
                    <tr key={coupon.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold font-mono tracking-widest text-primary">{coupon.code}</span>
                          <button
                            onClick={() => { navigator.clipboard.writeText(coupon.code); toast.success("Copied!"); }}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                        {coupon.description && <p className="text-xs text-muted-foreground mt-0.5">{coupon.description}</p>}
                      </td>
                      <td className="px-6 py-4 font-semibold">
                        {coupon.discountType === "percent" ? `${coupon.discountValue}%` : `₹${coupon.discountValue}`}
                        {coupon.maxDiscount && <span className="text-xs text-muted-foreground ml-1">(max ₹{coupon.maxDiscount})</span>}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {coupon.minOrderAmount ? `₹${coupon.minOrderAmount}` : "—"}
                      </td>
                      <td className="px-6 py-4">
                        {coupon.usedCount}/{coupon.usageLimit ?? "∞"}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground text-xs">
                        {coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleDateString("en-IN") : "Never"}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${coupon.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
                          {coupon.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8"
                            onClick={() => { setEditing(coupon as Coupon); setDialog("edit"); }}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleteId(coupon.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
          {!isLoading && !coupons?.length && (
            <div className="text-center py-16 text-muted-foreground">No coupons yet.</div>
          )}
        </div>
      </div>

      <Dialog open={dialog !== null} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dialog === "edit" ? "Edit Coupon" : "Create Coupon"}</DialogTitle>
          </DialogHeader>
          <CouponForm
            initial={editing ?? undefined}
            onSave={handleSave}
            onCancel={() => setDialog(null)}
            isLoading={isPending}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Coupon</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This will permanently delete the coupon code.</p>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId && handleDelete(deleteId)} disabled={deleteCoupon.isPending}>
              {deleteCoupon.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
