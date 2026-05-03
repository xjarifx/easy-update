ALTER TABLE "users" ADD COLUMN "clerk_id" text NOT NULL UNIQUE;
ALTER TABLE "users" DROP COLUMN "password_hash";
