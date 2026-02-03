import { describe, expect, test } from "bun:test";
import { decideProxyAction } from "@/lib/proxy-logic";

describe("proxy logic", () => {
  test("redirects non-locale paths to /en", () => {
    expect(
      decideProxyAction({
        pathname: "/dashboard",
        search: "",
        authCookieValue: undefined,
      }),
    ).toEqual({
      kind: "redirect",
      toPath: "/en/dashboard",
      setLocaleCookie: "en",
    });
  });

  test("allows public assets and framework endpoints", () => {
    expect(
      decideProxyAction({
        pathname: "/_next/static/chunk.js",
        search: "",
        authCookieValue: "",
      }),
    ).toEqual({ kind: "next" });

    expect(
      decideProxyAction({
        pathname: "/api/health",
        search: "",
        authCookieValue: "",
      }),
    ).toEqual({ kind: "next" });

    expect(
      decideProxyAction({
        pathname: "/favicon.ico",
        search: "",
        authCookieValue: "",
      }),
    ).toEqual({ kind: "next" });
  });

  test("does not treat lookalike segments as framework endpoints", () => {
    expect(
      decideProxyAction({
        pathname: "/apiary",
        search: "",
        authCookieValue: "",
      }),
    ).toEqual({
      kind: "redirect",
      toPath: "/en/apiary",
      setLocaleCookie: "en",
    });

    expect(
      decideProxyAction({
        pathname: "/_nextish",
        search: "?x=1",
        authCookieValue: "",
      }),
    ).toEqual({
      kind: "redirect",
      toPath: "/en/_nextish?x=1",
      setLocaleCookie: "en",
    });
  });

  test("redirects root to /en", () => {
    expect(
      decideProxyAction({ pathname: "/", search: "", authCookieValue: "" }),
    ).toEqual({
      kind: "redirect",
      toPath: "/en/",
      setLocaleCookie: "en",
    });
  });

  test("redirects protected route to login with next param when unauthenticated", () => {
    expect(
      decideProxyAction({
        pathname: "/ru/dashboard",
        search: "?a=1",
        authCookieValue: undefined,
      }),
    ).toEqual({
      kind: "redirect",
      toPath: "/ru/login?next=%2Fru%2Fdashboard%3Fa%3D1",
      setLocaleCookie: "ru",
    });
  });

  test("passes through protected route when authenticated", () => {
    expect(
      decideProxyAction({
        pathname: "/lt/dashboard",
        search: "",
        authCookieValue: "1",
      }),
    ).toEqual({ kind: "next", setLocaleCookie: "lt" });
  });
});
