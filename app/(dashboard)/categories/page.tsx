"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Star } from "lucide-react";
import { listCategories, createCategory, updateCategory, deleteCategory, setDefaultCategory } from "@/lib/pos-api";
import { useConfirm } from "@/components/ConfirmDialog";
import type { Category } from "@/types/pos";

export default function CategoriesPage() {
  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const confirm = useConfirm();

  const load = () => {
    setLoading(true);
    listCategories()
      .then(setItems)
      .catch(() => toast.error("โหลดข้อมูลไม่สำเร็จ"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  function openCreate() { setEditing(null); setName(""); setOpen(true); }
  function openEdit(c: Category) { setEditing(c); setName(c.name); setOpen(true); }

  async function handleSave() {
    if (!name.trim()) return toast.error("กรุณากรอกชื่อหมวดหมู่");
    setSaving(true);
    try {
      if (editing) await updateCategory(editing.id, { name });
      else await createCategory({ name });
      toast.success(editing ? "อัปเดตแล้ว" : "สร้างแล้ว");
      setOpen(false);
      load();
    } catch { toast.error("บันทึกไม่สำเร็จ"); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!(await confirm({ description: "ลบหมวดหมู่นี้?", destructive: true }))) return;
    try { await deleteCategory(id); toast.success("ลบแล้ว"); load(); }
    catch { toast.error("ลบไม่สำเร็จ"); }
  }

  async function handleSetDefault(id: string) {
    try { await setDefaultCategory(id); toast.success("ตั้งเป็นค่าเริ่มต้นแล้ว"); load(); }
    catch { toast.error("ไม่สำเร็จ"); }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h1 className="text-xl sm:text-2xl font-bold">หมวดหมู่</h1>
        <Button onClick={openCreate} className="w-full sm:w-auto"><Plus className="h-4 w-4 mr-2" />เพิ่มหมวดหมู่</Button>
      </div>
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ชื่อหมวดหมู่</TableHead>
                  <TableHead>ค่าเริ่มต้น</TableHead>
                  <TableHead className="w-28" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">ไม่มีข้อมูล</TableCell></TableRow>}
                {items.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{c.isDefault && <Badge>ค่าเริ่มต้น</Badge>}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {!c.isDefault && <Button size="icon" variant="ghost" title="ตั้งเป็นค่าเริ่มต้น" aria-label="ตั้งเป็นค่าเริ่มต้น" onClick={() => handleSetDefault(c.id)}><Star className="h-4 w-4" /></Button>}
                        <Button size="icon" variant="ghost" aria-label="แก้ไข" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" className="text-destructive" aria-label="ลบ" onClick={() => handleDelete(c.id)}><Trash2 className="h-4 w-4" /></Button>
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editing ? "แก้ไขหมวดหมู่" : "เพิ่มหมวดหมู่"}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>ชื่อหมวดหมู่</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSave()} autoFocus />
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
