import { notFound } from "next/navigation";
import { ImageResponse } from "next/og";
import { getProduct } from "@/lib/api/catalog";
import { formatPrice } from "@/lib/format";

// Per-product Open Graph image at the recommended 1200 x 630 size. It uses the
// product photo, name, and price, and Next.js attaches it to the product page automatically.
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type Props = { params: Promise<{ param: string }> };

export default async function ProductOpenGraphImage({ params }: Props) {
  const { param } = await params;
  const product = await getProduct(param);
  if (!product) notFound();

  const image = product.images[0];

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        background: "#ffffff",
        color: "#0a0a0a",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          width: "560px",
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
          background: "#f5f5f5",
        }}
      >
        {image ? (
          // biome-ignore lint/performance/noImgElement: ImageResponse renders plain elements, not next/image
          <img
            src={image}
            width={460}
            height={460}
            style={{ objectFit: "contain" }}
            alt={product.name}
          />
        ) : null}
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "64px",
          width: "640px",
        }}
      >
        <div style={{ fontSize: 28, color: "#525252" }}>Swag Store</div>
        <div style={{ marginTop: 20, fontSize: 60, fontWeight: 700, lineHeight: 1.1 }}>
          {product.name}
        </div>
        <div style={{ marginTop: 28, fontSize: 40, fontWeight: 600 }}>
          {formatPrice(product.price, product.currency)}
        </div>
      </div>
    </div>,
    { ...size }
  );
}
