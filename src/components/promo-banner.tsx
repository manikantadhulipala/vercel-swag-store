import { getActivePromotion } from "@/lib/api/catalog";

// Shows the promotion the API returns. The API picks one at random on each request
// and sets `active` when it is live, so that flag decides whether to show it.
export async function PromoBanner() {
  const promo = await getActivePromotion();
  if (!promo) return null;

  const codeText = promo.code === "AUTO" ? "Applied automatically" : `Code: ${promo.code}`;

  return (
    <div className="bg-black px-4 py-3 text-center text-sm text-white">
      <p>
        <span className="font-semibold">{promo.title}</span>
        <span className="mx-2">&mdash;</span>
        {promo.description} <span className="font-mono font-bold">{codeText}</span>
      </p>
    </div>
  );
}
