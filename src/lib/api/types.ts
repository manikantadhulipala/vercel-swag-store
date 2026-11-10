// Types for the Swag Store API. Prices are integer cents (3000 = $30.00).

export type Product = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  images: string[];
  featured: boolean;
  tags: string[];
  createdAt: string;
};

export type StockInfo = {
  productId: string;
  stock: number;
  inStock: boolean;
  lowStock: boolean;
};

export type Category = {
  slug: string;
  name: string;
  productCount: number;
};

export type Promotion = {
  id: string;
  title: string;
  description: string;
  code: string;
  discountPercent: number;
  validFrom: string;
  validUntil: string;
  active: boolean;
};

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type CartItem = {
  productId: string;
  quantity: number;
  addedAt: string;
  product: Product;
  lineTotal: number;
};

export type Cart = {
  token: string;
  items: CartItem[];
  totalItems: number;
  subtotal: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
};
