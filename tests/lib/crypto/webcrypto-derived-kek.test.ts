import { describe, expect, test } from "bun:test";
import {
  createWrappedDek,
  deriveKekFromPassphrase,
  unwrapDek,
  unwrapDekWithKek,
} from "@/lib/crypto/webcrypto";

describe("webcrypto derived KEK", () => {
  test("unwrapDekWithKek unwraps using cached derived key", async () => {
    const passphrase = "correct horse battery staple";
    const created = await createWrappedDek(passphrase);

    const raw = await unwrapDekWithKek({
      kek: created.kek,
      wrapped: created.wrapped,
    });

    expect([...raw]).toEqual([...created.dekRaw]);
  });

  test("deriveKekFromPassphrase + unwrapDekWithKek matches unwrapDek", async () => {
    const passphrase = "correct horse battery staple";
    const created = await createWrappedDek(passphrase);

    const kek = await deriveKekFromPassphrase({
      passphrase,
      kdf_salt: created.wrapped.kdf_salt,
    });

    const rawWithKek = await unwrapDekWithKek({
      kek,
      wrapped: created.wrapped,
    });
    const rawWithPassphrase = await unwrapDek({
      passphrase,
      wrapped: created.wrapped,
    });

    expect([...rawWithKek]).toEqual([...rawWithPassphrase]);
    expect([...rawWithKek]).toEqual([...created.dekRaw]);
  });
});
