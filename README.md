# Vercel Swag Store

A storefront for the fictional "Vercel Swag Store", built with Next.js 16 (App Router, Cache Components,
Server Actions, Suspense streaming) and TypeScript. It reads products, categories, promotions, stock, and carts
from the Swag Store API.

## Quick start

```bash
pnpm install
cp .env.example .env.local    # then set SWAG_API_BYPASS_TOKEN
pnpm dev                      # http://localhost:3000
```

| Command            | What it does                                              |
| ------------------ | --------------------------------------------------------- |
| `pnpm dev`         | Development server                                        |
| `pnpm build`       | Production build (type-checks and prerenders the catalog) |
| `pnpm start`       | Serve the production build                                |
| `pnpm check-types` | TypeScript type check (`tsc --noEmit`)                    |
| `pnpm lint`        | Biome lint                                                |
| `pnpm format`      | Biome format and fix                                      |
| `pnpm check`       | Type check plus Biome check                               |

### Environment variables

| Variable                | Required | Purpose                                                                  |
| ----------------------- | -------- | ------------------------------------------------------------------------ |
| `SWAG_API_BASE_URL`     | yes      | Base URL of the Swag Store API                                           |
| `SWAG_API_BYPASS_TOKEN` | yes      | Sent as `x-vercel-protection-bypass` on every API request                |
| `SITE_URL`              | no       | Absolute site URL for metadata. On Vercel, `VERCEL_URL` is used instead. |

These are server-only values. Nothing is exposed to the browser.

## Pages

| Route               | Behavior                                                                                                                                             |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                 | Hero, promotion banner (from the API), and a grid of six featured products                                                                           |
| `/products/[param]` | Product by slug or ID. Shows image, price, description, stock, quantity selector, and Add to Cart. Unknown products return 404.                      |
| `/search`           | Search with a 3-character minimum, 300 ms debounce, Enter or button submit, category filter, and URL state (`?q=&category=`). Shows up to 5 results. |
| `/cart`             | Cart with image, name, price, quantity controls, line totals, subtotal, and remove. Persists for the browser session.                                |

Every page exports its own metadata, including Open Graph. The root layout sets the defaults and the title template.

## Architecture

```
src/
  app/
    layout.tsx            root metadata, header, footer
    page.tsx              homepage
    products/[param]/     product detail, add-to-cart form
    products/missing/     static 404 target for unknown product URLs
    search/               search page, debounced search form
    cart/                 cart page, quantity control
    actions/cart.ts       Server Actions: add, update quantity, remove
  components/             header, footer, product card, promo banner
  lib/
    api/client.ts         server-only fetch wrapper with typed errors
    api/catalog.ts        catalog reads (cached) and stock/promotion reads (uncached)
    cart.ts               cart session cookie and cart reads
    search.ts             shared search rules and URL building
  proxy.ts                checks product URLs and rewrites unknown ones
```

### Caching and dynamic data

Cache Components is enabled (`cacheComponents: true` in `next.config.ts`). Data is split by how often it changes:

- **Cached with `"use cache"`:** the product list, product details, and categories. Products use `cacheLife("minutes")`, and categories use `cacheLife("hours")`.
- **Never cached:** stock, which the API says changes on every request, and the promotion, which the API picks at random on each request. Both are read at request time inside `<Suspense>`.
- **Per session:** the cart. Its token lives in an httpOnly session cookie (no expiry), so it lasts for the browser session. Cart reads happen at request time.

The home page, product pages, and search use Suspense, so the shell renders immediately and the dynamic parts stream in. The product pages are prerendered for every product returned by the catalog.

### Cart

- The first add creates a cart with `POST /cart/create`, stores its token in the `swag_cart_token` cookie, and then adds the item.
- Server Actions handle add, quantity change, and remove. Each one checks live stock before it writes, so the server enforces the limit even if the client is bypassed.
- A quantity of 0 removes the item (the API treats `PATCH` with `quantity: 0` as removal).
- If the API no longer knows the cart (it expires after 24 hours of inactivity), the cookie is cleared and the user sees a message to try again.
- Server Actions revalidate the layout, so the header badge updates right away.

### Search

- The URL is the source of truth: `/search?q=...&category=...`. Refreshing or sharing the URL shows the same results.
- The query needs at least 3 characters. Shorter input shows a hint and does not search.
- Typing restarts a 300 ms timer. Clearing the input removes the search immediately.
- Results use the API's `search` filter (name, description, and tags) and are limited to 5. With no search, six products show, filtered by category if one is selected.

### Unknown products and 404s

- `proxy.ts` looks up the slug in a catalog list that is cached in memory for five minutes. Unknown slugs are rewritten to `/products/missing`, a static route that calls `notFound()` while it is prerendered. The response is a real 404 with the not-found page.
- The product page also calls `notFound()` before it streams, as a backstop.
- The product route uses `export const instant = false`. It waits for the product lookup before streaming, so a product page is never sent as a partial shell. The trade-off is that navigation to a product waits for that lookup, which is short because the catalog is cached.

## Decisions and trade-offs

- **Blocking product route.** A product lookup that happens after streaming starts cannot change the HTTP status, so the route blocks until the lookup finishes. This keeps 404s correct.
- **Promotion banner.** The sample promotions from the API have validity dates that have passed. The banner trusts the API's `active` flag rather than comparing dates, so it shows the current promotion whenever the API marks one active.
- **Footer year.** The year is read at request time (`connection()`), so it is always current and does not go stale in a cached build.
- **Shared constants.** Search constants live in `src/lib/search.ts`, not in the client component file. Importing a value from a `"use client"` module into a Server Component gives a client reference, not the value.
- **Stock is live.** The API returns a different stock value on each request, so the product page, the quantity limit, and the add-to-cart check can disagree from one request to the next. The add-to-cart action checks stock at the moment of the click. A zero result shows "out of stock", and a failed lookup shows a retry message.
- **Stock limits.** The quantity selector is capped at available stock, and the Server Action enforces the same cap, counting what is already in the cart.

## API notes

- Base URL: `https://vercel-swag-store-api.vercel.app/api`. The OpenAPI spec is at `/api/openapi.json`.
- The bypass header is sent on every request, as the spec asks. The API accepted requests without it during testing.
- Prices are integer cents, and the UI formats them as USD.

## Verification

- `pnpm check`, `pnpm build`, and the Next.js route table all pass.
- Production server checks: every route returns the expected status, and unknown products return 404.
- Browser checks (headless Chrome, 16 checks): add to cart, badge count, cart listing, subtotal, quantity changes, persistence after reload, remove, search debounce, search URL updates, clearing search, and the 404 page.
- Responsive check: no horizontal overflow at 390 px or 1280 px.
