import { describe, expect, test } from "bun:test";
import { decodeAndVerifySessionCookie, encodeSessionCookie } from "@/lib/auth";

describe("auth", () => {
  test("encodeSessionCookie produces verifiable token", () => {
    const sessionId = "session-123";
    const token = encodeSessionCookie(sessionId);

    expect(decodeAndVerifySessionCookie(token)).toBe(sessionId);
  });

  test("decodeAndVerifySessionCookie rejects tampering", () => {
    const sessionId = "session-123";
    const token = encodeSessionCookie(sessionId);
    const tampered = token.replace("session-123", "session-456");

    expect(decodeAndVerifySessionCookie(tampered)).toBeNull();
  });
});
