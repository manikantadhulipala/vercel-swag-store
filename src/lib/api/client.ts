import "server-only";

// Thin wrapper around the Swag Store API. Every request sends the protection
// bypass header. Cart requests also send the x-cart-token header.

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

type ApiSuccess<T> = {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
};

type ApiFailure = {
  success: false;
  error: { code: string; message: string; details?: unknown };
};

type RequestOptions = {
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

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {}
): Promise<{ data: T; headers: Headers; meta?: Record<string, unknown> }> {
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

  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const payload = (await response.json().catch(() => null)) as ApiSuccess<T> | ApiFailure | null;

  if (!response.ok || !payload || payload.success === false) {
    const failure = payload && payload.success === false ? payload.error : undefined;
    throw new ApiError(
      response.status,
      failure?.code ?? "UNKNOWN",
      failure?.message ?? `Swag Store API request failed with status ${response.status}`
    );
  }

  return { data: payload.data, headers: response.headers, meta: payload.meta };
}
