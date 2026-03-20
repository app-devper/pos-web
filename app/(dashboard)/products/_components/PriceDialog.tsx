"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createProductPrice, updateProductPrice } from "@/lib/pos-api";
import { CUSTOMER_TYPES } from "@/app/(dashboard)/sale/_utils";

interface ProductPrice { id: string; productId: string; unitId?: string; customerType: string; price: number; }

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  productId: string;
  unitId?: string;
  unitName?: string;
  editing: ProductPrice | null;
  onSaved: () => void;
}


export default function PriceDialog({ open, onOpenChange, productId, unitId, unitName, editing, onSaved }: Props) {
  const [form, setForm] = useState({ customerType: "General", price: 0 });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(editing
        ? { customerType: editing.customerType, price: editing.price }
        : { customerType: "General", price: 0 }
      );
    }
  }, [open, editing]);

  async function handleSave() {
    if (form.price <= 0) return toast.error("กรุณากรอกราคา");
    setSaving(true);
    try {
      if (editing) {
        await updateProductPrice(editing.id, {
          productId: editing.productId || productId,
          unitId: editing.unitId || unitId,
          customerType: form.customerType,
          price: form.price,
        });
      } else {
        await createProductPrice({ productId, unitId, customerType: form.customerType, price: form.price });
      }
      toast.success(editing ? "อัปเดตราคาแล้ว" : "เพิ่มราคาแล้ว");
      onSaved();
    } catch { toast.error("บันทึกไม่สำเร็จ"); }
    finally { setSaving(false); }
  }

  const displayName = unitName ? `"${unitName}"` : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-xl">ราคาขาย {displayName}</DialogTitle>
          {displayName && (
            <p className="text-sm text-primary mt-0.5">โปรดระบุข้อมูลราคาขาย {displayName}</p>
          )}
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 mt-2">
          <div className="space-y-2">
            <Label>ผูกกับประเภทลูกค้า</Label>
            <Select value={form.customerType} onValueChange={(v) => setForm((f) => ({ ...f, customerType: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CUSTOMER_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>ราคาขายต่อหน่วย</Label>
            <Input
              type="number"
              min={0}
              value={form.price === 0 ? "" : form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: +e.target.value }))}
              autoFocus
              className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>ยกเลิก</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "กำลังบันทึก…" : "บันทึก"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
