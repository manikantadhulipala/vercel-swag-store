// Public base URL of the site. Used for absolute URLs in metadata, the sitemap, and robots.
// SITE_URL wins when set. On Vercel, VERCEL_URL is used. Local development falls back to localhost.
export const siteUrl =
  process.env.SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
