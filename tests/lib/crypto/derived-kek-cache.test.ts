import { describe, expect, test } from "bun:test";
import { createStore } from "jotai";
import { derivedKekCacheAtom } from "@/lib/crypto/derived-kek-cache";

describe("derived KEK cache atom", () => {
  test("stores and clears per-user entries", async () => {
    const store = createStore();
    expect(store.get(derivedKekCacheAtom)).toEqual({});

    const kek = await crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"],
    );

    store.set(derivedKekCacheAtom, {
      alice: { kdf_salt: "salt", kek },
    });

    expect(store.get(derivedKekCacheAtom).alice.kek).toBe(kek);

    store.set(derivedKekCacheAtom, {});
    expect(store.get(derivedKekCacheAtom)).toEqual({});
  });
});
