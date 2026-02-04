import crypto from "node:crypto";

import { getEnv } from "./config";

export const authCookieName = "madhouse_auth";

function getAuthSecret() {
  const secret = getEnv("AUTH_SECRET");
  if (secret && secret.length >= 16) return secret;

  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET must be set in production");
  }

  return "dev-secret-change-me-please";
}

function hmac(sessionId: string) {
  return crypto
    .createHmac("sha256", getAuthSecret())
    .update(sessionId)
    .digest("base64url");
}

function timingSafeEqualString(a: string, b: string) {
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  if (aa.length !== bb.length) return false;
  return crypto.timingSafeEqual(aa, bb);
}

export function decodeAndVerifySessionCookie(value: string | undefined | null) {
  if (!value) return null;
  const parts = value.split(".");
  if (parts.length !== 2) return null;
  const [sessionId, sig] = parts;
  if (!sessionId || !sig) return null;
  const expected = hmac(sessionId);
  if (!timingSafeEqualString(sig, expected)) return null;
  return sessionId;
}

export function getCookieValue(cookieHeader: string | null, name: string) {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(";");
  for (const part of parts) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return rest.join("=");
  }
  return null;
}
