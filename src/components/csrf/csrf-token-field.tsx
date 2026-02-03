"use client";

import { useEffect, useState } from "react";

export function CsrfTokenField({ name = "csrfToken" }: { name?: string }) {
  const [token, setToken] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const res = await fetch("/api/csrf", { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as {
        ok: true;
        token: string;
      } | null;
      if (!cancelled && json?.ok) setToken(json.token);
    }

    run();

    return () => {
      cancelled = true;
    };
  }, []);

  return <input type="hidden" name={name} value={token} />;
}
