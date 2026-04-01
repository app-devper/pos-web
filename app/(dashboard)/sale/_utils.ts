import type { CartItem } from "./_types";

const numberFmt = new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2 });
export const fmt = (n: number) => numberFmt.format(n);

export const CUSTOMER_TYPE_LABEL: Record<string, string> = {
    General: "ทั่วไป",
    Regular: "ประจำ",
    Wholesaler: "ขายส่ง",
};

export const CUSTOMER_TYPES = [
    { value: "General", label: "ทั่วไป" },
    { value: "Regular", label: "ประจำ" },
    { value: "Wholesaler", label: "ขายส่ง" },
];

export function buildOrderItemStocks(item: CartItem) {
    let remaining = item.quantity;
    const prioritizedStocks = [...(item.stocks ?? [])].sort((a, b) => {
        if (item.selectedStockId) {
            if (a.stockId === item.selectedStockId) return -1;
            if (b.stockId === item.selectedStockId) return 1;
        }
        return 0;
    });

    return prioritizedStocks
        .map((stock) => {
            if (remaining <= 0) return null;
            const usedQty = Math.min(stock.quantity, remaining);
            if (usedQty <= 0) return null;
            remaining -= usedQty;
            return { stockId: stock.stockId, quantity: usedQty };
        })
        .filter((stock): stock is { stockId: string; quantity: number } => Boolean(stock));
}

export function resolveOrderItemCostPrice(item: CartItem) {
    const allocations = buildOrderItemStocks(item);
    const stockMap = new Map((item.productRef?.stocks ?? []).map((stock) => [stock.id, stock]));

    const totalAllocated = allocations.reduce((sum, stock) => sum + stock.quantity, 0);
    if (totalAllocated <= 0) return item.costPrice ?? 0;

    const totalCost = allocations.reduce((sum, allocation) => {
        const stock = stockMap.get(allocation.stockId);
        return sum + ((stock?.costPrice ?? item.costPrice ?? 0) * allocation.quantity);
    }, 0);

    return totalCost / totalAllocated;
}
