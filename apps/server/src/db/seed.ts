import "dotenv/config";
import { eq } from "drizzle-orm";
import { noticesTable, usersTable } from "./schema.js";
import { db } from "./index.js";

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

const seed = async () => {
  try {
    const demoEmail = "demo@easy-update.local";
    const [existingDemoUser] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, demoEmail))
      .limit(1);

    let demoUserId = existingDemoUser?.id;

    if (!demoUserId) {
        const [createdDemoUser] = await db
          .insert(usersTable)
          .values({
            clerkId: `seed_${demoEmail}`,
            email: demoEmail,
          })
          .returning({ id: usersTable.id });

        demoUserId = createdDemoUser.id;
      }

    const inserted = await db
      .insert(noticesTable)
      .values(
        demoNotices.map((notice) => ({
          ...notice,
          userId: demoUserId,
        })),
      )
      .returning();

    console.log(`Seed complete: inserted ${inserted.length} demo notices.`);
  } catch (error) {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  }
};

seed().catch((error) => {
  console.error("Seed failed:", error);
  process.exitCode = 1;
});
