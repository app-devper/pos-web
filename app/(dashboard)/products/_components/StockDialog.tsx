"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createProductStock, updateProductStock } from "@/lib/pos-api";
import type { ProductPrice, ProductUnit, ProductStock } from "@/types/pos";

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
  prices: ProductPrice[];
  branches: Branch[];
  onSaved: () => void;
}

function formatPlaceholderAmount(value?: number): string {
  if (!value || value <= 0) return "฿0";
  return `฿${new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(value)}`;
}

function toDateInput(d: string | Date | undefined): string {
  if (!d) return "";
  if (typeof d === "string" && /^\d{4}-\d{2}-\d{2}/.test(d)) return d.slice(0, 10);
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function todayStr(): string {
  return toDateInput(new Date());
}

function toDateTimeValue(date: string): string {
  return `${date}T00:00:00.000`;
}

function generateLotNumber(): string {
  const now = new Date();
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const timePart = `${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
  return `LOT-${datePart}-${timePart}`;
}

function getUnitDefaults(unitId: string, units: ProductUnit[], prices: ProductPrice[]) {
  const unit = units.find((item) => item.id === unitId);
  const retailPrice = prices.find((item) => item.unitId === unitId && item.customerType === "General");
  return {
    costPrice: unit?.costPrice ?? 0,
    price: retailPrice?.price ?? 0,
  };
}

export default function StockDialog({ open, onOpenChange, productId, editing, units, prices, branches, onSaved }: Props) {
  const [form, setForm] = useState<StockForm>({
    branchId: "", unitId: "", quantity: 0, costPrice: 0, price: 0,
    lotNumber: "", receiveCode: "", expireDate: "", importDate: todayStr(),
  });
  const [saving, setSaving] = useState(false);

  const selectedUnit = units.find((unit) => unit.id === form.unitId);
  const selectedRetailPrice = prices.find((price) => price.unitId === form.unitId && price.customerType === "General");
  const selectedUnitName = selectedUnit?.unit?.trim() || "หน่วย";
  const quantityPlaceholder = `ระบุจำนวน ${selectedUnitName}`;
  const costPlaceholder = `${formatPlaceholderAmount(selectedUnit?.costPrice)} จากหน่วยนับ`;
  const pricePlaceholder = `${formatPlaceholderAmount(selectedRetailPrice?.price)} จากหน่วยนับ`;
  const numberInputClass = "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

  useEffect(() => {
    if (open) {
      const defaultUnitId = editing?.unitId ?? units[0]?.id ?? "";
      const defaults = getUnitDefaults(defaultUnitId, units, prices);
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
        unitId: defaultUnitId,
        quantity: 0,
        costPrice: defaults.costPrice,
        price: defaults.price,
        lotNumber: "",
        receiveCode: "",
        expireDate: "",
        importDate: todayStr(),
      });
    }
  }, [open, editing, branches, units, prices]);

  function set<K extends keyof StockForm>(key: K, value: StockForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleUnitChange(unitId: string) {
    const defaults = getUnitDefaults(unitId, units, prices);
    setForm((current) => ({
      ...current,
      unitId,
      costPrice: defaults.costPrice,
      price: defaults.price,
    }));
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
          expireDate: toDateTimeValue(form.expireDate),
          importDate: toDateTimeValue(form.importDate),
        });
      } else {
        await createProductStock({
          productId,
          branchId: form.branchId || undefined,
          unitId: form.unitId,
          quantity: form.quantity,
          costPrice: form.costPrice || undefined,
          price: form.price || undefined,
          lotNumber: form.lotNumber || undefined,
          receiveCode: form.receiveCode || undefined,
          expireDate: toDateTimeValue(form.expireDate),
          importDate: toDateTimeValue(form.importDate),
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
            <Select value={form.unitId} onValueChange={handleUnitChange}>
              <SelectTrigger><SelectValue placeholder="เลือกหน่วย (ถ้ามี)" /></SelectTrigger>
              <SelectContent>
                {units.map((u) => <SelectItem key={u.id} value={u.id}>{u.unit || "ชิ้น"} (x{u.size})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {!editing && (
            <div className="space-y-1">
              <Label>จำนวน *</Label>
              <Input type="number" min={0} value={form.quantity === 0 ? "" : form.quantity} onChange={(e) => set("quantity", +e.target.value)} className={numberInputClass} placeholder={quantityPlaceholder} />
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label>ต้นทุน</Label>
              <Input type="number" min={0} value={form.costPrice === 0 ? "" : form.costPrice} onChange={(e) => set("costPrice", +e.target.value)} className={`${numberInputClass} text-foreground`} placeholder={costPlaceholder} />
            </div>
            <div className="space-y-1">
              <Label>ราคาขาย</Label>
              <Input type="number" min={0} value={form.price === 0 ? "" : form.price} onChange={(e) => set("price", +e.target.value)} className={`${numberInputClass} text-foreground`} placeholder={pricePlaceholder} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Lot Number</Label>
            <div className="flex gap-2">
              <Input value={form.lotNumber} onChange={(e) => set("lotNumber", e.target.value)} placeholder="ไม่บังคับ" />
              <Button type="button" variant="outline" onClick={() => set("lotNumber", generateLotNumber())}>Gen</Button>
            </div>
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
