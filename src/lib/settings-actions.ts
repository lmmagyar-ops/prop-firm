
"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { UpdateProfileData, UpdateAddressData, User } from "@/types/user";

export async function updateProfile(data: UpdateProfileData): Promise<void> {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    await db.update(users)
        .set({
            firstName: data.firstName,
            lastName: data.lastName,
            displayName: data.displayName,
            krakenId: data.krakenId,
            facebook: data.socials.facebook,
            tiktok: data.socials.tiktok,
            instagram: data.socials.instagram,
            twitter: data.socials.twitter,
            youtube: data.socials.youtube,
        })
        .where(eq(users.id, session.user.id));

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard/privacy-profile");
    revalidatePath("/dashboard/public-profile");
}

/** Map full country names (from AddressTab dropdown) → 2-letter ISO codes (used by leaderboard FLAGS) */
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

export async function updateAddress(data: UpdateAddressData): Promise<void> {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    // Derive ISO code for leaderboard flag display
    const countryIso = COUNTRY_ISO[data.addressCountry] || null;

    await db.update(users)
        .set({
            addressStreet: data.addressStreet,
            addressApartment: data.addressApartment,
            addressCity: data.addressCity,
            addressState: data.addressState,
            addressZip: data.addressZip,
            addressCountry: data.addressCountry,
            country: countryIso,
        })
        .where(eq(users.id, session.user.id));

    revalidatePath("/dashboard/settings");
}

export async function getSettingsData(): Promise<User | null> {
    const session = await auth();
    if (!session?.user?.id) return null;

    // MOCK DATA BYPASS FOR DEMO USER
    if (session.user.id.startsWith("demo-user")) {
        return {
            id: session.user.id,
            email: "demo@projectx.com",
            firstName: "Demo",
            lastName: "Trader",
            displayName: "Demo Trader",
            emailVerified: new Date(),
            // Empty address/socials for demo
        } as unknown as User;
    }

    const user = await db.query.users.findFirst({
        where: eq(users.id, session.user.id),
    });

    return (user as User) || null;
}
