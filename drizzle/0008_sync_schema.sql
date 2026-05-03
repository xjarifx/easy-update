-- Add clerk_id column to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "clerk_id" text NOT NULL UNIQUE DEFAULT '';

-- Drop password_hash column from users table
ALTER TABLE "users" DROP COLUMN IF EXISTS "password_hash";

-- Rename created_at to createdAt if needed (check if column exists)
-- Note: Drizzle ORM expects "createdAt" but DB has "created_at"
-- This rename might cause issues with Drizzle, so we'll keep as is and update schema

-- Ensure events table has userId index
CREATE INDEX IF NOT EXISTS "events_user_id_idx" ON "events" ("user_id");

-- Update users table to set default for clerk_id to empty string for existing rows
UPDATE "users" SET "clerk_id" = 'temp_' || id WHERE "clerk_id" = '';
