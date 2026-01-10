import Link from "next/link";

export function CtaBannerV2() {
    return (
        <section className="v2-cta">
            <div className="v2-container">
                <h2 className="v2-heading-serif">
                    Are you ready to <span className="accent">start trading?</span>
                </h2>
                <p>
                    Gain access to elite funding, cutting-edge tools, and the support of a
                    whole community dedicated to your growth.
                </p>
                <div className="v2-cta-actions">
                    <Link href="/signup" className="v2-btn v2-btn-primary">
                        Choose your challenge
                    </Link>
                    <Link href="/about" className="v2-btn v2-btn-secondary">
                        Learn more
                    </Link>
                </div>
            </div>
        </section>
    );
}
