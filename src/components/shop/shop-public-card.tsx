import type { ShopTheme } from "@/lib/db/schema";
import type { ButtonType } from "@/lib/db/schema";
import {
  buttonLabel,
  visibleButtons,
  resolveHref,
  effectiveTargets,
  BUTTON_GRADIENTS,
  BUTTON_ICONS,
} from "@/lib/shop-buttons";
import { getMessages } from "@/lib/i18n";
import { ShopSheetBridge } from "@/components/shop/shop-sheet-bridge";

type Target = { id: string; label: string; value: string };
type Button = {
  id: string;
  type: ButtonType;
  enabled: boolean;
  fullWidth?: boolean | null;
  url: string | null;
  label?: string | null;
  labelFr?: string | null;
  labelAr?: string | null;
  targets: Target[];
};

type Props = {
  code: string;
  name: string;
  slogan: string;
  thanksText: string;
  logoUrl: string | null;
  promoEnabled: boolean;
  promoText: string;
  addressText: string;
  hoursText: string;
  whatsappPrefill: string;
  telegramPrefill: string;
  theme: ShopTheme;
  buttons: Button[];
  gallery: { id: string; url: string }[];
  locale: "fr" | "ar";
};

export function ShopPublicCard(props: Props) {
  const {
    theme,
    name,
    slogan,
    thanksText,
    logoUrl,
    promoEnabled,
    promoText,
    addressText,
    hoursText,
    buttons,
    gallery,
    locale,
    whatsappPrefill,
    telegramPrefill,
  } = props;

  const messages = getMessages(locale);
  const visible = visibleButtons(buttons);

  const multiSheets = visible.filter((b) => effectiveTargets(b).length > 1);

  return (
    <div
      className="flex min-h-dvh flex-col items-center justify-center px-3 py-4"
      style={{
        background: `linear-gradient(135deg, ${theme.pageFrom} 0%, ${theme.pageTo} 100%)`,
        color: theme.text,
        fontFamily: "var(--font-tajawal), var(--font-sans), sans-serif",
        direction: locale === "ar" ? "rtl" : "ltr",
      }}
      lang={locale}
    >
      <div
        className="w-full max-w-[420px] rounded-2xl px-5 py-6 text-center"
        style={{
          background: `linear-gradient(180deg, ${theme.cardFrom} 0%, ${theme.cardTo} 100%)`,
          border: `1px solid ${theme.cardBorder}`,
          boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
        }}
      >
        {logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt={name}
            width={280}
            height={160}
            className="mx-auto mb-4 h-auto w-[min(280px,70%)] object-contain"
            style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.2))" }}
            fetchPriority="high"
          />
        )}

        <h1
          className="m-0 text-[1.75rem] font-bold leading-snug sm:text-[2.1rem]"
          style={{ color: theme.title }}
        >
          {slogan || name}
        </h1>

        {thanksText && (
          <p
            className="mt-2 mb-0 text-[1.05rem] font-medium leading-relaxed"
            style={{ color: theme.subtitle }}
          >
            {thanksText}
          </p>
        )}

        {promoEnabled && promoText && (
          <div
            className="mt-4 rounded-xl px-3 py-2 text-sm font-semibold"
            style={{
              background: "rgba(200,30,58,0.18)",
              border: `1px solid ${theme.cardBorder}`,
              color: theme.title,
            }}
          >
            {promoText}
          </div>
        )}

        {(addressText || hoursText) && (
          <div
            className="mt-3 space-y-0.5 text-[13px] leading-relaxed"
            style={{ color: theme.subtitle }}
          >
            {addressText && <div>{addressText}</div>}
            {hoursText && <div>{hoursText}</div>}
          </div>
        )}

        <div className="mt-5 grid grid-cols-2 gap-3">
          {visible.map((b) => {
            const targets = effectiveTargets(b);
            const label = buttonLabel(b, messages.buttons);
            const isFull = !!b.fullWidth || b.type === "review";
            const multi = targets.length > 1;
            const single = targets.length === 1 ? targets[0] : undefined;
            const href = multi
              ? undefined
              : resolveHref(b.type, single, whatsappPrefill, telegramPrefill);
            const textColor =
              b.type === "snapchat" ? "#141414" : "#ffffff";
            const className = [
              "flex min-h-16 flex-col items-center justify-center rounded-xl px-2 py-3 text-[0.9rem] font-medium text-white no-underline shadow-md transition-transform active:scale-[0.98]",
              isFull ? "col-span-2" : "",
              b.type === "review" ? "shop-review-pulse" : "",
            ].join(" ");

            if (multi) {
              return (
                <button
                  key={b.id}
                  type="button"
                  className={className}
                  style={{
                    background: BUTTON_GRADIENTS[b.type],
                    color: textColor,
                    border: "none",
                    cursor: "pointer",
                  }}
                  data-open-sheet={b.id}
                >
                  <i
                    className={`${BUTTON_ICONS[b.type]} mb-1.5 text-[1.5rem]`}
                    aria-hidden
                  />
                  {label}
                </button>
              );
            }

            return (
              <a
                key={b.id}
                href={href || "#"}
                target={
                  href?.startsWith("http") || href?.startsWith("mailto")
                    ? "_blank"
                    : undefined
                }
                rel="noopener noreferrer"
                className={className}
                style={{
                  background: BUTTON_GRADIENTS[b.type],
                  color: textColor,
                }}
              >
                <i
                  className={`${BUTTON_ICONS[b.type]} mb-1.5 text-[1.5rem]`}
                  aria-hidden
                />
                {label}
              </a>
            );
          })}
        </div>

        {gallery.length > 0 && (
          <div className="mt-5 -mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1">
            {gallery.map((g) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={g.id}
                src={g.url}
                alt=""
                className="h-28 w-40 shrink-0 snap-center rounded-xl object-cover"
              />
            ))}
          </div>
        )}
      </div>

      <p
        className="mt-3 flex items-center justify-center gap-1.5 text-[11px] opacity-50"
        style={{ color: theme.subtitle }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 64 64"
          width="12"
          height="12"
          aria-hidden
        >
          <g
            fill="none"
            stroke="currentColor"
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
            fill="currentColor"
            d="M32 22c1.2 6.2 6.6 10.6 12.8 11.8C38.6 35 33.2 39.4 32 45.6 30.8 39.4 25.4 35 19.2 33.8 25.4 32.6 30.8 28.2 32 22Z"
          />
        </svg>
        Orify
      </p>

      {multiSheets.map((b) => {
        const targets = effectiveTargets(b);
        const title =
          b.type === "phone"
            ? messages.shop.pickCall
            : b.type === "whatsapp"
              ? messages.shop.pickWhatsapp
              : b.type === "telegram"
                ? messages.shop.pickTelegram
                : labelPick(locale);
        return (
          <dialog
            key={b.id}
            id={`sheet-${b.id}`}
            className="m-auto w-[min(300px,85%)] rounded-2xl border-0 p-0 backdrop:bg-black/80 open:flex open:flex-col"
            style={{
              background: theme.cardFrom,
              color: theme.text,
              border: `1px solid ${theme.cardBorder}`,
            }}
          >
            <div className="flex flex-col gap-2.5 p-5 text-center">
              <h3 className="m-0 text-base font-semibold">{title}</h3>
              {targets.map((t) => {
                const href = resolveHref(
                  b.type,
                  t,
                  whatsappPrefill,
                  telegramPrefill,
                );
                return (
                  <a
                    key={t.id}
                    href={href || "#"}
                    className="block w-full rounded-lg px-3 py-3 text-center text-base font-medium text-white no-underline"
                    style={{ background: BUTTON_GRADIENTS[b.type] }}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t.label || t.value}
                  </a>
                );
              })}
              <button
                type="button"
                className="w-full rounded-lg px-3 py-3 text-base font-medium text-white"
                style={{
                  background: "linear-gradient(145deg,#f44336,#d32f2f)",
                  border: "none",
                  cursor: "pointer",
                }}
                data-close-sheet={b.id}
              >
                {messages.common.back}
              </button>
            </div>
          </dialog>
        );
      })}

      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"
      />
      <style>{`
        @keyframes shopPulse {
          0%,100% { transform: scale(1); }
          50% { transform: scale(1.03); }
        }
        .shop-review-pulse { animation: shopPulse 2s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .shop-review-pulse { animation: none; }
        }
      `}</style>
      <ShopSheetBridge />
    </div>
  );
}

function labelPick(locale: "fr" | "ar") {
  return locale === "ar" ? "اختر :" : "Choisissez :";
}
