import { AppLayout } from "@/components/layout/AppLayout";
import { useCart } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@clerk/react";
import { useAdminStatus } from "@/lib/useAdmin";
import { useListProducts } from "@workspace/api-client-react";
import { ProductCard } from "@/components/ProductCard";

export default function Cart() {
  const { items, updateQuantity, removeItem, getSubtotal } = useCart();
  const { isSignedIn } = useAuth();
  const { deliveryCharge: globalDeliveryCharge, freeDeliveryAbove } = useAdminStatus();
  const subtotal = getSubtotal();

  const { data: recommendedData } = useListProducts({ limit: 8 });
  const recommendedProducts = recommendedData?.products
    ? recommendedData.products.filter(p => !items.some(item => item.productId === p.id))
    : [];

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
    : (subtotal >= freeDeliveryAbove ? 0 : globalDeliveryCharge);

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 md:py-12">
        <h1 className="text-3xl font-serif font-bold mb-8">Your Cart</h1>
        
        {items.length === 0 ? (
          <div className="text-center py-24 bg-muted/30">
            <p className="text-muted-foreground mb-6">Your cart is empty.</p>
            <Link href="/products">
              <Button className="rounded-none tracking-wide uppercase">Continue Shopping</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2 space-y-6">
              {items.map((item, idx) => (
                <div key={`${item.productId}-${item.variant || 'none'}-${idx}`} className="flex gap-4 border-b pb-6">
                  <div className="w-24 h-32 bg-muted flex-shrink-0">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-secondary"></div>
                    )}
                  </div>
                  
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start">
                        <h3 className="font-medium text-lg">{item.name}</h3>
                        <p className="font-semibold">₹{(item.price * item.quantity).toLocaleString('en-IN')}</p>
                      </div>
                      {item.variant && (
                        <p className="text-muted-foreground text-sm mt-1">Variant: {item.variant}</p>
                      )}
                      <p className="text-muted-foreground text-sm mt-1">₹{item.price.toLocaleString('en-IN')} each</p>
                    </div>
                    
                    <div className="flex justify-between items-end mt-4">
                      <div className="flex items-center border border-border w-fit">
                        <button 
                          className="p-2 hover:bg-muted"
                          onClick={() => updateQuantity(item.productId, item.variant, item.quantity - 1)}
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-10 text-center text-sm font-medium">{item.quantity}</span>
                        <button 
                          className="p-2 hover:bg-muted"
                          onClick={() => updateQuantity(item.productId, item.variant, item.quantity + 1)}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <button 
                        className="text-muted-foreground hover:text-destructive flex items-center gap-1 text-sm transition-colors"
                        onClick={() => removeItem(item.productId, item.variant)}
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-muted/30 p-6 md:p-8 h-fit space-y-6">
              <h2 className="font-serif font-semibold text-xl border-b pb-4">Order Summary</h2>
              
              <div className="space-y-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">₹{subtotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivery</span>
                  <span className="font-medium">{deliveryCharge === 0 ? "Free" : `₹${deliveryCharge}`}</span>
                </div>
                <div className="flex justify-between border-t pt-4 text-base">
                  <span className="font-bold">Total</span>
                  <span className="font-bold">₹{(subtotal + deliveryCharge).toLocaleString('en-IN')}</span>
                </div>
                <p className="text-xs text-muted-foreground text-right mt-1">Inclusive of GST</p>
              </div>

              {isSignedIn ? (
                <Link href="/checkout" className="block">
                  <Button className="w-full rounded-none h-12 tracking-wide uppercase font-medium">
                    Proceed to Checkout
                  </Button>
                </Link>
              ) : (
                <div className="space-y-4">
                  <Link href="/sign-in" className="block">
                    <Button className="w-full rounded-none h-12 tracking-wide uppercase font-medium">
                      Sign in to Checkout
                    </Button>
                  </Link>
                  <p className="text-xs text-center text-muted-foreground">You need an account to place an order.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {items.length > 0 && recommendedProducts.length > 0 && (
          <div className="mt-16 border-t pt-12">
            <h3 className="text-2xl font-serif font-bold mb-8">Frequently Bought Together</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {recommendedProducts.slice(0, 4).map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
