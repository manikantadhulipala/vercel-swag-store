import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/api/types";
import { formatPrice } from "@/lib/format";

export function ProductCard({ product }: { product: Product }) {
  const image = product.images[0];

  return (
    <Link href={`/products/${product.slug}`} className="group flex flex-col gap-3">
      <div className="relative aspect-square overflow-hidden rounded-lg bg-gray-50">
        {image ? (
          <Image
            src={image}
            alt={product.name}
            fill
            sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw"
            className="object-contain p-4 transition-transform duration-300 group-hover:scale-105"
          />
        ) : null}
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="font-medium text-gray-900">{product.name}</h3>
        <p className="text-gray-600 text-sm">{formatPrice(product.price, product.currency)}</p>
      </div>
    </Link>
  );
}
