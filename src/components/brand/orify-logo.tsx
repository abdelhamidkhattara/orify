import { cn } from "@/lib/utils";

type Props = {
  variant?: "mark" | "full";
  className?: string;
  /** Pixel height for the mark / logo */
  height?: number;
  priority?: boolean;
};

/** Orify brand mark or full wordmark — SVG for crisp UI. */
export function OrifyLogo({
  variant = "full",
  className,
  height = 28,
  priority = false,
}: Props) {
  if (variant === "mark") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src="/brand/orify-mark.svg"
        alt="Orify"
        width={height}
        height={height}
        className={cn("inline-block shrink-0", className)}
        style={{ width: height, height }}
        decoding="async"
        {...(priority ? { fetchPriority: "high" as const } : {})}
      />
    );
  }

  const width = Math.round((height * 280) / 64);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/orify-logo.svg"
      alt="Orify"
      width={width}
      height={height}
      className={cn("inline-block shrink-0", className)}
      style={{ height, width: "auto" }}
      decoding="async"
      {...(priority ? { fetchPriority: "high" as const } : {})}
    />
  );
}

/** Lightweight inline SVG mark (no network) — headers / tight chrome */
export function OrifyMark({
  className,
  size = 28,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <g
        fill="none"
        stroke="#C81E3A"
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M18 28V18h10" />
        <path d="M36 18h10v10" />
        <path d="M46 36v10H36" />
        <path d="M28 46H18V36" />
      </g>
      <path
        fill="#C81E3A"
        d="M32 22c1.2 6.2 6.6 10.6 12.8 11.8C38.6 35 33.2 39.4 32 45.6 30.8 39.4 25.4 35 19.2 33.8 25.4 32.6 30.8 28.2 32 22Z"
      />
    </svg>
  );
}

export function OrifyWordmark({
  className,
  size = 28,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <span
      className={cn("inline-flex items-center gap-2", className)}
      aria-label="Orify"
    >
      <OrifyMark size={size} />
      <span
        className="font-bold tracking-tight"
        style={{ fontSize: size * 0.85, lineHeight: 1 }}
      >
        <span className="text-accent">O</span>
        <span className="text-ink">rify</span>
      </span>
    </span>
  );
}
