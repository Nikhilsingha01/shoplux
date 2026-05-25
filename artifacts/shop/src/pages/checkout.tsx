import { AppLayout } from "@/components/layout/AppLayout";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useCart } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link, useLocation } from "wouter";
import { Show, useUser } from "@clerk/react";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  useListAddresses,
  useCreateOrder,
  useCreatePaymentOrder,
  useVerifyPayment,
  useValidateCoupon,
} from "@workspace/api-client-react";
import { useMe } from "@/lib/useAdmin";
import {
  CheckCircle2,
  Tag,
  X,
  MapPin,
  CreditCard,
  Wallet,
  Loader2,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description: string;
  image?: string;
  prefill?: { name?: string; email?: string; contact?: string; method?: string };
  theme?: { color?: string };
  handler: (response: RazorpaySuccessResponse) => void;
  modal?: { ondismiss?: () => void };
  config?: {
    display?: {
      blocks?: Record<string, {
        name?: string;
        instruments?: Array<{
          method: string;
          flows?: string[];
        }>;
      }>;
      sequence?: string[];
      preferences?: { show_default_blocks?: boolean };
    };
  };
}

interface RazorpayInstance {
  open(): void;
  on(event: string, callback: (response: RazorpayFailureResponse) => void): void;
}

interface RazorpaySuccessResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayFailureResponse {
  error: {
    code?: string;
    description?: string;
    reason?: string;
  };
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const existing = document.querySelector('script[src*="checkout.razorpay.com"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(true));
      existing.addEventListener("error", () => resolve(false));
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function Checkout() {
  const { items, getSubtotal, clearCart } = useCart();
  const [, setLocation] = useLocation();
  const { user } = useUser();
  const { data: me } = useMe();

  const subtotal = getSubtotal();
  const freeDeliveryAbove = me?.freeDeliveryAbove ?? 999;
  const baseDeliveryCharge = me?.deliveryCharge ?? 49;

  // Sum of per-product delivery charges for products that have it enabled
  const perProductDeliveryTotal = items.reduce((sum, item) => {
    if (item.isDeliveryChargeApplicable) {
      return sum + (item.deliveryCharge ?? 0) * item.quantity;
    }
    return sum;
  }, 0);

  const hasPerProductDelivery = items.some(item => item.isDeliveryChargeApplicable);

  const deliveryCharge = hasPerProductDelivery 
    ? perProductDeliveryTotal 
    : (subtotal >= freeDeliveryAbove ? 0 : baseDeliveryCharge);

  const [selectedAddress, setSelectedAddress] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"razorpay" | "cod">("razorpay");
  const [isPaymentLoading, setIsPaymentLoading] = useState(false);
  const [razorpayReady, setRazorpayReady] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Mock payment dialog states
  const [showMockPaymentDialog, setShowMockPaymentDialog] = useState(false);
  const [mockPaymentOrderData, setMockPaymentOrderData] = useState<{ id: string; key: string } | null>(null);
  const [mockOrderInput, setMockOrderInput] = useState<any>(null);
  const [isMockProcessing, setIsMockProcessing] = useState(false);

  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discount: number;
    discountType: string;
  } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  const { data: addresses } = useListAddresses();
  const createOrderMutation = useCreateOrder();
  const createPaymentOrderMutation = useCreatePaymentOrder();
  const verifyPaymentMutation = useVerifyPayment();
  const validateCouponMutation = useValidateCoupon();

  // Pre-select default address
  useEffect(() => {
    if (addresses && addresses.length > 0 && selectedAddress === null) {
      const def = addresses.find((a) => a.isDefault);
      setSelectedAddress(def?.id ?? addresses[0].id);
    }
  }, [addresses, selectedAddress]);

  // Pre-load Razorpay SDK
  useEffect(() => {
    loadRazorpayScript().then((ok) => setRazorpayReady(ok));
  }, []);

  const couponDiscount = appliedCoupon
    ? appliedCoupon.discountType === "percent"
      ? Math.min(Math.round((subtotal * appliedCoupon.discount) / 100), 5000)
      : appliedCoupon.discount
    : 0;

  const total = Math.max(0, subtotal + deliveryCharge - couponDiscount);

  const handleApplyCoupon = useCallback(() => {
    if (!couponCode.trim()) return;
    setCouponError(null);
    validateCouponMutation.mutate(
      { data: { code: couponCode.trim().toUpperCase(), orderAmount: subtotal } },
      {
        onSuccess: (coupon) => {
          setAppliedCoupon({
            code: coupon.code,
            discount: Number(coupon.discountValue),
            discountType: coupon.discountType,
          });
          toast.success(`Coupon "${coupon.code}" applied`);
          setCouponCode("");
          setCouponError(null);
        },
        onError: (err: any) => {
          const errorMsg = err.data?.error || err.message || "Invalid or expired coupon code";
          setCouponError(errorMsg);
        },
      }
    );
  }, [couponCode, subtotal, validateCouponMutation]);

  const handleRemoveCoupon = useCallback(() => {
    setAppliedCoupon(null);
    setCouponError(null);
    toast("Coupon removed");
  }, []);

  const handlePlaceOrder = useCallback(async () => {
    if (!selectedAddress) {
      toast.error("Please select a delivery address");
      return;
    }
    if (items.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    setPaymentError(null);
    setIsPaymentLoading(true);

    const orderInput = {
      items: items.map((i) => ({
        productId: i.productId,
        price: i.price,
        quantity: i.quantity,
        variant: i.variant ?? undefined,
      })),
      addressId: selectedAddress,
      paymentMethod,
      totalAmount: total,
      subtotal,
      deliveryCharge,
      discount: couponDiscount,
      couponCode: appliedCoupon?.code ?? undefined,
    };

    if (paymentMethod === "cod") {
      createOrderMutation.mutate(
        { data: orderInput },
        {
          onSuccess: (order) => {
            clearCart();
            setLocation(`/orders/${order.id}?success=cod`);
          },
          onError: () => {
            setIsPaymentLoading(false);
            toast.error("Failed to place order. Please try again.");
          },
        }
      );
      return;
    }

    // Razorpay flow
    if (!razorpayReady) {
      const ok = await loadRazorpayScript();
      if (!ok) {
        setIsPaymentLoading(false);
        toast.error("Could not load payment gateway. Check your internet connection.");
        return;
      }
      setRazorpayReady(true);
    }

    createPaymentOrderMutation.mutate(
      { data: { amount: total, currency: "INR" } }, // amount in rupees — server converts to paise
      {
        onSuccess: (paymentOrder) => {
          if (paymentOrder.key === "rzp_test_mock") {
            setMockPaymentOrderData(paymentOrder as { id: string; key: string });
            setMockOrderInput(orderInput);
            setShowMockPaymentDialog(true);
            return;
          }

          const options: RazorpayOptions = {
            key: paymentOrder.key ?? "",
            amount: paymentOrder.amount,
            currency: paymentOrder.currency,
            order_id: paymentOrder.id,
            name: me?.storeName ?? "ShopLux",
            description: `${items.length} item${items.length !== 1 ? "s" : ""} from ${me?.storeName ?? "ShopLux"}`,
            prefill: {
              name: user?.fullName ?? "",
              email: user?.primaryEmailAddress?.emailAddress ?? "",
              contact: (user?.phoneNumbers?.[0]?.phoneNumber ?? ""),
            },
            theme: { color: "#d97706" },
            modal: {
              ondismiss: () => {
                setIsPaymentLoading(false);
                setPaymentError("Payment was cancelled. No money was deducted.");
              },
            },
            handler: (response: RazorpaySuccessResponse) => {
              // Payment captured — create order in DB, then verify
              createOrderMutation.mutate(
                { data: { ...orderInput, razorpayOrderId: paymentOrder.id } },
                {
                  onSuccess: (order) => {
                    verifyPaymentMutation.mutate(
                      {
                        data: {
                          razorpayOrderId: response.razorpay_order_id,
                          razorpayPaymentId: response.razorpay_payment_id,
                          razorpaySignature: response.razorpay_signature,
                          orderId: order.id,
                        },
                      },
                      {
                        onSuccess: (result) => {
                          if (result.success) {
                            clearCart();
                            setLocation(`/orders/${order.id}?success=paid`);
                          } else {
                            setIsPaymentLoading(false);
                            setPaymentError(
                              "Payment verification failed. Please contact support with your payment ID: " +
                                response.razorpay_payment_id
                            );
                          }
                        },
                        onError: () => {
                          setIsPaymentLoading(false);
                          setPaymentError(
                            "Payment verification failed. Please contact support with your payment ID: " +
                              response.razorpay_payment_id
                          );
                        },
                      }
                    );
                  },
                  onError: () => {
                    setIsPaymentLoading(false);
                    setPaymentError(
                      "Order creation failed after payment. Please contact support with payment ID: " +
                        response.razorpay_payment_id
                    );
                  },
                }
              );
            },
          };

          const rzp = new window.Razorpay(options);
          rzp.on("payment.failed", (response: RazorpayFailureResponse) => {
            setIsPaymentLoading(false);
            const reason =
              response.error?.description ||
              response.error?.reason ||
              "Payment failed. Please try again.";
            setPaymentError(reason);
            toast.error("Payment failed: " + reason);
          });
          rzp.open();
        },
        onError: () => {
          setIsPaymentLoading(false);
          toast.error("Failed to initiate payment. Please try again.");
        },
      }
    );
  }, [
    selectedAddress,
    items,
    paymentMethod,
    total,
    subtotal,
    deliveryCharge,
    couponDiscount,
    appliedCoupon,
    razorpayReady,
    me,
    user,
    setLocation,
    clearCart,
  ]);

  const handleMockPaymentSuccess = () => {
    if (!mockPaymentOrderData || !mockOrderInput) return;
    setIsMockProcessing(true);
    
    // Simulate Razorpay successful transaction details
    const mockResponse = {
      razorpay_order_id: mockPaymentOrderData.id,
      razorpay_payment_id: "pay_mock_" + Date.now(),
      razorpay_signature: "sig_mock_" + Date.now(),
    };

    createOrderMutation.mutate(
      { data: { ...mockOrderInput, razorpayOrderId: mockPaymentOrderData.id } },
      {
        onSuccess: (order) => {
          verifyPaymentMutation.mutate(
            {
              data: {
                razorpayOrderId: mockResponse.razorpay_order_id,
                razorpayPaymentId: mockResponse.razorpay_payment_id,
                razorpaySignature: mockResponse.razorpay_signature,
                orderId: order.id,
              },
            },
            {
              onSuccess: (result) => {
                setIsMockProcessing(false);
                setShowMockPaymentDialog(false);
                if (result.success) {
                  clearCart();
                  setLocation(`/orders/${order.id}?success=paid`);
                } else {
                  setIsPaymentLoading(false);
                  setPaymentError("Mock payment verification failed.");
                  toast.error("Mock payment verification failed.");
                }
              },
              onError: () => {
                setIsMockProcessing(false);
                setShowMockPaymentDialog(false);
                setIsPaymentLoading(false);
                setPaymentError("Mock payment verification failed.");
                toast.error("Mock payment verification failed.");
              },
            }
          );
        },
        onError: () => {
          setIsMockProcessing(false);
          setShowMockPaymentDialog(false);
          setIsPaymentLoading(false);
          setPaymentError("Order creation failed during mock payment.");
          toast.error("Order creation failed.");
        },
      }
    );
  };

  const handleMockPaymentCancel = () => {
    setShowMockPaymentDialog(false);
    setIsPaymentLoading(false);
    setPaymentError("Mock payment was cancelled. No money was deducted.");
    toast.error("Payment cancelled");
  };

  const isPending =
    isPaymentLoading ||
    isMockProcessing ||
    createOrderMutation.isPending ||
    createPaymentOrderMutation.isPending ||
    verifyPaymentMutation.isPending;

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 md:py-12">
        <h1 className="text-3xl font-serif font-bold mb-8">Checkout</h1>

        <Show when="signed-out">
          <div className="text-center py-16">
            <ShieldCheck className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Sign in to continue</h2>
            <p className="text-muted-foreground mb-6">You need an account to place an order.</p>
            <Link href="/sign-in">
              <Button className="rounded-none tracking-wide uppercase h-12 px-8">Sign In</Button>
            </Link>
          </div>
        </Show>

        <Show when="signed-in">
          {items.length === 0 ? (
            <div className="text-center py-16 bg-muted/30">
              <p className="text-muted-foreground mb-6">Your cart is empty.</p>
              <Link href="/products">
                <Button className="rounded-none tracking-wide uppercase">Continue Shopping</Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
              {/* Left column — steps */}
              <div className="lg:col-span-2 space-y-8">

                {/* Payment error */}
                {paymentError && (
                  <div className="flex items-start gap-3 bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-sm text-sm">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Payment Issue</p>
                      <p className="mt-0.5 text-destructive/80">{paymentError}</p>
                    </div>
                    <button onClick={() => setPaymentError(null)} className="ml-auto">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Step 1 — Address */}
                <section>
                  <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-foreground text-background text-xs flex items-center justify-center font-bold">1</span>
                    Delivery Address
                    <MapPin className="w-4 h-4 text-muted-foreground ml-1" />
                  </h2>

                  {addresses && addresses.length > 0 ? (
                    <div className="space-y-3">
                      {addresses.map((address) => (
                        <button
                          key={address.id}
                          type="button"
                          onClick={() => setSelectedAddress(address.id)}
                          className={cn(
                            "w-full text-left border p-4 transition-colors focus:outline-none",
                            selectedAddress === address.id
                              ? "border-primary bg-primary/5 ring-1 ring-primary"
                              : "border-border hover:border-primary/50"
                          )}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-medium text-sm">{address.fullName}</span>
                            <div className="flex items-center gap-2">
                              {address.isDefault && (
                                <span className="text-xs bg-muted px-2 py-0.5 rounded">Default</span>
                              )}
                              {selectedAddress === address.id && (
                                <CheckCircle2 className="w-4 h-4 text-primary" />
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {address.addressLine}
                            {address.landmark ? `, ${address.landmark}` : ""}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {address.city}, {address.state} — {address.pincode}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">Ph: {address.phone}</p>
                        </button>
                      ))}
                      <Link href="/account" className="inline-block text-sm text-primary underline-offset-4 hover:underline mt-1">
                        + Add a new address
                      </Link>
                    </div>
                  ) : (
                    <div className="border border-dashed p-6 text-center">
                      <MapPin className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground text-sm mb-3">No saved addresses found.</p>
                      <Link href="/account">
                        <Button variant="outline" size="sm" className="rounded-none">
                          Add Address in Account
                        </Button>
                      </Link>
                    </div>
                  )}
                </section>

                {/* Step 2 — Payment */}
                <section>
                  <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-foreground text-background text-xs flex items-center justify-center font-bold">2</span>
                    Payment Method
                    <CreditCard className="w-4 h-4 text-muted-foreground ml-1" />
                  </h2>

                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("razorpay")}
                      className={cn(
                        "w-full text-left border p-4 transition-colors focus:outline-none",
                        paymentMethod === "razorpay"
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <CreditCard className="w-5 h-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-sm">Online Payment</p>
                            <p className="text-xs text-muted-foreground">Cards, UPI, NetBanking, Wallets</p>
                          </div>
                        </div>
                        {paymentMethod === "razorpay" && (
                          <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                        )}
                      </div>
                      {!razorpayReady && paymentMethod === "razorpay" && (
                        <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" /> Loading payment gateway…
                        </p>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod("cod")}
                      className={cn(
                        "w-full text-left border p-4 transition-colors focus:outline-none",
                        paymentMethod === "cod"
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Wallet className="w-5 h-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-sm">Cash on Delivery</p>
                            <p className="text-xs text-muted-foreground">Pay when your order arrives</p>
                          </div>
                        </div>
                        {paymentMethod === "cod" && (
                          <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                        )}
                      </div>
                    </button>
                  </div>
                </section>

                {/* Step 3 — Coupon (optional) */}
                <section>
                  <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-foreground text-background text-xs flex items-center justify-center font-bold">3</span>
                    Coupon Code
                    <Tag className="w-4 h-4 text-muted-foreground ml-1" />
                    <span className="text-xs text-muted-foreground font-normal">(optional)</span>
                  </h2>

                  {appliedCoupon ? (
                    <div className="flex items-center justify-between bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 px-4 py-3 rounded-sm">
                      <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                        <Tag className="w-4 h-4" />
                        <span className="font-mono font-semibold text-sm">{appliedCoupon.code}</span>
                        <span className="text-xs">
                          — Save ₹{couponDiscount.toLocaleString("en-IN")}
                        </span>
                      </div>
                      <button onClick={handleRemoveCoupon} className="text-muted-foreground hover:text-foreground">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Enter coupon code"
                          value={couponCode}
                          onChange={(e) => {
                            setCouponCode(e.target.value.toUpperCase());
                            if (couponError) setCouponError(null);
                          }}
                          onKeyDown={(e) => e.key === "Enter" && handleApplyCoupon()}
                          className="rounded-none font-mono uppercase tracking-wider"
                          disabled={validateCouponMutation.isPending}
                        />
                        <Button
                          variant="outline"
                          className="rounded-none px-6 flex-shrink-0"
                          onClick={handleApplyCoupon}
                          disabled={!couponCode.trim() || validateCouponMutation.isPending}
                        >
                          {validateCouponMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            "Apply"
                          )}
                        </Button>
                      </div>
                      {couponError && (
                        <p className="text-xs text-destructive mt-1.5 font-medium">{couponError}</p>
                      )}
                    </div>
                  )}
                </section>
              </div>

              {/* Right column — Order summary */}
              <div className="bg-muted/30 p-6 md:p-8 h-fit space-y-5 border">
                <h2 className="font-serif font-semibold text-xl border-b pb-4">Order Summary</h2>

                {/* Items */}
                <div className="space-y-3 text-sm max-h-[220px] overflow-y-auto pr-1">
                  {items.map((item, idx) => (
                    <div key={`${item.productId}-${item.variant ?? ""}-${idx}`} className="flex justify-between items-start gap-3">
                      <div className="flex gap-2 min-w-0">
                        {item.image && (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-10 h-12 object-cover flex-shrink-0 bg-muted"
                          />
                        )}
                        <div className="min-w-0">
                          <p className="font-medium truncate">{item.name}</p>
                          {item.variant && (
                            <p className="text-xs text-muted-foreground">{item.variant}</p>
                          )}
                          <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                        </div>
                      </div>
                      <span className="font-medium flex-shrink-0">
                        ₹{(item.price * item.quantity).toLocaleString("en-IN")}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Breakdown */}
                <div className="space-y-3 text-sm border-t pt-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>₹{subtotal.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Delivery</span>
                    <span className={deliveryCharge === 0 ? "text-green-600 font-medium" : ""}>
                      {deliveryCharge === 0 ? "Free" : `₹${deliveryCharge}`}
                    </span>
                  </div>
                  {deliveryCharge === 0 && (
                    <p className="text-xs text-green-600">
                      You saved ₹{baseDeliveryCharge} on delivery
                    </p>
                  )}
                  {couponDiscount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Coupon ({appliedCoupon?.code})</span>
                      <span>−₹{couponDiscount.toLocaleString("en-IN")}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t pt-3 text-base">
                    <span className="font-bold">Total</span>
                    <span className="font-bold text-lg">₹{total.toLocaleString("en-IN")}</span>
                  </div>
                  <p className="text-xs text-muted-foreground text-right">Inclusive of all taxes</p>
                </div>

                {/* CTA */}
                <Button
                  className="w-full rounded-none h-14 tracking-wide uppercase font-semibold text-base"
                  onClick={handlePlaceOrder}
                  disabled={isPending || items.length === 0 || !selectedAddress}
                >
                  {isPending ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {createPaymentOrderMutation.isPending
                        ? "Preparing Payment..."
                        : verifyPaymentMutation.isPending
                        ? "Verifying Payment..."
                        : "Processing..."}
                    </span>
                  ) : paymentMethod === "cod" ? (
                    "Place COD Order"
                  ) : (
                    "Pay Securely"
                  )}
                </Button>

                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>100% secure checkout • Powered by Razorpay</span>
                </div>
              </div>
            </div>
          )}
        </Show>
      </div>

      {/* Full-screen loading overlay for payment processing */}
      {isPending && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-sm font-medium">
            {createPaymentOrderMutation.isPending
              ? "Connecting to payment gateway…"
              : verifyPaymentMutation.isPending
              ? "Verifying your payment…"
              : createOrderMutation.isPending
              ? "Placing your order…"
              : "Processing…"}
          </p>
          <p className="text-xs text-muted-foreground">Please do not close this window</p>
        </div>
      )}
      {/* Simulated Payment Dialog Modal */}
      <Dialog open={showMockPaymentDialog} onOpenChange={(open) => {
        if (!open && !isMockProcessing) {
          handleMockPaymentCancel();
        }
      }}>
        <DialogContent className="sm:max-w-[440px] rounded-none border border-border bg-background p-6 font-sans">
          <DialogHeader className="text-left space-y-2 border-b border-border pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="font-serif text-lg font-bold text-foreground">
                  Simulate Payment Gateway
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Razorpay Sandboxed Environment (Key: rzp_test_mock)
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="py-5 space-y-4 text-sm">
            <div className="bg-muted/40 p-4 border border-border flex flex-col gap-2.5">
              <div className="flex justify-between text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                <span>Description</span>
                <span>Amount</span>
              </div>
              <div className="flex justify-between font-medium text-foreground">
                <span className="truncate max-w-[240px]">
                  {items.length} item{items.length !== 1 ? "s" : ""} from {me?.storeName ?? "ShopLux"}
                </span>
                <span className="font-sans font-bold">
                  ₹{total.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="text-xs text-muted-foreground pt-1 border-t border-dashed border-border/80 flex justify-between">
                <span>Mock Order ID:</span>
                <span className="font-mono text-[11px] select-all bg-muted px-1.5 py-0.5 rounded text-foreground">
                  {mockPaymentOrderData?.id}
                </span>
              </div>
            </div>

            <div className="rounded border border-amber-200/50 bg-amber-500/5 p-3 flex gap-3 text-xs text-amber-800 dark:text-amber-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
              <div>
                <span className="font-semibold block">Development Mode Simulation</span>
                No real transactions or external SDK loads will occur. You can simulate direct payment success or mock decline.
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-4 border-t border-border sm:justify-end">
            <Button
              variant="outline"
              className="rounded-none border border-border font-medium text-xs tracking-wider uppercase h-10 w-full sm:w-auto"
              onClick={handleMockPaymentCancel}
              disabled={isMockProcessing}
            >
              Cancel / Decline
            </Button>
            <Button
              className="rounded-none font-medium text-xs tracking-wider uppercase h-10 w-full sm:w-auto"
              onClick={handleMockPaymentSuccess}
              disabled={isMockProcessing}
            >
              {isMockProcessing ? "Verifying..." : "Simulate Success"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
