ALTER TABLE "models" ADD COLUMN "last_seen_ok" timestamp;
ALTER TABLE "models" ADD COLUMN "last_seen_at" timestamp;
ALTER TABLE "models" ADD COLUMN "status" text DEFAULT 'unknown' NOT NULL;
