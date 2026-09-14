"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LangSwitch } from "@/components/lang-switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Toast } from "@/components/ui/toast";
import {
  updateShopIdentity,
  updateShopInfos,
  toggleButton,
  reorderButtons,
  updateButton,
  changeShopPassword,
  shopLogout,
} from "@/app/actions/shop-admin";
import {
  THEME_PRESETS,
  THEME_NAMES,
  type ShopTheme,
  type ButtonType,
} from "@/lib/db/schema";
import { qrLink } from "@/lib/utils";
import { OWNER_PATH } from "@/lib/config";
import { effectiveTargets, isPhoneLike } from "@/lib/shop-buttons";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Eye, Trash2 } from "lucide-react";

type Shop = {
  id: string;
  name: string;
  slogan: string | null;
  thanksText: string | null;
  logoUrl: string | null;
  promoText: string | null;
  promoEnabled: boolean;
  pageLocale: "ar" | "fr";
  theme: unknown;
  email: string | null;
  addressText: string | null;
  hoursText: string | null;
  whatsappPrefill: string | null;
  telegramPrefill: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
};

type ButtonRow = {
  id: string;
  type: ButtonType;
  enabled: boolean;
  fullWidth?: boolean | null;
  sortOrder: number;
  url: string | null;
  label?: string | null;
  labelFr?: string | null;
  labelAr?: string | null;
  targets: Array<{ id: string; label: string; value: string }>;
};

type Tab = "page" | "buttons" | "infos" | "account";

function parseTheme(theme: unknown): ShopTheme {
  if (theme && typeof theme === "object" && "pageFrom" in (theme as object)) {
    return theme as ShopTheme;
  }
  return THEME_PRESETS["paper-light"];
}

const SUPPORT_WA = "213557041783";

export function ShopAdminShell({
  code,
  locale,
  impersonating,
  shop,
  buttons: initialButtons,
}: {
  code: string;
  locale: "fr" | "ar";
  impersonating: boolean;
  shop: Shop;
  buttons: ButtonRow[];
  gallery: unknown[];
}) {
  const isAr = locale === "ar";
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("page");
  const [toast, setToast] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [helpMsg, setHelpMsg] = useState("");

  const [identity, setIdentity] = useState({
    name: shop.name,
    slogan: shop.slogan || "",
    thanksText: shop.thanksText || "",
    promoText: shop.promoText || "",
    promoEnabled: !!shop.promoEnabled,
    pageLocale: shop.pageLocale || "ar",
    theme: parseTheme(shop.theme),
    logoUrl: shop.logoUrl || "",
  });
  const [dirtyPage, setDirtyPage] = useState(false);

  const [infos, setInfos] = useState({
    email: shop.email || "",
    addressText: shop.addressText || "",
    hoursText: shop.hoursText || "",
    whatsappPrefill: shop.whatsappPrefill || "",
    telegramPrefill: shop.telegramPrefill || "",
    seoTitle: shop.seoTitle || "",
    seoDescription: shop.seoDescription || "",
  });
  const [dirtyInfos, setDirtyInfos] = useState(false);

  const [buttons, setButtons] = useState(initialButtons);
  const [editBtn, setEditBtn] = useState<ButtonRow | null>(null);
  const [pwd, setPwd] = useState({ a: "", b: "" });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const enabled = useMemo(
    () =>
      buttons
        .filter((b) => b.enabled && effectiveTargets(b).length > 0)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [buttons],
  );
  const disabled = useMemo(
    () => buttons.filter((b) => !b.enabled || effectiveTargets(b).length === 0),
    [buttons],
  );

  const labels = isAr
    ? {
        page: "الصفحة",
        buttons: "الأزرار",
        infos: "المعلومات",
        account: "الحساب",
        save: "حفظ",
        cancel: "إلغاء",
        saved: "تم الحفظ",
        see: "عرض الصفحة",
        help: "وضع المساعدة",
        backOwner: "العودة للوحة",
        needLink: "أضف رابطاً أولاً",
      }
    : {
        page: "Page",
        buttons: "Boutons",
        infos: "Infos",
        account: "Compte",
        save: "Enregistrer",
        cancel: "Annuler",
        saved: "Enregistré",
        see: "Voir la page",
        help: "Mode aide",
        backOwner: "Retour au tableau",
        needLink: "Ajoutez un lien d’abord",
      };

  function savePage() {
    start(async () => {
      await updateShopIdentity(code, {
        ...identity,
        logoUrl: identity.logoUrl || null,
      });
      setDirtyPage(false);
      setToast(labels.saved);
      router.refresh();
    });
  }

  function saveInfos() {
    start(async () => {
      await updateShopInfos(code, infos);
      setDirtyInfos(false);
      setToast(labels.saved);
      router.refresh();
    });
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = enabled.map((b) => b.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    const next = arrayMove(enabled, oldIndex, newIndex);
    setButtons([
      ...next.map((b, i) => ({ ...b, sortOrder: i })),
      ...disabled,
    ]);
    start(async () => {
      await reorderButtons(
        code,
        next.map((b) => b.id),
      );
      setToast(labels.saved);
    });
  }

  async function onLogoFile(file: File) {
    const fd = new FormData();
    fd.set("file", file);
    fd.set("code", code);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const json = await res.json();
    if (json.url) {
      setIdentity((s) => ({ ...s, logoUrl: json.url }));
      setDirtyPage(true);
    }
  }

  function openHelpWhatsApp() {
    const text =
      helpMsg.trim() ||
      (isAr
        ? `مرحبا، أحتاج مساعدة في صفحة متجري ${identity.name} (${code})`
        : `Bonjour, j’ai besoin d’aide pour ma boutique ${identity.name} (${code})`);
    window.open(
      `https://wa.me/${SUPPORT_WA}?text=${encodeURIComponent(text)}`,
      "_blank",
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col bg-bg pb-28">
      <Toast message={toast} onDone={() => setToast(null)} />

      {impersonating && (
        <div className="bg-warn px-4 py-2 text-center text-sm font-medium text-white">
          {labels.help}{" "}
          <a
            href={`/${OWNER_PATH}`}
            className="underline"
          >
            {labels.backOwner}
          </a>
        </div>
      )}

      <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-line bg-bg/95 px-4 py-3 backdrop-blur">
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">{identity.name}</div>
          <div className="font-mono text-[12px] text-muted">{code}</div>
        </div>
        <a
          href={`/${code}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-line bg-surface"
          aria-label={labels.see}
        >
          <Eye className="h-5 w-5" />
        </a>
        <LangSwitch locale={locale} />
      </header>

      <main className="flex-1 px-4 py-4">
        {tab === "page" && (
          <div className="flex flex-col gap-4">
            <label className="flex h-40 cursor-pointer flex-col items-center justify-center rounded-[16px] border border-dashed border-line bg-surface">
              {identity.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={identity.logoUrl}
                  alt=""
                  className="max-h-36 max-w-[70%] object-contain"
                />
              ) : (
                <span className="text-muted">
                  {isAr ? "اضغط لإضافة الشعار" : "Touchez pour le logo"}
                </span>
              )}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void onLogoFile(f);
                }}
              />
            </label>

            <Input
              label={isAr ? "الاسم" : "Nom"}
              value={identity.name}
              onChange={(e) => {
                setIdentity({ ...identity, name: e.target.value });
                setDirtyPage(true);
              }}
            />
            <Input
              label={isAr ? "الشعار النصي" : "Slogan"}
              value={identity.slogan}
              onChange={(e) => {
                setIdentity({ ...identity, slogan: e.target.value });
                setDirtyPage(true);
              }}
            />
            <Textarea
              label={isAr ? "نص الشكر" : "Texte de remerciement"}
              value={identity.thanksText}
              onChange={(e) => {
                setIdentity({ ...identity, thanksText: e.target.value });
                setDirtyPage(true);
              }}
            />

            <label className="flex min-h-12 items-center gap-3">
              <input
                type="checkbox"
                className="h-5 w-5"
                checked={identity.promoEnabled}
                onChange={(e) => {
                  setIdentity({
                    ...identity,
                    promoEnabled: e.target.checked,
                  });
                  setDirtyPage(true);
                }}
              />
              <span>{isAr ? "إظهار عرض اليوم" : "Offre du jour"}</span>
            </label>
            {identity.promoEnabled && (
              <Input
                value={identity.promoText}
                onChange={(e) => {
                  setIdentity({ ...identity, promoText: e.target.value });
                  setDirtyPage(true);
                }}
              />
            )}

            <div>
              <div className="mb-2 text-[13px] font-medium text-muted">
                {isAr ? "لغة الصفحة" : "Langue de la page"}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    ["ar", isAr ? "العربية" : "Arabe"],
                    ["fr", isAr ? "الفرنسية" : "Français"],
                  ] as const
                ).map(([v, label]) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => {
                      setIdentity({ ...identity, pageLocale: v });
                      setDirtyPage(true);
                    }}
                    className={`min-h-12 rounded-xl border text-sm font-medium ${
                      identity.pageLocale === v
                        ? "border-ink bg-ink text-white"
                        : "border-line bg-surface"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-[12px] text-muted">
                {isAr
                  ? "لغة أزرار وصفحة الزبائن فقط"
                  : "Langue des boutons et de la page clients"}
              </p>
            </div>

            <div>
              <div className="mb-2 text-[13px] font-medium text-muted">
                {isAr ? "الثيم" : "Thème"}
              </div>
              <div className="flex flex-col gap-2">
                {Object.entries(THEME_PRESETS).map(([key, th]) => {
                  const name = THEME_NAMES[key];
                  const selected = identity.theme.preset === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setIdentity({ ...identity, theme: th });
                        setDirtyPage(true);
                      }}
                      className={`flex min-h-12 items-center gap-3 rounded-xl border px-3 text-start ${
                        selected
                          ? "border-ink bg-ink text-white"
                          : "border-line bg-surface"
                      }`}
                    >
                      <span
                        className="h-8 w-8 shrink-0 rounded-lg"
                        style={{
                          background: `linear-gradient(135deg, ${th.pageFrom}, ${th.cardFrom})`,
                        }}
                      />
                      <span className="font-medium">
                        {isAr ? name?.ar : name?.fr}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {tab === "buttons" && (
          <div className="flex flex-col gap-4">
            <p className="text-[13px] text-muted">
              {isAr
                ? "اسحب للترتيب · اضغط للتعديل · أضف عدة حسابات لكل زر"
                : "Glissez pour trier · Touchez pour éditer · Plusieurs liens par bouton"}
            </p>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={onDragEnd}
            >
              <SortableContext
                items={enabled.map((b) => b.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="flex flex-col gap-2">
                  {enabled.map((b) => (
                    <SortableButtonRow
                      key={b.id}
                      button={b}
                      isAr={isAr}
                      onEdit={() => setEditBtn(b)}
                      onDisable={() => {
                        start(async () => {
                          await toggleButton(code, b.id, false);
                          setButtons((prev) =>
                            prev.map((x) =>
                              x.id === b.id ? { ...x, enabled: false } : x,
                            ),
                          );
                        });
                      }}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            <div>
              <div className="mb-2 text-[13px] font-medium text-muted">
                {isAr ? "إضافة" : "Ajouter"}
              </div>
              <div className="flex flex-wrap gap-2">
                {disabled.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    className="min-h-11 rounded-full border border-line bg-surface px-4 text-sm capitalize"
                    onClick={() => setEditBtn({ ...b, enabled: true })}
                  >
                    + {b.type}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "infos" && (
          <div className="flex flex-col gap-3">
            <Textarea
              label={isAr ? "العنوان" : "Adresse"}
              value={infos.addressText}
              onChange={(e) => {
                setInfos({ ...infos, addressText: e.target.value });
                setDirtyInfos(true);
              }}
            />
            <Textarea
              label={isAr ? "أوقات العمل" : "Horaires"}
              value={infos.hoursText}
              onChange={(e) => {
                setInfos({ ...infos, hoursText: e.target.value });
                setDirtyInfos(true);
              }}
            />
            <Input
              label="Email"
              type="email"
              value={infos.email}
              onChange={(e) => {
                setInfos({ ...infos, email: e.target.value });
                setDirtyInfos(true);
              }}
            />
            <Textarea
              label={isAr ? "رسالة واتساب الافتراضية" : "Message WhatsApp"}
              value={infos.whatsappPrefill}
              onChange={(e) => {
                setInfos({ ...infos, whatsappPrefill: e.target.value });
                setDirtyInfos(true);
              }}
            />
            <Textarea
              label={isAr ? "رسالة تيليغرام" : "Message Telegram"}
              value={infos.telegramPrefill}
              onChange={(e) => {
                setInfos({ ...infos, telegramPrefill: e.target.value });
                setDirtyInfos(true);
              }}
            />
            <Input
              label={isAr ? "عنوان المشاركة" : "Titre partage"}
              value={infos.seoTitle}
              onChange={(e) => {
                setInfos({ ...infos, seoTitle: e.target.value });
                setDirtyInfos(true);
              }}
            />
            <Textarea
              label={isAr ? "وصف المشاركة" : "Description partage"}
              value={infos.seoDescription}
              onChange={(e) => {
                setInfos({ ...infos, seoDescription: e.target.value });
                setDirtyInfos(true);
              }}
            />
          </div>
        )}

        {tab === "account" && (
          <div className="flex flex-col gap-4">
            <div className="rounded-[16px] border border-line bg-surface p-4">
              <div className="text-[13px] text-muted">
                {isAr ? "الرابط العام" : "Lien public"}
              </div>
              <div className="mt-1 break-all font-mono text-sm">
                <bdi>{qrLink(code)}</bdi>
              </div>
              <Button
                type="button"
                variant="secondary"
                className="mt-3"
                size="sm"
                onClick={async () => {
                  await navigator.clipboard.writeText(qrLink(code));
                  setToast(isAr ? "تم النسخ" : "Copié");
                }}
              >
                {isAr ? "نسخ" : "Copier"}
              </Button>
            </div>

            <a
              href={`/print/shop/${code}`}
              className="inline-flex min-h-[52px] items-center justify-center rounded-[12px] bg-ink font-medium text-white"
            >
              {isAr ? "تصميم و طباعة QR (A4)" : "Créer & imprimer le QR (A4)"}
            </a>

            <div className="rounded-[16px] border border-line bg-surface p-4">
              <div className="mb-2 font-medium">
                {isAr ? "مساعدة / مشكلة" : "Aide / problème"}
              </div>
              <Textarea
                placeholder={
                  isAr ? "اكتب مشكلتك…" : "Décrivez votre problème…"
                }
                value={helpMsg}
                onChange={(e) => setHelpMsg(e.target.value)}
              />
              <Button
                type="button"
                className="mt-3"
                onClick={openHelpWhatsApp}
              >
                {isAr ? "تواصل مع الدعم" : "Contacter le support"}
              </Button>
            </div>

            <div className="rounded-[16px] border border-line bg-surface p-4">
              <div className="mb-3 font-medium">
                {isAr ? "تغيير كلمة المرور" : "Changer le mot de passe"}
              </div>
              <div className="flex flex-col gap-3">
                <Input
                  label={isAr ? "جديد" : "Nouveau"}
                  type="password"
                  value={pwd.a}
                  onChange={(e) => setPwd({ ...pwd, a: e.target.value })}
                />
                <Input
                  label={isAr ? "تأكيد" : "Confirmer"}
                  type="password"
                  value={pwd.b}
                  onChange={(e) => setPwd({ ...pwd, b: e.target.value })}
                />
                <Button
                  type="button"
                  disabled={pending || pwd.a.length < 6 || pwd.a !== pwd.b}
                  onClick={() => {
                    start(async () => {
                      await changeShopPassword(code, pwd.a);
                      setPwd({ a: "", b: "" });
                      setToast(labels.saved);
                    });
                  }}
                >
                  {labels.save}
                </Button>
              </div>
            </div>

            <Button
              type="button"
              variant="danger"
              onClick={() => {
                start(async () => {
                  await shopLogout(code);
                  router.refresh();
                });
              }}
            >
              {isAr ? "خروج" : "Déconnexion"}
            </Button>
          </div>
        )}
      </main>

      {((tab === "page" && dirtyPage) ||
        (tab === "infos" && dirtyInfos)) && (
        <div className="fixed inset-x-0 bottom-16 z-30 mx-auto max-w-lg px-4">
          <div className="flex gap-2 rounded-[16px] border border-line bg-surface p-2 shadow-lg">
            <Button
              type="button"
              variant="secondary"
              className="w-auto flex-1"
              onClick={() => {
                setDirtyPage(false);
                setDirtyInfos(false);
                router.refresh();
              }}
            >
              {labels.cancel}
            </Button>
            <Button
              type="button"
              className="w-auto flex-[1.4]"
              disabled={pending}
              onClick={() => (tab === "page" ? savePage() : saveInfos())}
            >
              {pending ? "…" : labels.save}
            </Button>
          </div>
        </div>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-lg border-t border-line bg-surface/95 backdrop-blur">
        {(
          [
            ["page", labels.page],
            ["buttons", labels.buttons],
            ["infos", labels.infos],
            ["account", labels.account],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex min-h-14 flex-1 flex-col items-center justify-center text-[11px] font-medium ${
              tab === id ? "text-accent" : "text-muted"
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      {editBtn && (
        <ButtonEditor
          button={editBtn}
          locale={locale}
          onClose={() => setEditBtn(null)}
          onSave={(data) => {
            start(async () => {
              const res = await updateButton(code, editBtn.id, data);
              if (res.ok && "error" in res && res.error === "empty") {
                setToast(labels.needLink);
                return;
              }
              setEditBtn(null);
              setToast(labels.saved);
              router.refresh();
            });
          }}
        />
      )}
    </div>
  );
}

const TYPE_LABELS_FR: Record<string, string> = {
  maps: "Maps",
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  snapchat: "Snapchat",
  youtube: "YouTube",
  phone: "Appel",
  whatsapp: "WhatsApp",
  telegram: "Telegram",
  email: "Email",
  review: "Avis Google",
  website: "Site",
  catalog: "Catalogue",
  custom: "Lien",
};
const TYPE_LABELS_AR: Record<string, string> = {
  maps: "Maps",
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  snapchat: "Snapchat",
  youtube: "YouTube",
  phone: "اتصال",
  whatsapp: "WhatsApp",
  telegram: "Telegram",
  email: "البريد",
  review: "تقييم قوقل",
  website: "الموقع",
  catalog: "كتالوج",
  custom: "رابط",
};

function SortableButtonRow({
  button,
  onEdit,
  onDisable,
  isAr,
}: {
  button: ButtonRow;
  onEdit: () => void;
  onDisable: () => void;
  isAr: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: button.id });
  const targets = effectiveTargets(button);
  const title = (isAr ? TYPE_LABELS_AR : TYPE_LABELS_FR)[button.type] || button.type;
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className="flex min-h-[56px] items-center gap-2 rounded-[14px] border border-line bg-surface pe-1 ps-1"
    >
      <button
        type="button"
        className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl text-muted"
        {...attributes}
        {...listeners}
        aria-label="Reorder"
      >
        <GripVertical className="h-5 w-5" />
      </button>
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-2 py-2 text-start"
        onClick={onEdit}
      >
        <span className="truncate text-[15px] font-semibold text-ink">
          {title}
        </span>
        <span className="inline-flex shrink-0 items-center rounded-full bg-bg px-2.5 py-0.5 text-[12px] font-medium tabular-nums text-muted">
          {targets.length}{" "}
          {isAr
            ? targets.length === 1
              ? "رابط"
              : "روابط"
            : targets.length === 1
              ? "lien"
              : "liens"}
        </span>
        {button.fullWidth ? (
          <span className="inline-flex shrink-0 items-center rounded-full bg-ink/5 px-2.5 py-0.5 text-[11px] font-medium text-ink">
            {isAr ? "عرض كامل" : "Pleine largeur"}
          </span>
        ) : null}
      </button>
      <button
        type="button"
        className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl text-muted hover:bg-bg hover:text-danger"
        onClick={onDisable}
        aria-label="Hide"
      >
        ✕
      </button>
    </div>
  );
}

function ButtonEditor({
  button,
  locale,
  onClose,
  onSave,
}: {
  button: ButtonRow;
  locale: "fr" | "ar";
  onClose: () => void;
  onSave: (data: {
    label?: string;
    fullWidth?: boolean;
    targets: Array<{ label: string; value: string }>;
  }) => void;
}) {
  const isAr = locale === "ar";
  const phoneLike = isPhoneLike(button.type);
  const initial = effectiveTargets(button);
  const [label, setLabel] = useState(
    button.label || button.labelAr || button.labelFr || "",
  );
  const [fullWidth, setFullWidth] = useState(
    !!button.fullWidth || button.type === "review",
  );
  const [targets, setTargets] = useState(
    initial.length
      ? initial.map((t) => ({ label: t.label, value: t.value }))
      : [{ label: "", value: "" }],
  );
  const [err, setErr] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
      <div className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-[20px] bg-surface p-5 sm:rounded-[20px]">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold capitalize">{button.type}</h3>
          <button type="button" onClick={onClose} className="min-h-10 px-2">
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <Input
            label={isAr ? "اسم الزر" : "Nom du bouton"}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={button.type}
          />

          <label className="flex min-h-12 items-center gap-3 rounded-xl border border-line px-3">
            <input
              type="checkbox"
              className="h-5 w-5"
              checked={fullWidth}
              onChange={(e) => setFullWidth(e.target.checked)}
            />
            <span className="text-sm">
              {isAr
                ? "عرض كامل (مكان زرّين)"
                : "Pleine largeur (2 colonnes)"}
            </span>
          </label>

          <div className="text-[13px] font-medium text-muted">
            {phoneLike
              ? isAr
                ? "الأرقام / الحسابات"
                : "Numéros / comptes"
              : isAr
                ? "الروابط"
                : "Liens"}
          </div>

          {targets.map((t, i) => (
            <div
              key={i}
              className="relative grid gap-2 rounded-xl border border-line p-3 pe-12"
            >
              <Input
                label={isAr ? "التسمية" : "Libellé"}
                value={t.label}
                onChange={(e) => {
                  const next = [...targets];
                  next[i] = { ...next[i], label: e.target.value };
                  setTargets(next);
                }}
                placeholder={
                  phoneLike
                    ? isAr
                      ? "مثال: المدير"
                      : "ex: Gérant"
                    : isAr
                      ? "اختياري"
                      : "optionnel"
                }
              />
              <Input
                label={
                  phoneLike
                    ? isAr
                      ? "الرقم / المعرف"
                      : "Numéro / @id"
                    : "URL"
                }
                value={t.value}
                onChange={(e) => {
                  const next = [...targets];
                  next[i] = { ...next[i], value: e.target.value };
                  setTargets(next);
                }}
              />
              <button
                type="button"
                className="absolute end-2 top-2 inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg text-danger"
                onClick={() => {
                  const next = targets.filter((_, j) => j !== i);
                  setTargets(next.length ? next : [{ label: "", value: "" }]);
                }}
                aria-label="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}

          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              setTargets([...targets, { label: "", value: "" }])
            }
          >
            {isAr ? "إضافة آخر" : "Ajouter un autre"}
          </Button>

          {err && <p className="text-[13px] text-danger">{err}</p>}

          <Button
            type="button"
            onClick={() => {
              const cleaned = targets.filter((t) => t.value.trim());
              if (cleaned.length === 0) {
                setErr(
                  isAr
                    ? "أضف رابطاً واحداً على الأقل أو احذف الزر"
                    : "Ajoutez au moins un lien, ou retirez le bouton",
                );
                return;
              }
              onSave({ label, fullWidth, targets: cleaned });
            }}
          >
            {isAr ? "حفظ" : "Enregistrer"}
          </Button>
        </div>
      </div>
    </div>
  );
}
