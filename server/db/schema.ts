import { pgTable, serial, text } from "drizzle-orm/pg-core";

export const eventsTable = pgTable("events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  start: text("start").notNull(),
});

export const noticesTable = pgTable("notices", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(),
  time: text("time").notNull(),
  event: text("event").notNull(),
});

// Add more tables here as you design your database.
