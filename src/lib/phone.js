// Same rules as the backend's lib/phone.js, so hashes of contacts match stored hashes.
export function normalizePhone(raw, defaultCountry = "91") {
  const text = String(raw ?? "").trim();
  if (!text) return null;
  const international = text.startsWith("+") || text.startsWith("00");
  let digits = text.replace(/\D/g, "");
  if (text.startsWith("00")) digits = digits.slice(2);
  if (!international) {
    digits = digits.replace(/^0+/, "");
    if (!defaultCountry || digits.length > 10) return null;
    digits = `${defaultCountry}${digits}`;
  }
  if (digits.length < 8 || digits.length > 15) return null;
  return `+${digits}`;
}

export async function hashPhone(e164) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(e164));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Chrome on Android lets a page ask for chosen contacts; nothing else does (yet).
export const canPickContacts = () =>
  typeof navigator !== "undefined" && "contacts" in navigator && typeof window.ContactsManager !== "undefined";
