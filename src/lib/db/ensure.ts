import { client } from "./index";
import fs from "fs";
import path from "path";

let ready: Promise<void> | null = null;

async function columnExists(table: string, column: string) {
  const r = await client.execute(`PRAGMA table_info(${table})`);
  return r.rows.some((row) => String(row.name) === column);
}

async function addColumn(table: string, column: string, def: string) {
  if (!(await columnExists(table, column))) {
    await client.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${def}`);
  }
}

async function migrate() {
  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT,
      password_hash TEXT,
      password_encrypted TEXT,
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
      page_locale TEXT NOT NULL DEFAULT 'ar',
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
      telegram_prefill TEXT DEFAULT '',
      seo_title TEXT DEFAULT '',
      seo_description TEXT DEFAULT '',
      print_settings TEXT,
      is_demo INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS shop_buttons (
      id TEXT PRIMARY KEY,
      shop_id TEXT NOT NULL,
      type TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 0,
      full_width INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      label TEXT DEFAULT '',
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
      extras TEXT,
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

  // Upgrade existing DBs
  await addColumn("agents", "password_hash", "TEXT");
  await addColumn("agents", "password_encrypted", "TEXT");
  await addColumn("shops", "page_locale", "TEXT DEFAULT 'ar'");
  await addColumn("shops", "telegram_prefill", "TEXT DEFAULT ''");
  await addColumn("shops", "print_settings", "TEXT");
  await addColumn("shop_buttons", "full_width", "INTEGER DEFAULT 0");
  await addColumn("shop_buttons", "label", "TEXT DEFAULT ''");
  await addColumn("leads", "extras", "TEXT");

  // Repair invalid sample codes (alphabet excludes 0 and 1)
  await repairInvalidCodes();

  // Migrate old chrome_locale / default_locale → page_locale
  if (await columnExists("shops", "default_locale")) {
    await client.execute(
      `UPDATE shops SET page_locale = COALESCE(default_locale, 'ar') WHERE page_locale IS NULL OR page_locale = ''`,
    );
  }

  // Migrate label_fr/label_ar → label
  if (await columnExists("shop_buttons", "label_fr")) {
    await client.execute(
      `UPDATE shop_buttons SET label = COALESCE(NULLIF(label_ar,''), NULLIF(label_fr,''), '') WHERE label IS NULL OR label = ''`,
    );
  }

  // Review buttons full width by default
  await client.execute(
    `UPDATE shop_buttons SET full_width = 1 WHERE type = 'review' AND (full_width IS NULL OR full_width = 0)`,
  );

  // Move lone url into a target so multi-edit works everywhere
  const buttons = await client.execute(
    `SELECT id, type, url FROM shop_buttons WHERE url IS NOT NULL AND url != ''`,
  );
  for (const b of buttons.rows) {
    const tid = String(b.id);
    const existing = await client.execute({
      sql: `SELECT id FROM shop_targets WHERE button_id = ? LIMIT 1`,
      args: [tid],
    });
    if (existing.rows.length === 0) {
      await client.execute({
        sql: `INSERT INTO shop_targets (id, button_id, label, value, sort_order) VALUES (?, ?, ?, ?, 0)`,
        args: [crypto.randomUUID(), tid, String(b.type), String(b.url)],
      });
    }
  }

  // Owner + DEMO must always exist (idempotent — fixes partial seeds)
  await ensureSeedData();
}

async function ensureSeedData() {
  const { hashPassword } = await import("../auth");
  const { encryptPassword } = await import("../crypto");
  const { THEME_PRESETS } = await import("./schema");
  const { OWNER_PASSWORD, DEMO_PASSWORD } = await import("../config");

  const ownerPass = OWNER_PASSWORD;
  const demoPass = DEMO_PASSWORD;
  const ownerHash = await hashPassword(ownerPass);
  const demoHash = await hashPassword(demoPass);
  const demoEnc = encryptPassword(demoPass);
  const now = Date.now();

  const owner = await client.execute(
    "SELECT id FROM owner_settings WHERE id = 'main'",
  );
  if (owner.rows.length === 0) {
    await client.execute({
      sql: `INSERT INTO owner_settings (id, password_hash, home_title_fr, home_title_ar, home_body_fr, home_body_ar, home_cta_fr, home_cta_ar)
            VALUES ('main', ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        ownerHash,
        "Un QR. Toute la boutique.",
        "رمز واحد. كل المتجر.",
        "Logo, WhatsApp, Instagram, Maps, avis Google — une seule page, sur le comptoir.",
        "الشعار، واتساب، إنستغرام، الخريطة، تقييمات قوقل — صفحة واحدة على الطاولة.",
        "Contactez-moi",
        "اتصلوا بي",
      ],
    });
  } else {
    // Keep hardcoded owner password in sync
    await client.execute({
      sql: `UPDATE owner_settings SET password_hash = ? WHERE id = 'main'`,
      args: [ownerHash],
    });
  }

  const seedLogo = path.join(process.cwd(), "seed", "jarir-logo.svg");
  const publicLogo = path.join(
    process.cwd(),
    "public",
    "brand",
    "jarir-logo.svg",
  );
  fs.mkdirSync(path.dirname(publicLogo), { recursive: true });
  if (fs.existsSync(seedLogo)) fs.copyFileSync(seedLogo, publicLogo);

  const demoRow = await client.execute(
    `SELECT id, shop_id, status FROM codes WHERE code = 'DEMO' LIMIT 1`,
  );

  if (demoRow.rows.length === 0) {
    await seedDemoShop({
      demoHash,
      demoEnc,
      now,
      themeJson: JSON.stringify(THEME_PRESETS.forest),
    });
  } else {
    const shopId = demoRow.rows[0].shop_id
      ? String(demoRow.rows[0].shop_id)
      : null;
    if (shopId) {
      await client.execute({
        sql: `UPDATE shops SET password_hash = ?, password_encrypted = ?, is_demo = 1, updated_at = ? WHERE id = ?`,
        args: [demoHash, demoEnc, now, shopId],
      });
      await client.execute({
        sql: `UPDATE codes SET status = 'live', shop_id = ?, claimed_at = COALESCE(claimed_at, ?) WHERE code = 'DEMO'`,
        args: [shopId, now],
      });
    } else {
      // Orphan DEMO code without shop — recreate shop link
      await client.execute(`DELETE FROM codes WHERE code = 'DEMO'`);
      await seedDemoShop({
        demoHash,
        demoEnc,
        now,
        themeJson: JSON.stringify(THEME_PRESETS.forest),
      });
    }
  }

  for (const c of ["A234", "B892", "C345"]) {
    const ex = await client.execute({
      sql: `SELECT id FROM codes WHERE code = ? LIMIT 1`,
      args: [c],
    });
    if (!ex.rows.length) {
      await client.execute({
        sql: `INSERT INTO codes (id, code, status, created_at) VALUES (?, ?, 'unused', ?)`,
        args: [crypto.randomUUID(), c, now],
      });
    }
  }
}

async function seedDemoShop(opts: {
  demoHash: string;
  demoEnc: string;
  now: number;
  themeJson: string;
}) {
  const { demoHash, demoEnc, now, themeJson } = opts;
  const codeId = crypto.randomUUID();
  const shopId = crypto.randomUUID();

  await client.execute({
    sql: `INSERT INTO codes (id, code, status, created_at, claimed_at, shop_id) VALUES (?, 'DEMO', 'live', ?, ?, ?)`,
    args: [codeId, now, now, shopId],
  });
  await client.execute({
    sql: `INSERT INTO shops (
      id, code_id, name, slogan, thanks_text, logo_url,
      password_hash, password_encrypted, owner_phone,
      page_locale, theme,
      email, maps_url, google_review_url, website_url, whatsapp_prefill, telegram_prefill,
      seo_title, seo_description, address_text, hours_text, is_demo, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ar', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    args: [
      shopId,
      codeId,
      "مكتبة جرير",
      "ليس مجرد مكتبة — كتب، إلكترونيات ومستلزمات",
      "شكراً لمسح الرمز! تواصلوا معنا",
      "/brand/jarir-logo.svg",
      demoHash,
      demoEnc,
      "+966920000089",
      themeJson,
      "jarir@jarirbookstore.com",
      "https://www.google.com/maps/search/?api=1&query=Jarir+Bookstore+Riyadh",
      "https://www.google.com/maps/search/?api=1&query=Jarir+Bookstore+Riyadh",
      "https://www.jarir.com",
      "مرحبا، أريد معلومات من مكتبة جرير",
      "",
      "مكتبة جرير — Jarir Bookstore",
      "كتب، إلكترونيات ومستلزمات مكتبية في السعودية",
      "الرياض، المملكة العربية السعودية",
      "يومياً 9:00 – 22:00",
      now,
      now,
    ],
  });

  const buttons = [
    [
      "maps",
      1,
      0,
      0,
      "https://www.google.com/maps/search/?api=1&query=Jarir+Bookstore+Riyadh",
    ],
    ["facebook", 1, 1, 0, "https://www.facebook.com/JarirBookstore"],
    ["instagram", 1, 2, 0, "https://www.instagram.com/jarirbookstore/"],
    ["tiktok", 1, 3, 0, "https://www.tiktok.com/@jarirbookstore"],
    ["phone", 1, 4, 0, ""],
    ["whatsapp", 1, 5, 0, ""],
    ["telegram", 1, 6, 0, ""],
    ["email", 1, 7, 0, "mailto:jarir@jarirbookstore.com"],
    [
      "review",
      1,
      8,
      1,
      "https://www.google.com/maps/search/?api=1&query=Jarir+Bookstore+Riyadh",
    ],
    ["website", 1, 9, 0, "https://www.jarir.com"],
    ["snapchat", 0, 10, 0, ""],
    ["youtube", 0, 11, 0, ""],
    ["catalog", 0, 12, 0, ""],
    ["custom", 0, 13, 0, ""],
  ] as const;

  for (const [type, enabled, order, full, url] of buttons) {
    const bid = crypto.randomUUID();
    await client.execute({
      sql: `INSERT INTO shop_buttons (id, shop_id, type, enabled, full_width, sort_order, url) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [bid, shopId, type, enabled, full, order, url],
    });
    if (type === "phone" || type === "whatsapp" || type === "telegram") {
      const targets = [
        ["خدمة العملاء", "+966920000089"],
        ["الفرع الرئيسي", "+966114626000"],
      ];
      for (let i = 0; i < targets.length; i++) {
        await client.execute({
          sql: `INSERT INTO shop_targets (id, button_id, label, value, sort_order) VALUES (?, ?, ?, ?, ?)`,
          args: [
            crypto.randomUUID(),
            bid,
            targets[i][0],
            type === "whatsapp" ? "+966920000089" : targets[i][1],
            i,
          ],
        });
      }
    } else if (url) {
      await client.execute({
        sql: `INSERT INTO shop_targets (id, button_id, label, value, sort_order) VALUES (?, ?, ?, ?, 0)`,
        args: [crypto.randomUUID(), bid, type, url],
      });
    }
  }
}

/** Codes must match ALPHABET (no 0/1/I/O). Old seeds B891/C102 were invalid. */
async function repairInvalidCodes() {
  const renames: Record<string, string> = {
    B891: "B892",
    C102: "C345",
  };

  for (const [from, to] of Object.entries(renames)) {
    const cur = await client.execute({
      sql: `SELECT id, status FROM codes WHERE code = ? LIMIT 1`,
      args: [from],
    });
    if (!cur.rows.length) continue;

    const taken = await client.execute({
      sql: `SELECT id FROM codes WHERE code = ? LIMIT 1`,
      args: [to],
    });

    if (!taken.rows.length) {
      await client.execute({
        sql: `UPDATE codes SET code = ? WHERE code = ?`,
        args: [to, from],
      });
    } else if (String(cur.rows[0].status) === "unused") {
      await client.execute({
        sql: `DELETE FROM codes WHERE code = ? AND status = 'unused'`,
        args: [from],
      });
    }
  }

  // Ensure two unused demo claim codes exist for local testing
  const now = Date.now();
  for (const c of ["B892", "C345"]) {
    const ex = await client.execute({
      sql: `SELECT id FROM codes WHERE code = ? LIMIT 1`,
      args: [c],
    });
    if (!ex.rows.length) {
      await client.execute({
        sql: `INSERT INTO codes (id, code, status, created_at) VALUES (?, ?, 'unused', ?)`,
        args: [crypto.randomUUID(), c, now],
      });
    }
  }
}

export function ensureDb() {
  if (!ready) ready = migrate();
  return ready;
}
