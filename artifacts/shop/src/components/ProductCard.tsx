import { Link } from "wouter";
import { Product } from "@workspace/api-client-react";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <Link href={`/products/${product.id}`} className="group block cursor-pointer">
      <div className="relative aspect-[4/5] overflow-hidden bg-muted mb-4">
        {product.images?.[0] ? (
          <img 
            src={product.images[0]} 
            alt={product.name} 
            className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-secondary text-muted-foreground">
            No image
          </div>
        )}
        {product.discount && product.discount > 0 && (
          <div className="absolute top-3 left-3 bg-destructive text-destructive-foreground text-[10px] font-bold px-2 py-1 uppercase tracking-wider">
            Sale
          </div>
        )}
      </div>
      <div className="space-y-1">
        <h3 className="font-medium text-sm md:text-base line-clamp-1">{product.name}</h3>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm md:text-base">₹{product.price.toLocaleString('en-IN')}</span>
          {product.comparePrice && product.comparePrice > product.price && (
            <span className="text-muted-foreground line-through text-xs md:text-sm">₹{product.comparePrice.toLocaleString('en-IN')}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
