"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { listPromotions, createPromotion, updatePromotion, deletePromotion } from "@/lib/pos-api";
import { withRouteAccess } from "@/components/withRouteAccess";
import type { Promotion, PromotionRequest } from "@/types/pos";
import { useConfirm } from "@/components/ConfirmDialog";
import { hasPermission } from "@/lib/rbac";

function toDateInput(d?: string) {
  if (!d) return "";
  return d.substring(0, 10);
}

function toISODate(d: string) {
  if (!d) return undefined;
  return `${d}T00:00:00.000`;
}

const EMPTY: PromotionRequest = { code: "", name: "", description: "", type: "PERCENTAGE", value: 0, minPurchase: 0, maxDiscount: 0, startDate: "", endDate: "", status: "ACTIVE" };

function PromotionsPage() {
  const canCreatePromotion = hasPermission("promotions:create");
  const canUpdatePromotion = hasPermission("promotions:update");
  const canDeletePromotion = hasPermission("promotions:delete");
  const [items, setItems] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [form, setForm] = useState<PromotionRequest>(EMPTY);
  const [saving, setSaving] = useState(false);
  const confirm = useConfirm();

  const load = () => {
    setLoading(true);
    listPromotions()
      .then(setItems)
      .catch(() => toast.error("โหลดข้อมูลไม่สำเร็จ"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  function openCreate() { if (!canCreatePromotion) return; setEditing(null); setForm(EMPTY); setOpen(true); }
  function openEdit(p: Promotion) {
    if (!canUpdatePromotion) return;
    setEditing(p);
    setForm({
      code: p.code,
      name: p.name,
      description: p.description ?? "",
      type: p.type,
      value: p.value,
      minPurchase: p.minPurchase ?? 0,
      maxDiscount: p.maxDiscount ?? 0,
      startDate: p.startDate ?? "",
      endDate: p.endDate ?? "",
      status: p.status ?? "ACTIVE",
    });
    setOpen(true);
  }

  async function handleSave() {
    if (editing && !canUpdatePromotion) return;
    if (!editing && !canCreatePromotion) return;
    if (!form.code.trim() || !form.name.trim()) return toast.error("กรุณากรอกรหัสและชื่อ");
    if (!form.startDate || !form.endDate) return toast.error("กรุณากรอกวันเริ่มต้นและวันสิ้นสุด");
    setSaving(true);
    try {
      const payload = {
        ...form,
        startDate: toISODate(form.startDate as string),
        endDate: toISODate(form.endDate as string),
      };
      if (editing) await updatePromotion(editing.id, payload);
      else await createPromotion(payload);
      toast.success(editing ? "อัปเดตแล้ว" : "สร้างแล้ว");
      setOpen(false); load();
    } catch { toast.error("บันทึกไม่สำเร็จ"); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!canDeletePromotion) return;
    if (!(await confirm({ description: "ลบโปรโมชันนี้?", destructive: true }))) return;
    try { await deletePromotion(id); toast.success("ลบแล้ว"); load(); }
    catch { toast.error("ลบไม่สำเร็จ"); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">โปรโมชัน</h1>
        {canCreatePromotion && <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />เพิ่มโปรโมชัน</Button>}
      </div>
      <Card><CardContent className="p-0">
        {loading ? <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div> : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>รหัส</TableHead><TableHead>ชื่อ</TableHead><TableHead>ประเภท</TableHead><TableHead className="text-right">ส่วนลด</TableHead><TableHead>ช่วงเวลา</TableHead><TableHead>สถานะ</TableHead><TableHead className="w-20" />
            </TableRow></TableHeader>
            <TableBody>
              {items.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">ไม่พบข้อมูล</TableCell></TableRow>}
              {items.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono">{p.code}</TableCell>
                  <TableCell>{p.name}</TableCell>
                  <TableCell>{p.type}</TableCell>
                  <TableCell className="text-right">{p.value}{p.type === "PERCENTAGE" ? "%" : "฿"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {p.startDate ? toDateInput(p.startDate) : "-"} ~ {p.endDate ? toDateInput(p.endDate) : "-"}
                  </TableCell>
                  <TableCell><Badge variant={p.status === "ACTIVE" ? "default" : "secondary"}>{p.status}</Badge></TableCell>
                  <TableCell><div className="flex gap-1">
                    {canUpdatePromotion && <Button size="icon" variant="ghost" aria-label="แก้ไข" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>}
                    {canDeletePromotion && <Button size="icon" variant="ghost" className="text-destructive" aria-label="ลบ" onClick={() => handleDelete(p.id)}><Trash2 className="h-4 w-4" /></Button>}
                  </div></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "แก้ไขโปรโมชัน" : "เพิ่มโปรโมชัน"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>รหัสโปรโมชัน *</Label><Input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} disabled={!!editing} /></div>
            <div className="space-y-1"><Label>ชื่อ *</Label><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
            <div className="col-span-2 space-y-1"><Label>รายละเอียด</Label><Input value={form.description ?? ""} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></div>
            <div className="space-y-1">
              <Label>ประเภทส่วนลด</Label>
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as "PERCENTAGE" | "FIXED" }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERCENTAGE">เปอร์เซ็นต์ (%)</SelectItem>
                  <SelectItem value="FIXED">จำนวนเงิน (฿)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>มูลค่าส่วนลด *</Label><Input type="number" value={form.value === 0 ? "" : form.value.toString()} onChange={(e) => setForm((f) => ({ ...f, value: +e.target.value }))} className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" /></div>
            <div className="space-y-1"><Label>ยอดขั้นต่ำ</Label><Input type="number" value={(form.minPurchase ?? 0) === 0 ? "" : form.minPurchase} onChange={(e) => setForm((f) => ({ ...f, minPurchase: +e.target.value }))} className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" /></div>
            <div className="space-y-1"><Label>ส่วนลดสูงสุด</Label><Input type="number" value={(form.maxDiscount ?? 0) === 0 ? "" : form.maxDiscount} onChange={(e) => setForm((f) => ({ ...f, maxDiscount: +e.target.value }))} className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" /></div>
            <div className="space-y-1"><Label>วันเริ่มต้น *</Label><Input type="date" value={toDateInput(form.startDate)} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} /></div>
            <div className="space-y-1"><Label>วันสิ้นสุด *</Label><Input type="date" value={toDateInput(form.endDate)} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} /></div>
            <div className="space-y-1">
              <Label>สถานะ</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                  <SelectItem value="INACTIVE">INACTIVE</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>ยกเลิก</Button>
            <Button onClick={handleSave} disabled={saving || (editing ? !canUpdatePromotion : !canCreatePromotion)}>{saving ? "กำลังบันทึก…" : "บันทึก"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default withRouteAccess(PromotionsPage, { roles: ["ADMIN", "SUPER"] });
