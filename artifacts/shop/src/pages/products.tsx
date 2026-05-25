import { AppLayout } from "@/components/layout/AppLayout";
import { useListProducts, useListCategories } from "@workspace/api-client-react";
import { ProductCard } from "@/components/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";

export default function Products() {
  const [location, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  
  const [category, setCategory] = useState<string | undefined>(searchParams.get("category") || undefined);
  const [sort, setSort] = useState<string | undefined>(searchParams.get("sort") || undefined);
  const [search, setSearch] = useState<string | undefined>(searchParams.get("search") || undefined);
  const isFeatured = searchParams.get("featured") === "true";
  const isNew = searchParams.get("new") === "true";

  // Re-sync states when URL parameters change
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setCategory(params.get("category") || undefined);
    setSort(params.get("sort") || undefined);
    setSearch(params.get("search") || undefined);
  }, [location]);

  const updateFilterUrl = (key: string, value: string | undefined) => {
    const params = new URLSearchParams(window.location.search);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    // Maintain key collection parameters
    setLocation(`/products?${params.toString()}`);
  };

  const { data: productsData, isLoading } = useListProducts({
    category,
    sort,
    search,
    featured: isFeatured ? "true" : undefined,
    limit: 50,
  });

  const { data: categories } = useListCategories();

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="flex flex-col md:flex-row justify-between items-baseline mb-8 gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-serif font-bold">
              {isFeatured ? "Featured Collection" : isNew ? "New Arrivals" : category ? category : "All Products"}
            </h1>
            <p className="text-muted-foreground mt-2 text-sm md:text-base">
              {productsData?.total || 0} items
            </p>
          </div>
          
          <div className="flex gap-4 items-center w-full md:w-auto overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
            <select 
              value={category || ""} 
              onChange={(e) => updateFilterUrl("category", e.target.value || undefined)}
              className="bg-transparent border border-border px-4 py-2 text-sm focus:outline-none focus:border-primary min-w-[140px]"
            >
              <option value="">All Categories</option>
              {Array.isArray(categories) && categories.map((cat) => (
                <option key={cat.id} value={cat.slug}>{cat.name}</option>
              ))}
            </select>

            <select 
              value={sort || ""} 
              onChange={(e) => updateFilterUrl("sort", e.target.value || undefined)}
              className="bg-transparent border border-border px-4 py-2 text-sm focus:outline-none focus:border-primary min-w-[140px]"
            >
              <option value="">Sort By</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="newest">Newest First</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="aspect-[4/5] w-full rounded-none" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/4" />
              </div>
            ))}
          </div>
        ) : !productsData?.products?.length ? (
          <div className="text-center py-24">
            <p className="text-muted-foreground mb-4">No products found matching your criteria.</p>
            <Button variant="outline" onClick={() => setLocation("/products")}>
              Clear Filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
            {productsData?.products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
