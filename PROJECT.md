# Orify — Product & Build Bible

This file is the only source of truth for building Orify.  
Do not reopen stack choices. Do not add locale prefixes to QR URLs. Do not ship a desktop-first UI. If something is not in this file, it is out of v1.

---

## 1. What we are building

Orify is a phone-first platform that gives a shop one QR code. That QR opens a fast landing page with the shop logo, text, and buttons (Maps, Instagram, WhatsApp, call, Google review, and anything else they use). Shop owners edit that page themselves from their phone. You sell it in person: a salesperson walks in with a printed QR in a holder, shows the result, collects cash in the shop, and the page goes live on the spot.

Today that page is handmade HTML (Sportif Oran). From now on it is a product.

**Demo used in every sales visit:** the real Sportif page, seeded in the database, logo at `seed/sportif-logo.webp`.

---

## 2. Locked decisions

### 2.1 Stack

| Layer | Choice | Why |
|---|---|---|
| App | **Next.js (App Router) + TypeScript** | Public QR pages render on the server like static HTML. Routes match `/A234` and `/A234/admin` naturally. One language for UI and API. |
| UI | **Tailwind CSS + shadcn/ui with `rtl: true`** | Cleanest admin UI, first-class Arabic RTL, huge tap targets, no custom component zoo. |
| Style of shadcn | **New York / zinc, then rethemed to Orify tokens** | Quiet, dense enough for phones, not playful. |
| Language | **next-intl without locale-prefixed routes** | French + Arabic. Language lives in a cookie, never in the QR URL. `/A234` stays `/A234` forever. |
| Database | **PostgreSQL on Neon + Drizzle ORM** | Simple schema, typed queries, cheap, enough for thousands of shops. |
| Auth | **httpOnly cookie sessions (jose) + bcrypt hashes** | Two session types: `shop` and `owner`. No Auth.js, no email magic links. |
| Uploads | **Vercel Blob**, images only, max 2 MB, compressed to WebP on the client before upload | Logos come from phone cameras. Must not freeze the phone. |
| QR files | **`uqr` → SVG + PNG** | Owner downloads one code or a print sheet. |
| Validation | **Zod** on every form and server action | |
| Hosting | **Vercel** (app) + **Neon** (db) + **Vercel Blob** (images) | Ship fast. Cloudflare in front later if Algeria latency needs it. |
| Package manager | **pnpm** | |

Rejected on purpose: SvelteKit (smaller JS, weaker admin UI kit), locale in the path (`/ar/A234` would break printed QRs), a public `/admin` or `/dashboard` URL, forgot-password, payment gateway, native apps.

### 2.2 Domains

Two URLs, two jobs.

- **`APP_URL`** — pretty site. Homepage, who we are, contact form. This name may change later.
- **`QR_BASE_URL`** — what is printed inside every QR. Example: `https://qr.orify.dz/A234`. Buy this and **never drop it**. If you rebrand the pretty site, printed papers still work.

At launch both can be the same domain. The code always reads from env, never hardcoded. If the pretty domain changes, keep the old QR domain alive and redirect `old.com/A234` → current `QR_BASE_URL/A234`.

Owner dashboard shows both links for every code and a “copy QR link” that always uses `QR_BASE_URL`.

### 2.3 Codes, not shop names

A shop URL is a short code, not the name.

- Alphabet: `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (no `0 O 1 I` — they look alike on a sticker).
- Length: **4** (`A234`). About one million codes.
- The name “Sportif” is only a title on the page. The link stays `/A234` even if they rename the shop.
- Demo code is **`DEMO`**. Salespeople always scan `QR_BASE_URL/DEMO`.

### 2.4 Two ways a shop joins

1. **Printed QR (sales in the shop)** — first open of an unused code shows the claim form. Submit → that same URL is live immediately. Password is set there. Admin is `/{code}/admin`.
2. **Homepage form (they found you online)** — not live. It is a lead. You contact them, then you assign a code from the owner dashboard.

Cash is collected in the shop. No payments in the product.

### 2.5 Your admin URL

There is no `/admin` and no `/dashboard` on the site.

- Shop admin: `/{code}/admin` (example `/A234/admin`).
- **Your** admin: a secret path from env `OWNER_PATH` (local example `ox-w9k4m2`). Next.js rewrite: browser URL `/{OWNER_PATH}` → internal `/owner`. Visiting `/owner` directly returns 404.
- Change `OWNER_PATH` in production. Never print it. Never link it from the public site.

### 2.6 Passwords

Shops pick a password on claim. They can change it later in their admin. **No forgot-password in v1.**

Passwords are stored twice for two jobs:

- `passwordHash` (bcrypt) — used to log in.
- `passwordEncrypted` (AES-GCM with `OWNER_ENCRYPTION_KEY`) — **only the owner dashboard decrypts this** so you can see the current password in the shop list and log in for them if they are stuck.

The public site and the shop admin never display the current password. Shop admin only has “new password / confirm”.

Owner also has **“Open as this shop”** (impersonate). That is the fast way to edit their page. The password column is there because you asked to see it and to help shops who cannot log in.

### 2.7 Languages

Platform chrome (home, forms, both admins): **French and Arabic**, switcher always visible, `dir` and `lang` on `<html>`, cookie `NEXT_LOCALE`. Default for first visit in Algeria: **Arabic** if `Accept-Language` contains `ar`, otherwise French.

Shop public page: the shop types their own name/slogan in whatever script they want (not auto-translated). Button chrome labels follow the shop setting: Arabic, French, or “visitor language”. A small FR | ع toggle sits on the public page and does not change the URL.

All CSS uses logical properties (`ms-` `me-` `ps-` `pe-` `start` `end` `text-start`). No `ml-` `mr-` `left-` `right-`. Icons that mean “back/forward” flip in RTL. Logos, WhatsApp, and brand icons do not flip. User-typed URLs, emails, and codes sit in `<bdi>`.

Fonts: **Tajawal** for Arabic, **DM Sans** for French. Both loaded with `next/font`. Public shop pages also load Tajawal because that is the look shops already know.

### 2.8 Performance (non-negotiable)

Most users are on a phone, often on a weak mobile network.

- Public shop page is a **Server Component**. No React hydration for the grid of links. Multi-number sheets use a tiny inline script and native `<dialog>` (same idea as the current Sportif HTML).
- Public JS budget: **under 20 KB gzipped**, ideally near zero besides the dialog script.
- LCP target: **under 1.5 s on 4G**. Logo is the LCP: `next/image`, WebP, explicit width, `priority`.
- Admin pages may use client components. No heavy motion, no page-wide blur, no autoplaying video.
- One primary action per screen. Save is a sticky bottom bar on phone. No hover-only actions.
- Tap targets **min 48×48 px**. Body text 16 px minimum so iOS does not zoom inputs.

---

## 3. Design system

Name internally: **Paper**.

The platform (home + admins) is not a copy of Sportif. Sportif is a *shop skin*. Orify is quiet, bright, and fast.

| Token | Value | Use |
|---|---|---|
| `--bg` | `#F6F4F0` | Page background (warm paper) |
| `--surface` | `#FFFFFF` | Cards, sheets |
| `--ink` | `#141414` | Text |
| `--muted` | `#6B675F` | Secondary text |
| `--line` | `#E7E2D9` | Hairline borders |
| `--accent` | `#C81E3A` | Primary buttons, focus, live dots |
| `--accent-ink` | `#FFFFFF` | Text on accent |
| `--ok` | `#0F7B4A` | Success |
| `--warn` | `#B45309` | Pending leads |
| `--danger` | `#B42318` | Disable, delete |
| Radius | 16 px cards, 12 px controls, 999 px pills | |
| Shadow | one soft shadow on the main card only | |

**Type scale (phone):** name 28/32, section 18/24, body 16/24, meta 13/18.

**Motion:** 150 ms opacity/translate only. Respect `prefers-reduced-motion`.

**Language switcher:** two equal pills, `FR` and `ع`, top-left in LTR / top-right in RTL of the chrome bar. Current language is filled ink. Not a dropdown.

**Primary button:** full width on phone, 52 px tall, accent, no icon unless it helps (WhatsApp, download).  
**Secondary:** outline on `--line`.  
**Destructive:** text + confirm sheet, never a surprise.

**Toasts:** one line, top of screen, 2.5 s, no stack of 4.

**Empty states:** one sentence + one button. No illustrations that load extra images on the public shop page.

---

## 4. URL map

| URL | Guest sees | After action |
|---|---|---|
| `/` | Who we are + lead form | Thank-you state on the same page |
| `/{code}` unused | Claim wizard | Same URL becomes the live shop |
| `/{code}` live | Shop page | — |
| `/{code}` disabled | Soft “this QR is not active” | — |
| `/{code}/admin` | Password gate | Shop editor |
| `/{OWNER_PATH}` | Owner password gate | Owner shell |
| `/owner` | 404 | — |
| unknown path | 404 in current language | — |

Middleware order:

1. If path matches `OWNER_PATH` → rewrite to `/owner`.
2. If first segment is a valid code → shop routes.
3. If first segment is `admin`, `owner`, `dashboard`, `login`, `api` as a public page → 404 except real `/api/*`.
4. Locale cookie, no redirect that would change the QR path.

---

## 5. Data model

### `agents`

Salespeople who carry papers. No login in v1. Just a name you type.

- `id`
- `name` (e.g. Karim)
- `phone` optional
- `createdAt`

### `codes`

- `id`
- `code` unique, 4 chars from the alphabet, or `DEMO`
- `status`: `unused` | `live` | `disabled`
- `agentId` nullable — who holds this paper
- `shopId` nullable
- `createdAt`
- `claimedAt` nullable
- `note` optional internal

### `shops`

- `id`
- `codeId` unique
- `name`
- `slogan`
- `thanksText` (the line under the slogan)
- `logoUrl`, `coverUrl` nullable
- `passwordHash`, `passwordEncrypted`
- `defaultLocale`: `ar` | `fr`
- `chromeLocale`: `ar` | `fr` | `visitor`
- `theme` jsonb (see below)
- `addressText`, `hoursText`, `promoText`
- `promoEnabled` boolean
- `email`, `websiteUrl`, `mapsUrl`, `googleReviewUrl`, `catalogUrl`
- `whatsappPrefill` (message sent when a customer taps WhatsApp)
- `seoTitle`, `seoDescription`
- `isDemo` boolean
- `createdAt`, `updatedAt`

`theme` jsonb:

```json
{
  "preset": "sportif-dark" | "paper-light" | "night" | "cream" | "forest" | "custom",
  "pageFrom": "#232526",
  "pageTo": "#414345",
  "cardFrom": "#3a3a3a",
  "cardTo": "#2f2f2f",
  "cardBorder": "#770000",
  "title": "#e1e1e1",
  "subtitle": "#c5c5c5",
  "text": "#f0f0f0"
}
```

Presets are chosen first. “Custom” unlocks the pickers.

### `shop_buttons`

One row per possible action, always the full catalog, visibility via `enabled`.

- `id`
- `shopId`
- `type` (enum below)
- `enabled`
- `sortOrder`
- `labelFr`, `labelAr` (empty = default label)
- `url` (for link types)
- `icon` optional for `custom`

Types: `maps` | `facebook` | `instagram` | `tiktok` | `snapchat` | `youtube` | `phone` | `whatsapp` | `telegram` | `email` | `review` | `website` | `catalog` | `custom`

### `shop_targets`

Multiple numbers or accounts under one button (Sportif has three WhatsApp lines).

- `id`
- `buttonId`
- `label` (e.g. Omar Gérant Mobilis)
- `value` (E.164 phone, or `@username`, or mailto)
- `sortOrder`

If a button has 0 targets and no `url`, it hides even if `enabled`.  
If 1 target, tap goes straight through.  
If 2+, open the bottom sheet.

### `gallery_images`

- `id`, `shopId`, `url`, `sortOrder`  
Max 8. Optional. Hidden block if empty.

### `leads`

Homepage form.

- `id`
- `shopName`, `contactName`, `phone`, `city`, `message`
- `locale` at submit
- `status`: `new` | `contacted` | `converted` | `refused`
- `convertedCodeId` nullable
- `createdAt`

### `owner_settings` (single row)

- `passwordHash`
- `homeTitleFr`, `homeTitleAr`, `homeBodyFr`, `homeBodyAr`
- `homeCtaFr`, `homeCtaAr`

Owner login password can alternatively live only in env `OWNER_PASSWORD_HASH` for v1. Prefer database so you can change it from settings without redeploying. Seed it from env on first boot.

### Sessions

JWT in httpOnly cookie:

- Shop: `{ role: "shop", shopId, code }`, 30 days, path `/`.
- Owner: `{ role: "owner" }`, 7 days.
- Impersonate: shop cookie signed with extra `impersonatedBy: "owner"`. Banner on shop admin: “You are helping this shop” + “Back to my dashboard”.

---

## 6. Shop fields — everything they can change

If a shop in Oran could ask for it, it is here.

**Identity:** logo (camera or gallery, square crop), shop name, slogan, thanks line, optional cover/banner behind the card.

**Look:** 5 presets + custom colors (page gradient, card, border, title, subtitle). Dark Sportif preset is default for DEMO. New shops default to **paper-light** (white card, ink text) because most small shops photograph better that way.

**Language:** default page language, button-label language.

**Buttons:** show/hide, reorder, custom labels FR/AR, custom URL. Unused buttons never render.

**Maps, Facebook, Instagram, TikTok, Snapchat, YouTube, website, catalog/PDF, email, Google review.**

**Phone / WhatsApp / Telegram:** N labelled numbers each. WhatsApp prefill message.

**Place:** address text, opening hours text (plain text, two fields, not a timetable widget in v1).

**Promo:** one “today’s offer” block, toggle on/off. Sits under the slogan when on.

**Gallery:** up to 8 photos, optional, horizontal snap scroll on the public page.

**Share meta:** SEO title and description (Open Graph uses logo + name).

**Password.**

**Not in v1:** online catalog CMS, payments, booking, multi-branch, forgot-password, salesperson logins, analytics graphs beyond tap counts if we add a simple counter later.

Optional v1 if cheap: a `tap` counter per button, shown only to owner. Skip if it slows the public page. Public page must stay a static render; if we count taps, fire `navigator.sendBeacon` after paint, never block render.

---

## 7. Every screen — UI and UX

All screens below are designed **phone first**. Desktop is the same layout, max width 440 px centered, except the owner dashboard which becomes a two-pane shell from 900 px up.

---

### 7.1 Homepage `/`

**Job:** In one short screen, explain what you sell and let a shop ask to be contacted. Not a long landing. Not a live-shop creator.

**Layout (phone, one scroll that should fit a 700 px-tall screen plus a little):**

1. Chrome bar: wordmark **Orify** + language pills.
2. Hero: one sentence.  
   FR: `Un QR. Toute la boutique.`  
   AR: `رمز واحد. كل المتجر.`  
   Subline, one line: the page they get after a scan (logo, buttons, WhatsApp).
3. A **static** picture of the Sportif phone frame (the seeded DEMO screenshot, compressed, not a live iframe). This is the proof.
4. Three one-line facts, not icons soup:  
   - Page live the same day  
   - They edit from the phone  
   - One paper on the counter  
5. Form card (the main object):
   - Shop name  
   - Their name  
   - Phone (tel keypad, required)  
   - City  
   - Optional message  
   Primary: **Contactez-moi** / **اتصلوا بي**
6. Tiny footer: no sitemap.

**UX rules:**

- Autofocus is **off** (mobile keyboard would cover the hero).
- Phone field uses `inputMode="tel"` and stores digits; show a hint `05 … / 06 … / 07 …`.
- Submit: disable the button, then replace the **form card only** with a thank-you: “On vous appelle.” / “سنتصل بكم.” Keep the hero so the page does not feel gone.
- Duplicate submit same phone within 24 h: still show success, do not create a second lead (quiet dedupe).
- This form **never** creates a code or a shop.

**Performance:** server-rendered, form is the only client island.

---

### 7.2 Unused QR `/{code}` — claim wizard

**Job:** The salesperson and the shop owner, standing at the counter, create the live page in under two minutes.

**Feel:** same paper card as the live shop, so the jump from “form” to “page” feels like the same object turning on.

**Step 1 — Account (required)**

- Title: `Cette page est à vous` / `هذه الصفحة لكم`
- Code shown as a pill: `A234` (so they see what they scanned)
- Shop name  
- Password + confirm (show/hide eye, min 6 chars)  
- Phone of the owner (required)

Primary: **Créer la page** / **أنشئ الصفحة**  
This submit **already publishes**. The page is live with name + call button even if they skip the rest.

**Step 2 — Links (optional, same session)**

After step 1, do not dump them on a blank editor. Show:

“Your page is live. Add what you have now. The rest later in Admin.”

Toggles with a URL/phone field that appears when on: WhatsApp, Instagram, Facebook, Maps, TikTok. Skip = **Voir ma page**.

**Step 3 — Done**

Live shop page, plus a one-time bottom banner: `Modifier: /A234/admin` with copy button. Banner never shows to customers (cookie `justClaimed`).

**Errors:**

- Code already live → show the shop, not the form.  
- Code disabled → inactive screen.  
- Weak network: keep values, retry toast.

**Security:** claiming an unused code does not require a global password. Physical possession of the paper is the key. Unused papers should not be left in the street; owner can disable a lost code in one tap.

---

### 7.3 Live shop `/{code}`

This is the product customers see. It must feel as immediate as the old Sportif HTML.

**Structure:**

- Full-viewport gradient from `theme`
- Centered card, max 420 px, 16 px radius, theme border
- Logo (max width 280 px, height auto)
- Name as `h1` if no slogan-as-title; Sportif used the slogan as the big line — use **slogan as the hero title** if present, else shop name
- Thanks text
- Promo block if enabled (one rounded strip)
- Opening hours + address if filled (small, under thanks)
- Button grid: **2 columns**, gap 12 px. Phone-sized buttons, icon + label, min-height 64 px. Full-width only for Google review and custom “main” if type is `review`
- Optional gallery under the grid
- No Orify branding on the card. A 11 px “Orify” under the card is allowed, not a competitor link farm

**Button colors (fixed, recognizable, do not let shops recolor each network):**

| Type | Gradient |
|---|---|
| maps | `#34a853 → #2d8e47` |
| facebook | `#1877f2 → #166fe5` |
| instagram | `#e1306c → #c13584` |
| tiktok | `#000 → #333` |
| snapchat | `#fffc00` text ink |
| youtube | `#ff0000` |
| phone | `#25d366 → #128c7e` |
| whatsapp | `#128c7e → #075e54` |
| telegram | `#0088cc → #006699` |
| email | `#ff6f00 → #e65100` |
| review | Google-like multi-stop + subtle pulse |
| website / catalog / custom | shop `cardBorder` or ink |

**Multi-number sheet:** native `<dialog>`, dark 80% overlay, same card language as Sportif, list of labelled rows, last row Retour / رجوع in red.

**Language toggle:** tiny FR | ع at the top of the card, does not layout-shift the logo.

**Meta:** `theme-color` from page gradient start, OG image = logo, apple-touch-icon = logo.

**Disabled shop:** paper background, one sentence, no buttons, no impersonation leak.

**404 code:** same, “QR inconnu”.

---

### 7.4 Shop admin login `/{code}/admin`

**Job:** Get a shop owner in with one field, on the sidewalk.

- Same paper card
- Shop name if already live, else the code
- Password
- Enter

5 failed tries / 15 min: freeze with “wait a bit”, no account enumeration beyond that.  
Wrong password: one line under the field.

After login, land on **Identity**.

---

### 7.5 Shop admin — shell

This is a **phone app**, not a settings website.

**Top bar (sticky):** shop name · eye icon “Voir la page” (new tab) · language pills.

**If owner impersonating:** amber strip under the bar, “Mode aide” + back to owner.

**Nav (phone):** bottom bar, 4 items, 56 px, labels 11 px:

1. Page (identity + look)  
2. Boutons  
3. Infos  
4. Compte  

**Nav (desktop ≥ 900 px):** left rail, same four, content max 520 px.

**Sticky save:** on any dirty section, a bottom bar above the nav: `Enregistrer` + `Annuler`. Saving shows a 200 ms spinner in the button, then toast `Enregistré`. Leave-with-dirty: native confirm.

Do **not** autosave. Algerian mobile networks drop; explicit save is safer.

#### 7.5.1 Page (identity + look)

- Logo: large dashed square 160 px. Tap → camera or files. Client-side square crop. Preview instantly. Upload in background. Max 2 MB original.
- Name, slogan, thanks — one screen, large inputs.
- Promo toggle + text.
- Theme: 5 preset swatches in a row (color circles 44 px). Selected has a check. “Perso” opens 5 color fields as native `type="color"` plus hex text.
- Chrome language segmented control: Arabe | Français | Visiteur.

Live mini-preview at the top: a 180 px tall scaled card (CSS transform). It is visual confirmation, not a pixel-perfect editor. Real check is “Voir la page”.

#### 7.5.2 Boutons

This must feel powerful and still be one thumb.

- List of all button types, **enabled ones first**, then a muted “Ajouter” list of disabled ones.
- Each enabled row: 44 px grip on the start edge, colored type icon, label, toggle, chevron to edit.
- Reorder: drag by the grip (`@dnd-kit`), haptic if available, save order with the sticky save (or save order immediately — **exception:** order saves on drop so they feel it. Other fields still use sticky save).
- Tap row → edit sheet: FR label, AR label, URL or targets.
- Phone / WhatsApp / Telegram edit sheet: list of targets with label + number, add target, delete target. Numbers stored E.164; UI accepts `0558…` and normalizes to `+213558…`.
- Disabled types appear as `+ Instagram`. Tapping enables and opens the edit sheet.

Empty URL + enabled = validation error on save, toggle snaps back.

#### 7.5.3 Infos

- Maps URL  
- Google review URL  
- Email  
- Website  
- Catalog URL (PDF or Drive)  
- Address  
- Hours  
- WhatsApp default message  
- Gallery: 8 slots, add from camera, reorder, delete  
- SEO title / description (collapsed “Partage WhatsApp / Facebook”)

#### 7.5.4 Compte

- Code and public link, copy button (uses `QR_BASE_URL`)
- Download this shop’s QR PNG
- Change password (current not shown; new + confirm)
- Logout

No delete-shop for the shop owner. Only you can disable.

---

### 7.6 Owner login `/{OWNER_PATH}`

Almost empty. Paper card. One password field. No “Orify admin” in the title — use a neutral `Accès`. Wrong URL already 404s. Do not reveal that this is the owner panel in the HTML `<title>` — use `Accès`. After login, title can become normal inside the app.

---

### 7.7 Owner dashboard — shell

**This is the control room.** It must stay calm with 500 shops. Structure beats decoration.

**Phone:** top wordmark “Orify · Owner”, language pills, bottom nav:

1. Accueil  
2. QR  
3. Boutiques  
4. Demandes  
5. Plus (settings, agents)

**Desktop ≥ 900 px:** left rail 240 px, ink wordmark, same five items, content in a white surface with 24 px padding. Tables are allowed from this breakpoint. On phone, every table is a stack of cards.

Search is always a single sticky field under the title of list pages.

---

### 7.8 Owner · Accueil

**Job:** What needs you today.

Four numbers, big, tappable:

- Boutiques live → shops filter live  
- QR libres → codes filter unused  
- Demandes nouvelles → leads filter new  
- Désactivés → shops filter disabled  

Then two lists:

- **Dernières activations** (shop, code, agent, time)  
- **Demandes non traitées** (name, phone, WhatsApp deep link)

No charts in v1.

---

### 7.9 Owner · QR

**Job:** Create papers, know where every code goes, change destination, print, disable, assign to a salesperson.

**Top actions:**

- `Générer` — sheet: how many (1–50), assign to agent (optional select), optional note. Submit creates unused codes and stays on a result state: list of new codes + `Tout télécharger PNG` + `Feuille d’impression`.
- Filter chips: Tous | Libres | Live | Désactivés  
- Filter agent  
- Search code

**Each code (card on phone / row on desktop):**

- Code in mono, large  
- Status pill: Libre / Live / Off  
- Destination: shop name or “—”  
- Full QR link, copy  
- Pretty link if `APP_URL` differs, copy  
- Agent name  
- Tiny QR thumbnail (SVG inline, 56 px)  
- Actions as an overflow menu (44 px) so the card stays clean:  
  - Ouvrir la page  
  - Télécharger PNG  
  - Assigner / changer agent  
  - **Changer la destination** (reassign to another shop, or detach to unused if you really mean wipe — that needs a typed confirm of the code)  
  - Désactiver / Réactiver  
  - Note interne  

**Print sheet:** `/owner/print?codes=A234,B891` — A4, 6 QRs (2×3), each cell: QR, code in huge mono, one line `Scannez · امسح`. No extra chrome. `window.print()`. Use `QR_BASE_URL` in the encoded URL.

**Change destination UX:** a sheet with search of shops + “leave unused”. This is how you remap a physical paper without reprinting, as long as the **domain in the QR** did not change.

---

### 7.10 Owner · Boutiques

**Job:** Every live (and disabled) shop in one list. You see who they are, their link, their password, and you can take over the page.

**Search:** name, code, phone, agent.

**Sort:** last updated, name, recently claimed.

**Each shop card/row:**

| Element | Detail |
|---|---|
| Logo 40 px | fallback letter |
| Name | + code pill |
| Link | `QR_BASE_URL/{code}` with copy |
| Phone | tap to call |
| Agent | who sold it |
| Status | Live / Off |
| **Password** | decrypted, in a mono field, **hidden by default** behind `Afficher`, then copy. This is owner-only. |
| Updated | relative time |

**Primary actions (visible, not buried):**

1. **Voir** — public page, new tab  
2. **Gérer** — impersonate, open `/{code}/admin` as that shop  
3. **Mot de passe** — set a new one (rewrites hash + encrypted copy)

**Overflow:** Désactiver, Edit here (same editor without impersonate — skip if Gérer is enough; **v1 uses Gérer as the editor** to avoid two UIs. Do not build a second shop editor inside owner).

You asked to change everything from owner: **Gérer** is that. You land in their admin with the amber “Mode aide” bar. You can change theme, logo, buttons, password, all of it.

**Password column rationale:** hashed at rest for login; encrypted copy only decrypts after owner session check, in this list and in shop detail. Never in HTML comments, never in public JSON.

---

### 7.11 Owner · Boutique detail (optional drill-in)

Tapping the card (not a button) opens a detail screen:

- Same data as the row, larger  
- Password revealed with Afficher  
- Claim date, agent, note  
- Raw list of enabled buttons (read only)  
- Gérer / Voir / Désactiver / Reset password  

Keep it. Helps when you are on the phone with the shop.

---

### 7.12 Owner · Demandes (homepage leads)

**Job:** People who filled `/`. You call them. Nothing is live until you convert.

**Chips:** Nouvelles | Contactées | Converties | Refusées

**Card:**

- Shop name they typed  
- Person + city  
- Phone: call button + WhatsApp button (`wa.me` with a short prefill you control in settings later; v1 hardcode a polite FR/AR sentence)  
- Message  
- Time  
- Actions: Marquer contacté · **Convertir** · Refuser  

**Convertir sheet:** pick an unused code (search, show agent). Confirm → shop is **not** auto-live. You still need them to claim **or** you create the shop now with a temporary password you set in the sheet.

**v1 convert behavior (locked):** convert = create the shop immediately on that code, status live, password set by you in the sheet (shown once + stored encrypted), name from the lead. You then send them `/{code}/admin`. This matches “we contact them first” then you decide.

Refuse is reversible (status only).

---

### 7.13 Owner · Plus / Réglages

One scrolling page, grouped.

**Agents:** list, add name+phone, rename, cannot delete if codes assigned (reassign first).

**Accès:** change owner password.

**Textes d’accueil:** FR/AR title, body, CTA of `/`.

**Liens:** read-only display of `APP_URL` and `QR_BASE_URL` so you remember what is printed.

**Demo:** lock DEMO so it cannot be claimed or disabled by mistake. Button “Reset DEMO to Sportif” (reseeds content, keeps the code).

**Danger:** none. No “delete all”.

---

### 7.14 Inactive / 404

Same paper. One sentence. Language switcher. No form.

---

## 8. Sportif DEMO seed

Code: `DEMO`  
Status: live  
`isDemo`: true  
Agent: none  

Copy from the existing Sportif page and the new logo.

| Field | Value |
|---|---|
| name | SPORTIF |
| slogan | عروض يومية جودة وأسعار تنافسية 🔥 |
| thanksText | شكرا لمسحكم الرمز! تابعونا للبقاء على إتصال |
| defaultLocale | ar |
| chromeLocale | visitor |
| theme.preset | sportif-dark |
| logo | `seed/sportif-logo.webp` uploaded at seed time |
| mapsUrl | `https://maps.app.goo.gl/KptDzniXbjDuRJ9m7?g_st=aw` |
| facebook | `https://www.facebook.com/share/1AiHZFaRKA/` |
| instagram | `https://www.instagram.com/magasin_sportif/` |
| tiktok | `https://www.tiktok.com/@sportifbireljiroran` |
| email | `Khattaraomar31@gmail.com` |
| googleReviewUrl | `https://g.page/r/Cb4d-XXqEwrFEBI/review` |
| whatsappPrefill | `مرحبًا! أنا مهتم بمتجركم الرياضي. هل يمكنكم تزويدي بمزيد من المعلومات؟` |

Call / WhatsApp / Telegram targets:

| Label | Call | WhatsApp | Telegram |
|---|---|---|---|
| Omar Gérant (Mobilis) | +213558342595 | +213666912360 | +213666912360 |
| Omar Gérant (Ooredoo) | +213541145060 | +213541145060 | +213541145060 |
| Hammou magasin | +213558342595 | +213558342595 | +213558342595 |

Buttons enabled in this order: Maps, Facebook, Instagram, TikTok, Phone, WhatsApp, Telegram, Email, Review (full width).

DEMO password: set in env `DEMO_PASSWORD` (default `sportif` for local only). Encrypted copy visible in owner list.

---

## 9. Security

- HTTPS only.  
- bcrypt cost 12.  
- AES-GCM for recoverable shop passwords; key only on server.  
- httpOnly, Secure, SameSite=Lax cookies.  
- Shop session cannot hit `/owner` APIs. Owner session can impersonate.  
- Rate limit: login 5/15 min/IP+code, claim 10/h/IP, lead form 5/h/IP.  
- Upload: image MIME only, 2 MB, strip EXIF on compress.  
- `OWNER_PATH` not listed in sitemaps, robots.txt disallows it.  
- Public shop JSON never includes hashes, encrypted passwords, or agent notes.  
- Disabled codes do not leak that a shop used to exist (generic message).  
- CSRF: server actions with Next origin check.  
- Do not log passwords.

Lost paper: owner disables the code. Printed QR still opens the inactive screen. Remap or leave off.

Domain change: DNS of the **QR domain** must keep working. Owner cannot “edit the URL inside the sticker”. Dashboard copy explains this once on the QR page as a 2-line note.

---

## 10. i18n implementation rules

- Locales: `fr`, `ar`. Files `messages/fr.json`, `messages/ar.json`.  
- next-intl **without** `[locale]` in the path.  
- `html` set in root layout from cookie.  
- shadcn `DirectionProvider` follows locale.  
- Every user-facing string in JSON. No hardcoded French in components except shop-typed content.  
- Dates: relative, locale-aware.  
- Phone display: keep `0xxx` local style in UI, E.164 in DB.

---

## 11. Folder structure

```
app/
  layout.tsx                 # fonts, dir, providers
  page.tsx                   # homepage
  globals.css
  [code]/
    page.tsx                 # claim OR live shop (server)
    admin/page.tsx           # shop admin
  owner/
    layout.tsx               # owner session gate
    page.tsx                 # accueil
    codes/page.tsx
    codes/print/page.tsx
    shops/page.tsx
    shops/[shopId]/page.tsx
    leads/page.tsx
    settings/page.tsx
    login/page.tsx           # if not session
  api/
    upload/route.ts
    qr/[code]/route.ts       # optional PNG
lib/
  db/schema.ts
  db/index.ts
  auth.ts
  crypto.ts                  # encrypt/decrypt shop passwords
  codes.ts                   # alphabet, generate
  phones.ts                  # Algeria normalize
  rate-limit.ts
  qr.ts
messages/
  fr.json
  ar.json
components/
  ui/                        # shadcn
  lang-switch.tsx
  shop-card.tsx              # public card
  shop-admin/
  owner/
seed/
  sportif-logo.webp
  seed.ts
middleware.ts
next.config.ts               # rewrite OWNER_PATH → /owner
```

---

## 12. Environment

```
DATABASE_URL=
BLOB_READ_WRITE_TOKEN=
SESSION_SECRET=              # 32+ random bytes
OWNER_ENCRYPTION_KEY=        # 32 bytes base64
OWNER_PATH=ox-w9k4m2
OWNER_BOOTSTRAP_PASSWORD=    # used only to seed owner_settings
APP_URL=http://localhost:3000
QR_BASE_URL=http://localhost:3000
DEMO_PASSWORD=sportif
```

Production: `OWNER_PATH` must be long and random. `APP_URL` and `QR_BASE_URL` become real https URLs. `DEMO_PASSWORD` changed.

---

## 13. Build order

Build in this order. Do not skip ahead to polish the owner charts that do not exist.

1. **Scaffold** — Next.js, pnpm, Tailwind, shadcn with RTL, next-intl cookie locale, Paper tokens, fonts, language switcher on a blank page.  
2. **Database** — Neon, Drizzle schema, migrate, seed DEMO + owner.  
3. **Public shop** — `/{code}` renders Sportif from DB with zero hydration except dialogs. Compare visually to the old HTML. This is the quality bar.  
4. **Claim wizard** — unused code → live on step 1.  
5. **Shop admin auth + four tabs** — identity, buttons (reorder + hide), infos, password. Phone layout first.  
6. **Homepage** — short story + lead form.  
7. **Owner auth + rewrite** — secret path.  
8. **Owner Accueil, QR generate/print/disable/assign, Boutiques list with password reveal + Gérer, Demandes convert, Settings.**  
9. **Uploads** — logo + gallery via Blob, client compress.  
10. **Hardening** — rate limits, robots, disabled state, impersonate banner, print CSS, OG tags.  
11. **Pass on a real phone** — Arabic and French, iOS Safari and Android Chrome, slow 3G throttle. Public page must not jank when scrolling. Admin save must work with the keyboard open.

Done when: a salesperson can scan an unused code, publish a shop, edit colors on a phone, and you can open owner, read that shop’s password, tap Gérer, and fix their Instagram without asking them.

---

## 14. Visual QA checklist (every page)

- Arabic: `dir=rtl`, switcher, no clipped text, no `...` on 320 px width.  
- French: accents, no forced RTL.  
- Mix: shop name in Latin inside an Arabic page sits in `bdi`.  
- Keyboard does not hide the sticky save (use `visualViewport` padding).  
- 320 px wide, 44 px thumbs, no horizontal scroll.  
- Public page works with JS disabled except multi-number sheets (those degrade to the first number).  
- Contrast ≥ 4.5:1 on body text. Sportif dark preset already does. Paper-light must too.  
- Language switch does not lose unsaved admin fields (warn or keep state).

---

## 15. What “clean” means here

One card. One question. One primary button.  
Lists are scannable: name, status, one action.  
Color is for status and network buttons, not for decoration.  
If a control is used once a month (reassign QR, reset DEMO), it goes in an overflow.  
If a control is used at the counter (save, enable WhatsApp, copy link), it is huge.

That is the whole product. Build this file, not a bigger one.
