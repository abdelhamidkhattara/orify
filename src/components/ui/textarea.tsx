import { cn } from "@/lib/utils";
import { TextareaHTMLAttributes, forwardRef } from "react";

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
};

export const Textarea = forwardRef<HTMLTextAreaElement, Props>(
  function Textarea({ className, label, id, ...props }, ref) {
    const inputId = id || props.name;
    return (
      <label className="flex w-full flex-col gap-1.5 text-start">
        {label && (
          <span className="text-[13px] font-medium text-muted">{label}</span>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            "min-h-24 w-full resize-y rounded-[12px] border border-line bg-surface px-4 py-3 text-base text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20",
            className,
          )}
          {...props}
        />
      </label>
    );
  },
);
