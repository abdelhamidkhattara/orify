"use client";

import { useEffect } from "react";

/** Wires data-open-sheet / data-close-sheet on the live shop page (dialogs). */
export function ShopSheetBridge() {
  useEffect(() => {
    function onClick(e: Event) {
      const el = (e.target as HTMLElement | null)?.closest?.(
        "[data-open-sheet], [data-close-sheet]",
      ) as HTMLElement | null;
      if (!el) return;
      const openId = el.getAttribute("data-open-sheet");
      const closeId = el.getAttribute("data-close-sheet");
      if (openId) {
        const d = document.getElementById(
          `sheet-${openId}`,
        ) as HTMLDialogElement | null;
        d?.showModal?.();
      }
      if (closeId) {
        const d = document.getElementById(
          `sheet-${closeId}`,
        ) as HTMLDialogElement | null;
        d?.close?.();
      }
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return null;
}
