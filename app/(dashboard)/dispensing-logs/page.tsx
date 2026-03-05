"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Eye } from "lucide-react";
import { listDispensingLogs, createDispensingLog, getDispensingLog } from "@/lib/pos-api";
import type { DispensingLog, DispensingLogRequest, DispensingItem } from "@/types/pos";

const EMPTY_ITEM: DispensingItem = { productId: "", quantity: 1, productName: "", genericName: "", unit: "", dosage: "", lotNumber: "" };
const EMPTY: DispensingLogRequest = { orderId: "", patientId: "", items: [{ ...EMPTY_ITEM }], pharmacistName: "", licenseNo: "", note: "" };

export default function DispensingLogsPage() {
  const [items, setItems] = useState<DispensingLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<DispensingLogRequest>(EMPTY);
  const [saving, setSaving] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [detail, setDetail] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const load = () => {
    setLoading(true);
    listDispensingLogs()
      .then((d) => setItems(Array.isArray(d) ? (d as DispensingLog[]) : []))
      .catch(() => toast.error("โหลดข้อมูลไม่สำเร็จ"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  async function handleView(id: string) {
    try { setDetail(await getDispensingLog(id)); setDetailOpen(true); }
    catch { toast.error("โหลดรายละเอียดไม่สำเร็จ"); }
  }

  async function handleSave() {
    if (!form.orderId || !form.patientId || !form.pharmacistName || !form.licenseNo)
      return toast.error("กรุณากรอกข้อมูลให้ครบ");
    setSaving(true);
    try {
      await createDispensingLog(form);
      toast.success("บันทึกการจ่ายยาแล้ว");
      setOpen(false); setForm(EMPTY); load();
    } catch { toast.error("บันทึกไม่สำเร็จ"); }
    finally { setSaving(false); }
  }

  function setItem(i: number, key: keyof DispensingItem, val: string | number) {
    setForm((f) => {
      const items = [...f.items];
      items[i] = { ...items[i], [key]: val };
      return { ...f, items };
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">บันทึกจ่ายยา</h1>
        <Button onClick={() => { setForm(EMPTY); setOpen(true); }}><Plus className="h-4 w-4 mr-2" />บันทึกการจ่ายยา</Button>
      </div>
      <Card><CardContent className="p-0">
        {loading ? <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div> : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>เลขที่</TableHead><TableHead>Order</TableHead><TableHead>ผู้ป่วย</TableHead><TableHead>เภสัชกร</TableHead><TableHead>วันที่</TableHead><TableHead className="w-16" />
            </TableRow></TableHeader>
            <TableBody>
              {items.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">ไม่พบข้อมูล</TableCell></TableRow>}
              {items.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.id?.slice(-8)}</TableCell>
                  <TableCell className="text-xs">{r.orderId?.slice(-8)}</TableCell>
                  <TableCell className="text-xs">{r.patientId?.slice(-8)}</TableCell>
                  <TableCell>{r.pharmacistName}</TableCell>
                  <TableCell className="text-xs">{r.createdDate ? new Date(r.createdDate).toLocaleDateString("th-TH") : "-"}</TableCell>
                  <TableCell><Button size="icon" variant="ghost" aria-label="ดูรายละเอียด" onClick={() => handleView(r.id)}><Eye className="h-4 w-4" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>บันทึกการจ่ายยา</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Order ID *</Label><Input value={form.orderId} onChange={(e) => setForm((f) => ({ ...f, orderId: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Patient ID *</Label><Input value={form.patientId} onChange={(e) => setForm((f) => ({ ...f, patientId: e.target.value }))} /></div>
              <div className="space-y-1"><Label>ชื่อเภสัชกร *</Label><Input value={form.pharmacistName} onChange={(e) => setForm((f) => ({ ...f, pharmacistName: e.target.value }))} /></div>
              <div className="space-y-1"><Label>เลขใบอนุญาต *</Label><Input value={form.licenseNo} onChange={(e) => setForm((f) => ({ ...f, licenseNo: e.target.value }))} /></div>
              <div className="col-span-2 space-y-1"><Label>หมายเหตุ</Label><Input value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} /></div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>รายการยา</Label>
                <Button size="sm" variant="outline" onClick={() => setForm((f) => ({ ...f, items: [...f.items, { ...EMPTY_ITEM }] }))}>+ เพิ่มยา</Button>
              </div>
              {form.items.map((item, i) => (
                <div key={i} className="grid grid-cols-3 gap-2 p-2 border rounded">
                  <div className="space-y-1"><Label className="text-xs">Product ID *</Label><Input className="h-8 text-xs" value={item.productId} onChange={(e) => setItem(i, "productId", e.target.value)} /></div>
                  <div className="space-y-1"><Label className="text-xs">ชื่อยา</Label><Input className="h-8 text-xs" value={item.productName} onChange={(e) => setItem(i, "productName", e.target.value)} /></div>
                  <div className="space-y-1"><Label className="text-xs">จำนวน *</Label><Input className="h-8 text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" type="number" value={item.quantity === 0 ? "" : item.quantity} onChange={(e) => setItem(i, "quantity", +e.target.value)} /></div>
                  <div className="space-y-1"><Label className="text-xs">วิธีใช้</Label><Input className="h-8 text-xs" value={item.dosage} onChange={(e) => setItem(i, "dosage", e.target.value)} /></div>
                  <div className="space-y-1"><Label className="text-xs">หน่วย</Label><Input className="h-8 text-xs" value={item.unit} onChange={(e) => setItem(i, "unit", e.target.value)} /></div>
                  <div className="space-y-1"><Label className="text-xs">Lot</Label><Input className="h-8 text-xs" value={item.lotNumber} onChange={(e) => setItem(i, "lotNumber", e.target.value)} /></div>
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
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>รายละเอียดการจ่ายยา</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Order ID:</span> <span className="font-mono text-xs">{detail.orderId}</span></div>
                <div><span className="text-muted-foreground">Patient ID:</span> <span className="font-mono text-xs">{detail.patientId}</span></div>
                <div><span className="text-muted-foreground">เภสัชกร:</span> {detail.pharmacistName}</div>
                <div><span className="text-muted-foreground">เลขใบอนุญาต:</span> {detail.licenseNo}</div>
                {detail.note && <div className="col-span-2"><span className="text-muted-foreground">หมายเหตุ:</span> {detail.note}</div>}
                {detail.createdDate && <div className="col-span-2"><span className="text-muted-foreground">วันที่:</span> {new Date(detail.createdDate).toLocaleString("th-TH")}</div>}
              </div>
              {detail.items && detail.items.length > 0 && (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>ชื่อยา</TableHead><TableHead>จำนวน</TableHead><TableHead>หน่วย</TableHead><TableHead>วิธีใช้</TableHead><TableHead>Lot</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {detail.items.map((it: Record<string, unknown>, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs">{(it.productName as string) || (it.productId as string)?.slice(-8)}</TableCell>
                        <TableCell className="tabular-nums">{it.quantity as number}</TableCell>
                        <TableCell className="text-xs">{(it.unit as string) || "-"}</TableCell>
                        <TableCell className="text-xs">{(it.dosage as string) || "-"}</TableCell>
                        <TableCell className="text-xs font-mono">{(it.lotNumber as string) || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
