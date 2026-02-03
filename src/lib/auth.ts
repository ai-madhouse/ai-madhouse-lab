import { cookies } from "next/headers";

export const authCookieName = "madhouse_auth";

const defaultUser = "operator";
const defaultPassword = "madhouse";

export function authenticate(username: string, password: string) {
  const expectedUser = process.env.DEMO_USER ?? defaultUser;
  const expectedPassword = process.env.DEMO_PASS ?? defaultPassword;
  return username === expectedUser && password === expectedPassword;
}

export function setAuthCookie() {
  const secure = process.env.NODE_ENV === "production";
  cookies().set(authCookieName, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
  });
}

export function isAuthenticated() {
  return cookies().get(authCookieName)?.value === "1";
}
