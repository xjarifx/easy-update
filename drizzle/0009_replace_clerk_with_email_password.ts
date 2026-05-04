import { sql } from "drizzle-orm";
import { pgTable, text, timestamp, serial, integer } from "drizzle-orm/pg-core";

// Migration to replace Clerk auth with email/password
// This drops the clerk_id column and adds password_hash column

export async function up(db: any) {
  // Add password_hash column
  await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash text NOT NULL DEFAULT ''`);
  
  // Drop the clerk_id column (this will fail if there are users, which is expected for fresh start)
  // For existing databases with Clerk users, you may need to preserve data
  try {
    await db.execute(sql`ALTER TABLE users DROP COLUMN IF EXISTS clerk_id`);
  } catch (e) {
    console.log("Could not drop clerk_id column, may not exist");
  }
  
  // Make password_hash NOT NULL after adding it
  // Remove the default after migration
  await db.execute(sql`ALTER TABLE users ALTER COLUMN password_hash DROP DEFAULT`);
}

export async function down(db: any) {
  // Rollback: add clerk_id back
  await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS clerk_id text UNIQUE`);
  await db.execute(sql`ALTER TABLE users DROP COLUMN IF EXISTS password_hash`);
}
