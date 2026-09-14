/** Safe file download — never navigates the current tab away. */
export function forceDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  // Keep blob alive until the browser starts the download
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
    a.remove();
  }, 2500);
}

export function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function svgToPngDataUrl(
  svgHtml: string,
  sizePx = 640,
): Promise<string> {
  const svg = svgHtml.includes("xmlns")
    ? svgHtml
    : svgHtml.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("svg"));
      i.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = sizePx;
    canvas.height = sizePx;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, sizePx, sizePx);
    ctx.drawImage(img, 0, 0, sizePx, sizePx);
    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Download QR only as a PNG image (phone-friendly). */
export async function downloadQrPng(svgHtml: string, filename: string) {
  const dataUrl = await svgToPngDataUrl(svgHtml, 1024);
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  forceDownload(blob, filename.endsWith(".png") ? filename : `${filename}.png`);
}

type WordBlock =
  | { kind: "logo"; src: string; mm: number }
  | { kind: "title"; text: string }
  | { kind: "text"; text: string; muted?: boolean }
  | { kind: "qr"; src: string; mm: number }
  | { kind: "code"; text: string };

/** Clean A4 Word (.doc as HTML) — editable in Word/Google Docs. */
export function downloadWordA4(opts: {
  filename: string;
  title: string;
  blocks: WordBlock[];
}) {
  const rows = opts.blocks
    .map((b) => {
      if (b.kind === "logo") {
        return `<tr><td align="center" style="padding:0 0 18pt 0"><img src="${b.src}" width="${Math.round(b.mm * 3.78)}" style="max-width:${b.mm}mm;height:auto;display:block;margin:0 auto" alt="" /></td></tr>`;
      }
      if (b.kind === "title") {
        return `<tr><td align="center" style="padding:0 0 10pt 0;font-size:26pt;font-weight:bold;line-height:1.25;color:#141414;font-family:Arial,Tahoma,sans-serif">${escapeHtml(b.text)}</td></tr>`;
      }
      if (b.kind === "text") {
        const color = b.muted ? "#6b675f" : "#141414";
        const size = b.muted ? "12pt" : "13pt";
        return `<tr><td align="center" style="padding:0 0 10pt 0;font-size:${size};color:${color};line-height:1.4;font-family:Arial,Tahoma,sans-serif;white-space:pre-wrap">${escapeHtml(b.text)}</td></tr>`;
      }
      if (b.kind === "qr") {
        const px = Math.round(b.mm * 3.78);
        return `<tr><td align="center" style="padding:14pt 0"><img src="${b.src}" width="${px}" height="${px}" style="width:${b.mm}mm;height:${b.mm}mm;display:block;margin:0 auto" alt="QR" /></td></tr>`;
      }
      return `<tr><td align="center" style="padding:12pt 0 0 0;font-family:Consolas,'Courier New',monospace;font-size:28pt;font-weight:bold;letter-spacing:0.18em;color:#141414">${escapeHtml(b.text)}</td></tr>`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:w="urn:schemas-microsoft-com:office:word"
 xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<title>${escapeHtml(opts.title)}</title>
<!--[if gte mso 9]>
<xml>
  <w:WordDocument>
    <w:View>Print</w:View>
    <w:Zoom>100</w:Zoom>
    <w:DoNotOptimizeForBrowser/>
  </w:WordDocument>
</xml>
<![endif]-->
<style>
  @page { size: 210mm 297mm; margin: 20mm; }
  html, body {
    margin: 0;
    padding: 0;
    background: #fff;
  }
  body {
    font-family: Arial, Tahoma, sans-serif;
    color: #141414;
  }
  .sheet {
    width: 100%;
    border-collapse: collapse;
  }
</style>
</head>
<body>
  <table class="sheet" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" valign="middle" style="height:250mm">
        <table width="100%" cellpadding="0" cellspacing="0">${rows}</table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  // octet-stream forces a real download instead of opening HTML in this tab
  const blob = new Blob(["\ufeff", html], {
    type: "application/octet-stream",
  });
  forceDownload(blob, opts.filename.endsWith(".doc") ? opts.filename : `${opts.filename}.doc`);
}

export function absoluteAssetUrl(pathOrUrl: string) {
  if (pathOrUrl.startsWith("http") || pathOrUrl.startsWith("data:")) {
    return pathOrUrl;
  }
  if (typeof window === "undefined") return pathOrUrl;
  return `${window.location.origin}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}

/** Shared A4 CSS for print studios */
export const A4_PRINT_CSS = `
.print-studio-chrome { }
.print-only { display: none; }
.a4-sheet {
  width: 210mm;
  height: 297mm;
  margin: 0 auto;
  background: #ffffff;
  box-sizing: border-box;
  overflow: hidden;
  position: relative;
}
.a4-sheet-screen {
  box-shadow:
    0 1px 2px rgba(20,20,20,0.04),
    0 24px 48px rgba(20,20,20,0.18);
  border-radius: 2px;
}
.a4-inner {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  padding: 22mm 18mm;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 5mm;
}
.a4-logo { object-fit: contain; display: block; }
.a4-name {
  margin: 0;
  font-size: 28pt;
  font-weight: 800;
  line-height: 1.2;
  color: #141414;
  letter-spacing: -0.02em;
  max-width: 160mm;
}
.a4-slogan {
  margin: 0;
  max-width: 150mm;
  font-size: 13pt;
  color: #6b675f;
  line-height: 1.45;
}
.a4-custom {
  margin: 0;
  max-width: 150mm;
  font-size: 12pt;
  color: #141414;
  white-space: pre-wrap;
  line-height: 1.45;
}
.a4-qr-wrap {
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3mm;
  border: 0.4mm solid #ece8e0;
  border-radius: 2mm;
}
.a4-qr-wrap svg { display: block; }
.a4-code {
  font-family: ui-monospace, Consolas, "Courier New", monospace;
  font-size: 30pt;
  font-weight: 800;
  letter-spacing: 0.22em;
  color: #141414;
}
.a4-hint {
  margin: 0;
  font-size: 12pt;
  color: #6b675f;
  letter-spacing: 0.02em;
}
.a4-rule {
  width: 28mm;
  height: 0.6mm;
  background: #141414;
  opacity: 0.85;
  border: 0;
  margin: 1mm 0;
}
@media print {
  .no-print { display: none !important; }
  .print-only { display: block !important; }
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    background: #fff !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  @page {
    size: A4 portrait;
    margin: 0;
  }
  .a4-sheet-print {
    width: 210mm;
    height: 297mm;
    box-shadow: none !important;
    border-radius: 0 !important;
  }
}
`;
