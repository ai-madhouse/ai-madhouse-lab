type CsrfResponse =
  | { ok: true; token: string }
  | { ok: false; error?: string }
  | null;

async function requestCsrfToken() {
  const res = await fetch("/api/csrf", { cache: "no-store" });
  const json = (await res.json().catch(() => null)) as CsrfResponse;
  return { res, json };
}

export async function fetchCsrfTokenOrNull() {
  const { res, json } = await requestCsrfToken();
  if (!res.ok || !json || !json.ok) return null;
  return json.token;
}

export async function fetchCsrfTokenOrThrow(defaultError = "csrf failed") {
  const { res, json } = await requestCsrfToken();
  if (res.ok && json && json.ok) return json.token;

  throw new Error((json && "error" in json && json.error) || defaultError);
}
