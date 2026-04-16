CREATE TABLE "events" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" text NOT NULL,
	"time" text NOT NULL,
	"event" text NOT NULL
);
--> statement-breakpoint
DROP TABLE "notices" CASCADE;