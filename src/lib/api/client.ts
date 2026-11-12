import "server-only";

import type { z } from "zod";

// Server-only wrapper around the Vercel Swag Store API. Every request sends the protection
// bypass header, and cart requests also send the x-cart-token header. Every response
// is validated against a schema before it is used, and failures are typed ApiErrors.

const REQUEST_TIMEOUT_MS = 10_000;

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

type ApiSuccess = {
  success: true;
  data: unknown;
  meta?: unknown;
};

type ApiFailure = {
  success: false;
  error: { code: string; message: string; details?: unknown };
};

type RequestOptions<S extends z.ZodType> = {
  schema: S;
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  cartToken?: string;
};

function getConfig() {
  const baseUrl = process.env.SWAG_API_BASE_URL;
  const bypassToken = process.env.SWAG_API_BYPASS_TOKEN;

  if (!baseUrl) {
    throw new Error("SWAG_API_BASE_URL is not set. Copy .env.example to .env.local.");
  }

  return { baseUrl: baseUrl.replace(/\/$/, ""), bypassToken };
}

export async function apiRequest<S extends z.ZodType>(
  path: string,
  options: RequestOptions<S>
): Promise<{ data: z.output<S>; meta: unknown; headers: Headers }> {
  const { baseUrl, bypassToken } = getConfig();
  const url = new URL(`${baseUrl}${path}`);

  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  const headers = new Headers({ Accept: "application/json" });
  if (bypassToken) headers.set("x-vercel-protection-bypass", bypassToken);
  if (options.cartToken) headers.set("x-cart-token", options.cartToken);
  if (options.body !== undefined) headers.set("Content-Type", "application/json");

  let response: Response;
  try {
    response = await fetch(url, {
      method: options.method ?? "GET",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new ApiError(503, "UNAVAILABLE", "The Vercel Swag Store API could not be reached.");
  }

  const payload = (await response.json().catch(() => null)) as ApiSuccess | ApiFailure | null;

  if (!response.ok || !payload || payload.success === false) {
    const failure = payload && payload.success === false ? payload.error : undefined;
    throw new ApiError(
      response.status,
      failure?.code ?? "UNKNOWN",
      failure?.message ?? `Vercel Swag Store API request failed with status ${response.status}`
    );
  }

  const parsed = options.schema.safeParse(payload.data);
  if (!parsed.success) {
    throw new ApiError(
      502,
      "INVALID_RESPONSE",
      `Unexpected response from the Vercel Swag Store API for ${options.method ?? "GET"} ${path}.`
    );
  }

  return { data: parsed.data, meta: payload.meta, headers: response.headers };
}
