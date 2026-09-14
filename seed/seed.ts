import "dotenv/config";
import { client } from "../src/lib/db";
import { hashPassword } from "../src/lib/auth";
import { encryptPassword } from "../src/lib/crypto";
import { THEME_PRESETS } from "../src/lib/db/schema";
import fs from "fs";
import path from "path";

async function migrate() {
  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS codes (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'unused',
      agent_id TEXT,
      shop_id TEXT,
      note TEXT,
      created_at INTEGER NOT NULL,
      claimed_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS shops (
      id TEXT PRIMARY KEY,
      code_id TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      slogan TEXT DEFAULT '',
      thanks_text TEXT DEFAULT '',
      logo_url TEXT,
      cover_url TEXT,
      password_hash TEXT NOT NULL,
      password_encrypted TEXT NOT NULL,
      owner_phone TEXT,
      default_locale TEXT NOT NULL DEFAULT 'ar',
      chrome_locale TEXT NOT NULL DEFAULT 'visitor',
      theme TEXT NOT NULL,
      address_text TEXT DEFAULT '',
      hours_text TEXT DEFAULT '',
      promo_text TEXT DEFAULT '',
      promo_enabled INTEGER NOT NULL DEFAULT 0,
      email TEXT DEFAULT '',
      website_url TEXT DEFAULT '',
      maps_url TEXT DEFAULT '',
      google_review_url TEXT DEFAULT '',
      catalog_url TEXT DEFAULT '',
      whatsapp_prefill TEXT DEFAULT '',
      seo_title TEXT DEFAULT '',
      seo_description TEXT DEFAULT '',
      is_demo INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS shop_buttons (
      id TEXT PRIMARY KEY,
      shop_id TEXT NOT NULL,
      type TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      label_fr TEXT DEFAULT '',
      label_ar TEXT DEFAULT '',
      url TEXT DEFAULT '',
      icon TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS shop_targets (
      id TEXT PRIMARY KEY,
      button_id TEXT NOT NULL,
      label TEXT NOT NULL,
      value TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS gallery_images (
      id TEXT PRIMARY KEY,
      shop_id TEXT NOT NULL,
      url TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      shop_name TEXT NOT NULL,
      contact_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      city TEXT DEFAULT '',
      message TEXT DEFAULT '',
      locale TEXT DEFAULT 'fr',
      status TEXT NOT NULL DEFAULT 'new',
      converted_code_id TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS owner_settings (
      id TEXT PRIMARY KEY DEFAULT 'main',
      password_hash TEXT NOT NULL,
      home_title_fr TEXT NOT NULL,
      home_title_ar TEXT NOT NULL,
      home_body_fr TEXT NOT NULL,
      home_body_ar TEXT NOT NULL,
      home_cta_fr TEXT NOT NULL,
      home_cta_ar TEXT NOT NULL
    );
  `);
}

function id() {
  return crypto.randomUUID();
}

async function seed() {
  await migrate();

  const now = Date.now();
  const ownerPass =
    process.env.OWNER_BOOTSTRAP_PASSWORD || "owner123";
  const demoPass = process.env.DEMO_PASSWORD || "jarir";

  const existingOwner = await client.execute(
    "SELECT id FROM owner_settings WHERE id = 'main'",
  );
  if (existingOwner.rows.length === 0) {
    await client.execute({
      sql: `INSERT INTO owner_settings (id, password_hash, home_title_fr, home_title_ar, home_body_fr, home_body_ar, home_cta_fr, home_cta_ar)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        "main",
        await hashPassword(ownerPass),
        "Un QR. Toute la boutique.",
        "رمز واحد. كل المتجر.",
        "Logo, WhatsApp, Instagram, Maps, avis Google — une seule page, sur le comptoir.",
        "الشعار، واتساب، إنستغرام، الخريطة، تقييمات قوقل — صفحة واحدة على الطاولة.",
        "Contactez-moi",
        "اتصلوا بي",
      ],
    });
  }

  // Ensure logo is in public
  const seedLogo = path.join(process.cwd(), "seed", "sportif-logo.webp");
  const publicLogo = path.join(process.cwd(), "public", "brand", "sportif-logo.webp");
  fs.mkdirSync(path.dirname(publicLogo), { recursive: true });
  if (fs.existsSync(seedLogo)) {
    fs.copyFileSync(seedLogo, publicLogo);
  }

  const demoCode = await client.execute(
    "SELECT id FROM codes WHERE code = 'DEMO'",
  );

  let codeId: string;
  let shopId: string;

  if (demoCode.rows.length === 0) {
    codeId = id();
    shopId = id();
    await client.execute({
      sql: `INSERT INTO codes (id, code, status, created_at, claimed_at, shop_id)
            VALUES (?, 'DEMO', 'live', ?, ?, ?)`,
      args: [codeId, now, now, shopId],
    });

    const theme = JSON.stringify(THEME_PRESETS["sportif-dark"]);
    await client.execute({
      sql: `INSERT INTO shops (
        id, code_id, name, slogan, thanks_text, logo_url,
        password_hash, password_encrypted, owner_phone,
        default_locale, chrome_locale, theme,
        email, maps_url, google_review_url, whatsapp_prefill,
        seo_title, seo_description, is_demo, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      args: [
        shopId,
        codeId,
        "SPORTIF",
        "عروض يومية جودة وأسعار تنافسية 🔥",
        "شكرا لمسحكم الرمز! تابعونا للبقاء على إتصال",
        "/brand/sportif-logo.webp",
        await hashPassword(demoPass),
        encryptPassword(demoPass),
        "+213558342595",
        "ar",
        "visitor",
        theme,
        "Khattaraomar31@gmail.com",
        "https://maps.app.goo.gl/KptDzniXbjDuRJ9m7?g_st=aw",
        "https://g.page/r/Cb4d-XXqEwrFEBI/review",
        "مرحبًا! أنا مهتم بمتجركم الرياضي. هل يمكنكم تزويدي بمزيد من المعلومات؟",
        "SPORTIF - متجر رياضي",
        "عروض يومية جودة وأسعار تنافسية",
        now,
        now,
      ],
    });

    const buttons: Array<{
      type: string;
      enabled: number;
      order: number;
      url?: string;
      targets?: Array<{ label: string; value: string }>;
    }> = [
      {
        type: "maps",
        enabled: 1,
        order: 0,
        url: "https://maps.app.goo.gl/KptDzniXbjDuRJ9m7?g_st=aw",
      },
      {
        type: "facebook",
        enabled: 1,
        order: 1,
        url: "https://www.facebook.com/share/1AiHZFaRKA/",
      },
      {
        type: "instagram",
        enabled: 1,
        order: 2,
        url: "https://www.instagram.com/magasin_sportif/",
      },
      {
        type: "tiktok",
        enabled: 1,
        order: 3,
        url: "https://www.tiktok.com/@sportifbireljiroran",
      },
      {
        type: "phone",
        enabled: 1,
        order: 4,
        targets: [
          { label: "Omar Gérant (Mobilis)", value: "+213558342595" },
          { label: "Omar Gérant (Ooredoo)", value: "+213541145060" },
          { label: "Hammou magasin", value: "+213558342595" },
        ],
      },
      {
        type: "whatsapp",
        enabled: 1,
        order: 5,
        targets: [
          { label: "Omar Gérant (Mobilis)", value: "+213666912360" },
          { label: "Omar Gérant (Ooredoo)", value: "+213541145060" },
          { label: "Hammou magasin", value: "+213558342595" },
        ],
      },
      {
        type: "telegram",
        enabled: 1,
        order: 6,
        targets: [
          { label: "Omar Gérant (Mobilis)", value: "+213666912360" },
          { label: "Omar Gérant (Ooredoo)", value: "+213541145060" },
          { label: "Hammou magasin", value: "+213558342595" },
        ],
      },
      {
        type: "email",
        enabled: 1,
        order: 7,
        url: "mailto:Khattaraomar31@gmail.com",
      },
      {
        type: "review",
        enabled: 1,
        order: 8,
        url: "https://g.page/r/Cb4d-XXqEwrFEBI/review",
      },
      // disabled catalog for add list
      { type: "snapchat", enabled: 0, order: 9 },
      { type: "youtube", enabled: 0, order: 10 },
      { type: "website", enabled: 0, order: 11 },
      { type: "catalog", enabled: 0, order: 12 },
      { type: "custom", enabled: 0, order: 13 },
    ];

    for (const b of buttons) {
      const bid = id();
      await client.execute({
        sql: `INSERT INTO shop_buttons (id, shop_id, type, enabled, sort_order, url)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [bid, shopId, b.type, b.enabled, b.order, b.url || ""],
      });
      if (b.targets) {
        for (let i = 0; i < b.targets.length; i++) {
          await client.execute({
            sql: `INSERT INTO shop_targets (id, button_id, label, value, sort_order)
                  VALUES (?, ?, ?, ?, ?)`,
            args: [id(), bid, b.targets[i].label, b.targets[i].value, i],
          });
        }
      }
    }

    // A few unused sample codes for sales
    for (const c of ["A234", "B892", "C345"]) {
      await client.execute({
        sql: `INSERT INTO codes (id, code, status, created_at) VALUES (?, ?, 'unused', ?)`,
        args: [id(), c, now],
      });
    }

    console.log("Seeded DEMO + sample codes A234, B892, C345");
  } else {
    console.log("DEMO already exists — skipped shop seed");
  }

  console.log("Done.");
  console.log(`Owner login path: /${process.env.OWNER_PATH || "ox-w9k4m2"}`);
  console.log(`Owner password: ${ownerPass}`);
  console.log(`DEMO password: ${demoPass}`);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
