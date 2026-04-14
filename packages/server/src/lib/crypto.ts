/**
 * AES-GCM credential encryption using the Workers Web Crypto API.
 *
 * The ENCRYPTION_KEY secret (32 bytes, base64) is set via
 * `wrangler secret put ENCRYPTION_KEY`. APNs .p8 files and FCM service
 * account JSONs are encrypted with this key before being written to D1.
 */

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

async function importKey(rawBase64: string): Promise<CryptoKey> {
  const keyBytes = base64ToBytes(rawBase64);
  if (keyBytes.length !== 32) {
    throw new Error("ENCRYPTION_KEY must be 32 bytes (base64)");
  }
  return crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
}

export interface EncryptedBlob {
  ciphertext: string;
  nonce: string;
}

export async function encryptCredential(
  plaintext: string,
  keyBase64: string,
): Promise<EncryptedBlob> {
  const key = await importKey(keyBase64);
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonce },
    key,
    encoded,
  );
  return {
    ciphertext: bytesToBase64(new Uint8Array(encrypted)),
    nonce: bytesToBase64(nonce),
  };
}

export async function decryptCredential(
  blob: EncryptedBlob,
  keyBase64: string,
): Promise<string> {
  const key = await importKey(keyBase64);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(blob.nonce) },
    key,
    base64ToBytes(blob.ciphertext),
  );
  return new TextDecoder().decode(decrypted);
}

/**
 * Hash an API key for storage. SHA-256 of the raw key, base64-encoded.
 */
export async function hashApiKey(apiKey: string): Promise<string> {
  const encoded = new TextEncoder().encode(apiKey);
  const hash = await crypto.subtle.digest("SHA-256", encoded);
  return bytesToBase64(new Uint8Array(hash));
}

/**
 * Generate a random API key secret. 32 bytes, base64url-encoded.
 */
export function generateSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const b64 = bytesToBase64(bytes);
  // base64url without padding
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Generate a UUID using the crypto API (Workers supports crypto.randomUUID).
 */
export function generateId(): string {
  return crypto.randomUUID();
}
