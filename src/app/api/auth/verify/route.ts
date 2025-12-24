import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const email = searchParams.get("email");

    if (!code || !email) {
        return NextResponse.json({ error: "Invalid link" }, { status: 400 });
    }

    const user = await db.query.users.findFirst({
        where: eq(users.email, email),
    });

    if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.verificationCode !== code) {
        return NextResponse.json({ error: "Invalid code" }, { status: 400 });
    }

    // Check expiry
    if (user.verificationCodeExpiry && new Date() > user.verificationCodeExpiry) {
        return NextResponse.json({ error: "Code expired" }, { status: 400 });
    }

    // Mark verified
    await db.update(users)
        .set({ emailVerified: new Date() })
        .where(eq(users.email, email));

    // Redirect to success page
    return NextResponse.redirect(new URL("/verify-success", req.url));
}
