"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createProductStock, updateProductStock } from "@/lib/pos-api";
import type { ProductUnit, ProductStock } from "@/types/pos";

interface Branch { id: string; name: string; }

interface StockForm {
  branchId: string;
  unitId: string;
  quantity: number;
  costPrice: number;
  price: number;
  lotNumber: string;
  receiveCode: string;
  expireDate: string;
  importDate: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  productId: string;
  editing: ProductStock | null;
  units: ProductUnit[];
  branches: Branch[];
  onSaved: () => void;
}

function toDateInput(d: string | Date | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function StockDialog({ open, onOpenChange, productId, editing, units, branches, onSaved }: Props) {
  const [form, setForm] = useState<StockForm>({
    branchId: "", unitId: "", quantity: 0, costPrice: 0, price: 0,
    lotNumber: "", receiveCode: "", expireDate: "", importDate: todayStr(),
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(editing ? {
        branchId: editing.branchId,
        unitId: editing.unitId,
        quantity: editing.quantity,
        costPrice: editing.costPrice,
        price: editing.price ?? 0,
        lotNumber: editing.lotNumber ?? "",
        receiveCode: editing.receiveCode ?? "",
        expireDate: toDateInput(editing.expireDate),
        importDate: toDateInput(editing.importDate) || todayStr(),
      } : {
        branchId: branches[0]?.id ?? "",
        unitId: units[0]?.id ?? "",
        quantity: 0,
        costPrice: 0,
        price: 0,
        lotNumber: "",
        receiveCode: "",
        expireDate: "",
        importDate: todayStr(),
      });
    }
  }, [open, editing, branches, units]);

  function set<K extends keyof StockForm>(key: K, value: StockForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    if (!form.expireDate) return toast.error("กรุณาระบุวันหมดอายุ");
    setSaving(true);
    try {
      if (editing) {
        await updateProductStock(editing.id, {
          productId,
          unitId: form.unitId,
          costPrice: form.costPrice || undefined,
          price: form.price || undefined,
          lotNumber: form.lotNumber || undefined,
          expireDate: new Date(form.expireDate).toISOString(),
          importDate: new Date(form.importDate).toISOString(),
        });
      } else {
        await createProductStock({
          productId,
          branchId: form.branchId || undefined,
          unitId: form.unitId || undefined,
          quantity: form.quantity,
          costPrice: form.costPrice || undefined,
          price: form.price || undefined,
          lotNumber: form.lotNumber || undefined,
          receiveCode: form.receiveCode || undefined,
          expireDate: new Date(form.expireDate).toISOString(),
          importDate: new Date(form.importDate).toISOString(),
        });
      }
      toast.success(editing ? "อัปเดต stock แล้ว" : "เพิ่ม stock แล้ว");
      onSaved();
    } catch (e: unknown) {
      toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "บันทึกไม่สำเร็จ");
    } finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>{editing ? "แก้ไข Stock" : "เพิ่ม Stock"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {!editing && (
            <div className="space-y-1">
              <Label>สาขา *</Label>
              <Select value={form.branchId} onValueChange={(v) => set("branchId", v)}>
                <SelectTrigger><SelectValue placeholder="เลือกสาขา" /></SelectTrigger>
                <SelectContent>
                  {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1">
            <Label>หน่วย</Label>
            <Select value={form.unitId} onValueChange={(v) => set("unitId", v)}>
              <SelectTrigger><SelectValue placeholder="เลือกหน่วย (ถ้ามี)" /></SelectTrigger>
              <SelectContent>
                {units.map((u) => <SelectItem key={u.id} value={u.id}>{u.unit} (x{u.size})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {!editing && (
            <div className="space-y-1">
              <Label>จำนวน *</Label>
              <Input type="number" min={0} value={form.quantity === 0 ? "" : form.quantity} onChange={(e) => set("quantity", +e.target.value)} className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label>ต้นทุน</Label>
              <Input type="number" min={0} value={form.costPrice === 0 ? "" : form.costPrice} onChange={(e) => set("costPrice", +e.target.value)} className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
            </div>
            <div className="space-y-1">
              <Label>ราคาขาย</Label>
              <Input type="number" min={0} value={form.price === 0 ? "" : form.price} onChange={(e) => set("price", +e.target.value)} className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>เลข Lot</Label>
            <Input value={form.lotNumber} onChange={(e) => set("lotNumber", e.target.value)} placeholder="ไม่บังคับ" />
          </div>
          {!editing && (
            <div className="space-y-1">
              <Label>รหัสใบรับ</Label>
              <Input value={form.receiveCode} onChange={(e) => set("receiveCode", e.target.value)} placeholder="ไม่บังคับ" />
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label>วันนำเข้า *</Label>
              <Input type="date" value={form.importDate} onChange={(e) => set("importDate", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>วันหมดอายุ *</Label>
              <Input type="date" value={form.expireDate} onChange={(e) => set("expireDate", e.target.value)} />
            </div>
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
