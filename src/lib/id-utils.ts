/**
 * Generate a CUID-like ID using Node.js crypto.
 * Produces a unique, URL-safe string suitable for database primary keys.
 */
export function createId(): string {
  const timestamp = Date.now().toString(36);
  const random = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(36).padStart(2, '0'))
    .join('');
  return `${timestamp}${random}`;
}