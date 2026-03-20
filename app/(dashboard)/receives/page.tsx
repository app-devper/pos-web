"use client";

import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Pencil, Search, ChevronLeft, RefreshCw, Package, PackageCheck } from "lucide-react";
import {
  listReceives, getReceive, createReceive, updateReceive, deleteReceive,
  listSuppliers, listProducts, importReceiveToStock, createSupplier,
} from "@/lib/pos-api";
import type { Receive, Supplier, ProductDetail, CreateReceiveItemData } from "@/types/pos";
import { useConfirm } from "@/components/ConfirmDialog";

const fmt = (n: number) => new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2 }).format(n ?? 0);

function generateLotNumber(): string {
  const now = new Date();
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const timePart = `${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
  return `LOT-${datePart}-${timePart}`;
}

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

interface GrFormErrors {
  supplierId?: string;
  productId?: string;
  quantity?: string;
  lotNumber?: string;
  expireDate?: string;
}

const EMPTY_STOCK_ITEM: StockItemForm = {
  productId: "", serialNumber: "", name: "", unit: "", quantity: 1, costPrice: 0, price: 0, lotNumber: "", expireDate: "",
};

const EMPTY_SUPPLIER_FORM = { name: "", phone: "", email: "", address: "", taxId: "" };

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
  const [grErrors, setGrErrors] = useState<GrFormErrors>({});
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [supplierSaving, setSupplierSaving] = useState(false);
  const [supplierForm, setSupplierForm] = useState(EMPTY_SUPPLIER_FORM);

  // ─── View Detail panel ──────────────────────────────────
  const [detail, setDetail] = useState<Receive | null>(null);
  const [importing, setImporting] = useState(false);
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

  const loadSuppliers = () => {
    listSuppliers().then((d) => setSuppliers(Array.isArray(d) ? d : [])).catch(() => {});
  };

  useEffect(() => {
    load();
    loadSuppliers();
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
    setGrErrors({});
    setDetail(null);
    setGrOpen(true);
  }

  function openCreateSupplier() {
    setSupplierForm(EMPTY_SUPPLIER_FORM);
    setSupplierOpen(true);
  }

  function openEditGr(r: Receive) {
    setGrEditing(r);
    setGrSupplierId(r.supplierId ?? "");
    setGrReference(r.reference ?? "");
    const existingItems: StockItemForm[] = (r.items ?? []).map((it) => {
      const prod = productMap.get(it.productId);
      return {
        productId: it.productId,
        serialNumber: prod?.serialNumber ?? "",
        name: prod?.name ?? it.productId?.slice(-8) ?? "",
        unit: prod?.unit ?? "",
        quantity: it.quantity,
        costPrice: it.costPrice,
        price: prod?.price ?? 0,
        lotNumber: it.lotNumber ?? "",
        expireDate: it.expireDate ? new Date(it.expireDate).toISOString().split("T")[0] : "",
      };
    });
    setGrItems(existingItems);
    setGrStockForm(EMPTY_STOCK_ITEM);
    setGrProductSearch("");
    setGrErrors({});
    setGrOpen(true);
  }

  function selectProductForGr(p: ProductDetail) {
    const selectedUnit = p.units?.[0];
    setGrStockForm((f) => ({
      ...f,
      productId: p.id,
      serialNumber: p.serialNumber,
      name: p.name,
      unit: selectedUnit?.unit || p.unit || "ชิ้น",
      costPrice: selectedUnit?.costPrice ?? p.costPrice ?? 0,
      price: p.price ?? 0,
    }));
    setGrProductSearch("");
    setGrErrors((prev) => ({ ...prev, productId: undefined }));
  }

  function addItemToGr() {
    const nextErrors: GrFormErrors = {};
    if (!grStockForm.productId) nextErrors.productId = "กรุณาเลือกสินค้า";
    if (!grStockForm.lotNumber.trim()) nextErrors.lotNumber = "กรุณากรอก Lot Number";
    if (!grStockForm.expireDate) nextErrors.expireDate = "กรุณากรอกวันหมดอายุ";
    if (grStockForm.quantity <= 0) nextErrors.quantity = "จำนวนต้องมากกว่า 0";
    if (Object.keys(nextErrors).length > 0) {
      setGrErrors((prev) => ({ ...prev, ...nextErrors }));
      return toast.error(Object.values(nextErrors)[0]);
    }
    setGrItems((prev) => [...prev, { ...grStockForm }]);
    setGrStockForm(EMPTY_STOCK_ITEM);
    setGrProductSearch("");
    setGrErrors((prev) => ({
      ...prev,
      productId: undefined,
      quantity: undefined,
      lotNumber: undefined,
      expireDate: undefined,
    }));
  }

  function removeItemFromGr(idx: number) {
    setGrItems((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSaveGr() {
    if (!grSupplierId) {
      setGrErrors((prev) => ({ ...prev, supplierId: "กรุณาเลือกผู้จัดจำหน่าย" }));
      return toast.error("กรุณาเลือกผู้จัดจำหน่าย");
    }
    setGrSaving(true);
    try {
      if (grEditing) {
        const editItems: CreateReceiveItemData[] = grItems.map((it) => ({
          productId: it.productId,
          costPrice: it.costPrice,
          quantity: it.quantity,
          lotNumber: it.lotNumber,
          expireDate: new Date(it.expireDate).toISOString(),
        }));
        const updated = await updateReceive(grEditing.id, {
          supplierId: grSupplierId,
          reference: grReference,
          totalCost: grTotalCost,
          items: editItems,
        });
        toast.success("อัปเดตใบรับสินค้าแล้ว");
        setGrOpen(false);
        setDetail(updated);
        load();
      } else {
        const receiveItems: CreateReceiveItemData[] = grItems.map((it) => ({
          productId: it.productId,
          costPrice: it.costPrice,
          quantity: it.quantity,
          lotNumber: it.lotNumber,
          expireDate: new Date(it.expireDate).toISOString(),
        }));
        const created = await createReceive({ supplierId: grSupplierId, reference: grReference, items: receiveItems });
        toast.success(`สร้างใบรับสินค้าแล้ว (${grItems.length} รายการ)`);
        setGrOpen(false);
        try { const d = await getReceive(created.id); setDetail(d); } catch {}
        load();
      }
    } catch {
      toast.error("บันทึกไม่สำเร็จ");
    } finally {
      setGrSaving(false);
    }
  }

  function closeGrPanel() {
    setGrOpen(false);
  }

  async function handleCreateSupplier() {
    if (!supplierForm.name.trim()) return toast.error("กรุณากรอกชื่อผู้จัดจำหน่าย");
    if (!supplierForm.address.trim()) return toast.error("กรุณากรอกที่อยู่");
    setSupplierSaving(true);
    try {
      const created = await createSupplier(supplierForm);
      await loadSuppliers();
      setGrSupplierId(created?.id ?? "");
      setSupplierOpen(false);
      setSupplierForm(EMPTY_SUPPLIER_FORM);
      toast.success("เพิ่มผู้จัดจำหน่ายแล้ว");
    } catch {
      toast.error("บันทึกผู้จัดจำหน่ายไม่สำเร็จ");
    } finally {
      setSupplierSaving(false);
    }
  }

  // ─── View Detail ─────────────────────────────────────────
  async function handleView(id: string) {
    try {
      const d = await getReceive(id);
      setDetail(d);
      setGrOpen(false);
    } catch {
      toast.error("โหลดรายละเอียดไม่สำเร็จ");
    }
  }

  // ─── Import to Stock ────────────────────────────────────
  async function handleImportToStock(id: string) {
    if (!(await confirm({ description: "นำเข้าสินค้าลงสต็อก? เมื่อนำเข้าแล้วจะไม่สามารถแก้ไขได้" }))) return;
    setImporting(true);
    try {
      const result = await importReceiveToStock(id);
      setDetail(result);
      toast.success("นำเข้าสต็อกสำเร็จ");
      load();
    } catch {
      toast.error("นำเข้าสต็อกไม่สำเร็จ");
    } finally {
      setImporting(false);
    }
  }

  // ─── Delete ──────────────────────────────────────────────
  async function handleDelete(id: string) {
    if (!(await confirm({ description: "ลบรายการรับสินค้านี้?", destructive: true }))) return;
    try {
      await deleteReceive(id);
      toast.success("ลบแล้ว");
      if (detail?.id === id) setDetail(null);
      load();
    } catch {
      toast.error("ลบไม่สำเร็จ");
    }
  }

  const grTotalCost = grItems.reduce((sum, it) => sum + it.costPrice * it.quantity, 0);

  // ─── Render ──────────────────────────────────────────────
  return (
    <div className="-m-4 md:-m-6 flex h-screen border-t overflow-hidden bg-background">

      {/* ── Left: Receive list ── */}
      <div className={`${(grOpen || detail) ? "hidden md:flex" : "flex"} w-full md:w-80 shrink-0 flex-col md:border-r`}>
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b shrink-0">
          <h1 className="text-base font-semibold">ใบรับสินค้า</h1>
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" className="h-8 w-8" title="รีเฟรช" onClick={load} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button size="sm" onClick={openCreateGr}><Plus className="h-4 w-4 mr-1" />สร้าง</Button>
          </div>
        </div>
        {/* Date filter */}
        <div className="flex items-center gap-1.5 px-3 py-2 border-b shrink-0">
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="text-xs h-8 flex-1" />
          <span className="text-xs text-muted-foreground">–</span>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="text-xs h-8 flex-1" />
          <Button size="icon" variant="secondary" className="h-8 w-8 shrink-0" onClick={load}><Search className="h-3.5 w-3.5" /></Button>
        </div>
        {/* List */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {loading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
              <Package className="h-8 w-8 opacity-30" />
              <p className="text-xs">ไม่พบใบรับสินค้า</p>
            </div>
          ) : (
            items.map((r) => {
              const isActive = detail?.id === r.id && !grOpen;
              return (
                <div key={r.id}>
                  <button
                    onClick={() => handleView(r.id)}
                    className={`w-full text-left px-4 py-3 flex items-center justify-between transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset ${isActive ? "bg-primary/10 border-l-2 border-primary" : "hover:bg-accent"}`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium truncate">{r.code || r.id?.slice(-8)}</p>
                        {r.status === "IMPORTED" && <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4 shrink-0">นำเข้าแล้ว</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{supplierMap.get(r.supplierId) ?? "-"}</p>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <p className="text-sm font-medium tabular-nums">฿{fmt(r.totalCost)}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{r.createdDate ? new Date(r.createdDate).toLocaleDateString("th-TH") : ""}</p>
                    </div>
                  </button>
                  <Separator />
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Right: Panel ── */}
      <div className={`${!grOpen && !detail ? "hidden md:block" : "block"} flex-1 min-w-0 overflow-hidden`}>
        {grOpen ? (
          /* ── Create / Edit form panel ── */
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-3 px-4 sm:px-6 py-4 border-b shrink-0">
              <button onClick={closeGrPanel} className="rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h2 className="text-lg font-semibold">{grEditing ? "แก้ไขใบรับสินค้า" : "สร้างใบรับสินค้า"}</h2>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-6 space-y-4">
              {/* Supplier + Reference */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl border bg-card p-4 space-y-3 sm:col-span-2">
                  <div>
                    <h3 className="text-sm font-semibold">ข้อมูลใบรับสินค้า</h3>
                    <p className="text-xs text-muted-foreground">เลือกผู้จัดจำหน่ายและกรอกเลขที่อ้างอิงถ้ามี</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">ผู้จัดจำหน่าย *</Label>
                      <div className="flex gap-2">
                        <Select value={grSupplierId} onValueChange={(value) => {
                          setGrSupplierId(value);
                          setGrErrors((prev) => ({ ...prev, supplierId: undefined }));
                        }}>
                          <SelectTrigger className="flex-1"><SelectValue placeholder="เลือกผู้จัดจำหน่าย" /></SelectTrigger>
                          <SelectContent>
                            {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Button type="button" variant="outline" onClick={openCreateSupplier}>
                          <Plus className="h-4 w-4 mr-1" />เพิ่ม
                        </Button>
                      </div>
                      {grErrors.supplierId && <p className="text-xs text-destructive">{grErrors.supplierId}</p>}
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">เลขที่อ้างอิง</Label>
                      <Input autoComplete="off" value={grReference} onChange={(e) => setGrReference(e.target.value)} placeholder="เลข Invoice (ไม่บังคับ)" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-4 space-y-3 bg-card">
                  <div>
                    <h3 className="text-sm font-semibold">เพิ่มรายการสินค้า</h3>
                    <p className="text-xs text-muted-foreground">ค้นหาสินค้า กรอกจำนวน ต้นทุน Lot และวันหมดอายุก่อนเพิ่ม</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">ค้นหาสินค้า (ชื่อ / รหัส)</Label>
                    <Input
                      autoComplete="off"
                      value={grStockForm.productId ? `${grStockForm.serialNumber} — ${grStockForm.name}` : grProductSearch}
                      onChange={(e) => {
                        if (grStockForm.productId) setGrStockForm(EMPTY_STOCK_ITEM);
                        setGrProductSearch(e.target.value);
                      }}
                      placeholder="พิมพ์เพื่อค้นหาสินค้า…"
                    />
                    {grErrors.productId && <p className="text-xs text-destructive">{grErrors.productId}</p>}
                    {!grStockForm.productId && grProductSearch.trim() && (
                      <div className="border rounded-md max-h-40 overflow-y-auto">
                        {filteredProducts.length === 0 && <p className="text-xs text-muted-foreground p-2">ไม่พบสินค้า</p>}
                        {filteredProducts.map((p) => (
                          <button key={p.id} className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset" onClick={() => selectProductForGr(p)}>
                            <span>{p.name}</span>
                            <span className="text-muted-foreground font-mono text-xs">{p.serialNumber}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">จำนวน *</Label>
                      <Input type="number" min={1} value={grStockForm.quantity} onChange={(e) => {
                        setGrStockForm((f) => ({ ...f, quantity: parseInt(e.target.value) || 0 }));
                        setGrErrors((prev) => ({ ...prev, quantity: undefined }));
                      }} />
                      {grErrors.quantity && <p className="text-xs text-destructive">{grErrors.quantity}</p>}
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">หน่วย</Label>
                      {grStockForm.productId && productMap.get(grStockForm.productId)?.units && productMap.get(grStockForm.productId)!.units!.length > 0 ? (
                        <Select value={grStockForm.unit} onValueChange={(v) => {
                          const u = productMap.get(grStockForm.productId)?.units?.find((u) => u.unit === v);
                          setGrStockForm((f) => ({ ...f, unit: v, costPrice: u?.costPrice ?? f.costPrice }));
                        }}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {productMap.get(grStockForm.productId)!.units!.filter((u) => u.unit).map((u) => (
                              <SelectItem key={u.id} value={u.unit}>{u.unit || "ชิ้น"} (x{u.size})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input value={grStockForm.unit} onChange={(e) => setGrStockForm((f) => ({ ...f, unit: e.target.value }))} placeholder="หน่วย" />
                      )}
                    </div>
                    <div className="space-y-1"><Label className="text-xs">ต้นทุน/หน่วย</Label><Input type="number" min={0} step={0.01} value={grStockForm.costPrice} onChange={(e) => setGrStockForm((f) => ({ ...f, costPrice: parseFloat(e.target.value) || 0 }))} /></div>
                    <div className="space-y-1">
                      <Label className="text-xs">Lot Number *</Label>
                      <div className="flex gap-2">
                        <Input autoComplete="off" value={grStockForm.lotNumber} onChange={(e) => {
                          setGrStockForm((f) => ({ ...f, lotNumber: e.target.value }));
                          setGrErrors((prev) => ({ ...prev, lotNumber: undefined }));
                        }} />
                        <Button type="button" variant="outline" onClick={() => setGrStockForm((f) => ({ ...f, lotNumber: generateLotNumber() }))}>Gen</Button>
                      </div>
                      {grErrors.lotNumber && <p className="text-xs text-destructive">{grErrors.lotNumber}</p>}
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">วันหมดอายุ *</Label>
                      <Input type="date" value={grStockForm.expireDate} onChange={(e) => {
                        setGrStockForm((f) => ({ ...f, expireDate: e.target.value }));
                        setGrErrors((prev) => ({ ...prev, expireDate: undefined }));
                      }} />
                      {grErrors.expireDate && <p className="text-xs text-destructive">{grErrors.expireDate}</p>}
                    </div>
                    <div className="flex items-end"><Button onClick={addItemToGr} variant="secondary" className="w-full"><Plus className="h-4 w-4 mr-1" />เพิ่ม</Button></div>
                  </div>

                  {grItems.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">รายการ ({grItems.length}) · ยอดรวม ฿{fmt(grTotalCost)}</p>
                      <div className="overflow-x-auto">
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
                    </div>
                  )}
                </div>
            </div>
            {/* Footer */}
            <div className="shrink-0 border-t px-4 sm:px-6 py-4 flex justify-end gap-2">
              <Button variant="outline" onClick={closeGrPanel}>ยกเลิก</Button>
              <Button onClick={handleSaveGr} disabled={grSaving || grItems.length === 0}>
                {grSaving ? "กำลังบันทึก…" : `บันทึก (${grItems.length} รายการ)`}
              </Button>
            </div>
          </div>
        ) : detail ? (
          /* ── Detail panel ── */
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <button onClick={() => setDetail(null)} className="text-muted-foreground hover:text-foreground shrink-0">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold truncate">{detail.code || detail.id?.slice(-8)}</h2>
                  <p className="text-xs text-muted-foreground truncate">{supplierMap.get(detail.supplierId) ?? "-"}</p>
                </div>
              </div>
              <div className="flex gap-1">
                {detail.status !== "IMPORTED" && (
                  <>
                    <Button size="sm" variant="default" onClick={() => handleImportToStock(detail.id)} disabled={importing || !detail.items?.length}>
                      <PackageCheck className="h-4 w-4 mr-1" />{importing ? "กำลังนำเข้า…" : "นำเข้าสต็อก"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openEditGr(detail)}>
                      <Pencil className="h-4 w-4 mr-1" />แก้ไข
                    </Button>
                    <Button size="sm" variant="outline" className="text-destructive border-destructive/30" onClick={() => handleDelete(detail.id)}>
                      <Trash2 className="h-4 w-4 mr-1" />ลบ
                    </Button>
                  </>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-6 space-y-4">
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div><span className="text-muted-foreground">อ้างอิง:</span> <span className="font-medium">{detail.reference || "-"}</span></div>
                <div><span className="text-muted-foreground">ยอดรวม:</span> <span className="font-semibold tabular-nums text-primary">฿{fmt(detail.totalCost)}</span></div>
                <div><span className="text-muted-foreground">สถานะ:</span> <Badge variant={detail.status === "IMPORTED" ? "default" : "secondary"} className="ml-1">{detail.status === "IMPORTED" ? "นำเข้าแล้ว" : "รอนำเข้า"}</Badge></div>
                <div><span className="text-muted-foreground">วันที่:</span> {detail.createdDate ? new Date(detail.createdDate).toLocaleString("th-TH") : "-"}</div>
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-semibold mb-2">รายการสินค้า ({detail.items?.length ?? 0})</h3>
                {detail.items && detail.items.length > 0 ? (
                  <div className="overflow-x-auto">
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
                              <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                              <TableCell className="text-right tabular-nums">฿{fmt(item.costPrice)}</TableCell>
                              <TableCell className="text-right font-medium tabular-nums">฿{fmt(item.costPrice * item.quantity)}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">ยังไม่มีรายการสินค้า</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* ── Empty state ── */
          <div className="hidden md:flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
            <Package className="h-12 w-12 opacity-20" />
            <p className="text-sm">เลือกใบรับสินค้าเพื่อดูรายละเอียด</p>
            <Button variant="outline" size="sm" onClick={openCreateGr}>
              <Plus className="h-4 w-4 mr-1" />สร้างใบรับสินค้า
            </Button>
          </div>
        )}
      </div>

      <Dialog open={supplierOpen} onOpenChange={setSupplierOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>เพิ่มผู้จัดจำหน่าย</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {[["name", "ชื่อ *"], ["phone", "โทรศัพท์"], ["email", "อีเมล"], ["address", "ที่อยู่ *"], ["taxId", "เลขประจำตัวผู้เสียภาษี"]].map(([k, l]) => (
              <div key={k} className="space-y-1">
                <Label>{l}</Label>
                <Input
                  value={supplierForm[k as keyof typeof supplierForm]}
                  onChange={(e) => setSupplierForm((f) => ({ ...f, [k]: e.target.value }))}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSupplierOpen(false)}>ยกเลิก</Button>
            <Button onClick={handleCreateSupplier} disabled={supplierSaving}>
              {supplierSaving ? "กำลังบันทึก…" : "บันทึก"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
