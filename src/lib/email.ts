import { createLogger } from "./logger";

const logger = createLogger('Email');
const isDev = process.env.NODE_ENV === 'development';
const EMAIL_FROM = process.env.EMAIL_FROM || "Predictions Firm <onboarding@resend.dev>";

// ─── Brand Design System ───────────────────────────────────────────
const BRAND = {
    bg: '#0A0A0A',
    cardBg: '#111111',
    cardBorder: '#1E1E1E',
    green: '#4ADE80',
    greenDark: '#16A34A',
    white: '#FFFFFF',
    gray100: '#F5F5F5',
    gray400: '#9CA3AF',
    gray500: '#6B7280',
    gray600: '#4B5563',
    gray700: '#374151',
    gray800: '#1F2937',
    siteUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    logoUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://prop-firmx.vercel.app'}/logo-wordmark-white.png`,
} as const;

// ─── Shared Email Shell ────────────────────────────────────────────
function emailShell(content: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="dark">
    <meta name="supported-color-schemes" content="dark">
    <title>Predictions Firm</title>
    <!--[if mso]>
    <style>
        table { border-collapse: collapse; }
        .button-link { padding: 16px 40px !important; }
    </style>
    <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: ${BRAND.bg}; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
    
    <!-- Outer wrapper -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${BRAND.bg};">
        <tr>
            <td align="center" style="padding: 40px 20px 20px;">
                
                <!-- Logo -->
                <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width: 560px;">
                    <tr>
                        <td align="center" style="padding-bottom: 32px;">
                            <a href="${BRAND.siteUrl}" style="text-decoration: none;">
                                <img src="${BRAND.logoUrl}" alt="Predictions Firm" width="200" style="display: block; height: auto; max-width: 200px;" />
                            </a>
                        </td>
                    </tr>
                </table>

                <!-- Main Card -->
                <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width: 560px; background-color: ${BRAND.cardBg}; border: 1px solid ${BRAND.cardBorder}; border-radius: 16px;">
                    <tr>
                        <td style="padding: 48px 40px;">
                            ${content}
                        </td>
                    </tr>
                </table>

                <!-- Footer -->
                <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width: 560px;">
                    <tr>
                        <td style="padding: 32px 40px 0;">
                            <!-- Divider -->
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td style="border-top: 1px solid ${BRAND.gray800}; padding-top: 24px;">
                                        <p style="margin: 0 0 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; line-height: 20px; color: ${BRAND.gray500}; text-align: center;">
                                            <a href="${BRAND.siteUrl}" style="color: ${BRAND.gray400}; text-decoration: none;">Dashboard</a>
                                            &nbsp;&nbsp;·&nbsp;&nbsp;
                                            <a href="${BRAND.siteUrl}/faq" style="color: ${BRAND.gray400}; text-decoration: none;">FAQ</a>
                                            &nbsp;&nbsp;·&nbsp;&nbsp;
                                            <a href="${BRAND.siteUrl}/about" style="color: ${BRAND.gray400}; text-decoration: none;">About</a>
                                        </p>
                                        <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; line-height: 18px; color: ${BRAND.gray600}; text-align: center;">
                                            © ${new Date().getFullYear()} Predictions Firm. All rights reserved.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>

            </td>
        </tr>
    </table>
</body>
</html>`;
}

// ─── Shared Components ─────────────────────────────────────────────
function ctaButton(href: string, label: string, color: string = BRAND.green): string {
    return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
            <td align="center" style="padding: 8px 0 0;">
                <!--[if mso]>
                <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${href}" style="height:52px;v-text-anchor:middle;width:220px;" arcsize="50%" fillcolor="${color}">
                <center style="color:#000000;font-family:sans-serif;font-size:16px;font-weight:bold;">
                ${label}
                </center>
                </v:roundrect>
                <![endif]-->
                <!--[if !mso]><!-->
                <a href="${href}" class="button-link" style="display: inline-block; padding: 16px 40px; background-color: ${color}; color: #000000; text-decoration: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; font-weight: 600; border-radius: 100px; letter-spacing: -0.01em; mso-padding-alt: 16px 40px;">
                    ${label}
                </a>
                <!--<![endif]-->
            </td>
        </tr>
    </table>`;
}

function heading(text: string): string {
    return `<h1 style="margin: 0 0 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 28px; font-weight: 700; line-height: 34px; color: ${BRAND.white}; text-align: center; letter-spacing: -0.03em;">${text}</h1>`;
}

function bodyText(text: string): string {
    return `<p style="margin: 0 0 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; line-height: 24px; color: ${BRAND.gray400}; text-align: center;">${text}</p>`;
}

function finePrint(text: string): string {
    return `<p style="margin: 24px 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; line-height: 18px; color: ${BRAND.gray600}; text-align: center;">${text}</p>`;
}

function fallbackLink(url: string): string {
    return `<p style="margin: 16px 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; line-height: 16px; color: ${BRAND.gray700}; text-align: center; word-break: break-all;">If the button doesn't work, copy this link:<br/><a href="${url}" style="color: ${BRAND.gray500}; text-decoration: underline;">${url}</a></p>`;
}

// ─── Send Helper ───────────────────────────────────────────────────
async function sendEmail(to: string, subject: string, html: string, label: string): Promise<void> {
    if (!process.env.RESEND_API_KEY) {
        logger.warn(`[Email] RESEND_API_KEY not set — ${label} to ${to} was NOT sent`);
        return;
    }
    try {
        const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
            },
            body: JSON.stringify({ from: EMAIL_FROM, to: [to], subject, html }),
        });
        if (!res.ok) {
            const body = await res.text();
            logger.error(`[Email] Resend API error ${res.status} for ${label}: ${body}`);
        } else {
            logger.info(`[Email] ${label} sent to ${to}`);
        }
    } catch (error) {
        logger.error(`[Email] Failed to send ${label}:`, error);
    }
}

// ─── 1. Login Verification (Number Challenge) ─────────────────────
export async function sendVerificationEmail(email: string, code: string, decoys: string[]) {
    const appUrl = BRAND.siteUrl;

    if (isDev) {
        logger.debug(`Verification email to ${email}`, { code, decoys: decoys.length, appUrl });
    } else {
        logger.info(`Verification email sent to ${email}`);
    }

    const shuffled = [code, ...decoys].sort(() => Math.random() - 0.5);
    const codeButtons = shuffled.map(num => `
        <td align="center" style="padding: 0 6px;">
            <a href="${appUrl}/api/auth/verify?code=${num}&email=${encodeURIComponent(email)}" 
               style="display: inline-block; width: 72px; height: 56px; line-height: 56px; text-align: center; background-color: ${BRAND.cardBg}; border: 1px solid ${BRAND.cardBorder}; color: ${BRAND.white}; text-decoration: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 22px; font-weight: 700; border-radius: 12px; letter-spacing: -0.02em;">
                ${num}
            </a>
        </td>
    `).join('');

    const html = emailShell(`
        <!-- Icon -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
                <td align="center" style="padding-bottom: 24px;">
                    <div style="width: 56px; height: 56px; border-radius: 16px; background-color: rgba(74, 222, 128, 0.1); border: 1px solid rgba(74, 222, 128, 0.2); line-height: 56px; text-align: center; font-size: 24px;">🔐</div>
                </td>
            </tr>
        </table>
        ${heading('Verify Your Identity')}
        ${bodyText('To complete your login, tap the number below that matches what you see on your screen.')}
        
        <!-- Code buttons -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
            <tr>
                ${codeButtons}
            </tr>
        </table>
        
        ${finePrint('Only tap a number if you just attempted to sign in. This code expires in 10 minutes.')}
    `);

    await sendEmail(email, 'Verify Your Login — Predictions Firm', html, 'login verification');
}

// ─── 2. Password Reset ────────────────────────────────────────────
export async function sendPasswordResetEmail(email: string, token: string) {
    const resetLink = `${BRAND.siteUrl}/reset-password?token=${token}`;

    if (isDev) {
        logger.debug(`Password reset email to ${email}`, { resetLink });
    } else {
        logger.info(`Password reset email sent to ${email}`);
    }

    const html = emailShell(`
        <!-- Icon -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
                <td align="center" style="padding-bottom: 24px;">
                    <div style="width: 56px; height: 56px; border-radius: 16px; background-color: rgba(74, 222, 128, 0.1); border: 1px solid rgba(74, 222, 128, 0.2); line-height: 56px; text-align: center; font-size: 24px;">🔑</div>
                </td>
            </tr>
        </table>
        ${heading('Reset Your Password')}
        ${bodyText('We received a request to reset your password. Tap below to choose a new one. If you didn\'t make this request, you can safely ignore this email.')}
        ${ctaButton(resetLink, 'Reset Password')}
        ${finePrint('This link expires in 1 hour.')}
        ${fallbackLink(resetLink)}
    `);

    await sendEmail(email, 'Reset Your Password — Predictions Firm', html, 'password reset');
}

// ─── 3. Email Verification (Signup) ───────────────────────────────
export async function sendEmailVerificationLink(email: string, token: string) {
    const verifyLink = `${BRAND.siteUrl}/api/auth/verify-email?token=${token}`;

    if (isDev) {
        logger.debug(`Email verification to ${email}`, { verifyLink });
    } else {
        logger.info(`Email verification sent to ${email}`);
    }

    const html = emailShell(`
        <!-- Icon -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
                <td align="center" style="padding-bottom: 24px;">
                    <div style="width: 56px; height: 56px; border-radius: 16px; background-color: rgba(74, 222, 128, 0.1); border: 1px solid rgba(74, 222, 128, 0.2); line-height: 56px; text-align: center; font-size: 24px;">✉️</div>
                </td>
            </tr>
        </table>
        ${heading('Verify Your Email')}
        ${bodyText('Welcome to Predictions Firm — the world\'s first prediction market prop firm. Tap below to verify your email and start trading.')}
        ${ctaButton(verifyLink, 'Verify Email')}
        ${finePrint('This link expires in 1 hour. If you didn\'t create an account, you can safely ignore this email.')}
        ${fallbackLink(verifyLink)}
    `);

    await sendEmail(email, 'Verify Your Email — Predictions Firm', html, 'email verification');
}
