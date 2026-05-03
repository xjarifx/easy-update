import { and, asc, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { noticesTable } from "../db/schema.js";
import type { NoticeRecord } from "@easy-update/types";

export const listNotices = async (userId: number) => {
  return (await db
    .select()
    .from(noticesTable)
    .where(eq(noticesTable.userId, userId))
    .orderBy(asc(noticesTable.date), asc(noticesTable.time), asc(noticesTable.id))) as NoticeRecord[];
};

export const findNoticeById = async (id: number, userId: number) => {
  const [notice] = await db
    .select()
    .from(noticesTable)
    .where(and(eq(noticesTable.id, id), eq(noticesTable.userId, userId)))
    .limit(1);

  return (notice as NoticeRecord | undefined) ?? null;
};

export const findNoticeByExactFields = async (input: {
  userId: number;
  date: string;
  time: string;
  title: string;
}) => {
  const [notice] = await db
    .select()
    .from(noticesTable)
    .where(
      and(
        eq(noticesTable.userId, input.userId),
        eq(noticesTable.date, input.date),
        eq(noticesTable.time, input.time),
        eq(noticesTable.title, input.title),
      ),
    )
    .limit(1);

  return (notice as NoticeRecord | undefined) ?? null;
};

export const findNoticesByDateAndTitle = async (input: {
  userId: number;
  date: string;
  title: string;
}) => {
  const notices = await db
    .select()
    .from(noticesTable)
    .where(
      and(
        eq(noticesTable.userId, input.userId),
        eq(noticesTable.date, input.date),
        eq(noticesTable.title, input.title),
      ),
    )
    .orderBy(asc(noticesTable.id));

  return notices as NoticeRecord[];
};

export const createNotice = async (input: {
  userId: number;
  date: string;
  time: string;
  title: string;
  moreInfo: string;
  completed: boolean;
}) => {
  const [notice] = await db.insert(noticesTable).values(input).returning();

  return notice as NoticeRecord;
};

export const updateNotice = async (
  id: number,
  userId: number,
  input: {
    date: string;
    time: string;
    title: string;
    moreInfo: string;
    completed: boolean;
  },
) => {
  const [notice] = await db
    .update(noticesTable)
    .set(input)
    .where(and(eq(noticesTable.id, id), eq(noticesTable.userId, userId)))
    .returning();

  return (notice as NoticeRecord | undefined) ?? null;
};

export const deleteNotice = async (id: number, userId: number) => {
  const [notice] = await db
    .delete(noticesTable)
    .where(and(eq(noticesTable.id, id), eq(noticesTable.userId, userId)))
    .returning();

  return (notice as NoticeRecord | undefined) ?? null;
};
