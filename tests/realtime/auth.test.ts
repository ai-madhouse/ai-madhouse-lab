import { describe, expect, test } from "bun:test";
import { encodeSessionCookie } from "@/lib/auth";

import {
  authCookieName,
  decodeAndVerifySessionCookie,
  getCookieValue,
} from "../../realtime/auth";

describe("realtime/auth", () => {
  test("decodes cookies created by web auth", () => {
    const sessionId = "session-123";
    const token = encodeSessionCookie(sessionId);

    expect(decodeAndVerifySessionCookie(token)).toBe(sessionId);
  });

  test("rejects tampered cookies", () => {
    const sessionId = "session-123";
    const token = encodeSessionCookie(sessionId);
    const tampered = token.replace("session-123", "session-456");

    expect(decodeAndVerifySessionCookie(tampered)).toBeNull();
  });

  test("getCookieValue extracts raw cookie value", () => {
    const sessionId = "session-123";
    const token = encodeSessionCookie(sessionId);
    const header = `a=1; ${authCookieName}=${token}; z=2`;

    expect(getCookieValue(header, authCookieName)).toBe(token);
  });

  test("getCookieValue preserves equals signs in value", () => {
    const header = `${authCookieName}=abc=def; other=1`;

    expect(getCookieValue(header, authCookieName)).toBe("abc=def");
  });
});
