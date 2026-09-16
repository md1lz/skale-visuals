import bg1 from "@/assets/client-bg-1.jpg";
import bg2 from "@/assets/client-bg-2.jpg";
import bg3 from "@/assets/client-bg-3.jpg";
import bg4 from "@/assets/client-bg-4.jpg";

const FALLBACK_TOP = [bg1, bg2, bg3, bg4];
const FALLBACK_BOTTOM = [bg3, bg4, bg1, bg2];

function ThumbnailRow({ images, reverse = false }: { images: string[]; reverse?: boolean }) {
  const repeated = [...images, ...images];
  return (
    <div className="client-carousel-row">
      <div className={reverse ? "client-carousel-track-reverse" : "client-carousel-track"}>
        {repeated.map((image, index) => (
          <img
            key={`${image}-${index}`}
            src={image}
            alt=""
            className="client-carousel-thumbnail"
            loading={index < images.length ? "eager" : "lazy"}
          />
        ))}
      </div>
    </div>
  );
}

/** Two subtle, counter-scrolling thumbnail rows behind the client space. */
export function ClientBackdrop({ top = [], bottom = [] }: { top?: (string | null)[]; bottom?: (string | null)[] }) {
  const topImages = top.filter((image): image is string => Boolean(image));
  const bottomImages = bottom.filter((image): image is string => Boolean(image));

  return (
    <div aria-hidden className="client-carousel-backdrop">
      <div className="client-carousel-rows">
        <ThumbnailRow images={topImages.length ? topImages : FALLBACK_TOP} />
        <ThumbnailRow images={bottomImages.length ? bottomImages : FALLBACK_BOTTOM} reverse />
      </div>
      <div className="client-carousel-shade" />
    </div>
  );
}
