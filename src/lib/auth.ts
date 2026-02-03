import { cookies } from "next/headers";

export const authCookieName = "madhouse_auth";

const defaultUser = "operator";
const defaultPassword = "madhouse";

export function authenticate(username: string, password: string) {
  const expectedUser = process.env.DEMO_USER ?? defaultUser;
  const expectedPassword = process.env.DEMO_PASS ?? defaultPassword;
  return username === expectedUser && password === expectedPassword;
}

export async function setAuthCookie() {
  const secure = process.env.NODE_ENV === "production";
  const cookieStore = await cookies();
  cookieStore.set(authCookieName, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
  });
}

export async function isAuthenticated() {
  const cookieStore = await cookies();
  return cookieStore.get(authCookieName)?.value === "1";
}
