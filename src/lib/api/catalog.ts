import "server-only";

import { cacheLife } from "next/cache";
import { z } from "zod";
import { ApiError, apiRequest } from "./client";
import {
  CategorySchema,
  PaginationSchema,
  ProductSchema,
  PromotionSchema,
  StockInfoSchema,
} from "./schemas";
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

  const { data, meta } = await apiRequest("/products", {
    schema: z.array(ProductSchema),
    query: {
      page: query.page,
      limit: query.limit,
      category: query.category,
      search: query.search,
      featured: query.featured,
    },
  });

  // Pagination is informational, so a malformed value is dropped rather than failing the list.
  const pagination = PaginationSchema.safeParse(
    (meta as { pagination?: unknown } | undefined)?.pagination
  );

  return {
    products: data as Product[],
    pagination: pagination.success ? (pagination.data as PaginationMeta) : undefined,
  };
}

export async function getProduct(id: string): Promise<Product | null> {
  "use cache";
  cacheLife("minutes");

  try {
    const { data } = await apiRequest(`/products/${encodeURIComponent(id)}`, {
      schema: ProductSchema,
    });
    return data;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export async function getCategories(): Promise<Category[]> {
  "use cache";
  cacheLife("hours");

  const { data } = await apiRequest("/categories", { schema: z.array(CategorySchema) });
  return data;
}

// Not cached: stock changes on every request.
export async function getStock(id: string): Promise<StockInfo | null> {
  try {
    const { data } = await apiRequest(`/products/${encodeURIComponent(id)}/stock`, {
      schema: StockInfoSchema,
    });
    return data;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

// Not cached: the API picks a random promotion on each request.
export async function getActivePromotion(): Promise<Promotion | null> {
  const { data } = await apiRequest("/promotions", { schema: PromotionSchema });
  return data.active ? data : null;
}
