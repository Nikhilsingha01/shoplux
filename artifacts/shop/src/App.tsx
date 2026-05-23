import React, { useEffect, useRef } from "react";
import { ClerkProvider, SignIn, SignUp, useClerk, useUser, useAuth } from "@clerk/react";
import { setAuthTokenGetter, setDevUserHeadersGetter } from "@workspace/api-client-react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme";
import AdminLogin from "./pages/AdminLogin";

// Setup
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || "pk_test_ZHVtbXkuY2xlcmsuYWNjb3VudHMuZGV2JA";
console.log("DIAGNOSTIC frontend - clerkPubKey:", clerkPubKey);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || "/" : path;
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "hsl(43 74% 49%)",
    colorForeground: "hsl(0 0% 9%)",
    colorMutedForeground: "hsl(0 0% 45%)",
    colorDanger: "hsl(0 84% 60%)",
    colorBackground: "hsl(0 0% 100%)",
    colorInput: "hsl(0 0% 90%)",
    colorInputForeground: "hsl(0 0% 9%)",
    colorNeutral: "hsl(0 0% 90%)",
    fontFamily: "'Outfit', sans-serif",
    borderRadius: "0.25rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-white rounded-xl w-[440px] max-w-full overflow-hidden border border-border shadow-xl",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "font-serif text-2xl font-bold",
    headerSubtitle: "text-muted-foreground",
    socialButtonsBlockButtonText: "font-medium",
    formFieldLabel: "font-medium text-sm",
    footerActionLink: "text-primary hover:underline",
    footerActionText: "text-muted-foreground",
    dividerText: "text-muted-foreground text-xs",
    identityPreviewEditButton: "text-primary hover:text-primary/80",
    formFieldSuccessText: "text-green-600",
    alertText: "text-sm",
    logoBox: "mb-4",
    logoImage: "h-8 object-contain",
    socialButtonsBlockButton: "border-border hover:bg-secondary",
    formButtonPrimary: "bg-primary text-primary-foreground hover:bg-primary/90 font-medium tracking-wide",
    formFieldInput: "border-input bg-transparent text-foreground",
    footerAction: "bg-secondary p-4 rounded-b-xl border-t border-border",
    dividerLine: "bg-border",
    alert: "bg-destructive/10 border-destructive/20 text-destructive",
    otpCodeFieldInput: "border-input",
    formFieldRow: "gap-2",
    main: "p-6",
  },
};

// Pages
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Products from "@/pages/products";
import ProductDetail from "@/pages/product-detail";
import Categories from "@/pages/categories";
import Cart from "@/pages/cart";
import Checkout from "@/pages/checkout";
import Account from "@/pages/account";
import OrdersList from "@/pages/orders";
import OrderDetail from "@/pages/order-detail";
import FAQ from "@/pages/static/faq";
import Terms from "@/pages/static/terms";
import PrivacyPolicy from "@/pages/static/privacy";
import ReturnPolicy from "@/pages/static/return-policy";

// Admin pages
import AdminDashboard from "@/pages/admin";
import AdminProducts from "@/pages/admin/products";
import AdminOrders from "@/pages/admin/orders";
import AdminReturns from "@/pages/admin/returns";
import AdminCategories from "@/pages/admin/categories";
import AdminBanners from "@/pages/admin/banners";
import AdminCoupons from "@/pages/admin/coupons";
import AdminSettings from "@/pages/admin/settings";
import AdminUsers from "@/pages/admin/users";
import AdminSupport from "@/pages/admin/support";
import AdminEmails from "@/pages/admin/emails";
import Support from "@/pages/support";

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignIn signUpUrl={`${basePath}/sign-up`} forceRedirectUrl={`${basePath}/`} />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignUp signInUrl={`${basePath}/sign-in`} forceRedirectUrl={`${basePath}/`} />
    </div>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        queryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);

  return null;
}

function ClerkTokenInitializer() {
  const { getToken } = useAuth();
  const { user } = useUser();

  // Synchronous sync during render phase!
  if (typeof window !== "undefined") {
    if (user) {
      localStorage.setItem("dev_user_id", user.id);
      localStorage.setItem("dev_user_email", user.primaryEmailAddress?.emailAddress || "");
      localStorage.setItem("dev_user_name", user.fullName || "");
    } else {
      localStorage.removeItem("dev_user_id");
      localStorage.removeItem("dev_user_email");
      localStorage.removeItem("dev_user_name");
    }
  }

  useEffect(() => {
    if (user) {
      console.log("ClerkTokenInitializer: Registering dev user headers for", user.primaryEmailAddress?.emailAddress);
      setDevUserHeadersGetter(() => ({
        "x-dev-user-id": user.id,
        "x-dev-user-email": user.primaryEmailAddress?.emailAddress || "",
        "x-dev-user-name": user.fullName || "",
      }));
    } else {
      console.log("ClerkTokenInitializer: Clearing dev user headers");
      setDevUserHeadersGetter(null);
    }
    return () => {
      setDevUserHeadersGetter(null);
    };
  }, [user]);

  useEffect(() => {
    console.log("ClerkTokenInitializer: Registering token getter...");
    setAuthTokenGetter(async () => {
      try {
        const token = await getToken();
        console.log("ClerkTokenInitializer: Fetched active Clerk token:", token ? "FOUND (Bearer auth active)" : "MISSING (No active session)");
        return token;
      } catch (err) {
        console.error("ClerkTokenInitializer: Failed to fetch token:", err);
        return null;
      }
    });
    return () => {
      setAuthTokenGetter(null);
    };
  }, [getToken]);

  return null;
}

function ScrollToTop() {
  const [location] = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location]);

  return null;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <ClerkTokenInitializer />
        <ScrollToTop />
        <Switch>
          <Route path="/" component={Home} />
          
          <Route path="/products" component={Products} />
          <Route path="/products/:id" component={ProductDetail} />
          <Route path="/categories" component={Categories} />
          
          <Route path="/cart" component={Cart} />
          <Route path="/checkout" component={Checkout} />
          <Route path="/account" component={Account} />
          <Route path="/orders" component={OrdersList} />
          <Route path="/orders/:id" component={OrderDetail} />

          <Route path="/support" component={Support} />

          <Route path="/admin-login" component={AdminLogin} />
          
          <Route path="/admin">
            <Redirect to="/admin/dashboard" />
          </Route>
          <Route path="/admin/dashboard" component={AdminDashboard} />
          <Route path="/admin/products" component={AdminProducts} />
          <Route path="/admin/orders" component={AdminOrders} />
          <Route path="/admin/returns" component={AdminReturns} />
          <Route path="/admin/categories" component={AdminCategories} />
          <Route path="/admin/banners" component={AdminBanners} />
          <Route path="/admin/coupons" component={AdminCoupons} />
          <Route path="/admin/settings" component={AdminSettings} />
          <Route path="/admin/users" component={AdminUsers} />
          <Route path="/admin/emails" component={AdminEmails} />
          <Route path="/admin/support" component={AdminSupport} />
          
          <Route path="/faq" component={FAQ} />
          <Route path="/terms" component={Terms} />
          <Route path="/privacy-policy" component={PrivacyPolicy} />
          <Route path="/return-policy" component={ReturnPolicy} />

          <Route path="/sign-in/*?" component={SignInPage} />
          <Route path="/sign-up/*?" component={SignUpPage} />

          <Route component={NotFound} />
        </Switch>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="light">
      <TooltipProvider>
        <WouterRouter base={basePath}>
          <ClerkProviderWithRoutes />
        </WouterRouter>
        <Toaster position="bottom-right" />
      </TooltipProvider>
    </ThemeProvider>
  );
}

export default App;
