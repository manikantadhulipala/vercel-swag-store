import "server-only";

import { cacheLife } from "next/cache";
import { ApiError, apiRequest } from "./client";
import type { Category, PaginationMeta, Product, Promotion, StockInfo } from "./types";

export type ProductQuery = {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
  featured?: boolean;
};

// Catalog data changes rarely, so it is cached. Stock and promotions are not
// cached (see below) because the API says they change on every request.

export async function listProducts(query: ProductQuery) {
  "use cache";
  cacheLife("minutes");

  const { data, meta } = await apiRequest<Product[]>("/products", {
    query: {
      page: query.page,
      limit: query.limit,
      category: query.category,
      search: query.search,
      featured: query.featured,
    },
  });

  return {
    products: data,
    pagination: meta?.pagination as PaginationMeta | undefined,
  };
}

export async function getProduct(id: string): Promise<Product | null> {
  "use cache";
  cacheLife("minutes");

  try {
    const { data } = await apiRequest<Product>(`/products/${encodeURIComponent(id)}`);
    return data;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export async function getCategories(): Promise<Category[]> {
  "use cache";
  cacheLife("hours");

  const { data } = await apiRequest<Category[]>("/categories");
  return data;
}

// Not cached: stock changes on every request.
export async function getStock(id: string): Promise<StockInfo | null> {
  try {
    const { data } = await apiRequest<StockInfo>(`/products/${encodeURIComponent(id)}/stock`);
    return data;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

// Not cached: the API picks a random promotion on each request.
export async function getActivePromotion(): Promise<Promotion | null> {
  const { data } = await apiRequest<Promotion>("/promotions");
  return data.active ? data : null;
}
