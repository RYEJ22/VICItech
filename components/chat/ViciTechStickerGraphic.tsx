import type { ReactElement } from "react";
import type { ViciTechSticker, ViciTechStickerVariant } from "@/lib/chat/chat-media-catalog";

export interface ViciTechStickerGraphicProps {
  readonly sticker: ViciTechSticker;
  readonly size?: "sm" | "md";
  readonly className?: string;
}

function StickerEmblemSvg({
  variant,
  accentHex,
}: {
  readonly variant: ViciTechStickerVariant;
  readonly accentHex: string;
}): ReactElement {
  switch (variant) {
    case "gg-build":
      return (
        <svg viewBox="0 0 40 40" className="h-9 w-9 shrink-0" aria-hidden="true">
          <rect x="4" y="6" width="32" height="24" rx="5" fill={accentHex} fillOpacity="0.14" stroke={accentHex} strokeWidth="2" />
          <path d="M12 18l5 5 11-11" fill="none" stroke={accentHex} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M14 34h12" stroke={accentHex} strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      );
    case "bottleneck-alert":
      return (
        <svg viewBox="0 0 40 40" className="h-9 w-9 shrink-0" aria-hidden="true">
          <path d="M20 6L35 32H5L20 6Z" fill={accentHex} fillOpacity="0.14" stroke={accentHex} strokeWidth="2" strokeLinejoin="round" />
          <path d="M20 15v8" stroke={accentHex} strokeWidth="2.6" strokeLinecap="round" />
          <circle cx="20" cy="27.5" r="1.6" fill={accentHex} />
        </svg>
      );
    case "fps-max":
      return (
        <svg viewBox="0 0 40 40" className="h-9 w-9 shrink-0" aria-hidden="true">
          <circle cx="20" cy="22" r="13" fill={accentHex} fillOpacity="0.12" stroke={accentHex} strokeWidth="2" />
          <path d="M20 22l7-8" stroke={accentHex} strokeWidth="2.6" strokeLinecap="round" />
          <circle cx="20" cy="22" r="2.5" fill={accentHex} />
          <path d="M10 14l2 1.5M30 14l-2 1.5M20 9v3" stroke={accentHex} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "burn-in-ok":
      return (
        <svg viewBox="0 0 40 40" className="h-9 w-9 shrink-0" aria-hidden="true">
          <path d="M20 5l11 4.5v9.5c0 7.2-4.7 13.4-11 16-6.3-2.6-11-8.8-11-16V9.5L20 5Z" fill={accentHex} fillOpacity="0.14" stroke={accentHex} strokeWidth="2" strokeLinejoin="round" />
          <path d="M14.5 20.5l3.5 3.5 7.5-8" fill="none" stroke={accentHex} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "deal-market":
      return (
        <svg viewBox="0 0 40 40" className="h-9 w-9 shrink-0" aria-hidden="true">
          <path d="M7 19.5V8h11.5L33 22.5 21.5 34 7 19.5Z" fill={accentHex} fillOpacity="0.14" stroke={accentHex} strokeWidth="2" strokeLinejoin="round" />
          <circle cx="13.5" cy="14.5" r="2" fill={accentHex} />
          <path d="M18 23l5-5" stroke={accentHex} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "thermal-throttling":
      return (
        <svg viewBox="0 0 40 40" className="h-9 w-9 shrink-0" aria-hidden="true">
          <path d="M16 9a4 4 0 1 1 8 0v12.5a6.5 6.5 0 1 1-8 0V9Z" fill={accentHex} fillOpacity="0.14" stroke={accentHex} strokeWidth="2" />
          <circle cx="20" cy="27" r="3.2" fill={accentHex} />
          <path d="M20 13v11" stroke={accentHex} strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      );
    case "pc-sultan":
      return (
        <svg viewBox="0 0 40 40" className="h-9 w-9 shrink-0" aria-hidden="true">
          <path d="M6 28L9 13l7 6 4-9 4 9 7-6 3 15H6Z" fill={accentHex} fillOpacity="0.16" stroke={accentHex} strokeWidth="2" strokeLinejoin="round" />
          <path d="M8 33h24" stroke={accentHex} strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      );
    case "ngopi-render":
      return (
        <svg viewBox="0 0 40 40" className="h-9 w-9 shrink-0" aria-hidden="true">
          <path d="M9 17h17v9a7 7 0 0 1-7 7h-3a7 7 0 0 1-7-7v-9Z" fill={accentHex} fillOpacity="0.14" stroke={accentHex} strokeWidth="2" />
          <path d="M26 19h3a3 3 0 0 1 0 6h-3" fill="none" stroke={accentHex} strokeWidth="2" />
          <path d="M14 11c0-2 2-2 2-4M20 11c0-2 2-2 2-4" fill="none" stroke={accentHex} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "mantap-pol":
      return (
        <svg viewBox="0 0 40 40" className="h-9 w-9 shrink-0" aria-hidden="true">
          <path d="M20 6l3.8 8.2 9 1.1-6.6 6.2 1.7 8.9-7.9-4.4-7.9 4.4 1.7-8.9-6.6-6.2 9-1.1L20 6Z" fill={accentHex} fillOpacity="0.16" stroke={accentHex} strokeWidth="2" strokeLinejoin="round" />
        </svg>
      );
    case "upgrade-time":
      return (
        <svg viewBox="0 0 40 40" className="h-9 w-9 shrink-0" aria-hidden="true">
          <circle cx="20" cy="20" r="14" fill={accentHex} fillOpacity="0.12" stroke={accentHex} strokeWidth="2" />
          <path d="M20 27V13M14 19l6-6 6 6" fill="none" stroke={accentHex} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
  }
}

export function ViciTechStickerGraphic({
  sticker,
  size = "md",
  className = "",
}: ViciTechStickerGraphicProps): ReactElement {
  const isCompact = size === "sm";

  return (
    <div
      style={{
        backgroundColor: sticker.surfaceHex,
        borderColor: sticker.borderHex,
        color: sticker.textHex,
      }}
      className={`relative overflow-hidden rounded-2xl border select-none ${
        isCompact ? "p-2.5 shadow-xs" : "w-[178px] p-3.5 shadow-sm"
      } ${className}`}
    >
      <div className="flex items-start justify-between gap-2">
        <StickerEmblemSvg variant={sticker.id} accentHex={sticker.accentHex} />
        <span
          style={{
            backgroundColor: sticker.accentHex,
          }}
          className="rounded-md px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-wider text-white uppercase"
        >
          {sticker.badge}
        </span>
      </div>
      <div className={isCompact ? "mt-2" : "mt-2.5"}>
        <p
          className={`font-serif font-semibold leading-tight tracking-tight ${
            isCompact ? "text-xs" : "text-base"
          }`}
        >
          {sticker.title}
        </p>
        <p
          className={`mt-0.5 font-mono leading-snug opacity-80 ${
            isCompact ? "text-[10px]" : "text-[11px]"
          }`}
        >
          {sticker.subtitle}
        </p>
      </div>
    </div>
  );
}
