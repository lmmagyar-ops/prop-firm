/**
 * Design Tokens - Single Source of Truth for UI Constants
 * 
 * This module defines all design constants used across the trading UI.
 * Using these tokens ensures visual consistency and makes theming changes
 * propagate everywhere from a single location.
 * 
 * @example
 * import { colors, spacing, breakpoints } from '@/lib/design-tokens';
 * <div className={`bg-[${colors.background.card}]`}>
 */

// ============================================================================
// COLORS
// ============================================================================

export const colors = {
    // Primary action colors
    primary: {
        yes: '#00C896',       // Green - Buy Yes
        yesHover: '#00B88A',  // Green hover
        yesDark: '#052e1f',   // Yes button text (dark on light)
        no: '#E63E5D',        // Rose - Buy No  
        noHover: '#D43552',   // Rose hover
        noDark: '#380e14',    // No button text (dark on light)
    },

    // Backgrounds
    background: {
        page: '#0a0a0a',      // Main page background
        modal: '#0D1117',     // Modal/card background (GitHub dark)
        card: '#161B22',      // Card surface
        cardHover: '#1c2128', // Card hover state
        input: '#21262d',     // Input field background
        elevated: '#30363d',  // Elevated surfaces
    },

    // Borders
    border: {
        default: 'rgba(255, 255, 255, 0.1)',  // 10% white
        subtle: 'rgba(255, 255, 255, 0.05)',  // 5% white
        focused: '#29af73',                    // Brand green focus ring
    },

    // Text
    text: {
        primary: '#FFFFFF',
        secondary: '#9CA3AF',   // zinc-400
        muted: '#6B7280',       // zinc-500
        disabled: '#4B5563',    // zinc-600
    },

    // Semantic colors
    semantic: {
        success: '#10B981',     // emerald-500
        warning: '#F59E0B',     // amber-500
        error: '#EF4444',       // red-500
        info: '#29af73',        // brand-green
    },

    // Price change indicators
    change: {
        positive: '#10B981',    // emerald-500
        negative: '#EF4444',    // red-500
        neutral: '#6B7280',     // zinc-500
    },
} as const;

// ============================================================================
// SPACING
// ============================================================================

export const spacing = {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    '2xl': '48px',
    '3xl': '64px',
} as const;

// ============================================================================
// BREAKPOINTS
// ============================================================================

export const breakpoints = {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536,
} as const;

// ============================================================================
// TYPOGRAPHY
// ============================================================================

export const typography = {
    fontFamily: {
        sans: 'Inter, system-ui, -apple-system, sans-serif',
        mono: 'JetBrains Mono, Menlo, monospace',
    },
    fontSize: {
        xs: '0.75rem',    // 12px
        sm: '0.875rem',   // 14px
        base: '1rem',     // 16px
        lg: '1.125rem',   // 18px
        xl: '1.25rem',    // 20px
        '2xl': '1.5rem',  // 24px
        '3xl': '1.875rem', // 30px
    },
    fontWeight: {
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
    },
} as const;

// ============================================================================
// ANIMATION
// ============================================================================

export const animation = {
    duration: {
        fast: '150ms',
        normal: '200ms',
        slow: '300ms',
    },
    easing: {
        default: 'cubic-bezier(0.4, 0, 0.2, 1)',
        easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
        easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    },
} as const;

// ============================================================================
// COMPONENT-SPECIFIC TOKENS
// ============================================================================

export const components = {
    card: {
        borderRadius: '12px',
        padding: spacing.md,
        gap: spacing.sm,
    },
    button: {
        height: {
            sm: '32px',
            md: '40px',
            lg: '48px',
        },
        borderRadius: '8px',
    },
    modal: {
        maxWidth: {
            sm: '400px',
            md: '600px',
            lg: '800px',
            xl: '1152px',  // max-w-6xl
        },
    },
} as const;

// ============================================================================
// TAILWIND CLASS HELPERS
// ============================================================================

/**
 * Get Tailwind-compatible color class
 * @example getColorClass('yes') => 'bg-[#00C896]'
 */
export const tw = {
    bg: (color: string) => `bg-[${color}]`,
    text: (color: string) => `text-[${color}]`,
    border: (color: string) => `border-[${color}]`,
} as const;

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type ColorPalette = typeof colors;
export type Spacing = typeof spacing;
export type Breakpoints = typeof breakpoints;
