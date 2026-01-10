import Link from "next/link";

export function AboutV2() {
    return (
        <section id="about" className="v2-about">
            <div className="v2-container">
                <div className="v2-about-inner">
                    <div className="v2-about-content">
                        <h2 className="v2-heading-serif">
                            A little <span className="accent">about us</span>
                        </h2>
                        <p>
                            Our team is dedicated to driving innovation and becoming the leading prop firm
                            in the prediction market trading community.
                        </p>
                        <p>
                            At Propshot, our mission is to empower traders by providing them with the
                            resources they need to succeed.
                        </p>
                        <p>
                            We prioritize transparency and risk management, ensuring a supportive
                            environment for long-term growth.
                        </p>
                        <Link href="/about" className="v2-btn v2-btn-secondary" style={{ marginTop: "24px" }}>
                            Learn more about us
                        </Link>
                    </div>
                    <div className="v2-about-visual">
                        {/* Placeholder for dashboard preview image */}
                        <div
                            style={{
                                background: "linear-gradient(135deg, #FF7600 0%, #FF9B4D 100%)",
                                borderRadius: "12px",
                                height: "400px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "#fff",
                                fontSize: "18px",
                                fontWeight: 500,
                            }}
                        >
                            Dashboard Preview
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
