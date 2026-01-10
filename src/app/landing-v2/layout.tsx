import "./styles.css";
import { NavbarV2 } from "./components/NavbarV2";

export default function LandingV2Layout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            {/* Google Fonts */}
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
            <link
                href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@400;500;600&display=swap"
                rel="stylesheet"
            />

            <div className="landing-v2">
                <NavbarV2 />
                {children}
            </div>
        </>
    );
}
