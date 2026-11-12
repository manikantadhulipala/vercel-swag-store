import "server-only";

import { cookies } from "next/headers";
import { ApiError, apiRequest } from "./api/client";
import { CartSchema } from "./api/schemas";
import type { Cart } from "./api/types";

// The cart token is stored in a session cookie (no expiry), so the cart lasts
// for the browser session. It is httpOnly, so client JavaScript cannot read it.
export const CART_COOKIE = "swag_cart_token";

export async function getCartToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(CART_COOKIE)?.value;
}

// Only call from Server Actions or Route Handlers. Cookies cannot be set during render.
export async function setCartToken(token: string): Promise<void> {
  const store = await cookies();
  store.set(CART_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

// Only call from Server Actions or Route Handlers.
export async function clearCartToken(): Promise<void> {
  const store = await cookies();
  store.delete(CART_COOKIE);
}

// The API returns the cart token in the x-cart-token response header (the documented
// source). The body also carries it, so the body is used only as a fallback.
export async function createCart(): Promise<string> {
  const { data, headers } = await apiRequest("/cart/create", {
    schema: CartSchema,
    method: "POST",
  });
  const token = headers.get("x-cart-token") ?? data.token;
  if (!token) throw new Error("The Vercel Swag Store API did not return a cart token.");
  return token;
}

// Returns null when there is no cart token, or when the API no longer knows the
// cart (it expires after 24 hours of inactivity).
export async function fetchCart(token: string | undefined): Promise<Cart | null> {
  if (!token) return null;

  try {
    const { data } = await apiRequest("/cart", { schema: CartSchema, cartToken: token });
    return data;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export async function getCart(): Promise<Cart | null> {
  return fetchCart(await getCartToken());
}
