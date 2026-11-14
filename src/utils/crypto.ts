/**
 * End-to-End Encryption (E2EE) utilities using standard Web Crypto API (AES-256-GCM + PBKDF2)
 * Ensures 100% privacy: server and database only store ciphertext and IV.
 */

// Convert ArrayBuffer to Base64 string
export function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Convert Base64 string to Uint8Array
export function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Derive AES-GCM 256-bit key from room code and salt using PBKDF2
export async function deriveKey(roomSecret: string, saltHex: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const passwordKey = await globalThis.crypto.subtle.importKey(
    'raw',
    enc.encode(roomSecret),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const saltBytes = enc.encode(saltHex || 'chat-plus-default-salt-2026');

  return globalThis.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: 100000,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// Encrypt plaintext string with AES-256-GCM
export async function encryptText(
  plainText: string,
  roomSecret: string,
  salt: string
): Promise<{ ciphertext: string; iv: string }> {
  try {
    const key = await deriveKey(roomSecret, salt);
    const iv = globalThis.crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV standard for AES-GCM
    const enc = new TextEncoder();
    const encodedData = enc.encode(plainText);

    const encryptedBuffer = await globalThis.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      key,
      encodedData
    );

    return {
      ciphertext: bufferToBase64(encryptedBuffer),
      iv: bufferToBase64(iv),
    };
  } catch (err) {
    console.error('Encryption failed:', err);
    throw new Error('فشل تشفير الرسالة');
  }
}

// Decrypt AES-256-GCM ciphertext
export async function decryptText(
  ciphertext: string,
  ivBase64: string,
  roomSecret: string,
  salt: string
): Promise<string> {
  try {
    const key = await deriveKey(roomSecret, salt);
    const iv = base64ToBuffer(ivBase64);
    const encryptedData = base64ToBuffer(ciphertext);

    const decryptedBuffer = await globalThis.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv as Uint8Array<ArrayBuffer>,
      },
      key,
      encryptedData as Uint8Array<ArrayBuffer>
    );

    const dec = new TextDecoder();
    return dec.decode(decryptedBuffer);
  } catch (err) {
    // If decryption fails (e.g. wrong key, unencrypted legacy message)
    return ciphertext;
  }
}

// Generate unique human-readable security fingerprint from room code and salt
export async function generateSecurityFingerprint(roomCode: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(`${roomCode}-${salt}-chat-plus-e2ee`);
  const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hex = hashArray.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join('');
  
  // Format into 4 chunks of 4 hex digits: e.g. "8A2F · 4B1C · 99E2 · D077"
  return `${hex.slice(0, 4)} · ${hex.slice(4, 8)} · ${hex.slice(8, 12)} · ${hex.slice(12, 16)}`;
}

// Generate random room code like "CP-8924-K"
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let part1 = '';
  let part2 = '';
  for (let i = 0; i < 4; i++) {
    part1 += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  for (let i = 0; i < 3; i++) {
    part2 += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `CP-${part1}-${part2}`;
}
