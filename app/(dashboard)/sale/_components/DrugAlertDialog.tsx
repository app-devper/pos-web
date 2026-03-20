"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export function DrugAlertDialog({
    open,
    onOpenChange,
    alerts,
}: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    alerts: { productAName: string; productBName: string; interaction: string }[];
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="h-5 w-5" />พบปฏิกิริยาระหว่างยา
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-2">
                    {alerts.map((a, i) => (
                        <div key={i} className="rounded-md bg-destructive/10 p-3 text-sm">
                            <p className="font-medium">{a.productAName} × {a.productBName}</p>
                            <p className="text-xs text-muted-foreground mt-1">ปฏิกิริยา: {a.interaction}</p>
                        </div>
                    ))}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>รับทราบ</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
