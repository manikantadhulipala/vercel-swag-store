import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Used as the base for absolute URLs in metadata (canonical, Open Graph images).
const siteUrl =
  process.env.SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

const siteDescription =
  "Premium swag for developers who build with Vercel. From tees to tech gear, represent the tools you love.";

// Default metadata for every page. Pages export their own metadata to override or extend it.
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Swag Store",
    template: "%s | Swag Store",
  },
  description: siteDescription,
  openGraph: {
    type: "website",
    siteName: "Swag Store",
    title: "Swag Store",
    description: siteDescription,
    url: "/",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
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
