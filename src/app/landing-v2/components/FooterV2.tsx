import Link from "next/link";

export function FooterV2() {
    return (
        <footer className="v2-footer">
            <div className="v2-container">
                <div className="v2-footer-grid">
                    {/* Brand */}
                    <div className="v2-footer-brand">
                        <div className="v2-navbar-logo" style={{ marginBottom: "16px" }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect width="24" height="24" rx="4" fill="#FF7600" />
                                <path d="M7 12L10 15L17 8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            Propshot
                        </div>
                        <p>
                            The world&apos;s first prediction market prop firm. Trade events, not just charts.
                        </p>
                    </div>

                    {/* Company */}
                    <div className="v2-footer-col">
                        <h4>Company</h4>
                        <Link href="/about">About Us</Link>
                        <Link href="/faq">FAQ</Link>
                        <Link href="/contact">Contact</Link>
                    </div>

                    {/* Legal */}
                    <div className="v2-footer-col">
                        <h4>Legal</h4>
                        <Link href="/terms">Terms of Service</Link>
                        <Link href="/privacy">Privacy Policy</Link>
                        <Link href="/refund">Refund Policy</Link>
                    </div>

                    {/* Resources */}
                    <div className="v2-footer-col">
                        <h4>Resources</h4>
                        <Link href="/landing-v2#pricing">Pricing</Link>
                        <Link href="/landing-v2#how-it-works">How It Works</Link>
                        <Link href="/blog">Blog</Link>
                    </div>
                </div>

                <div className="v2-footer-bottom">
                    © {new Date().getFullYear()} Propshot Trading. All rights reserved.
                </div>
            </div>
        </footer>
    );
}
