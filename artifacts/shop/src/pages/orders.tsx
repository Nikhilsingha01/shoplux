import { AppLayout } from "@/components/layout/AppLayout";
import { useListOrders } from "@workspace/api-client-react";
import { Show, useUser } from "@clerk/react";
import { Link, Redirect } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Package } from "lucide-react";

export default function OrdersList() {
  const { data: ordersData, isLoading } = useListOrders();

  return (
    <AppLayout>
      <Show when="signed-out">
        <Redirect to="/sign-in" />
      </Show>
      <Show when="signed-in">
        <div className="container mx-auto px-4 py-8 md:py-12 max-w-4xl">
          <h1 className="text-3xl font-serif font-bold mb-8">Order History</h1>

          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : !ordersData?.orders || ordersData.orders.length === 0 ? (
            <div className="text-center py-24 bg-muted/30 border rounded-sm">
              <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-6">You haven't placed any orders yet.</p>
              <Link href="/products">
                <Button className="rounded-none tracking-wide uppercase">Start Shopping</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {ordersData.orders.map((order) => (
                <div key={order.id} className="border bg-background p-6 rounded-sm shadow-sm">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 border-b pb-4 gap-4">
                    <div>
                      <p className="font-semibold text-lg font-serif">Order #{order.customerOrderNumber ?? order.id}</p>
                      <p className="text-sm text-muted-foreground">{new Date(order.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex flex-col sm:items-end gap-2">
                      <p className="font-bold">₹{order.totalAmount.toLocaleString('en-IN')}</p>
                      <div className="flex gap-2">
                        <span className="text-xs px-2 py-1 bg-secondary text-secondary-foreground rounded capitalize">
                          {order.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-4 mb-4">
                    {order.items.slice(0, 4).map((item) => (
                      <div key={item.id} className="w-16 h-16 bg-muted relative">
                        {item.productImage ? (
                          <img src={item.productImage} alt={item.productName} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground">No img</div>
                        )}
                        {item.quantity > 1 && (
                          <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-[10px] w-5 h-5 flex items-center justify-center rounded-full">
                            {item.quantity}
                          </span>
                        )}
                      </div>
                    ))}
                    {order.items.length > 4 && (
                      <div className="w-16 h-16 bg-muted flex items-center justify-center text-sm font-medium text-muted-foreground">
                        +{order.items.length - 4}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-end">
                    <Link href={`/orders/${order.id}`}>
                      <Button variant="outline" size="sm" className="rounded-none tracking-wide">View Details</Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Show>
    </AppLayout>
  );
}
