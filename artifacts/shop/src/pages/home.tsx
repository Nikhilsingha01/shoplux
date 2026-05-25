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
import { ChevronLeft, ChevronRight, ShieldCheck, RefreshCcw, Headphones, Truck, Award, Star } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

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
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollTo = direction === "left"
        ? scrollLeft - clientWidth * 0.75
        : scrollLeft + clientWidth * 0.75;
      scrollRef.current.scrollTo({ left: scrollTo, behavior: "smooth" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="flex-none w-[170px] sm:w-[220px] aspect-square rounded-xl" />
        ))}
      </div>
    );
  }

  if (!Array.isArray(categories) || !categories.length) return null;

  return (
    <div className="relative group/slider">
      {/* Scroll left button */}
      <button
        onClick={() => scroll("left")}
        className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-2.5 bg-white/95 hover:bg-white text-black border border-border rounded-full shadow-md transition-all opacity-0 group-hover/slider:opacity-100 hidden md:flex items-center justify-center cursor-pointer hover:scale-105"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      {/* Scroll right button */}
      <button
        onClick={() => scroll("right")}
        className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-2.5 bg-white/95 hover:bg-white text-black border border-border rounded-full shadow-md transition-all opacity-0 group-hover/slider:opacity-100 hidden md:flex items-center justify-center cursor-pointer hover:scale-105"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory touch-pan-x -mx-4 px-4 sm:mx-0 sm:px-0 scroll-smooth"
      >
        {categories.map((cat) => (
          <Link
            key={cat.id}
            href={`/products?category=${cat.slug}`}
            className="group relative flex-none w-[170px] sm:w-[220px] aspect-square rounded-xl overflow-hidden bg-muted snap-start shadow-sm"
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

function FlashSaleCountdown({ endTime }: { endTime: string }) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = +new Date(endTime) - +new Date();
      let timeLeftObj = { hours: 0, minutes: 0, seconds: 0 };

      if (difference > 0) {
        timeLeftObj = {
          hours: Math.floor(difference / (1000 * 60 * 60)),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        };
      }
      return timeLeftObj;
    };

    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [endTime]);

  const padZero = (num: number) => String(num).padStart(2, "0");

  return (
    <div className="flex gap-2 text-center items-center">
      <div className="bg-amber-950 text-amber-50 px-2.5 py-1.5 font-mono text-xs md:text-sm font-semibold rounded-xs">
        {padZero(timeLeft.hours)}h
      </div>
      <span className="text-amber-900 font-bold">:</span>
      <div className="bg-amber-950 text-amber-50 px-2.5 py-1.5 font-mono text-xs md:text-sm font-semibold rounded-xs">
        {padZero(timeLeft.minutes)}m
      </div>
      <span className="text-amber-900 font-bold">:</span>
      <div className="bg-amber-950 text-amber-50 px-2.5 py-1.5 font-mono text-xs md:text-sm font-semibold rounded-xs">
        {padZero(timeLeft.seconds)}s
      </div>
    </div>
  );
}

const trustItems = [
  { icon: ShieldCheck, title: "100% Secure Payment", desc: "Safe & encrypted transactions" },
  { icon: RefreshCcw, title: "Easy Returns", desc: "7-day hassle-free policy" },
  { icon: Truck, title: "Fast Delivery", desc: "Quick dispatch & tracking" },
  { icon: Award, title: "Genuine Products", desc: "100% authentic collections" },
];

export default function Home() {
  const { data: featuredData, isLoading } = useListFeaturedProducts();
  const [, navigate] = useLocation();

  // Queries for Flash Sales and Testimonials
  const { data: flashSaleData } = useQuery({
    queryKey: ["active-flash-sale"],
    queryFn: async () => {
      const res = await fetch("/api/flash-sales/active");
      if (!res.ok) return null;
      return res.json();
    }
  });

  const { data: testimonials = [] } = useQuery({
    queryKey: ["active-testimonials"],
    queryFn: async () => {
      const res = await fetch("/api/testimonials");
      if (!res.ok) return [];
      return res.json();
    }
  });

  const [recentlyViewed, setRecentlyViewed] = useState<any[]>([]);

  useEffect(() => {
    try {
      const items = JSON.parse(localStorage.getItem("recently_viewed") || "[]");
      if (Array.isArray(items) && items.length > 0) {
        setRecentlyViewed(items.slice(0, 4));
      }
    } catch (e) {
      console.error("Failed to parse recently viewed items:", e);
    }
  }, []);

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
          <Button className="rounded-full shadow-2xl px-6 h-12 bg-black hover:bg-black/90 text-white font-medium tracking-wide">
            Admin Panel
          </Button>
        </Link>
      </div>
      <BannerCarousel />

      {/* Flash Sale Banner */}
      {flashSaleData?.sale && (
        <section className="bg-gradient-to-r from-amber-500/10 via-amber-600/10 to-amber-700/10 border-y border-amber-500/20 py-8">
          <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-left">
              <span className="bg-amber-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">⚡ Active Flash Sale</span>
              <h3 className="text-2xl md:text-3xl font-serif font-bold text-amber-950">{flashSaleData.sale.title}</h3>
              <p className="text-sm text-amber-800">Enjoy an extra <span className="font-bold">{flashSaleData.sale.discountPercent}% OFF</span> on selected premium arrivals!</p>
            </div>
            
            <div className="flex flex-col items-center md:items-end gap-3">
              <span className="text-[10px] font-semibold text-amber-900 uppercase tracking-widest">Offers Expiring In:</span>
              <FlashSaleCountdown endTime={flashSaleData.sale.endTime} />
              <Link href="/products">
                <Button size="sm" className="bg-amber-700 hover:bg-amber-800 text-white mt-2 rounded-xs px-6">Shop Flash Deals</Button>
              </Link>
            </div>
          </div>
        </section>
      )}

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

      {/* Testimonials */}
      {testimonials.length > 0 && (
        <section className="py-20 border-y bg-muted/20">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="text-center mb-16 space-y-2">
              <p className="text-[10px] uppercase tracking-widest text-primary font-bold">What Our Customers Say</p>
              <h2 className="text-3xl font-serif font-bold">Customer Testimonials</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {testimonials.map((test: any) => (
                <div key={test.id} className="bg-background border rounded-sm p-8 shadow-sm flex flex-col justify-between space-y-6 relative hover:shadow-md transition-shadow">
                  <div className="space-y-4">
                    <div className="flex gap-1 text-amber-500">
                      {Array.from({ length: test.rating }).map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-current" />
                      ))}
                    </div>
                    <p className="text-muted-foreground italic text-xs md:text-sm leading-relaxed">"{test.reviewText}"</p>
                  </div>
                  
                  <div className="flex items-center gap-4 pt-4 border-t">
                    <div className="w-10 h-10 rounded-full bg-secondary overflow-hidden flex-shrink-0 border">
                      {test.imageUrl ? (
                        <img src={test.imageUrl} alt={test.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold text-xs bg-muted text-muted-foreground">
                          {test.name[0]}
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm">{test.name}</h4>
                      <p className="text-xs text-muted-foreground">{test.role || "Verified Buyer"}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

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

      {/* Recently Viewed */}
      {recentlyViewed.length > 0 && (
        <section className="py-16 border-t">
          <div className="container mx-auto px-4">
            <div className="mb-10">
              <h2 className="text-2xl md:text-3xl font-serif font-bold">Recently Viewed</h2>
              <p className="text-muted-foreground mt-1">Pick up where you left off</p>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
              {recentlyViewed.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}
    </AppLayout>
  );
}


