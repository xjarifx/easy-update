import { and, asc, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { noticesTable } from "../db/schema.js";
import type { NoticeRecord } from "@easy-update/types";

const toNoticeRecord = (row: { date: Date } & Record<string, unknown>): NoticeRecord => ({
  ...row,
  date: row.date instanceof Date ? row.date.toISOString().split("T")[0] : String(row.date),
}) as unknown as NoticeRecord;

export const listNotices = async (userId: number) => {
  const results = await db
    .select()
    .from(noticesTable)
    .where(eq(noticesTable.userId, userId))
    .orderBy(asc(noticesTable.date), asc(noticesTable.time), asc(noticesTable.id));
  return results.map(toNoticeRecord);
};

export const findNoticeById = async (id: number, userId: number) => {
  const [notice] = await db
    .select()
    .from(noticesTable)
    .where(and(eq(noticesTable.id, id), eq(noticesTable.userId, userId)))
    .limit(1);

  return notice ? toNoticeRecord(notice) : null;
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
        eq(noticesTable.date, new Date(input.date)),
        eq(noticesTable.time, input.time),
        eq(noticesTable.title, input.title),
      ),
    )
    .limit(1);

  return notice ? toNoticeRecord(notice) : null;
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
        eq(noticesTable.date, new Date(input.date)),
        eq(noticesTable.title, input.title),
      ),
    )
    .orderBy(asc(noticesTable.id));

  return notices.map(toNoticeRecord);
};

export const createNotice = async (input: {
  userId: number;
  date: string;
  time: string;
  title: string;
  moreInfo: string;
  completed: boolean;
}) => {
  const [notice] = await db
    .insert(noticesTable)
    .values({ ...input, date: new Date(input.date) })
    .returning();

  return toNoticeRecord(notice);
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
    .set({ ...input, date: new Date(input.date) })
    .where(and(eq(noticesTable.id, id), eq(noticesTable.userId, userId)))
    .returning();

  return notice ? toNoticeRecord(notice) : null;
};

export const deleteNotice = async (id: number, userId: number) => {
  const [notice] = await db
    .delete(noticesTable)
    .where(and(eq(noticesTable.id, id), eq(noticesTable.userId, userId)))
    .returning();

  return notice ? toNoticeRecord(notice) : null;
};
