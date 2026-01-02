ALTER TABLE "challenges" ADD COLUMN "profit_split" numeric(4, 2) DEFAULT '0.80';--> statement-breakpoint
ALTER TABLE "challenges" ADD COLUMN "payout_cap" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "challenges" ADD COLUMN "last_payout_at" timestamp;--> statement-breakpoint
ALTER TABLE "challenges" ADD COLUMN "total_paid_out" numeric(12, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "challenges" ADD COLUMN "active_trading_days" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "challenges" ADD COLUMN "consistency_flagged" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "challenges" ADD COLUMN "last_activity_at" timestamp;--> statement-breakpoint
ALTER TABLE "challenges" ADD COLUMN "payout_cycle_start" timestamp;--> statement-breakpoint
ALTER TABLE "payouts" ADD COLUMN "challenge_id" uuid;--> statement-breakpoint
ALTER TABLE "payouts" ADD COLUMN "cycle_start" timestamp;--> statement-breakpoint
ALTER TABLE "payouts" ADD COLUMN "cycle_end" timestamp;--> statement-breakpoint
ALTER TABLE "payouts" ADD COLUMN "gross_profit" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "payouts" ADD COLUMN "excluded_pnl" numeric(12, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "payouts" ADD COLUMN "profit_split" numeric(4, 2);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_hash" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" varchar(20) DEFAULT 'user';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_active" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "agreed_to_terms_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "twitter_public" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "discord_public" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "telegram_public" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "trading_bio" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "trading_style" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "favorite_markets" text;--> statement-breakpoint
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE no action ON UPDATE no action;