import { describe, expect, it } from "vitest";
import { formatPrice } from "@/lib/format";

describe("formatPrice", () => {
  it("formats integer cents as USD currency", () => {
    expect(formatPrice(3000)).toBe("$30.00");
    expect(formatPrice(6550)).toBe("$65.50");
    expect(formatPrice(0)).toBe("$0.00");
  });
});
