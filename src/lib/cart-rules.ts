// Pure cart rules, kept free of framework and server imports so they can be unit tested.

export const CART_EXPIRED_MESSAGE = "Your cart has expired. Please try again.";
export const STOCK_UNAVAILABLE_MESSAGE =
  "Stock information is unavailable right now. Please try again.";

export function quantityInCart(
  items: readonly { productId: string; quantity: number }[] | undefined,
  productId: string
): number {
  return items?.find((item) => item.productId === productId)?.quantity ?? 0;
}

// Returns the message to show when adding `requested` units would exceed stock,
// counting the units already in the cart. Returns null when the add is allowed.
export function addQuantityError(input: {
  requested: number;
  inCart: number;
  available: number;
}): string | null {
  const { requested, inCart, available } = input;

  if (available <= 0) return "This product is out of stock.";
  if (inCart + requested <= available) return null;

  const remaining = Math.max(available - inCart, 0);
  return remaining === 0
    ? "You already have all available stock in your cart."
    : `Only ${remaining} more available.`;
}

// Returns the message to show when the requested absolute quantity exceeds stock.
export function updateQuantityError(input: {
  requested: number;
  available: number;
}): string | null {
  const { requested, available } = input;
  if (requested <= available) return null;
  return `Only ${available} available.`;
}
