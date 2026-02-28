import { describe, expect, test } from "bun:test";

import { createUser, UserAlreadyExistsError } from "@/lib/users";

describe("users", () => {
  test("createUser throws UserAlreadyExistsError for duplicate usernames", async () => {
    const username = `users-dup-${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
    const password = "Password123!";

    await createUser({ username, password });

    await expect(createUser({ username, password })).rejects.toBeInstanceOf(
      UserAlreadyExistsError,
    );
  });
});
