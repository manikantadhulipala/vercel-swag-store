import { z } from "zod";

// Runtime schemas for the Swag Store API. Every response is parsed against these,
// so an unexpected response shape fails clearly instead of reaching the UI.
// Prices are integer cents (3000 = $30.00).

export const ProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  price: z.number().int().nonnegative(),
  currency: z.string(),
  category: z.string(),
  images: z.array(z.string()),
  featured: z.boolean(),
  tags: z.array(z.string()),
  createdAt: z.string(),
});

export const StockInfoSchema = z.object({
  productId: z.string(),
  stock: z.number().int().nonnegative(),
  inStock: z.boolean(),
  lowStock: z.boolean(),
});

export const CategorySchema = z.object({
  slug: z.string(),
  name: z.string(),
  productCount: z.number().int().nonnegative(),
});

export const PromotionSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  code: z.string(),
  discountPercent: z.number().int().nonnegative(),
  validFrom: z.string(),
  validUntil: z.string(),
  active: z.boolean(),
});

export const PaginationSchema = z.object({
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
  hasNextPage: z.boolean(),
  hasPreviousPage: z.boolean(),
});

export const CartItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().positive(),
  addedAt: z.string(),
  product: ProductSchema,
  lineTotal: z.number().int().nonnegative(),
});

export const CartSchema = z.object({
  token: z.string(),
  items: z.array(CartItemSchema),
  totalItems: z.number().int().nonnegative(),
  subtotal: z.number().int().nonnegative(),
  currency: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
