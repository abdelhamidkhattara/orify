import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const agents = sqliteTable("agents", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone"),
  passwordHash: text("password_hash"),
  passwordEncrypted: text("password_encrypted"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const codes = sqliteTable("codes", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  status: text("status", { enum: ["unused", "live", "disabled"] })
    .notNull()
    .default("unused"),
  agentId: text("agent_id").references(() => agents.id),
  shopId: text("shop_id"),
  note: text("note"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  claimedAt: integer("claimed_at", { mode: "timestamp" }),
});

export const shops = sqliteTable("shops", {
  id: text("id").primaryKey(),
  codeId: text("code_id")
    .notNull()
    .unique()
    .references(() => codes.id),
  name: text("name").notNull(),
  slogan: text("slogan").default(""),
  thanksText: text("thanks_text").default(""),
  logoUrl: text("logo_url"),
  coverUrl: text("cover_url"),
  passwordHash: text("password_hash").notNull(),
  passwordEncrypted: text("password_encrypted").notNull(),
  ownerPhone: text("owner_phone"),
  /** Live page language — buttons & chrome use this only */
  pageLocale: text("page_locale", { enum: ["ar", "fr"] })
    .notNull()
    .default("ar"),
  theme: text("theme", { mode: "json" }).$type<ShopTheme>().notNull(),
  addressText: text("address_text").default(""),
  hoursText: text("hours_text").default(""),
  promoText: text("promo_text").default(""),
  promoEnabled: integer("promo_enabled", { mode: "boolean" })
    .notNull()
    .default(false),
  email: text("email").default(""),
  websiteUrl: text("website_url").default(""),
  mapsUrl: text("maps_url").default(""),
  googleReviewUrl: text("google_review_url").default(""),
  catalogUrl: text("catalog_url").default(""),
  whatsappPrefill: text("whatsapp_prefill").default(""),
  telegramPrefill: text("telegram_prefill").default(""),
  seoTitle: text("seo_title").default(""),
  seoDescription: text("seo_description").default(""),
  /** A4 print preferences for this shop */
  printSettings: text("print_settings", { mode: "json" }).$type<PrintSettings>(),
  isDemo: integer("is_demo", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const shopButtons = sqliteTable("shop_buttons", {
  id: text("id").primaryKey(),
  shopId: text("shop_id")
    .notNull()
    .references(() => shops.id, { onDelete: "cascade" }),
  type: text("type", {
    enum: [
      "maps",
      "facebook",
      "instagram",
      "tiktok",
      "snapchat",
      "youtube",
      "phone",
      "whatsapp",
      "telegram",
      "email",
      "review",
      "website",
      "catalog",
      "custom",
    ],
  }).notNull(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(false),
  /** Span both columns like Google review */
  fullWidth: integer("full_width", { mode: "boolean" }).notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  /** Single label in the shop page language */
  label: text("label").default(""),
  url: text("url").default(""),
  icon: text("icon").default(""),
});

export const shopTargets = sqliteTable("shop_targets", {
  id: text("id").primaryKey(),
  buttonId: text("button_id")
    .notNull()
    .references(() => shopButtons.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  value: text("value").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const galleryImages = sqliteTable("gallery_images", {
  id: text("id").primaryKey(),
  shopId: text("shop_id")
    .notNull()
    .references(() => shops.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const leads = sqliteTable("leads", {
  id: text("id").primaryKey(),
  shopName: text("shop_name").notNull(),
  contactName: text("contact_name").notNull(),
  phone: text("phone").notNull(),
  city: text("city").default(""),
  message: text("message").default(""),
  /** Optional socials / extras filled on homepage */
  extras: text("extras", { mode: "json" }).$type<LeadExtras>(),
  locale: text("locale").default("fr"),
  status: text("status", {
    enum: ["new", "contacted", "converted", "refused"],
  })
    .notNull()
    .default("new"),
  convertedCodeId: text("converted_code_id"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const ownerSettings = sqliteTable("owner_settings", {
  id: text("id").primaryKey().default("main"),
  passwordHash: text("password_hash").notNull(),
  homeTitleFr: text("home_title_fr").notNull(),
  homeTitleAr: text("home_title_ar").notNull(),
  homeBodyFr: text("home_body_fr").notNull(),
  homeBodyAr: text("home_body_ar").notNull(),
  homeCtaFr: text("home_cta_fr").notNull(),
  homeCtaAr: text("home_cta_ar").notNull(),
});

export type LeadExtras = {
  whatsapp?: string;
  facebook?: string;
  instagram?: string;
  tiktok?: string;
  snapchat?: string;
  youtube?: string;
  maps?: string;
  telegram?: string;
  email?: string;
  website?: string;
  googleReview?: string;
  address?: string;
  hours?: string;
};

export type PrintSettings = {
  logoSize: number; // mm
  qrSize: number; // mm
  showLogo: boolean;
  showName: boolean;
  showSlogan: boolean;
  showCode: boolean;
  customText: string;
  showCustomText: boolean;
  showHint: boolean;
};

export const DEFAULT_PRINT: PrintSettings = {
  logoSize: 55,
  qrSize: 70,
  showLogo: true,
  showName: true,
  showSlogan: false,
  showCode: true,
  customText: "",
  showCustomText: false,
  showHint: true,
};

export type ShopTheme = {
  preset: string;
  pageFrom: string;
  pageTo: string;
  cardFrom: string;
  cardTo: string;
  cardBorder: string;
  title: string;
  subtitle: string;
  text: string;
};

export type ButtonType =
  | "maps"
  | "facebook"
  | "instagram"
  | "tiktok"
  | "snapchat"
  | "youtube"
  | "phone"
  | "whatsapp"
  | "telegram"
  | "email"
  | "review"
  | "website"
  | "catalog"
  | "custom";

export const BUTTON_TYPES: ButtonType[] = [
  "maps",
  "facebook",
  "instagram",
  "tiktok",
  "snapchat",
  "youtube",
  "phone",
  "whatsapp",
  "telegram",
  "email",
  "review",
  "website",
  "catalog",
  "custom",
];

export const THEME_NAMES: Record<string, { fr: string; ar: string }> = {
  "paper-light": { fr: "Papier clair", ar: "ورق فاتح" },
  "sportif-dark": { fr: "Sombre rouge", ar: "داكن أحمر" },
  night: { fr: "Nuit", ar: "ليل" },
  cream: { fr: "Crème", ar: "كريمي" },
  forest: { fr: "Forêt", ar: "غابة" },
  ocean: { fr: "Océan", ar: "محيط" },
  sand: { fr: "Sable", ar: "رمل" },
  rose: { fr: "Rose", ar: "وردي" },
  slate: { fr: "Ardoise", ar: "أردواز" },
  gold: { fr: "Or", ar: "ذهبي" },
};

export const THEME_PRESETS: Record<string, ShopTheme> = {
  "paper-light": {
    preset: "paper-light",
    pageFrom: "#F6F4F0",
    pageTo: "#EDE8DF",
    cardFrom: "#FFFFFF",
    cardTo: "#FAFAF8",
    cardBorder: "#E7E2D9",
    title: "#141414",
    subtitle: "#6B675F",
    text: "#141414",
  },
  "sportif-dark": {
    preset: "sportif-dark",
    pageFrom: "#232526",
    pageTo: "#414345",
    cardFrom: "#3a3a3a",
    cardTo: "#2f2f2f",
    cardBorder: "#770000",
    title: "#e1e1e1",
    subtitle: "#c5c5c5",
    text: "#f0f0f0",
  },
  night: {
    preset: "night",
    pageFrom: "#0B0F14",
    pageTo: "#1A2332",
    cardFrom: "#151C27",
    cardTo: "#10161F",
    cardBorder: "#2A3544",
    title: "#F5F7FA",
    subtitle: "#9AA4B2",
    text: "#E8ECF1",
  },
  cream: {
    preset: "cream",
    pageFrom: "#FFF8EF",
    pageTo: "#F5E6D3",
    cardFrom: "#FFFCF7",
    cardTo: "#FFF8EF",
    cardBorder: "#E8D5BC",
    title: "#2C1810",
    subtitle: "#7A5C45",
    text: "#2C1810",
  },
  forest: {
    preset: "forest",
    pageFrom: "#0F2A1F",
    pageTo: "#1A3D2E",
    cardFrom: "#163528",
    cardTo: "#122B21",
    cardBorder: "#2D5A45",
    title: "#E8F5EE",
    subtitle: "#A3C4B4",
    text: "#E8F5EE",
  },
  ocean: {
    preset: "ocean",
    pageFrom: "#0B1F33",
    pageTo: "#123A5C",
    cardFrom: "#14324D",
    cardTo: "#0F283D",
    cardBorder: "#2A6A9A",
    title: "#EAF4FF",
    subtitle: "#9BB8D1",
    text: "#EAF4FF",
  },
  sand: {
    preset: "sand",
    pageFrom: "#F3EADF",
    pageTo: "#E6D3B8",
    cardFrom: "#FFF9F0",
    cardTo: "#F7EDDF",
    cardBorder: "#D9C3A3",
    title: "#3A2A18",
    subtitle: "#7A6448",
    text: "#3A2A18",
  },
  rose: {
    preset: "rose",
    pageFrom: "#2A1218",
    pageTo: "#4A1D2A",
    cardFrom: "#3A1822",
    cardTo: "#2E131B",
    cardBorder: "#A84565",
    title: "#FFE8EF",
    subtitle: "#D9A3B4",
    text: "#FFE8EF",
  },
  slate: {
    preset: "slate",
    pageFrom: "#E8ECF1",
    pageTo: "#D5DCE6",
    cardFrom: "#FFFFFF",
    cardTo: "#F4F6F9",
    cardBorder: "#C5CEDA",
    title: "#1B2430",
    subtitle: "#5B6B7C",
    text: "#1B2430",
  },
  gold: {
    preset: "gold",
    pageFrom: "#1A1408",
    pageTo: "#2E2412",
    cardFrom: "#241C0E",
    cardTo: "#1C160A",
    cardBorder: "#C4A35A",
    title: "#F8E9C0",
    subtitle: "#C9B27A",
    text: "#F8E9C0",
  },
};

/** Types that are phone-like vs URL-like for target value hints */
export const PHONE_LIKE: ButtonType[] = ["phone", "whatsapp", "telegram"];
