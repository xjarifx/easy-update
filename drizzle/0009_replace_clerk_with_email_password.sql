-- Migration to replace Clerk auth with email/password
-- This migration removes clerk_id and adds password_hash column

-- Add password_hash column with a default (temporary)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_hash" text NOT NULL DEFAULT '';

-- Drop the clerk_id column (only if it exists)
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns 
              WHERE table_name='users' AND column_name='clerk_id') THEN
        ALTER TABLE "users" DROP COLUMN "clerk_id";
    END IF;
END $$;

-- Remove the default from password_hash now that it's required
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP DEFAULT;
