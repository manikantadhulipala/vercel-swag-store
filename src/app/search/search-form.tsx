"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import type { Category } from "@/lib/api/types";
import { buildSearchUrl, MIN_QUERY_LENGTH, SEARCH_DEBOUNCE_MS } from "@/lib/search";

export function SearchForm({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const urlQuery = searchParams.get("q") ?? "";
  const urlCategory = searchParams.get("category") ?? "";

  const [query, setQuery] = useState(urlQuery);
  const [category, setCategory] = useState(urlCategory);
  const [isPending, startTransition] = useTransition();

  const navigate = useCallback(
    (nextQuery: string, nextCategory: string) => {
      startTransition(() => {
        router.replace(buildSearchUrl(pathname, nextQuery, nextCategory), { scroll: false });
      });
    },
    [pathname, router]
  );

  // Debounced search. Each change resets the timer. Dropping below the minimum
  // length clears the search immediately, without waiting for the debounce.
  // Re-running when the URL changes is harmless: the URL already matches, so nothing navigates.
  useEffect(() => {
    const trimmed = query.trim();

    // Below the minimum (including an empty input), the results on screen are stale,
    // so the search state is cleared at once.
    if (trimmed.length < MIN_QUERY_LENGTH) {
      if (urlQuery !== "") navigate("", category);
      return;
    }

    if (trimmed === urlQuery) return;

    const timer = setTimeout(() => navigate(trimmed, category), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, urlQuery, category, navigate]);

  const onCategoryChange = (nextCategory: string) => {
    setCategory(nextCategory);
    navigate(query, nextCategory);
  };

  const hint =
    query.trim().length > 0 && query.trim().length < MIN_QUERY_LENGTH
      ? `Type at least ${MIN_QUERY_LENGTH} characters to search.`
      : null;

  return (
    <form action="/search" method="get" className="flex flex-col gap-4 sm:flex-row sm:items-end">
      <div className="flex flex-1 flex-col gap-2">
        <label htmlFor="search-query" className="font-medium text-gray-900 text-sm">
          Search products
        </label>
        <input
          id="search-query"
          name="q"
          type="search"
          autoComplete="off"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Try hoodie, bottle, or hat"
          className="rounded-md border px-3 py-2 text-gray-900"
          aria-describedby="search-hint"
        />
        <p id="search-hint" className="min-h-5 text-gray-500 text-sm" aria-live="polite">
          {hint}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="search-category" className="font-medium text-gray-900 text-sm">
          Category
        </label>
        <select
          id="search-category"
          name="category"
          value={category}
          onChange={(event) => onCategoryChange(event.target.value)}
          className="rounded-md border px-3 py-2 text-gray-900"
        >
          <option value="">All categories</option>
          {categories.map((item) => (
            <option key={item.slug} value={item.slug}>
              {item.name}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        className="rounded-md bg-black px-5 py-2 font-medium text-white hover:bg-gray-800"
      >
        Search
      </button>

      <p className="sr-only" aria-live="polite">
        {isPending ? "Updating results…" : ""}
      </p>
    </form>
  );
}
