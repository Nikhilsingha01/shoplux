import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/react";

interface MeResponse {
  isSignedIn: boolean;
  isAdmin: boolean;
  clerkUserId?: string;
  user?: Record<string, unknown> | null;
  storeName?: string;
  deliveryCharge?: number;
  freeDeliveryAbove?: number;
  trustBadge1?: string;
  trustBadge2?: string;
  trustBadge3?: string;
}

export function useMe() {
  const { isSignedIn, getToken } = useAuth();

  return useQuery<MeResponse>({
    queryKey: ["me"],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch("/api/me", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return { isSignedIn: false, isAdmin: false };
      return res.json();
    },
    staleTime: 60_000,
  });
}

export function useAdminStatus() {
  const { data, isLoading } = useMe();
  return {
    isAdmin: data?.isAdmin ?? false,
    isLoading,
    storeName: data?.storeName ?? "ShopLux",
    deliveryCharge: data?.deliveryCharge ?? 49,
    freeDeliveryAbove: data?.freeDeliveryAbove ?? 999,
    trustBadge1: data?.trustBadge1 ?? "Free delivery on orders above ₹999",
    trustBadge2: data?.trustBadge2 ?? "Secure & encrypted payments",
    trustBadge3: data?.trustBadge3 ?? "7-day hassle-free returns",
  };
}
