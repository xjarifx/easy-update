ALTER TABLE "events" RENAME COLUMN "description" TO "title";--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "more_info" text NOT NULL DEFAULT '';--> statement-breakpoint