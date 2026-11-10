import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { LogoMark } from "@/components/logo-mark";
import { ProductGrid } from "@/components/product-card";
import { PromoBanner } from "@/components/promo-banner";
import { SKELETON_SLOTS } from "@/components/skeleton-slots";
import { listProducts } from "@/lib/api/catalog";

// The root title template only applies to nested routes, so the home title is set in full.
export const metadata: Metadata = {
  title: { absolute: "Swag Store | Wear the framework you ship with" },
  description:
    "Premium black swag for developers who build with Vercel. Tees, bottles, bags, and tech gear.",
  openGraph: {
    title: "Swag Store | Wear the framework you ship with",
    description:
      "Premium black swag for developers who build with Vercel. Tees, bottles, bags, and tech gear.",
    url: "/",
  },
};

const FEATURED_COUNT = 6;

// Featured products come from the API. If fewer than six are featured, the
// grid is filled from the full catalog so it always shows at least six.
async function FeaturedProducts() {
  const featured = await listProducts({ featured: true, limit: FEATURED_COUNT });
  let products = featured.products;

  if (products.length < FEATURED_COUNT) {
    const catalog = await listProducts({ limit: FEATURED_COUNT });
    products = catalog.products.slice(0, FEATURED_COUNT);
  }

  return <ProductGrid products={products} />;
}

function FeaturedSkeleton() {
  return (
    <ul
      className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3"
      aria-label="Loading products"
    >
      {SKELETON_SLOTS.slice(0, FEATURED_COUNT).map((slot) => (
        <li key={slot} className="flex flex-col gap-3">
          <div className="aspect-square animate-pulse rounded-lg bg-gray-100" />
          <div className="h-4 w-3/4 animate-pulse rounded bg-gray-100" />
        </li>
      ))}
    </ul>
  );
}

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col">
      <Suspense fallback={null}>
        <PromoBanner />
      </Suspense>

      <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 md:grid-cols-2 md:py-24">
        <div className="flex flex-col gap-6">
          <h1 className="font-bold text-4xl tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
            Wear the framework you ship with.
          </h1>
          <p className="max-w-lg text-gray-600 text-lg">
            Premium swag for developers who build with Vercel. From tees to tech gear, represent the
            tools you love.
          </p>
          <div>
            <Link
              href="/search"
              className="inline-flex items-center gap-2 rounded-md bg-black px-6 py-3 font-medium text-white hover:bg-gray-800"
            >
              Browse All Products
              <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
        </div>
        <div className="flex aspect-square items-center justify-center rounded-2xl bg-gray-50 md:aspect-auto md:h-full md:min-h-80">
          <LogoMark className="h-1/2 w-1/2 text-black" />
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6">
        <div className="mb-8 flex items-end justify-between gap-4">
          <h2 className="font-semibold text-2xl text-gray-900 sm:text-3xl">Featured Products</h2>
          <Link href="/search" className="text-gray-600 text-sm hover:text-gray-900">
            View all
          </Link>
        </div>
        <Suspense fallback={<FeaturedSkeleton />}>
          <FeaturedProducts />
        </Suspense>
      </section>
    </main>
  );
}
