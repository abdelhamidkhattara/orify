const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function isValidCodeFormat(code: string) {
  if (code.toUpperCase() === "DEMO") return true;
  if (code.length !== 4) return false;
  return [...code.toUpperCase()].every((c) => ALPHABET.includes(c));
}

export function normalizeCode(code: string) {
  return code.trim().toUpperCase();
}

export function generateCode(): string {
  let out = "";
  for (let i = 0; i < 4; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}

export function generateUniqueCodes(count: number, existing: Set<string>) {
  const created: string[] = [];
  let guard = 0;
  while (created.length < count && guard < count * 50) {
    guard++;
    const c = generateCode();
    if (existing.has(c) || created.includes(c)) continue;
    created.push(c);
  }
  return created;
}

export { ALPHABET };
