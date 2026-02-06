"use client";

import { useEffect, useState } from "react";

import { fetchCsrfTokenOrNull } from "@/lib/client/csrf";

export function CsrfTokenField({ name = "csrfToken" }: { name?: string }) {
  const [token, setToken] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const csrfToken = await fetchCsrfTokenOrNull();
      if (!cancelled && csrfToken) setToken(csrfToken);
    }

    run();

    return () => {
      cancelled = true;
    };
  }, []);

  return <input type="hidden" name={name} value={token} />;
}
