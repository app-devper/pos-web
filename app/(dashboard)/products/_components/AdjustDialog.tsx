"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { updateStockQuantity } from "@/lib/pos-api";
import type { ProductStock } from "@/types/pos";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  stock: ProductStock | null;
  branchName: string;
  onSaved: () => void;
}

export default function AdjustDialog({ open, onOpenChange, stock, branchName, onSaved }: Props) {
  const [qty, setQty] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && stock) setQty(stock.quantity);
  }, [open, stock]);

  async function handleSave() {
    if (!stock) return;
    setSaving(true);
    try {
      await updateStockQuantity(stock.id, { quantity: qty });
      toast.success("ปรับจำนวนแล้ว");
      onSaved();
    } catch { toast.error("ปรับไม่สำเร็จ"); }
    finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs">
        <DialogHeader><DialogTitle>ปรับจำนวน Stock</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="text-sm text-muted-foreground">
            สาขา: <span className="text-foreground font-medium">{branchName}</span>
          </div>
          <div className="space-y-1">
            <Label>จำนวนใหม่ *</Label>
            <Input
              type="number"
              min={0}
              value={qty === 0 ? "" : qty}
              onChange={(e) => setQty(+e.target.value)}
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>ยกเลิก</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "กำลังปรับ…" : "ยืนยัน"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
