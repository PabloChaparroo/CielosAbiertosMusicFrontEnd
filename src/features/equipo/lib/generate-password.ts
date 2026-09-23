const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";

/** Contraseña generada en el cliente, nunca tipeada por el admin — ver docs/estado-actual.md. */
export function generatePassword(length = 12): string {
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => CHARS[b % CHARS.length]).join("");
}

const AVATAR_PALETTE = [
  "linear-gradient(135deg,#f5c76a,#e08b3a)",
  "linear-gradient(135deg,#7aa2f7,#8b5cf6)",
  "linear-gradient(135deg,#4ade80,#0ea5e9)",
  "linear-gradient(135deg,#f472b6,#f59e0b)",
  "linear-gradient(135deg,#38bdf8,#6366f1)",
  "linear-gradient(135deg,#c084fc,#f472b6)",
  "linear-gradient(135deg,#34d399,#22d3ee)",
  "linear-gradient(135deg,#fbbf24,#fb7185)",
];

export function initialsFor(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "??"
  );
}

export function avatarColorFor(name: string): string {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length]!;
}
