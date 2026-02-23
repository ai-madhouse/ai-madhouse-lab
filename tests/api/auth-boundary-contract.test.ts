import { beforeAll, beforeEach, describe, expect, mock, test } from "bun:test";

import { NextRequest } from "next/server";

import { createUser, getUserByUsername } from "@/lib/users";

let csrfValid = true;
let loginPost: typeof import("@/app/api/auth/login/route").POST;
let registerPost: typeof import("@/app/api/auth/register/route").POST;

function createFormPostRequest({
  url,
  form,
  cookie,
}: {
  url: string;
  form: Record<string, string>;
  cookie?: string;
}) {
  const body = new URLSearchParams(form).toString();
  const headers = new Headers({
    "content-type": "application/x-www-form-urlencoded",
  });

  if (cookie) {
    headers.set("cookie", cookie);
  }

  return new NextRequest(url, {
    method: "POST",
    headers,
    body,
  });
}

function getRedirectLocation(response: Response) {
  const location = response.headers.get("location");
  expect(location).toBeTruthy();
  return new URL(location as string, "http://local.test");
}

describe("internal API contracts: auth boundary routes", () => {
  beforeAll(async () => {
    mock.module("@/lib/csrf", () => ({
      verifyCsrfToken: async () => csrfValid,
      csrfCookieName: "madhouse_csrf",
      generateCsrfToken: () => "csrf-test-token",
    }));

    ({ POST: loginPost } = await import("@/app/api/auth/login/route"));
    ({ POST: registerPost } = await import("@/app/api/auth/register/route"));
  });

  beforeEach(() => {
    csrfValid = true;
  });

  test("/api/auth/login invalid credentials redirects with error=1", async () => {
    const loginRes = await loginPost(
      createFormPostRequest({
        url: "http://local.test/api/auth/login",
        form: {
          locale: "en",
          next: "/en/dashboard",
          username: "missing-user",
          password: "wrong-password",
          csrfToken: "csrf-test-token",
        },
        cookie: "madhouse_csrf=csrf-test-token",
      }),
    );

    expect(loginRes.status).toBe(307);
    const location = getRedirectLocation(loginRes);
    expect(location.pathname).toBe("/en/login");
    expect(location.searchParams.get("error")).toBe("1");
    expect(location.searchParams.get("next")).toBe("/en/dashboard");
  });

  test("/api/auth/login missing csrf redirects with error=csrf", async () => {
    const loginRes = await loginPost(
      createFormPostRequest({
        url: "http://local.test/api/auth/login",
        form: {
          locale: "en",
          next: "/en/dashboard",
          username: "someone",
          password: "Password123!",
          csrfToken: "",
        },
      }),
    );

    expect(loginRes.status).toBe(307);
    const location = getRedirectLocation(loginRes);
    expect(location.pathname).toBe("/en/login");
    expect(location.searchParams.get("error")).toBe("csrf");
    expect(location.searchParams.get("next")).toBe("/en/dashboard");
  });

  test("/api/auth/register duplicate user redirects with error=exists", async () => {
    const username = `arx-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
    const password = "Password123!";
    await createUser({ username, password });

    const registerRes = await registerPost(
      createFormPostRequest({
        url: "http://local.test/api/auth/register",
        form: {
          locale: "en",
          next: "/en/dashboard",
          username,
          password,
          password2: password,
          csrfToken: "csrf-test-token",
        },
        cookie: "madhouse_csrf=csrf-test-token",
      }),
    );

    expect(registerRes.status).toBe(307);
    const location = getRedirectLocation(registerRes);
    expect(location.pathname).toBe("/en/register");
    expect(location.searchParams.get("error")).toBe("exists");
    expect(location.searchParams.get("next")).toBe("/en/dashboard");
  });

  test("/api/auth/register invalid csrf redirects with error=csrf", async () => {
    csrfValid = false;
    const registerRes = await registerPost(
      createFormPostRequest({
        url: "http://local.test/api/auth/register",
        form: {
          locale: "en",
          next: "/en/dashboard",
          username: `new-${Date.now().toString().slice(-6)}`,
          password: "Password123!",
          password2: "Password123!",
          csrfToken: "bad-token",
        },
        cookie: "madhouse_csrf=csrf-test-token",
      }),
    );

    expect(registerRes.status).toBe(307);
    const location = getRedirectLocation(registerRes);
    expect(location.pathname).toBe("/en/register");
    expect(location.searchParams.get("error")).toBe("csrf");
    expect(location.searchParams.get("next")).toBe("/en/dashboard");
  });

  test("/api/auth/login invalid credentials sanitize external next to locale dashboard fallback", async () => {
    const loginRes = await loginPost(
      createFormPostRequest({
        url: "http://local.test/api/auth/login",
        form: {
          locale: "en",
          next: "https://evil.example/steal-session",
          username: "missing-user",
          password: "wrong-password",
          csrfToken: "csrf-test-token",
        },
        cookie: "madhouse_csrf=csrf-test-token",
      }),
    );

    expect(loginRes.status).toBe(307);
    const location = getRedirectLocation(loginRes);
    expect(location.pathname).toBe("/en/login");
    expect(location.searchParams.get("error")).toBe("1");
    expect(location.searchParams.get("next")).toBe("/en/dashboard");
  });

  test("/api/auth/register duplicate user normalizes locale and blocks cross-locale next escape", async () => {
    const username = `register-dupe-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
    const password = "Password123!";
    await createUser({ username, password });

    const registerRes = await registerPost(
      createFormPostRequest({
        url: "http://local.test/api/auth/register",
        form: {
          locale: "xx",
          next: "/ru/dashboard",
          username,
          password,
          password2: password,
          csrfToken: "csrf-test-token",
        },
        cookie: "madhouse_csrf=csrf-test-token",
      }),
    );

    expect(registerRes.status).toBe(307);
    const location = getRedirectLocation(registerRes);
    expect(location.pathname).toBe("/en/register");
    expect(location.searchParams.get("error")).toBe("exists");
    expect(location.searchParams.get("next")).toBe("/en/dashboard");
  });

  test("/api/auth/login rejects csrf supplied only via URL query", async () => {
    const loginRes = await loginPost(
      createFormPostRequest({
        url: "http://local.test/api/auth/login?username=query-user&password=Password123!&csrfToken=csrf-test-token",
        form: {
          locale: "en",
          next: "/en/dashboard",
        },
        cookie: "madhouse_csrf=csrf-test-token",
      }),
    );

    expect(loginRes.status).toBe(307);
    const location = getRedirectLocation(loginRes);
    expect(location.pathname).toBe("/en/login");
    expect(location.searchParams.get("error")).toBe("csrf");
    expect(location.searchParams.get("next")).toBe("/en/dashboard");
  });

  test("/api/auth/register rejects credentials supplied only via URL query", async () => {
    const queryUsername = `query-only-${Date.now().toString().slice(-6)}`;
    const registerRes = await registerPost(
      createFormPostRequest({
        url: `http://local.test/api/auth/register?username=${queryUsername}&password=Password123!&password2=Password123!&csrfToken=csrf-test-token`,
        form: {
          locale: "en",
          next: "/en/dashboard",
        },
        cookie: "madhouse_csrf=csrf-test-token",
      }),
    );

    expect(registerRes.status).toBe(307);
    const location = getRedirectLocation(registerRes);
    expect(location.pathname).toBe("/en/register");
    expect(location.searchParams.get("error")).toBe("csrf");
    expect(location.searchParams.get("next")).toBe("/en/dashboard");
    expect(await getUserByUsername(queryUsername)).toBeNull();
  });
});
