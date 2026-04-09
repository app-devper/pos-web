"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Banknote, QrCode, ChevronLeft, Delete, Plus, X } from "lucide-react";
import type { OrderPayment } from "@/types/pos";
import { fmt } from "../_utils";

const PAYMENT_TYPES: { value: OrderPayment["type"]; label: string; icon: React.ReactNode }[] = [
    { value: "CASH", label: "เงินสด", icon: <Banknote className="h-5 w-5" /> },
    { value: "PROMPTPAY", label: "พร้อมเพย์", icon: <QrCode className="h-5 w-5" /> },
];

const TYPE_LABEL: Record<string, string> = Object.fromEntries(PAYMENT_TYPES.map((t) => [t.value, t.label]));

export function PaymentDialog({
    open,
    onOpenChange,
    total,
    payments,
    paymentsTotal,
    onAddRow,
    onRemoveRow,
    onUpdateRow,
    onConfirm,
    submitting,
}: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    total: number;
    payments: { type: OrderPayment["type"]; amount: number }[];
    paymentsTotal: number;
    onAddRow: () => void;
    onRemoveRow: (idx: number) => void;
    onUpdateRow: (idx: number, field: "type" | "amount", value: string | number) => void;
    onConfirm: () => void;
    submitting: boolean;
}) {
    const [activeIdx, setActiveIdx] = useState(0);
    const activeRow = payments[activeIdx] ?? payments[0];
    const change = Math.max(0, paymentsTotal - total);
    const remainingForActive = Math.max(0, total - (paymentsTotal - (activeRow?.amount ?? 0)));

    const [inputBuf, setInputBuf] = useState("");
    const paymentsRef = useRef(payments);

    useEffect(() => {
        paymentsRef.current = payments;
    }, [payments]);

    useEffect(() => {
        if (!open) return;

        const timeoutId = window.setTimeout(() => {
            setActiveIdx(0);
            const amt = paymentsRef.current[0]?.amount ?? 0;
            setInputBuf(amt > 0 ? amt.toString() : "");
        }, 0);

        return () => window.clearTimeout(timeoutId);
    }, [open]);

    const flushBuf = useCallback((buf: string, idx: number, updater: typeof onUpdateRow) => {
        const val = parseFloat(buf) || 0;
        updater(idx, "amount", val);
    }, []);

    const setActiveAmount = useCallback((amount: number) => {
        const next = amount > 0 ? amount.toString() : "";
        setInputBuf(next);
        onUpdateRow(activeIdx, "amount", amount);
    }, [activeIdx, onUpdateRow]);

    function pressKey(key: string) {
        let next = inputBuf;
        if (key === "C") {
            next = "";
        } else if (key === "⌫") {
            next = inputBuf.slice(0, -1);
        } else if (key === ".") {
            if (!inputBuf.includes(".")) next = inputBuf + ".";
        } else {
            next = inputBuf + key;
        }
        setInputBuf(next);
        flushBuf(next, activeIdx, onUpdateRow);
    }

    function selectPaymentType(type: OrderPayment["type"]) {
        onUpdateRow(activeIdx, "type", type);
    }

    function switchRow(idx: number) {
        setActiveIdx(idx);
        const amt = payments[idx]?.amount ?? 0;
        setInputBuf(amt > 0 ? amt.toString() : "");
    }

    function handleAddRow() {
        onAddRow();
        const newIdx = payments.length;
        window.setTimeout(() => {
            setActiveIdx(newIdx);
            setInputBuf("");
        }, 0);
    }

    function handleRemoveActiveRow(idx: number) {
        const currentActiveIdx = activeIdx;
        onRemoveRow(idx);

        let nextIdx = currentActiveIdx;
        if (idx === currentActiveIdx) {
            nextIdx = Math.max(0, idx - 1);
        } else if (idx < currentActiveIdx) {
            nextIdx = currentActiveIdx - 1;
        }

        window.setTimeout(() => {
            switchRow(nextIdx);
        }, 0);
    }

    const KEYPAD = [
        ["7", "8", "9"],
        ["4", "5", "6"],
        ["1", "2", "3"],
        [".", "0", "⌫"],
    ];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[calc(100vw-2rem)] max-w-2xl p-0 gap-0 overflow-hidden border bg-background rounded-2xl [&>button]:hidden">
                <DialogTitle className="sr-only">ชำระสินค้า</DialogTitle>

                {/* ── Header ── */}
                <div className="relative flex items-center justify-center px-5 py-3.5 border-b">
                    <button
                        onClick={() => onOpenChange(false)}
                        className="absolute left-5 flex items-center gap-1 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    >
                        <ChevronLeft className="h-4 w-4" />ปิด
                    </button>
                    <h1 className="text-base font-semibold">ชำระสินค้า</h1>
                </div>

                <div className="p-4 space-y-3">
                    {payments.length > 1 && (
                        <div className="flex flex-wrap items-center gap-2">
                            {payments.map((payment, idx) => {
                                const isActiveRow = idx === activeIdx;
                                return (
                                    <div
                                        key={`${payment.type}-${idx}`}
                                        className={`flex items-center gap-1 rounded-full border px-2 py-1 ${isActiveRow ? "border-primary bg-primary/5" : "border-border bg-background"}`}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => switchRow(idx)}
                                            className={`rounded-full px-2 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${isActiveRow ? "text-primary" : "text-foreground"}`}
                                        >
                                            {TYPE_LABEL[payment.type] ?? payment.type} {idx + 1}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveActiveRow(idx)}
                                            aria-label={`ลบช่องทางชำระ ${idx + 1}`}
                                            className="rounded-full p-1 text-muted-foreground hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* ── Summary bar ── */}
                    <div className="rounded-2xl border bg-card grid grid-cols-2 divide-x overflow-hidden">
                        <div className="px-5 py-4">
                            <p className="text-sm text-muted-foreground">ชำระด้วย{TYPE_LABEL[activeRow?.type ?? "CASH"]}</p>
                            <p className="text-2xl font-bold tabular-nums mt-1">฿{inputBuf !== "" ? inputBuf : fmt(activeRow?.amount ?? 0)}</p>
                        </div>
                        <div className="px-5 py-4 text-right">
                            <p className="text-sm text-muted-foreground">ยอดรับเงินรวม</p>
                            <p className="text-3xl font-bold tabular-nums mt-1">฿{fmt(paymentsTotal)}</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Button type="button" size="sm" variant="outline" onClick={() => setActiveAmount(remainingForActive)}>
                            ใส่ยอดคงเหลือ
                        </Button>
                        <Button type="button" size="sm" variant="outline" onClick={() => setActiveAmount(total)}>
                            ใส่เต็มยอด
                        </Button>
                        <Button type="button" size="sm" variant="ghost" onClick={() => setActiveAmount(0)}>
                            ล้างยอดช่องนี้
                        </Button>
                        <span className="text-xs text-muted-foreground">
                            คงเหลืออีก ฿{fmt(Math.max(0, total - paymentsTotal))}
                        </span>
                    </div>

                    {/* ── ยอดชำระ / เงินทอน ── */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="rounded-2xl bg-blue-600 text-white px-5 py-3">
                            <p className="text-sm font-medium opacity-80">ยอดที่ต้องชำระ</p>
                            <p className="text-right text-2xl font-bold mt-2 tabular-nums">฿{fmt(total)}</p>
                        </div>
                        <div className="rounded-2xl bg-slate-700 text-white px-5 py-3">
                            <p className="text-sm font-medium opacity-80">ยังขาดอีก</p>
                            <p className="text-right text-2xl font-bold mt-2 tabular-nums">
                                ฿{fmt(Math.max(0, total - paymentsTotal))}
                            </p>
                        </div>
                        <div className={`rounded-2xl text-white px-5 py-3 ${change > 0 ? "bg-emerald-500" : "bg-orange-400"}`}>
                            <p className="text-sm font-medium opacity-80">เงินทอน</p>
                            <p className="text-right text-2xl font-bold mt-2 tabular-nums">
                                {change > 0 ? `฿${fmt(change)}` : "รับชำระพอดี"}
                            </p>
                        </div>
                    </div>

                    {/* ── Body ── */}
                    <div className="grid grid-cols-[220px_1fr] gap-3 items-start">

                        {/* Left: payment method list */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2 px-1">
                                <p className="text-xs text-muted-foreground">เลือกช่องทางชำระ</p>
                                <Button type="button" size="xs" variant="outline" onClick={handleAddRow}>
                                    <Plus className="h-3.5 w-3.5" />เพิ่มช่องทาง
                                </Button>
                            </div>
                            {PAYMENT_TYPES.map((pt) => {
                                const active = activeRow?.type === pt.value;
                                return (
                                    <button
                                        type="button"
                                        key={pt.value}
                                        onClick={() => selectPaymentType(pt.value)}
                                        className={`w-full rounded-xl border px-3 py-3 flex items-center gap-2.5 text-left transition-[color,background-color,border-color,box-shadow,opacity,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                                            active ? "border-primary ring-1 ring-primary bg-primary/5" : "bg-card hover:bg-accent"
                                        }`}
                                    >
                                        <div className={`h-7 w-7 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                            active ? "border-green-500 bg-green-500 text-white" : "border-muted-foreground/30"
                                        }`}>
                                            {active && <span className="text-xs font-bold leading-none">✓</span>}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {pt.icon}
                                            <span className={`text-sm font-semibold ${active ? "text-primary" : "text-foreground"}`}>{pt.label}</span>
                                        </div>
                                    </button>
                                );
                            })}

                        </div>

                        {/* Right: keypad + confirm */}
                        <div className="flex flex-col gap-2">
                            <div className="grid grid-cols-3 gap-1.5">
                                {KEYPAD.flat().map((key) => (
                                    <button
                                        type="button"
                                        key={key}
                                        onClick={() => pressKey(key)}
                                        className={`rounded-xl font-semibold flex items-center justify-center h-14 active:scale-95 transition-[color,background-color,border-color,box-shadow,opacity,transform] select-none text-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                                            key === "⌫"
                                                ? "text-muted-foreground hover:bg-accent border"
                                                : key === "."
                                                ? "text-foreground hover:bg-accent border bg-card"
                                                : "border bg-card hover:bg-accent shadow-sm"
                                        }`}
                                    >
                                        {key === "⌫" ? <Delete className="h-6 w-6" /> : key}
                                    </button>
                                ))}
                            </div>

                            <Button
                                onClick={onConfirm}
                                disabled={submitting || paymentsTotal < total}
                                className="h-14 rounded-2xl text-base font-bold w-full mt-1"
                            >
                                {submitting
                                    ? "กำลังบันทึก…"
                                    : change > 0
                                    ? `ยืนยันชำระ (ทอน ฿${fmt(change)})`
                                    : "รับชำระพอดี (ไม่มีเงินทอน)"}
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
