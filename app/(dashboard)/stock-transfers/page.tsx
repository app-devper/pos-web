"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Eye, CheckCircle, XCircle } from "lucide-react";
import { listStockTransfers, createStockTransfer, getStockTransfer, approveStockTransfer, rejectStockTransfer } from "@/lib/pos-api";
import type { StockTransfer, StockTransferRequest } from "@/types/pos";

const EMPTY: StockTransferRequest = { toBranchId: "", items: [{ productId: "", quantity: 1 }], note: "" };

export default function StockTransfersPage() {
  const [items, setItems] = useState<StockTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<StockTransferRequest>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState<unknown>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const load = () => {
    setLoading(true);
    listStockTransfers()
      .then((d) => setItems(Array.isArray(d) ? (d as StockTransfer[]) : []))
      .catch(() => toast.error("โหลดข้อมูลไม่สำเร็จ"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  async function handleView(id: string) {
    try { setDetail(await getStockTransfer(id)); setDetailOpen(true); }
    catch { toast.error("โหลดรายละเอียดไม่สำเร็จ"); }
  }

  async function handleApprove(id: string) {
    try { await approveStockTransfer(id); toast.success("อนุมัติแล้ว"); load(); }
    catch { toast.error("ไม่สำเร็จ"); }
  }

  async function handleReject(id: string) {
    try { await rejectStockTransfer(id); toast.success("ปฏิเสธแล้ว"); load(); }
    catch { toast.error("ไม่สำเร็จ"); }
  }

  async function handleSave() {
    if (!form.toBranchId.trim()) return toast.error("กรุณากรอกสาขาปลายทาง");
    setSaving(true);
    try {
      await createStockTransfer(form);
      toast.success("สร้างคำขอโอนสต็อกแล้ว");
      setOpen(false); setForm(EMPTY); load();
    } catch { toast.error("บันทึกไม่สำเร็จ"); }
    finally { setSaving(false); }
  }

  const statusVariant = (s: string) => s === "APPROVED" ? "default" : s === "REJECTED" ? "destructive" : "secondary";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">โอนสต็อก</h1>
        <Button onClick={() => { setForm(EMPTY); setOpen(true); }}><Plus className="h-4 w-4 mr-2" />สร้างคำขอโอน</Button>
      </div>
      <Card><CardContent className="p-0">
        {loading ? <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div> : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>เลขที่</TableHead><TableHead>จากสาขา</TableHead><TableHead>ไปสาขา</TableHead><TableHead>สถานะ</TableHead><TableHead>วันที่</TableHead><TableHead className="w-28" />
            </TableRow></TableHeader>
            <TableBody>
              {items.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">ไม่พบข้อมูล</TableCell></TableRow>}
              {items.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.id?.slice(-8)}</TableCell>
                  <TableCell className="text-xs">{r.fromBranchId?.slice(-8) ?? "-"}</TableCell>
                  <TableCell className="text-xs">{r.toBranchId?.slice(-8)}</TableCell>
                  <TableCell><Badge variant={statusVariant(r.status)}>{r.status}</Badge></TableCell>
                  <TableCell className="text-xs">{r.createdDate ? new Date(r.createdDate).toLocaleDateString("th-TH") : "-"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" aria-label="ดูรายละเอียด" onClick={() => handleView(r.id)}><Eye className="h-4 w-4" /></Button>
                      {r.status === "PENDING" && <>
                        <Button size="icon" variant="ghost" className="text-green-600" aria-label="อนุมัติ" onClick={() => handleApprove(r.id)}><CheckCircle className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" className="text-destructive" aria-label="ปฏิเสธ" onClick={() => handleReject(r.id)}><XCircle className="h-4 w-4" /></Button>
                      </>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>สร้างคำขอโอนสต็อก</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Branch ID ปลายทาง *</Label><Input value={form.toBranchId} onChange={(e) => setForm((f) => ({ ...f, toBranchId: e.target.value }))} /></div>
            <div className="space-y-1"><Label>หมายเหตุ</Label><Input value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} /></div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>รายการสินค้า</Label>
                <Button size="sm" variant="outline" onClick={() => setForm((f) => ({ ...f, items: [...f.items, { productId: "", quantity: 1 }] }))}>+ เพิ่ม</Button>
              </div>
              {form.items.map((item, i) => (
                <div key={i} className="flex gap-2">
                  <Input className="flex-1 h-8 text-xs" placeholder="Product ID" value={item.productId} onChange={(e) => setForm((f) => { const items = [...f.items]; items[i] = { ...items[i], productId: e.target.value }; return { ...f, items }; })} />
                  <Input className="w-20 h-8 text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" type="number" placeholder="จำนวน" value={item.quantity === 0 ? "" : item.quantity} onChange={(e) => setForm((f) => { const items = [...f.items]; items[i] = { ...items[i], quantity: +e.target.value }; return { ...f, items }; })} />
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>ยกเลิก</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "กำลังบันทึก…" : "บันทึก"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>รายละเอียดการโอนสต็อก</DialogTitle></DialogHeader>
          <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">{JSON.stringify(detail, null, 2)}</pre>
        </DialogContent>
      </Dialog>
    </div>
  );
}
