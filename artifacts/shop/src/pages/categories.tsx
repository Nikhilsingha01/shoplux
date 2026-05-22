import { AppLayout } from "@/components/layout/AppLayout";
import { useListCategories } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";

interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  image?: string | null;
  productCount?: number;
}

export default function Categories() {
  const { data: categories, isLoading } = useListCategories();

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 md:py-16">
        <div className="mb-10 text-center max-w-xl mx-auto">
          <h1 className="text-3xl md:text-5xl font-serif font-bold tracking-tight">Our Collections</h1>
          <p className="text-muted-foreground mt-3 text-sm md:text-base">
            Explore our curated range of premium essentials designed for the modern lifestyle.
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-square rounded-xl w-full" />
                <Skeleton className="h-4 w-2/3 mx-auto" />
                <Skeleton className="h-3 w-1/3 mx-auto" />
              </div>
            ))}
          </div>
        ) : !Array.isArray(categories) || !categories.length ? (
          <div className="text-center py-20 bg-muted/20 rounded-2xl border">
            <p className="text-muted-foreground mb-4">No categories found.</p>
            <Link href="/products">
              <span className="text-primary hover:underline font-medium text-sm">Browse All Products</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {categories.map((cat: Category) => (
              <Link
                key={cat.id}
                href={`/products?category=${cat.slug}`}
                className="group relative aspect-square rounded-2xl overflow-hidden bg-muted flex flex-col justify-end shadow-sm hover:shadow-lg transition-all duration-300 border border-border/40"
              >
                {cat.image ? (
                  <img
                    src={cat.image}
                    alt={cat.name}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-secondary to-primary/10 transition-colors group-hover:from-primary/10" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent transition-opacity duration-300 group-hover:opacity-90" />
                <div className="relative z-10 p-4 md:p-6 text-center text-white">
                  <h3 className="font-semibold text-base md:text-xl tracking-tight transition-transform duration-300 group-hover:-translate-y-1">
                    {cat.name}
                  </h3>
                  <p className="text-[11px] md:text-xs text-white/70 mt-1 md:mt-1.5 font-medium tracking-wider uppercase transition-transform duration-300 group-hover:-translate-y-1">
                    {cat.productCount || 0} Products
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
