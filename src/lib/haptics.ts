
// src/lib/haptics.ts

// Helper to prevent server-side errors
const isClient = typeof window !== 'undefined' && 'navigator' in window;

export const haptics = {
    light: () => {
        if (isClient && 'vibrate' in navigator) {
            navigator.vibrate(10);
        }
    },
    medium: () => {
        if (isClient && 'vibrate' in navigator) {
            navigator.vibrate([20, 10, 20]); // Pattern
        }
    },
    success: () => {
        if (isClient && 'vibrate' in navigator) {
            // Distinct success pattern: short-short-long
            navigator.vibrate([30, 30, 30, 30, 80]);
        }
    },
    error: () => {
        if (isClient && 'vibrate' in navigator) {
            // Distinct error pattern: long-short-long-short
            navigator.vibrate([50, 30, 50, 30]);
        }
    },
};
