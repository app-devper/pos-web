import { useState, useEffect, useCallback, useRef } from "react";
import type { CartItem, CartTab } from "../_types";
import { EMPTY_TAB, MAX_TABS } from "../_types";
import type { ProductDetail } from "@/types/pos";
import { CUSTOMER_TYPE_LABEL } from "../_utils";

function resolveSelectedStock(p: ProductDetail) {
    return p.stocks?.find((stock) => (stock.price ?? 0) > 0) ?? p.stocks?.[0];
}

export function resolvePrice(p: ProductDetail): { price: number; priceLabel: string } {
    const selectedStock = resolveSelectedStock(p);
    if (selectedStock?.price && selectedStock.price > 0) return { price: selectedStock.price, priceLabel: "ราคาสต๊อก" };
    const generalPrice = p.prices?.find((pr) => pr.customerType === "General" || pr.customerType === "GENERAL");
    if (generalPrice && generalPrice.price > 0) return { price: generalPrice.price, priceLabel: "หน้าร้าน" };
    const anyPrice = p.prices?.find((pr) => pr.price > 0);
    if (anyPrice) return { price: anyPrice.price, priceLabel: CUSTOMER_TYPE_LABEL[anyPrice.customerType] ?? anyPrice.customerType };
    return { price: p.price, priceLabel: "หน้าร้าน" };
}

function resolveCostPrice(p: ProductDetail): number {
    const firstStock = resolveSelectedStock(p);
    if (firstStock?.costPrice && firstStock.costPrice > 0) return firstStock.costPrice;
    return p.costPrice;
}

function loadTabs(): CartTab[] {
    if (typeof window === "undefined") return [{ ...EMPTY_TAB }];
    try {
        const s = sessionStorage.getItem("sale_tabs");
        if (s) {
            const parsed = JSON.parse(s);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
    } catch (e) {
        console.error("Failed to load sale_tabs from sessionStorage:", e);
    }
    return [{ ...EMPTY_TAB }];
}

function loadActiveTab(): number {
    if (typeof window === "undefined") return 0;
    try { return Number(sessionStorage.getItem("sale_activeTab")) || 0; } catch { return 0; }
}

const SALE_TABS_STORAGE_DEBOUNCE_MS = 150;

export function useCart(products: ProductDetail[]) {
    const [tabs, setTabs] = useState<CartTab[]>(loadTabs);
    const [activeTab, setActiveTab] = useState(loadActiveTab);

    const currentTab = tabs[activeTab] ?? EMPTY_TAB;
    const cart = currentTab.cart;
    const discount = currentTab.discount;
    const customerCode = currentTab.customerCode;
    const customerName = currentTab.customerName;

    const activeTabRef = useRef(activeTab);
    const persistTabsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);

    const setCart = useCallback((updater: CartItem[] | ((prev: CartItem[]) => CartItem[])) => {
        setTabs((prev) => prev.map((t, i) => i === activeTabRef.current ? { ...t, cart: typeof updater === "function" ? updater(t.cart) : updater } : t));
    }, []);
    const setDiscount = useCallback((val: number | ((prev: number) => number)) => {
        setTabs((prev) => prev.map((t, i) => i === activeTabRef.current ? { ...t, discount: typeof val === "function" ? val(t.discount) : val } : t));
    }, []);
    const setCustomerCode = useCallback((val: string) => {
        setTabs((prev) => prev.map((t, i) => i === activeTabRef.current ? { ...t, customerCode: val } : t));
    }, []);
    const setCustomerName = useCallback((val: string) => {
        setTabs((prev) => prev.map((t, i) => i === activeTabRef.current ? { ...t, customerName: val } : t));
    }, []);

    // Hydrate productRef from loaded products
    useEffect(() => {
        if (products.length === 0) return;
        const productById = new Map(products.map((p) => [p.id, p]));
        // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing external product data into cart state is intentional
        setTabs((prev) => prev.map((tab) => {
            const needsHydration = tab.cart.some((i) => !i.productRef);
            if (!needsHydration) return tab;
            return {
                ...tab, cart: tab.cart.map((i) => {
                    if (i.productRef) return i;
                    const p = productById.get(i.productId);
                    return p ? { ...i, productRef: p } : i;
                })
            };
        }));
    }, [products]);

    // Sync to sessionStorage
    useEffect(() => {
        if (persistTabsTimeoutRef.current) clearTimeout(persistTabsTimeoutRef.current);
        persistTabsTimeoutRef.current = setTimeout(() => {
            try {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const toStore = tabs.map((t) => ({ ...t, cart: t.cart.map(({ productRef: _ref, ...rest }) => rest) }));
                sessionStorage.setItem("sale_tabs", JSON.stringify(toStore));
            } catch (e) {
                console.error("Failed to persist sale_tabs to sessionStorage:", e);
            }
        }, SALE_TABS_STORAGE_DEBOUNCE_MS);

        return () => {
            if (persistTabsTimeoutRef.current) {
                clearTimeout(persistTabsTimeoutRef.current);
                persistTabsTimeoutRef.current = null;
            }
        };
    }, [tabs]);

    useEffect(() => {
        try { sessionStorage.setItem("sale_activeTab", String(activeTab)); } catch (e) {
            console.error("Failed to persist active tab:", e);
        }
    }, [activeTab]);

    const addToCart = useCallback((p: ProductDetail) => {
        setCart((prev) => {
            const idx = prev.findIndex((i) => i.productId === p.id);
            if (idx >= 0) {
                const next = [...prev];
                next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
                return next;
            }
            const defaultUnit = p.units?.[0];
            const unitId = defaultUnit?.id ?? "";
            const stocks = (p.stocks ?? []).map((s) => ({ stockId: s.id, quantity: s.quantity }));
            const selectedStock = resolveSelectedStock(p);
            const { price, priceLabel } = resolvePrice(p);
            const costPrice = resolveCostPrice(p);
            return [...prev, { productId: p.id, name: p.name, price, originalPrice: price, costPrice, quantity: 1, unit: p.unit, unitId, stocks, selectedStockId: selectedStock?.id, priceLabel, productRef: p }];
        });
    }, [setCart]);

    const updateQty = useCallback((productId: string, delta: number) => {
        setCart((prev) =>
            prev
                .map((i) => i.productId === productId ? { ...i, quantity: i.quantity + delta } : i)
                .filter((i) => i.quantity > 0)
        );
    }, [setCart]);

    const removeFromCart = useCallback((productId: string) => {
        setCart((prev) => prev.filter((i) => i.productId !== productId));
    }, [setCart]);

    const updatePrice = useCallback((productId: string, price: number) => {
        setCart((prev) => prev.map((i) => i.productId === productId ? { ...i, price } : i));
    }, [setCart]);

    const clearCart = useCallback(() => {
        setTabs((prev) => prev.map((t, i) => i === activeTabRef.current ? { ...EMPTY_TAB } : t));
    }, []);

    const addTab = useCallback(() => {
        setTabs((prev) => {
            if (prev.length >= MAX_TABS) return prev;
            return [...prev, { ...EMPTY_TAB }];
        });
        setTabs((prev) => {
            setActiveTab(prev.length - 1);
            return prev;
        });
    }, []);

    const removeTab = useCallback((idx: number) => {
        setTabs((prev) => {
            if (prev.length <= 1) return prev;
            return prev.filter((_, i) => i !== idx);
        });
        setActiveTab((a) => Math.max(0, a >= idx && a > 0 ? a - 1 : a));
    }, []);

    return {
        tabs,
        activeTab,
        setActiveTab,
        currentTab,
        cart,
        setCart,
        discount,
        setDiscount,
        customerCode,
        setCustomerCode,
        customerName,
        setCustomerName,
        addToCart,
        updateQty,
        removeFromCart,
        updatePrice,
        clearCart,
        addTab,
        removeTab,
    };
}
