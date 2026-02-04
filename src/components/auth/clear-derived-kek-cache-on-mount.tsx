"use client";

import { useSetAtom } from "jotai";
import { useEffect } from "react";
import { derivedKekCacheAtom } from "@/lib/crypto/derived-kek-cache";

export function ClearDerivedKekCacheOnMount({ enabled }: { enabled: boolean }) {
  const setDerivedKekCache = useSetAtom(derivedKekCacheAtom);

  useEffect(() => {
    if (!enabled) return;
    setDerivedKekCache({});
  }, [enabled, setDerivedKekCache]);

  return null;
}
