import {
    asMarketQuestion,
    asEventTitle,
    asOutcomeLabel,
    looksLikeFullQuestion,
    assertFullQuestion,
    type MarketQuestion,
    type EventTitle,
    type OutcomeLabel,
} from './display-types';

describe('display-types', () => {
    describe('Type Constructors', () => {
        it('asMarketQuestion creates branded type', () => {
            const result = asMarketQuestion('Will Bitcoin reach $100k?');
            expect(result).toBe('Will Bitcoin reach $100k?');
            // Type assertion - compiles if type is correct
            const _typed: MarketQuestion = result;
            expect(_typed).toBeDefined();
        });

        it('asEventTitle creates branded type', () => {
            const result = asEventTitle('Super Bowl Champion 2026');
            expect(result).toBe('Super Bowl Champion 2026');
            const _typed: EventTitle = result;
            expect(_typed).toBeDefined();
        });

        it('asOutcomeLabel creates branded type', () => {
            const result = asOutcomeLabel('Pittsburgh Steelers');
            expect(result).toBe('Pittsburgh Steelers');
            const _typed: OutcomeLabel = result;
            expect(_typed).toBeDefined();
        });

        it('preserves empty strings', () => {
            expect(asMarketQuestion('')).toBe('');
            expect(asEventTitle('')).toBe('');
            expect(asOutcomeLabel('')).toBe('');
        });

        it('preserves whitespace', () => {
            expect(asMarketQuestion('  spaced  ')).toBe('  spaced  ');
        });
    });

    describe('looksLikeFullQuestion', () => {
        it('returns true for questions with ?', () => {
            expect(looksLikeFullQuestion('Will Bitcoin reach $100k?')).toBe(true);
            expect(looksLikeFullQuestion('Who wins?')).toBe(true);
        });

        it('returns true for questions starting with Will', () => {
            expect(looksLikeFullQuestion('Will the Steelers win')).toBe(true);
            expect(looksLikeFullQuestion('will it happen')).toBe(true); // case insensitive
        });

        it('returns false for short labels', () => {
            expect(looksLikeFullQuestion('Pittsburgh Steelers')).toBe(false);
            expect(looksLikeFullQuestion('Kevin Warsh')).toBe(false);
            expect(looksLikeFullQuestion('Above 100')).toBe(false);
        });

        it('returns false for empty strings', () => {
            expect(looksLikeFullQuestion('')).toBe(false);
        });
    });

    describe('assertFullQuestion', () => {
        it('returns the string as MarketQuestion', () => {
            const result = assertFullQuestion('Will Bitcoin reach $100k?', 'test');
            expect(result).toBe('Will Bitcoin reach $100k?');
            const _typed: MarketQuestion = result;
            expect(_typed).toBeDefined();
        });

        it('does not throw for valid questions', () => {
            expect(() => assertFullQuestion('Will the Steelers win?', 'card')).not.toThrow();
        });

        it('handles short strings without throwing (logs warning in dev)', () => {
            // In test env, should not throw - just potentially log
            expect(() => assertFullQuestion('GOP', 'context')).not.toThrow();
        });

        it('accepts long strings even without question marks', () => {
            const longString = 'The Pittsburgh Steelers will play in the Super Bowl this year as favorites';
            expect(() => assertFullQuestion(longString, 'test')).not.toThrow();
        });
    });

    describe('Type Safety (compile-time)', () => {
        // These tests verify the types work at compile time
        // If TypeScript compilation fails, these tests fail

        it('branded types are string-compatible at runtime', () => {
            const question: MarketQuestion = asMarketQuestion('test');
            const title: EventTitle = asEventTitle('test');
            const label: OutcomeLabel = asOutcomeLabel('test');

            // All should be usable as strings
            expect(question.length).toBe(4);
            expect(title.toUpperCase()).toBe('TEST');
            expect(label.split('')).toEqual(['t', 'e', 's', 't']);
        });
    });
});
