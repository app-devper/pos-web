"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";

export function ComplianceDialog({
    open,
    onOpenChange,
    pharmacist,
    onPharmacistChange,
    doctor,
    onDoctorChange,
    buyerName,
    onBuyerNameChange,
    buyerIdCard,
    onBuyerIdCardChange,
    onConfirm,
}: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    pharmacist: string;
    onPharmacistChange: (v: string) => void;
    doctor: string;
    onDoctorChange: (v: string) => void;
    buyerName: string;
    onBuyerNameChange: (v: string) => void;
    buyerIdCard: string;
    onBuyerIdCardChange: (v: string) => void;
    onConfirm: () => void;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-blue-600" />บันทึกยาควบคุม
                    </DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">ตะกร้ามียาควบคุมพิเศษ กรุณากรอกข้อมูลผู้สั่งจ่ายและผู้ซื้อ</p>
                <div className="space-y-3">
                    <div className="space-y-1">
                        <Label>ชื่อเภสัชกรผู้จ่ายยา *</Label>
                        <Input value={pharmacist} onChange={(e) => onPharmacistChange(e.target.value)} placeholder="ภก./ภญ. ..." />
                    </div>
                    <div className="space-y-1">
                        <Label>ชื่อผู้สั่งจ่าย (ถ้ามี)</Label>
                        <Input value={doctor} onChange={(e) => onDoctorChange(e.target.value)} placeholder="นพ./พญ. ..." />
                    </div>
                    <div className="space-y-1">
                        <Label>ชื่อผู้ซื้อ *</Label>
                        <Input value={buyerName} onChange={(e) => onBuyerNameChange(e.target.value)} placeholder="ชื่อ-นามสกุลผู้ซื้อ" />
                    </div>
                    <div className="space-y-1">
                        <Label>เลขบัตรประชาชนผู้ซื้อ *</Label>
                        <Input value={buyerIdCard} onChange={(e) => onBuyerIdCardChange(e.target.value)} placeholder="X-XXXX-XXXXX-XX-X" maxLength={17} />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>ยกเลิก</Button>
                    <Button onClick={onConfirm}>ยืนยันและชำระ</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
