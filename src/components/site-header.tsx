import Link from "next/link";
import { Suspense } from "react";
import { getCart } from "@/lib/cart";
import { LogoMark } from "./logo-mark";

// Reads the cart from the session cookie, so it is dynamic. It streams in
// behind a Suspense boundary, and the header shell renders immediately.
async function CartLink() {
  const cart = await getCart();
  const count = cart?.totalItems ?? 0;
  const label = count > 0 ? `Cart, ${count} ${count === 1 ? "item" : "items"}` : "Cart";

  return (
    <Link
      href="/cart"
      aria-label={label}
      className="relative inline-flex items-center justify-center rounded-md p-2 text-gray-900 hover:bg-gray-100"
    >
      <svg
        viewBox="0 0 24 24"
        width="22"
        height="22"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M6 7h12l1 13H5L6 7Z" />
        <path d="M9 7V5a3 3 0 0 1 6 0v2" />
      </svg>
      {count > 0 ? (
        <span
          aria-hidden="true"
          className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-black px-1 font-semibold text-white text-xs"
        >
          {count}
        </span>
      ) : null}
    </Link>
  );
}

export function SiteHeader() {
  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 font-semibold text-gray-900">
            <LogoMark className="h-6 w-6" />
            <span>Swag Store</span>
          </Link>
          <nav aria-label="Main" className="flex items-center gap-4 text-gray-600 text-sm">
            <Link href="/" className="hover:text-gray-900">
              Home
            </Link>
            <Link href="/search" className="hover:text-gray-900">
              Search
            </Link>
          </nav>
        </div>
        <Suspense fallback={<span className="p-2" aria-hidden="true" />}>
          <CartLink />
        </Suspense>
      </div>
    </header>
  );
}
