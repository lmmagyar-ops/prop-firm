import { db } from "./index";
import { businessRules } from "./schema";
import { v4 as uuidv4 } from "uuid";

const DEFAULT_RULES = {
    "10k": {
        challenge_fees: 99,
        profit_target_percent: 0.08,
        duration_days: 30,
        max_drawdown_percent: 0.10,
        daily_loss_percent: 0.05,
        min_trades: 5,
        profit_split: 0.70,
        payout_frequency: "Monthly"
    },
    "25k": {
        challenge_fees: 199,
        profit_target_percent: 0.08,
        duration_days: 30,
        max_drawdown_percent: 0.10,
        daily_loss_percent: 0.05,
        min_trades: 5,
        profit_split: 0.70,
        payout_frequency: "Monthly"
    }
    // Add more tiers as needed
};

const RISK_RULES = {
    max_position_size_percent: 0.20,
    max_category_exposure_percent: 0.50,
    trading_blackout_days_before_end: 2,
    prohibited_categories: ["Politics", "Crypto"],
    min_liquidity_usd: 1000
};

async function seed() {
    console.log("Seeding Business Rules...");

    // 1. Challenge Config
    await db.insert(businessRules).values({
        key: "challenge_config",
        description: "Configuration for all challenge tiers",
        value: DEFAULT_RULES,
        version: 1
    }).onConflictDoNothing();

    // 2. Risk Config
    await db.insert(businessRules).values({
        key: "risk_config",
        description: "Global risk management rules",
        value: RISK_RULES,
        version: 1
    }).onConflictDoNothing();

    console.log("Seeding Complete.");
    process.exit(0);
}

seed().catch((err) => {
    console.error(err);
    process.exit(1);
});
