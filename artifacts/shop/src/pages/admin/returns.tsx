import { AdminLayout } from "@/components/layout/AdminLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useAuth } from "@clerk/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
import { toast } from "sonner";
import { CheckCircle, XCircle, ArrowLeftRight, Clock, ChevronDown, ChevronUp, Image as ImageIcon, MapPin, Landmark as BankIcon, Copy, ExternalLink, ShoppingBag, CreditCard, Calendar, User } from "lucide-react";

interface ReturnRequest {
  id: number;
  orderId: number;
  productId: number;
  orderItemId: number;
  reason: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  imageUrl?: string | null;
  bankName?: string | null;
  accountNumber?: string | null;
  ifscCode?: string | null;
  accountHolder?: string | null;
  order?: {
    id: number;
    totalAmount: number;
    status: string;
    paymentStatus: string;
    paymentMethod: string;
    createdAt: string;
    customerOrderNumber?: number | null;
    address?: {
      id: number;
      fullName: string;
      phone: string;
      email?: string | null;
      addressLine: string;
      landmark?: string | null;
      city: string;
      state: string;
      pincode: string;
    } | null;
  } | null;
  user: {
    id: string;
    email: string;
    name?: string;
    phone?: string;
  };
  item: {
    productName: string;
    productImage?: string | null;
    price: number;
    quantity: number;
    variant?: string | null;
  };
}

export default function AdminReturns() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data, isLoading } = useQuery<{ returns: ReturnRequest[] }>({
    queryKey: ["admin", "returns"],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch("/api/admin/returns", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to load return requests");
      return res.json();
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: "approved" | "rejected" }) => {
      const token = await getToken();
      const res = await fetch(`/api/admin/returns/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update return request status");
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      toast.success(`Return request ${variables.status} successfully`);
      queryClient.invalidateQueries({ queryKey: ["admin", "returns"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update return status");
    },
    onSettled: () => {
      setProcessingId(null);
    },
  });

  const handleUpdateStatus = (id: number, status: "approved" | "rejected") => {
    setProcessingId(id);
    updateStatusMutation.mutate({ id, status });
  };

  const requests = (data?.returns ?? []).filter(
    (r) => !statusFilter || r.status === statusFilter
  );

  return (
    <AdminLayout title="Returns Dashboard">
      <div className="flex flex-col sm:flex-row gap-4 mb-8 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setStatusFilter("")}
            className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all duration-200 border rounded-none ${
              !statusFilter
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            All Requests
          </button>
          <button
            onClick={() => setStatusFilter("pending")}
            className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all duration-200 border rounded-none ${
              statusFilter === "pending"
                ? "bg-amber-500 text-white border-amber-500"
                : "bg-background border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setStatusFilter("approved")}
            className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all duration-200 border rounded-none ${
              statusFilter === "approved"
                ? "bg-green-600 text-white border-green-600"
                : "bg-background border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            Approved
          </button>
          <button
            onClick={() => setStatusFilter("rejected")}
            className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all duration-200 border rounded-none ${
              statusFilter === "rejected"
                ? "bg-red-600 text-white border-red-600"
                : "bg-background border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            Rejected
          </button>
        </div>
        <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {requests.length} Requests
        </p>
      </div>

      <div className="bg-background border rounded-none shadow-sm overflow-hidden font-sans">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground text-left text-xs uppercase tracking-wider font-semibold border-b">
              <tr>
                <th className="w-10 px-4 py-4"></th>
                <th className="px-6 py-4 font-semibold text-xs tracking-wider">Request / Date</th>
                <th className="px-6 py-4 font-semibold text-xs tracking-wider">Customer</th>
                <th className="px-6 py-4 font-semibold text-xs tracking-wider">Product Details</th>
                <th className="px-6 py-4 font-semibold text-xs tracking-wider">Return Reason</th>
                <th className="px-6 py-4 font-semibold text-xs tracking-wider">Status</th>
                <th className="px-6 py-4 text-right font-semibold text-xs tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    <td className="w-10 px-4 py-4"></td>
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j} className="px-6 py-4">
                        <Skeleton className="h-4 w-28 rounded-none" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <ArrowLeftRight className="w-8 h-8 text-muted/60" />
                      <p className="font-serif text-base font-bold text-foreground">No Return Requests Found</p>
                      <p className="text-xs">Any customer return requests will be shown here.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                requests.map((req) => (
                  <React.Fragment key={req.id}>
                    <tr className="hover:bg-muted/10 transition-colors border-b border-border">
                      <td className="px-4 py-4 text-center">
                        <button
                          onClick={() => setExpandedId(expandedId === req.id ? null : req.id)}
                          className="text-muted-foreground hover:text-foreground transition-colors p-1"
                        >
                          {expandedId === req.id ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                      <span className="font-bold text-foreground font-mono block text-xs">
                        #RET-{req.id}
                      </span>
                      <span className="text-xs text-muted-foreground block mt-1">
                        {new Date(req.createdAt).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-foreground block">
                        Order #{req.orderId}
                      </span>
                      <span className="text-xs text-muted-foreground block select-all">
                        {req.user.email}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-12 bg-muted flex-shrink-0 border flex items-center justify-center overflow-hidden">
                          {req.item.productImage ? (
                            <img
                              src={req.item.productImage}
                              alt={req.item.productName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Clock className="w-4 h-4 text-muted-foreground/60" />
                          )}
                        </div>
                        <div className="max-w-[200px]">
                          <span className="font-medium text-foreground text-xs line-clamp-1 block">
                            {req.item.productName}
                          </span>
                          <span className="text-[11px] text-muted-foreground block mt-0.5">
                            Qty: {req.item.quantity} • ₹{req.item.price.toLocaleString("en-IN")}
                          </span>
                          {req.item.variant && (
                            <span className="inline-block text-[10px] uppercase font-semibold tracking-wider text-muted-foreground bg-muted px-1.5 mt-1 border">
                              {req.item.variant}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-foreground bg-muted/60 px-2 py-1.5 border border-border block rounded-none max-w-[240px] italic">
                        "{req.reason}"
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {req.status === "pending" && (
                        <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 font-semibold uppercase tracking-wider rounded border border-amber-200 dark:border-amber-900">
                          <Clock className="w-3.5 h-3.5" />
                          Pending
                        </span>
                      )}
                      {req.status === "approved" && (
                        <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 font-semibold uppercase tracking-wider rounded border border-green-200 dark:border-green-900">
                          <CheckCircle className="w-3.5 h-3.5" />
                          Approved
                        </span>
                      )}
                      {req.status === "rejected" && (
                        <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 font-semibold uppercase tracking-wider rounded border border-red-200 dark:border-red-900">
                          <XCircle className="w-3.5 h-3.5" />
                          Rejected
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {req.status === "pending" ? (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-none h-8 text-xs font-semibold uppercase tracking-wider text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/20"
                            onClick={() => handleUpdateStatus(req.id, "rejected")}
                            disabled={processingId === req.id}
                          >
                            Reject
                          </Button>
                          <Button
                            size="sm"
                            className="rounded-none h-8 text-xs font-semibold uppercase tracking-wider bg-green-600 hover:bg-green-700 text-white border-green-600 border-none"
                            onClick={() => handleUpdateStatus(req.id, "approved")}
                            disabled={processingId === req.id}
                          >
                            Approve
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground select-none">
                          Resolved
                        </span>
                      )}
                    </td>
                  </tr>
                  {expandedId === req.id && (
                    <tr className="bg-muted/10 border-b border-border">
                      <td colSpan={7} className="px-6 py-6 bg-muted/5">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
                          
                          {/* Card 1: Returned Item Details */}
                          <div className="bg-background border border-border p-5 shadow-sm flex flex-col justify-between gap-4 transition-all hover:shadow-md">
                            <div>
                              <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 border-b pb-2 mb-3">
                                <ShoppingBag className="w-4 h-4 text-primary" />
                                Returned Item Details
                              </h4>
                              <div className="flex gap-3 mb-4">
                                <div className="w-14 h-16 bg-muted flex-shrink-0 border flex items-center justify-center overflow-hidden">
                                  {req.item.productImage ? (
                                    <img
                                      src={req.item.productImage}
                                      alt={req.item.productName}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <ImageIcon className="w-5 h-5 text-muted-foreground/40" />
                                  )}
                                </div>
                                <div className="space-y-1">
                                  <span className="font-semibold text-foreground text-xs line-clamp-2 block leading-snug">
                                    {req.item.productName}
                                  </span>
                                  <span className="text-[11px] text-muted-foreground block">
                                    Qty: <span className="font-semibold text-foreground">{req.item.quantity}</span> • ₹{req.item.price.toLocaleString("en-IN")}
                                  </span>
                                  {req.item.variant && (
                                    <span className="inline-block text-[10px] uppercase font-bold tracking-wider text-muted-foreground bg-muted px-2 py-0.5 mt-1 border">
                                      {req.item.variant}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="space-y-2 text-xs border-t pt-3 border-dashed">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Request ID:</span>
                                  <span className="font-mono font-bold text-foreground">#RET-{req.id}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Request Date:</span>
                                  <span className="font-medium text-foreground">
                                    {new Date(req.createdAt).toLocaleDateString("en-IN", {
                                      day: "2-digit",
                                      month: "short",
                                      year: "numeric",
                                    })}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="bg-muted/40 border border-border/80 p-3 rounded-none mt-2">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                                Return Reason
                              </span>
                              <p className="text-xs text-foreground italic leading-relaxed">
                                "{req.reason}"
                              </p>
                            </div>
                          </div>

                          {/* Card 2: Order & Delivery Details */}
                          <div className="bg-background border border-border p-5 shadow-sm flex flex-col gap-3 transition-all hover:shadow-md">
                            <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 border-b pb-2 mb-1">
                              <MapPin className="w-4 h-4 text-primary" />
                              Order & Delivery Details
                            </h4>
                            <div className="space-y-2.5 text-xs">
                              <div>
                                <span className="text-muted-foreground block">Order Identifier:</span>
                                <span className="font-bold text-foreground block">
                                  {req.order?.customerOrderNumber ? `Order #${req.order.customerOrderNumber}` : `Order #${req.orderId}`}
                                  <span className="font-normal text-muted-foreground text-[10px] ml-1.5 font-mono">
                                    (ID: {req.orderId})
                                  </span>
                                </span>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-2 border-y border-dashed py-2.5 my-2">
                                <div>
                                  <span className="text-[10px] text-muted-foreground block uppercase">Total Amount</span>
                                  <span className="font-bold text-foreground">₹{req.order?.totalAmount?.toLocaleString("en-IN") || "N/A"}</span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-muted-foreground block uppercase">Payment Method</span>
                                  <span className="font-semibold text-foreground uppercase text-[10px] tracking-wider">{req.order?.paymentMethod || "N/A"}</span>
                                </div>
                                <div className="mt-1">
                                  <span className="text-[10px] text-muted-foreground block uppercase">Payment Status</span>
                                  <span className={`inline-block font-bold text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border mt-0.5 ${
                                    req.order?.paymentStatus === "paid" 
                                      ? "bg-green-50 text-green-700 border-green-200" 
                                      : "bg-amber-50 text-amber-700 border-amber-200"
                                  }`}>
                                    {req.order?.paymentStatus || "unknown"}
                                  </span>
                                </div>
                                <div className="mt-1">
                                  <span className="text-[10px] text-muted-foreground block uppercase">Order Status</span>
                                  <span className="inline-block font-semibold text-[10px] text-foreground uppercase tracking-wider mt-0.5">
                                    {req.order?.status || "unknown"}
                                  </span>
                                </div>
                              </div>

                              <div>
                                <span className="text-muted-foreground block">Customer:</span>
                                <span className="font-medium text-foreground block">{req.user.name || "Customer"}</span>
                                <span className="text-muted-foreground block text-[11px] font-mono mt-0.5 select-all">{req.user.email}</span>
                                {req.user.phone && <span className="text-muted-foreground block text-[11px] mt-0.5">{req.user.phone}</span>}
                              </div>

                              {req.order?.address ? (
                                <div className="border-t pt-2.5">
                                  <span className="text-muted-foreground block">Delivery Address:</span>
                                  <span className="text-foreground block mt-1 leading-relaxed font-sans text-[11px]">
                                    <strong className="text-foreground">{req.order.address.fullName}</strong>
                                    {req.order.address.phone && ` (${req.order.address.phone})`}
                                    <br />
                                    {req.order.address.addressLine}
                                    {req.order.address.landmark && `, Near ${req.order.address.landmark}`}
                                    <br />
                                    {req.order.address.city}, {req.order.address.state} - <span className="font-semibold">{req.order.address.pincode}</span>
                                  </span>
                                </div>
                              ) : (
                                <div className="text-muted-foreground text-[11px] italic border-t pt-2">No delivery address associated.</div>
                              )}
                            </div>
                          </div>

                          {/* Card 3: Secure Refund Bank Details */}
                          <div className="bg-background border border-border p-5 shadow-sm flex flex-col gap-3 transition-all hover:shadow-md">
                            <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 border-b pb-2 mb-1">
                              <BankIcon className="w-4 h-4 text-primary" />
                              Refund Bank Details
                            </h4>
                            {req.bankName ? (
                              <div className="space-y-3 text-xs flex-1 flex flex-col justify-between">
                                <div className="space-y-2.5">
                                  <div>
                                    <span className="text-muted-foreground block">Bank Name:</span>
                                    <span className="font-semibold text-foreground text-xs">{req.bankName}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground block">Account Holder:</span>
                                    <span className="font-medium text-foreground">{req.accountHolder || "N/A"}</span>
                                  </div>
                                  <div className="group relative">
                                    <span className="text-muted-foreground block">Account Number:</span>
                                    <div 
                                      onClick={() => {
                                        if (req.accountNumber) {
                                          navigator.clipboard.writeText(req.accountNumber);
                                          toast.success("Account number copied!");
                                        }
                                      }}
                                      className="flex items-center justify-between font-mono font-medium text-foreground tracking-wider select-all bg-muted/60 hover:bg-muted cursor-pointer px-2 py-1.5 border border-border transition-colors group mt-0.5"
                                      title="Click to copy account number"
                                    >
                                      <span>{req.accountNumber}</span>
                                      <Copy className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground transition-colors ml-2 flex-shrink-0" />
                                    </div>
                                  </div>
                                  <div className="group relative">
                                    <span className="text-muted-foreground block">IFSC Code:</span>
                                    <div 
                                      onClick={() => {
                                        if (req.ifscCode) {
                                          navigator.clipboard.writeText(req.ifscCode);
                                          toast.success("IFSC Code copied!");
                                        }
                                      }}
                                      className="flex items-center justify-between font-mono font-medium text-foreground tracking-wider select-all bg-muted/60 hover:bg-muted cursor-pointer px-2 py-1.5 border border-border transition-colors group mt-0.5"
                                      title="Click to copy IFSC code"
                                    >
                                      <span>{req.ifscCode}</span>
                                      <Copy className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground transition-colors ml-2 flex-shrink-0" />
                                    </div>
                                  </div>
                                </div>
                                <span className="text-[10px] text-muted-foreground block italic leading-snug bg-primary/5 p-2 border border-primary/10">
                                  💡 Click account number or IFSC code to copy directly for quick processing.
                                </span>
                              </div>
                            ) : (
                              <div className="text-muted-foreground text-xs italic flex flex-col items-center justify-center border border-dashed flex-1 py-8 text-center bg-muted/10">
                                <BankIcon className="w-6 h-6 text-muted-foreground/30 mb-1.5" />
                                <span>No refund bank account details provided.</span>
                              </div>
                            )}
                          </div>

                          {/* Card 4: Uploaded Image Gallery */}
                          <div className="bg-background border border-border p-5 shadow-sm flex flex-col gap-3 transition-all hover:shadow-md">
                            <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 border-b pb-2 mb-1">
                              <ImageIcon className="w-4 h-4 text-primary" />
                              Return Proof Image
                            </h4>
                            {req.imageUrl ? (
                              <div className="flex flex-col gap-3 flex-1 justify-between">
                                <div className="space-y-2">
                                  <span className="text-muted-foreground text-[11px] block leading-relaxed">
                                    Customer proof image uploaded at request time:
                                  </span>
                                  <a
                                    href={req.imageUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block aspect-[4/3] bg-muted border overflow-hidden relative group rounded-none cursor-zoom-in"
                                  >
                                    <img
                                      src={req.imageUrl}
                                      alt="Return Proof"
                                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold">
                                      View Full Image
                                    </div>
                                  </a>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full rounded-none h-8 text-[11px] font-semibold uppercase tracking-wider hover:bg-muted mt-2 border-border flex items-center justify-center gap-1.5"
                                  onClick={() => window.open(req.imageUrl || "", "_blank")}
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                  Open In New Tab
                                </Button>
                              </div>
                            ) : (
                              <div className="text-muted-foreground text-xs italic flex flex-col items-center justify-center border border-dashed flex-1 py-8 text-center bg-muted/10">
                                <ImageIcon className="w-6 h-6 text-muted-foreground/30 mb-1.5" />
                                <span>No return proof image uploaded by customer.</span>
                              </div>
                            )}
                          </div>

                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
