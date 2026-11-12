"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getProduct, getStock } from "@/lib/api/catalog";
import { ApiError, apiRequest } from "@/lib/api/client";
import { CartSchema } from "@/lib/api/schemas";
import { clearCartToken, createCart, fetchCart, getCartToken, setCartToken } from "@/lib/cart";
import {
  addQuantityError,
  CART_EXPIRED_MESSAGE,
  quantityInCart,
  STOCK_UNAVAILABLE_MESSAGE,
  updateQuantityError,
} from "@/lib/cart-rules";

export type CartActionState = {
  error?: string;
  success?: string;
};

const productIdSchema = z.string().min(1).max(100);

const addSchema = z.object({
  productId: productIdSchema,
  quantity: z.coerce.number().int().min(1),
});

const updateSchema = z.object({
  productId: productIdSchema,
  quantity: z.coerce.number().int().min(0),
});

const removeSchema = z.object({ productId: productIdSchema });

// Returns a usable cart token, creating a cart and storing its token if needed.
async function ensureCartToken(): Promise<string> {
  const existing = await getCartToken();
  if (existing && (await fetchCart(existing))) return existing;

  const token = await createCart();
  await setCartToken(token);
  return token;
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
    return { error: "Choose a quantity of at least 1." };
  }

  const { productId, quantity } = parsed.data;

  const product = await getProduct(productId);
  if (!product) return { error: "This product no longer exists." };

  const stock = await getStock(productId);
  if (!stock) return { error: STOCK_UNAVAILABLE_MESSAGE };

  const cart = await fetchCart(await getCartToken());
  const stockError = addQuantityError({
    requested: quantity,
    inCart: quantityInCart(cart?.items, productId),
    available: stock.stock,
  });
  if (stockError) return { error: stockError };

  const cartToken = await ensureCartToken();

  try {
    await apiRequest("/cart", {
      schema: CartSchema,
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
    return { error: "Choose a quantity of 0 or more." };
  }

  const { productId, quantity } = parsed.data;
  const token = await getCartToken();
  if (!token) return { error: CART_EXPIRED_MESSAGE };

  if (quantity > 0) {
    const stock = await getStock(productId);
    if (!stock) return { error: "This product no longer exists." };

    const stockError = updateQuantityError({ requested: quantity, available: stock.stock });
    if (stockError) return { error: stockError };
  }

  try {
    await apiRequest(`/cart/${encodeURIComponent(productId)}`, {
      schema: CartSchema,
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
    await apiRequest(`/cart/${encodeURIComponent(parsed.data.productId)}`, {
      schema: CartSchema,
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
