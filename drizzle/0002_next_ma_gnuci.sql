ALTER TABLE "events" ADD COLUMN "description" text;--> statement-breakpoint
UPDATE "events" SET "description" = "event";--> statement-breakpoint
ALTER TABLE "events" ALTER COLUMN "description" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "events" DROP COLUMN "event";