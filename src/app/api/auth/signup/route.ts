import { db } from "@/db";
import { users, verificationTokens } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { sendEmailVerificationLink } from "@/lib/email";

const SALT_ROUNDS = 12;

// Basic email validation
function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Password strength validation
function isStrongPassword(password: string): { valid: boolean; message: string } {
    if (password.length < 8) {
        return { valid: false, message: "Password must be at least 8 characters" };
    }
    if (!/[A-Z]/.test(password)) {
        return { valid: false, message: "Password must contain at least one uppercase letter" };
    }
    if (!/[a-z]/.test(password)) {
        return { valid: false, message: "Password must contain at least one lowercase letter" };
    }
    if (!/[0-9]/.test(password)) {
        return { valid: false, message: "Password must contain at least one number" };
    }
    return { valid: true, message: "" };
}

// Country list for validation
const VALID_COUNTRIES = [
    "US", "CA", "GB", "DE", "FR", "AU", "NZ", "NL", "BE", "AT", "CH", "IE", "SE", "NO", "DK", "FI",
    "ES", "IT", "PT", "PL", "CZ", "SK", "HU", "RO", "BG", "HR", "SI", "EE", "LV", "LT", "MT", "CY",
    "JP", "KR", "SG", "HK", "TW", "MY", "TH", "PH", "ID", "VN", "IN", "PK", "BD", "LK",
    "ZA", "NG", "KE", "GH", "EG", "MA", "TN",
    "MX", "BR", "AR", "CL", "CO", "PE", "VE", "EC", "UY", "PY", "BO",
    "AE", "SA", "QA", "KW", "BH", "OM", "IL", "TR",
    // Add more as needed
];

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, firstName, lastName, password, confirmPassword, country, agreedToTerms, captchaToken } = body;

        // Validate required fields
        if (!email || !firstName || !lastName || !password || !confirmPassword || !country) {
            return NextResponse.json(
                { error: "All fields are required" },
                { status: 400 }
            );
        }

        // Validate email format
        if (!isValidEmail(email)) {
            return NextResponse.json(
                { error: "Invalid email format" },
                { status: 400 }
            );
        }

        // Check password match
        if (password !== confirmPassword) {
            return NextResponse.json(
                { error: "Passwords do not match" },
                { status: 400 }
            );
        }

        // Validate password strength
        const passwordCheck = isStrongPassword(password);
        if (!passwordCheck.valid) {
            return NextResponse.json(
                { error: passwordCheck.message },
                { status: 400 }
            );
        }

        // Validate country
        if (!VALID_COUNTRIES.includes(country)) {
            return NextResponse.json(
                { error: "Please select a valid country" },
                { status: 400 }
            );
        }

        // Validate TOS agreement
        if (!agreedToTerms) {
            return NextResponse.json(
                { error: "You must agree to the Terms and Conditions" },
                { status: 400 }
            );
        }

        // Verify reCAPTCHA token (optional - skip if not configured, since TraderBotGuard provides bot protection)
        const recaptchaSecretKey = process.env.RECAPTCHA_SECRET_KEY;
        if (recaptchaSecretKey && captchaToken) {
            // Verify with Google reCAPTCHA API
            const recaptchaResponse = await fetch("https://www.google.com/recaptcha/api/siteverify", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: `secret=${recaptchaSecretKey}&response=${captchaToken}`,
            });

            const recaptchaData = await recaptchaResponse.json();

            if (!recaptchaData.success) {
                console.warn("[Signup] reCAPTCHA verification failed:", recaptchaData["error-codes"]);
                return NextResponse.json(
                    { error: "CAPTCHA verification failed. Please try again." },
                    { status: 400 }
                );
            }

            // For v3 reCAPTCHA, check score (0.0 - 1.0, higher is more likely human)
            if (recaptchaData.score !== undefined && recaptchaData.score < 0.5) {
                console.warn("[Signup] Low reCAPTCHA score:", recaptchaData.score);
                return NextResponse.json(
                    { error: "Suspicious activity detected. Please try again." },
                    { status: 400 }
                );
            }
        }
        // Note: TraderBotGuard on the frontend provides bot protection even without reCAPTCHA

        // Check if email already exists
        const existingUser = await db
            .select({ id: users.id })
            .from(users)
            .where(eq(users.email, email.toLowerCase().trim()))
            .limit(1);

        if (existingUser.length > 0) {
            return NextResponse.json(
                { error: "An account with this email already exists" },
                { status: 409 }
            );
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

        // Create user
        const newUser = await db
            .insert(users)
            .values({
                email: email.toLowerCase().trim(),
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                name: `${firstName.trim()} ${lastName.trim()}`,
                country,
                passwordHash,
                role: "user",
                isActive: true,
                agreedToTermsAt: new Date(),
            })
            .returning({ id: users.id, email: users.email, name: users.name });

        // Generate verification token
        const verificationToken = crypto.randomUUID();
        const hashedToken = crypto.createHash("sha256").update(verificationToken).digest("hex");
        const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        // Store the hashed token
        await db.insert(verificationTokens).values({
            identifier: email.toLowerCase().trim(),
            token: hashedToken,
            expires,
        });

        // Send verification email
        await sendEmailVerificationLink(email.toLowerCase().trim(), verificationToken);

        return NextResponse.json({
            success: true,
            message: "Account created. Please check your email to verify your account.",
            user: {
                id: newUser[0].id,
                email: newUser[0].email,
                name: newUser[0].name,
            }
        }, { status: 201 });

    } catch (error) {
        console.error("Signup Error:", error);
        return NextResponse.json(
            { error: "Failed to create account. Please try again." },
            { status: 500 }
        );
    }
}
