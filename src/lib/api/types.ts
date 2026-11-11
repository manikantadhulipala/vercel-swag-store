// Types for the Swag Store API, derived from the runtime schemas so the two stay in sync.
import type { z } from "zod";
import type {
  CartItemSchema,
  CartSchema,
  CategorySchema,
  PaginationSchema,
  ProductSchema,
  PromotionSchema,
  StockInfoSchema,
} from "./schemas";

export type Product = z.infer<typeof ProductSchema>;
export type StockInfo = z.infer<typeof StockInfoSchema>;
export type Category = z.infer<typeof CategorySchema>;
export type Promotion = z.infer<typeof PromotionSchema>;
export type PaginationMeta = z.infer<typeof PaginationSchema>;
export type CartItem = z.infer<typeof CartItemSchema>;
export type Cart = z.infer<typeof CartSchema>;
