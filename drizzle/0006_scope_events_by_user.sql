ALTER TABLE "events" ADD COLUMN "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE;
CREATE INDEX "events_user_id_idx" ON "events" ("user_id");
