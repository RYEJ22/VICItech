"use client";

import { useState, type ReactElement } from "react";

export interface ChatGifImageProps {
  readonly src: string;
  readonly alt: string;
  readonly title?: string;
  readonly width?: number;
  readonly height?: number;
  readonly className?: string;
  readonly showBadge?: boolean;
}

export function ChatGifImage({
  src,
  alt,
  title,
  width = 240,
  height = 180,
  className = "",
  showBadge = true,
}: ChatGifImageProps): ReactElement {
  const [hasFailed, setHasFailed] = useState(false);
  const label = title?.trim() || alt || "GIF Reaksi";

  if (hasFailed) {
    return (
      <div
        className={`flex min-h-[104px] flex-col justify-between rounded-lg border border-default bg-subtle p-3 text-left ${className}`}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="rounded bg-accent-cta px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-wider text-white uppercase">
            GIF
          </span>
          <span className="font-mono text-[10px] text-secondary">Pratinjau offline</span>
        </div>
        <p className="mt-2 line-clamp-2 text-xs font-medium text-primary">{label}</p>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-lg bg-subtle ${className}`}>
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading="lazy"
        decoding="async"
        onError={() => setHasFailed(true)}
        className="block h-full w-full object-cover"
      />
      {showBadge ? (
        <span className="pointer-events-none absolute bottom-1.5 left-1.5 rounded bg-black/70 px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-wider text-white uppercase backdrop-blur-xs">
          GIF
        </span>
      ) : null}
    </div>
  );
}
