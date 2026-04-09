"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Eye } from "lucide-react";
import { listDispensingLogs, createDispensingLog, getDispensingLog, listPatients, listOrders, listProducts } from "@/lib/pos-api";
import type { DispensingLog, DispensingLogRequest, DispensingItem, Order, Patient, ProductDetail } from "@/types/pos";

const EMPTY_ITEM: DispensingItem = { productId: "", quantity: 1, productName: "", genericName: "", unit: "", dosage: "", lotNumber: "" };
const EMPTY: DispensingLogRequest = { orderId: "", patientId: "", items: [{ ...EMPTY_ITEM }], pharmacistName: "", licenseNo: "", note: "" };

function formatLocalDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toDayRange(date: string, boundary: "start" | "end") {
  return `${date}T${boundary === "start" ? "00:00:00.000" : "23:59:59.999"}`;
}

export default function DispensingLogsPage() {
  const [items, setItems] = useState<DispensingLog[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [products, setProducts] = useState<ProductDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<DispensingLogRequest>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState<DispensingLog | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const load = () => {
    setLoading(true);
    const start = (() => {
      const date = new Date();
      date.setDate(1);
      return toDayRange(formatLocalDateInput(date), "start");
    })();
    const end = toDayRange(formatLocalDateInput(new Date()), "end");

    Promise.all([
      listDispensingLogs(),
      listPatients().catch(() => []),
      listOrders(start, end).catch(() => []),
      listProducts().catch(() => []),
    ])
      .then(([logs, patientList, orderList, productList]) => {
        setItems(Array.isArray(logs) ? logs : []);
        setPatients(Array.isArray(patientList) ? patientList : []);
        setOrders(Array.isArray(orderList) ? orderList : []);
        setProducts(Array.isArray(productList) ? productList : []);
      })
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
    if (form.items.some((item) => !item.productId || item.quantity <= 0))
      return toast.error("กรุณาเลือกสินค้าและระบุจำนวนให้ถูกต้อง");
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

  function selectProduct(i: number, productId: string) {
    const product = products.find((item) => item.id === productId);
    if (!product) {
      setItem(i, "productId", productId);
      return;
    }

    setForm((current) => {
      const nextItems = [...current.items];
      nextItems[i] = {
        ...nextItems[i],
        productId,
        productName: product.name,
        genericName: product.drugInfo?.genericName ?? "",
        unit: product.unit ?? "",
      };
      return { ...current, items: nextItems };
    });
  }

  const patientMap = useMemo(() => new Map(patients.map((patient) => [patient.id, patient])), [patients]);
  const orderMap = useMemo(() => new Map(orders.map((order) => [order.id, order])), [orders]);

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
                  <TableCell className="text-xs">{orderMap.get(r.orderId)?.code ?? r.orderId?.slice(-8)}</TableCell>
                  <TableCell className="text-xs">{[patientMap.get(r.patientId)?.firstName, patientMap.get(r.patientId)?.lastName].filter(Boolean).join(" ") || patientMap.get(r.patientId)?.customerCode || r.patientId?.slice(-8)}</TableCell>
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
              <div className="space-y-1">
                <Label>คำสั่งซื้อ *</Label>
                <Select value={form.orderId} onValueChange={(value) => setForm((current) => ({ ...current, orderId: value }))}>
                  <SelectTrigger><SelectValue placeholder="เลือกคำสั่งซื้อ" /></SelectTrigger>
                  <SelectContent>
                    {orders.map((order) => (
                      <SelectItem key={order.id} value={order.id}>
                        {order.code ?? order.id.slice(-8)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>ผู้ป่วย *</Label>
                <Select value={form.patientId} onValueChange={(value) => setForm((current) => ({ ...current, patientId: value }))}>
                  <SelectTrigger><SelectValue placeholder="เลือกผู้ป่วย" /></SelectTrigger>
                  <SelectContent>
                    {patients.map((patient) => (
                      <SelectItem key={patient.id} value={patient.id}>
                        {[patient.firstName, patient.lastName].filter(Boolean).join(" ") || patient.customerCode}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
                  <div className="space-y-1">
                    <Label className="text-xs">สินค้า *</Label>
                    <Select value={item.productId} onValueChange={(value) => selectProduct(i, value)}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="เลือกสินค้า" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
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
                <div><span className="text-muted-foreground">Order:</span> <span className="font-mono text-xs">{orderMap.get(detail.orderId)?.code ?? detail.orderId}</span></div>
                <div><span className="text-muted-foreground">ผู้ป่วย:</span> {[patientMap.get(detail.patientId)?.firstName, patientMap.get(detail.patientId)?.lastName].filter(Boolean).join(" ") || patientMap.get(detail.patientId)?.customerCode || detail.patientId}</div>
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
                    {detail.items.map((it, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs">{it.productName || it.productId?.slice(-8)}</TableCell>
                        <TableCell className="tabular-nums">{it.quantity}</TableCell>
                        <TableCell className="text-xs">{it.unit || "-"}</TableCell>
                        <TableCell className="text-xs">{it.dosage || "-"}</TableCell>
                        <TableCell className="text-xs font-mono">{it.lotNumber || "-"}</TableCell>
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
