import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

// Simple file-based storage for waitlist emails
// In production, replace with database or email service
const WAITLIST_FILE = path.join(process.cwd(), "waitlist.json");

interface WaitlistEntry {
    email: string;
    timestamp: string;
    ip?: string;
}

async function getWaitlist(): Promise<WaitlistEntry[]> {
    try {
        const data = await fs.readFile(WAITLIST_FILE, "utf-8");
        return JSON.parse(data);
    } catch {
        return [];
    }
}

async function saveWaitlist(entries: WaitlistEntry[]): Promise<void> {
    await fs.writeFile(WAITLIST_FILE, JSON.stringify(entries, null, 2));
}

export async function POST(request: NextRequest) {
    try {
        const { email } = await request.json();

        // Validate email
        if (!email || typeof email !== "string") {
            return NextResponse.json({ error: "Email is required" }, { status: 400 });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
        }

        // Get existing waitlist
        const waitlist = await getWaitlist();

        // Check for duplicate
        const normalizedEmail = email.toLowerCase().trim();
        if (waitlist.some((entry) => entry.email.toLowerCase() === normalizedEmail)) {
            return NextResponse.json({ error: "This email is already on the waitlist" }, { status: 409 });
        }

        // Add new entry
        const newEntry: WaitlistEntry = {
            email: normalizedEmail,
            timestamp: new Date().toISOString(),
            ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || undefined,
        };

        waitlist.push(newEntry);
        await saveWaitlist(waitlist);

        console.log(`[Waitlist] New signup: ${normalizedEmail} (total: ${waitlist.length})`);

        return NextResponse.json({
            success: true,
            message: "Successfully joined the waitlist",
            position: waitlist.length,
        });
    } catch (error) {
        console.error("[Waitlist] Error:", error);
        return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
    }
}

export async function GET() {
    // Simple endpoint to check waitlist count (for internal use)
    try {
        const waitlist = await getWaitlist();
        return NextResponse.json({ count: waitlist.length });
    } catch {
        return NextResponse.json({ count: 0 });
    }
}
