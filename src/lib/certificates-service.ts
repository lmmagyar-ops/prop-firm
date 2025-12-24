
import { db } from "@/db";
import { users, challenges, certificates, badges, userBadges } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function getCertificatesData(userId: string) {
    // MOCK DATA BYPASS FOR DEMO USER
    if (userId.startsWith("demo-user")) {
        console.log("Returning mock certificates for demo user");
        return {
            featured: {
                type: 'lifetime-payouts',
                amount: 15000,
                userName: "Demo Trader",
                date: new Date(),
                certificateId: "cert-mock-1",
            },
            fundedTraderCerts: [
                {
                    id: "cert-mock-2",
                    type: "funded-trader",
                    amount: 100000,
                    date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                    thumbnailUrl: "/images/certificates/funded-100k.png",
                    userName: "Demo Trader"
                },
                {
                    id: "cert-mock-3",
                    type: "funded-trader",
                    amount: 50000,
                    date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
                    thumbnailUrl: "/images/certificates/funded-50k.png",
                    userName: "Demo Trader"
                }
            ],
            payoutCerts: [
                {
                    id: "cert-mock-4",
                    type: "payout",
                    amount: 2500,
                    date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
                    thumbnailUrl: "/images/certificates/payout-2500.png",
                    userName: "Demo Trader"
                }
            ],
            badges: [
                {
                    id: "badge-1",
                    name: "Early Adopter",
                    description: "Joined during beta",
                    icon: "rocket",
                    earned: true,
                    earnedDate: new Date()
                },
                {
                    id: "badge-2",
                    name: "First Payout",
                    description: "Received first payout",
                    icon: "dollar-sign",
                    earned: true,
                    earnedDate: new Date()
                },
                {
                    id: "badge-4",
                    name: "Risk Manager",
                    description: "Kept drawdown under 2%",
                    icon: "shield",
                    earned: false,
                }
            ],
            totalVolume: "1,250,000",
            lastUpdated: new Date().toLocaleDateString()
        };
    }
    // MOCK DATA BYPASS FOR DEMO USER
    if (userId.startsWith("demo-user")) {
        return {
            featured: {
                type: 'lifetime-payouts',
                amount: 15000,
                userName: "Demo Trader",
                date: new Date(),
                certificateId: "cert-mock-1",
            },
            fundedTraderCerts: [
                {
                    id: "cert-mock-2",
                    type: "funded-trader",
                    amount: 100000,
                    date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                    thumbnailUrl: "/images/certificates/funded-100k.png", // Mock URL or placeholder
                    userName: "Demo Trader"
                },
                {
                    id: "cert-mock-3",
                    type: "funded-trader",
                    amount: 50000,
                    date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
                    thumbnailUrl: "/images/certificates/funded-50k.png",
                    userName: "Demo Trader"
                }
            ],
            payoutCerts: [
                {
                    id: "cert-mock-4",
                    type: "payout",
                    amount: 2500,
                    date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
                    thumbnailUrl: "/images/certificates/payout-2500.png",
                    userName: "Demo Trader"
                }
            ],
            badges: [
                {
                    id: "badge-1",
                    name: "Early Adopter",
                    description: "Joined during beta",
                    icon: "rocket",
                    earned: true,
                    earnedDate: new Date()
                },
                {
                    id: "badge-2",
                    name: "First Payout",
                    description: "Received first payout",
                    icon: "dollar-sign",
                    earned: true,
                    earnedDate: new Date()
                },
                {
                    id: "badge-4",
                    name: "Risk Manager",
                    description: "Kept drawdown under 2%",
                    icon: "shield",
                    earned: false,
                }
            ],
            totalVolume: "1,250,000",
            lastUpdated: new Date().toLocaleDateString()
        };
    }

    // 1. Get user name
    const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: { displayName: true }
    });

    const userName = user?.displayName || "Trader";

    // 2. Get certificates
    const userCerts = await db.query.certificates.findMany({
        where: eq(certificates.userId, userId),
        orderBy: [desc(certificates.issuedAt)],
    });

    // 3. Get badges
    const allBadges = await db.query.badges.findMany();
    const earnedBadges = await db.query.userBadges.findMany({
        where: eq(userBadges.userId, userId),
    });

    // Map earned badges for easy lookup
    const earnedMap = new Map(earnedBadges.map(ub => [ub.badgeId, ub.earnedAt]));

    // Format badges
    const formattedBadges = allBadges.map(badge => ({
        id: badge.id,
        name: badge.name,
        description: badge.description,
        icon: badge.icon,
        earned: earnedMap.has(badge.id),
        earnedDate: earnedMap.get(badge.id) || undefined,
    }));

    // Separate certificates
    const lifetimePayoutsCert = userCerts.find(c => c.type === 'lifetime-payouts');

    // If no lifetime cert exists but user has payouts, we might generate one on the fly or return null
    // For now, let's assume if it's there, logic handled elsewhere.

    const fundedTraderCerts = userCerts
        .filter(c => c.type === 'funded-trader')
        .map(c => ({
            id: c.id,
            type: c.type,
            amount: parseFloat(c.amount),
            date: c.issuedAt,
            thumbnailUrl: `/api/certificates/${c.id}/thumbnail`,
            userName
        }));

    const payoutCerts = userCerts
        .filter(c => c.type === 'payout')
        .map(c => ({
            id: c.id,
            type: c.type,
            amount: parseFloat(c.amount),
            date: c.issuedAt,
            thumbnailUrl: `/api/certificates/${c.id}/thumbnail`,
            userName
        }));

    // Mock stats for sidebar
    const totalVolume = 1250000; // TODO: Calculate real volume
    const lastUpdated = new Date().toLocaleDateString();

    return {
        featured: lifetimePayoutsCert ? {
            type: 'lifetime-payouts',
            amount: parseFloat(lifetimePayoutsCert.amount),
            userName,
            date: lifetimePayoutsCert.issuedAt,
            certificateId: lifetimePayoutsCert.id,
        } : null,
        fundedTraderCerts,
        payoutCerts,
        badges: formattedBadges,
        totalVolume: totalVolume.toLocaleString(),
        lastUpdated
    };
}
