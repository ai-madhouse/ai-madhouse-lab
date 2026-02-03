import crypto from "node:crypto";

const scryptCost = 16384;
const scryptBlockSize = 8;
const scryptParallelization = 1;
const derivedKeyLen = 32;

function bytesToBase64(bytes: Uint8Array) {
  return Buffer.from(bytes).toString("base64");
}

function base64ToBytes(value: string) {
  return new Uint8Array(Buffer.from(value, "base64"));
}

function timingSafeEqualString(a: string, b: string) {
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  if (aa.length !== bb.length) return false;
  return crypto.timingSafeEqual(aa, bb);
}

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, derivedKeyLen, {
    N: scryptCost,
    r: scryptBlockSize,
    p: scryptParallelization,
  });

  // Format: scrypt$N$r$p$saltB64$hashB64
  return `scrypt$${scryptCost}$${scryptBlockSize}$${scryptParallelization}$${bytesToBase64(
    salt,
  )}$${bytesToBase64(hash)}`;
}

export function verifyPassword({
  password,
  stored,
}: {
  password: string;
  stored: string;
}) {
  const parts = stored.split("$");
  if (parts.length !== 6) return false;
  const [kind, nStr, rStr, pStr, saltB64, hashB64] = parts;
  if (kind !== "scrypt") return false;

  const N = Number(nStr);
  const r = Number(rStr);
  const p = Number(pStr);
  if (!Number.isFinite(N) || !Number.isFinite(r) || !Number.isFinite(p))
    return false;

  const salt = base64ToBytes(saltB64);
  const expectedHashB64 = hashB64;

  const actual = crypto.scryptSync(password, salt, derivedKeyLen, {
    N,
    r,
    p,
  });
  const actualB64 = bytesToBase64(actual);

  return timingSafeEqualString(actualB64, expectedHashB64);
}
