import type { Product } from "@/lib/api/types";
import { ProductCard } from "./product-card";

// Stable keys for skeleton placeholder rows. Index keys are avoided on purpose.
const SKELETON_SLOTS = ["slot-1", "slot-2", "slot-3", "slot-4", "slot-5", "slot-6"] as const;

// Responsive grid used wherever a list of products is shown.
export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <ul className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => (
        <li key={product.id}>
          <ProductCard product={product} />
        </li>
      ))}
    </ul>
  );
}

// Placeholder shown while a product grid loads. `label` is announced to screen readers.
export function ProductGridSkeleton({ count, label }: { count: number; label: string }) {
  return (
    <ul
      className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3"
      role="status"
      aria-label={label}
    >
      {SKELETON_SLOTS.slice(0, count).map((slot) => (
        <li key={slot} className="flex flex-col gap-3">
          <div className="aspect-square animate-pulse rounded-lg bg-gray-100" />
          <div className="h-4 w-3/4 animate-pulse rounded bg-gray-100" />
        </li>
      ))}
    </ul>
  );
}
