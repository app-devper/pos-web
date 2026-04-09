"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { listEmployees, createEmployee, updateEmployee, deleteEmployee, listBranches } from "@/lib/pos-api";
import { listUsers } from "@/lib/um-api";
import { withRouteAccess } from "@/components/withRouteAccess";
import { useConfirm } from "@/components/ConfirmDialog";
import type { Branch, Employee } from "@/types/pos";
import type { User } from "@/types/um";
import { hasPermission } from "@/lib/rbac";

const EMPTY = { branchId: "", userId: "", role: "STAFF" };
const EMPLOYEE_ROLES = ["PHARMACIST", "CASHIER", "STAFF", "MANAGER"];

function EmployeesPage() {
  const canCreateEmployee = hasPermission("branches:create");
  const canUpdateEmployee = hasPermission("branches:update");
  const canDeleteEmployee = hasPermission("branches:delete");
  const [items, setItems] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const confirm = useConfirm();

  const load = () => {
    setLoading(true);
    Promise.all([listEmployees(), listBranches(), listUsers()])
      .then(([employees, branchList, userList]) => {
        setItems(Array.isArray(employees) ? employees : []);
        setBranches(Array.isArray(branchList) ? branchList : []);
        setUsers(Array.isArray(userList) ? userList : []);
      })
      .catch(() => toast.error("โหลดข้อมูลไม่สำเร็จ"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  function openCreate() {
    if (!canCreateEmployee) return;
    setEditing(null);
    setForm({ ...EMPTY, branchId: branches[0]?.id ?? "", userId: users[0]?.id ?? "" });
    setOpen(true);
  }

  function openEdit(e: Employee) {
    if (!canUpdateEmployee) return;
    setEditing(e);
    setForm({ branchId: e.branchId ?? "", userId: e.userId ?? "", role: e.role ?? "STAFF" });
    setOpen(true);
  }

  async function handleSave() {
    if (editing && !canUpdateEmployee) return;
    if (!editing && !canCreateEmployee) return;
    if (!form.branchId) return toast.error("กรุณาเลือกสาขา");
    if (!editing && !form.userId) return toast.error("กรุณาเลือกผู้ใช้");
    if (!form.role) return toast.error("กรุณาเลือกบทบาท");
    setSaving(true);
    try {
      if (editing) {
        await updateEmployee(editing.id, { branchId: form.branchId, role: form.role });
      } else {
        await createEmployee({ branchId: form.branchId, userId: form.userId, role: form.role });
      }
      toast.success(editing ? "อัปเดตแล้ว" : "สร้างแล้ว");
      setOpen(false); load();
    } catch { toast.error("บันทึกไม่สำเร็จ"); }
    finally { setSaving(false); }
  }

  const branchMap = useMemo(() => new Map(branches.map((branch) => [branch.id, branch.name])), [branches]);
  const userMap = useMemo(() => new Map(users.map((user) => [user.id, user])), [users]);

  async function handleDelete(id: string) {
    if (!canDeleteEmployee) return;
    if (!(await confirm({ description: "ลบพนักงานนี้?", destructive: true }))) return;
    try { await deleteEmployee(id); toast.success("ลบแล้ว"); load(); }
    catch { toast.error("ลบไม่สำเร็จ"); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">พนักงาน</h1>
        {canCreateEmployee && <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />เพิ่มพนักงาน</Button>}
      </div>
      <Card>
        <CardContent className="p-0">
          {loading ? <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div> : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>ผู้ใช้</TableHead><TableHead>สาขา</TableHead><TableHead>บทบาท</TableHead><TableHead>สร้างเมื่อ</TableHead><TableHead className="w-20" />
              </TableRow></TableHeader>
              <TableBody>
                {items.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">ไม่พบข้อมูล</TableCell></TableRow>}
                {items.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">
                      {userMap.get(e.userId)?.username ?? e.userId}
                    </TableCell>
                    <TableCell>{branchMap.get(e.branchId) ?? e.branchId ?? "-"}</TableCell>
                    <TableCell>{e.role ?? "-"}</TableCell>
                    <TableCell>{e.createdDate ? new Date(e.createdDate).toLocaleDateString("th-TH") : "-"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {canUpdateEmployee && <Button size="icon" variant="ghost" aria-label="แก้ไข" onClick={() => openEdit(e)}><Pencil className="h-4 w-4" /></Button>}
                        {canDeleteEmployee && <Button size="icon" variant="ghost" className="text-destructive" aria-label="ลบ" onClick={() => handleDelete(e.id)}><Trash2 className="h-4 w-4" /></Button>}
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
            <div className="space-y-1">
              <Label>สาขา *</Label>
              <Select value={form.branchId} onValueChange={(value) => setForm((current) => ({ ...current, branchId: value }))}>
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
            <div className="space-y-1">
              <Label>ผู้ใช้ *</Label>
              <Select value={form.userId} onValueChange={(value) => setForm((current) => ({ ...current, userId: value }))} disabled={!!editing}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกผู้ใช้" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>บทบาท *</Label>
              <Select value={form.role} onValueChange={(value) => setForm((current) => ({ ...current, role: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกบทบาท" />
                </SelectTrigger>
                <SelectContent>
                  {EMPLOYEE_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>{role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>ยกเลิก</Button>
            <Button onClick={handleSave} disabled={saving || (editing ? !canUpdateEmployee : !canCreateEmployee)}>{saving ? "กำลังบันทึก…" : "บันทึก"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default withRouteAccess(EmployeesPage, { roles: ["ADMIN", "SUPER"] });
