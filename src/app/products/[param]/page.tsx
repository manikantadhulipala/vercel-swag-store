import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getProduct, getStock, listProducts } from "@/lib/api/catalog";
import type { Product, StockInfo } from "@/lib/api/types";
import { formatPrice } from "@/lib/format";
import { AddToCartForm } from "./add-to-cart-form";

type PageProps = {
  params: Promise<{ param: string }>;
};

// Blocking route. The product must be looked up before the page streams, so an
// unknown product gets a real 404 and a known product is never sent as a partial shell.
// The trade-off is that navigation to a product waits for the lookup. The catalog
// is cached, so that wait is short.
export const instant = false;

// Prerender every product at build time. The catalog is cached, so this is cheap.
export async function generateStaticParams() {
  const { products } = await listProducts({ limit: 100 });
  return products.map((product) => ({ param: product.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { param } = await params;
  const product = await getProduct(param);

  if (!product) {
    return { title: "Product not found", robots: { index: false } };
  }

  const path = `/products/${product.slug}`;
  const image = product.images[0];

  return {
    title: product.name,
    description: product.description,
    alternates: { canonical: path },
    openGraph: {
      title: product.name,
      description: product.description,
      url: path,
      images: image ? [{ url: image, alt: product.name }] : undefined,
    },
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { param } = await params;
  const product = await getProduct(param);

  // Checked before any streaming starts, so an unknown product returns a real 404.
  if (!product) notFound();

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-10 sm:px-6 md:grid-cols-2 md:py-16">
      <ProductImage product={product} />

      <div className="flex flex-col gap-6">
        <nav aria-label="Breadcrumb" className="text-gray-500 text-sm">
          <Link href="/search" className="hover:text-gray-900">
            All products
          </Link>
          <span className="mx-2" aria-hidden="true">
            /
          </span>
          <span className="capitalize">{product.category}</span>
        </nav>

        <div className="flex flex-col gap-3">
          <h1 className="font-bold text-3xl text-gray-900 sm:text-4xl">{product.name}</h1>
          <p className="font-semibold text-gray-900 text-xl">
            {formatPrice(product.price, product.currency)}
          </p>
          <p className="text-gray-600 leading-relaxed">{product.description}</p>
        </div>

        <Suspense fallback={<PurchaseSkeleton />}>
          <Purchase productId={product.id} />
        </Suspense>
      </div>
    </main>
  );
}

function ProductImage({ product }: { product: Product }) {
  const image = product.images[0];

  return (
    <div className="relative aspect-square overflow-hidden rounded-2xl bg-gray-50">
      {image ? (
        <Image
          src={image}
          alt={product.name}
          fill
          priority
          sizes="(min-width: 768px) 50vw, 100vw"
          className="object-contain p-8"
        />
      ) : null}
    </div>
  );
}

// Stock is read on every request, so it is never cached.
async function Purchase({ productId }: { productId: string }) {
  const stock = await getStock(productId);

  if (!stock) {
    return <p className="text-red-600">Stock information is unavailable right now.</p>;
  }

  return (
    <>
      <StockIndicator stock={stock} />
      <AddToCartForm productId={productId} stock={stock.stock} />
    </>
  );
}

function StockIndicator({ stock }: { stock: StockInfo }) {
  if (!stock.inStock) {
    return <p className="font-medium text-red-600">Out of stock</p>;
  }
  if (stock.lowStock) {
    return <p className="font-medium text-amber-700">Only {stock.stock} left in stock</p>;
  }
  return <p className="font-medium text-green-700">In stock</p>;
}

function PurchaseSkeleton() {
  return (
    <div className="flex flex-col gap-4" role="status" aria-label="Loading stock">
      <div className="h-5 w-24 animate-pulse rounded bg-gray-100" />
      <div className="h-12 w-full animate-pulse rounded-md bg-gray-100" />
    </div>
  );
}
