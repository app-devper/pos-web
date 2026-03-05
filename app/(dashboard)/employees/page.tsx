"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { listEmployees, createEmployee, updateEmployee, deleteEmployee } from "@/lib/pos-api";
import { useConfirm } from "@/components/ConfirmDialog";

const EMPTY = { name: "", position: "", phone: "", email: "", branchId: "" };

export default function EmployeesPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const confirm = useConfirm();

  const load = () => {
    setLoading(true);
    listEmployees()
      .then((d) => setItems(Array.isArray(d) ? d : []))
      .catch(() => toast.error("โหลดข้อมูลไม่สำเร็จ"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  function openCreate() { setEditing(null); setForm(EMPTY); setOpen(true); }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function openEdit(e: any) {
    setEditing(e);
    setForm({ name: e.name ?? "", position: e.position ?? "", phone: e.phone ?? "", email: e.email ?? "", branchId: e.branchId ?? "" });
    setOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) return toast.error("กรุณากรอกชื่อพนักงาน");
    setSaving(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (editing) await updateEmployee(editing.id, form as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      else await createEmployee(form as any);
      toast.success(editing ? "อัปเดตแล้ว" : "สร้างแล้ว");
      setOpen(false); load();
    } catch { toast.error("บันทึกไม่สำเร็จ"); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!(await confirm({ description: "ลบพนักงานนี้?", destructive: true }))) return;
    try { await deleteEmployee(id); toast.success("ลบแล้ว"); load(); }
    catch { toast.error("ลบไม่สำเร็จ"); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">พนักงาน</h1>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />เพิ่มพนักงาน</Button>
      </div>
      <Card>
        <CardContent className="p-0">
          {loading ? <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div> : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>ชื่อ</TableHead><TableHead>ตำแหน่ง</TableHead><TableHead>โทรศัพท์</TableHead><TableHead className="w-20" />
              </TableRow></TableHeader>
              <TableBody>
                {items.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">ไม่พบข้อมูล</TableCell></TableRow>}
                {items.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.name}</TableCell>
                    <TableCell>{e.position ?? "-"}</TableCell>
                    <TableCell>{e.phone ?? "-"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" aria-label="แก้ไข" onClick={() => openEdit(e)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" className="text-destructive" aria-label="ลบ" onClick={() => handleDelete(e.id)}><Trash2 className="h-4 w-4" /></Button>
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
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editing ? "แก้ไขพนักงาน" : "เพิ่มพนักงาน"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {([["name","ชื่อ *"],["position","ตำแหน่ง"],["phone","โทรศัพท์"],["email","อีเมล"],["branchId","รหัสสาขา"]] as [keyof typeof EMPTY, string][]).map(([k,l]) => (
              <div key={k} className="space-y-1">
                <Label>{l}</Label>
                <Input value={form[k]} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} />
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
