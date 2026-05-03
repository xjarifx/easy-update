import { eq, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { userPreferencesTable } from "../db/schema.js";
import type {
  UserPreferences,
  UserPreferencesRecord,
} from "@easy-update/types";

export const findUserPreferences = async (userId: number) => {
  const [preferences] = await db
    .select()
    .from(userPreferencesTable)
    .where(eq(userPreferencesTable.userId, userId))
    .limit(1);

  return (preferences as UserPreferencesRecord | undefined) ?? null;
};

export const createUserPreferences = async (
  userId: number,
  preferences: UserPreferences,
) => {
  const [created] = await db
    .insert(userPreferencesTable)
    .values({ userId, ...preferences })
    .returning();

  return created as UserPreferencesRecord;
};

export const upsertUserPreferences = async (
  userId: number,
  preferences: UserPreferences,
) => {
  const [updated] = await db
    .insert(userPreferencesTable)
    .values({ userId, ...preferences })
    .onConflictDoUpdate({
      target: userPreferencesTable.userId,
      set: {
        ...preferences,
        updatedAt: sql`now()`,
      },
    })
    .returning();

  return updated as UserPreferencesRecord;
};
