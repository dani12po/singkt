import {
  siFacebook,
  siInstagram,
  siPinterest,
  siTiktok,
  siVimeo,
  siX,
  siYoutube,
  type SimpleIcon,
} from "simple-icons";

const BRANDS: Record<string, SimpleIcon> = {
  tiktok: siTiktok,
  facebook: siFacebook,
  instagram: siInstagram,
  twitter: siX,
  youtube: siYoutube,
  vimeo: siVimeo,
  pinterest: siPinterest,
};

export const BRAND_IDS = new Set(Object.keys(BRANDS));

function GenericGlyph({ id, size }: { id: string; size: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  } as const;
  switch (id) {
    case "shortlink":
      return (
        <svg {...common}>
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      );
    case "universal":
      return (
        <svg {...common}>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      );
    case "video":
      return (
        <svg {...common}>
          <rect x="2" y="4" width="14" height="14" rx="2" />
          <path d="m16 10 6-3v10l-6-3" />
        </svg>
      );
    case "image":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="9" cy="9" r="2" />
          <path d="m21 15-3.5-3.5a2 2 0 0 0-3 0L6 20" />
        </svg>
      );
    case "audio":
      return (
        <svg {...common}>
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
        </svg>
      );
  }
}

/**
 * Platform brand logo (official Simple Icons artwork, inline SVG —
 * no network dependency) or a matching generic glyph.
 * Rendered in a softly tinted tile via .brand-tile.
 */
export function BrandIcon({ id, size = 28 }: { id: string; size?: number }) {
  const brand = BRANDS[id];
  if (!brand) {
    return (
      <span className="brand-tile brand-generic" aria-hidden="true">
        <GenericGlyph id={id} size={size} />
      </span>
    );
  }
  const hex = `#${brand.hex}`;
  return (
    <span
      className="brand-tile"
      style={{ backgroundColor: `${hex}14`, color: hex }}
      aria-hidden="true"
    >
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" role="img">
        <path d={brand.path} />
      </svg>
    </span>
  );
}
