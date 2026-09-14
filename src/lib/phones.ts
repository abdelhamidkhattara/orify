/** Normalize Algerian mobile numbers to E.164 (+213…) */
export function normalizeDzPhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (!digits) return null;

  let local = digits;
  if (local.startsWith("213")) local = local.slice(3);
  if (local.startsWith("0")) local = local.slice(1);

  // Mobile: 5/6/7 + 8 digits
  if (/^[567]\d{8}$/.test(local)) return `+213${local}`;
  // Landline-ish longer
  if (/^\d{8,9}$/.test(local)) return `+213${local}`;

  if (digits.startsWith("213") && digits.length >= 12) return `+${digits}`;
  return null;
}

export function displayDzPhone(e164: string): string {
  if (!e164.startsWith("+213")) return e164;
  const rest = e164.slice(4);
  return `0${rest}`;
}

export function waLink(e164: string, prefill = "") {
  const num = e164.replace(/\D/g, "");
  const text = prefill ? `?text=${encodeURIComponent(prefill)}` : "";
  return `https://wa.me/${num}${text}`;
}

export function telLink(e164: string) {
  return `tel:${e164}`;
}

export function telegramLink(value: string) {
  if (value.startsWith("@")) return `https://t.me/${value.slice(1)}`;
  if (value.startsWith("+") || /^\d/.test(value)) {
    return `https://t.me/${value.replace(/\D/g, "")}`;
  }
  return `https://t.me/${value}`;
}
