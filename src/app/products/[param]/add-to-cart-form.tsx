"use client";

import { useActionState, useState } from "react";
import { addToCart, type CartActionState } from "@/app/actions/cart";

const MAX_LINE_QUANTITY = 99;

const initialState: CartActionState = {};

export function AddToCartForm({ productId, stock }: { productId: string; stock: number }) {
  const [state, formAction, pending] = useActionState(addToCart, initialState);
  const [quantity, setQuantity] = useState(1);

  const outOfStock = stock <= 0;
  const maxQuantity = Math.min(stock, MAX_LINE_QUANTITY);

  const clamp = (value: number) => {
    if (Number.isNaN(value)) return 1;
    return Math.min(Math.max(value, 1), Math.max(maxQuantity, 1));
  };

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="productId" value={productId} />

      <div className="flex flex-col gap-2">
        <label htmlFor="quantity" className="font-medium text-gray-900 text-sm">
          Quantity
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setQuantity((current) => clamp(current - 1))}
            disabled={outOfStock || quantity <= 1}
            className="h-10 w-10 rounded-md border text-lg hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Decrease quantity"
          >
            &minus;
          </button>
          <input
            id="quantity"
            name="quantity"
            type="number"
            inputMode="numeric"
            min={1}
            max={maxQuantity}
            value={quantity}
            disabled={outOfStock}
            onChange={(event) => setQuantity(clamp(Number.parseInt(event.target.value, 10)))}
            className="h-10 w-20 rounded-md border text-center disabled:opacity-40"
          />
          <button
            type="button"
            onClick={() => setQuantity((current) => clamp(current + 1))}
            disabled={outOfStock || quantity >= maxQuantity}
            className="h-10 w-10 rounded-md border text-lg hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={outOfStock || pending}
        className="rounded-md bg-black px-6 py-3 font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
      >
        Add to Cart
      </button>

      {state.error ? (
        <p role="alert" className="text-red-600 text-sm">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p role="status" className="text-green-700 text-sm">
          {state.success}
        </p>
      ) : null}
    </form>
  );
}
