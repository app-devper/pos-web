"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function DiscountDialog({
    open,
    onOpenChange,
    discount,
    onDiscountChange,
    subtotal,
}: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    discount: number;
    onDiscountChange: (v: number) => void;
    subtotal: number;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xs">
                <DialogHeader>
                    <DialogTitle>ส่วนลดท้ายบิล</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                    <div className="space-y-1">
                        <Label htmlFor="bill-discount">จำนวนเงินส่วนลด (฿)</Label>
                        <Input
                            id="bill-discount"
                            name="discount"
                            type="number"
                            min={0}
                            value={discount === 0 ? "" : discount}
                            onChange={(e) => onDiscountChange(parseFloat(e.target.value) || 0)}
                            className="text-right text-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            placeholder="0.00"
                            autoFocus
                        />
                    </div>
                    {discount > 0 && subtotal > 0 && (
                        <p className="text-xs text-muted-foreground text-right">
                            คิดเป็น {((discount / subtotal) * 100).toFixed(1)}% ของราคาสินค้า
                        </p>
                    )}
                </div>
                <DialogFooter>
                    {discount > 0 && (
                        <Button variant="outline" onClick={() => { onDiscountChange(0); onOpenChange(false); }}>ล้างส่วนลด</Button>
                    )}
                    <Button onClick={() => onOpenChange(false)}>ตกลง</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
