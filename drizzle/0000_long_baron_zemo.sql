CREATE TABLE "events" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"start" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notices" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" text NOT NULL,
	"time" text NOT NULL,
	"event" text NOT NULL
);
