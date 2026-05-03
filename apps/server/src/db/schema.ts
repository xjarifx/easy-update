import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  clerkId: text("clerk_id").notNull().unique(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const noticesTable = pgTable(
  "events",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    date: text("date").notNull(),
    time: text("time").notNull(),
    title: text("title").notNull(),
    moreInfo: text("more_info").notNull().default(""),
    completed: boolean("completed").notNull().default(false),
  },
  (table) => ({
    userIdIdx: index("events_user_id_idx").on(table.userId),
  }),
);

export const userPreferencesTable = pgTable(
  "user_preferences",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .unique()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    dateFormat: text("date_format").notNull().default("DD-MMM-YYYY"),
    timeFormat: text("time_format").notNull().default("hh:mm AM/PM"),
    font: text("font").notNull().default("Inter"),
    firstDayOfWeek: integer("first_day_of_week").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdIdx: index("user_preferences_user_id_idx").on(table.userId),
    firstDayOfWeekRange: check(
      "user_preferences_first_day_of_week_check",
      sql`${table.firstDayOfWeek} BETWEEN 0 AND 6`,
    ),
  }),
);
