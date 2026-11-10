"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getProduct, getStock } from "@/lib/api/catalog";
import { ApiError, apiRequest } from "@/lib/api/client";
import type { Cart } from "@/lib/api/types";
import { clearCartToken, createCart, fetchCart, getCartToken, setCartToken } from "@/lib/cart";

export type CartActionState = {
  error?: string;
  success?: string;
};

const MAX_LINE_QUANTITY = 99;

const addSchema = z.object({
  productId: z.string().min(1).max(100),
  quantity: z.coerce.number().int().min(1).max(MAX_LINE_QUANTITY),
});

const updateSchema = z.object({
  productId: z.string().min(1).max(100),
  quantity: z.coerce.number().int().min(0).max(MAX_LINE_QUANTITY),
});

const removeSchema = z.object({
  productId: z.string().min(1).max(100),
});

const CART_EXPIRED_MESSAGE = "Your cart has expired. Please try again.";

// Returns a usable cart token, creating a cart and storing its token if needed.
async function ensureCartToken(): Promise<string> {
  const existing = await getCartToken();
  if (existing && (await fetchCart(existing))) return existing;

  const token = await createCart();
  await setCartToken(token);
  return token;
}

function quantityInCart(cart: Cart | null, productId: string): number {
  return cart?.items.find((item) => item.productId === productId)?.quantity ?? 0;
}

export async function addToCart(
  _previousState: CartActionState,
  formData: FormData
): Promise<CartActionState> {
  const parsed = addSchema.safeParse({
    productId: formData.get("productId"),
    quantity: formData.get("quantity"),
  });
  if (!parsed.success) {
    return { error: "Choose a quantity between 1 and 99." };
  }

  const { productId, quantity } = parsed.data;

  const product = await getProduct(productId);
  if (!product) return { error: "This product no longer exists." };

  const stock = await getStock(productId);
  if (!stock || stock.stock <= 0) return { error: "This product is out of stock." };

  const token = await getCartToken();
  const cart = await fetchCart(token);
  const alreadyInCart = quantityInCart(cart, productId);

  if (alreadyInCart + quantity > stock.stock) {
    const remaining = Math.max(stock.stock - alreadyInCart, 0);
    return {
      error:
        remaining === 0
          ? "You already have all available stock in your cart."
          : `Only ${remaining} more available.`,
    };
  }

  const cartToken = await ensureCartToken();

  try {
    await apiRequest<Cart>("/cart", {
      method: "POST",
      cartToken,
      body: { productId, quantity },
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      await clearCartToken();
      return { error: CART_EXPIRED_MESSAGE };
    }
    throw error;
  }

  revalidatePath("/", "layout");
  return { success: `Added ${quantity} to your cart.` };
}

export async function updateCartQuantity(
  _previousState: CartActionState,
  formData: FormData
): Promise<CartActionState> {
  const parsed = updateSchema.safeParse({
    productId: formData.get("productId"),
    quantity: formData.get("quantity"),
  });
  if (!parsed.success) {
    return { error: "Choose a quantity between 0 and 99." };
  }

  const { productId, quantity } = parsed.data;
  const token = await getCartToken();
  if (!token) return { error: CART_EXPIRED_MESSAGE };

  if (quantity > 0) {
    const stock = await getStock(productId);
    if (!stock) return { error: "This product no longer exists." };
    if (quantity > stock.stock) {
      return { error: `Only ${stock.stock} available.` };
    }
  }

  try {
    await apiRequest<Cart>(`/cart/${encodeURIComponent(productId)}`, {
      method: "PATCH",
      cartToken: token,
      body: { quantity },
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      await clearCartToken();
      return { error: CART_EXPIRED_MESSAGE };
    }
    throw error;
  }

  revalidatePath("/", "layout");
  return {};
}

export async function removeFromCart(formData: FormData): Promise<void> {
  const parsed = removeSchema.safeParse({ productId: formData.get("productId") });
  if (!parsed.success) return;

  const token = await getCartToken();
  if (!token) return;

  try {
    await apiRequest<Cart>(`/cart/${encodeURIComponent(parsed.data.productId)}`, {
      method: "DELETE",
      cartToken: token,
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      await clearCartToken();
      revalidatePath("/", "layout");
      return;
    }
    throw error;
  }

  revalidatePath("/", "layout");
}
