import { getDb } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/passwords";

export type UserRow = {
  username: string;
  password_hash: string;
  created_at: string;
};

export { normalizeUsername } from "@/lib/validation/users";

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

  await db.execute({
    sql: "insert into users(username, password_hash) values(?,?)",
    args: [username, passwordHash],
  });

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

  await db.execute({
    sql: "update users set password_hash = ? where username = ?",
    args: [passwordHash, username],
  });
}
