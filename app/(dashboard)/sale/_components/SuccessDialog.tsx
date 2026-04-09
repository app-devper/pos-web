"use client";

import { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tag } from "lucide-react";
import type { Order, OrderPayment } from "@/types/pos";
import { fmt } from "../_utils";

const PAYMENT_LABEL: Record<OrderPayment["type"], string> = {
    CASH: "เงินสด",
    PROMPTPAY: "พร้อมเพย์",
};

export function SuccessDialog({
    open,
    onOpenChange,
    order,
    payments,
    change,
    prescriptionLabelEnabled,
    onPrintLabel,
}: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    order: Order | null;
    payments: OrderPayment[];
    change: number;
    prescriptionLabelEnabled: boolean;
    onPrintLabel: (orderId: string, size: "8x5" | "5x3") => void;
}) {
    const paymentsTotal = useMemo(
        () => payments.reduce((sum, payment) => sum + payment.amount, 0),
        [payments]
    );
    const displayTotal = order?.total ?? Math.max(0, paymentsTotal - change);
    const displayCode = order?.code || order?.id || "-";

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle>บันทึกคำสั่งซื้อสำเร็จ</DialogTitle>
                    <DialogDescription>
                        ตรวจสอบเลขที่คำสั่งซื้อและยอดรับชำระก่อนปิดหน้าต่างนี้
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-2 text-sm">
                    <p className="text-muted-foreground">เลขที่คำสั่งซื้อ</p>
                    <p className="font-mono font-semibold">{displayCode}</p>
                    <p className="text-muted-foreground">ยอดรวม</p>
                    <p className="font-semibold text-primary text-lg">฿{fmt(displayTotal)}</p>
                    {payments.length > 0 && (
                        <>
                            <p className="text-muted-foreground pt-1">การชำระเงิน</p>
                            <div className="space-y-1">
                                {payments.map((payment, index) => (
                                    <div key={`${payment.type}-${index}`} className="flex items-center justify-between rounded-md border px-2.5 py-2">
                                        <span>{PAYMENT_LABEL[payment.type] ?? payment.type}{payments.length > 1 ? ` ${index + 1}` : ""}</span>
                                        <span className="font-medium tabular-nums">฿{fmt(payment.amount)}</span>
                                    </div>
                                ))}
                            </div>
                            {change > 0 && (
                                <>
                                    <p className="text-muted-foreground">เงินทอน</p>
                                    <p className="font-medium tabular-nums text-emerald-600">฿{fmt(change)}</p>
                                </>
                            )}
                        </>
                    )}
                </div>
                <DialogFooter className="flex-col gap-2 sm:flex-col">
                    {prescriptionLabelEnabled && order?.id && (
                        <div className="flex gap-2 w-full">
                            <Button variant="outline" className="flex-1 text-xs" onClick={() => onPrintLabel(order.id, "8x5")}>
                                <Tag className="h-3.5 w-3.5 mr-1" />ฉลากยา 8×5 cm
                            </Button>
                            <Button variant="outline" className="flex-1 text-xs" onClick={() => onPrintLabel(order.id, "5x3")}>
                                <Tag className="h-3.5 w-3.5 mr-1" />ฉลากยา 5×3 cm
                            </Button>
                        </div>
                    )}
                    <Button onClick={() => onOpenChange(false)} className="w-full">ปิด</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
