"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Search, ToggleLeft, Receipt, X } from "lucide-react";
import { listCustomers, createCustomer, updateCustomer, deleteCustomer, updateCustomerStatus, getOrdersByCustomer } from "@/lib/pos-api";
import { getPaymentSummary } from "@/lib/payment-summary";
import type { Customer, CustomerRequest, Order } from "@/types/pos";
import { useConfirm } from "@/components/ConfirmDialog";
import { CUSTOMER_TYPE_LABEL, CUSTOMER_TYPES } from "@/app/(dashboard)/sale/_utils";

const EMPTY: CustomerRequest = { name: "", customerType: "General", address: "", phone: "", email: "" };

export default function CustomersPage() {
  const [items, setItems] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState<CustomerRequest>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);
  const [historyOrders, setHistoryOrders] = useState<Order[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const confirm = useConfirm();

  const load = () => {
    setLoading(true);
    listCustomers()
      .then(setItems)
      .catch(() => toast.error("โหลดข้อมูลไม่สำเร็จ"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  function openCreate() { setEditing(null); setForm(EMPTY); setOpen(true); }
  function openEdit(c: Customer) {
    setEditing(c);
    setForm({ name: c.name, customerType: c.customerType ?? "General", address: c.address ?? "", phone: c.phone ?? "", email: c.email ?? "" });
    setOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) return toast.error("กรุณากรอกชื่อลูกค้า");
    setSaving(true);
    try {
      if (editing) await updateCustomer(editing.id, form);
      else await createCustomer(form);
      toast.success(editing ? "อัปเดตแล้ว" : "สร้างแล้ว");
      setOpen(false); load();
    } catch { toast.error("บันทึกไม่สำเร็จ"); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!(await confirm({ description: "ลบลูกค้านี้?", destructive: true }))) return;
    try { await deleteCustomer(id); toast.success("ลบแล้ว"); load(); }
    catch { toast.error("ลบไม่สำเร็จ"); }
  }

  async function toggleStatus(c: Customer) {
    const next = c.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try { await updateCustomerStatus(c.id, { status: next }); toast.success("อัปเดตสถานะแล้ว"); load(); }
    catch { toast.error("ไม่สำเร็จ"); }
  }

  async function openHistory(c: Customer) {
    if (!c.code) {
      toast.error("ลูกค้ารายนี้ยังไม่มีรหัสลูกค้า");
      return;
    }
    setHistoryCustomer(c);
    setHistoryOrders([]);
    setHistoryLoading(true);
    try {
      const data = await getOrdersByCustomer(c.code);
      setHistoryOrders(Array.isArray(data) ? data : []);
    } catch {
      toast.error("โหลดประวัติการซื้อไม่สำเร็จ");
    } finally {
      setHistoryLoading(false);
    }
  }

  const filtered = items.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.code?.toLowerCase().includes(search.toLowerCase())
  );

  const fmt = useMemo(
    () => new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2 }),
    []
  );

  const fmtDateTime = (value?: string) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString("th-TH", { day: "2-digit", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="-m-4 md:-m-6 flex h-screen border-t overflow-hidden bg-background">
      <div className={`min-w-0 flex-1 flex flex-col ${historyCustomer ? "hidden lg:flex" : "flex"}`}>
        <div className="shrink-0 border-b bg-background">
          <div className="px-4 sm:px-6 pt-4 pb-4 space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <h1 className="text-xl sm:text-2xl font-bold">ลูกค้า</h1>
                <p className="text-sm text-muted-foreground">จัดการข้อมูลลูกค้า ค้นหารายชื่อ และดูประวัติการซื้อได้จากหน้าเดียว</p>
              </div>
              <Button onClick={openCreate} className="w-full sm:w-auto"><Plus className="h-4 w-4 mr-2" />เพิ่มลูกค้า</Button>
            </div>

            <Card className="rounded-2xl">
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-base font-semibold">รายชื่อลูกค้า</p>
                    <p className="text-sm text-muted-foreground">ทั้งหมด {filtered.length} รายการ</p>
                  </div>
                  <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="ค้นหาลูกค้า…" className="pl-9 h-9" value={search} onChange={(e) => setSearch(e.target.value)} />
                  </div>
                </div>
              </CardHeader>
            </Card>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-muted/20 px-4 sm:px-6 py-4">
          <Card className="overflow-hidden">
            <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>
            ) : (
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>ชื่อ</TableHead>
                    <TableHead className="hidden sm:table-cell">รหัส</TableHead>
                    <TableHead className="hidden md:table-cell">ประเภท</TableHead>
                    <TableHead className="hidden sm:table-cell">โทรศัพท์</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead className="w-32 sm:w-40" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">ไม่พบข้อมูล</TableCell></TableRow>}
                  {filtered.map((c) => (
                    <TableRow key={c.id} className={historyCustomer?.id === c.id ? "bg-primary/5" : "hover:bg-accent/40"}>
                      <TableCell className="font-medium">
                        <div>{c.name}</div>
                        <div className="sm:hidden text-xs text-muted-foreground">{c.code ?? ""}</div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground hidden sm:table-cell">{c.code ?? "-"}</TableCell>
                      <TableCell className="hidden md:table-cell">{CUSTOMER_TYPE_LABEL[c.customerType ?? ""] ?? c.customerType ?? "-"}</TableCell>
                      <TableCell className="hidden sm:table-cell">{c.phone ?? "-"}</TableCell>
                      <TableCell><Badge variant={c.status === "ACTIVE" ? "default" : "secondary"}>{c.status ?? "-"}</Badge></TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button size="icon-sm" variant="ghost" title="เปลี่ยนสถานะ" aria-label="เปลี่ยนสถานะ" onClick={() => toggleStatus(c)}><ToggleLeft className="h-4 w-4" /></Button>
                          <Button size="icon-sm" variant="ghost" aria-label="ดูประวัติการซื้อ" onClick={() => openHistory(c)} disabled={!c.code}>
                            <Receipt className="h-4 w-4" />
                          </Button>
                          <Button size="icon-sm" variant="ghost" aria-label="แก้ไข" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                          <Button size="icon-sm" variant="ghost" className="text-destructive" aria-label="ลบ" onClick={() => handleDelete(c.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            )}
          </CardContent>
          </Card>
        </div>
      </div>

      {historyCustomer && (
        <Card className="w-full lg:w-[460px] shrink-0 rounded-none lg:rounded-none border-y-0 border-r-0 border-l bg-card flex flex-col">
          <CardHeader className="border-b pb-4 bg-background shrink-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">ประวัติการซื้อ</h2>
                <p className="text-sm text-muted-foreground mt-1">{historyCustomer.name} ({historyCustomer.code ?? "-"})</p>
              </div>
              <Button size="icon" variant="ghost" aria-label="ปิด panel" onClick={() => setHistoryCustomer(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-hidden">
            <div className="grid grid-cols-2 gap-3 p-4 border-b bg-background">
              <div className="rounded-xl border bg-card px-3 py-3">
                <p className="text-xs text-muted-foreground">จำนวนรายการ</p>
                <p className="mt-1 text-xl font-bold">{historyOrders.length}</p>
              </div>
              <div className="rounded-xl border bg-card px-3 py-3">
                <p className="text-xs text-muted-foreground">ยอดซื้อรวม</p>
                <p className="mt-1 text-xl font-bold tabular-nums">฿{fmt.format(historyOrders.filter((order) => order.status !== "VOIDED" && order.status !== "CANCELLED").reduce((sum, order) => sum + (order.total ?? 0), 0))}</p>
              </div>
            </div>
            {historyLoading ? (
              <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>
            ) : historyOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-14 text-muted-foreground">
                <Receipt className="h-8 w-8 opacity-30" />
                <p className="text-sm">ยังไม่มีประวัติการซื้อ</p>
              </div>
            ) : (
              <div className="h-full max-h-[calc(100vh-14rem)] overflow-auto">
                <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead>เลขที่</TableHead>
                        <TableHead>วันที่</TableHead>
                        <TableHead>ชำระเงิน</TableHead>
                        <TableHead>สถานะ</TableHead>
                        <TableHead className="text-right">ยอดรวม</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {historyOrders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">{order.code || order.id.slice(-8)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{fmtDateTime(order.createdDate)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{getPaymentSummary(order, (amount) => `฿${fmt.format(amount)}`)}</TableCell>
                          <TableCell>
                            <Badge variant={order.status === "VOIDED" || order.status === "CANCELLED" ? "destructive" : "default"}>
                              {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">฿{fmt.format(order.total ?? 0)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "แก้ไขลูกค้า" : "เพิ่มลูกค้า"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>ชื่อ *</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} autoFocus />
            </div>
            <div className="space-y-1">
              <Label>ประเภทลูกค้า</Label>
              <Select value={form.customerType} onValueChange={(v) => setForm((f) => ({ ...f, customerType: v as Customer["customerType"] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CUSTOMER_TYPES.map((ct) => <SelectItem key={ct.value} value={ct.value}>{ct.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>โทรศัพท์</Label><Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} /></div>
            <div className="space-y-1"><Label>อีเมล</Label><Input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} /></div>
            <div className="space-y-1"><Label>ที่อยู่</Label><Input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} /></div>
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
