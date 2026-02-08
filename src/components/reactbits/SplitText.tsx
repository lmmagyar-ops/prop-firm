"use client";

import { useRef, useMemo } from 'react';
import { motion, useInView } from 'framer-motion';

interface AnimationState {
    opacity?: number;
    y?: number;
    x?: number;
    scale?: number;
    rotate?: number;
}

interface SplitTextProps {
    text: string;
    className?: string;
    delay?: number;
    duration?: number;
    splitType?: 'chars' | 'words';
    from?: AnimationState;
    to?: AnimationState;
    threshold?: number;
    tag?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span';
    textAlign?: React.CSSProperties['textAlign'];
    onAnimationComplete?: () => void;
}

export default function SplitText({
    text,
    className = '',
    delay = 0.05,
    duration = 0.6,
    splitType = 'chars',
    from = { opacity: 0, y: 40 },
    to = { opacity: 1, y: 0 },
    threshold = 0.1,
    textAlign = 'center',
    onAnimationComplete,
}: SplitTextProps) {
    const ref = useRef<HTMLDivElement>(null);
    const isInView = useInView(ref, { once: true, amount: threshold });

    const elements = useMemo(() => {
        if (splitType === 'words') {
            return text.split(' ').map((word, i) => ({ text: word, key: `w-${i}` }));
        }
        return text.split('').map((char, i) => ({ text: char, key: `c-${i}` }));
    }, [text, splitType]);

    return (
        <motion.span
            ref={ref}
            className={className}
            style={{ textAlign, display: 'inline-block', overflow: 'hidden' }}
            initial="hidden"
            animate={isInView ? 'visible' : 'hidden'}
            onAnimationComplete={onAnimationComplete}
            transition={{ staggerChildren: delay }}
        >
            {elements.map(({ text: t, key }) => (
                <motion.span
                    key={key}
                    variants={{
                        hidden: from as Record<string, number>,
                        visible: {
                            ...(to as Record<string, number>),
                            transition: {
                                duration,
                                ease: [0.25, 0.4, 0.25, 1],
                            },
                        },
                    }}
                    style={{
                        display: 'inline-block',
                        whiteSpace: t === ' ' ? 'pre' : 'normal',
                    }}
                >
                    {t === ' ' ? '\u00A0' : t}
                    {splitType === 'words' ? '\u00A0' : ''}
                </motion.span>
            ))}
        </motion.span>
    );
}
