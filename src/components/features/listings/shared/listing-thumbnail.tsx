"use client";

import { useState } from "react";
import Image from "next/image";

import { cn } from "@/lib/utils";

interface ListingThumbnailProps {
  src: string | null | undefined;
  alt?: string;
  className?: string;
  sizes?: string;
}

/**
 * Renders a 40px square thumbnail with a graceful fallback.
 *
 * If `src` is missing OR the underlying R2 fetch 404s (broken DB pointer,
 * file purged, etc.), shows the empty placeholder div instead of the
 * broken-image icon. The fallback applies per-instance via onError so other
 * thumbnails on the same page still load normally.
 */
export function ListingThumbnail({
  src,
  alt = "",
  className,
  sizes = "40px",
}: ListingThumbnailProps) {
  const [errored, setErrored] = useState(false);

  if (!src || errored) {
    return (
      <div
        className={cn(
          "size-10 shrink-0 rounded-lg border bg-muted",
          className,
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        "relative size-10 shrink-0 overflow-hidden rounded-lg border bg-muted",
        className,
      )}
    >
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover"
        sizes={sizes}
        onError={() => setErrored(true)}
      />
    </div>
  );
}
