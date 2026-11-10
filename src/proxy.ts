import { type NextRequest, NextResponse } from "next/server";
import { apiRequest } from "@/lib/api/client";
import type { Product } from "@/lib/api/types";

// Keep the proxy fast: remember the known product slugs and ids for a few minutes.
const KNOWN_KEYS_TTL_MS = 5 * 60 * 1000;
let knownKeys: { keys: Set<string>; expiresAt: number } | null = null;

async function getKnownProductKeys(): Promise<Set<string>> {
  if (knownKeys && knownKeys.expiresAt > Date.now()) return knownKeys.keys;

  const { data } = await apiRequest<Product[]>("/products", { query: { limit: 100 } });
  const keys = new Set(data.flatMap((product) => [product.slug, product.id]));
  knownKeys = { keys, expiresAt: Date.now() + KNOWN_KEYS_TTL_MS };
  return keys;
}

// Unknown product URLs are rewritten to a static route that calls notFound()
// while it is prerendered. The response is then a real 404 with the not-found UI.
export async function proxy(request: NextRequest) {
  const match = request.nextUrl.pathname.match(/^\/products\/([^/]+)\/?$/);

  if (match?.[1]) {
    const slug = decodeURIComponent(match[1]);

    try {
      const keys = await getKnownProductKeys();
      if (!keys.has(slug)) {
        return NextResponse.rewrite(new URL("/products/missing", request.url));
      }
    } catch {
      // If the catalog cannot be reached, let the page decide how to respond.
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/products/:path*"],
};
