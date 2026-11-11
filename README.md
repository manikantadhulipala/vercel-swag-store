# Vercel Swag Store

A storefront for the fictional "Vercel Swag Store". It is built with Next.js 16 (App Router, Cache Components,
Server Actions, Suspense streaming) and TypeScript. It reads products, categories, promotions, stock, and carts
from the Swag Store API.

**Live site:** https://vercel-swag-store-three.vercel.app

## Quick start

```bash
pnpm install
cp .env.example .env.local    # then set SWAG_API_BYPASS_TOKEN
pnpm dev                      # http://localhost:3000
```

| Command         | What it does                                                 |
| --------------- | ------------------------------------------------------------ |
| `pnpm dev`      | Development server                                           |
| `pnpm build`    | Production build (type-checks and prerenders the catalog)    |
| `pnpm start`    | Serve the production build                                   |
| `pnpm check`    | Type check plus Biome lint and format check                  |
| `pnpm format`   | Biome format and safe fixes                                  |
| `pnpm test:e2e` | Browser tests against a production build (see Testing below) |

### Environment variables

| Variable                | Required | Purpose                                                                                                                   |
| ----------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------- |
| `SWAG_API_BASE_URL`     | yes      | Base URL of the Swag Store API                                                                                            |
| `SWAG_API_BYPASS_TOKEN` | yes      | Sent as `x-vercel-protection-bypass` on every API request                                                                 |
| `SITE_URL`              | no       | Public site URL for canonical links, Open Graph, sitemap, and robots. On Vercel, `VERCEL_URL` is used if this is not set. |

These are server-only values. Nothing is exposed to the browser.

## Pages

| Route               | Behavior                                                                                                                                       |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                 | Hero, promotion banner from the API, and a grid of six featured products                                                                       |
| `/products/[param]` | Product by slug or ID: image, price, description, live stock, quantity selector, and Add to Cart. Unknown products return 404.                 |
| `/search`           | Search with a 3-character minimum, 300 ms debounce, Enter or button submit, category filter, and URL state (`?q=&category=`). Up to 5 results. |
| `/cart`             | Cart with image, name, price, quantity controls, line totals, subtotal, and remove. Lasts for the browser session.                             |
| `/sitemap.xml`      | Home, search, and every product                                                                                                                |
| `/robots.txt`       | Allows crawling, excludes `/cart`, and points to the sitemap                                                                                   |
| `/opengraph-image`  | Generated default Open Graph image                                                                                                             |

Every page exports its own metadata, including Open Graph and canonical URLs. The root layout sets the defaults and the title template.

## Architecture

```
src/
  app/
    layout.tsx              root metadata, header, footer
    page.tsx                homepage
    error.tsx               recoverable error UI for route segments
    global-error.tsx        last-resort error UI for the root layout
    not-found.tsx           404 page
    products/[param]/       product detail and add-to-cart form
    products/missing/       static 404 target for unknown product URLs
    search/                 search page and debounced search form
    cart/                   cart page and quantity control
    actions/cart.ts         Server Actions: add, update quantity, remove
    sitemap.ts, robots.ts, opengraph-image.tsx
  components/               header, footer, product card, promo banner, skeleton helpers
  lib/
    api/client.ts           server-only API wrapper with typed errors
    api/catalog.ts          catalog reads (cached) and stock and promotion reads (uncached)
    cart.ts                 cart session cookie and cart reads
    search.ts               shared search rules and URL building
    site.ts                 public site URL
  proxy.ts                  checks product URLs and rewrites unknown ones
e2e/                        browser tests and the API mock they run against
```

### Caching and dynamic data

Cache Components is enabled (`cacheComponents: true` in `next.config.ts`). Data is split by how often it changes:

- **Cached with `"use cache"`:** the product list, product details, and categories. Products use `cacheLife("minutes")`, and categories use `cacheLife("hours")`.
- **Never cached:** stock, which the API says changes on every request, and the promotion, which the API picks at random on each request. Both are read at request time inside `<Suspense>`.
- **Per session:** the cart. Its token lives in an httpOnly session cookie with no expiry, so it lasts for the browser session. Cart reads happen at request time.

The home page, product pages, and search use Suspense, so the shell renders immediately and the dynamic parts stream in. Product pages are prerendered for every product in the catalog.

### Cart

- The first add creates a cart with `POST /cart/create`, stores its token in the `swag_cart_token` cookie, and then adds the item.
- Server Actions handle add, quantity change, and remove. Each one checks live stock before it writes, so the server enforces the limit even if the client is bypassed.
- Adding more than the available stock, counting what is already in the cart, is refused with the remaining quantity.
- A quantity of 0 removes the item, because the API treats `PATCH` with `quantity: 0` as removal.
- If the API no longer knows the cart (it expires after 24 hours of inactivity), the cookie is cleared and the user sees a message to try again. The cart page shows an empty cart in that case.
- Server Actions revalidate the layout, so the header badge updates right away.

### Search

- The URL is the source of truth: `/search?q=...&category=...`. Refreshing or sharing the URL shows the same results.
- The query needs at least 3 characters. Shorter input shows a hint and does not search.
- Typing restarts a 300 ms timer. Clearing the input removes the search immediately.
- Results use the API's `search` filter (name, description, and tags), limited to 5. With no search, six products show, filtered by category if one is selected.

### Unknown products and 404s

- `proxy.ts` checks the product slug against a catalog list cached in memory for five minutes. Unknown slugs are rewritten to `/products/missing`, a static route that calls `notFound()` while it is prerendered. The response is a real 404 with the not-found page.
- The product page also calls `notFound()` before it streams, as a backstop.
- The product route uses `export const instant = false`. It resolves the product before streaming, so a product page is always sent complete. The product lookup is cached, so the page resolves quickly.

### Errors, availability, and security

- If the catalog API fails, the affected section shows a recoverable error with a Try again button, and the header and footer stay on screen. A root-layout failure falls back to `global-error.tsx`.
- Security headers are set for every route: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, a strict `Referrer-Policy`, and a restrictive `Permissions-Policy`.
- Cart and API tokens are server-only. The cart cookie is httpOnly.

## Design decisions

- **Blocking product route.** A product lookup that happens after streaming starts cannot change the HTTP status, so the route blocks until the lookup finishes. This keeps 404s correct.
- **Promotion banner.** The banner shows the promotion the API marks as `active`, so it always reflects the API's current promotion.
- **Footer year.** The year is read at request time (`connection()`), so it is always current.
- **Shared constants.** Search constants live in `src/lib/search.ts`, not in the client component file. Importing a value from a `"use client"` module into a Server Component gives a client reference, not the value.
- **Live stock.** Stock is read on every request, matching the API's real-time model. The add-to-cart action checks stock at the moment of the click, and a zero result shows "out of stock". A failed lookup shows a retry message.
- **Stock limits.** The quantity selector is capped at the stock shown on the page, and the Server Action enforces the cap again, counting what is already in the cart.
- **Cart not cached.** The cart is per visitor, so it is never cached or shared.

## API notes

- Base URL: `https://vercel-swag-store-api.vercel.app/api`. The OpenAPI spec is at `/api/openapi.json`.
- The bypass header is sent on every request, as the spec asks.
- Prices are integer cents, and the UI formats them as USD.

## Testing

The browser suite runs against a production build. The API is replaced by `e2e/mock-api.mjs`, so each scenario is deterministic. Scenarios that aren't set in the mock pass through to the real API.

```bash
pnpm build
pnpm test:e2e
```

| Scenario       | What it checks                                                                                                                                                               |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `stable`       | Full store flow: product, quantity, add, badge, cart, subtotal, quantity changes, persistence after reload, remove, search, debounce, clearing, and the 404 page (16 checks) |
| `out-of-stock` | Out-of-stock message, disabled Add to Cart, disabled quantity input (4 checks)                                                                                               |
| `low-stock`    | Low-stock message, quantity capped at available stock, adding the available amount, and a server refusal beyond it (5 checks)                                                |
| `expired-cart` | Expired cart shows an empty cart, add reports the expiry, and the stale cookie is cleared (4 checks)                                                                         |
| `api-down`     | Recoverable error on home and product pages, header stays visible, Try again offered (5 checks)                                                                              |

`e2e/run.mjs` starts the mock and the app for each scenario, waits for both to respond, and stops them afterward. Set `CHROME_PATH` if Google Chrome is not in the default macOS location.

### Live checks

The live deployment passes the same store flow against the real API, covering the add-to-cart, cart, and search paths.
