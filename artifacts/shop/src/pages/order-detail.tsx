import { AppLayout } from "@/components/layout/AppLayout";
import { useParams, Link, Redirect, useSearch } from "wouter";
import { useGetOrder, useListAddresses, customFetch } from "@workspace/api-client-react";
import { Show } from "@clerk/react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CheckCircle2,
  PackageCheck,
  Clock,
  CreditCard,
  MapPin,
  ShoppingBag,
  XCircle,
  Pencil,
  Smartphone,
  Upload,
} from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useAuth, useUser } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const STATUS_STEPS = ["pending", "confirmed", "shipped", "delivered"];

function StatusStepper({ status }: { status: string }) {
  const currentIdx = STATUS_STEPS.indexOf(status);
  const isCancelled = status === "cancelled";

  if (isCancelled) {
    return (
      <div className="text-sm text-destructive font-medium flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-destructive"></span>
        Order Cancelled
      </div>
    );
  }

  return (
    <div className="w-full mt-6 mb-2 relative">
      {/* Background connecting line */}
      <div className="absolute top-1/2 left-0 right-0 h-1 bg-zinc-800/50 -translate-y-1/2 z-0 rounded-full" />
      
      {/* Active connecting line */}
      <div 
        className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-amber-500 to-amber-400 -translate-y-1/2 z-0 rounded-full transition-all duration-700 ease-in-out shadow-[0_0_10px_rgba(245,158,11,0.5)]"
        style={{ width: `${(currentIdx / (STATUS_STEPS.length - 1)) * 100}%` }}
      />
      
      <div className="flex items-center justify-between relative z-10">
        {STATUS_STEPS.map((step, idx) => {
          const done = idx <= currentIdx;
          const active = idx === currentIdx;
          return (
            <div key={step} className="flex flex-col items-center flex-1 relative group">
              <div
                className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-xs md:text-sm font-bold border-[3px] transition-all duration-500 ${
                  done
                    ? "bg-amber-500 border-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.6)] scale-110"
                    : "bg-zinc-900 border-zinc-700 text-zinc-500"
                } ${active ? "ring-4 ring-amber-500/30 ring-offset-2 ring-offset-zinc-950 animate-pulse" : ""}`}
              >
                {done ? <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5" /> : idx + 1}
              </div>
              <span
                className={`absolute -bottom-8 text-[10px] md:text-xs text-center capitalize font-bold tracking-wider transition-colors duration-300 ${
                  done ? "text-amber-400 drop-shadow-md" : "text-zinc-500"
                } ${active ? "scale-105" : ""}`}
              >
                {step}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}



export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const orderId = parseInt(id || "0", 10);
  const search = useSearch();
  const params = new URLSearchParams(search);
  const successType = params.get("success");

  const [showSuccess, setShowSuccess] = useState(!!successType);
  const { data: order, isLoading } = useGetOrder(orderId);
  const { getToken } = useAuth();
  const { user } = useUser();
  const queryClient = useQueryClient();

  // ── Cancel order ──
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const handleCancelOrder = async () => {
    setIsCancelling(true);
    try {
      await customFetch(`/api/orders/${orderId}/cancel`, {
        method: "POST",
      });
      toast.success("Order cancelled successfully");
      setIsCancelDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: [`/api/orders/${orderId}`] });
    } catch (err: any) { toast.error(err.message || "Failed to cancel order"); }
    finally { setIsCancelling(false); }
  };

  // ── Change address ──
  const [isAddressDialogOpen, setIsAddressDialogOpen] = useState(false);
  const [selectedNewAddressId, setSelectedNewAddressId] = useState<number | null>(null);
  const [isChangingAddress, setIsChangingAddress] = useState(false);
  const { data: addressesData } = useListAddresses();
  const addresses = Array.isArray(addressesData) ? addressesData : (addressesData as any)?.addresses ?? [];

  const handleChangeAddress = async () => {
    if (!selectedNewAddressId) return;
    setIsChangingAddress(true);
    try {
      await customFetch(`/api/orders/${orderId}/address`, {
        method: "PATCH",
        body: JSON.stringify({ addressId: selectedNewAddressId }),
      });
      toast.success("Delivery address updated");
      setIsAddressDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: [`/api/orders/${orderId}`] });
    } catch (err: any) { toast.error(err.message || "Failed to update address"); }
    finally { setIsChangingAddress(false); }
  };

  // ── Pay Online (COD → Razorpay) ──
  const [isPayingOnline, setIsPayingOnline] = useState(false);

  const handlePayOnline = async () => {
    setIsPayingOnline(true);
    try {
      // Load Razorpay script
      if (!(window as any).Razorpay) {
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement("script");
          s.src = "https://checkout.razorpay.com/v1/checkout.js";
          s.onload = () => resolve();
          s.onerror = () => reject(new Error("Razorpay load failed"));
          document.body.appendChild(s);
        });
      }
      const rzpOrder = await customFetch<any>(`/api/orders/${orderId}/pay-online`, {
        method: "POST",
      });

      const rzp = new (window as any).Razorpay({
        key: rzpOrder.key,
        amount: rzpOrder.amount,
        currency: rzpOrder.currency ?? "INR",
        order_id: rzpOrder.id,
        name: "ShopLux",
        description: `Pay for Order #${orderId}`,
        prefill: { name: user?.fullName ?? "", email: user?.primaryEmailAddress?.emailAddress ?? "" },
        theme: { color: "#d97706" },
        modal: { ondismiss: () => setIsPayingOnline(false) },
        handler: async (response: any) => {
          try {
            await customFetch(`/api/orders/payment/verify`, {
              method: "POST",
              body: JSON.stringify({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
                orderId,
              }),
            });
            toast.success("Payment successful! Order is now paid.");
            queryClient.invalidateQueries({ queryKey: [`/api/orders/${orderId}`] });
          } catch { toast.error("Payment verification failed. Contact support."); }
          finally { setIsPayingOnline(false); }
        },
      });
      rzp.open();
    } catch (err: any) {
      toast.error(err.message || "Failed to initiate payment");
      setIsPayingOnline(false);
    }
  };

  // ── Return ──
  const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false);
  const [selectedItemForReturn, setSelectedItemForReturn] = useState<{ id: number; productName: string } | null>(null);
  const [returnReason, setReturnReason] = useState("Defective or damaged item");
  const [returnImageUrl, setReturnImageUrl] = useState("");
  const [returnBankName, setReturnBankName] = useState("");
  const [returnAccountNumber, setReturnAccountNumber] = useState("");
  const [returnIfsc, setReturnIfsc] = useState("");
  const [returnAccountHolder, setReturnAccountHolder] = useState("");
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenReturnDialog = (item: { id: number; productName: string }) => {
    setSelectedItemForReturn(item);
    setReturnReason("Defective or damaged item");
    setReturnImageUrl(""); setReturnBankName(""); setReturnAccountNumber(""); setReturnIfsc(""); setReturnAccountHolder("");
    setIsReturnDialogOpen(true);
  };

  const handleUploadReturnImage = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    try {
      const data = await customFetch<any>("/api/uploads", {
        method: "POST",
        body: formData,
      });
      setReturnImageUrl(data.url ?? data.path ?? "");
      toast.success("Image uploaded");
    } catch { toast.error("Image upload failed"); }
  };

  const handleSubmitReturn = async () => {
    if (!selectedItemForReturn) return;
    setIsSubmittingReturn(true);
    try {
      await customFetch(`/api/orders/${orderId}/items/${selectedItemForReturn.id}/return`, {
        method: "POST",
        body: JSON.stringify({
          reason: returnReason,
          imageUrl: returnImageUrl || undefined,
          bankName: returnBankName || undefined,
          accountNumber: returnAccountNumber || undefined,
          ifscCode: returnIfsc || undefined,
          accountHolderName: returnAccountHolder || undefined,
        }),
      });
      toast.success("Return request submitted successfully");
      setIsReturnDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: [`/api/orders/${orderId}`] });
    } catch (err: any) { toast.error(err.message || "Something went wrong"); }
    finally { setIsSubmittingReturn(false); }
  };

  // Auto-hide success banner after 8 seconds
  useEffect(() => {
    if (!showSuccess) return;
    const t = setTimeout(() => setShowSuccess(false), 8000);
    return () => clearTimeout(t);
  }, [showSuccess]);

  return (
    <AppLayout>
      <Show when="signed-out">
        <Redirect to="/sign-in" />
      </Show>
      <Show when="signed-in">
        <div className="container mx-auto px-4 py-8 md:py-12 max-w-5xl relative">
          {/* Decorative glowing background elements */}
          <div className="fixed top-20 left-0 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-[120px] pointer-events-none" />
          <div className="fixed bottom-0 right-0 w-[600px] h-[600px] bg-red-600/5 rounded-full blur-[150px] pointer-events-none" />

          {/* Success Banner */}
          {showSuccess && (
            <div className="mb-10 relative overflow-hidden bg-gradient-to-r from-emerald-900/80 to-emerald-800/60 backdrop-blur-xl border border-emerald-500/30 rounded-2xl p-8 shadow-[0_0_40px_rgba(16,185,129,0.15)] group animate-in slide-in-from-top-10 fade-in duration-700">
              <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/3 w-64 h-64 bg-emerald-500/20 rounded-full blur-[60px]" />
              <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
                <div className="w-16 h-16 rounded-full bg-emerald-400/20 border-2 border-emerald-400/30 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-500 shadow-lg shadow-emerald-500/20">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 animate-pulse" />
                </div>
                <div>
                  <h2 className="font-serif text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-200 to-emerald-400 tracking-tight mb-2">
                    {successType === "paid" ? "Payment Successful!" : "Order Placed Successfully!"}
                  </h2>
                  <p className="text-emerald-100/80 text-sm md:text-base max-w-xl">
                    {successType === "paid"
                      ? "Your payment has been verified and your order is confirmed. We're getting it ready for you."
                      : "Your COD order has been placed. Pay conveniently when it arrives at your doorstep."}
                  </p>
                  <div className="flex flex-wrap justify-center sm:justify-start gap-4 mt-6">
                    <Link href="/orders">
                      <Button className="rounded-full bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold px-6 shadow-[0_0_15px_rgba(16,185,129,0.4)] hover:shadow-[0_0_25px_rgba(16,185,129,0.6)] transition-all">
                        View All Orders
                      </Button>
                    </Link>
                    <Link href="/products">
                      <Button variant="outline" className="rounded-full border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/10 hover:text-emerald-200 px-6">
                        Continue Shopping
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-4 mb-8">
            <Link href="/orders" className="text-muted-foreground hover:text-foreground text-sm">
              ← Back to Orders
            </Link>
          </div>

          {isLoading ? (
            <div className="space-y-8">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-8 w-full" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-48 w-full" />
              </div>
            </div>
          ) : !order ? (
            <div className="text-center py-24">
              <ShoppingBag className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">Order not found.</p>
              <Link href="/orders">
                <Button variant="outline" className="rounded-none">View All Orders</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Order header */}
              <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-6 md:p-8 shadow-2xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12 relative z-10">
                  <div>
                    <h1 className="font-serif text-3xl md:text-4xl font-black mb-2 text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-400 tracking-tight">
                      Order #{(order as any).customerOrderNumber ?? order.id}
                    </h1>
                    <div className="flex items-center gap-3 text-sm text-zinc-400">
                      <span className="font-mono text-xs opacity-70">ID: #{order.id}</span>
                      <span className="w-1 h-1 rounded-full bg-zinc-700" />
                      <span>
                        {new Date(order.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric", month: "long", year: "numeric", hour: '2-digit', minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    {order.paymentStatus === "paid" ? (
                      <span className="inline-flex items-center gap-1.5 text-xs px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold tracking-widest uppercase rounded-full shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                        <CheckCircle2 className="w-4 h-4" /> Paid
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs px-4 py-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold tracking-widest uppercase rounded-full shadow-[0_0_10px_rgba(245,158,11,0.2)] animate-pulse">
                        <Clock className="w-4 h-4" /> Pending
                      </span>
                    )}
                    {/* Cancel button */}
                    {(order.status === "pending" || order.status === "confirmed") && (
                      <Button size="sm" variant="outline" className="rounded-full text-red-400 border-red-500/30 hover:bg-red-500/10 hover:text-red-300 hover:border-red-500/50 h-9 px-4 gap-1.5 transition-all shadow-lg"
                        onClick={() => setIsCancelDialogOpen(true)}>
                        <XCircle className="w-4 h-4" /> Cancel Order
                      </Button>
                    )}
                    {/* Change address button */}
                    {!["shipped","out_for_delivery","delivered","cancelled"].includes(order.status) && (
                      <Button size="sm" variant="outline" className="rounded-full text-zinc-300 border-zinc-700 hover:bg-zinc-800 hover:text-white h-9 px-4 gap-1.5 transition-all shadow-lg"
                        onClick={() => { setSelectedNewAddressId(null); setIsAddressDialogOpen(true); }}>
                        <Pencil className="w-4 h-4" /> Change Address
                      </Button>
                    )}
                    {/* Pay Online Now (COD → Online) */}
                    {order.paymentMethod === "cod" && order.paymentStatus !== "paid" && !["delivered","cancelled"].includes(order.status) && (
                      <Button size="sm" className="rounded-full h-9 px-5 gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold shadow-[0_0_15px_rgba(245,158,11,0.4)] hover:shadow-[0_0_25px_rgba(245,158,11,0.6)] transition-all transform hover:-translate-y-0.5"
                        onClick={handlePayOnline} disabled={isPayingOnline}>
                        <Smartphone className="w-4 h-4" />
                        {isPayingOnline ? "Loading..." : "Pay Online Now"}
                      </Button>
                    )}
                  </div>
                </div>
                {/* Status stepper */}
                <StatusStepper status={order.status} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  {/* Items */}
                  <div className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/80 rounded-2xl p-6 md:p-8 shadow-xl">
                    <h2 className="font-serif text-xl md:text-2xl font-black mb-6 flex items-center gap-3 text-white">
                      <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400 border border-amber-500/30">
                        <PackageCheck className="w-5 h-5 md:w-6 md:h-6" />
                      </div>
                      Items Ordered
                    </h2>
                    <div className="space-y-6">
                      {order.items.map((item) => (
                        <div key={item.id} className="group flex flex-col sm:flex-row gap-5 p-4 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-amber-500/30 transition-colors shadow-lg">
                          <div className="w-full sm:w-28 h-36 sm:h-32 bg-zinc-900 rounded-lg overflow-hidden flex-shrink-0 relative">
                            {item.productImage ? (
                              <img
                                src={item.productImage}
                                alt={item.productName}
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-zinc-700">No Image</div>
                            )}
                            <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-lg pointer-events-none" />
                          </div>
                          <div className="flex-1 flex flex-col justify-between">
                            <div>
                              <Link
                                href={`/products/${item.productId}`}
                                className="font-bold text-base md:text-lg text-zinc-100 hover:text-amber-400 transition-colors line-clamp-2"
                              >
                                {item.productName}
                              </Link>
                              {item.variant && (
                                <span className="inline-block mt-2 px-2.5 py-1 bg-zinc-800 text-zinc-300 text-xs font-semibold uppercase tracking-wider rounded-md border border-zinc-700">
                                  {item.variant}
                                </span>
                              )}
                            </div>
                            <div className="flex justify-between items-end mt-4">
                              <div className="space-y-1">
                                <span className="text-zinc-500 text-xs uppercase tracking-widest font-bold">Qty & Price</span>
                                <div className="text-zinc-300 font-medium text-sm">
                                  {item.quantity} × <span className="text-amber-400">₹{item.price.toLocaleString("en-IN")}</span>
                                </div>
                              </div>
                              <span className="font-black text-xl text-white">
                                ₹{(item.price * item.quantity).toLocaleString("en-IN")}
                              </span>
                            </div>

                            {/* Return action or badge */}
                            <div className="flex justify-end mt-4 pt-4 border-t border-zinc-800">
                              {item.returnStatus === "pending" && (
                                <span className="inline-flex items-center text-xs px-3 py-1.5 bg-amber-500/10 text-amber-400 font-bold uppercase tracking-wider rounded-md border border-amber-500/20">
                                  Return Pending
                                </span>
                              )}
                              {item.returnStatus === "approved" && (
                                <span className="inline-flex items-center text-xs px-3 py-1.5 bg-emerald-500/10 text-emerald-400 font-bold uppercase tracking-wider rounded-md border border-emerald-500/20">
                                  Refunded
                                </span>
                              )}
                              {item.returnStatus === "rejected" && (
                                <span className="inline-flex items-center text-xs px-3 py-1.5 bg-red-500/10 text-red-400 font-bold uppercase tracking-wider rounded-md border border-red-500/20">
                                  Return Rejected
                                </span>
                              )}
                              {item.returnStatus === null && order.status === "delivered" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 rounded-full text-xs font-bold px-4 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white transition-all shadow-md"
                                  onClick={() => handleOpenReturnDialog({ id: item.id, productName: item.productName })}
                                >
                                  Return Item
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Address + Payment details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/80 rounded-2xl p-6 shadow-xl relative overflow-hidden group hover:border-amber-500/30 transition-colors">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-[40px]" />
                      <h2 className="font-serif text-lg font-black mb-4 flex items-center gap-2 text-white">
                        <MapPin className="w-5 h-5 text-amber-400" />
                        Delivery Address
                      </h2>
                      {order.address ? (
                        <div className="text-sm space-y-2 relative z-10">
                          <p className="font-bold text-base text-zinc-100">{order.address.fullName}</p>
                          <p className="text-zinc-400 leading-relaxed">
                            {order.address.addressLine}
                            {order.address.landmark && <><br />Landmark: {order.address.landmark}</>}
                            <br />{order.address.city}, {order.address.state} — {order.address.pincode}
                          </p>
                          <p className="text-amber-400/90 font-medium pt-2 flex items-center gap-1.5">
                            <span className="w-1 h-1 rounded-full bg-amber-400" />
                            {order.address.phone}
                          </p>
                        </div>
                      ) : (
                        <p className="text-zinc-500 text-sm italic relative z-10">Address details not available.</p>
                      )}
                    </div>

                    <div className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/80 rounded-2xl p-6 shadow-xl relative overflow-hidden group hover:border-emerald-500/30 transition-colors">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-[40px]" />
                      <h2 className="font-serif text-lg font-black mb-4 flex items-center gap-2 text-white">
                        <CreditCard className="w-5 h-5 text-emerald-400" />
                        Payment Info
                      </h2>
                      <div className="text-sm space-y-3 relative z-10">
                        <div className="flex justify-between items-center border-b border-zinc-800/50 pb-2">
                          <span className="text-zinc-500 font-semibold uppercase tracking-wider text-xs">Method</span>
                          <span className="uppercase font-bold text-zinc-100">{order.paymentMethod}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-zinc-800/50 pb-2">
                          <span className="text-zinc-500 font-semibold uppercase tracking-wider text-xs">Status</span>
                          <span
                            className={`capitalize font-black tracking-wide ${
                              order.paymentStatus === "paid"
                                ? "text-emerald-400"
                                : "text-amber-400"
                            }`}
                          >
                            {order.paymentStatus ?? "Pending"}
                          </span>
                        </div>
                        {order.razorpayPaymentId && (
                          <div className="flex flex-col gap-1 pt-1">
                            <span className="text-zinc-500 font-semibold uppercase tracking-wider text-[10px]">Txn ID</span>
                            <span className="font-mono text-xs text-zinc-300 bg-zinc-950 px-2 py-1 rounded border border-zinc-800 break-all">
                              {order.razorpayPaymentId}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Summary sidebar */}
                <div className="lg:sticky lg:top-24 bg-gradient-to-b from-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl p-6 md:p-8 shadow-2xl h-fit relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/10 rounded-full blur-[50px] pointer-events-none" />
                  <h2 className="font-serif font-black text-xl border-b border-zinc-800 pb-4 mb-6 text-white tracking-tight">
                    Order Summary
                  </h2>
                  <div className="space-y-4 text-sm relative z-10">
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400 font-medium">Subtotal</span>
                      <span className="text-zinc-100 font-semibold">₹{(order.subtotal ?? 0).toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400 font-medium">Delivery</span>
                      <span className="text-zinc-100 font-semibold">
                        {(order.deliveryCharge ?? 0) === 0
                          ? <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded text-xs uppercase tracking-wider font-bold">Free</span>
                          : `₹${(order.deliveryCharge ?? 0).toLocaleString("en-IN")}`}
                      </span>
                    </div>
                    {order.discount != null && order.discount > 0 && (
                      <div className="flex justify-between items-center text-emerald-400">
                        <span className="font-medium">Discount</span>
                        <span className="font-bold">−₹{order.discount.toLocaleString("en-IN")}</span>
                      </div>
                    )}
                    {order.couponCode && (
                      <div className="flex justify-between items-center text-xs mt-2">
                        <span className="text-zinc-500 font-semibold uppercase tracking-wider">Applied Coupon</span>
                        <span className="font-mono bg-zinc-800 text-amber-400 px-2 py-1 rounded border border-zinc-700 font-bold">{order.couponCode}</span>
                      </div>
                    )}
                    
                    <div className="my-6 border-t border-dashed border-zinc-700" />
                    
                    <div className="flex justify-between items-end text-lg">
                      <span className="font-black text-zinc-300">Total</span>
                      <span className="font-black text-3xl text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500">
                        ₹{order.totalAmount.toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>

                  <Link href="/products" className="block mt-8 relative z-10">
                    <Button className="w-full rounded-full bg-zinc-100 hover:bg-white text-zinc-950 font-black h-12 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] transition-all uppercase tracking-wider text-xs">
                      Continue Shopping
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </Show>

      {/* Cancel Order Dialog */}
      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg font-bold text-red-600">Cancel Order</DialogTitle>
          </DialogHeader>
          <div className="py-3 text-sm text-muted-foreground">
            Are you sure you want to cancel this order? This action cannot be undone. Stock will be restored automatically.
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="ghost" className="rounded-none border" onClick={() => setIsCancelDialogOpen(false)} disabled={isCancelling}>Keep Order</Button>
            <Button className="rounded-none bg-red-600 hover:bg-red-700 text-white" onClick={handleCancelOrder} disabled={isCancelling}>
              {isCancelling ? "Cancelling..." : "Yes, Cancel Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Address Dialog */}
      <Dialog open={isAddressDialogOpen} onOpenChange={setIsAddressDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg font-bold">Change Delivery Address</DialogTitle>
          </DialogHeader>
          <div className="py-3 space-y-3 max-h-64 overflow-y-auto">
            {addresses.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No saved addresses. <Link href="/account" className="text-amber-600 underline">Add one in your account.</Link></p>
            ) : addresses.map((addr: any) => (
              <label key={addr.id} className={`flex gap-3 p-3 border rounded-sm cursor-pointer transition-colors ${selectedNewAddressId === addr.id ? "border-amber-500 bg-amber-50 dark:bg-amber-900/10" : "hover:border-muted-foreground/50"}`}>
                <input type="radio" name="addr" value={addr.id} className="mt-1 accent-amber-600"
                  checked={selectedNewAddressId === addr.id} onChange={() => setSelectedNewAddressId(addr.id)} />
                <div className="text-sm">
                  <p className="font-semibold">{addr.fullName}</p>
                  <p className="text-muted-foreground">{addr.addressLine}{addr.landmark ? `, ${addr.landmark}` : ""}</p>
                  <p className="text-muted-foreground">{addr.city}, {addr.state} — {addr.pincode}</p>
                  <p className="text-muted-foreground">Ph: {addr.phone}</p>
                </div>
              </label>
            ))}
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="ghost" className="rounded-none border" onClick={() => setIsAddressDialogOpen(false)} disabled={isChangingAddress}>Cancel</Button>
            <Button className="rounded-none" onClick={handleChangeAddress} disabled={isChangingAddress || !selectedNewAddressId}>
              {isChangingAddress ? "Updating..." : "Update Address"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Return Dialog */}
      <Dialog open={isReturnDialogOpen} onOpenChange={setIsReturnDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg font-bold">Request Product Return</DialogTitle>
          </DialogHeader>
          <div className="py-3 space-y-4 text-sm">
            <p className="font-semibold text-foreground bg-muted p-2.5 border rounded">{selectedItemForReturn?.productName}</p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Reason for Return *</label>
              <select value={returnReason} onChange={(e) => setReturnReason(e.target.value)}
                className="w-full border border-border bg-background rounded-none px-3 py-2 text-sm focus:outline-none focus:border-primary">
                <option value="Defective or damaged item">Defective or damaged item</option>
                <option value="Received wrong item">Received wrong item</option>
                <option value="Item size/fit issue">Item size/fit issue</option>
                <option value="Product not as described">Product not as described</option>
                <option value="Changed my mind / No longer needed">Changed my mind / No longer needed</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Photo of Item (Optional)</label>
              <input type="file" accept="image/*" ref={fileInputRef} className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadReturnImage(f); }} />
              {returnImageUrl ? (
                <div className="flex items-center gap-2">
                  <img src={returnImageUrl} alt="Return" className="w-16 h-16 object-cover border rounded" />
                  <Button size="sm" variant="ghost" className="text-xs" onClick={() => { setReturnImageUrl(""); if (fileInputRef.current) fileInputRef.current.value = ""; }}>Remove</Button>
                </div>
              ) : (
                <Button size="sm" variant="outline" className="rounded-none gap-2 h-9" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="w-4 h-4" /> Upload Photo
                </Button>
              )}
            </div>

            <div className="border-t pt-3 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Bank Details for Refund (Optional)</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Account Holder Name</Label>
                  <Input className="rounded-none h-8 text-sm" value={returnAccountHolder} onChange={(e) => setReturnAccountHolder(e.target.value)} placeholder="Full name" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Bank Name</Label>
                  <Input className="rounded-none h-8 text-sm" value={returnBankName} onChange={(e) => setReturnBankName(e.target.value)} placeholder="e.g. SBI" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Account Number</Label>
                  <Input className="rounded-none h-8 text-sm" value={returnAccountNumber} onChange={(e) => setReturnAccountNumber(e.target.value)} placeholder="Account number" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">IFSC Code</Label>
                  <Input className="rounded-none h-8 text-sm" value={returnIfsc} onChange={(e) => setReturnIfsc(e.target.value)} placeholder="e.g. SBIN0001234" />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button variant="ghost" className="rounded-none border" onClick={() => setIsReturnDialogOpen(false)} disabled={isSubmittingReturn}>Cancel</Button>
            <Button className="rounded-none" onClick={handleSubmitReturn} disabled={isSubmittingReturn}>
              {isSubmittingReturn ? "Submitting..." : "Submit Return"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
