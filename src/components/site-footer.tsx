import { connection } from "next/server";
import { Suspense } from "react";

// The year depends on the current time, so it is read at request time.
// connection() opts this part out of prerendering.
async function CopyrightYear() {
  await connection();
  return <>{new Date().getFullYear()}</>;
}

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t bg-gray-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-gray-600 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>
          &copy;{" "}
          <Suspense fallback={null}>
            <CopyrightYear />
          </Suspense>{" "}
          Vercel Swag Store. All rights reserved.
        </p>
        <p>Built with Next.js on Vercel.</p>
      </div>
    </footer>
  );
}
