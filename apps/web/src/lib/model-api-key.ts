const PRINTABLE_ASCII_NO_SPACE = /^[\x21-\x7E]+$/;

export function normalizeApiKey(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  const key = value.trim();
  if (!key) {
    return "";
  }

  if (!PRINTABLE_ASCII_NO_SPACE.test(key)) {
    return "";
  }

  return key;
}
