"use client";

import { useState, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Banknote, QrCode, Receipt, CreditCard, ChevronLeft, Plus, X, Delete } from "lucide-react";
import type { OrderPayment } from "@/types/pos";
import { fmt } from "../_utils";

const PAYMENT_TYPES: { value: OrderPayment["type"]; label: string; icon: React.ReactNode }[] = [
    { value: "CASH", label: "เงินสด", icon: <Banknote className="h-5 w-5" /> },
    { value: "CREDIT", label: "บัตรเครดิต", icon: <CreditCard className="h-5 w-5" /> },
    { value: "PROMPTPAY", label: "พร้อมเพย์", icon: <QrCode className="h-5 w-5" /> },
    { value: "TRANSFER", label: "โอนเงิน", icon: <Receipt className="h-5 w-5" /> },
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

    const [inputBuf, setInputBuf] = useState("");

    useEffect(() => {
        if (open) {
            setActiveIdx(0);
            const amt = payments[0]?.amount ?? 0;
            setInputBuf(amt > 0 ? amt.toString() : "");
        }
    }, [open]);

    const flushBuf = useCallback((buf: string, idx: number, updater: typeof onUpdateRow) => {
        const val = parseFloat(buf) || 0;
        updater(idx, "amount", val);
    }, []);

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

    function handleExactPay() {
        const remaining = Math.max(0, total - (paymentsTotal - (activeRow?.amount ?? 0)));
        onUpdateRow(activeIdx, "amount", remaining);
        setInputBuf(remaining.toString());
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
        setTimeout(() => switchRow(newIdx), 0);
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

                    {/* ── ยอดชำระ / เงินทอน ── */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-2xl bg-blue-600 text-white px-5 py-3">
                            <p className="text-sm font-medium opacity-80">ยอดที่ต้องชำระ</p>
                            <p className="text-right text-2xl font-bold mt-2 tabular-nums">฿{fmt(total)}</p>
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
                            <p className="text-xs text-muted-foreground px-1">สามารถแบ่งชำระได้หลายช่องทาง</p>
                            {PAYMENT_TYPES.map((pt) => {
                                const active = activeRow?.type === pt.value;
                                return (
                                    <button
                                        key={pt.value}
                                        onClick={() => selectPaymentType(pt.value)}
                                        className={`w-full rounded-xl border px-3 py-3 flex items-center gap-2.5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
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

                            <button
                                onClick={handleAddRow}
                                className="w-full rounded-xl border border-dashed px-3 py-2.5 flex items-center justify-center gap-2 text-xs text-muted-foreground hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                            >
                                <Plus className="h-3.5 w-3.5" />เพิ่มช่องทางชำระ
                            </button>

                            {payments.length > 1 && (
                                <div className="rounded-xl border bg-card p-2 space-y-1">
                                    {payments.map((row, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => switchRow(idx)}
                                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                                                idx === activeIdx ? "bg-primary/10 ring-1 ring-primary" : "hover:bg-accent"
                                            }`}
                                        >
                                            <span>{TYPE_LABEL[row.type]}</span>
                                            <div className="flex items-center gap-1.5">
                                                <span className="tabular-nums font-medium">฿{fmt(row.amount)}</span>
                                                <button
                                                    aria-label="ลบ"
                                                    className="rounded-sm text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                                                    onClick={(e) => { e.stopPropagation(); onRemoveRow(idx); if (activeIdx >= payments.length - 1) setActiveIdx(Math.max(0, payments.length - 2)); }}
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Right: keypad + confirm */}
                        <div className="flex flex-col gap-2">
                            <div className="grid grid-cols-3 gap-1.5">
                                {KEYPAD.flat().map((key) => (
                                    <button
                                        key={key}
                                        onClick={() => pressKey(key)}
                                        className={`rounded-xl font-semibold flex items-center justify-center h-14 active:scale-95 transition-all select-none text-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
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
