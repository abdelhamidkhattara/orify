/**
 * Build Orify icons for every platform from the SVG brand mark.
 * Run: node scripts/build-brand-icons.mjs
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";
import pngToIco from "png-to-ico";

const root = process.cwd();
const brandDir = path.join(root, "public", "brand");
const outDir = path.join(root, "public");
const markPath = path.join(brandDir, "orify-mark.svg");

const RED = "#C81E3A";
const INK = "#141414";
const CREAM = "#F6F4F0";

function markSvg({ size, bg = null, padding = 0.12 }) {
  const pad = size * padding;
  const inner = size - pad * 2;
  const bgRect = bg
    ? `<rect width="${size}" height="${size}" fill="${bg}" rx="${size * 0.18}"/>`
    : "";
  // Inline mark geometry scaled into viewBox 0 0 64 64
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  ${bgRect}
  <g transform="translate(${pad} ${pad}) scale(${inner / 64})">
    <g fill="none" stroke="${RED}" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M18 28V18h10"/>
      <path d="M36 18h10v10"/>
      <path d="M46 36v10H36"/>
      <path d="M28 46H18V36"/>
    </g>
    <path fill="${RED}" d="M32 22c1.2 6.2 6.6 10.6 12.8 11.8C38.6 35 33.2 39.4 32 45.6 30.8 39.4 25.4 35 19.2 33.8 25.4 32.6 30.8 28.2 32 22Z"/>
  </g>
</svg>`;
}

function wordmarkSvg({ width = 1120, height = 320, bg = CREAM }) {
  // Mark on left, wordmark as vector-ish text using system-safe approach:
  // Use paths approximating geometric sans (built from simple letterforms)
  const mark = `
    <g transform="translate(48, 48) scale(3.5)">
      <g fill="none" stroke="${RED}" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 28V18h10"/>
        <path d="M36 18h10v10"/>
        <path d="M46 36v10H36"/>
        <path d="M28 46H18V36"/>
      </g>
      <path fill="${RED}" d="M32 22c1.2 6.2 6.6 10.6 12.8 11.8C38.6 35 33.2 39.4 32 45.6 30.8 39.4 25.4 35 19.2 33.8 25.4 32.6 30.8 28.2 32 22Z"/>
    </g>`;

  // Text as real SVG text — sharp/librsvg usually picks a sans font
  const text = `
    <text x="310" y="210" font-family="Arial, Helvetica, sans-serif" font-size="148" font-weight="700" letter-spacing="-4">
      <tspan fill="${RED}">O</tspan><tspan fill="${INK}">rify</tspan>
    </text>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="${bg}"/>
  ${mark}
  ${text}
</svg>`;
}

function ogSvg() {
  const w = 1200;
  const h = 630;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="${CREAM}"/>
  <g transform="translate(420, 140) scale(5.5)">
    <g fill="none" stroke="${RED}" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M18 28V18h10"/>
      <path d="M36 18h10v10"/>
      <path d="M46 36v10H36"/>
      <path d="M28 46H18V36"/>
    </g>
    <path fill="${RED}" d="M32 22c1.2 6.2 6.6 10.6 12.8 11.8C38.6 35 33.2 39.4 32 45.6 30.8 39.4 25.4 35 19.2 33.8 25.4 32.6 30.8 28.2 32 22Z"/>
  </g>
  <text x="600" y="520" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="72" font-weight="700" letter-spacing="-1.5">
    <tspan fill="${RED}">O</tspan><tspan fill="${INK}">rify</tspan>
  </text>
  <text x="600" y="570" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="28" fill="#6B675F">Un QR. Toute la boutique.</text>
</svg>`;
}

async function writePng(svg, file, size) {
  const buf = Buffer.from(svg);
  let pipeline = sharp(buf);
  if (size) pipeline = pipeline.resize(size, size, { fit: "contain" });
  await pipeline.png({ compressionLevel: 9 }).toFile(file);
  console.log("wrote", path.relative(root, file));
}

async function main() {
  fs.mkdirSync(brandDir, { recursive: true });

  // Master transparent mark
  await writePng(markSvg({ size: 1024, bg: null, padding: 0.1 }), path.join(brandDir, "orify-mark-1024.png"), 1024);
  await writePng(markSvg({ size: 512, bg: null, padding: 0.1 }), path.join(brandDir, "orify-mark-512.png"), 512);

  // Cream-bg mark (for apple etc.)
  await writePng(markSvg({ size: 1024, bg: CREAM, padding: 0.14 }), path.join(brandDir, "orify-mark-cream-1024.png"), 1024);

  // Favicon set
  const fav16 = await sharp(Buffer.from(markSvg({ size: 16, bg: null, padding: 0.08 }))).png().toBuffer();
  const fav32 = await sharp(Buffer.from(markSvg({ size: 32, bg: null, padding: 0.08 }))).png().toBuffer();
  const fav48 = await sharp(Buffer.from(markSvg({ size: 48, bg: null, padding: 0.08 }))).png().toBuffer();
  fs.writeFileSync(path.join(outDir, "favicon-16x16.png"), fav16);
  fs.writeFileSync(path.join(outDir, "favicon-32x32.png"), fav32);
  const ico = await pngToIco([fav16, fav32, fav48]);
  fs.writeFileSync(path.join(outDir, "favicon.ico"), ico);
  console.log("wrote favicon.ico");

  // SVG favicon (modern browsers)
  fs.copyFileSync(markPath, path.join(outDir, "favicon.svg"));
  fs.copyFileSync(markPath, path.join(outDir, "icon.svg"));

  // Apple touch
  await writePng(markSvg({ size: 180, bg: CREAM, padding: 0.16 }), path.join(outDir, "apple-touch-icon.png"), 180);
  // Next.js app dir convention copies
  await writePng(markSvg({ size: 180, bg: CREAM, padding: 0.16 }), path.join(root, "src", "app", "apple-icon.png"), 180);

  // Android / PWA
  await writePng(markSvg({ size: 192, bg: CREAM, padding: 0.14 }), path.join(outDir, "android-chrome-192x192.png"), 192);
  await writePng(markSvg({ size: 512, bg: CREAM, padding: 0.14 }), path.join(outDir, "android-chrome-512x512.png"), 512);
  // Maskable (more padding)
  await writePng(markSvg({ size: 512, bg: CREAM, padding: 0.22 }), path.join(outDir, "maskable-icon-512x512.png"), 512);

  // Microsoft tile
  await writePng(markSvg({ size: 150, bg: CREAM, padding: 0.16 }), path.join(outDir, "mstile-150x150.png"), 150);

  // App icon.png for Next metadata
  await writePng(markSvg({ size: 32, bg: null, padding: 0.08 }), path.join(root, "src", "app", "icon.png"), 32);
  await writePng(markSvg({ size: 192, bg: null, padding: 0.1 }), path.join(outDir, "icon-192.png"), 192);
  await writePng(markSvg({ size: 512, bg: null, padding: 0.1 }), path.join(outDir, "icon-512.png"), 512);

  // Wordmark + OG
  await sharp(Buffer.from(wordmarkSvg({}))).png().toFile(path.join(brandDir, "orify-logo.png"));
  console.log("wrote brand/orify-logo.png");
  await sharp(Buffer.from(wordmarkSvg({ bg: "#FFFFFF" }))).png().toFile(path.join(brandDir, "orify-logo-white-bg.png"));
  await sharp(Buffer.from(ogSvg())).png().toFile(path.join(outDir, "og.png"));
  console.log("wrote og.png");

  // Transparent wordmark for headers (no cream bg) — crop via SVG without bg
  const wmTransparent = wordmarkSvg({ bg: "none" }).replace(
    `<rect width="1120" height="320" fill="none"/>`,
    "",
  );
  // fix: wordmarkSvg with bg none still has rect — rebuild
  const wmSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1120" height="320" viewBox="0 0 1120 320">
  <g transform="translate(48, 48) scale(3.5)">
    <g fill="none" stroke="${RED}" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M18 28V18h10"/>
      <path d="M36 18h10v10"/>
      <path d="M46 36v10H36"/>
      <path d="M28 46H18V36"/>
    </g>
    <path fill="${RED}" d="M32 22c1.2 6.2 6.6 10.6 12.8 11.8C38.6 35 33.2 39.4 32 45.6 30.8 39.4 25.4 35 19.2 33.8 25.4 32.6 30.8 28.2 32 22Z"/>
  </g>
  <text x="310" y="210" font-family="Arial, Helvetica, sans-serif" font-size="148" font-weight="700" letter-spacing="-4">
    <tspan fill="${RED}">O</tspan><tspan fill="${INK}">rify</tspan>
  </text>
</svg>`;
  await sharp(Buffer.from(wmSvg)).png().toFile(path.join(brandDir, "orify-logo-transparent.png"));

  // browserconfig
  fs.writeFileSync(
    path.join(outDir, "browserconfig.xml"),
    `<?xml version="1.0" encoding="utf-8"?>
<browserconfig>
  <msapplication>
    <tile>
      <square150x150logo src="/mstile-150x150.png"/>
      <TileColor>${CREAM}</TileColor>
    </tile>
  </msapplication>
</browserconfig>
`,
  );

  fs.writeFileSync(
    path.join(outDir, "site.webmanifest"),
    JSON.stringify(
      {
        name: "Orify",
        short_name: "Orify",
        description: "Un QR. Toute la boutique.",
        start_url: "/",
        display: "standalone",
        background_color: CREAM,
        theme_color: CREAM,
        icons: [
          {
            src: "/android-chrome-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/android-chrome-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/maskable-icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: "/icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
        ],
      },
      null,
      2,
    ),
  );
  console.log("wrote site.webmanifest");
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
