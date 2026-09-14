"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Fits a true 210×297mm sheet into the container width.
 * Inner sheet is position:absolute so scaled mm width never expands the page
 * (that was causing horizontal scroll / jump on every settings change).
 */
export function A4PreviewFrame({ children }: { children: ReactNode }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.4);

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;

    const update = () => {
      const mmToPx = 96 / 25.4;
      const a4W = 210 * mmToPx;
      const w = el.clientWidth;
      if (w < 8) return;
      setScale(Math.min(1, w / a4W));
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const mmToPx = 96 / 25.4;
  const a4H = 297 * mmToPx;

  return (
    <div
      ref={frameRef}
      dir="ltr"
      className="relative mx-auto w-full overflow-hidden"
      style={{ height: Math.ceil(a4H * scale) }}
    >
      <div
        className="absolute top-0 left-0"
        style={{
          width: "210mm",
          height: "297mm",
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        {children}
      </div>
    </div>
  );
}
