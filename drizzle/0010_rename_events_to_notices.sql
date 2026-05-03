ALTER TABLE "events" RENAME TO "notices";
ALTER INDEX "events_user_id_idx" RENAME TO "notices_user_id_idx";
