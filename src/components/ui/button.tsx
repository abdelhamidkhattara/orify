import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "md" | "sm" | "lg";
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { className, variant = "primary", size = "md", disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled}
      className={cn(
        "inline-flex w-full items-center justify-center gap-2 rounded-[12px] font-medium transition-opacity active:opacity-90 disabled:opacity-50",
        size === "sm" && "min-h-10 px-3 text-sm",
        size === "md" && "min-h-[52px] px-4 text-base",
        size === "lg" && "min-h-14 px-5 text-base",
        variant === "primary" && "bg-accent text-accent-ink shadow-sm",
        variant === "secondary" &&
          "border border-line bg-surface text-ink",
        variant === "ghost" && "bg-transparent text-ink",
        variant === "danger" && "bg-danger text-white",
        className,
      )}
      {...props}
    />
  );
});
