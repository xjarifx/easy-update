import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const eventsTable = sqliteTable("events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  start: text("start").notNull(),
});

// Add more tables here as you design your database.
