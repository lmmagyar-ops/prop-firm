
import Redis from "ioredis";
import * as dotenv from "dotenv";

dotenv.config();

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6380";
const redis = new Redis(REDIS_URL);

async function checkRedis() {
    const data = await redis.get("event:active_list");
    if (!data) {
        console.log("No data found in Redis.");
        return;
    }

    const events = JSON.parse(data);
    let foundIndividual = false;
    let foundDuplicate = false;

    events.forEach((event: any) => {
        const questions = new Set<string>();
        event.markets.forEach((m: any) => {
            if (m.question.includes("Individual ")) {
                console.log(`[FAIL] Found Individual: ${m.question}`);
                foundIndividual = true;
            }
            if (questions.has(m.question)) {
                console.log(`[FAIL] Found Duplicate: ${m.question}`);
                foundDuplicate = true;
            }
            questions.add(m.question);
        });
    });

    if (!foundIndividual && !foundDuplicate) {
        console.log("[PASS] Data is clean! No 'Individual' or Duplicates found.");
    } else {
        console.log("[FAIL] Data still dirty.");
    }

    redis.disconnect();
}

checkRedis();
