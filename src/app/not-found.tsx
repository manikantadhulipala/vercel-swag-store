import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-start justify-center gap-4 px-4 py-24 sm:px-6">
      <p className="font-semibold text-gray-500 text-sm">404</p>
      <h1 className="font-bold text-3xl text-gray-900 sm:text-4xl">We could not find that page.</h1>
      <p className="text-gray-600">The product or page may have moved or no longer exists.</p>
      <Link
        href="/search"
        className="rounded-md bg-black px-6 py-3 font-medium text-white hover:bg-gray-800"
      >
        Browse products
      </Link>
    </main>
  );
}
