"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { GripVertical } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { updateStockSequence } from "@/lib/pos-api";
import type { ProductStock, ProductUnit, Branch } from "@/types/pos";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  stocks: ProductStock[];
  units: ProductUnit[];
  branches: Branch[];
  onSaved: () => void;
}

interface SortableItemProps {
  stock: ProductStock;
  unitName: string;
  branchName: string;
}

function SortableItem({ stock, unitName, branchName }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: stock.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
        tabIndex={-1}
      >
        <GripVertical className="h-5 w-5" />
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{branchName}</p>
        <p className="text-xs text-muted-foreground">{unitName}</p>
      </div>
      <div className="text-right shrink-0">
        <p className={`text-sm font-semibold ${stock.quantity <= 0 ? "text-destructive" : stock.quantity <= 10 ? "text-yellow-600" : "text-primary"}`}>
          {stock.quantity}
        </p>
        <p className="text-xs text-muted-foreground">คงเหลือ</p>
      </div>
    </div>
  );
}

export default function StockSequenceDialog({ open, onOpenChange, stocks, units, branches, onSaved }: Props) {
  const [items, setItems] = useState<ProductStock[]>(stocks);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setItems(stocks);
  }, [open, stocks]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setItems((prev) => {
      const oldIdx = prev.findIndex((s) => s.id === active.id);
      const newIdx = prev.findIndex((s) => s.id === over.id);
      return arrayMove(prev, oldIdx, newIdx);
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updateStockSequence(items.map((s, i) => ({ stockId: s.id, sequence: i + 1 })));
      toast.success("บันทึกลำดับแล้ว");
      onSaved();
    } catch {
      toast.error("บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  const getUnitName = (id: string) => units.find((u) => u.id === id)?.unit ?? "-";
  const getBranchName = (id: string) => branches.find((b) => b.id === id)?.name ?? id;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) setItems(stocks); onOpenChange(v); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>เรียงลำดับ Stock</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground -mt-2">ลาก <GripVertical className="inline h-3 w-3" /> เพื่อเปลี่ยนลำดับ</p>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {items.map((s) => (
                <SortableItem
                  key={s.id}
                  stock={s}
                  unitName={getUnitName(s.unitId)}
                  branchName={getBranchName(s.branchId)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setItems(stocks); onOpenChange(false); }}>ยกเลิก</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "กำลังบันทึก…" : "บันทึก"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
