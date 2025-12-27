import "dotenv/config";
import { db } from "./index";
import { businessRules } from "./schema";

const DEFAULT_RULES = {
    "10k": {
        challenge_fees: 99,
        profit_target_percent: 0.10,      // 10%
        duration_days: 30,                // Minimum 5 days enforced elsewhere, max 30
        max_drawdown_percent: 0.08,       // 8% Static
        daily_loss_percent: 0.04,         // 4% Daily
        min_trades: 0,
        profit_split: 0.80,
        payout_frequency: "Bi-weekly"
    },
    // Same ratios for larger accounts
    "25k": {
        challenge_fees: 199,
        profit_target_percent: 0.10,
        duration_days: 30,
        max_drawdown_percent: 0.08,
        daily_loss_percent: 0.04,
        min_trades: 0,
        profit_split: 0.80,
        payout_frequency: "Bi-weekly"
    },
    "50k": {
        challenge_fees: 299,
        profit_target_percent: 0.10,
        duration_days: 30,
        max_drawdown_percent: 0.08,
        daily_loss_percent: 0.04,
        min_trades: 0,
        profit_split: 0.80,
        payout_frequency: "Bi-weekly"
    }
};

const RISK_RULES = {
    max_position_size_percent: 0.05,      // 5% per market
    max_category_exposure_percent: 0.10,  // 10% per category
    max_daily_loss_hard_stop: true,       // Hard breach
    consistency_rule_percent: 0.30,       // Max 30% profit from one day
    min_liquidity_usd: 100000,            // $100k min volume
    max_market_share_percent: 0.10,       // Max 10% of 24h volume
};

async function seed() {
    console.log("Seeding Business Rules...");

    // 1. Challenge Config
    await db.insert(businessRules).values({
        key: "challenge_config",
        description: "Configuration for challenge tiers (Phase 1)",
        value: DEFAULT_RULES,
        version: 2 // Bumped version
    }).onConflictDoUpdate({
        target: businessRules.key,
        set: { value: DEFAULT_RULES, version: 2 }
    });

    // 2. Risk Config
    await db.insert(businessRules).values({
        key: "risk_config",
        description: "Global risk management rules (v2)",
        value: RISK_RULES,
        version: 2
    }).onConflictDoUpdate({
        target: businessRules.key,
        set: { value: RISK_RULES, version: 2 }
    });

    console.log("Seeding Complete. Rules v2 Active.");
    process.exit(0);
}

seed().catch((err) => {
    console.error(err);
    process.exit(1);
});
