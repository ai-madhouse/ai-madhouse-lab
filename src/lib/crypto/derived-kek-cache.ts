"use client";

import { atom } from "jotai";

export type DerivedKekCacheEntry = {
  kdf_salt: string;
  kek: CryptoKey;
};

export const derivedKekCacheAtom = atom<Record<string, DerivedKekCacheEntry>>(
  {},
);
