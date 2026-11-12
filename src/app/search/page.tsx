import type { Metadata } from "next";
import { Suspense } from "react";
import { ProductGrid, ProductGridSkeleton } from "@/components/product-grid";
import { getCategories, listProducts } from "@/lib/api/catalog";
import type { Category } from "@/lib/api/types";
import { DEFAULT_PRODUCT_LIMIT, MIN_QUERY_LENGTH, SEARCH_RESULT_LIMIT } from "@/lib/search";
import { SearchForm } from "./search-form";

type SearchParams = Promise<{ q?: string | string[]; category?: string | string[] }>;

type PageProps = {
  searchParams: SearchParams;
};

export const metadata: Metadata = {
  title: "Search",
  description:
    "Search the Vercel Swag Store catalog by name, description, or tag, and filter by category.",
  openGraph: {
    title: "Search | Vercel Swag Store",
    description:
      "Search the Vercel Swag Store catalog by name, description, or tag, and filter by category.",
    url: "/search",
  },
};

function firstValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default function SearchPage({ searchParams }: PageProps) {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 md:py-16">
      <h1 className="mb-8 font-bold text-3xl text-gray-900 sm:text-4xl">Search</h1>

      <Suspense fallback={<SearchFormSkeleton />}>
        <SearchFormLoader />
      </Suspense>

      <Suspense fallback={<ProductGridSkeleton count={3} label="Searching" />}>
        <SearchResultsLoader searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function SearchFormLoader() {
  const categories = await getCategories();
  return <SearchForm categories={categories} />;
}

// Results depend on the URL, so they are read at request time. The Suspense
// key makes the loading state show again for every new search.
async function SearchResultsLoader({ searchParams }: PageProps) {
  const params = await searchParams;
  const rawQuery = firstValue(params.q).trim();
  const rawCategory = firstValue(params.category);

  const categories = await getCategories();
  const category = categories.some((item) => item.slug === rawCategory) ? rawCategory : "";
  const query = rawQuery.length >= MIN_QUERY_LENGTH ? rawQuery : "";

  return (
    <Suspense
      key={`${query}|${category}`}
      fallback={<ProductGridSkeleton count={3} label="Searching" />}
    >
      <SearchResults query={query} category={category} categories={categories} />
    </Suspense>
  );
}

async function SearchResults({
  query,
  category,
  categories,
}: {
  query: string;
  category: string;
  categories: Category[];
}) {
  const categoryName = categories.find((item) => item.slug === category)?.name;

  if (query) {
    const { products } = await listProducts({
      search: query,
      category: category || undefined,
      limit: SEARCH_RESULT_LIMIT,
    });

    if (products.length === 0) {
      return (
        <section aria-live="polite" className="flex flex-col gap-2">
          <p className="font-medium text-gray-900 text-lg">
            No products match &ldquo;{query}&rdquo;.
          </p>
          <p className="text-gray-600">
            Try a different word, such as hoodie, bottle, or hat
            {categoryName ? `, or choose another category instead of ${categoryName}` : ""}.
          </p>
        </section>
      );
    }

    return (
      <section aria-live="polite" className="flex flex-col gap-6">
        <p className="text-gray-600 text-sm">
          Showing {products.length} {products.length === 1 ? "result" : "results"} for &ldquo;
          {query}&rdquo;
          {categoryName ? ` in ${categoryName}` : ""}.
        </p>
        <ProductGrid products={products} />
      </section>
    );
  }

  // No search has been performed: show a default set, filtered by category if one is chosen.
  const { products } = await listProducts({
    category: category || undefined,
    limit: DEFAULT_PRODUCT_LIMIT,
  });

  if (products.length === 0) {
    return <p className="text-gray-600">No products in this category yet.</p>;
  }

  return (
    <section aria-live="polite" className="flex flex-col gap-6">
      <h2 className="font-semibold text-gray-900 text-xl">{categoryName ?? "Popular products"}</h2>
      <ProductGrid products={products} />
    </section>
  );
}

function SearchFormSkeleton() {
  return (
    <div
      className="mb-10 h-24 animate-pulse rounded-md bg-gray-100"
      role="status"
      aria-label="Loading search"
    />
  );
}
