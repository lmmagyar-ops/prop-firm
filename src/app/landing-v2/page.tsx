import { Metadata } from "next";
import { HeroV2 } from "./components/HeroV2";
import { ChallengeSelectorV2 } from "./components/ChallengeSelectorV2";
import { HowItWorksV2 } from "./components/HowItWorksV2";
import { AboutV2 } from "./components/AboutV2";
import { CtaBannerV2 } from "./components/CtaBannerV2";
import { FooterV2 } from "./components/FooterV2";

export const metadata: Metadata = {
    title: "Propshot - The Prediction Market Prop Firm",
    description: "Start your prediction market trading career with Propshot. Get funded, get paid.",
};

export default function LandingV2Page() {
    return (
        <main>
            <HeroV2 />
            <ChallengeSelectorV2 />
            <HowItWorksV2 />
            <AboutV2 />
            <CtaBannerV2 />
            <FooterV2 />
        </main>
    );
}
