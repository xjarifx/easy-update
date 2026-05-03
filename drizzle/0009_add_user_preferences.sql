CREATE TABLE IF NOT EXISTS "user_preferences" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "date_format" text DEFAULT 'DD-MMM-YYYY' NOT NULL,
  "time_format" text DEFAULT 'hh:mm AM/PM' NOT NULL,
  "font" text DEFAULT 'Inter' NOT NULL,
  "first_day_of_week" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "user_preferences_user_id_unique" UNIQUE("user_id"),
  CONSTRAINT "user_preferences_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade,
  CONSTRAINT "user_preferences_first_day_of_week_check"
    CHECK ("first_day_of_week" BETWEEN 0 AND 6)
);

CREATE INDEX IF NOT EXISTS "user_preferences_user_id_idx"
  ON "user_preferences" ("user_id");
