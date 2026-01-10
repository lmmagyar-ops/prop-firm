"use client";

import Link from "next/link";

export function NavbarV2() {
    return (
        <nav className="v2-navbar">
            <div className="v2-container v2-navbar-inner">
                {/* Logo */}
                <Link href="/landing-v2" className="v2-navbar-logo">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect width="24" height="24" rx="4" fill="#FF7600" />
                        <path d="M7 12L10 15L17 8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Propshot
                </Link>

                {/* Nav Links */}
                <div className="v2-navbar-links">
                    <Link href="/landing-v2#pricing">Pricing</Link>
                    <Link href="/landing-v2#about">About us</Link>
                    <Link href="/faq">FAQ</Link>
                    <Link href="/landing-v2#contact">Contact</Link>
                </div>

                {/* Actions */}
                <div className="v2-navbar-actions">
                    <Link href="/login" className="v2-navbar-login">
                        Log in
                    </Link>
                    <Link href="/signup" className="v2-btn v2-btn-primary">
                        Get started
                    </Link>
                </div>
            </div>
        </nav>
    );
}
