"use client";

import { useState, useEffect, useRef } from 'react';
import Vapi from '@vapi-ai/web';
import { Mic, MicOff, X } from 'lucide-react';
import { VAPI_CONFIG } from '@/lib/vapi-config';
import { usePageContext } from '@/hooks/usePageContext';
import { motion, AnimatePresence } from 'framer-motion';
import { trackEvent, VoiceEvents, markVoiceInteraction } from '@/lib/analytics';

export function VoiceAssistant() {
    const vapiRef = useRef<Vapi | null>(null);
    const [isSessionActive, setIsSessionActive] = useState(false);
    const [isSpeechActive, setIsSpeechActive] = useState(false);
    const { currentPage, timeOnPage, scrollDepth } = usePageContext();
    const [isOpen, setIsOpen] = useState(false);
    const [showPrompt, setShowPrompt] = useState(false);

    // Initialize Vapi
    useEffect(() => {
        if (!VAPI_CONFIG.publicKey) return;

        vapiRef.current = new Vapi(VAPI_CONFIG.publicKey);

        // Set up event listeners
        vapiRef.current.on('call-start', () => {
            setIsSessionActive(true);
            setIsOpen(true);
        });

        vapiRef.current.on('call-end', () => {
            setIsSessionActive(false);
            setIsOpen(false);
        });

        vapiRef.current.on('speech-start', () => {
            setIsSpeechActive(true);
        });

        vapiRef.current.on('speech-end', () => {
            setIsSpeechActive(false);
        });

        // Cleanup
        return () => {
            if (vapiRef.current) {
                vapiRef.current.stop();
            }
        };
    }, []);

    // Auto-prompt on landing page after 90 seconds
    useEffect(() => {
        if (currentPage === '/' && timeOnPage > 90 && !isSessionActive && !showPrompt) {
            setShowPrompt(true);
            trackEvent(VoiceEvents.AUTO_PROMPTED, { page: currentPage, timeOnPage });
        }
    }, [timeOnPage, currentPage, isSessionActive, showPrompt]);

    // Track voice AI usage and page navigation after interaction
    useEffect(() => {
        if (isSessionActive) {
            // Mark that user started a conversation
            trackEvent(VoiceEvents.STARTED, {
                page: currentPage,
                timeOnPage,
                scrollDepth
            });
            markVoiceInteraction(); // Store for attribution
        } else if (isOpen) {
            // User ended the conversation
            trackEvent(VoiceEvents.ENDED, {
                page: currentPage,
                duration: timeOnPage
            });
        }
    }, [isSessionActive, isOpen, currentPage, timeOnPage, scrollDepth]);

    // Track navigation after voice interaction
    useEffect(() => {
        const voiceUsed = typeof window !== 'undefined' && localStorage.getItem('voice_ai_used');

        if (voiceUsed) {
            // Track page visits after voice interaction
            if (currentPage.includes('/pricing') || currentPage.includes('buy-evaluation')) {
                trackEvent(VoiceEvents.LED_TO_PRICING, { from: 'voice_ai' });
            } else if (currentPage.includes('/signup')) {
                trackEvent(VoiceEvents.LED_TO_SIGNUP, { from: 'voice_ai' });
            } else if (currentPage.includes('/checkout')) {
                trackEvent(VoiceEvents.LED_TO_CHECKOUT, { from: 'voice_ai' });
            }
        }
    }, [currentPage]);

    const handleStart = () => {
        if (!VAPI_CONFIG.publicKey || !VAPI_CONFIG.assistantId || !vapiRef.current) {
            console.error('Vapi not configured');
            return;
        }

        // Build context for the AI
        const context = {
            currentPage,
            timeOnPage: `${timeOnPage} seconds`,
            scrollDepth: `${scrollDepth}%`,
        };

        vapiRef.current.start(VAPI_CONFIG.assistantId, {
            variableValues: context,
        });
    };

    const handleStop = () => {
        if (vapiRef.current) {
            vapiRef.current.stop();
        }
    };

    if (!VAPI_CONFIG.publicKey) {
        return null; // Don't render if not configured
    }

    return (
        <>
            {/* Auto-prompt bubble */}
            <AnimatePresence>
                {showPrompt && !isSessionActive && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="fixed bottom-28 right-6 z-50 bg-[#2E81FF] text-white px-6 py-3 rounded-2xl shadow-2xl max-w-xs"
                    >
                        <button
                            onClick={() => {
                                setShowPrompt(false);
                                trackEvent(VoiceEvents.PROMPT_DISMISSED, { page: currentPage });
                            }}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-white text-black rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
                        >
                            <X className="w-3 h-3" />
                        </button>
                        <p className="text-sm font-medium">
                            Still have questions? Try asking our AI assistant!
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main voice button */}
            <motion.button
                onClick={isSessionActive ? handleStop : handleStart}
                className={`fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${isSessionActive
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-[#2E81FF] hover:bg-[#2563EB]'
                    }`}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                animate={isSpeechActive ? { scale: [1, 1.1, 1] } : {}}
                transition={isSpeechActive ? { repeat: Infinity, duration: 1 } : {}}
            >
                {isSessionActive ? (
                    <MicOff className="w-6 h-6 text-white" />
                ) : (
                    <Mic className="w-6 h-6 text-white" />
                )}

                {/* Pulsing ring when active */}
                {isSessionActive && (
                    <motion.div
                        className="absolute inset-0 rounded-full border-2 border-white"
                        animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                    />
                )}
            </motion.button>

            {/* Status indicator */}
            <AnimatePresence>
                {isSessionActive && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="fixed bottom-24 right-6 z-50 bg-black/80 backdrop-blur-lg text-white px-4 py-2 rounded-full text-xs font-medium flex items-center gap-2"
                    >
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        {isSpeechActive ? 'Listening...' : 'Tap to speak'}
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
