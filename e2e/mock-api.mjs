// Test double for the Swag Store API. It forwards every request to the real API,
// except for the scenario named in MOCK_SCENARIO, which forces a known edge case:
//   out-of-stock  every product reports zero stock
//   low-stock     tote_001 reports exactly 2 in stock
//   expired-cart  requests that name a cart token are reported as not found
//   stable        every product reports 50 in stock (deterministic store flow)
//   api-down      every request fails with 503
//   (unset)       pure pass-through
import { createServer } from "node:http";

const PORT = Number(process.env.MOCK_PORT ?? 4010);
const UPSTREAM = (
  process.env.MOCK_UPSTREAM ?? "https://vercel-swag-store-api.vercel.app/api"
).replace(/\/$/, "");
const BYPASS = process.env.SWAG_API_BYPASS_TOKEN ?? "";
const SCENARIO = process.env.MOCK_SCENARIO ?? "";

function json(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

function stockBody(productId, stock) {
  return {
    success: true,
    data: { productId, stock, inStock: stock > 0, lowStock: stock >= 1 && stock <= 5 },
  };
}

function notFound(message) {
  return { success: false, error: { code: "NOT_FOUND", message } };
}

// Returns true when the scenario fully handled the request.
function applyScenario(req, res, path) {
  if (SCENARIO === "api-down") {
    json(res, 503, {
      success: false,
      error: { code: "INTERNAL_SERVER_ERROR", message: "Unavailable" },
    });
    return true;
  }

  const stockMatch = path.match(/^\/products\/([^/]+)\/stock$/);
  if (stockMatch) {
    const productId = stockMatch[1];
    if (SCENARIO === "out-of-stock") {
      json(res, 200, stockBody(productId, 0));
      return true;
    }
    if (SCENARIO === "low-stock" && productId === "tote_001") {
      json(res, 200, stockBody(productId, 2));
      return true;
    }
    // Every other scenario pins stock to a healthy value, so only the scenario's own
    // edge case can change the outcome.
    if (SCENARIO) {
      json(res, 200, stockBody(productId, 50));
      return true;
    }
  }

  if (SCENARIO === "expired-cart" && (path === "/cart" || path.startsWith("/cart/"))) {
    // Only requests that name a cart token are reported as expired.
    if (req.headers["x-cart-token"]) {
      json(res, 404, notFound("Cart not found or expired"));
      return true;
    }
  }

  return false;
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  const path = url.pathname.replace(/^\/api/, "");

  if (applyScenario(req, res, path)) return;

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = chunks.length ? Buffer.concat(chunks) : undefined;

  const headers = {};
  for (const name of ["content-type", "x-cart-token"]) {
    if (req.headers[name]) headers[name] = req.headers[name];
  }
  if (BYPASS) headers["x-vercel-protection-bypass"] = BYPASS;

  const upstream = await fetch(`${UPSTREAM}${path}${url.search}`, {
    method: req.method,
    headers,
    body,
  });

  res.writeHead(upstream.status, {
    "Content-Type": upstream.headers.get("content-type") ?? "application/json",
    ...(upstream.headers.get("x-cart-token")
      ? { "x-cart-token": upstream.headers.get("x-cart-token") }
      : {}),
  });
  res.end(Buffer.from(await upstream.arrayBuffer()));
});

server.listen(PORT, () => {
  console.log(`mock api on :${PORT} scenario=${SCENARIO || "pass-through"}`);
});
