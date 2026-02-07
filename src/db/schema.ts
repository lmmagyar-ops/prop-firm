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

    // Auth Fields
    passwordHash: text("password_hash"), // bcrypt hashed password for email/password auth
    role: varchar("role", { length: 20 }).default("user"), // 'user' | 'admin'
    isActive: boolean("is_active").default(true), // For account suspension
    agreedToTermsAt: timestamp("agreed_to_terms_at", { mode: "date" }), // TOS compliance tracking

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

    // Social Visibility (for public profile)
    twitterPublic: boolean("twitter_public").default(true),
    discordPublic: boolean("discord_public").default(true),
    telegramPublic: boolean("telegram_public").default(true),
    instagramPublic: boolean("instagram_public").default(true),
    facebookPublic: boolean("facebook_public").default(true),

    // Profile Customization
    tradingBio: text("trading_bio"),
    tradingStyle: text("trading_style"), // "Day Trader", "Swing Trader", "Scalper"
    favoriteMarkets: text("favorite_markets"), // "Crypto, Forex, Politics"

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

    // Security Enhancements
    emailVerifiedStatus: boolean("email_verified_status").default(false), // Manual verification flag
    twoFactorEnabled: boolean("two_factor_enabled").default(false),

    // Privacy Controls
    leaderboardPrivacy: varchar("leaderboard_privacy", { length: 20 }).default("semi_private"), // 'public', 'semi_private', 'fully_private'
    showCountry: boolean("show_country").default(false),
    showStatsPublicly: boolean("show_stats_publicly").default(true),
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

    // Trading platform selection (Polymarket or Kalshi)
    platform: varchar("platform", { length: 20 }).notNull().default("polymarket"), // 'polymarket' | 'kalshi'

    startedAt: timestamp("started_at").defaultNow(),
    endsAt: timestamp("ends_at"),

    // Security Hardening (Phase 11)
    pendingFailureAt: timestamp("pending_failure_at"), // Delay before final failure decision
    lastDailyResetAt: timestamp("last_daily_reset_at"), // Idempotency for daily reset

    // Profile Visibility
    isPublicOnProfile: boolean("is_public_on_profile").default(true),
    showDropdownOnProfile: boolean("show_dropdown_on_profile").default(true),

    // Funded Stage Fields
    profitSplit: decimal("profit_split", { precision: 4, scale: 2 }).default("0.80"), // 80% default, 90% with add-on
    payoutCap: decimal("payout_cap", { precision: 12, scale: 2 }), // Max payout per cycle (= starting balance)
    lastPayoutAt: timestamp("last_payout_at"), // For payout cycle tracking
    totalPaidOut: decimal("total_paid_out", { precision: 12, scale: 2 }).default("0"), // Lifetime payouts
    activeTradingDays: integer("active_trading_days").default(0), // Trading days in current cycle
    consistencyFlagged: boolean("consistency_flagged").default(false), // Soft flag for >50% single-day profit
    lastActivityAt: timestamp("last_activity_at"), // For inactivity detection (30-day termination)
    payoutCycleStart: timestamp("payout_cycle_start"), // Start of current payout period
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
    closedPrice: decimal("closed_price", { precision: 10, scale: 4 }), // Price at which position was closed
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
    realizedPnL: decimal("realized_pnl", { precision: 12, scale: 2 }), // P&L for SELL trades

    executedAt: timestamp("executed_at").defaultNow(),
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
    challengeId: uuid("challenge_id").references(() => challenges.id), // Link to funded challenge
    amount: decimal("amount", { precision: 10, scale: 2 }).notNull(), // Net payout amount (after split)
    network: text("network").notNull(), // 'ERC20', 'POLYGON', 'SOLANA'
    walletAddress: text("wallet_address").notNull(),
    status: text("status").notNull().default("pending"), // pending, approved, processing, completed, failed
    requestedAt: timestamp("requested_at").notNull().defaultNow(),
    processedAt: timestamp("processed_at"),
    transactionHash: text("transaction_hash"),
    failureReason: text("failure_reason"),
    approvedBy: text("approved_by"), // Admin user ID

    // Payout Calculation Details
    cycleStart: timestamp("cycle_start"), // Payout period start
    cycleEnd: timestamp("cycle_end"),     // Payout period end
    grossProfit: decimal("gross_profit", { precision: 12, scale: 2 }), // Total profit before split
    excludedPnl: decimal("excluded_pnl", { precision: 12, scale: 2 }).default("0"), // Resolution events excluded
    profitSplit: decimal("profit_split", { precision: 4, scale: 2 }), // Split % at time of request

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

// --- Security Enhancement Tables ---

export const user2FA = pgTable("user_2fa", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
    secret: text("secret").notNull(), // Base32 encoded secret for TOTP
    backupCodes: jsonb("backup_codes"), // Array of hashed backup codes
    enabled: boolean("enabled").default(false),
    createdAt: timestamp("created_at").defaultNow(),
    lastUsedAt: timestamp("last_used_at"),
});

export const payoutMethods = pgTable("payout_methods", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 20 }).notNull(), // 'crypto', 'paypal'
    provider: varchar("provider", { length: 50 }), // 'confirmo', 'paypal', 'moonpay'
    label: text("label"), // User-friendly name like "My Main Wallet"
    details: jsonb("details").notNull(), // { walletAddress, network } or { email }
    isDefault: boolean("is_default").default(false),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

export const activityLogs = pgTable("activity_logs", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    action: varchar("action", { length: 50 }).notNull(), // 'login', 'password_change', 'trade', '2fa_enabled', etc.
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    location: text("location"), // Optional: city/country derived from IP
    metadata: jsonb("metadata"), // Additional context (e.g., device type, browser)
    createdAt: timestamp("created_at").defaultNow(),
});

// --- Discount Codes & Affiliate Program ---

export const discountCodes = pgTable("discount_codes", {
    id: uuid("id").defaultRandom().primaryKey(),
    code: varchar("code", { length: 50 }).unique().notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),

    // Discount configuration
    type: varchar("type", { length: 20 }).notNull(), // 'percentage', 'fixed_amount', 'tiered'
    value: decimal("value", { precision: 10, scale: 2 }).notNull(), // Percentage (e.g., 25.00) or dollar amount

    // Eligibility
    eligibleTiers: jsonb("eligible_tiers"), // ['5k', '10k', '25k'] or null for all
    newCustomersOnly: boolean("new_customers_only").default(false),
    minPurchaseAmount: decimal("min_purchase_amount", { precision: 10, scale: 2 }),

    // Validity
    active: boolean("active").default(true),
    validFrom: timestamp("valid_from").notNull(),
    validUntil: timestamp("valid_until"),

    // Usage limits
    maxTotalUses: integer("max_total_uses"), // null = unlimited
    maxUsesPerUser: integer("max_uses_per_user").default(1),
    currentUses: integer("current_uses").default(0),

    // Stacking
    stackable: boolean("stackable").default(false),

    // Metadata
    createdBy: text("created_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),

    // Analytics tags
    campaignName: varchar("campaign_name", { length: 100 }),
    source: varchar("source", { length: 50 }), // 'email', 'social', 'partner', 'referral'
});

export const discountRedemptions = pgTable("discount_redemptions", {
    id: uuid("id").defaultRandom().primaryKey(),
    discountCodeId: uuid("discount_code_id").notNull().references(() => discountCodes.id),
    userId: text("user_id").notNull().references(() => users.id),
    challengeId: uuid("challenge_id").references(() => challenges.id),

    // Financial impact
    originalPrice: decimal("original_price", { precision: 10, scale: 2 }).notNull(),
    discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).notNull(),
    finalPrice: decimal("final_price", { precision: 10, scale: 2 }).notNull(),

    // Metadata
    redeemedAt: timestamp("redeemed_at").defaultNow(),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
});

export const affiliates = pgTable("affiliates", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").references(() => users.id),

    // Tier management
    tier: integer("tier").notNull(), // 1, 2, 3
    status: varchar("status", { length: 20 }).notNull(), // 'pending', 'active', 'suspended', 'rejected'

    // Application data (Tier 2+)
    applicationData: jsonb("application_data"), // {website, socialLinks, audienceSize, strategy}
    approvedBy: text("approved_by").references(() => users.id),
    approvedAt: timestamp("approved_at"),

    // Commission settings
    commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }).notNull(), // e.g., 15.00 for 15%
    lifetimeValueRate: decimal("lifetime_value_rate", { precision: 5, scale: 2 }).default("5.00"),

    // Referral tracking
    referralCode: varchar("referral_code", { length: 50 }).unique().notNull(),
    referralLink: text("referral_link").notNull(),

    // Limits (Tier 1)
    monthlyEarningCap: decimal("monthly_earning_cap", { precision: 10, scale: 2 }),

    // Contact
    payoutMethod: varchar("payout_method", { length: 20 }), // 'paypal', 'stripe', 'wire'
    payoutDetails: jsonb("payout_details"),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

export const affiliateReferrals = pgTable("affiliate_referrals", {
    id: uuid("id").defaultRandom().primaryKey(),
    affiliateId: uuid("affiliate_id").notNull().references(() => affiliates.id),
    userId: text("user_id").references(() => users.id), // Referred user

    // Tracking
    clickTimestamp: timestamp("click_timestamp"),
    signupTimestamp: timestamp("signup_timestamp"),
    purchaseTimestamp: timestamp("purchase_timestamp"),

    // Attribution
    source: varchar("source", { length: 50 }), // 'link', 'code', 'both'
    discountCodeId: uuid("discount_code_id").references(() => discountCodes.id),

    // Financial
    purchaseAmount: decimal("purchase_amount", { precision: 10, scale: 2 }),
    commissionEarned: decimal("commission_earned", { precision: 10, scale: 2 }),
    commissionPaid: boolean("commission_paid").default(false),
    payoutId: uuid("payout_id"),

    // Analytics
    referrerUrl: text("referrer_url"),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
});

export const affiliatePayouts = pgTable("affiliate_payouts", {
    id: uuid("id").defaultRandom().primaryKey(),
    affiliateId: uuid("affiliate_id").notNull().references(() => affiliates.id),

    amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
    periodStart: timestamp("period_start").notNull(),
    periodEnd: timestamp("period_end").notNull(),

    status: varchar("status", { length: 20 }).notNull(), // 'pending', 'processing', 'paid', 'failed'
    paymentMethod: varchar("payment_method", { length: 20 }),
    transactionId: varchar("transaction_id", { length: 100 }),

    createdAt: timestamp("created_at").defaultNow(),
    paidAt: timestamp("paid_at"),
});

