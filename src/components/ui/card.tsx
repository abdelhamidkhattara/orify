import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

export function Card({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[16px] border border-line bg-surface p-5 shadow-[0_8px_24px_rgba(20,20,20,0.06)]",
        className,
      )}
      {...props}
    />
  );
}
