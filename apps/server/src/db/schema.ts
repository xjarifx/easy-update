import {
  boolean,
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

// Add more tables here as you design your database.
