export async function sendVerificationEmail(email: string, code: string, decoys: string[]) {
    // ADD: Fallback for missing env var
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // In development or if no API key, log to console
    console.log("---------------------------------------------------");
    console.log(`📧 SENDING VERIFICATION EMAIL TO: ${email}`);
    console.log(`🔐 CODE: ${code}`);
    console.log(`🎭 DECOYS: ${decoys.join(", ")}`);
    console.log(`🔗 APP URL: ${appUrl}`); // ADD: Log the URL being used
    console.log("---------------------------------------------------");

    if (process.env.RESEND_API_KEY) {
        try {
            await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${process.env.RESEND_API_KEY}`
                },
                body: JSON.stringify({
                    from: "Project X <onboarding@resend.dev>", // Default Resend domain for testing
                    to: [email],
                    subject: "Authenticate Your Project X Account",
                    html: `
                        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #111; padding: 40px; color: white;">
                            <h1 style="text-align: center; margin-bottom: 30px;">Authenticate Your Account</h1>
                            <p style="text-align: center; color: #ccc; margin-bottom: 40px;">To complete your login to Project X, click the number below that matches what you see on your authentication screen:</p>
                            
                            <div style="display: flex; justify-content: center; gap: 20px; margin-bottom: 40px;">
                                ${[code, ...decoys].sort(() => Math.random() - 0.5).map(num => `
                                    <a href="${appUrl}/api/auth/verify?code=${num}&email=${encodeURIComponent(email)}" 
                                       style="display: inline-block; width: 80px; height: 60px; line-height: 60px; text-align: center; background: #0070f3; color: white; text-decoration: none; font-size: 24px; font-weight: bold; border-radius: 8px;">
                                        ${num}
                                    </a>
                                `).join('')}
                            </div>
                            
                            <p style="text-align: center; color: #666; font-size: 12px;">Only click a link if you just attempted to log in.</p>
                        </div>
                    `
                })
            });
        } catch (error) {
            console.error("Failed to send email via Resend:", error);
        }
    }
}

export async function sendPasswordResetEmail(email: string, token: string) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const resetLink = `${appUrl}/reset-password?token=${token}`;

    // Always log to console in development
    console.log("---------------------------------------------------");
    console.log(`🔑 PASSWORD RESET EMAIL TO: ${email}`);
    console.log(`🔗 RESET LINK: ${resetLink}`);
    console.log("---------------------------------------------------");

    if (process.env.RESEND_API_KEY) {
        try {
            await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${process.env.RESEND_API_KEY}`
                },
                body: JSON.stringify({
                    from: "Project X <onboarding@resend.dev>",
                    to: [email],
                    subject: "Reset Your Project X Password",
                    html: `
                        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #111; padding: 40px; color: white; border-radius: 12px;">
                            <h1 style="text-align: center; margin-bottom: 30px; color: #fff;">Reset Your Password</h1>
                            <p style="text-align: center; color: #aaa; margin-bottom: 30px;">
                                We received a request to reset your password. Click the button below to create a new password.
                            </p>
                            
                            <div style="text-align: center; margin-bottom: 30px;">
                                <a href="${resetLink}" 
                                   style="display: inline-block; padding: 16px 32px; background: #3b82f6; color: white; text-decoration: none; font-weight: bold; border-radius: 8px; font-size: 16px;">
                                    Reset Password
                                </a>
                            </div>
                            
                            <p style="text-align: center; color: #666; font-size: 12px;">
                                This link expires in 1 hour. If you didn't request this, you can safely ignore this email.
                            </p>
                            
                            <p style="text-align: center; color: #444; font-size: 11px; margin-top: 30px;">
                                If the button doesn't work, copy and paste this link:<br/>
                                <span style="color: #666; word-break: break-all;">${resetLink}</span>
                            </p>
                        </div>
                    `
                })
            });
        } catch (error) {
            console.error("Failed to send password reset email via Resend:", error);
        }
    }
}

export async function sendEmailVerificationLink(email: string, token: string) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const verifyLink = `${appUrl}/api/auth/verify-email?token=${token}`;

    // Always log to console in development
    console.log("---------------------------------------------------");
    console.log(`✉️ EMAIL VERIFICATION TO: ${email}`);
    console.log(`🔗 VERIFY LINK: ${verifyLink}`);
    console.log("---------------------------------------------------");

    if (process.env.RESEND_API_KEY) {
        try {
            await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${process.env.RESEND_API_KEY}`
                },
                body: JSON.stringify({
                    from: "Project X <onboarding@resend.dev>",
                    to: [email],
                    subject: "Verify Your Project X Email",
                    html: `
                        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #111; padding: 40px; color: white; border-radius: 12px;">
                            <h1 style="text-align: center; margin-bottom: 30px; color: #fff;">Verify Your Email</h1>
                            <p style="text-align: center; color: #aaa; margin-bottom: 30px;">
                                Thanks for signing up for Project X! Click the button below to verify your email address.
                            </p>
                            
                            <div style="text-align: center; margin-bottom: 30px;">
                                <a href="${verifyLink}" 
                                   style="display: inline-block; padding: 16px 32px; background: #22c55e; color: white; text-decoration: none; font-weight: bold; border-radius: 8px; font-size: 16px;">
                                    Verify Email
                                </a>
                            </div>
                            
                            <p style="text-align: center; color: #666; font-size: 12px;">
                                This link expires in 1 hour. If you didn't create an account, you can safely ignore this email.
                            </p>
                            
                            <p style="text-align: center; color: #444; font-size: 11px; margin-top: 30px;">
                                If the button doesn't work, copy and paste this link:<br/>
                                <span style="color: #666; word-break: break-all;">${verifyLink}</span>
                            </p>
                        </div>
                    `
                })
            });
        } catch (error) {
            console.error("Failed to send email verification via Resend:", error);
        }
    }
}
