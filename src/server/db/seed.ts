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
    title: "Team standup and sprint planning",
    moreInfo: "Share blockers and confirm sprint priorities.",
    completed: false,
  },
  {
    date: "2026-04-16",
    time: "14:30",
    title: "Client update call",
    moreInfo: "Walk through milestones and next steps.",
    completed: false,
  },
  {
    date: "2026-04-17",
    time: "10:15",
    title: "Database migration dry run",
    moreInfo: "Verify the schema change before release.",
    completed: false,
  },
  {
    date: "2026-04-18",
    time: "11:00",
    title: "Release checklist review",
    moreInfo: "Confirm ownership, rollout, and rollback items.",
    completed: false,
  },
  {
    date: "2026-04-19",
    time: "16:00",
    title: "Weekly project retrospective",
    moreInfo: "Capture wins, blockers, and action items.",
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
