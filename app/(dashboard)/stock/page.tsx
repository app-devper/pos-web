"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Pencil, Trash2, Layers, ArrowUpDown } from "lucide-react";
import {
  listProducts, getProductStocks, createProductStock,
  updateProductStock, deleteProductStock, updateStockQuantity,
  getProductUnits, listBranches,
} from "@/lib/pos-api";
import type { ProductDetail, ProductStock, ProductUnit } from "@/types/pos";

interface Branch { id: string; name: string; }

export default function StockPage() {
  const [products, setProducts] = useState<ProductDetail[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Stock sheet
  const [sheetProduct, setSheetProduct] = useState<ProductDetail | null>(null);
  const [stocks, setStocks] = useState<ProductStock[]>([]);
  const [units, setUnits] = useState<ProductUnit[]>([]);
  const [stockLoading, setStockLoading] = useState(false);

  // Add/Edit stock dialog
  const [stockOpen, setStockOpen] = useState(false);
  const [editingStock, setEditingStock] = useState<ProductStock | null>(null);
  const [stockForm, setStockForm] = useState({ branchId: "", unitId: "", quantity: 0, costPrice: 0 });
  const [savingStock, setSavingStock] = useState(false);

  // Adjust quantity dialog
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustTarget, setAdjustTarget] = useState<ProductStock | null>(null);
  const [adjustQty, setAdjustQty] = useState(0);
  const [adjusting, setAdjusting] = useState(false);

  const fmtDate = (value?: string) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "numeric" });
  };

  useEffect(() => {
    Promise.all([listProducts(), listBranches()])
      .then(([p, b]) => {
        setProducts(Array.isArray(p) ? p : []);
        setBranches(Array.isArray(b) ? (b as Branch[]) : []);
      })
      .catch(() => toast.error("โหลดข้อมูลไม่สำเร็จ"))
      .finally(() => setLoading(false));
  }, []);

  const loadStocks = useCallback((productId: string) => {
    setStockLoading(true);
    Promise.all([getProductStocks(productId), getProductUnits(productId)])
      .then(([s, u]) => {
        setStocks(Array.isArray(s) ? s : []);
        setUnits(Array.isArray(u) ? u : []);
      })
      .catch(() => toast.error("โหลด stock ไม่สำเร็จ"))
      .finally(() => setStockLoading(false));
  }, []);

  function openSheet(p: ProductDetail) {
    setSheetProduct(p);
    setStocks([]);
    setUnits([]);
    loadStocks(p.id);
  }

  function openAddStock() {
    setEditingStock(null);
    setStockForm({ branchId: branches[0]?.id ?? "", unitId: units[0]?.id ?? "", quantity: 0, costPrice: 0 });
    setStockOpen(true);
  }

  function openEditStock(s: ProductStock) {
    setEditingStock(s);
    setStockForm({ branchId: s.branchId, unitId: s.unitId, quantity: s.quantity, costPrice: s.costPrice });
    setStockOpen(true);
  }

  async function handleSaveStock() {
    if (!sheetProduct) return;
    setSavingStock(true);
    try {
      if (editingStock) {
        await updateProductStock(editingStock.id, {
          productId: sheetProduct.id,
          unitId: stockForm.unitId,
          costPrice: stockForm.costPrice,
          expireDate: editingStock.expireDate ?? new Date().toISOString(),
          importDate: editingStock.importDate ?? new Date().toISOString(),
        });
      } else {
        await createProductStock({
          productId: sheetProduct.id,
          branchId: stockForm.branchId,
          unitId: stockForm.unitId,
          quantity: stockForm.quantity,
          costPrice: stockForm.costPrice,
          expireDate: new Date().toISOString(),
          importDate: new Date().toISOString(),
        });
      }
      toast.success(editingStock ? "อัปเดต stock แล้ว" : "เพิ่ม stock แล้ว");
      setStockOpen(false);
      loadStocks(sheetProduct.id);
    } catch (e: unknown) {
      toast.error(
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "บันทึกไม่สำเร็จ"
      );
    } finally {
      setSavingStock(false);
    }
  }

  async function handleDeleteStock(stockId: string) {
    if (!sheetProduct || !confirm("ลบ stock นี้?")) return;
    try {
      await deleteProductStock(stockId);
      toast.success("ลบแล้ว");
      loadStocks(sheetProduct.id);
    } catch { toast.error("ลบไม่สำเร็จ"); }
  }

  function openAdjust(s: ProductStock) {
    setAdjustTarget(s);
    setAdjustQty(s.quantity);
    setAdjustOpen(true);
  }

  async function handleAdjust() {
    if (!adjustTarget || !sheetProduct) return;
    setAdjusting(true);
    try {
      await updateStockQuantity(adjustTarget.id, { quantity: adjustQty });
      toast.success("ปรับจำนวนแล้ว");
      setAdjustOpen(false);
      loadStocks(sheetProduct.id);
    } catch { toast.error("ปรับไม่สำเร็จ"); }
    finally { setAdjusting(false); }
  }

  const getBranchName = (id: string) => branches.find((b) => b.id === id)?.name ?? id;
  const getUnitLabel = (id: string) => {
    const u = units.find((u) => u.id === id);
    return u ? `${u.unit || "ชิ้น"} (x${u.size})` : id;
  };

  const filtered = products.filter((p) =>
    !search ||
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.serialNumber?.toLowerCase().includes(search.toLowerCase())
  );

  const fmt = (n: number) => new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2 }).format(n);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">จัดการ Stock</h1>

      <Card>
        <CardHeader className="pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ค้นหาสินค้า / รหัส…"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ชื่อสินค้า</TableHead>
                  <TableHead>รหัส</TableHead>
                  <TableHead>หมวดหมู่</TableHead>
                  <TableHead>หน่วย</TableHead>
                  <TableHead className="text-right">คงเหลือ</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">ไม่พบสินค้า</TableCell>
                  </TableRow>
                )}
                {filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{p.serialNumber}</TableCell>
                    <TableCell>{p.category ?? "-"}</TableCell>
                    <TableCell>{p.unit || "ชิ้น"}</TableCell>
                    <TableCell className="text-right">
                      {(() => {
                        const total = Array.isArray(p.stocks) && p.stocks.length > 0
                          ? p.stocks.reduce((s, st) => s + (st.quantity ?? 0), 0)
                          : p.quantity;
                        return (
                          <span className={total <= 0 ? "text-destructive font-semibold" : total <= 10 ? "text-yellow-600 font-semibold" : ""}>
                            {total}
                          </span>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => openSheet(p)}>
                        <Layers className="h-4 w-4 mr-1" />Stock
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Stock Sheet */}
      <Sheet open={!!sheetProduct} onOpenChange={(v) => { if (!v) setSheetProduct(null); }}>
        <SheetContent className="w-full sm:max-w-2xl flex flex-col gap-0 p-0">
          <SheetHeader className="px-6 py-4 border-b">
            <SheetTitle>Stock: {sheetProduct?.name}</SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto">
            <div className="px-6 py-3 flex justify-end border-b">
              <Button size="sm" onClick={openAddStock}>
                <Plus className="h-4 w-4 mr-2" />เพิ่ม Stock
              </Button>
            </div>

            {stockLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              </div>
            ) : stocks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
                <Layers className="h-10 w-10 opacity-30" />
                <p className="text-sm">ยังไม่มี stock</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>สาขา</TableHead>
                    <TableHead>หน่วย</TableHead>
                    <TableHead>หมดอายุ</TableHead>
                    <TableHead className="text-right">จำนวน</TableHead>
                    <TableHead className="text-right">ต้นทุน</TableHead>
                    <TableHead className="w-28" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stocks.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="text-sm">{getBranchName(s.branchId)}</TableCell>
                      <TableCell className="text-sm">{getUnitLabel(s.unitId)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{fmtDate(s.expireDate)}</TableCell>
                      <TableCell className="text-right">
                        <span className={s.quantity <= 0 ? "text-destructive font-semibold" : s.quantity <= 10 ? "text-yellow-600 font-semibold" : "font-medium"}>
                          {s.quantity}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-sm">฿{fmt(s.costPrice)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-end">
                          <Button size="icon" variant="ghost" className="h-8 w-8" title="ปรับจำนวน" aria-label="ปรับจำนวน" onClick={() => openAdjust(s)}>
                            <ArrowUpDown className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="แก้ไข" onClick={() => openEditStock(s)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" aria-label="ลบ" onClick={() => handleDeleteStock(s.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Add/Edit Stock Dialog */}
      <Dialog open={stockOpen} onOpenChange={setStockOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingStock ? "แก้ไข Stock" : "เพิ่ม Stock"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {!editingStock && (
              <div className="space-y-1">
                <Label>สาขา *</Label>
                <Select value={stockForm.branchId} onValueChange={(v) => setStockForm((f) => ({ ...f, branchId: v }))}>
                  <SelectTrigger><SelectValue placeholder="เลือกสาขา" /></SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1">
              <Label>หน่วย</Label>
              <Select value={stockForm.unitId} onValueChange={(v) => setStockForm((f) => ({ ...f, unitId: v }))}>
                <SelectTrigger><SelectValue placeholder="เลือกหน่วย (ถ้ามี)" /></SelectTrigger>
                <SelectContent>
                  {units.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.unit || "ชิ้น"} (x{u.size})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {!editingStock && (
              <div className="space-y-1">
                <Label>จำนวน *</Label>
                <Input
                  type="number"
                  min={0}
                  value={stockForm.quantity === 0 ? "" : stockForm.quantity}
                  onChange={(e) => setStockForm((f) => ({ ...f, quantity: +e.target.value }))}
                  className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            )}
            <div className="space-y-1">
              <Label>ต้นทุน</Label>
                <Input
                  type="number"
                  min={0}
                  value={stockForm.costPrice === 0 ? "" : stockForm.costPrice}
                  onChange={(e) => setStockForm((f) => ({ ...f, costPrice: +e.target.value }))}
                  className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStockOpen(false)}>ยกเลิก</Button>
            <Button onClick={handleSaveStock} disabled={savingStock}>
              {savingStock ? "กำลังบันทึก…" : "บันทึก"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjust Quantity Dialog */}
      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>ปรับจำนวน Stock</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              สาขา: <span className="text-foreground font-medium">{adjustTarget ? getBranchName(adjustTarget.branchId) : "-"}</span>
            </div>
            <div className="space-y-1">
              <Label>จำนวนใหม่ *</Label>
              <Input
                type="number"
                min={0}
                value={adjustQty === 0 ? "" : adjustQty}
                onChange={(e) => setAdjustQty(+e.target.value)}
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleAdjust()}
                className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustOpen(false)}>ยกเลิก</Button>
            <Button onClick={handleAdjust} disabled={adjusting}>
              {adjusting ? "กำลังปรับ…" : "ยืนยัน"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
