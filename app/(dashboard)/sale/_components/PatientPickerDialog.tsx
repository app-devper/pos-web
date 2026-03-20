"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PatientPickerContent } from "./PatientPickerContent";
import type { Patient } from "@/types/pos";

export function PatientPickerDialog({
    open,
    onOpenChange,
    onSelect,
}: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    onSelect: (patient: Patient) => void;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>เลือกผู้ป่วย</DialogTitle></DialogHeader>
                <PatientPickerContent onSelect={onSelect} />
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>ยกเลิก</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
