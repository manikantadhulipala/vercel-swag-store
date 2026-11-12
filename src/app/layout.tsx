import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getStoreConfig } from "@/lib/api/store";
import { siteUrl } from "@/lib/site";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Built-in defaults, used only if the store config cannot be read from the API.
const STORE_NAME = "Vercel Swag Store";
const fallbackDescription =
  "Premium swag for developers who build with Vercel. From tees to tech gear, represent the tools you love.";

// Default metadata for every page. Pages export their own metadata to override or extend it.
// The store name, title template, and description come from the API's store config.
export async function generateMetadata(): Promise<Metadata> {
  const config = await getStoreConfig();
  const name = config?.storeName ?? STORE_NAME;
  const description = config?.seo.defaultDescription ?? fallbackDescription;
  const template = config?.seo.titleTemplate ?? `%s | ${STORE_NAME}`;

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: config?.seo.defaultTitle ?? STORE_NAME,
      template,
    },
    description,
    generator: "vswag-cert-v3",
    openGraph: {
      type: "website",
      siteName: name,
      title: config?.seo.defaultTitle ?? STORE_NAME,
      description,
      url: "/",
    },
  };
}

// The theme color is set through the viewport export in Next.js.
export const viewport: Viewport = {
  themeColor: "#171719",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-white font-sans text-gray-900">
        <SiteHeader />
        <div className="flex flex-1 flex-col">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
