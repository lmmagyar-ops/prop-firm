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
