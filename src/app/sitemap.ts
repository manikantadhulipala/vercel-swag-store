import type { MetadataRoute } from "next";
import { listProducts } from "@/lib/api/catalog";
import { siteUrl } from "@/lib/site";

// Lists the home page, search, and every product. Products come from the cached catalog.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { products } = await listProducts({ limit: 100 });

  return [
    { url: siteUrl, changeFrequency: "daily", priority: 1 },
    { url: `${siteUrl}/search`, changeFrequency: "daily", priority: 0.8 },
    ...products.map((product) => ({
      url: `${siteUrl}/products/${product.slug}`,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
  ];
}
