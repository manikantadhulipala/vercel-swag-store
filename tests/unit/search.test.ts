import { describe, expect, it } from "vitest";
import { buildSearchUrl, MIN_QUERY_LENGTH } from "@/lib/search";

describe("buildSearchUrl", () => {
  it("returns the bare path when there is no query or category", () => {
    expect(buildSearchUrl("/search", "", "")).toBe("/search");
  });

  it("includes the query only once it reaches the minimum length", () => {
    expect(buildSearchUrl("/search", "ho", "")).toBe("/search");
    expect(buildSearchUrl("/search", "hoodie", "")).toBe("/search?q=hoodie");
  });

  it("trims the query and encodes it", () => {
    expect(buildSearchUrl("/search", "  black tee  ", "")).toBe("/search?q=black+tee");
  });

  it("adds the category alongside the query", () => {
    expect(buildSearchUrl("/search", "bottle", "bottles")).toBe(
      "/search?q=bottle&category=bottles"
    );
  });

  it("uses the documented minimum query length", () => {
    expect(MIN_QUERY_LENGTH).toBe(3);
  });
});
