# Vercel Swag Store

A production storefront for the Vercel Swag Store, built with **Next.js 16**, **React Server Components**, **Cache Components**, **Server Actions**, and **TypeScript**. Shoppers can browse the catalog, search and filter products, check live stock, and manage a session-based cart. The application is fully type-checked, linted, tested in a real browser, and deployed on Vercel.

**Live site:** https://vercel-swag-store-three.vercel.app
**Repository:** https://github.com/manikantadhulipala/vercel-swag-store

---

## Features

| Area                | Capabilities                                                                                                                                                                                                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Homepage**        | Hero section, promotion banner sourced from the API, and a responsive grid of six featured products                                                                                                                                                                            |
| **Product detail**  | Large product image, currency-formatted price, description, real-time stock indicator, quantity selector capped at available stock, and an Add to Cart action                                                                                                                  |
| **Search**          | Server-side filtering by name, description, and tags. Starts after three characters, with a 300 ms debounce, Enter or button submission, a category filter, and results up to five per query. Search state lives in the URL, so results persist on refresh and in shared links |
| **Cart**            | Add, update quantity, and remove items. Shows image, price, quantity, and line total for each item, with a subtotal. The cart persists for the browser session, and the header badge shows the item count                                                                      |
| **Navigation**      | Persistent header with logo, navigation links, and cart indicator. Footer with copyright and the current year                                                                                                                                                                  |
| **SEO and sharing** | Root metadata with a title template, per-page metadata, Open Graph and canonical URLs, a dynamic sitemap, `robots.txt`, and a generated default Open Graph image                                                                                                               |
| **Reliability**     | Clear 404 responses for unknown products, recoverable error screens with retry, and a global fallback for root-layout failures                                                                                                                                                 |
| **Security**        | Server-only API credentials, httpOnly session cookie for the cart, and security headers on every response (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`)                                                                               |

---

## Technical architecture

### Rendering and caching

Cache Components is enabled (`cacheComponents: true`). Each type of data uses the caching strategy that fits how often it changes:

| Data                          | Strategy                                  | Reason                                                     |
| ----------------------------- | ----------------------------------------- | ---------------------------------------------------------- |
| Product list, product details | `"use cache"` with `cacheLife("minutes")` | Catalog changes infrequently and is shared by all visitors |
| Categories                    | `"use cache"` with `cacheLife("hours")`   | Changes least often                                        |
| Stock                         | Request-time, inside `<Suspense>`         | Updates on every request, so it is never cached            |
| Promotion banner              | Request-time, inside `<Suspense>`         | The API selects a promotion per request                    |
| Cart                          | Request-time, per session cookie          | Personal to each visitor                                   |

Pages stream their dynamic content behind Suspense boundaries, so the page shell renders immediately and the rest arrives as it resolves. Product pages are prerendered for every product in the catalog at build time.

### Routing and 404 handling

- `src/proxy.ts` checks product URLs against the catalog. Unknown slugs are rewritten to `/products/missing`, a static route that calls `notFound()` during prerendering. The result is a real HTTP 404 with the store's not-found page.
- The product route resolves the product before streaming begins, so every product page is delivered complete and with the correct status code.

### Cart

- The first add creates a cart through the API and stores its token in an httpOnly session cookie (`swag_cart_token`).
- Add, quantity change, and remove run as Server Actions. Each action checks live stock before writing, so limits are enforced on the server.
- A quantity of 0 removes the item.
- Each action revalidates the layout, so the header badge updates immediately.
- When a cart has expired on the API side, the cookie is cleared and the visitor is shown a clear message.

### Search

- The URL is the source of truth: `/search?q=...&category=...`.
- Results come from the API's search filter, limited to five per query. With no query, six products are shown, filtered by category when one is selected.
- Typing restarts a 300 ms debounce. Clearing the input clears the search immediately.

### Error handling

- Route-level errors render inside the store layout, so the header and footer stay available, and the visitor can retry.
- A root-layout error falls back to a dedicated global error page.

---

## Project structure

```
src/
  app/
    layout.tsx              Root metadata, header, footer
    page.tsx                Homepage
    search/                 Search page and debounced search form
    cart/                   Cart page and quantity control
    products/[param]/       Product detail and add-to-cart form
    products/missing/       Static target for unknown product URLs
    actions/cart.ts        Server Actions: add, update quantity, remove
    error.tsx               Recoverable error UI
    global-error.tsx        Root-layout error UI
    not-found.tsx           404 page
    sitemap.ts              Sitemap
    robots.ts               robots.txt
    opengraph-image.tsx     Default Open Graph image
  components/               Header, footer, product card, promotion banner
  lib/
    api/client.ts           Server-only API client with typed errors
    api/catalog.ts          Catalog reads (cached) and stock and promotion reads (live)
    cart.ts                 Cart session and cart reads
    search.ts               Shared search rules and URL building
    site.ts                 Public site URL
  proxy.ts                  Product URL checks and rewrites
e2e/                        Browser test suite and API mock
```

---

## Getting started

### Prerequisites

- Node.js 20 or later
- pnpm 9 or later
- Google Chrome (optional, required only for `pnpm test:e2e`)

### Setup

```bash
pnpm install
cp .env.example .env.local
```

Set the values in `.env.local`:

| Variable                | Description                                                                                                                                         |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SWAG_API_BASE_URL`     | Base URL of the Swag Store API                                                                                                                      |
| `SWAG_API_BYPASS_TOKEN` | Protection bypass token, sent as `x-vercel-protection-bypass` on every API request                                                                  |
| `SITE_URL`              | Optional. Public site URL used for canonical links, Open Graph, the sitemap, and `robots.txt`. On Vercel, `VERCEL_URL` is used when this is not set |

These values are used only on the server. None of them are exposed to the browser.

### Run locally

```bash
pnpm dev        # http://localhost:3000
```

### Scripts

| Script          | Description                                                       |
| --------------- | ----------------------------------------------------------------- |
| `pnpm dev`      | Start the development server                                      |
| `pnpm build`    | Create a production build                                         |
| `pnpm start`    | Serve the production build                                        |
| `pnpm check`    | Run the TypeScript type check and the Biome lint and format check |
| `pnpm format`   | Apply Biome formatting and safe fixes                             |
| `pnpm test:e2e` | Run the browser test suite against a production build             |

---

## Testing

The browser test suite runs against a production build. The Swag Store API is replaced by a mock (`e2e/mock-api.mjs`), so each scenario runs with known, repeatable data. Any behavior the mock does not override is served by the real API.

```bash
pnpm build
pnpm test:e2e
```

| Scenario       | Coverage                                                                                                                                                                                                                             |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `stable`       | End-to-end store flow: product page, quantity selection, add to cart, header badge, cart contents and subtotal, quantity changes, persistence after reload, removal, search, debounce, clearing search, and the 404 page (16 checks) |
| `out-of-stock` | Out-of-stock indicator, disabled Add to Cart, disabled quantity input (4 checks)                                                                                                                                                     |
| `low-stock`    | Low-stock indicator, quantity capped at available stock, adding the available amount, and server-side refusal beyond it (5 checks)                                                                                                   |
| `expired-cart` | Expired cart shows an empty cart, adding reports the expiry, and the stale cookie is cleared (4 checks)                                                                                                                              |
| `api-down`     | Recoverable error on the homepage and product pages, header remains visible, retry offered (5 checks)                                                                                                                                |

`e2e/run.mjs` starts the mock and the application for each scenario, waits for both to respond, runs the checks, and shuts them down. Set `CHROME_PATH` if Google Chrome is not installed in the default macOS location.

---

## API integration

- **Base URL:** `https://vercel-swag-store-api.vercel.app/api`
- **Specification:** `/api/openapi.json`
- **Endpoints used:** products (list, detail, stock), categories, promotions, and cart (create, read, add, update, remove)
- **Pricing:** prices are integer cents, formatted as USD in the interface
- **Authentication:** the protection bypass header is sent on every request, and cart requests include the `x-cart-token` header

---

## Deployment

The application is deployed on Vercel. Production environment variables are `SWAG_API_BASE_URL`, `SWAG_API_BYPASS_TOKEN` (stored as sensitive), and `SITE_URL`.

## Code quality

- **TypeScript:** strict mode, checked with `pnpm check-types`
- **Biome:** linting and formatting, including Tailwind CSS directives
- **Browser tests:** the suite described above
