import { getDb, withSqliteBusyRetry } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/passwords";

export type UserRow = {
  username: string;
  password_hash: string;
  created_at: string;
};

export { normalizeUsername } from "@/lib/validation/users";

export class UserAlreadyExistsError extends Error {
  constructor() {
    super("user already exists");
    this.name = "UserAlreadyExistsError";
  }
}

function isUniqueUsernameConstraint(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return (
    message.includes("UNIQUE constraint failed: users.username") ||
    message.includes("SQLITE_CONSTRAINT")
  );
}

export async function getUserByUsername(
  username: string,
): Promise<UserRow | null> {
  const db = await getDb();
  const res = await db.execute({
    sql: "select username, password_hash, created_at from users where username = ?",
    args: [username],
  });

  const row = res.rows[0] as unknown as UserRow | undefined;
  return row ?? null;
}

export async function createUser({
  username,
  password,
}: {
  username: string;
  password: string;
}) {
  const db = await getDb();
  const passwordHash = hashPassword(password);

  try {
    await withSqliteBusyRetry(() =>
      db.execute({
        sql: "insert into users(username, password_hash) values(?,?)",
        args: [username, passwordHash],
      }),
    );
  } catch (error) {
    if (isUniqueUsernameConstraint(error)) {
      throw new UserAlreadyExistsError();
    }
    throw error;
  }

  const user = await getUserByUsername(username);
  if (!user) throw new Error("user insert failed");
  return user;
}

export async function verifyCredentials({
  username,
  password,
}: {
  username: string;
  password: string;
}) {
  const user = await getUserByUsername(username);
  if (!user) return false;

  return verifyPassword({ password, stored: user.password_hash });
}

export async function updateUserPassword({
  username,
  newPassword,
}: {
  username: string;
  newPassword: string;
}) {
  const db = await getDb();
  const passwordHash = hashPassword(newPassword);

  await withSqliteBusyRetry(() =>
    db.execute({
      sql: "update users set password_hash = ? where username = ?",
      args: [passwordHash, username],
    }),
  );
}
