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
    <div className="w-full mt-4">
      <div className="flex items-center justify-between">
        {STATUS_STEPS.map((step, idx) => {
          const done = idx <= currentIdx;
          const active = idx === currentIdx;
          return (
            <div key={step} className="flex flex-col items-center flex-1">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                  done
                    ? "bg-primary border-primary text-primary-foreground"
                    : "border-muted-foreground/30 text-muted-foreground/30"
                } ${active ? "ring-2 ring-primary ring-offset-2" : ""}`}
              >
                {done ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
              </div>
              <span
                className={`text-[10px] mt-1 text-center capitalize font-medium ${
                  done ? "text-foreground" : "text-muted-foreground/50"
                }`}
              >
                {step}
              </span>
              {idx < STATUS_STEPS.length - 1 && (
                <div
                  className={`h-0.5 w-full mt-[-18px] -z-10 ${
                    idx < currentIdx ? "bg-primary" : "bg-muted"
                  }`}
                  style={{ marginTop: "-26px", position: "relative", top: "-13px" }}
                />
              )}
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
        <div className="container mx-auto px-4 py-8 md:py-12 max-w-4xl">

          {/* Success Banner */}
          {showSuccess && (
            <div className="mb-8 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-sm px-6 py-5 flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-7 h-7 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h2 className="font-serif font-bold text-lg text-green-800 dark:text-green-300">
                  {successType === "paid" ? "Payment Successful!" : "Order Placed Successfully!"}
                </h2>
                <p className="text-sm text-green-700 dark:text-green-400 mt-1">
                  {successType === "paid"
                    ? "Your payment has been verified and your order is confirmed. We'll start processing it right away."
                    : "Your COD order has been placed. Pay when it arrives at your doorstep."}
                </p>
                <div className="flex gap-4 mt-3">
                  <Link href="/orders">
                    <Button size="sm" variant="outline" className="rounded-none text-green-700 border-green-300 hover:bg-green-50">
                      View All Orders
                    </Button>
                  </Link>
                  <Link href="/products">
                    <Button size="sm" variant="ghost" className="rounded-none text-green-700 hover:bg-green-50">
                      Continue Shopping
                    </Button>
                  </Link>
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
              <div className="bg-background border p-6 shadow-sm">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                  <div>
                    <p className="font-serif text-2xl font-bold mb-1">
                      Your Order #{(order as any).customerOrderNumber ?? order.id}
                    </p>
                    <p className="text-xs text-muted-foreground">Internal ID: #{order.id}</p>
                    <p className="text-muted-foreground text-sm mt-1">
                      Placed on {new Date(order.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric", month: "long", year: "numeric"
                      })}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {order.paymentStatus === "paid" ? (
                      <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium rounded-full">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Paid
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-medium rounded-full">
                        <Clock className="w-3.5 h-3.5" /> Payment Pending
                      </span>
                    )}
                    {/* Cancel button */}
                    {(order.status === "pending" || order.status === "confirmed") && (
                      <Button size="sm" variant="outline" className="rounded-none text-red-600 border-red-200 hover:bg-red-50 h-8 text-xs gap-1"
                        onClick={() => setIsCancelDialogOpen(true)}>
                        <XCircle className="w-3.5 h-3.5" /> Cancel Order
                      </Button>
                    )}
                    {/* Change address button */}
                    {!["shipped","out_for_delivery","delivered","cancelled"].includes(order.status) && (
                      <Button size="sm" variant="outline" className="rounded-none h-8 text-xs gap-1"
                        onClick={() => { setSelectedNewAddressId(null); setIsAddressDialogOpen(true); }}>
                        <Pencil className="w-3.5 h-3.5" /> Change Address
                      </Button>
                    )}
                    {/* Pay Online Now (COD → Online) */}
                    {order.paymentMethod === "cod" && order.paymentStatus !== "paid" && !["delivered","cancelled"].includes(order.status) && (
                      <Button size="sm" className="rounded-none h-8 text-xs gap-1 bg-green-600 hover:bg-green-700 text-white"
                        onClick={handlePayOnline} disabled={isPayingOnline}>
                        <Smartphone className="w-3.5 h-3.5" />
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
                  <div className="bg-background border p-6 shadow-sm">
                    <h2 className="font-serif text-lg font-semibold mb-4 border-b pb-2 flex items-center gap-2">
                      <PackageCheck className="w-5 h-5" />
                      Items Ordered
                    </h2>
                    <div className="space-y-4">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex gap-4">
                          <div className="w-20 h-24 bg-muted flex-shrink-0 overflow-hidden">
                            {item.productImage ? (
                              <img
                                src={item.productImage}
                                alt={item.productName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-secondary" />
                            )}
                          </div>
                          <div className="flex-1">
                            <Link
                              href={`/products/${item.productId}`}
                              className="font-medium hover:underline underline-offset-4"
                            >
                              {item.productName}
                            </Link>
                            {item.variant && (
                              <p className="text-sm text-muted-foreground mt-0.5">
                                Variant: {item.variant}
                              </p>
                            )}
                            <div className="flex justify-between items-center mt-2 text-sm">
                              <span className="text-muted-foreground">Qty: {item.quantity}</span>
                              <span className="font-semibold">
                                ₹{(item.price * item.quantity).toLocaleString("en-IN")}
                              </span>
                            </div>

                            {/* Return action or badge */}
                            <div className="flex justify-end mt-2 pt-2 border-t border-dashed border-muted/60">
                              {item.returnStatus === "pending" && (
                                <span className="inline-flex items-center text-xs px-2.5 py-1 bg-yellow-50 dark:bg-yellow-950/20 text-yellow-700 dark:text-yellow-400 font-medium rounded border border-yellow-200 dark:border-yellow-900">
                                  Return Requested (Pending)
                                </span>
                              )}
                              {item.returnStatus === "approved" && (
                                <span className="inline-flex items-center text-xs px-2.5 py-1 bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 font-medium rounded border border-green-200 dark:border-green-900">
                                  Return Approved & Refunded
                                </span>
                              )}
                              {item.returnStatus === "rejected" && (
                                <span className="inline-flex items-center text-xs px-2.5 py-1 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 font-medium rounded border border-red-200 dark:border-red-900">
                                  Return Rejected
                                </span>
                              )}
                              {item.returnStatus === null && order.status === "delivered" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 text-xs rounded-none"
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
                    <div className="bg-background border p-6 shadow-sm">
                      <h2 className="font-serif text-base font-semibold mb-3 border-b pb-2 flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        Delivery Address
                      </h2>
                      {order.address ? (
                        <div className="text-sm space-y-1">
                          <p className="font-medium">{order.address.fullName}</p>
                          <p className="text-muted-foreground">{order.address.addressLine}</p>
                          {order.address.landmark && (
                            <p className="text-muted-foreground">{order.address.landmark}</p>
                          )}
                          <p className="text-muted-foreground">
                            {order.address.city}, {order.address.state} — {order.address.pincode}
                          </p>
                          <p className="text-muted-foreground pt-1">
                            Ph: {order.address.phone}
                          </p>
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-sm">Address details not available.</p>
                      )}
                    </div>

                    <div className="bg-background border p-6 shadow-sm">
                      <h2 className="font-serif text-base font-semibold mb-3 border-b pb-2 flex items-center gap-2">
                        <CreditCard className="w-4 h-4" />
                        Payment Details
                      </h2>
                      <div className="text-sm space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Method</span>
                          <span className="uppercase font-medium">{order.paymentMethod}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Status</span>
                          <span
                            className={`capitalize font-medium ${
                              order.paymentStatus === "paid"
                                ? "text-green-600"
                                : "text-amber-600"
                            }`}
                          >
                            {order.paymentStatus ?? "Pending"}
                          </span>
                        </div>
                        {order.razorpayPaymentId && (
                          <div className="flex flex-col gap-0.5 pt-1">
                            <span className="text-muted-foreground text-xs">Payment ID</span>
                            <span className="font-mono text-xs break-all">
                              {order.razorpayPaymentId}
                            </span>
                          </div>
                        )}
                        {order.razorpayOrderId && !order.razorpayPaymentId && (
                          <div className="flex flex-col gap-0.5 pt-1">
                            <span className="text-muted-foreground text-xs">Order Ref</span>
                            <span className="font-mono text-xs break-all">
                              {order.razorpayOrderId}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Summary sidebar */}
                <div className="bg-muted/30 p-6 h-fit border">
                  <h2 className="font-serif font-semibold text-base border-b pb-3 mb-4">
                    Price Summary
                  </h2>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>₹{(order.subtotal ?? 0).toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Delivery</span>
                      <span>
                        {(order.deliveryCharge ?? 0) === 0
                          ? "Free"
                          : `₹${(order.deliveryCharge ?? 0).toLocaleString("en-IN")}`}
                      </span>
                    </div>
                    {order.discount != null && order.discount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Discount</span>
                        <span>−₹{order.discount.toLocaleString("en-IN")}</span>
                      </div>
                    )}
                    {order.couponCode && (
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Coupon</span>
                        <span className="font-mono">{order.couponCode}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t pt-3 mt-3 text-base">
                      <span className="font-bold">Total</span>
                      <span className="font-bold">
                        ₹{order.totalAmount.toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>

                  <Link href="/products" className="block mt-6">
                    <Button variant="outline" className="w-full rounded-none">
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
