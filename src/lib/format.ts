// Fix #8: Price formatting utility to ensure consistency across components
export function formatPrice(price: number): string {
    return `${(price * 100).toFixed(1)}¢`;
}
