import { describe, expect, it } from "vitest";
import { addQuantityError, quantityInCart, updateQuantityError } from "@/lib/cart-rules";

describe("addQuantityError", () => {
  it("refuses any add when the product is out of stock", () => {
    expect(addQuantityError({ requested: 1, inCart: 0, available: 0 })).toBe(
      "This product is out of stock."
    );
  });

  it("allows an add that fits within available stock", () => {
    expect(addQuantityError({ requested: 2, inCart: 0, available: 5 })).toBeNull();
  });

  it("counts units already in the cart", () => {
    expect(addQuantityError({ requested: 2, inCart: 3, available: 5 })).toBeNull();
    expect(addQuantityError({ requested: 3, inCart: 3, available: 5 })).toBe(
      "Only 2 more available."
    );
  });

  it("reports when the cart already holds all available stock", () => {
    expect(addQuantityError({ requested: 1, inCart: 2, available: 2 })).toBe(
      "You already have all available stock in your cart."
    );
  });
});

describe("updateQuantityError", () => {
  it("allows a quantity up to the available stock", () => {
    expect(updateQuantityError({ requested: 2, available: 2 })).toBeNull();
  });

  it("refuses a quantity above the available stock", () => {
    expect(updateQuantityError({ requested: 3, available: 2 })).toBe("Only 2 available.");
  });
});

describe("quantityInCart", () => {
  const items = [
    { productId: "tote_001", quantity: 2 },
    { productId: "hoodie_001", quantity: 1 },
  ];

  it("returns the quantity for a product in the cart", () => {
    expect(quantityInCart(items, "tote_001")).toBe(2);
  });

  it("returns zero for a product not in the cart or a missing cart", () => {
    expect(quantityInCart(items, "bottle_001")).toBe(0);
    expect(quantityInCart(undefined, "tote_001")).toBe(0);
  });
});
