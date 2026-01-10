export function HowItWorksV2() {
    const steps = [
        {
            icon: "📋",
            title: "Complete a challenge",
            description: "Prove your trading skills and complete a challenge. Choose any of our prediction market pairs.",
        },
        {
            icon: "✓",
            title: "Get verified",
            description: "If you're on the 2-step or 3-step challenge, complete verification with easier rules.",
        },
        {
            icon: "💼",
            title: "Become a funded trader",
            description: "Congratulations! You've got a simulated funded account and you can keep 80% of the profits.",
        },
        {
            icon: "💰",
            title: "Get paid",
            description: "Set your payout preferences and withdraw at any time. Payout frequency is every 14 days!",
        },
    ];

    return (
        <section id="how-it-works" className="v2-how-it-works">
            <div className="v2-container">
                <h2 className="v2-heading-serif">
                    Real trading experience, <span className="accent">without the risk.</span>
                </h2>
                <p className="subtitle">
                    You&apos;re four steps away from harnessing your trading skills. It&apos;s simple. Here&apos;s how it works:
                </p>

                <div className="v2-steps">
                    {steps.map((step, idx) => (
                        <div key={idx} className="v2-step">
                            <div className="v2-step-icon">{step.icon}</div>
                            <h3>{step.title}</h3>
                            <p>{step.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
