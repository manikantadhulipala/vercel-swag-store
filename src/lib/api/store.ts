import "server-only";

import { cacheLife } from "next/cache";
import { apiRequest } from "./client";
import { HealthSchema, StoreConfigSchema } from "./schemas";
import type { Health, StoreConfig } from "./types";

// Store name, SEO defaults, and feature flags. They change rarely, so they are cached.
// Returns null if the API cannot be reached, so the site falls back to its built-in defaults.
export async function getStoreConfig(): Promise<StoreConfig | null> {
  "use cache";
  cacheLife("hours");

  try {
    const { data } = await apiRequest("/store/config", { schema: StoreConfigSchema });
    return data;
  } catch {
    return null;
  }
}

// Service health of the API and its dependencies (Redis). Not cached, so it is live.
export async function getApiHealth(): Promise<Health> {
  const { data } = await apiRequest("/health", { schema: HealthSchema });
  return data;
}
