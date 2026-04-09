"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Eye, CheckCircle, XCircle } from "lucide-react";
import { listStockTransfers, createStockTransfer, getStockTransfer, approveStockTransfer, rejectStockTransfer, listBranches, listProducts } from "@/lib/pos-api";
import { withRouteAccess } from "@/components/withRouteAccess";
import type { Branch, ProductDetail, StockTransfer, StockTransferRequest } from "@/types/pos";
import { hasPermission } from "@/lib/rbac";

const EMPTY: StockTransferRequest = { toBranchId: "", items: [{ productId: "", quantity: 1 }], note: "" };

function StockTransfersPage() {
  const canManageStockTransfers = hasPermission("products:update");
  const [items, setItems] = useState<StockTransfer[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [products, setProducts] = useState<ProductDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<StockTransferRequest>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState<StockTransfer | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([listStockTransfers(), listBranches(), listProducts()])
      .then(([transfers, branchList, productList]) => {
        setItems(Array.isArray(transfers) ? transfers : []);
        setBranches(Array.isArray(branchList) ? branchList : []);
        setProducts(Array.isArray(productList) ? productList : []);
      })
      .catch(() => toast.error("โหลดข้อมูลไม่สำเร็จ"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  async function handleView(id: string) {
    try { setDetail(await getStockTransfer(id)); setDetailOpen(true); }
    catch { toast.error("โหลดรายละเอียดไม่สำเร็จ"); }
  }

  async function handleApprove(id: string) {
    if (!canManageStockTransfers) return;
    try { await approveStockTransfer(id); toast.success("อนุมัติแล้ว"); load(); }
    catch { toast.error("ไม่สำเร็จ"); }
  }

  async function handleReject(id: string) {
    if (!canManageStockTransfers) return;
    try { await rejectStockTransfer(id); toast.success("ปฏิเสธแล้ว"); load(); }
    catch { toast.error("ไม่สำเร็จ"); }
  }

  async function handleSave() {
    if (!canManageStockTransfers) return;
    if (!form.toBranchId.trim()) return toast.error("กรุณาเลือกสาขาปลายทาง");
    if (form.items.some((item) => !item.productId || item.quantity <= 0)) {
      return toast.error("กรุณาเลือกสินค้าและระบุจำนวนให้ถูกต้อง");
    }
    setSaving(true);
    try {
      await createStockTransfer(form);
      toast.success("สร้างคำขอโอนสต็อกแล้ว");
      setOpen(false); setForm(EMPTY); load();
    } catch { toast.error("บันทึกไม่สำเร็จ"); }
    finally { setSaving(false); }
  }

  const statusVariant = (s: string) => s === "APPROVED" ? "default" : s === "REJECTED" ? "destructive" : "secondary";
  const branchMap = useMemo(() => new Map(branches.map((branch) => [branch.id, branch.name])), [branches]);
  const productMap = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">โอนสต็อก</h1>
        {canManageStockTransfers && <Button onClick={() => { setForm(EMPTY); setOpen(true); }}><Plus className="h-4 w-4 mr-2" />สร้างคำขอโอน</Button>}
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
                  <TableCell className="text-xs">{branchMap.get(r.fromBranchId) ?? r.fromBranchId?.slice(-8) ?? "-"}</TableCell>
                  <TableCell className="text-xs">{branchMap.get(r.toBranchId) ?? r.toBranchId?.slice(-8)}</TableCell>
                  <TableCell><Badge variant={statusVariant(r.status)}>{r.status}</Badge></TableCell>
                  <TableCell className="text-xs">{r.createdDate ? new Date(r.createdDate).toLocaleDateString("th-TH") : "-"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" aria-label="ดูรายละเอียด" onClick={() => handleView(r.id)}><Eye className="h-4 w-4" /></Button>
                      {r.status === "PENDING" && <>
                        {canManageStockTransfers && <Button size="icon" variant="ghost" className="text-green-600" aria-label="อนุมัติ" onClick={() => handleApprove(r.id)}><CheckCircle className="h-4 w-4" /></Button>}
                        {canManageStockTransfers && <Button size="icon" variant="ghost" className="text-destructive" aria-label="ปฏิเสธ" onClick={() => handleReject(r.id)}><XCircle className="h-4 w-4" /></Button>}
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
            <div className="space-y-1">
              <Label>สาขาปลายทาง *</Label>
              <Select value={form.toBranchId} onValueChange={(value) => setForm((current) => ({ ...current, toBranchId: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกสาขา" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>หมายเหตุ</Label><Input value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} /></div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>รายการสินค้า</Label>
                <Button size="sm" variant="outline" onClick={() => setForm((f) => ({ ...f, items: [...f.items, { productId: "", quantity: 1 }] }))} disabled={!canManageStockTransfers}>+ เพิ่ม</Button>
              </div>
              {form.items.map((item, i) => (
                <div key={i} className="flex gap-2">
                  <Select value={item.productId} onValueChange={(value) => setForm((current) => {
                    const items = [...current.items];
                    items[i] = { ...items[i], productId: value };
                    return { ...current, items };
                  })}>
                    <SelectTrigger className="flex-1 h-8 text-xs">
                      <SelectValue placeholder="เลือกสินค้า" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} ({product.serialNumber})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input className="w-20 h-8 text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" type="number" placeholder="จำนวน" value={item.quantity === 0 ? "" : item.quantity} onChange={(e) => setForm((f) => { const items = [...f.items]; items[i] = { ...items[i], quantity: +e.target.value }; return { ...f, items }; })} />
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>ยกเลิก</Button>
            <Button onClick={handleSave} disabled={saving || !canManageStockTransfers}>{saving ? "กำลังบันทึก…" : "บันทึก"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>รายละเอียดการโอนสต็อก</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">จากสาขา:</span> {branchMap.get(detail.fromBranchId) ?? detail.fromBranchId}</div>
                <div><span className="text-muted-foreground">ไปสาขา:</span> {branchMap.get(detail.toBranchId) ?? detail.toBranchId}</div>
                <div><span className="text-muted-foreground">สถานะ:</span> {detail.status}</div>
                <div><span className="text-muted-foreground">วันที่:</span> {detail.createdDate ? new Date(detail.createdDate).toLocaleString("th-TH") : "-"}</div>
                {detail.note && <div className="col-span-2"><span className="text-muted-foreground">หมายเหตุ:</span> {detail.note}</div>}
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>สินค้า</TableHead>
                    <TableHead className="text-right">จำนวน</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.items?.map((item, index) => (
                    <TableRow key={`${item.productId}-${index}`}>
                      <TableCell>{productMap.get(item.productId)?.name ?? item.productId}</TableCell>
                      <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default withRouteAccess(StockTransfersPage, { roles: ["ADMIN", "SUPER"] });
