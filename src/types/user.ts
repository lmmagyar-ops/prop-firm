export interface User {
    id: string;
    email: string;
    displayName: string | null;
    firstName: string | null;
    lastName: string | null;
    krakenId: string | null;
    image: string | null;
    kycStatus: string | null;
    // Socials
    twitter: string | null;
    discord: string | null;
    telegram: string | null;
    facebook: string | null;
    tiktok: string | null;
    instagram: string | null;
    youtube: string | null;
    // Address
    addressStreet: string | null;
    addressApartment: string | null;
    addressCity: string | null;
    addressState: string | null;
    addressZip: string | null;
    addressCountry: string | null;
    showOnLeaderboard: boolean | null;
    // Privacy
    leaderboardPrivacy: string | null;
    showCountry: boolean | null;
    showStatsPublicly: boolean | null;
}

export interface UpdateProfileData {
    firstName: string;
    lastName: string;
    displayName: string;
    krakenId: string;
    socials: {
        facebook: string;
        tiktok: string;
        instagram: string;
        twitter: string;
        youtube: string;
    };
}

export interface UpdateAddressData {
    addressStreet: string;
    addressApartment?: string;
    addressCity: string;
    addressState: string;
    addressZip: string;
    addressCountry: string;
}

export interface Challenge {
    id: string;
    userId: string;
    startingBalance: string;
    currentBalance: string;
    status: string;
    startedAt: Date | null;
    isPublicOnProfile: boolean;
    showDropdownOnProfile: boolean;
}

export interface PublicProfileData {
    user: User;
    metrics: {
        lifetimeTradingVolume: number;
        fundedTradingVolume: number;
        currentWithdrawableProfit: number;
        highestWinRateAsset: string | null;
        tradingWinRate: number | null;
        lifetimeProfitWithdrawn: number;
    };
    accounts: Array<{
        id: string;
        date: Date;
        accountNumber: string;
        accountType: string;
        status: string;
        isPublic: boolean;
        showDropdown: boolean;
    }>;
    showOnLeaderboard: boolean;
}
