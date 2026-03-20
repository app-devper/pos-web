"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tag, Trash2 } from "lucide-react";
import { fmt } from "../_utils";

export function PromotionDialog({
    open,
    onOpenChange,
    promoCode,
    onPromoCodeChange,
    promoName,
    promoDiscount,
    promoLoading,
    onApply,
    onClear,
}: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    promoCode: string;
    onPromoCodeChange: (v: string) => void;
    promoName: string;
    promoDiscount: number;
    promoLoading: boolean;
    onApply: () => void;
    onClear: () => void;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Tag className="h-5 w-5" aria-hidden="true" />โปรโมชัน
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    {promoName ? (
                        <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 rounded-lg px-4 py-3">
                            <div>
                                <p className="text-sm font-medium text-green-700 dark:text-green-400">{promoName}</p>
                                <p className="text-sm text-green-600 dark:text-green-500">ลด ฿{fmt(promoDiscount)}</p>
                            </div>
                            <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-foreground" onClick={onClear} aria-label="ลบโปรโมชัน">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <Label htmlFor="promo-code">รหัสโปรโมชัน</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="promo-code"
                                    name="promoCode"
                                    autoComplete="off"
                                    value={promoCode}
                                    onChange={(e) => onPromoCodeChange(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && onApply()}
                                    placeholder="กรอกรหัสโปรโมชัน…"
                                    autoFocus
                                />
                                <Button onClick={onApply} disabled={promoLoading || !promoCode.trim()}>
                                    {promoLoading ? "กำลังตรวจ…" : "ใช้โค้ด"}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>ปิด</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
