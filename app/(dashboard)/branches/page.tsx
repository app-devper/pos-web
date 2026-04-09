"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, ToggleLeft, Users, UserPlus, X } from "lucide-react";
import { listBranches, createBranch, updateBranch, deleteBranch, updateBranchStatus, getEmployeesByBranch, createEmployee, deleteEmployee } from "@/lib/pos-api";
import { listUsers } from "@/lib/um-api";
import { withRouteAccess } from "@/components/withRouteAccess";
import type { Employee } from "@/types/pos";
import type { User } from "@/types/um";
import { useConfirm } from "@/components/ConfirmDialog";
import { hasPermission } from "@/lib/rbac";

const EMPTY_FORM = { name: "", address: "", phone: "" };

const EMPLOYEE_ROLES = ["PHARMACIST", "CASHIER", "STAFF", "MANAGER"];

interface Branch {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  status?: string;
}

function BranchesPage() {
  const canCreateBranch = hasPermission("branches:create");
  const canUpdateBranch = hasPermission("branches:update");
  const canDeleteBranch = hasPermission("branches:delete");
  const [items, setItems] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const confirm = useConfirm();

  // Branch form dialog
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Employee sheet
  const [sheetBranch, setSheetBranch] = useState<Branch | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [empLoading, setEmpLoading] = useState(false);

  // Add employee dialog
  const [addEmpOpen, setAddEmpOpen] = useState(false);
  const [umUsers, setUmUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState("STAFF");
  const [addingEmp, setAddingEmp] = useState(false);

  const loadBranches = () => {
    setLoading(true);
    listBranches()
      .then((d) => setItems(Array.isArray(d) ? (d as Branch[]) : []))
      .catch(() => toast.error("โหลดข้อมูลไม่สำเร็จ"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadBranches(); }, []);

  const loadEmployees = useCallback((branchId: string) => {
    setEmpLoading(true);
    getEmployeesByBranch(branchId)
      .then((d) => setEmployees(Array.isArray(d) ? d : []))
      .catch(() => toast.error("โหลดพนักงานไม่สำเร็จ"))
      .finally(() => setEmpLoading(false));
  }, []);

  function openCreate() { if (!canCreateBranch) return; setEditing(null); setForm(EMPTY_FORM); setOpen(true); }

  function openEdit(b: Branch) {
    if (!canUpdateBranch) return;
    setEditing(b);
    setForm({ name: b.name ?? "", address: b.address ?? "", phone: b.phone ?? "" });
    setOpen(true);
  }

  async function handleSave() {
    if (editing && !canUpdateBranch) return;
    if (!editing && !canCreateBranch) return;
    if (!form.name.trim()) return toast.error("กรุณากรอกชื่อสาขา");
    setSaving(true);
    try {
      if (editing) await updateBranch(editing.id, form);
      else await createBranch(form);
      toast.success(editing ? "อัปเดตแล้ว" : "สร้างแล้ว");
      setOpen(false);
      loadBranches();
    } catch { toast.error("บันทึกไม่สำเร็จ"); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!canDeleteBranch) return;
    if (!(await confirm({ description: "ลบสาขานี้?", destructive: true }))) return;
    try { await deleteBranch(id); toast.success("ลบแล้ว"); loadBranches(); }
    catch { toast.error("ลบไม่สำเร็จ"); }
  }

  async function toggleStatus(b: Branch) {
    if (!canUpdateBranch) return;
    const next = b.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try { await updateBranchStatus(b.id, { status: next }); toast.success("อัปเดตสถานะแล้ว"); loadBranches(); }
    catch { toast.error("ไม่สำเร็จ"); }
  }

  function openEmployeeSheet(b: Branch) {
    setSheetBranch(b);
    setEmployees([]);
    loadEmployees(b.id);
  }

  async function openAddEmployee() {
    if (!canUpdateBranch) return;
    setSelectedUserId("");
    setSelectedRole("STAFF");
    setAddEmpOpen(true);
    setUsersLoading(true);
    try {
      const users = await listUsers();
      setUmUsers(Array.isArray(users) ? users : []);
    } catch { toast.error("โหลด users ไม่สำเร็จ"); }
    finally { setUsersLoading(false); }
  }

  async function handleAddEmployee() {
    if (!sheetBranch || !selectedUserId) return toast.error("กรุณาเลือกผู้ใช้");
    if (!canUpdateBranch) return;
    setAddingEmp(true);
    try {
      await createEmployee({ branchId: sheetBranch.id, userId: selectedUserId, role: selectedRole });
      toast.success("เพิ่มพนักงานแล้ว");
      setAddEmpOpen(false);
      loadEmployees(sheetBranch.id);
    } catch (e: unknown) {
      toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "เพิ่มไม่สำเร็จ");
    } finally { setAddingEmp(false); }
  }

  async function handleRemoveEmployee(empId: string) {
    if (!canUpdateBranch) return;
    if (!(await confirm({ description: "ลบพนักงานออกจากสาขา?", destructive: true }))) return;
    try {
      await deleteEmployee(empId);
      toast.success("ลบพนักงานแล้ว");
      if (sheetBranch) loadEmployees(sheetBranch.id);
    } catch { toast.error("ลบไม่สำเร็จ"); }
  }

  const assignedUserIds = new Set(employees.map((e) => e.userId));
  const availableUsers = umUsers.filter((u) => !assignedUserIds.has(u.id));

  const getUserLabel = (userId: string) => {
    const u = umUsers.find((x) => x.id === userId) ?? employees.find((e) => e.userId === userId);
    if (!u) return userId;
    if ("username" in u) return `${u.username}${u.firstName ? ` (${u.firstName} ${u.lastName ?? ""})` : ""}`;
    return userId;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">จัดการสาขา</h1>
        {canCreateBranch && <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />เพิ่มสาขา</Button>}
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ชื่อสาขา</TableHead>
                  <TableHead>โทรศัพท์</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead className="w-40" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">ไม่พบข้อมูล</TableCell></TableRow>
                )}
                {items.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.name}</TableCell>
                    <TableCell>{b.phone ?? "-"}</TableCell>
                    <TableCell>
                      <Badge variant={b.status === "ACTIVE" ? "default" : "secondary"}>{b.status ?? "-"}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" variant="outline" onClick={() => openEmployeeSheet(b)}>
                          <Users className="h-4 w-4 mr-1" />พนักงาน
                        </Button>
                        {canUpdateBranch && (
                          <Button size="icon" variant="ghost" aria-label="เปลี่ยนสถานะ" onClick={() => toggleStatus(b)}>
                            <ToggleLeft className="h-4 w-4" />
                          </Button>
                        )}
                        {canUpdateBranch && (
                          <Button size="icon" variant="ghost" aria-label="แก้ไข" onClick={() => openEdit(b)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {canDeleteBranch && (
                          <Button size="icon" variant="ghost" className="text-destructive" aria-label="ลบ" onClick={() => handleDelete(b.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Branch form dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editing ? "แก้ไขสาขา" : "เพิ่มสาขา"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>ชื่อสาขา *</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} autoFocus />
            </div>
            <div className="space-y-1">
              <Label>โทรศัพท์</Label>
              <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>ที่อยู่</Label>
              <Input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>ยกเลิก</Button>
            <Button onClick={handleSave} disabled={saving || (editing ? !canUpdateBranch : !canCreateBranch)}>{saving ? "กำลังบันทึก…" : "บันทึก"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Employee sheet */}
      <Sheet open={!!sheetBranch} onOpenChange={(v) => { if (!v) setSheetBranch(null); }}>
        <SheetContent className="w-full sm:max-w-lg flex flex-col gap-0 p-0">
          <SheetHeader className="px-6 py-4 border-b">
            <SheetTitle>พนักงานสาขา: {sheetBranch?.name}</SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto">
            <div className="px-6 py-3 flex justify-end border-b">
              <Button size="sm" onClick={openAddEmployee} disabled={!canUpdateBranch}>
                <UserPlus className="h-4 w-4 mr-2" />เพิ่มพนักงาน
              </Button>
            </div>

            {empLoading ? (
              <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>
            ) : employees.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
                <Users className="h-10 w-10 opacity-30" />
                <p className="text-sm">ยังไม่มีพนักงานในสาขานี้</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ผู้ใช้</TableHead>
                    <TableHead>ตำแหน่ง</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((emp) => (
                    <TableRow key={emp.id}>
                      <TableCell className="font-medium text-sm">{getUserLabel(emp.userId)}</TableCell>
                      <TableCell><Badge variant="secondary">{emp.role}</Badge></TableCell>
                      <TableCell>
                        <Button size="icon" variant="ghost" className="text-destructive h-8 w-8" aria-label="ลบพนักงาน" onClick={() => handleRemoveEmployee(emp.id)} disabled={!canUpdateBranch}>
                          <X className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Add employee dialog */}
      <Dialog open={addEmpOpen} onOpenChange={setAddEmpOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>เพิ่มพนักงานเข้าสาขา</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>เลือกผู้ใช้ *</Label>
              {usersLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />โหลด...
                </div>
              ) : (
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกผู้ใช้..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUsers.length === 0 && (
                      <SelectItem value="__none__" disabled>ไม่มีผู้ใช้ที่เพิ่มได้</SelectItem>
                    )}
                    {availableUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.username}{u.firstName ? ` — ${u.firstName} ${u.lastName ?? ""}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-1">
              <Label>ตำแหน่ง *</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EMPLOYEE_ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddEmpOpen(false)}>ยกเลิก</Button>
            <Button onClick={handleAddEmployee} disabled={addingEmp || !selectedUserId || !canUpdateBranch}>
              {addingEmp ? "กำลังเพิ่ม…" : "เพิ่มพนักงาน"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default withRouteAccess(BranchesPage, { roles: ["ADMIN", "SUPER"] });
