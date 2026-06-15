CREATE TYPE "public"."cheat_review_status" AS ENUM('clear', 'pending_review', 'flagged', 'confirmed_cheat');--> statement-breakpoint
CREATE TYPE "public"."epoch_status" AS ENUM('active', 'frozen', 'reviewing', 'paid', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."flag_severity" AS ENUM('low', 'medium', 'high', 'critical');--> statement-breakpoint
CREATE TYPE "public"."flag_status" AS ENUM('open', 'reviewed', 'dismissed', 'confirmed');--> statement-breakpoint
CREATE TYPE "public"."match_mode" AS ENUM('ranked', 'casual', 'wager_public', 'wager_private');--> statement-breakpoint
CREATE TYPE "public"."match_result" AS ENUM('checkmate', 'resignation', 'timeout', 'draw', 'disconnect', 'abandoned', 'admin_cancelled');--> statement-breakpoint
CREATE TYPE "public"."match_status" AS ENUM('waiting', 'active', 'completed', 'flagged', 'voided');--> statement-breakpoint
CREATE TYPE "public"."payout_status" AS ENUM('pending', 'paid', 'withheld', 'failed');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TABLE "admin_actions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"admin_wallet" varchar(255) NOT NULL,
	"action_type" varchar(100) NOT NULL,
	"target_wallet" varchar(255),
	"match_id" bigint,
	"epoch_id" bigint,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_flags" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"wallet_address" varchar(255) NOT NULL,
	"match_id" bigint,
	"epoch_id" bigint,
	"reason" text NOT NULL,
	"severity" "flag_severity" NOT NULL,
	"status" "flag_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "chess_players" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"wallet_address" varchar(255) NOT NULL,
	"username" varchar(255),
	"current_rating" integer DEFAULT 1000 NOT NULL,
	"daily_score" integer DEFAULT 0 NOT NULL,
	"lifetime_wins" integer DEFAULT 0 NOT NULL,
	"lifetime_losses" integer DEFAULT 0 NOT NULL,
	"lifetime_draws" integer DEFAULT 0 NOT NULL,
	"daily_wins" integer DEFAULT 0 NOT NULL,
	"daily_losses" integer DEFAULT 0 NOT NULL,
	"daily_draws" integer DEFAULT 0 NOT NULL,
	"current_streak" integer DEFAULT 0 NOT NULL,
	"cheat_score" integer DEFAULT 0 NOT NULL,
	"is_banned" boolean DEFAULT false NOT NULL,
	"games_played_today" integer DEFAULT 0 NOT NULL,
	"last_game_date" varchar(10),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "chess_players_wallet_address_unique" UNIQUE("wallet_address")
);
--> statement-breakpoint
CREATE TABLE "epoch_rewards" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"epoch_id" bigint NOT NULL,
	"wallet_address" varchar(255) NOT NULL,
	"rank" integer NOT NULL,
	"score" integer NOT NULL,
	"payout_percentage" numeric(5, 2) NOT NULL,
	"payout_amount" numeric(30, 9) NOT NULL,
	"payout_token" varchar(255) NOT NULL,
	"payout_status" "payout_status" DEFAULT 'pending' NOT NULL,
	"payout_tx" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "epochs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"starts_at" timestamp DEFAULT now() NOT NULL,
	"ends_at" timestamp NOT NULL,
	"reward_vault_start_balance" numeric(30, 9) DEFAULT '0' NOT NULL,
	"reward_vault_end_balance" numeric(30, 9) DEFAULT '0' NOT NULL,
	"total_creator_fees" numeric(30, 9) DEFAULT '0' NOT NULL,
	"leaderboard_reward_pool" numeric(30, 9) DEFAULT '0' NOT NULL,
	"treasury_amount" numeric(30, 9) DEFAULT '0' NOT NULL,
	"status" "epoch_status" DEFAULT 'active' NOT NULL,
	"payout_tx" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leaderboard_entries" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"wallet_address" varchar(255) NOT NULL,
	"epoch_id" bigint NOT NULL,
	"rating" integer NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"wins" integer DEFAULT 0 NOT NULL,
	"losses" integer DEFAULT 0 NOT NULL,
	"draws" integer DEFAULT 0 NOT NULL,
	"games_played" integer DEFAULT 0 NOT NULL,
	"rank" integer,
	"eligible_for_rewards" boolean DEFAULT false NOT NULL,
	"disqualified" boolean DEFAULT false NOT NULL,
	"disqualification_reason" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "match_moves" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"match_id" bigint NOT NULL,
	"move_number" integer NOT NULL,
	"wallet_address" varchar(255) NOT NULL,
	"san" varchar(10) NOT NULL,
	"from_square" varchar(2) NOT NULL,
	"to_square" varchar(2) NOT NULL,
	"promotion" varchar(1),
	"fen_after" text NOT NULL,
	"move_time_ms" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"white_wallet" varchar(255) NOT NULL,
	"black_wallet" varchar(255) NOT NULL,
	"winner_wallet" varchar(255),
	"loser_wallet" varchar(255),
	"result_type" "match_result" NOT NULL,
	"pgn" text,
	"move_history" jsonb NOT NULL,
	"white_rating_before" integer NOT NULL,
	"black_rating_before" integer NOT NULL,
	"white_rating_after" integer,
	"black_rating_after" integer,
	"white_score_delta" integer DEFAULT 0 NOT NULL,
	"black_score_delta" integer DEFAULT 0 NOT NULL,
	"status" "match_status" DEFAULT 'waiting' NOT NULL,
	"cheat_review_status" "cheat_review_status" DEFAULT 'clear' NOT NULL,
	"match_mode" "match_mode" DEFAULT 'ranked' NOT NULL,
	"stake_amount" bigint DEFAULT 0 NOT NULL,
	"stake_mint" varchar(255),
	"is_private" boolean DEFAULT false NOT NULL,
	"room_code" varchar(6),
	"room_password_hash" varchar(255),
	"allow_spectators" boolean DEFAULT true NOT NULL,
	"escrow_pda" varchar(255),
	"escrow_settle_sig" varchar(255),
	"rake_bps" integer DEFAULT 200 NOT NULL,
	"expires_at" timestamp,
	"started_at" timestamp,
	"ended_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "token_snapshots" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"wallet_address" varchar(255) NOT NULL,
	"token_mint" varchar(255) NOT NULL,
	"token_balance" numeric(20, 0) NOT NULL,
	"is_eligible" boolean NOT NULL,
	"checked_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"unionId" varchar(255) NOT NULL,
	"name" varchar(255),
	"email" varchar(320),
	"avatar" text,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignInAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_unionId_unique" UNIQUE("unionId")
);
--> statement-breakpoint
CREATE INDEX "admin_idx" ON "admin_actions" USING btree ("admin_wallet");--> statement-breakpoint
CREATE INDEX "action_created_idx" ON "admin_actions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "flag_wallet_idx" ON "admin_flags" USING btree ("wallet_address");--> statement-breakpoint
CREATE INDEX "flag_status_idx" ON "admin_flags" USING btree ("status");--> statement-breakpoint
CREATE INDEX "chess_wallet_idx" ON "chess_players" USING btree ("wallet_address");--> statement-breakpoint
CREATE INDEX "chess_rating_idx" ON "chess_players" USING btree ("current_rating");--> statement-breakpoint
CREATE INDEX "chess_daily_score_idx" ON "chess_players" USING btree ("daily_score");--> statement-breakpoint
CREATE INDEX "chess_banned_idx" ON "chess_players" USING btree ("is_banned");--> statement-breakpoint
CREATE INDEX "epoch_reward_idx" ON "epoch_rewards" USING btree ("epoch_id");--> statement-breakpoint
CREATE INDEX "reward_wallet_idx" ON "epoch_rewards" USING btree ("wallet_address");--> statement-breakpoint
CREATE INDEX "epoch_status_idx" ON "epochs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "epoch_wallet_idx" ON "leaderboard_entries" USING btree ("epoch_id","wallet_address");--> statement-breakpoint
CREATE INDEX "score_idx" ON "leaderboard_entries" USING btree ("epoch_id","score");--> statement-breakpoint
CREATE INDEX "match_move_idx" ON "match_moves" USING btree ("match_id");--> statement-breakpoint
CREATE INDEX "white_idx" ON "matches" USING btree ("white_wallet");--> statement-breakpoint
CREATE INDEX "black_idx" ON "matches" USING btree ("black_wallet");--> statement-breakpoint
CREATE INDEX "winner_idx" ON "matches" USING btree ("winner_wallet");--> statement-breakpoint
CREATE INDEX "status_idx" ON "matches" USING btree ("status");--> statement-breakpoint
CREATE INDEX "created_idx" ON "matches" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "match_mode_idx" ON "matches" USING btree ("match_mode");--> statement-breakpoint
CREATE INDEX "room_code_idx" ON "matches" USING btree ("room_code");--> statement-breakpoint
CREATE INDEX "wallet_checked_idx" ON "token_snapshots" USING btree ("wallet_address","checked_at");
