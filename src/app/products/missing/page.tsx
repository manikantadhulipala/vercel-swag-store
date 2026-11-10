import { notFound } from "next/navigation";

// Target of the proxy rewrite for unknown products. notFound() runs while this
// static route is prerendered, so the response is a 404 with the not-found UI.
export default function MissingProductPage() {
  notFound();
}
