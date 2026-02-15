import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

interface TimelinePoint {
    balance: number;
}

interface TradeRow {
    createdAt: string | Date;
    marketId: string;
    side: string;
    pnl: string | number;
}

interface ReportData {
    challenge: { userName: string; email: string; status: string; currentBalance: string | number };
    stats: { totalTrades: number; winRate: number | null };
    timeline: TimelinePoint[];
    trades: TradeRow[];
}

export const generateTraderReport = (data: ReportData) => {
    const { challenge, stats, trades } = data;
    const doc = new jsPDF();

    // -- Header --
    doc.setFontSize(20);
    doc.text("Trader Performance Report", 14, 22);

    doc.setFontSize(10);
    doc.text(`Generated on: ${format(new Date(), "MMM d, yyyy h:mm a")}`, 14, 30);

    // -- Trader Info --
    doc.setFontSize(12);
    doc.text(`Trader: ${challenge.userName}`, 14, 45);
    doc.text(`Email: ${challenge.email}`, 14, 52);
    doc.text(`Status: ${challenge.status.toUpperCase()}`, 14, 59);
    doc.text(`Account Balance: $${Number(challenge.currentBalance).toFixed(2)}`, 14, 66);

    // -- Performance Stats --
    doc.setFontSize(14);
    doc.text("Performance Metrics", 14, 85);

    const statsData = [
        ["Total Trades", stats.totalTrades.toString()],
        ["Win Rate", stats.winRate !== null ? `${stats.winRate.toFixed(1)}%` : '—'],
        ["Equity Peak", `$${Math.max(...data.timeline.map((t: TimelinePoint) => t.balance)).toFixed(2)}`],
    ];

    autoTable(doc, {
        startY: 90,
        head: [['Metric', 'Value']],
        body: statsData,
        theme: 'striped',
        headStyles: { fillColor: [22, 163, 74] }, // Green
        styles: { fontSize: 10 }
    });

    // -- Trade History --
    const finalY = ((doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY) + 15;
    doc.setFontSize(14);
    doc.text("Trade History", 14, finalY);

    const tradeRows = trades.map((t: TradeRow) => [
        format(new Date(t.createdAt), "MMM d, HH:mm"),
        t.marketId,
        t.side,
        `$${Number(t.pnl).toFixed(2)}`
    ]);

    autoTable(doc, {
        startY: finalY + 5,
        head: [['Date', 'Market', 'Side', 'P&L']],
        body: tradeRows,
        theme: 'grid',
        headStyles: { fillColor: [40, 40, 40] },
        styles: { fontSize: 9 }
    });

    doc.save(`trader_report_${challenge.userName.replace(/\s+/g, '_')}.pdf`);
};
