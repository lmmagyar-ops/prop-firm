// Analytics tracking helper for Vercel Analytics
// This ensures analytics is available before tracking

export const trackEvent = (eventName: string, data?: Record<string, any>) => {
    if (typeof window !== 'undefined' && (window as any).va) {
        (window as any).va('event', {
            name: eventName,
            data: data || {}
        });
    }
};

// Voice AI specific events
export const VoiceEvents = {
    // Conversation tracking
    STARTED: 'voice_ai_started',
    ENDED: 'voice_ai_ended',
    AUTO_PROMPTED: 'voice_ai_auto_prompted',
    PROMPT_DISMISSED: 'voice_ai_prompt_dismissed',

    // Question types (inferred from context)
    ASKED_PRICING: 'voice_asked_pricing',
    ASKED_RULES: 'voice_asked_rules',
    ASKED_PAYOUT: 'voice_asked_payout',
    ASKED_PLATFORMS: 'voice_asked_platforms',

    // Conversion funnel
    LED_TO_PRICING: 'voice_led_to_pricing',
    LED_TO_SIGNUP: 'voice_led_to_signup',
    LED_TO_CHECKOUT: 'voice_led_to_checkout',
    LED_TO_PURCHASE: 'voice_led_to_purchase',
} as const;

// Store voice AI interaction in localStorage for attribution
export const markVoiceInteraction = () => {
    if (typeof window !== 'undefined') {
        localStorage.setItem('voice_ai_used', Date.now().toString());
    }
};

// Check if user interacted with voice AI (within last 30 minutes)
export const wasVoiceAIUsed = (): boolean => {
    if (typeof window === 'undefined') return false;

    const timestamp = localStorage.getItem('voice_ai_used');
    if (!timestamp) return false;

    const thirtyMinutes = 30 * 60 * 1000;
    const timeSince = Date.now() - parseInt(timestamp);

    return timeSince < thirtyMinutes;
};
