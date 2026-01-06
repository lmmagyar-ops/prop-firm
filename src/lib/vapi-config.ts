export const VAPI_CONFIG = {
    publicKey: process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY || '',
    // You'll get this assistant ID after creating your assistant in Vapi dashboard
    assistantId: process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID || '',
};

// Voice AI context types
export interface VoiceContext {
    currentPage: string;
    timeOnPage: number;
    selectedPlan?: string;
    isLoggedIn: boolean;
    userEmail?: string;
    scrollDepth?: number;
}
