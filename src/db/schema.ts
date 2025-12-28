import {
    pgTable,
    text,
    timestamp,
    decimal,
    integer,
    boolean,
    jsonb,
    varchar,
    primaryKey,
    uuid,
} from "drizzle-orm/pg-core";
import type { AdapterAccount } from "next-auth/adapters";
import { sql } from "drizzle-orm"; // For defaultRandom if needed or just use built-in function

// --- NextAuth Tables ---
export const users = pgTable("users", {
    id: text("id")
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    name: text("name"),
    email: text("email").notNull(),
    emailVerified: timestamp("emailVerified", { mode: "date" }),
    image: text("image"),
    username: text("username").unique(),
    displayName: text("display_name"),
    country: text("country"), // Reverted .notNull() due to existing data issues
    verificationCode: text("verification_code"), // 2 digits for anti-phishing
    verificationCodeExpiry: timestamp("verification_code_expiry", { mode: "date" }),
    xp: integer("xp").default(0),
    level: integer("level").default(1),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at").defaultNow(),

    // Profile Fields
    showOnLeaderboard: boolean("show_on_leaderboard").default(false),

    // Socials
    twitter: text("twitter"),
    discord: text("discord"),
    telegram: text("telegram"),
    facebook: text("facebook"),
    tiktok: text("tiktok"),
    instagram: text("instagram"),
    youtube: text("youtube"),

    // Personal Info
    firstName: text("first_name"),
    lastName: text("last_name"),
    krakenId: text("kraken_id"),

    // KYC
    kycStatus: varchar("kyc_status", { length: 20 }).default("not_started"), // not_started, in_progress, under_review, approved, rejected
    kycApprovedAt: timestamp("kyc_approved_at"),
    sumsubApplicantId: text("sumsub_applicant_id"),

    // Address
    addressStreet: text("address_street"),
    addressApartment: text("address_apartment"),
    addressCity: text("address_city"),
    addressState: text("address_state"),
    addressZip: text("address_zip"),
    addressCountry: text("address_country"),
});

export const accounts = pgTable(
    "account",
    {
        userId: text("userId")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        type: text("type").$type<AdapterAccount["type"]>().notNull(),
        provider: text("provider").notNull(),
        providerAccountId: text("providerAccountId").notNull(),
        refresh_token: text("refresh_token"),
        access_token: text("access_token"),
        expires_at: integer("expires_at"),
        token_type: text("token_type"),
        scope: text("scope"),
        id_token: text("id_token"),
        session_state: text("session_state"),
    },
    (account) => ({
        compoundKey: primaryKey({
            columns: [account.provider, account.providerAccountId],
        }),
    })
);

export const sessions = pgTable("session", {
    sessionToken: text("sessionToken").primaryKey(),
    userId: text("userId")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
    "verificationToken",
    {
        identifier: text("identifier").notNull(),
        token: text("token").notNull(),
        expires: timestamp("expires", { mode: "date" }).notNull(),
    },
    (vt) => ({
        compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
    })
);

// --- Prop Firm Tables ---

export const challenges = pgTable("challenges", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
    phase: varchar("phase", { length: 20 }).notNull(), // 'challenge', 'verification', 'funded'
    status: varchar("status", { length: 20 }).notNull(), // 'active', 'failed', 'passed'

    startingBalance: decimal("starting_balance", { precision: 12, scale: 2 }).notNull(),
    startOfDayBalance: decimal("start_of_day_balance", { precision: 12, scale: 2 }).default("10000.00"), // Snapshot at 00:00 UTC
    currentBalance: decimal("current_balance", { precision: 12, scale: 2 }).notNull(),
    highWaterMark: decimal("high_water_mark", { precision: 12, scale: 2 }), // For max drawdown calc

    // Snapshotted rules at time of creation
    rulesConfig: jsonb("rules_config").notNull(),

    startedAt: timestamp("started_at").defaultNow(),
    endsAt: timestamp("ends_at"),

    // Security Hardening (Phase 11)
    pendingFailureAt: timestamp("pending_failure_at"), // Delay before final failure decision
    lastDailyResetAt: timestamp("last_daily_reset_at"), // Idempotency for daily reset

    // Profile Visibility
    isPublicOnProfile: boolean("is_public_on_profile").default(true),
    showDropdownOnProfile: boolean("show_dropdown_on_profile").default(true),
});

export const positions = pgTable("positions", {
    id: uuid("id").defaultRandom().primaryKey(),
    challengeId: uuid("challenge_id").references(() => challenges.id, { onDelete: "cascade" }),
    marketId: text("market_id").notNull(), // Polymarket/Kalshi Market ID
    direction: varchar("direction", { length: 10 }).notNull(), // 'YES', 'NO'

    sizeAmount: decimal("size_amount", { precision: 12, scale: 2 }).notNull(), // Cash invested
    shares: decimal("shares", { precision: 12, scale: 2 }).notNull(), // Quantity of tokens
    entryPrice: decimal("entry_price", { precision: 10, scale: 4 }).notNull(),
    currentPrice: decimal("current_price", { precision: 10, scale: 4 }), // Last known price (for fast PnL)

    status: varchar("status", { length: 20 }).default("OPEN"), // 'OPEN', 'CLOSED'
    pnl: decimal("pnl", { precision: 12, scale: 2 }).default("0"),

    // Velocity / Carry Cost Tracking
    lastFeeChargedAt: timestamp("last_fee_charged_at"),
    feesPaid: decimal("fees_paid", { precision: 12, scale: 2 }).default("0"),

    openedAt: timestamp("opened_at").defaultNow(),
    closedAt: timestamp("closed_at"),
});

export const trades = pgTable("trades", {
    id: uuid("id").defaultRandom().primaryKey(),
    positionId: uuid("position_id").references(() => positions.id),
    challengeId: uuid("challenge_id").references(() => challenges.id),
    marketId: text("market_id").notNull(),

    type: varchar("type", { length: 10 }).notNull(), // 'BUY', 'SELL'
    price: decimal("price", { precision: 10, scale: 4 }).notNull(),
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    shares: decimal("shares", { precision: 12, scale: 2 }).notNull(),

    executedAt: timestamp("executed_at").defaultNow(),
});

export const marketPrices = pgTable("market_prices", {
    id: uuid("id").defaultRandom().primaryKey(),
    marketId: text("market_id").notNull(),
    platform: varchar("platform", { length: 50 }).notNull(), // 'polymarket', 'kalshi'

    priceYes: decimal("price_yes", { precision: 10, scale: 4 }),
    priceNo: decimal("price_no", { precision: 10, scale: 4 }),

    liquidity: decimal("liquidity", { precision: 15, scale: 2 }),

    timestamp: timestamp("timestamp").defaultNow(),
});

export const businessRules = pgTable("business_rules", {
    id: uuid("id").defaultRandom().primaryKey(),
    key: text("key").unique().notNull(), // e.g. '10k_challenge_config'
    description: text("description"),
    value: jsonb("value").notNull(),
    version: integer("version").default(1),
    updatedAt: timestamp("updated_at").defaultNow(),
});

export const auditLogs = pgTable("audit_logs", {
    id: uuid("id").defaultRandom().primaryKey(),
    adminId: text("admin_id").notNull(), // User ID of the admin
    action: varchar("action", { length: 50 }).notNull(), // 'UPDATE_RULES', 'FAIL_USER', etc.
    targetId: text("target_id"), // ID of the object being modified (e.g. valid rule ID or challenge ID)
    details: jsonb("details").notNull(), // Before/After snapshot or other metadata
    ipAddress: varchar("ip_address", { length: 45 }),
    createdAt: timestamp("created_at").defaultNow(),
});

export const certificates = pgTable("certificates", {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id),
    type: text("type").notNull(), // 'lifetime-payouts' | 'funded-trader' | 'payout'
    amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
    challengeId: uuid("challenge_id").references(() => challenges.id),
    issuedAt: timestamp("issued_at").notNull().defaultNow(),
    shareCount: integer("share_count").default(0),
    downloadCount: integer("download_count").default(0),
    metadata: jsonb("metadata"), // Additional data like signature, custom text
});

export const badges = pgTable("badges", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    icon: text("icon").notNull(), // Icon name or URL
    requirement: text("requirement").notNull(), // Description of how to earn
});

export const userBadges = pgTable("user_badges", {
    userId: text("user_id").notNull().references(() => users.id),
    badgeId: text("badge_id").notNull().references(() => badges.id),
    earnedAt: timestamp("earned_at").notNull().defaultNow(),
});

export const payouts = pgTable("payouts", {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id),
    amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
    network: text("network").notNull(), // 'ERC20', 'POLYGON', 'SOLANA'
    walletAddress: text("wallet_address").notNull(),
    status: text("status").notNull().default("pending"), // pending, processing, completed, failed
    requestedAt: timestamp("requested_at").notNull().defaultNow(),
    processedAt: timestamp("processed_at"),
    transactionHash: text("transaction_hash"),
    failureReason: text("failure_reason"),
    approvedBy: text("approved_by"), // Admin user ID
    metadata: jsonb("metadata"), // Gas fees, exchange rate, etc.
});

export const leaderboardSeasons = pgTable("leaderboard_seasons", {
    id: text("id").primaryKey(),
    name: text("name").notNull(), // "Season 12: December"
    startDate: timestamp("start_date").notNull(),
    endDate: timestamp("end_date").notNull(),
    isActive: boolean("is_active").default(false),
});

export const leaderboardEntries = pgTable("leaderboard_entries", {
    id: text("id").primaryKey(),
    seasonId: text("season_id").notNull().references(() => leaderboardSeasons.id),
    userId: text("user_id").notNull().references(() => users.id),
    tradingVolume: decimal("trading_volume", { precision: 15, scale: 2 }).notNull(),
    totalProfit: decimal("total_profit", { precision: 15, scale: 2 }).notNull(),
    volumeRank: integer("volume_rank"),
    profitRank: integer("profit_rank"),
    lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});
