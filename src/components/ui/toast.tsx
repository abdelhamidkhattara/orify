"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function Toast({
  message,
  onDone,
}: {
  message: string | null;
  onDone?: () => void;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!message) {
      setVisible(false);
      return;
    }
    setVisible(true);
    const t = setTimeout(() => {
      setVisible(false);
      onDone?.();
    }, 2500);
    return () => clearTimeout(t);
  }, [message, onDone]);

  if (!message) return null;

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 top-3 z-[100] flex justify-center px-4 transition-opacity duration-150",
        visible ? "opacity-100" : "opacity-0",
      )}
    >
      <div className="rounded-full bg-ink px-4 py-2 text-sm text-white shadow-lg">
        {message}
      </div>
    </div>
  );
}
