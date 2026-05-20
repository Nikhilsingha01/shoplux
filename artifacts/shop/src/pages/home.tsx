import { AppLayout } from "@/components/layout/AppLayout";
import {
  useListFeaturedProducts,
  useListBanners,
  useListCategories,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductCard } from "@/components/ProductCard";
import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, ShieldCheck, RefreshCcw, Headphones } from "lucide-react";

function BannerCarousel() {
  const { data: banners, isLoading } = useListBanners();
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const slides = Array.isArray(banners) && banners.length > 0 ? banners : [
    {
      id: 0,
      title: "Elevate Your Everyday",
      subtitle: "Discover our curated collection of premium essentials designed for the modern lifestyle.",
      imageUrl: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1400&q=90",
      linkUrl: "/products",
    },
  ];

  useEffect(() => {
    if (slides.length <= 1) return;
    timerRef.current = setInterval(() => {
      setCurrent((c) => (c + 1) % slides.length);
    }, 5000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [slides.length]);

  const go = (idx: number) => {
    setCurrent((idx + slides.length) % slides.length);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  if (isLoading) {
    return <Skeleton className="h-[80vh] w-full rounded-none" />;
  }

  const slide = slides[current] as typeof slides[0] & { subtitle?: string; imageUrl?: string };

  return (
    <section className="relative h-[80vh] w-full overflow-hidden">
      {slides.map((s, idx) => {
        const imgUrl = (s as typeof slide).imageUrl ?? "";
        return (
          <div
            key={(s as typeof slide).id}
            className={`absolute inset-0 transition-opacity duration-1000 ${idx === current ? "opacity-100" : "opacity-0 pointer-events-none"}`}
          >
            <img
              src={imgUrl}
              alt={(s as typeof slide).title ?? ""}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/30 to-black/60" />
          </div>
        );
      })}

      <div className="relative z-10 h-full flex items-center justify-center text-center text-white px-4">
        <div className="max-w-3xl mx-auto space-y-6">
          <h1 className="font-serif text-5xl md:text-7xl font-bold tracking-tight leading-tight">
            {(slide as typeof slide).title}
          </h1>
          {(slide as typeof slide).subtitle && (
            <p className="text-lg md:text-xl text-white/85 font-light max-w-xl mx-auto">
              {(slide as typeof slide).subtitle}
            </p>
          )}
          <div className="pt-4">
            <Link href={(slide as typeof slide).linkUrl ?? "/products"}>
              <Button
                size="lg"
                className="bg-white text-black hover:bg-white/90 text-base px-10 h-14 rounded-none font-medium tracking-widest uppercase"
              >
                Shop Now
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {slides.length > 1 && (
        <>
          <button
            onClick={() => go(current - 1)}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2 bg-white/20 hover:bg-white/40 text-white rounded-full transition-colors backdrop-blur-sm"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={() => go(current + 1)}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2 bg-white/20 hover:bg-white/40 text-white rounded-full transition-colors backdrop-blur-sm"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => go(idx)}
                className={`w-2 h-2 rounded-full transition-all ${idx === current ? "bg-white w-6" : "bg-white/50"}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function CategoriesGrid() {
  const { data: categories, isLoading } = useListCategories();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-lg" />
        ))}
      </div>
    );
  }

  if (!Array.isArray(categories) || !categories.length) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
      {categories.slice(0, 5).map((cat) => (
        <Link
          key={cat.id}
          href={`/products?category=${cat.slug}`}
          className="group relative aspect-square rounded-xl overflow-hidden bg-muted"
        >
          {cat.image ? (
            <img
              src={cat.image}
              alt={cat.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-muted to-muted-foreground/20" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <p className="text-white font-semibold text-sm md:text-base">{cat.name}</p>
            <p className="text-white/70 text-xs mt-0.5">{cat.productCount || 0} items</p>
          </div>
        </Link>
      ))}
    </div>
  );
}

function ProductSection({
  title,
  subtitle,
  products,
  isLoading,
  viewAllHref,
}: {
  title: string;
  subtitle?: string;
  products: Array<Parameters<typeof ProductCard>[0]["product"]>;
  isLoading: boolean;
  viewAllHref: string;
}) {
  return (
    <section className="py-16">
      <div className="flex justify-between items-end mb-10">
        <div>
          <h2 className="text-2xl md:text-3xl font-serif font-bold">{title}</h2>
          {subtitle && <p className="text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        <Link
          href={viewAllHref}
          className="hidden md:inline-flex text-sm font-medium hover:text-primary transition-colors border-b border-transparent hover:border-primary pb-0.5"
        >
          View All
        </Link>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="aspect-[4/5] w-full rounded-none" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/4" />
              </div>
            ))
          : products.slice(0, 4).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
      </div>
      <div className="mt-8 flex justify-center md:hidden">
        <Link href={viewAllHref}>
          <Button variant="outline" className="rounded-none tracking-wide uppercase">View All</Button>
        </Link>
      </div>
    </section>
  );
}

const trustItems = [
  { icon: ShieldCheck, title: "Secure Payments", desc: "100% safe & encrypted" },
  { icon: RefreshCcw, title: "Easy Returns", desc: "7-day hassle-free returns" },
  { icon: Headphones, title: "24/7 Support", desc: "Always here to help" },
];

export default function Home() {
  const { data: featuredData, isLoading } = useListFeaturedProducts();

  const [, navigate] = useLocation();

  useEffect(() => {
    const isAdmin =
      localStorage.getItem("isAdmin") === "true";

    const adminEmail =
      localStorage.getItem("adminEmail");

    if (
      isAdmin &&
      adminEmail === "singhalnikhil010@gmail.com"
    ) {
      navigate("/admin/dashboard");
    }
  }, []);

  return (
    <AppLayout>
      <div className="fixed bottom-6 right-6 z-50">
        <Link href="/admin-login">
          <Button className="rounded-full shadow-2xl px-6 h-12 bg-black hover:bg-black/90 text-white">
            Admin Panel
          </Button>
        </Link>
      </div>
      <BannerCarousel />

      {/* Trust Bar */}
      <section className="border-y bg-muted/30">
        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {trustItems.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{item.title}</p>
                    <p className="text-muted-foreground text-xs">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 container mx-auto px-4">
        <div className="mb-10">
          <h2 className="text-2xl md:text-3xl font-serif font-bold">Shop by Category</h2>
          <p className="text-muted-foreground mt-1">Explore our curated collections</p>
        </div>
        <CategoriesGrid />
      </section>

      {/* Featured */}
      <div className="container mx-auto px-4">
        <ProductSection
          title="Featured Pieces"
          subtitle="Handpicked selections for you"
          products={featuredData?.featured ?? []}
          isLoading={isLoading}
          viewAllHref="/products?featured=true"
        />
      </div>

      {/* Brand Quote */}
      <section className="py-24 bg-foreground text-background">
        <div className="container mx-auto px-4 text-center max-w-4xl space-y-6">
          <p className="text-background/50 uppercase tracking-widest text-xs font-semibold">The ShopLux Philosophy</p>
          <h2 className="font-serif text-3xl md:text-5xl font-bold leading-tight">
            "We believe that true luxury is found in the details — in the intentionality of design and the enduring quality of craftsmanship."
          </h2>
          <Link href="/products">
            <Button variant="outline" className="rounded-none border-white text-white hover:bg-white hover:text-black tracking-widest uppercase mt-4">
              Explore Collection
            </Button>
          </Link>
        </div>
      </section>

      {/* Trending */}
      <div className="container mx-auto px-4">
        <ProductSection
          title="Trending Now"
          subtitle="What everyone is buying"
          products={featuredData?.trending ?? []}
          isLoading={isLoading}
          viewAllHref="/products"
        />
      </div>

      {/* New Arrivals */}
      <div className="container mx-auto px-4">
        <ProductSection
          title="New Arrivals"
          subtitle="Fresh off the shelf"
          products={featuredData?.newArrivals ?? []}
          isLoading={isLoading}
          viewAllHref="/products?new=true"
        />
      </div>

      {/* Best Sellers */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <ProductSection
            title="Best Sellers"
            subtitle="Customer favorites"
            products={featuredData?.bestSellers ?? []}
            isLoading={isLoading}
            viewAllHref="/products"
          />
        </div>
      </section>
    </AppLayout>
  );
}


