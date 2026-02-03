import crypto from "node:crypto";

import { cookies } from "next/headers";

import { getSession } from "@/lib/sessions";

export const authCookieName = "madhouse_auth";

const defaultUser = "operator";
const defaultPassword = "madhouse";

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET;
  if (secret && secret.length >= 16) return secret;

  // For local/demo use only. In production, require a strong secret.
  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET must be set in production");
  }

  return "dev-secret-change-me-please";
}

export function authenticate(username: string, password: string) {
  const expectedUser = process.env.DEMO_USER ?? defaultUser;
  const expectedPassword = process.env.DEMO_PASS ?? defaultPassword;
  return username === expectedUser && password === expectedPassword;
}

function signSessionId(sessionId: string) {
  const secret = getAuthSecret();
  return crypto
    .createHmac("sha256", secret)
    .update(sessionId)
    .digest("base64url");
}

export function encodeSessionCookie(sessionId: string) {
  const sig = signSessionId(sessionId);
  return `${sessionId}.${sig}`;
}

export function decodeAndVerifySessionCookie(value?: string | null) {
  if (!value) return null;
  const parts = value.split(".");
  if (parts.length !== 2) return null;
  const [sessionId, sig] = parts;
  if (!sessionId || !sig) return null;

  const expected = signSessionId(sessionId);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;

  return crypto.timingSafeEqual(a, b) ? sessionId : null;
}

export async function setAuthCookie(sessionId: string) {
  const secure = process.env.NODE_ENV === "production";
  const cookieStore = await cookies();

  cookieStore.set(authCookieName, encodeSessionCookie(sessionId), {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.set(authCookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  });
}

export async function getSignedSessionIdFromCookies() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(authCookieName)?.value;
  return decodeAndVerifySessionCookie(raw);
}

export async function isAuthenticated() {
  const sessionId = await getSignedSessionIdFromCookies();
  if (!sessionId) return false;

  const session = await getSession(sessionId);
  return session !== null;
}

export async function verifyCsrfToken(tokenFromRequest: string) {
  // Lazy import to avoid circular deps in app builds.
  const mod = (await import("@/lib/csrf")) as typeof import("@/lib/csrf");
  return mod.verifyCsrfToken(tokenFromRequest);
}
