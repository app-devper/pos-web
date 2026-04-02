"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Search, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import { listLots, createLot, updateLot, deleteLot } from "@/lib/pos-api";
import { withRouteAccess } from "@/components/withRouteAccess";
import { useProductCache } from "@/components/ProductCacheContext";
import type { ProductLot } from "@/types/pos";
import { useConfirm } from "@/components/ConfirmDialog";

interface LotForm {
  productId: string;
  lotNumber: string;
  quantity: number;
  expireDate: string;
  costPrice: number;
}

const EMPTY: LotForm = { productId: "", lotNumber: "", quantity: 0, expireDate: "", costPrice: 0 };

function generateLotNumber() {
  const now = new Date();
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const timePart = `${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
  return `LOT-${datePart}-${timePart}`;
}

function BatchesPage() {
  const { products } = useProductCache();
  const [items, setItems] = useState<ProductLot[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProductLot | null>(null);
  const [form, setForm] = useState<LotForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(0);
  const pageSize = 20;
  const confirm = useConfirm();

  const load = () => {
    setLoading(true);
    const now = new Date();
    const start = new Date(now.getFullYear() - 2, 0, 1).toISOString();
    const end = new Date(now.getFullYear() + 5, 11, 31).toISOString();
    listLots(start, end)
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch(() => toast.error("โหลดข้อมูลไม่สำเร็จ"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  function openCreate() { setEditing(null); setForm(EMPTY); setOpen(true); }
  function openEdit(lot: ProductLot) {
    setEditing(lot);
    setForm({
      productId: lot.productId,
      lotNumber: lot.lotNumber,
      quantity: lot.quantity,
      expireDate: lot.expireDate ? lot.expireDate.slice(0, 10) : "",
      costPrice: lot.costPrice,
    });
    setOpen(true);
  }

  async function handleSave() {
    if (!form.lotNumber.trim()) return toast.error("กรุณากรอกเลข Lot");
    if (!form.expireDate) return toast.error("กรุณาเลือกวันหมดอายุ");
    setSaving(true);
    try {
      if (editing) {
        await updateLot(editing.id, { lotNumber: form.lotNumber, expireDate: form.expireDate, costPrice: form.costPrice, quantity: form.quantity });
      } else {
        if (!form.productId) return toast.error("กรุณาเลือกสินค้า");
        await createLot({ productId: form.productId, lotNumber: form.lotNumber, quantity: form.quantity, expireDate: form.expireDate, costPrice: form.costPrice });
      }
      toast.success(editing ? "อัปเดตแล้ว" : "สร้างแล้ว");
      setOpen(false);
      load();
    } catch { toast.error("บันทึกไม่สำเร็จ"); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!(await confirm({ description: "ลบ Lot นี้?", destructive: true }))) return;
    try { await deleteLot(id); toast.success("ลบแล้ว"); load(); }
    catch { toast.error("ลบไม่สำเร็จ"); }
  }

  const productMap = new Map(products.map((p) => [p.id, p]));

  const filtered = items.filter((lot) => {
    const q = search.toLowerCase();
    const pName = productMap.get(lot.productId)?.name ?? "";
    return lot.lotNumber.toLowerCase().includes(q) || pName.toLowerCase().includes(q);
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const paginated = filtered.slice(safePage * pageSize, (safePage + 1) * pageSize);

  const isExpiringSoon = (dateStr: string) => {
    if (!dateStr) return false;
    const diff = new Date(dateStr).getTime() - Date.now();
    return diff > 0 && diff < 90 * 24 * 60 * 60 * 1000;
  };

  const isExpired = (dateStr: string) => {
    if (!dateStr) return false;
    return new Date(dateStr).getTime() < Date.now();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">จัดการ Lot/Batch</h1>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />เพิ่ม Lot</Button>
      </div>
      <Card>
        <CardHeader className="pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="ค้นหาด้วยเลข Lot หรือชื่อสินค้า…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>เลข Lot</TableHead>
                  <TableHead>สินค้า</TableHead>
                  <TableHead className="text-right">จำนวน</TableHead>
                  <TableHead className="text-right">ต้นทุน</TableHead>
                  <TableHead>วันหมดอายุ</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">ไม่พบข้อมูล</TableCell></TableRow>
                )}
                {paginated.map((lot) => (
                  <TableRow key={lot.id}>
                    <TableCell className="font-medium font-mono">{lot.lotNumber}</TableCell>
                    <TableCell>{productMap.get(lot.productId)?.name ?? "-"}</TableCell>
                    <TableCell className="text-right">{lot.quantity}</TableCell>
                    <TableCell className="text-right">{lot.costPrice?.toFixed(2)}</TableCell>
                    <TableCell>{lot.expireDate ? new Date(lot.expireDate).toLocaleDateString("th-TH") : "-"}</TableCell>
                    <TableCell>
                      {isExpired(lot.expireDate) ? (
                        <span className="inline-flex items-center gap-1 text-xs text-destructive font-medium"><AlertTriangle className="h-3 w-3" />หมดอายุ</span>
                      ) : isExpiringSoon(lot.expireDate) ? (
                        <span className="inline-flex items-center gap-1 text-xs text-yellow-600 font-medium"><AlertTriangle className="h-3 w-3" />ใกล้หมดอายุ</span>
                      ) : (
                        <span className="text-xs text-green-600">ปกติ</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" aria-label="แก้ไข" onClick={() => openEdit(lot)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" className="text-destructive" aria-label="ลบ" onClick={() => handleDelete(lot.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {filtered.length > pageSize && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <span className="text-xs text-muted-foreground">ทั้งหมด {filtered.length} รายการ · หน้า {safePage + 1}/{totalPages}</span>
              <div className="flex gap-1">
                <Button size="icon" variant="outline" className="h-8 w-8" disabled={safePage === 0} onClick={() => setPage(safePage - 1)} aria-label="หน้าก่อน"><ChevronLeft className="h-4 w-4" /></Button>
                <Button size="icon" variant="outline" className="h-8 w-8" disabled={safePage >= totalPages - 1} onClick={() => setPage(safePage + 1)} aria-label="หน้าถัดไป"><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "แก้ไข Lot" : "เพิ่ม Lot"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {!editing && (
              <div className="space-y-1">
                <Label>สินค้า *</Label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                  value={form.productId}
                  onChange={(e) => setForm((f) => ({ ...f, productId: e.target.value }))}
                >
                  <option value="">เลือกสินค้า</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.serialNumber})</option>
                  ))}
                </select>
              </div>
            )}
            <div className="space-y-1">
              <Label>เลข Lot *</Label>
              <div className="flex gap-2">
                <Input value={form.lotNumber} onChange={(e) => setForm((f) => ({ ...f, lotNumber: e.target.value }))} />
                <Button type="button" variant="outline" onClick={() => setForm((f) => ({ ...f, lotNumber: generateLotNumber() }))}>Gen</Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>จำนวน</Label>
                <Input type="number" min={0} value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: +e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>ต้นทุน</Label>
                <Input type="number" min={0} step="0.01" value={form.costPrice} onChange={(e) => setForm((f) => ({ ...f, costPrice: +e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>วันหมดอายุ *</Label>
              <Input type="date" value={form.expireDate} onChange={(e) => setForm((f) => ({ ...f, expireDate: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>ยกเลิก</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "กำลังบันทึก…" : "บันทึก"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default withRouteAccess(BatchesPage, { feature: "batchTracking" });
