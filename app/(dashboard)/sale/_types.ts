import type { ProductDetail } from "@/types/pos";

export interface CartItem {
    productId: string;
    name: string;
    price: number;
    originalPrice: number;
    costPrice: number;
    quantity: number;
    unit: string;
    unitId: string;
    stocks: { stockId: string; quantity: number }[];
    selectedStockId?: string;
    discountPct?: number;
    discountAmt?: number;
    priceLabel?: string;
    productRef?: ProductDetail;
}

export interface CartTab {
    cart: CartItem[];
    discount: number;
    customerCode: string;
    customerName: string;
}

export const EMPTY_TAB: CartTab = { cart: [], discount: 0, customerCode: "", customerName: "" };
export const MAX_TABS = 6;
