"use client";

import { useState, type CSSProperties } from "react";

/** Public shop logo — fails soft if the URL is broken. */
export function ShopLogo({
  src,
  alt,
  className,
  style,
  width = 280,
  height = 160,
  priority = false,
}: {
  src: string;
  alt: string;
  className?: string;
  style?: CSSProperties;
  width?: number;
  height?: number;
  priority?: boolean;
}) {
  const [ok, setOk] = useState(true);
  if (!src || !ok) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      style={style}
      decoding="async"
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      onError={() => setOk(false)}
    />
  );
}
