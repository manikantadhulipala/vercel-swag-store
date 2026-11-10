// Shared search rules. Kept out of client modules so Server Components can import
// the real values. Importing a constant from a "use client" file gives a client
// reference on the server, not the value.

export const MIN_QUERY_LENGTH = 3;
export const SEARCH_DEBOUNCE_MS = 300;
export const SEARCH_RESULT_LIMIT = 5;
export const DEFAULT_PRODUCT_LIMIT = 6;

// The URL is the source of truth: /search?q=...&category=...
export function buildSearchUrl(pathname: string, query: string, category: string): string {
  const params = new URLSearchParams();
  const trimmed = query.trim();
  if (trimmed.length >= MIN_QUERY_LENGTH) params.set("q", trimmed);
  if (category) params.set("category", category);

  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}
