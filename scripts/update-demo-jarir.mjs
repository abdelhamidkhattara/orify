import { createClient } from "@libsql/client";
import path from "path";

const abs = path.join(process.cwd(), "data", "orify.db");
const c = createClient({ url: `file:${abs}` });

const theme = JSON.stringify({
  preset: "forest",
  pageFrom: "#0F2A1F",
  pageTo: "#1A3D2E",
  cardFrom: "#163528",
  cardTo: "#122B21",
  cardBorder: "#2D5A45",
  title: "#E8F5EE",
  subtitle: "#A3C4B4",
  text: "#E8F5EE",
});

await c.execute({
  sql: `UPDATE shops SET
    name = ?,
    slogan = ?,
    thanks_text = ?,
    logo_url = ?,
    page_locale = 'ar',
    theme = ?,
    email = ?,
    maps_url = ?,
    google_review_url = ?,
    website_url = ?,
    whatsapp_prefill = ?,
    seo_title = ?,
    seo_description = ?,
    address_text = ?,
    hours_text = ?,
    owner_phone = ?,
    updated_at = ?
  WHERE is_demo = 1`,
  args: [
    "مكتبة جرير",
    "ليس مجرد مكتبة — كتب، إلكترونيات ومستلزمات",
    "شكراً لمسح الرمز! تواصلوا معنا",
    "/brand/jarir-logo.svg",
    theme,
    "jarir@jarirbookstore.com",
    "https://www.google.com/maps/search/?api=1&query=Jarir+Bookstore+Riyadh",
    "https://www.google.com/maps/search/?api=1&query=Jarir+Bookstore+Riyadh",
    "https://www.jarir.com",
    "مرحبا، أريد معلومات من مكتبة جرير",
    "مكتبة جرير — Jarir Bookstore",
    "كتب، إلكترونيات ومستلزمات مكتبية في السعودية",
    "الرياض، المملكة العربية السعودية",
    "يومياً 9:00 – 22:00",
    "+966920000089",
    Date.now(),
  ],
});

const shop = await c.execute(
  `SELECT id FROM shops WHERE is_demo = 1 LIMIT 1`,
);
const shopId = String(shop.rows[0]?.id || "");
if (shopId) {
  const buttons = await c.execute({
    sql: `SELECT id, type FROM shop_buttons WHERE shop_id = ?`,
    args: [shopId],
  });
  const urls = {
    maps: "https://www.google.com/maps/search/?api=1&query=Jarir+Bookstore+Riyadh",
    facebook: "https://www.facebook.com/JarirBookstore",
    instagram: "https://www.instagram.com/jarirbookstore/",
    tiktok: "https://www.tiktok.com/@jarirbookstore",
    website: "https://www.jarir.com",
    email: "mailto:jarir@jarirbookstore.com",
    review:
      "https://www.google.com/maps/search/?api=1&query=Jarir+Bookstore+Riyadh",
  };
  for (const b of buttons.rows) {
    const type = String(b.type);
    const bid = String(b.id);
    if (urls[type]) {
      await c.execute({
        sql: `UPDATE shop_buttons SET url = ?, enabled = 1 WHERE id = ?`,
        args: [urls[type], bid],
      });
      await c.execute({
        sql: `DELETE FROM shop_targets WHERE button_id = ?`,
        args: [bid],
      });
      await c.execute({
        sql: `INSERT INTO shop_targets (id, button_id, label, value, sort_order) VALUES (?, ?, ?, ?, 0)`,
        args: [crypto.randomUUID(), bid, type, urls[type]],
      });
    }
    if (type === "phone" || type === "whatsapp" || type === "telegram") {
      await c.execute({
        sql: `DELETE FROM shop_targets WHERE button_id = ?`,
        args: [bid],
      });
      const phones = [
        ["خدمة العملاء", "+966920000089"],
        ["الفرع الرئيسي", "+966114626000"],
      ];
      for (let i = 0; i < phones.length; i++) {
        const value =
          type === "whatsapp" ? "+966920000089" : phones[i][1];
        await c.execute({
          sql: `INSERT INTO shop_targets (id, button_id, label, value, sort_order) VALUES (?, ?, ?, ?, ?)`,
          args: [crypto.randomUUID(), bid, phones[i][0], value, i],
        });
      }
      await c.execute({
        sql: `UPDATE shop_buttons SET enabled = 1 WHERE id = ?`,
        args: [bid],
      });
    }
  }
}

console.log("DEMO -> Jarir Bookstore (مكتبة جرير)");
