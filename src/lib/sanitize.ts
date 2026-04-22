// Lightweight input sanitization for values stored in localStorage and rendered in UI.
// Goals:
//  - Strip control chars and HTML/script-like tokens to mitigate XSS surface.
//  - Enforce hard length caps to prevent storage abuse.
//  - Never throw — always return a safe string.
//
// React already escapes string children by default, but defense-in-depth matters
// for values that might one day flow into innerHTML, URLs, or third-party APIs.

const HTML_TAG_RE = /<\/?[^>]*>/g;
const CONTROL_CHARS_RE = /[\u0000-\u001F\u007F]/g;
// Block common XSS sinks if someone manually crafts a value.
const DANGEROUS_RE = /(javascript:|data:text\/html|on\w+\s*=)/gi;

export function sanitizeText(input: unknown, maxLen = 80): string {
  if (typeof input !== "string") return "";
  return input
    .replace(HTML_TAG_RE, "")
    .replace(DANGEROUS_RE, "")
    .replace(CONTROL_CHARS_RE, "")
    .trim()
    .slice(0, maxLen);
}

export function sanitizeName(input: unknown): string {
  return sanitizeText(input, 24);
}

export function sanitizeShoeField(input: unknown): string {
  return sanitizeText(input, 40);
}
