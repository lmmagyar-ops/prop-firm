import { db } from "@/db";
import { businessRules, auditLogs } from "@/db/schema"; // users table might be needed for admin ID validation if we had auth
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/auth"; // Assuming auth setup is standard NextAuth

import { requireAdmin } from "@/lib/admin-auth";
import { createLogger } from "@/lib/logger";
const logger = createLogger("Rules");

export async function GET() {
    const { isAuthorized, response } = await requireAdmin();
    if (!isAuthorized) return response;

    try {
        const rules = await db.select().from(businessRules);

        // Transform array into a keyed object for easier frontend consumption
        // { "challenge_config": { ... }, "risk_config": { ... } }
        const configMap: Record<string, unknown> = {};
        rules.forEach(r => {
            configMap[r.key] = {
                ...r.value as object,
                _meta: { // metadata for UI
                    description: r.description,
                    version: r.version,
                    updatedAt: r.updatedAt
                }
            };
        });

        return NextResponse.json({ rules: configMap });
    } catch (error) {
        logger.error("Fetch Rules Error:", error);
        return NextResponse.json({ error: "Failed to fetch rules" }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    const { isAuthorized, response } = await requireAdmin();
    if (!isAuthorized) return response;

    try {
        const session = await auth();
        // Fallback for dev/demo if no auth
        const adminId = session?.user?.email || "admin-user";

        const { key, value, description } = await req.json();

        if (!key || !value) {
            return NextResponse.json({ error: "Missing key or value" }, { status: 400 });
        }

        // 1. Fetch current rule for audit log (Old Value)
        const currentRule = await db.query.businessRules.findFirst({
            where: eq(businessRules.key, key)
        });

        if (!currentRule) {
            return NextResponse.json({ error: "Rule key not found" }, { status: 404 });
        }

        // 2. Transaction: Update Rule + Insert Audit Log
        await db.transaction(async (tx) => {
            // Update Rule
            await tx.update(businessRules)
                .set({
                    value: value,
                    description: description || currentRule.description,
                    version: (currentRule.version || 0) + 1,
                    updatedAt: new Date()
                })
                .where(eq(businessRules.key, key));

            // Log Audit
            await tx.insert(auditLogs).values({
                adminId,
                action: "UPDATE_RULES",
                targetId: key,
                details: {
                    oldValue: currentRule.value,
                    newValue: value,
                    version: (currentRule.version || 0) + 1
                }
            });
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        logger.error("Update Rules Error:", error);
        return NextResponse.json({ error: "Failed to update rules" }, { status: 500 });
    }
}
