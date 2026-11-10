"use client";

import { useActionState } from "react";
import { type CartActionState, updateCartQuantity } from "@/app/actions/cart";

const initialState: CartActionState = {};

// Both buttons submit the same form. The clicked button's value becomes the new quantity.
// A quantity of 0 removes the item.
export function QuantityControl({ productId, quantity }: { productId: string; quantity: number }) {
  const [state, formAction, pending] = useActionState(updateCartQuantity, initialState);

  return (
    <div className="flex flex-col gap-1">
      <form action={formAction} className="flex items-center gap-2">
        <input type="hidden" name="productId" value={productId} />
        <button
          type="submit"
          name="quantity"
          value={quantity - 1}
          disabled={pending}
          aria-label="Decrease quantity"
          className="h-9 w-9 rounded-md border hover:bg-gray-100 disabled:opacity-40"
        >
          &minus;
        </button>
        <span className="w-8 text-center font-medium tabular-nums" aria-live="polite">
          {quantity}
        </span>
        <button
          type="submit"
          name="quantity"
          value={quantity + 1}
          disabled={pending}
          aria-label="Increase quantity"
          className="h-9 w-9 rounded-md border hover:bg-gray-100 disabled:opacity-40"
        >
          +
        </button>
      </form>
      {state.error ? (
        <p role="alert" className="text-red-600 text-sm">
          {state.error}
        </p>
      ) : null}
    </div>
  );
}
