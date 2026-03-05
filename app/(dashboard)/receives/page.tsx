"use client";

import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Eye, Pencil, Search } from "lucide-react";
import {
  listReceives, getReceive, createReceive, updateReceive, deleteReceive,
  listSuppliers, listProducts,
} from "@/lib/pos-api";
import type { Receive, Supplier, ProductDetail, CreateReceiveItemData } from "@/types/pos";
import { useConfirm } from "@/components/ConfirmDialog";

const fmt = (n: number) => new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2 }).format(n ?? 0);

// ─── Stock Import Item Form ──────────────────────────────────
interface StockItemForm {
  productId: string;
  serialNumber: string;
  name: string;
  unit: string;
  quantity: number;
  costPrice: number;
  price: number;
  lotNumber: string;
  expireDate: string;
}

const EMPTY_STOCK_ITEM: StockItemForm = {
  productId: "", serialNumber: "", name: "", unit: "", quantity: 1, costPrice: 0, price: 0, lotNumber: "", expireDate: "",
};

export default function ReceivesPage() {
  // ─── List state ──────────────────────────────────────────
  const [items, setItems] = useState<Receive[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<ProductDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(() => { const d = new Date(); d.setDate(1); return d.toISOString().split("T")[0]; });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);

  // ─── Create / Edit GR dialog ─────────────────────────────
  const [grOpen, setGrOpen] = useState(false);
  const [grEditing, setGrEditing] = useState<Receive | null>(null);
  const [grSupplierId, setGrSupplierId] = useState("");
  const [grReference, setGrReference] = useState("");
  const [grSaving, setGrSaving] = useState(false);
  const [grItems, setGrItems] = useState<StockItemForm[]>([]);
  const [grStockForm, setGrStockForm] = useState<StockItemForm>(EMPTY_STOCK_ITEM);
  const [grProductSearch, setGrProductSearch] = useState("");

  // ─── View Detail dialog ──────────────────────────────────
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<Receive | null>(null);
  const confirm = useConfirm();

  // ─── Supplier map ────────────────────────────────────────
  const supplierMap = useMemo(() => {
    const m = new Map<string, string>();
    suppliers.forEach((s) => m.set(s.id, s.name));
    return m;
  }, [suppliers]);

  // ─── Product map ─────────────────────────────────────────
  const productMap = useMemo(() => {
    const m = new Map<string, ProductDetail>();
    products.forEach((p) => m.set(p.id, p));
    return m;
  }, [products]);

  // ─── Filtered products for item search ────────────────────
  const filteredProducts = useMemo(() => {
    if (!grProductSearch.trim()) return products.slice(0, 20);
    const q = grProductSearch.toLowerCase();
    return products.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      p.serialNumber?.toLowerCase().includes(q) ||
      p.nameEn?.toLowerCase().includes(q)
    ).slice(0, 20);
  }, [products, grProductSearch]);

  // ─── Load data ───────────────────────────────────────────
  const load = () => {
    setLoading(true);
    listReceives(new Date(startDate).toISOString(), new Date(endDate + "T23:59:59").toISOString())
      .then((d) => setItems(Array.isArray(d) ? d : []))
      .catch(() => toast.error("โหลดข้อมูลไม่สำเร็จ"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    listSuppliers().then((d) => setSuppliers(Array.isArray(d) ? d : [])).catch(() => {});
    listProducts().then((d) => setProducts(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  // ─── Create / Edit GR ───────────────────────────────────
  function openCreateGr() {
    setGrEditing(null);
    setGrSupplierId("");
    setGrReference("");
    setGrItems([]);
    setGrStockForm(EMPTY_STOCK_ITEM);
    setGrProductSearch("");
    setGrOpen(true);
  }

  function openEditGr(r: Receive) {
    setGrEditing(r);
    setGrSupplierId(r.supplierId ?? "");
    setGrReference(r.reference ?? "");
    setGrItems([]);
    setGrStockForm(EMPTY_STOCK_ITEM);
    setGrProductSearch("");
    setGrOpen(true);
  }

  function selectProductForGr(p: ProductDetail) {
    const selectedUnit = p.units?.[0];
    setGrStockForm((f) => ({
      ...f,
      productId: p.id,
      serialNumber: p.serialNumber,
      name: p.name,
      unit: selectedUnit?.unit ?? p.unit ?? "",
      costPrice: selectedUnit?.costPrice ?? p.costPrice ?? 0,
      price: p.price ?? 0,
    }));
    setGrProductSearch("");
  }

  function addItemToGr() {
    if (!grStockForm.productId) return toast.error("กรุณาเลือกสินค้า");
    if (!grStockForm.lotNumber) return toast.error("กรุณากรอก Lot Number");
    if (!grStockForm.expireDate) return toast.error("กรุณากรอกวันหมดอายุ");
    if (grStockForm.quantity <= 0) return toast.error("จำนวนต้องมากกว่า 0");
    setGrItems((prev) => [...prev, { ...grStockForm }]);
    setGrStockForm(EMPTY_STOCK_ITEM);
    setGrProductSearch("");
  }

  function removeItemFromGr(idx: number) {
    setGrItems((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSaveGr() {
    if (!grSupplierId) return toast.error("กรุณาเลือกผู้จัดจำหน่าย");
    setGrSaving(true);
    try {
      if (grEditing) {
        await updateReceive(grEditing.id, {
          supplierId: grSupplierId,
          reference: grReference,
          totalCost: grEditing.totalCost,
          items: grEditing.items ?? [],
        });
        toast.success("อัปเดตใบรับสินค้าแล้ว");
      } else {
        const receiveItems: CreateReceiveItemData[] = grItems.map((it) => ({
          productId: it.productId,
          costPrice: it.costPrice,
          quantity: it.quantity,
          lotNumber: it.lotNumber,
          expireDate: new Date(it.expireDate).toISOString(),
        }));
        await createReceive({ supplierId: grSupplierId, reference: grReference, items: receiveItems });
        toast.success(`สร้างใบรับสินค้าแล้ว (${grItems.length} รายการ)`);
      }
      setGrOpen(false);
      load();
    } catch {
      toast.error("บันทึกไม่สำเร็จ");
    } finally {
      setGrSaving(false);
    }
  }

  // ─── View Detail ─────────────────────────────────────────
  async function handleView(id: string) {
    try {
      const d = await getReceive(id);
      setDetail(d);
      setDetailOpen(true);
    } catch {
      toast.error("โหลดรายละเอียดไม่สำเร็จ");
    }
  }

  // ─── Delete ──────────────────────────────────────────────
  async function handleDelete(id: string) {
    if (!(await confirm({ description: "ลบรายการรับสินค้านี้?", destructive: true }))) return;
    try {
      await deleteReceive(id);
      toast.success("ลบแล้ว");
      load();
    } catch {
      toast.error("ลบไม่สำเร็จ");
    }
  }

  const grTotalCost = grItems.reduce((sum, it) => sum + it.costPrice * it.quantity, 0);

  // ─── Render ──────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">ใบรับสินค้า (GR)</h1>
        <Button onClick={openCreateGr}><Plus className="h-4 w-4 mr-2" />สร้างใบรับสินค้า</Button>
      </div>

      {/* ── Date filter + List ───────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1"><Label className="text-xs">วันที่เริ่ม</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-40" /></div>
            <div className="space-y-1"><Label className="text-xs">วันที่สิ้นสุด</Label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-40" /></div>
            <Button onClick={load} variant="secondary"><Search className="h-4 w-4 mr-2" />ค้นหา</Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>เลขที่</TableHead>
                  <TableHead>ผู้จัดจำหน่าย</TableHead>
                  <TableHead>อ้างอิง</TableHead>
                  <TableHead className="text-right">ยอดรวม</TableHead>
                  <TableHead>สินค้า</TableHead>
                  <TableHead>วันที่</TableHead>
                  <TableHead className="w-28" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">ไม่พบข้อมูล</TableCell></TableRow>
                )}
                {items.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.code || r.id?.slice(-8)}</TableCell>
                    <TableCell>{supplierMap.get(r.supplierId) ?? r.supplierId?.slice(-6) ?? "-"}</TableCell>
                    <TableCell className="text-xs">{r.reference || "-"}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">฿{fmt(r.totalCost)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{r.items?.length ?? 0} รายการ</Badge>
                    </TableCell>
                    <TableCell className="text-xs">{r.createdDate ? new Date(r.createdDate).toLocaleDateString("th-TH") : "-"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" title="ดูรายละเอียด" aria-label="ดูรายละเอียด" onClick={() => handleView(r.id)}><Eye className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" title="แก้ไข" aria-label="แก้ไข" onClick={() => openEditGr(r)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" className="text-destructive" title="ลบ" aria-label="ลบ" onClick={() => handleDelete(r.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── Create / Edit GR Dialog (with integrated items) ── */}
      <Dialog open={grOpen} onOpenChange={setGrOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{grEditing ? "แก้ไขใบรับสินค้า" : "สร้างใบรับสินค้า"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>ผู้จัดจำหน่าย *</Label>
                <Select value={grSupplierId} onValueChange={setGrSupplierId}>
                  <SelectTrigger><SelectValue placeholder="เลือกผู้จัดจำหน่าย" /></SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>เลขที่อ้างอิง</Label>
                <Input value={grReference} onChange={(e) => setGrReference(e.target.value)} placeholder="เลข Invoice (ไม่บังคับ)" />
              </div>
            </div>

            {/* ── Add items section (create mode only) ── */}
            {!grEditing && (
              <div className="border rounded-lg p-3 space-y-3">
                <p className="text-sm font-medium">เพิ่มรายการสินค้า</p>
                <div className="space-y-1">
                  <Label className="text-xs">ค้นหาสินค้า (ชื่อ / รหัส)</Label>
                  <Input
                    value={grStockForm.productId ? `${grStockForm.serialNumber} — ${grStockForm.name}` : grProductSearch}
                    onChange={(e) => {
                      if (grStockForm.productId) setGrStockForm(EMPTY_STOCK_ITEM);
                      setGrProductSearch(e.target.value);
                    }}
                    placeholder="พิมพ์เพื่อค้นหาสินค้า…"
                  />
                  {!grStockForm.productId && grProductSearch.trim() && (
                    <div className="border rounded-md max-h-40 overflow-y-auto">
                      {filteredProducts.length === 0 && <p className="text-xs text-muted-foreground p-2">ไม่พบสินค้า</p>}
                      {filteredProducts.map((p) => (
                        <button key={p.id} className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex justify-between" onClick={() => selectProductForGr(p)}>
                          <span>{p.name}</span>
                          <span className="text-muted-foreground font-mono text-xs">{p.serialNumber}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1"><Label className="text-xs">จำนวน *</Label><Input type="number" min={1} value={grStockForm.quantity} onChange={(e) => setGrStockForm((f) => ({ ...f, quantity: parseInt(e.target.value) || 0 }))} /></div>
                  <div className="space-y-1">
                    <Label className="text-xs">หน่วย</Label>
                    {grStockForm.productId && productMap.get(grStockForm.productId)?.units && productMap.get(grStockForm.productId)!.units!.length > 0 ? (
                      <Select value={grStockForm.unit} onValueChange={(v) => {
                        const u = productMap.get(grStockForm.productId)?.units?.find((u) => u.unit === v);
                        setGrStockForm((f) => ({ ...f, unit: v, costPrice: u?.costPrice ?? f.costPrice }));
                      }}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {productMap.get(grStockForm.productId)!.units!.map((u) => (
                            <SelectItem key={u.id} value={u.unit}>{u.unit} (x{u.size})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input value={grStockForm.unit} onChange={(e) => setGrStockForm((f) => ({ ...f, unit: e.target.value }))} placeholder="หน่วย" />
                    )}
                  </div>
                  <div className="space-y-1"><Label className="text-xs">ต้นทุน/หน่วย</Label><Input type="number" min={0} step={0.01} value={grStockForm.costPrice} onChange={(e) => setGrStockForm((f) => ({ ...f, costPrice: parseFloat(e.target.value) || 0 }))} /></div>
                  <div className="space-y-1"><Label className="text-xs">Lot Number *</Label><Input value={grStockForm.lotNumber} onChange={(e) => setGrStockForm((f) => ({ ...f, lotNumber: e.target.value }))} /></div>
                  <div className="space-y-1"><Label className="text-xs">วันหมดอายุ *</Label><Input type="date" value={grStockForm.expireDate} onChange={(e) => setGrStockForm((f) => ({ ...f, expireDate: e.target.value }))} /></div>
                  <div className="flex items-end"><Button onClick={addItemToGr} variant="secondary" className="w-full"><Plus className="h-4 w-4 mr-1" />เพิ่ม</Button></div>
                </div>

                {grItems.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">รายการ ({grItems.length}) · ยอดรวม ฿{fmt(grTotalCost)}</p>
                    <Table>
                      <TableHeader><TableRow>
                        <TableHead className="text-xs">สินค้า</TableHead>
                        <TableHead className="text-xs text-right">จำนวน</TableHead>
                        <TableHead className="text-xs text-right">ต้นทุน</TableHead>
                        <TableHead className="text-xs">Lot</TableHead>
                        <TableHead className="text-xs">หมดอายุ</TableHead>
                        <TableHead className="w-8" />
                      </TableRow></TableHeader>
                      <TableBody>
                        {grItems.map((it, i) => (
                          <TableRow key={i}>
                            <TableCell className="text-xs">{it.name}</TableCell>
                            <TableCell className="text-xs text-right">{it.quantity} {it.unit}</TableCell>
                            <TableCell className="text-xs text-right">฿{fmt(it.costPrice)}</TableCell>
                            <TableCell className="text-xs">{it.lotNumber}</TableCell>
                            <TableCell className="text-xs">{it.expireDate}</TableCell>
                            <TableCell><Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" aria-label="ลบรายการ" onClick={() => removeItemFromGr(i)}><Trash2 className="h-3 w-3" /></Button></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGrOpen(false)}>ยกเลิก</Button>
            <Button onClick={handleSaveGr} disabled={grSaving || (!grEditing && grItems.length === 0)}>
              {grSaving ? "กำลังบันทึก…" : grEditing ? "บันทึก" : `บันทึก (${grItems.length} รายการ)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── View Detail Dialog ──────────────────────────── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>รายละเอียดใบรับสินค้า</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">เลขที่:</span> <span className="font-mono font-medium">{detail.code || detail.id?.slice(-8)}</span></div>
                <div><span className="text-muted-foreground">ผู้จัดจำหน่าย:</span> {supplierMap.get(detail.supplierId) ?? detail.supplierId}</div>
                <div><span className="text-muted-foreground">อ้างอิง:</span> {detail.reference || "-"}</div>
                <div><span className="text-muted-foreground">ยอดรวม:</span> <span className="font-medium">฿{fmt(detail.totalCost)}</span></div>
                <div><span className="text-muted-foreground">สถานะ:</span> <Badge variant="secondary">{detail.status ?? "ACTIVE"}</Badge></div>
                <div><span className="text-muted-foreground">วันที่:</span> {detail.createdDate ? new Date(detail.createdDate).toLocaleString("th-TH") : "-"}</div>
              </div>
              {detail.items && detail.items.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>สินค้า</TableHead>
                      <TableHead className="text-right">จำนวน</TableHead>
                      <TableHead className="text-right">ต้นทุน/หน่วย</TableHead>
                      <TableHead className="text-right">รวม</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detail.items.map((item, i) => {
                      const prod = productMap.get(item.productId);
                      return (
                        <TableRow key={i}>
                          <TableCell>{prod?.name ?? item.productId?.slice(-8)}</TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">฿{fmt(item.costPrice)}</TableCell>
                          <TableCell className="text-right font-medium">฿{fmt(item.costPrice * item.quantity)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">ยังไม่มีรายการสินค้า</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
