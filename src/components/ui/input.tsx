import { cn } from "@/lib/utils";
import { InputHTMLAttributes, forwardRef } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  error?: string;
};

export const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { className, label, hint, error, id, ...props },
  ref,
) {
  const inputId = id || props.name;
  return (
    <label className="flex w-full flex-col gap-1.5 text-start">
      {label && (
        <span className="text-[13px] font-medium text-muted">{label}</span>
      )}
      <input
        ref={ref}
        id={inputId}
        className={cn(
          "min-h-[52px] w-full rounded-[12px] border border-line bg-surface px-4 text-base text-ink outline-none transition-[border-color,box-shadow] placeholder:text-muted/70 focus:border-accent focus:ring-2 focus:ring-accent/20",
          error && "border-danger",
          className,
        )}
        {...props}
      />
      {error ? (
        <span className="text-[13px] text-danger">{error}</span>
      ) : hint ? (
        <span className="text-[13px] text-muted">{hint}</span>
      ) : null}
    </label>
  );
});
