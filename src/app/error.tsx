"use client";

import Link from "next/link";
import { useEffect } from "react";

// Catches errors in any route segment below the root layout (for example, when the
// catalog API is unreachable). The header and footer stay on screen.
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Route error", error.digest ?? error.message);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-start justify-center gap-4 px-4 py-24 sm:px-6">
      <p className="font-semibold text-gray-500 text-sm">Something went wrong</p>
      <h1 className="font-bold text-3xl text-gray-900 sm:text-4xl">We could not load this page.</h1>
      <p className="text-gray-600">The store may be temporarily unavailable. Please try again.</p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-md bg-black px-6 py-3 font-medium text-white hover:bg-gray-800"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-md border px-6 py-3 font-medium text-gray-900 hover:bg-gray-50"
        >
          Go home
        </Link>
      </div>
    </main>
  );
}
