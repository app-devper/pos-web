"use client";

import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Minus, Plus } from "lucide-react";
import { CartItem } from "../_types";
import { CUSTOMER_TYPE_LABEL, fmt } from "../_utils";

export function CartItemDialog({
    item,
    onClose,
    onConfirm,
    onRemove,
}: {
    item: CartItem;
    onClose: () => void;
    onConfirm: (updated: Partial<CartItem>) => void;
    onRemove: () => void;
}) {
    const p = item.productRef;
    const units = p?.units ?? [];
    const stocks = p?.stocks ?? [];
    const prices = p?.prices ?? [];
    const [quantity, setQuantity] = useState(item.quantity);
    const [unitId, setUnitId] = useState(item.unitId);
    const pricedStocks = useMemo(() => (p?.stocks ?? []).filter((stock) => (stock.price ?? 0) > 0), [p?.stocks]);
    const initialStockId = item.selectedStockId ?? pricedStocks[0]?.id ?? p?.stocks?.[0]?.id ?? "";
    const [selectedStockId, setSelectedStockId] = useState(initialStockId);
    const initialSelectedStockPriceId = item.priceLabel === "สต๊อก"
        ? pricedStocks.find((stock) => stock.price === item.price)?.id ?? ""
        : "";
    const initPriceId = initialSelectedStockPriceId
        ? ""
        : prices.find((pr) => pr.price === item.price)?.id ?? prices.find((pr) => pr.customerType === "General")?.id ?? prices[0]?.id ?? "";
    const [selectedPriceId, setSelectedPriceId] = useState(initPriceId);
    const [selectedStockPriceId, setSelectedStockPriceId] = useState(initialSelectedStockPriceId);
    const [price, setPrice] = useState(item.price);
    const [discountPct, setDiscountPct] = useState(item.discountPct ?? 0);
    const [discountAmt, setDiscountAmt] = useState(item.discountAmt ?? 0);

    const selectedStock = stocks.find((s) => s.id === selectedStockId);
    const selectedUnit = units.find((u) => u.id === unitId);
    const selectedPriceSource = selectedStockPriceId ? `stock-price:${selectedStockPriceId}` : selectedPriceId ? `price:${selectedPriceId}` : "";

    const selectedPriceObj = prices.find((pr) => pr.id === selectedPriceId);
    const selectedStockPrice = pricedStocks.find((stock) => stock.id === selectedStockPriceId);
    const priceLabel = selectedStockPrice?.price && selectedStockPrice.price > 0
        ? "สต๊อก"
        : selectedPriceObj
        ? (CUSTOMER_TYPE_LABEL[selectedPriceObj.customerType] ?? selectedPriceObj.customerType)
        : "หน้าร้าน";

    function handlePriceChange(id: string) {
        setSelectedStockPriceId("");
        setSelectedPriceId(id);
        const found = prices.find((pr) => pr.id === id);
        if (found) setPrice(found.price);
    }

    function handleStockPriceChange(stockId: string) {
        setSelectedStockPriceId(stockId);
        setSelectedPriceId("");
        const found = pricedStocks.find((stock) => stock.id === stockId);
        if (found?.price && found.price > 0) setPrice(found.price);
    }

    function handleStockChange(stockId: string) {
        setSelectedStockId(stockId);
    }

    function handlePriceSourceChange(value: string) {
        if (value.startsWith("stock-price:")) {
            handleStockPriceChange(value.replace("stock-price:", ""));
            return;
        }
        if (value.startsWith("price:")) {
            handlePriceChange(value.replace("price:", ""));
        }
    }

    function handleConfirm() {
        const newStocks = stocks.map((s) => ({ stockId: s.id, quantity: s.quantity }));
        onConfirm({ quantity, unitId, unit: selectedUnit?.unit || item.unit || "ชิ้น", price, selectedStockId, discountPct, discountAmt, stocks: newStocks, priceLabel });
    }

    return (
        <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
            <DialogContent className="max-w-sm p-0 gap-0 overflow-hidden">
                <DialogTitle className="sr-only">{item.name}</DialogTitle>
                {/* Header */}
                <div className="flex items-center justify-center px-4 py-3 border-b">
                    <div className="font-semibold text-sm truncate">{item.name}</div>
                </div>

                <div className="divide-y">
                    {/* จำนวนสินค้า */}
                    <div className="flex items-center justify-between px-4 py-3">
                        <span className="text-sm font-medium">จำนวนสินค้า</span>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">{quantity} {selectedUnit?.unit || item.unit || "ชิ้น"}</span>
                            <div className="flex items-center gap-1">
                                <button aria-label="ลดจำนวน" onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="h-6 w-6 rounded-full bg-destructive/15 text-destructive flex items-center justify-center">
                                    <Minus className="h-3 w-3" />
                                </button>
                                <span className="w-6 text-center text-sm font-medium">{quantity}</span>
                                <button aria-label="เพิ่มจำนวน" onClick={() => setQuantity((q) => q + 1)} className="h-6 w-6 rounded-full bg-primary/15 text-primary flex items-center justify-center">
                                    <Plus className="h-3 w-3" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* หน่วยนับ */}
                    {units.length > 0 && (
                        <div className="flex items-center justify-between px-4 py-3">
                            <span className="text-sm font-medium">หน่วยนับ</span>
                            <Select value={unitId} onValueChange={setUnitId}>
                                <SelectTrigger className="w-36 h-8 text-sm border-0 pr-0 justify-end gap-1 shadow-none focus:ring-0">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {units.map((u) => (
                                        <SelectItem key={u.id} value={u.id}>{u.unit || "ชิ้น"}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* สต็อก */}
                    {pricedStocks.length > 0 && (
                        <div className="px-4 py-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">สต็อก</span>
                                <Select value={selectedStockId} onValueChange={handleStockChange}>
                                    <SelectTrigger className="w-40 h-8 text-sm border-0 pr-0 justify-end gap-1 shadow-none focus:ring-0">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {pricedStocks.map((s) => (
                                            <SelectItem key={s.id} value={s.id}>
                                                {s.importDate ? new Date(s.importDate).toLocaleDateString("th-TH", { day: "2-digit", month: "2-digit", year: "2-digit" }) : s.id.slice(-6)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            {selectedStock?.price && selectedStock.price > 0 && (
                                <p className="text-xs text-primary mt-1">จำนวนที่นำเข้า {selectedStock.quantity} {selectedUnit?.unit || item.unit || "ชิ้น"}</p>
                            )}
                        </div>
                    )}

                    {/* ราคาสินค้า */}
                    <div className="px-4 py-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">ราคาสินค้า</span>
                            <Select value={selectedPriceSource} onValueChange={handlePriceSourceChange}>
                                <SelectTrigger className="w-44 h-8 text-sm border-0 pr-0 justify-end gap-1 shadow-none focus:ring-0">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {pricedStocks.map((s) => (
                                        <SelectItem key={s.id} value={`stock-price:${s.id}`}>
                                            ฿{fmt(s.price ?? 0)} สต๊อก {s.importDate ? `(${new Date(s.importDate).toLocaleDateString("th-TH", { day: "2-digit", month: "2-digit", year: "2-digit" })})` : ""}
                                        </SelectItem>
                                    ))}
                                    {prices.filter((pr) => pr.price > 0).map((pr) => {
                                        const label = CUSTOMER_TYPE_LABEL[pr.customerType] ?? pr.customerType;
                                        return <SelectItem key={pr.id} value={`price:${pr.id}`}>฿{fmt(pr.price)} {label}</SelectItem>;
                                    })}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* ส่วนลด % */}
                    <div className="px-4 py-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">ส่วนลดสินค้า (%)</span>
                            <div className="flex items-center gap-2">
                                {discountPct > 0 ? (
                                    <span className="text-sm text-destructive">-{discountPct}%</span>
                                ) : (
                                    <span className="text-sm text-muted-foreground">-</span>
                                )}
                                <Input
                                    type="number"
                                    min={0}
                                    max={100}
                                    value={discountPct === 0 ? "" : discountPct}
                                    onChange={(e) => setDiscountPct(parseFloat(e.target.value) || 0)}
                                    className="h-7 w-16 text-xs text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    placeholder="0"
                                />
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">คำนวณต่อหนึ่งหน่วย</p>
                    </div>

                    {/* ส่วนลด ฿ */}
                    <div className="px-4 py-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">ส่วนลดสินค้า (฿)</span>
                            <div className="flex items-center gap-2">
                                {discountAmt > 0 ? (
                                    <span className="text-sm text-destructive">-฿{fmt(discountAmt)}</span>
                                ) : (
                                    <span className="text-sm text-muted-foreground">-</span>
                                )}
                                <Input
                                    type="number"
                                    min={0}
                                    value={discountAmt === 0 ? "" : discountAmt}
                                    onChange={(e) => setDiscountAmt(parseFloat(e.target.value) || 0)}
                                    className="h-7 w-16 text-xs text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    placeholder="0"
                                />
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">คำนวณต่อหนึ่งหน่วย</p>
                    </div>
                </div>

                {/* Bottom buttons */}
                <div className="px-4 py-3 border-t">
                    <div className="flex gap-2">
                        <Button variant="destructive" className="flex-1" onClick={onRemove}>ยกเลิกสินค้า</Button>
                        <Button className="flex-1" onClick={handleConfirm}>ยืนยัน</Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
