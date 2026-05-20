import { useUpdateOrderStatus } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AdminLayout } from "@/components/layout/AdminLayout";
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

const STATUSES = ["pending", "confirmed", "shipped", "out_for_delivery", "delivered", "cancelled"] as const;

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  shipped: "bg-indigo-100 text-indigo-800",
  out_for_delivery: "bg-violet-100 text-violet-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function AdminOrders() {
  const { data: ordersData, isLoading, refetch } = useQuery({
    queryKey: ["admin", "all-orders"],
    queryFn: async () => {
      const adminToken = localStorage.getItem("adminToken") || "shopluxadmin";
      const finalToken = (adminToken && adminToken !== "null" && adminToken !== "undefined") ? adminToken : "shopluxadmin";
      const res = await fetch("/api/orders?limit=200&admin=true", {
        headers: { "x-admin-token": finalToken },
      });
      if (!res.ok) throw new Error("Failed to load orders");
      return res.json() as Promise<{ orders: any[] }>;
    },
    refetchInterval: 30000,
  });
  const updateStatus = useUpdateOrderStatus();
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [updating, setUpdating] = useState<number | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);

  const orders = (ordersData?.orders ?? []).filter(
    (o) => !statusFilter || o.status === statusFilter,
  );

  const handleStatusChange = (orderId: number, newStatus: string) => {
    setUpdating(orderId);
    updateStatus.mutate(
      { id: orderId, data: { status: newStatus } },
      {
        onSuccess: () => {
          toast.success("Order status updated");
          refetch();
          setUpdating(null);
        },
        onError: () => {
          toast.error("Failed to update status");
          setUpdating(null);
        },
      },
    );
  };

  return (
    <AdminLayout title="Orders">
      <div className="flex flex-col sm:flex-row gap-4 mb-6 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setStatusFilter("")}
            className={`px-3 py-1.5 text-xs rounded-full border font-medium transition-colors ${!statusFilter ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}
          >
            All
          </button>
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs rounded-full border font-medium capitalize transition-colors ${statusFilter === s ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}
            >
              {s.replace("_", " ")}
            </button>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">{orders.length} orders</p>
      </div>

      <div className="bg-background border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-muted-foreground text-left">
              <tr>
                <th className="px-6 py-3 font-medium w-24">Order</th>
                <th className="px-6 py-3 font-medium">Customer</th>
                <th className="px-6 py-3 font-medium">Address</th>
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium">Total</th>
                <th className="px-6 py-3 font-medium">Payment</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Update Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 8 }).map((__, j) => (
                        <td key={j} className="px-6 py-4">
                          <Skeleton className="h-4 w-24" />
                        </td>
                      ))}
                    </tr>
                  ))
                : orders.map((order) => (
                    <React.Fragment key={order.id}>
                      <tr 
                        className={`hover:bg-muted/20 transition-colors cursor-pointer ${expandedOrderId === order.id ? "bg-muted/40" : ""}`}
                        onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
                      >
                        <td className="px-6 py-4 font-mono font-medium">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-muted-foreground select-none">
                              {expandedOrderId === order.id ? "▼" : "▶"}
                            </span>
                            #{order.id}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium">{order.customerName || "—"}</p>
                            <p className="text-xs text-muted-foreground">{order.customerEmail || order.userId.slice(0, 10) + "..."}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs">
                          {order.address ? (
                            <div className="space-y-1 max-w-[260px]">
                              <p className="font-medium text-foreground">
                                {order.address.fullName}
                              </p>

                              <p className="text-muted-foreground">
                                {order.address.phone}
                              </p>

                              <p>
                                {order.address.addressLine}
                              </p>

                              <p className="text-muted-foreground">
                                {order.address.landmark}
                              </p>

                              <p>
                                {order.address.city}, {order.address.state}
                              </p>

                              <p className="font-medium">
                                {order.address.pincode}
                              </p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">
                              No address found
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-4 text-muted-foreground text-xs">
                          {new Date(order.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="px-6 py-4 font-semibold">₹{order.totalAmount.toLocaleString("en-IN")}</td>
                        <td className="px-6 py-4">
                          <span className={`text-xs px-2 py-1 rounded capitalize ${order.paymentStatus === "paid" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
                            {order.paymentMethod === "cod" ? "COD" : order.paymentStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${STATUS_COLORS[order.status] ?? "bg-muted text-muted-foreground"}`}>
                            {order.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                          <select
                            defaultValue={order.status}
                            disabled={updating === order.id}
                            onChange={(e) => handleStatusChange(order.id, e.target.value)}
                            className="text-xs border border-border rounded px-2 py-1.5 bg-background focus:outline-none focus:border-primary disabled:opacity-50"
                          >
                            {STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {s.replace("_", " ")}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                      {expandedOrderId === order.id && (
                        <tr className="bg-muted/10 border-y border-border">
                          <td colSpan={8} className="px-8 py-5">
                            <div className="animate-in fade-in slide-in-from-top-2 duration-150">
                              <div className="flex items-center justify-between mb-4 border-b pb-2">
                                <h4 className="font-serif font-semibold text-base text-foreground flex items-center gap-2">
                                  <span>🛒 Ordered Items</span>
                                  <span className="text-xs px-2.5 py-0.5 font-sans bg-muted text-muted-foreground rounded-full font-normal">
                                    {order.items?.length || 0} {order.items?.length === 1 ? "item" : "items"}
                                  </span>
                                </h4>
                                <div className="text-xs text-muted-foreground space-x-4">
                                  <span>Subtotal: ₹{order.subtotal?.toLocaleString('en-IN')}</span>
                                  {order.deliveryCharge > 0 && <span>Delivery: ₹{order.deliveryCharge?.toLocaleString('en-IN')}</span>}
                                  {order.discount > 0 && <span className="text-green-600">Discount: -₹{order.discount?.toLocaleString('en-IN')}</span>}
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {order.items?.map((item) => (
                                  <div key={item.id} className="flex gap-4 p-3.5 bg-background border border-border rounded-xl shadow-sm hover:shadow-md transition-shadow">
                                    <div className="w-16 h-20 bg-muted rounded-lg overflow-hidden flex-shrink-0 border border-border">
                                      {item.productImage ? (
                                        <img src={item.productImage} alt={item.productName} className="w-full h-full object-cover" />
                                      ) : (
                                        <div className="w-full h-full bg-secondary flex items-center justify-center text-[10px] text-muted-foreground">No Img</div>
                                      )}
                                    </div>
                                    <div className="flex-1 flex flex-col justify-between text-xs min-w-0">
                                      <div>
                                        <h5 className="font-medium text-sm text-foreground truncate" title={item.productName}>
                                          {item.productName}
                                        </h5>
                                        {item.variant && (
                                          <p className="text-muted-foreground mt-1 text-[11px]">
                                            Variant: <span className="font-semibold text-foreground bg-muted px-1.5 py-0.5 rounded text-[10px]">{item.variant}</span>
                                          </p>
                                        )}
                                      </div>
                                      <div className="flex justify-between items-end mt-2 pt-2 border-t border-muted/50">
                                        <p className="text-muted-foreground text-[11px]">
                                          ₹{item.price.toLocaleString('en-IN')} × {item.quantity}
                                        </p>
                                        <p className="font-semibold text-sm text-foreground">
                                          ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
            </tbody>
          </table>
          {!isLoading && orders.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">No orders found.</div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
