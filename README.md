# Orify

Phone-first QR shop pages for Algeria. French + Arabic.

## Quick start

```bash
pnpm install
pnpm db:seed   # optional — auto-seeds on first page load too
pnpm dev
```

Open:

- **Home:** http://localhost:3000
- **Demo shop:** http://localhost:3000/DEMO
- **Claim unused QR:** http://localhost:3000/B892 (also `/C345`)
- **Shop admin:** http://localhost:3000/DEMO/admin (password: `jarir`)
- **Your secret owner panel:** http://localhost:3000/ox-orify-k7m2p9 (password: `owner123`)

Change `OWNER_PATH` and passwords in `.env.local` before production.

## Stack

Next.js · Tailwind · LibSQL (local file DB) · jose sessions · French/Arabic cookie locale

Full product bible: `PROJECT.md`
