import { renderSVG, renderUnicodeCompact } from "uqr";

export function qrSvg(text: string, size = 256) {
  return renderSVG(text, {
    ecc: "M",
    boostEcc: true,
    border: 2,
  }).replace("<svg", `<svg width="${size}" height="${size}"`);
}

export function qrAscii(text: string) {
  return renderUnicodeCompact(text);
}
