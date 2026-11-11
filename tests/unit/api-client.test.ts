import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ApiError, apiRequest } from "@/lib/api/client";
import { ProductSchema } from "@/lib/api/schemas";

const product = {
  id: "tote_001",
  name: "Black Canvas Tote Bag",
  slug: "black-canvas-tote-bag",
  description: "Sturdy black canvas tote.",
  price: 3000,
  currency: "USD",
  category: "bags",
  images: ["https://example.com/tote.png"],
  featured: true,
  tags: ["black"],
  createdAt: "2026-02-10T16:00:00Z",
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("apiRequest", () => {
  beforeEach(() => {
    vi.stubEnv("SWAG_API_BASE_URL", "https://api.example.com/api/");
    vi.stubEnv("SWAG_API_BYPASS_TOKEN", "test-token");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("sends the bypass header and returns parsed data", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse(200, { success: true, data: product }));
    vi.stubGlobal("fetch", fetchMock);

    const { data } = await apiRequest("/products/tote_001", { schema: ProductSchema });

    expect(data.name).toBe("Black Canvas Tote Bag");
    const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(url.toString()).toBe("https://api.example.com/api/products/tote_001");
    expect(new Headers(init.headers).get("x-vercel-protection-bypass")).toBe("test-token");
  });

  it("sends the cart token header when one is given", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse(200, { success: true, data: product }));
    vi.stubGlobal("fetch", fetchMock);

    await apiRequest("/cart", { schema: ProductSchema, cartToken: "abc" });

    const [, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(new Headers(init.headers).get("x-cart-token")).toBe("abc");
  });

  it("throws a typed ApiError with the API's error code on failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse(404, { success: false, error: { code: "NOT_FOUND", message: "Missing" } })
        )
    );

    const error = await apiRequest("/products/nope", { schema: ProductSchema }).catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(404);
    expect(error.code).toBe("NOT_FOUND");
  });

  it("rejects a response whose shape does not match the schema", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(200, { success: true, data: { id: "tote_001" } }))
    );

    const error = await apiRequest("/products/tote_001", { schema: ProductSchema }).catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(502);
    expect(error.code).toBe("INVALID_RESPONSE");
  });

  it("reports an unreachable API as a typed unavailable error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));

    const error = await apiRequest("/products", { schema: z.array(ProductSchema) }).catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(503);
    expect(error.code).toBe("UNAVAILABLE");
  });
});
