import { ApiError } from "@/lib/api/client";
import { getApiHealth } from "@/lib/api/store";

// Health of this storefront and of the Swag Store API it depends on.
// Returns 503 when the API cannot be reached or reports an unhealthy service.
export async function GET() {
  const checkedAt = new Date().toISOString();

  try {
    const api = await getApiHealth();
    const healthy = api.status === "ok";
    return Response.json(
      { status: healthy ? "ok" : "degraded", checkedAt, api },
      { status: healthy ? 200 : 503 }
    );
  } catch (error) {
    const reason =
      error instanceof ApiError ? error.message : "The Vercel Swag Store API could not be reached.";
    return Response.json(
      { status: "degraded", checkedAt, api: { status: "unreachable", reason } },
      { status: 503 }
    );
  }
}
