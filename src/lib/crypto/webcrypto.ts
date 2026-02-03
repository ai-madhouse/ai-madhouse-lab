import { base64ToBytes, bytesToBase64 } from "@/lib/crypto/base64";

const pbkdf2Iterations = 210_000;

function textToBytes(text: string) {
  return new TextEncoder().encode(text);
}

function bytesToText(bytes: Uint8Array) {
  return new TextDecoder().decode(bytes);
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}

function randomBytes(length: number) {
  const out = new Uint8Array(length);
  crypto.getRandomValues(out);
  return out;
}

export type WrappedKey = {
  kdf_salt: string;
  wrapped_key_iv: string;
  wrapped_key_ciphertext: string;
};

export async function createWrappedDek(passphrase: string): Promise<{
  wrapped: WrappedKey;
  dekRaw: Uint8Array;
}> {
  const salt = randomBytes(16);
  const kek = await deriveKek(passphrase, salt);
  const dekRaw = randomBytes(32);

  const iv = randomBytes(12);
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      kek,
      toArrayBuffer(dekRaw),
    ),
  );

  return {
    wrapped: {
      kdf_salt: bytesToBase64(salt),
      wrapped_key_iv: bytesToBase64(iv),
      wrapped_key_ciphertext: bytesToBase64(ciphertext),
    },
    dekRaw,
  };
}

async function deriveKek(passphrase: string, salt: Uint8Array) {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    toArrayBuffer(textToBytes(passphrase)),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: toArrayBuffer(salt),
      iterations: pbkdf2Iterations,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function unwrapDek({
  passphrase,
  wrapped,
}: {
  passphrase: string;
  wrapped: WrappedKey;
}) {
  const salt = base64ToBytes(wrapped.kdf_salt);
  const iv = base64ToBytes(wrapped.wrapped_key_iv);
  const ciphertext = base64ToBytes(wrapped.wrapped_key_ciphertext);

  const kek = await deriveKek(passphrase, salt);
  const raw = new Uint8Array(
    await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      kek,
      toArrayBuffer(ciphertext),
    ),
  );

  return raw;
}

export async function importDek(dekRaw: Uint8Array) {
  return await crypto.subtle.importKey(
    "raw",
    toArrayBuffer(dekRaw),
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptJson({
  key,
  value,
}: {
  key: CryptoKey;
  value: unknown;
}): Promise<{ payload_iv: string; payload_ciphertext: string }> {
  const iv = randomBytes(12);
  const plaintext = textToBytes(JSON.stringify(value));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      toArrayBuffer(plaintext),
    ),
  );

  return {
    payload_iv: bytesToBase64(iv),
    payload_ciphertext: bytesToBase64(ciphertext),
  };
}

export async function decryptJson<T>({
  key,
  payload_iv,
  payload_ciphertext,
}: {
  key: CryptoKey;
  payload_iv: string;
  payload_ciphertext: string;
}): Promise<T> {
  const iv = base64ToBytes(payload_iv);
  const ciphertext = base64ToBytes(payload_ciphertext);

  const plaintext = new Uint8Array(
    await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      toArrayBuffer(ciphertext),
    ),
  );

  return JSON.parse(bytesToText(plaintext)) as T;
}
