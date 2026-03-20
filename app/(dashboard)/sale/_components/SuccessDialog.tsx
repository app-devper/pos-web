"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tag } from "lucide-react";
import type { Order } from "@/types/pos";
import { fmt } from "../_utils";

export function SuccessDialog({
    open,
    onOpenChange,
    order,
    prescriptionLabelEnabled,
    onPrintLabel,
}: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    order: Order | null;
    prescriptionLabelEnabled: boolean;
    onPrintLabel: (orderId: string, size: "8x5" | "5x3") => void;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-sm">
                <DialogHeader><DialogTitle>บันทึกคำสั่งซื้อสำเร็จ</DialogTitle></DialogHeader>
                <div className="space-y-2 text-sm">
                    <p className="text-muted-foreground">เลขที่คำสั่งซื้อ</p>
                    <p className="font-mono font-semibold">{order?.code ?? "-"}</p>
                    <p className="text-muted-foreground">ยอดรวม</p>
                    <p className="font-semibold text-primary text-lg">฿{fmt(order?.total ?? 0)}</p>
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
