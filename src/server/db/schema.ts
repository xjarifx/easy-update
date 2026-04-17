import { boolean, pgTable, serial, text } from "drizzle-orm/pg-core";

export const noticesTable = pgTable("events", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(),
  time: text("time").notNull(),
  description: text("description").notNull(),
  completed: boolean("completed").notNull().default(false),
});

// Add more tables here as you design your database.
