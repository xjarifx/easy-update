import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { noticesTable } from "./schema.js";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for seeding");
}

const demoNotices = [
  {
    date: "2026-04-16",
    time: "09:00",
    description: "Team standup and sprint planning",
    completed: false,
  },
  {
    date: "2026-04-16",
    time: "14:30",
    description: "Client update call",
    completed: false,
  },
  {
    date: "2026-04-17",
    time: "10:15",
    description: "Database migration dry run",
    completed: false,
  },
  {
    date: "2026-04-18",
    time: "11:00",
    description: "Release checklist review",
    completed: false,
  },
  {
    date: "2026-04-19",
    time: "16:00",
    description: "Weekly project retrospective",
    completed: false,
  },
];

const normalizedDatabaseUrl = (() => {
  const url = new URL(databaseUrl);
  url.searchParams.delete("sslmode");

  return url.toString();
})();

const seed = async () => {
  const pool = new Pool({
    connectionString: normalizedDatabaseUrl,
    ssl: { rejectUnauthorized: false },
  });
  const db = drizzle(pool);

  try {
    const inserted = await db
      .insert(noticesTable)
      .values(demoNotices)
      .returning();

    console.log(`Seed complete: inserted ${inserted.length} demo notices.`);
  } finally {
    await pool.end();
  }
};

seed().catch((error) => {
  console.error("Seed failed:", error);
  process.exitCode = 1;
});
