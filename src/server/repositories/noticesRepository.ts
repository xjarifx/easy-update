import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { noticesTable } from "../db/schema.js";
import type { NoticeRecord } from "../domain/types.js";

export const listNotices = async () => {
  const noticeOrderTimestamp = sql`
    COALESCE(
      CASE
        WHEN ${noticesTable.date} ~ '^\\d{4}-\\d{1,2}-\\d{1,2}$' THEN to_date(${noticesTable.date}, 'YYYY-MM-DD')::timestamp
        WHEN ${noticesTable.date} ~* '^\\d{1,2}-[A-Za-z]{3}-\\d{4}$' THEN to_date(${noticesTable.date}, 'DD-Mon-YYYY')::timestamp
        WHEN ${noticesTable.date} ~ '^\\d{1,2}/\\d{1,2}/\\d{4}$' THEN to_date(${noticesTable.date}, 'DD/MM/YYYY')::timestamp
        WHEN ${noticesTable.date} ~ '^\\d{4}/\\d{1,2}/\\d{1,2}$' THEN to_date(${noticesTable.date}, 'YYYY/MM/DD')::timestamp
        ELSE NULL
      END,
      to_timestamp('9999-12-31 00:00', 'YYYY-MM-DD HH24:MI')
    )
  `;

  return (await db
    .select()
    .from(noticesTable)
    .orderBy(noticeOrderTimestamp, asc(noticesTable.id))) as NoticeRecord[];
};

export const findNoticeById = async (id: number) => {
  const [notice] = await db
    .select()
    .from(noticesTable)
    .where(eq(noticesTable.id, id))
    .limit(1);

  return (notice as NoticeRecord | undefined) ?? null;
};

export const findNoticeByExactFields = async (input: {
  date: string;
  time: string;
  title: string;
}) => {
  const [notice] = await db
    .select()
    .from(noticesTable)
    .where(
      and(
        eq(noticesTable.date, input.date),
        eq(noticesTable.time, input.time),
        eq(noticesTable.title, input.title),
      ),
    )
    .limit(1);

  return (notice as NoticeRecord | undefined) ?? null;
};

export const createNotice = async (input: {
  date: string;
  time: string;
  title: string;
  moreInfo: string;
  completed: boolean;
}) => {
  const [notice] = await db.insert(noticesTable).values(input).returning();

  return notice as NoticeRecord;
};

export const createManyNotices = async (
  values: Array<{
    date: string;
    time: string;
    title: string;
    moreInfo: string;
    completed: boolean;
  }>,
) => {
  if (values.length === 0) {
    return [] as NoticeRecord[];
  }

  const inserted = await db.insert(noticesTable).values(values).returning();

  return inserted as NoticeRecord[];
};

export const updateNotice = async (
  id: number,
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
    .where(eq(noticesTable.id, id))
    .returning();

  return (notice as NoticeRecord | undefined) ?? null;
};

export const deleteNotice = async (id: number) => {
  const [notice] = await db
    .delete(noticesTable)
    .where(eq(noticesTable.id, id))
    .returning();

  return (notice as NoticeRecord | undefined) ?? null;
};
