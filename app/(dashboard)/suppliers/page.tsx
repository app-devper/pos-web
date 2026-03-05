"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { listSuppliers, createSupplier, updateSupplier, deleteSupplier } from "@/lib/pos-api";
import { useConfirm } from "@/components/ConfirmDialog";

const EMPTY = { name: "", phone: "", email: "", address: "", taxId: "" };

export default function SuppliersPage() {
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const confirm = useConfirm();

  const load = () => {
    setLoading(true);
    listSuppliers()
      .then((d) => setItems(Array.isArray(d) ? d : []))
      .catch(() => toast.error("โหลดข้อมูลไม่สำเร็จ"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  function openCreate() { setEditing(null); setForm(EMPTY); setOpen(true); }
  function openEdit(s: Record<string, unknown>) {
    setEditing(s);
    setForm({ name: (s.name as string) ?? "", phone: (s.phone as string) ?? "", email: (s.email as string) ?? "", address: (s.address as string) ?? "", taxId: (s.taxId as string) ?? "" });
    setOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) return toast.error("กรุณากรอกชื่อผู้จัดจำหน่าย");
    setSaving(true);
    try {
      if (editing) await updateSupplier(editing.id as string, form);
      else await createSupplier(form);
      toast.success(editing ? "อัปเดตแล้ว" : "สร้างแล้ว");
      setOpen(false); load();
    } catch { toast.error("บันทึกไม่สำเร็จ"); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!(await confirm({ description: "ลบผู้จัดจำหน่ายนี้?", destructive: true }))) return;
    try { await deleteSupplier(id); toast.success("ลบแล้ว"); load(); }
    catch { toast.error("ลบไม่สำเร็จ"); }
  }

  const filtered = items.filter((s) =>
    JSON.stringify(s).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">ผู้จัดจำหน่าย</h1>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />เพิ่ม</Button>
      </div>
      <Card>
        <CardHeader className="pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="ค้นหา…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div> : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>ชื่อ</TableHead><TableHead>โทรศัพท์</TableHead><TableHead>อีเมล</TableHead><TableHead className="w-20" />
              </TableRow></TableHeader>
              <TableBody>
                {filtered.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">ไม่พบข้อมูล</TableCell></TableRow>}
                {filtered.map((s) => (
                  <TableRow key={s.id as string}>
                    <TableCell className="font-medium">{s.name as string}</TableCell>
                    <TableCell>{(s.phone as string) ?? "-"}</TableCell>
                    <TableCell>{(s.email as string) ?? "-"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" aria-label="แก้ไข" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" className="text-destructive" aria-label="ลบ" onClick={() => handleDelete(s.id as string)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "แก้ไขผู้จัดจำหน่าย" : "เพิ่มผู้จัดจำหน่าย"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {[["name","ชื่อ *"],["phone","โทรศัพท์"],["email","อีเมล"],["address","ที่อยู่"],["taxId","เลขประจำตัวผู้เสียภาษี"]].map(([k,l]) => (
              <div key={k} className="space-y-1">
                <Label>{l}</Label>
                <Input value={form[k as keyof typeof form]} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} />
              </div>
            ))}
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
