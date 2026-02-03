import crypto from "node:crypto";

import { cookies } from "next/headers";

export const csrfCookieName = "madhouse_csrf";

export function generateCsrfToken() {
  return crypto.randomBytes(24).toString("base64url");
}

function timingSafeEqualString(a: string, b: string) {
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  if (aa.length !== bb.length) return false;
  return crypto.timingSafeEqual(aa, bb);
}

export async function verifyCsrfToken(tokenFromRequest: string) {
  const cookieStore = await cookies();
  const expected = cookieStore.get(csrfCookieName)?.value;
  if (!expected) return false;
  return timingSafeEqualString(expected, tokenFromRequest);
}
