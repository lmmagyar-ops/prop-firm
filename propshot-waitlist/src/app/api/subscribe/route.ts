import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

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


        try {
            // 1. Add to Audience (General/Waitlist)
            const { error: contactError } = await resend.contacts.create({
                email: email,
                audienceId: process.env.RESEND_AUDIENCE_ID,
            });

            if (contactError) {
                console.error("Resend Contact Error:", contactError);
                return NextResponse.json({ error: contactError.message }, { status: 500 });
            }

            // 2. Send Welcome Email
            const { error: emailError } = await resend.emails.send({
                from: "Predictions Firm <onboarding@resend.dev>",
                to: email,
                subject: "Welcome to the Future of Prop Trading",
                html: `
                    <div style="font-family: sans-serif; color: #111; max-width: 600px; margin: 0 auto;">
                        <img src="https://propshot-waitlist.vercel.app/logo.svg" alt="Predictions Firm Logo" style="width: 150px; margin-bottom: 24px;" />
                        <h1 style="font-size: 24px; font-weight: bold; margin-bottom: 16px;">Welcome to Predictions Firm</h1>
                        <p style="font-size: 16px; line-height: 1.5; color: #555;">
                            You have successfully secured your spot on the waitlist.
                        </p>
                        <p style="font-size: 16px; line-height: 1.5; color: #555;">
                            We are building the world's first <strong>prediction market prop firm</strong>. 
                            Get ready to prove your skills on Polymarket and Kalshi, and keep up to 90% of your gains.
                        </p>
                        <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
                        <p style="font-size: 14px; color: #888;">
                            &copy; ${new Date().getFullYear()} Chapman & Privatt Ltd. All rights reserved.
                        </p>
                    </div>
                `,
            });

            if (emailError) {
                console.error("Resend Email Error:", emailError);
                // We don't fail the request if just the email fails, but we log it.
            }

            return NextResponse.json({
                success: true,
                message: "Successfully joined the waitlist",
            });
        } catch (error) {
            console.error("Unexpected Error:", error);
            return NextResponse.json({ error: "Failed to join waitlist. Please try again." }, { status: 500 });
        }

    } catch (error) {
        console.error("[Waitlist] Error:", error);
        return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
    }
}

export async function GET() {
    // Disabled for security in production with real API
    return NextResponse.json({ message: "Endpoint disabled" }, { status: 404 });
}
