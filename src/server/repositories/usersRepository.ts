import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { usersTable } from "../db/schema.js";
import type { UserRecord } from "../domain/types.js";

export const findUserByEmail = async (email: string) => {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);

  return (user as UserRecord | undefined) ?? null;
};

export const findUserById = async (id: number) => {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, id))
    .limit(1);

  return (user as UserRecord | undefined) ?? null;
};

export const createUser = async (input: {
  email: string;
  passwordHash: string;
}) => {
  const [user] = await db.insert(usersTable).values(input).returning();

  return user as UserRecord;
};
