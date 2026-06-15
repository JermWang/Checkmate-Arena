ALTER TABLE "matches" ALTER COLUMN "rake_bps" SET DEFAULT 200;--> statement-breakpoint
UPDATE "matches"
SET "rake_bps" = 200
WHERE "match_mode" IN ('wager_public', 'wager_private')
  AND "status" IN ('waiting', 'active')
  AND "rake_bps" = 400;
