"use client";

// Last-resort boundary for errors in the root layout itself. It replaces the whole page,
// so it must render its own <html> and <body>.
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white p-6 font-sans text-gray-900">
        <h1 className="font-bold text-2xl">Something went wrong</h1>
        <p className="text-gray-600">Please try again in a moment.</p>
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-md bg-black px-6 py-3 text-white"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
