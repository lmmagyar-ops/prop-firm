// Recharts tooltip types for admin components
export interface TooltipPayloadItem {
    value: number;
    name: string;
    color?: string;
    payload?: Record<string, unknown>;
    dataKey?: string;
}

export interface CustomTooltipProps {
    active?: boolean;
    payload?: TooltipPayloadItem[];
    label?: string;
}
