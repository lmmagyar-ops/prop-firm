import Link from "next/link";
import { ProbabilityOrbsV2 } from "./ProbabilityOrbsV2";

export function HeroV2() {
    return (
        <section className="v2-hero">
            {/* Background pattern */}
            <div className="v2-hero-pattern" />

            {/* Floating probability orbs */}
            <ProbabilityOrbsV2 />

            <div className="v2-container">
                <h1 className="v2-heading-serif">
                    Your prediction market journey<br />
                    begins with <span className="accent">Propshot.</span>
                </h1>

                <p className="v2-hero-subtitle">
                    Start trading in a fully simulated environment and keep 80% of your rewards.
                    Join the community with no hassle, just results.
                </p>

                <div className="v2-hero-actions">
                    <Link href="/signup" className="v2-btn v2-btn-primary">
                        Get started
                    </Link>
                    <Link href="/landing-v2#how-it-works" className="v2-btn v2-btn-secondary">
                        Learn more
                    </Link>
                </div>
            </div>
        </section>
    );
}
