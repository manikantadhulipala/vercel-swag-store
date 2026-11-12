import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { removeFromCart } from "@/app/actions/cart";
import type { Cart, CartItem } from "@/lib/api/types";
import { getCart } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import { QuantityControl } from "./quantity-control";

export const metadata: Metadata = {
  title: "Your cart",
  description: "Review the items in your Vercel Swag Store cart.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "Your cart | Vercel Swag Store",
    description: "Review the items in your Vercel Swag Store cart.",
    url: "/cart",
  },
};

export default function CartPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 md:py-16">
      <h1 className="mb-8 font-bold text-3xl text-gray-900 sm:text-4xl">Your cart</h1>
      <Suspense fallback={<CartSkeleton />}>
        <CartContents />
      </Suspense>
    </main>
  );
}

// The cart lives in a session cookie, so this part is read at request time.
async function CartContents() {
  const cart = await getCart();

  if (!cart || cart.items.length === 0) {
    return <EmptyCart />;
  }

  return (
    <div className="grid gap-10 lg:grid-cols-3">
      <ul className="flex flex-col divide-y lg:col-span-2">
        {cart.items.map((item) => (
          <CartRow key={item.productId} item={item} />
        ))}
      </ul>
      <CartSummary cart={cart} />
    </div>
  );
}

function CartRow({ item }: { item: CartItem }) {
  const image = item.product.images[0];

  return (
    <li className="flex gap-4 py-6">
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-gray-50 sm:h-28 sm:w-28">
        {image ? (
          <Image
            src={image}
            alt={item.product.name}
            fill
            sizes="112px"
            className="object-contain p-2"
          />
        ) : null}
      </div>

      <div className="flex flex-1 flex-col justify-between gap-4 sm:flex-row sm:gap-6">
        <div className="flex flex-col gap-1">
          <Link
            href={`/products/${item.product.slug}`}
            className="font-medium text-gray-900 hover:underline"
          >
            {item.product.name}
          </Link>
          <p className="text-gray-600 text-sm">
            {formatPrice(item.product.price, item.product.currency)} each
          </p>
          <form action={removeFromCart}>
            <input type="hidden" name="productId" value={item.productId} />
            <button type="submit" className="text-gray-500 text-sm underline hover:text-gray-900">
              Remove
            </button>
          </form>
        </div>

        <div className="flex items-start justify-between gap-6 sm:flex-col sm:items-end">
          <QuantityControl productId={item.productId} quantity={item.quantity} />
          <p className="font-semibold text-gray-900">
            {formatPrice(item.lineTotal, item.product.currency)}
          </p>
        </div>
      </div>
    </li>
  );
}

function CartSummary({ cart }: { cart: Cart }) {
  return (
    <aside className="flex h-fit flex-col gap-4 rounded-2xl bg-gray-50 p-6">
      <h2 className="font-semibold text-gray-900 text-lg">Summary</h2>
      <div className="flex justify-between text-gray-600">
        <span>Items</span>
        <span>{cart.totalItems}</span>
      </div>
      <div className="flex justify-between border-t pt-4 font-semibold text-gray-900">
        <span>Subtotal</span>
        <span>{formatPrice(cart.subtotal, cart.currency)}</span>
      </div>
      <p className="text-gray-500 text-sm">Shipping and taxes are calculated at checkout.</p>
    </aside>
  );
}

function EmptyCart() {
  return (
    <div className="flex flex-col items-start gap-4">
      <p className="text-gray-600 text-lg">Your cart is empty.</p>
      <Link
        href="/search"
        className="rounded-md bg-black px-6 py-3 font-medium text-white hover:bg-gray-800"
      >
        Browse products
      </Link>
    </div>
  );
}

function CartSkeleton() {
  return (
    <div className="flex flex-col gap-4" role="status" aria-label="Loading cart">
      <div className="h-28 animate-pulse rounded-lg bg-gray-100" />
      <div className="h-28 animate-pulse rounded-lg bg-gray-100" />
    </div>
  );
}
