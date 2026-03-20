"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";

export function AllergyAlertDialog({
    open,
    onOpenChange,
    alerts,
}: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    alerts: string[];
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-orange-600">
                        <Heart className="h-5 w-5" />แจ้งเตือนการแพ้ยา
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">ผู้ป่วยอาจแพ้ยาต่อไปนี้:</p>
                    {alerts.map((name, i) => (
                        <div key={i} className="rounded-md bg-orange-100 dark:bg-orange-900/20 p-2 text-sm font-medium">{name}</div>
                    ))}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>รับทราบ</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
