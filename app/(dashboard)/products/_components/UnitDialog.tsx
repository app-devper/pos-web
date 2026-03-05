"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { createProductUnit, updateProductUnit } from "@/lib/pos-api";
import type { ProductUnit } from "@/types/pos";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  productId: string;
  editing: ProductUnit | null;
  onSaved: () => void;
}

const NUM = "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

export default function UnitDialog({ open, onOpenChange, productId, editing, onSaved }: Props) {
  const [form, setForm] = useState({ unit: "", size: 1, costPrice: 0, price: 0, volume: 0, volumeUnit: "", barcode: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(editing
        ? { unit: editing.unit, size: editing.size, costPrice: editing.costPrice, price: 0, volume: editing.volume ?? 0, volumeUnit: editing.volumeUnit ?? "", barcode: editing.barcode ?? "" }
        : { unit: "", size: 1, costPrice: 0, price: 0, volume: 0, volumeUnit: "", barcode: "" }
      );
    }
  }, [open, editing]);

  async function handleSave() {
    if (!form.unit) return toast.error("กรุณากรอกชื่อหน่วย");
    if (!editing && form.price <= 0) return toast.error("กรุณากรอกราคาขาย");
    setSaving(true);
    try {
      if (editing) {
        await updateProductUnit(editing.id, { unit: form.unit, size: form.size, costPrice: form.costPrice, volume: form.volume || undefined, volumeUnit: form.volumeUnit || undefined, barcode: form.barcode || undefined });
      } else {
        await createProductUnit({ productId, unit: form.unit, size: form.size, costPrice: form.costPrice, price: form.price, volume: form.volume || undefined, volumeUnit: form.volumeUnit || undefined, barcode: form.barcode || undefined });
      }
      toast.success(editing ? "อัปเดตหน่วยแล้ว" : "เพิ่มหน่วยแล้ว");
      onSaved();
    } catch { toast.error("บันทึกไม่สำเร็จ"); }
    finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{editing ? "แก้ไขหน่วยนับ" : "เพิ่มหน่วยนับ"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1">
            <Label>ชื่อหน่วย *</Label>
            <Input value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} placeholder="เช่น กล่อง, แผ่น, ขวด" />
          </div>
          <div className="space-y-1">
            <Label>ขนาดบรรจุ *</Label>
            <Input type="number" min={1} value={form.size === 0 ? "" : form.size} onChange={(e) => setForm((f) => ({ ...f, size: +e.target.value }))} className={NUM} />
          </div>
          <div className="space-y-1">
            <Label>บาร์โค้ด</Label>
            <Input value={form.barcode} onChange={(e) => setForm((f) => ({ ...f, barcode: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>ต้นทุนต่อหน่วย *</Label>
            <Input type="number" min={0} value={form.costPrice === 0 ? "" : form.costPrice} onChange={(e) => setForm((f) => ({ ...f, costPrice: +e.target.value }))} className={NUM} />
          </div>
          {!editing && (
            <div className="space-y-1">
              <Label>ราคาขาย (หน้าร้าน) *</Label>
              <Input type="number" min={0} value={form.price === 0 ? "" : form.price} onChange={(e) => setForm((f) => ({ ...f, price: +e.target.value }))} className={NUM} />
            </div>
          )}
          <div className="space-y-1">
            <Label>ปริมาณ <span className="text-xs text-muted-foreground font-normal">เช่น 100</span></Label>
            <Input type="number" min={0} value={form.volume === 0 ? "" : form.volume} onChange={(e) => setForm((f) => ({ ...f, volume: +e.target.value }))} className={NUM} />
          </div>
          <div className="space-y-1">
            <Label>หน่วยปริมาณ <span className="text-xs text-muted-foreground font-normal">เช่น ml, mg</span></Label>
            <Input value={form.volumeUnit} onChange={(e) => setForm((f) => ({ ...f, volumeUnit: e.target.value }))} placeholder="ml, mg, g" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>ยกเลิก</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "กำลังบันทึก…" : "บันทึก"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
