/**
 * Type-safe error message extraction.
 *
 * Used in catch blocks to safely access `.message` from `unknown` errors.
 * Eliminates the need for `catch (error: any)` throughout the codebase.
 *
 * Usage:
 *   catch (error: unknown) {
 *     return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
 *   }
 */
export function getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    return 'An unexpected error occurred';
}

/**
 * Type-safe error name extraction.
 *
 * Usage:
 *   if (getErrorName(error) === 'AbortError') { ... }
 */
export function getErrorName(error: unknown): string | undefined {
    if (error instanceof Error) return error.name;
    return undefined;
}
