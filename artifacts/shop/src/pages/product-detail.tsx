import { AppLayout } from "@/components/layout/AppLayout";
import { useAdminStatus } from "@/lib/useAdmin";
import {
  useGetProduct,
  useListProducts,
  useAddToWishlist,
  useRemoveFromWishlist,
  useGetWishlist,
} from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductCard } from "@/components/ProductCard";
import { Heart, Plus, Minus, Star, Truck, ShieldCheck, RefreshCcw, Share2 } from "lucide-react";
import { useUser } from "@clerk/react";

function parseDescription(descText: string) {
  if (!descText) return { paragraphs: [], highlights: [], specs: [] };

  // 1. Break inline key-values separated by punctuation and spaces into distinct lines.
  // E.g., "Material: Cotton. Sleeve: Short." -> "Material: Cotton\nSleeve: Short"
  let processedText = descText.replace(/([.;,])\s+([A-Za-z\s_-]{2,25}):\s+/g, "$1\n$2: ");

  // 2. Split on all bullet point indicators as separators: ✔, ✓, •, *, and spaces-surrounded dashes (-)
  // We replace them with newlines to break them into distinct lines for further parser processing.
  processedText = processedText.replace(/([✔✓•*])|(\s+-\s+)/g, "\n");

  const lines = processedText.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);

  const paragraphs: string[] = [];
  const highlights: string[] = [];
  const specs: { key: string; value: string }[] = [];

  for (const line of lines) {
    // Matches bullet points (e.g. "✔ Material is cotton", "✓ Soft finish", "- Comfortable", etc.)
    const bulletMatch = line.match(/^([✔✓•\-*]|\d+\.)\s*(.+)$/);
    let content = line;
    let isBullet = false;

    if (bulletMatch) {
      isBullet = true;
      content = bulletMatch[2].trim();
    }

    // Matches specs (e.g. "Fabric: Cotton")
    const specMatch = content.match(/^([^:]{2,30}):\s*(.+)$/);
    if (specMatch) {
      const key = specMatch[1].trim();
      const value = specMatch[2].trim();
      specs.push({ key, value: value.replace(/[.;,]+$/, "") });
      continue;
    }

    // If it was marked as a bullet, or if it is short and doesn't end with a period
    if (isBullet || (content.length < 80 && !content.endsWith("."))) {
      highlights.push(content);
    } else {
      paragraphs.push(content);
    }
  }

  return { paragraphs, highlights, specs };
}

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const productId = parseInt(id || "0", 10);
  const { user } = useUser();
  const addItem = useCart((state) => state.addItem);
  const { trustBadge1, trustBadge2, trustBadge3 } = useAdminStatus();

  const { data: product, isLoading } = useGetProduct(productId);

  const { data: recommendedData } = useListProducts(
    { category: product?.categoryName ?? undefined, limit: 5 },
  );

  const { data: wishlist, refetch: refetchWishlist } = useGetWishlist();
  const addToWishlist = useAddToWishlist();
  const removeFromWishlist = useRemoveFromWishlist();

  const isInWishlist = wishlist?.some((w) => w.productId === productId) ?? false;

  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState(0);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  const galleryRef = useRef<HTMLDivElement>(null);

  const handleGalleryScroll = () => {
    if (galleryRef.current) {
      const { scrollLeft, clientWidth } = galleryRef.current;
      if (clientWidth > 0) {
        const newActive = Math.round(scrollLeft / clientWidth);
        if (newActive !== activeImage && newActive >= 0 && product && newActive < product.images.length) {
          setActiveImage(newActive);
        }
      }
    }
  };

  const handleThumbnailClick = (idx: number) => {
    setActiveImage(idx);
    if (galleryRef.current) {
      const containerWidth = galleryRef.current.clientWidth;
      galleryRef.current.scrollTo({
        left: idx * containerWidth,
        behavior: "smooth"
      });
    }
  };

  const handleShare = async () => {
    if (!product) return;
    const shareUrl = window.location.href;
    const shareTitle = product.name;
    const shareText = `Check out ${product.name} on Shoplux!`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        toast.success("Shared successfully!");
      } catch (err: any) {
        if (err.name !== "AbortError") {
          await navigator.clipboard.writeText(shareUrl);
          toast.success("Link copied to clipboard!");
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Product link copied to clipboard!");
      } catch (err) {
        toast.error("Failed to copy link.");
      }
    }
  };

  const handleAddToCart = () => {
    if (!product) return;
    if (product.variants && !selectedVariant) {
      toast.error("Please select a variant");
      return;
    }
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      image: product.images[0] || "",
      quantity,
      variant: selectedVariant,
      deliveryCharge: product.deliveryCharge ?? 0,
      isDeliveryChargeApplicable: product.isDeliveryChargeApplicable ?? false,
    });
    toast.success("Added to cart");
  };

  const handleWishlist = () => {
    if (!user) {
      toast.error("Please sign in to add to wishlist");
      return;
    }
    if (isInWishlist) {
      removeFromWishlist.mutate(
        { productId },
        {
          onSuccess: () => { toast.success("Removed from wishlist"); refetchWishlist(); },
          onError: () => toast.error("Failed to update wishlist"),
        },
      );
    } else {
      addToWishlist.mutate(
        { data: { productId } },
        {
          onSuccess: () => { toast.success("Added to wishlist"); refetchWishlist(); },
          onError: () => toast.error("Failed to update wishlist"),
        },
      );
    }
  };

  const variantsList = product?.variants
    ? product.variants.split(",").map((v) => v.trim())
    : [];

  const badges = [
    product?.isFeatured ? "Featured" : null,
    product?.isTrending ? "Trending" : null,
    product?.isNewArrival ? "New Arrival" : null,
    product?.isBestSeller ? "Best Seller" : null,
  ].filter((b): b is string => b !== null);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8 md:py-12 grid grid-cols-1 md:grid-cols-2 gap-12">
          <Skeleton className="aspect-[4/5] w-full rounded-none" />
          <div className="space-y-6">
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!product) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-24 text-center">
          <h1 className="text-2xl font-serif mb-4">Product not found</h1>
          <Link href="/products">
            <Button variant="outline">Back to Shop</Button>
          </Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 md:py-12">
        {/* Breadcrumb */}
        <nav className="flex text-sm text-muted-foreground mb-8">
          <Link href="/" className="hover:text-foreground">Home</Link>
          <span className="mx-2">/</span>
          <Link href="/products" className="hover:text-foreground">Shop</Link>
          {product.categoryName && (
            <>
              <span className="mx-2">/</span>
              <Link href={`/products?category=${product.categoryName?.toLowerCase().replace(/\s+/g, "-")}`} className="hover:text-foreground capitalize">
                {product.categoryName}
              </Link>
            </>
          )}
          <span className="mx-2">/</span>
          <span className="text-foreground truncate max-w-[160px]">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-24">
          {/* Images */}
          <div className="space-y-4">
            <div 
              ref={galleryRef}
              onScroll={handleGalleryScroll}
              className="w-full h-[300px] md:h-[450px] bg-muted relative flex snap-x snap-mandatory overflow-x-auto scrollbar-hide touch-pan-x rounded-sm border"
            >
              {product.images.length > 0 ? (
                product.images.map((img, idx) => (
                  <div key={idx} className="w-full h-full flex-none flex items-center justify-center snap-start relative px-4">
                    <img
                      src={img}
                      alt={`${product.name} - Image ${idx + 1}`}
                      className="max-w-full max-h-full w-auto h-auto object-contain transition-transform duration-700 hover:scale-105"
                    />
                  </div>
                ))
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">No image</div>
              )}
              {product.discount && product.discount > 0 ? (
                <div className="absolute top-4 left-4 bg-destructive text-destructive-foreground text-xs font-bold px-2 py-1 uppercase tracking-wider z-10">
                  Save {product.discount}%
                </div>
              ) : null}
            </div>
            {product.images.length > 1 && (
              <div className="grid grid-cols-5 gap-2">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleThumbnailClick(idx)}
                    className={`aspect-square bg-muted overflow-hidden border-2 transition-colors cursor-pointer ${activeImage === idx ? "border-primary" : "border-transparent hover:border-muted-foreground/30"}`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex flex-col justify-start pt-2">
            {badges.length > 0 && (
              <div className="flex gap-2 mb-3 flex-wrap">
                {badges.map((badge) => (
                  <span key={badge} className="text-[10px] font-bold tracking-widest uppercase text-primary bg-primary/10 px-2 py-1 rounded">
                    {badge}
                  </span>
                ))}
              </div>
            )}

            <h1 className="text-3xl md:text-4xl font-serif font-bold mb-3 leading-tight">{product.name}</h1>

            {product.rating != null && (
              <div className="flex items-center gap-2 mb-4">
                <div className="flex">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${i < Math.round(product.rating!) ? "text-amber-400 fill-amber-400" : "text-muted-foreground"}`}
                    />
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">
                  {product.rating.toFixed(1)} ({(product.reviewCount ?? 0).toLocaleString()} reviews)
                </span>
              </div>
            )}

            <div className="flex items-baseline gap-4 mb-6">
              <span className="text-3xl font-bold">₹{product.price.toLocaleString("en-IN")}</span>
              {product.comparePrice && product.comparePrice > product.price ? (
                <>
                  <span className="text-muted-foreground line-through text-xl">₹{product.comparePrice.toLocaleString("en-IN")}</span>
                  <span className="text-destructive font-semibold text-sm">
                    ₹{(product.comparePrice - product.price).toLocaleString("en-IN")} off
                  </span>
                </>
              ) : null}
            </div>

            {product.description && (
              <div className="relative mt-2 border-t border-border pt-6 mb-8">
                <div className={`transition-all duration-300 overflow-hidden relative ${isDescriptionExpanded ? "max-h-[2000px]" : "max-h-[140px]"}`}>
                  {(() => {
                    const isHTML = /<[a-z][\s\S]*>/i.test(product.description);
                    if (isHTML) {
                      return (
                        <div className="space-y-4 pb-4">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-foreground mb-3">Product Description</h4>
                          <div 
                            className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground leading-relaxed [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:list-decimal [&>ol]:pl-5" 
                            dangerouslySetInnerHTML={{ __html: product.description }} 
                          />
                        </div>
                      );
                    }

                    const { paragraphs, highlights, specs } = parseDescription(product.description);
                    const hasContent = paragraphs.length > 0 || highlights.length > 0 || specs.length > 0;
                    if (!hasContent) {
                      return (
                        <p className="text-muted-foreground leading-relaxed text-sm pb-4">
                          {product.description}
                        </p>
                      );
                    }
                    return (
                      <div className="space-y-6 pb-4">
                        {/* Narrative paragraphs */}
                        {paragraphs.length > 0 && (
                          <div className="space-y-3">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Product Description</h4>
                            {paragraphs.map((para, i) => (
                              <p key={i} className="text-muted-foreground leading-relaxed text-sm">
                                {para}
                              </p>
                            ))}
                          </div>
                        )}

                        {/* Highlights/Features */}
                        {highlights.length > 0 && (
                          <div className="space-y-3 pt-2">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Product Highlights</h4>
                            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 list-none pl-0">
                              {highlights.map((highlight, i) => (
                                <li key={i} className="text-muted-foreground text-xs flex items-start gap-2">
                                  <span className="text-primary mt-1.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                                  <span>{highlight}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Specifications Table */}
                        {specs.length > 0 && (
                          <div className="space-y-3 pt-2">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Specifications</h4>
                            <div className="border border-border/80 overflow-hidden rounded-none shadow-sm">
                              <table className="w-full text-xs text-left border-collapse">
                                <tbody>
                                  {specs.map((spec, i) => (
                                    <tr 
                                      key={i} 
                                      className={`border-b border-border/60 last:border-none transition-colors ${
                                        i % 2 === 0 ? "bg-muted/30" : "bg-background"
                                      }`}
                                    >
                                      <td className="px-4 py-3 font-semibold text-muted-foreground uppercase tracking-wider w-1/3 bg-muted/10 border-r border-border/40 select-none">
                                        {spec.key}
                                      </td>
                                      <td className="px-4 py-3 font-medium text-foreground w-2/3">
                                        {spec.value}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  
                  {!isDescriptionExpanded && (
                    <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-background via-background/70 to-transparent pointer-events-none" />
                  )}
                </div>
                <button 
                  onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)} 
                  className="text-primary hover:text-primary/80 font-bold text-xs uppercase tracking-wider mt-3 flex items-center gap-1 cursor-pointer border-none bg-transparent"
                >
                  {isDescriptionExpanded ? "Show Less" : "Read More"}
                </button>
              </div>
            )}

            <div className="space-y-6 mb-8">
              {variantsList.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-widest mb-3 text-muted-foreground">Choose Variant</h3>
                  <div className="flex flex-wrap gap-2">
                    {variantsList.map((variant) => (
                      <button
                        key={variant}
                        onClick={() => setSelectedVariant(variant)}
                        className={`px-4 py-2 text-sm border transition-colors ${
                          selectedVariant === variant
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border hover:border-foreground"
                        }`}
                      >
                        {variant}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-xs font-semibold uppercase tracking-widest mb-3 text-muted-foreground">Quantity</h3>
                <div className="flex items-center border border-border w-fit">
                  <button
                    className="p-3 hover:bg-muted transition-colors"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-14 text-center font-semibold text-base">{quantity}</span>
                  <button
                    className="p-3 hover:bg-muted transition-colors"
                    onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mb-6">
              <Button
                size="lg"
                className="flex-1 rounded-none h-14 font-medium tracking-wide uppercase"
                onClick={handleAddToCart}
                disabled={product.stock <= 0}
              >
                {product.stock > 0 ? "Add to Cart" : "Out of Stock"}
              </Button>
              <Button
                size="icon"
                variant="outline"
                className={`h-14 w-14 rounded-none transition-colors ${isInWishlist ? "bg-primary/10 border-primary text-primary" : ""}`}
                onClick={handleWishlist}
                disabled={addToWishlist.isPending || removeFromWishlist.isPending}
              >
                <Heart className={`w-5 h-5 ${isInWishlist ? "fill-primary" : ""}`} />
              </Button>
              <Button
                size="icon"
                variant="outline"
                className="h-14 w-14 rounded-none transition-colors hover:bg-muted-foreground/5 text-muted-foreground hover:text-foreground"
                onClick={handleShare}
                title="Share Product"
              >
                <Share2 className="w-5 h-5" />
              </Button>
            </div>

            {product.stock > 0 && product.stock < 10 && (
              <p className="text-destructive text-sm mb-6 font-medium">
                Hurry! Only {product.stock} left in stock.
              </p>
            )}

            {/* Trust badges */}
            <div className="border-t pt-6 space-y-3">
              {[
                { icon: Truck, text: trustBadge1 || "Free delivery on orders above ₹999" },
                { icon: ShieldCheck, text: trustBadge2 || "Secure & encrypted payments" },
                { icon: RefreshCcw, text: trustBadge3 || "7-day hassle-free returns" },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.text} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span>{item.text}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Recommended */}
        {recommendedData?.products && recommendedData.products.filter((p) => p.id !== product.id).length > 0 && (
          <section className="py-12 border-t">
            <h2 className="text-2xl font-serif font-bold mb-8">You May Also Like</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
              {recommendedData.products
                .filter((p) => p.id !== product.id)
                .slice(0, 4)
                .map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
            </div>
          </section>
        )}
      </div>
    </AppLayout>
  );
}
