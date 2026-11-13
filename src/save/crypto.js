/**
 * Save-state encryption (F-P1.5, spec.md §10.3).
 *
 * AES-GCM with SHA-256("undefined") as key — obfuscation, not security.
 * Output = base64(12-byte IV + ciphertext).
 */

const SAVE_KEY_SOURCE = 'undefined';
const IV_LENGTH = 12;

let _cachedKey = null;

/** Derive AES-GCM key from SHA-256("undefined"). Cached after first call. */
async function getKey() {
  if (_cachedKey) return _cachedKey;
  const enc = new TextEncoder();
  const rawKey = await crypto.subtle.digest('SHA-256', enc.encode(SAVE_KEY_SOURCE));
  _cachedKey = await crypto.subtle.importKey('raw', rawKey, 'AES-GCM', false, [
    'encrypt',
    'decrypt',
  ]);
  return _cachedKey;
}

/** Encrypt a plain object → base64 string. */
export async function encrypt(obj) {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const data = new TextEncoder().encode(JSON.stringify(obj));
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);
  // concat iv + ciphertext
  const combined = new Uint8Array(IV_LENGTH + cipher.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(cipher), IV_LENGTH);
  return btoa(String.fromCharCode(...combined));
}

/** Decrypt base64 string → plain object. Returns null on any failure. */
export async function decrypt(b64) {
  try {
    const key = await getKey();
    const raw = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    if (raw.length < IV_LENGTH + 1) return null;
    const iv = raw.slice(0, IV_LENGTH);
    const cipher = raw.slice(IV_LENGTH);
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher);
    return JSON.parse(new TextDecoder().decode(plain));
  } catch {
    return null;
  }
}

