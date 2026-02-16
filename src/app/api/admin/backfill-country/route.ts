import { db } from "@/db";
import { users } from "@/db/schema";
import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { isNull, isNotNull, eq } from "drizzle-orm";

/** Same mapping as settings-actions.ts — kept local to avoid coupling */
const COUNTRY_ISO: Record<string, string> = {
    "United States": "US",
    "Canada": "CA",
    "United Kingdom": "GB",
    "Germany": "DE",
    "France": "FR",
    "Australia": "AU",
    "Japan": "JP",
    "Brazil": "BR",
    "Italy": "IT",
    "Spain": "ES",
    "Netherlands": "NL",
    "Sweden": "SE",
    "Norway": "NO",
    "Finland": "FI",
    "South Korea": "KR",
    "Mexico": "MX",
    "India": "IN",
    "Poland": "PL",
    "Argentina": "AR",
};

/**
 * One-time backfill: populate `country` (ISO code) from `addressCountry` (full name)
 * for users who have addressCountry set but country is null.
 * DELETE THIS ROUTE AFTER RUNNING.
 */
export async function POST() {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch users with addressCountry set but country missing
    const targetUsers = await db
        .select({
            id: users.id,
            name: users.name,
            addressCountry: users.addressCountry,
            country: users.country,
        })
        .from(users)
        .where(isNotNull(users.addressCountry));

    const results: { id: string; name: string | null; from: string; to: string | null; action: string }[] = [];

    for (const user of targetUsers) {
        const iso = COUNTRY_ISO[user.addressCountry!] || null;

        if (user.country && user.country === iso) {
            results.push({ id: user.id, name: user.name, from: user.addressCountry!, to: iso, action: "already_correct" });
            continue;
        }

        if (user.country && user.country !== iso) {
            // country is set but doesn't match the mapping — skip to avoid overwriting manual DB entries
            results.push({ id: user.id, name: user.name, from: user.addressCountry!, to: user.country, action: "skipped_mismatch" });
            continue;
        }

        if (!iso) {
            results.push({ id: user.id, name: user.name, from: user.addressCountry!, to: null, action: "no_mapping" });
            continue;
        }

        // country is null, we have a valid ISO mapping — backfill
        await db.update(users).set({ country: iso }).where(eq(users.id, user.id));
        results.push({ id: user.id, name: user.name, from: user.addressCountry!, to: iso, action: "backfilled" });
    }

    // Also check users who have country set but no addressCountry (manually set in DB)
    const manualUsers = await db
        .select({
            id: users.id,
            name: users.name,
            country: users.country,
            addressCountry: users.addressCountry,
        })
        .from(users)
        .where(isNull(users.addressCountry));

    for (const user of manualUsers) {
        if (user.country) {
            results.push({ id: user.id, name: user.name, from: "(no addressCountry)", to: user.country, action: "manual_db_entry" });
        }
    }

    return NextResponse.json({
        message: "Backfill complete",
        totalProcessed: results.length,
        backfilled: results.filter(r => r.action === "backfilled").length,
        skipped: results.filter(r => r.action !== "backfilled").length,
        details: results,
    });
}
