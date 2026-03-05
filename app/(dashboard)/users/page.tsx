"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useConfirm } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Search, MoreHorizontal, Pencil, Trash2, KeyRound, ShieldCheck, ToggleLeft } from "lucide-react";
import {
  listUsers, createUser, updateUser, deleteUser,
  updateUserStatus, updateUserRole, setUserPassword, authGetSystem,
} from "@/lib/um-api";
import type { User, CreateUserRequest, UpdateUserRequest, Role, UserStatus } from "@/types/um";

const EMPTY_CREATE: CreateUserRequest = { firstName: "", lastName: "", username: "", password: "", clientId: "", phone: "", email: "" };
const EMPTY_EDIT: UpdateUserRequest = { firstName: "", lastName: "", phone: "", email: "" };

export default function UsersPage() {
  const [items, setItems] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const confirm = useConfirm();

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateUserRequest>(EMPTY_CREATE);
  const [creating, setCreating] = useState(false);
  const [systemClientId, setSystemClientId] = useState("");

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [editForm, setEditForm] = useState<UpdateUserRequest>(EMPTY_EDIT);
  const [editing, setEditing] = useState(false);

  // Password dialog
  const [pwOpen, setPwOpen] = useState(false);
  const [pwTarget, setPwTarget] = useState<User | null>(null);
  const [newPw, setNewPw] = useState("");
  const [settingPw, setSettingPw] = useState(false);

  const load = () => {
    setLoading(true);
    listUsers()
      .then(setItems)
      .catch(() => toast.error("โหลดข้อมูลไม่สำเร็จ"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    authGetSystem()
      .then((s) => setSystemClientId(s.clientId))
      .catch(() => {});
  }, []);

  async function handleCreate() {
    if (!createForm.username || !createForm.password)
      return toast.error("กรุณากรอก username และ password");
    setCreating(true);
    try { await createUser({ ...createForm, clientId: systemClientId }); toast.success("สร้างผู้ใช้แล้ว"); setCreateOpen(false); setCreateForm(EMPTY_CREATE); load(); }
    catch (e: unknown) {
      toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "บันทึกไม่สำเร็จ");
    } finally { setCreating(false); }
  }

  function openEdit(u: User) {
    setEditTarget(u);
    setEditForm({ firstName: u.firstName ?? "", lastName: u.lastName ?? "", phone: u.phone ?? "", email: u.email ?? "" });
    setEditOpen(true);
  }

  async function handleEdit() {
    if (!editTarget) return;
    setEditing(true);
    try { await updateUser(editTarget.id, editForm); toast.success("อัปเดตแล้ว"); setEditOpen(false); load(); }
    catch { toast.error("บันทึกไม่สำเร็จ"); } finally { setEditing(false); }
  }

  async function handleDelete(id: string) {
    if (!(await confirm({ description: "ลบผู้ใช้นี้?", destructive: true }))) return;
    try { await deleteUser(id); toast.success("ลบแล้ว"); load(); }
    catch (e: unknown) { toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "ลบไม่สำเร็จ"); }
  }

  async function handleToggleStatus(u: User) {
    const next: UserStatus = u.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try { await updateUserStatus(u.id, { status: next }); toast.success("อัปเดตสถานะแล้ว"); load(); }
    catch { toast.error("ไม่สำเร็จ"); }
  }

  async function handleSetRole(id: string, role: Role) {
    try { await updateUserRole(id, { role }); toast.success("อัปเดต role แล้ว"); load(); }
    catch { toast.error("ไม่สำเร็จ"); }
  }

  async function handleSetPassword() {
    if (!pwTarget || !newPw || newPw.length < 8) return toast.error("รหัสผ่านต้องอย่างน้อย 8 ตัวอักษร");
    setSettingPw(true);
    try { await setUserPassword(pwTarget.id, { password: newPw }); toast.success("ตั้งรหัสผ่านแล้ว"); setPwOpen(false); setNewPw(""); }
    catch { toast.error("ไม่สำเร็จ"); } finally { setSettingPw(false); }
  }

  const filtered = items.filter((u) =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    `${u.firstName} ${u.lastName}`.toLowerCase().includes(search.toLowerCase())
  );

  const roleColor: Record<Role, "default" | "secondary" | "destructive"> = {
    SUPER: "destructive", ADMIN: "default", USER: "secondary"
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">จัดการผู้ใช้ (UM)</h1>
        <Button onClick={() => { setCreateForm({ ...EMPTY_CREATE }); setCreateOpen(true); }}><Plus className="h-4 w-4 mr-2" />เพิ่มผู้ใช้</Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="ค้นหาผู้ใช้…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ชื่อผู้ใช้</TableHead>
                  <TableHead>ชื่อ-นามสกุล</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">ไม่พบข้อมูล</TableCell></TableRow>}
                {filtered.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.username}</TableCell>
                    <TableCell>{[u.firstName, u.lastName].filter(Boolean).join(" ") || "-"}</TableCell>
                    <TableCell><Badge variant={roleColor[u.role]}>{u.role}</Badge></TableCell>
                    <TableCell><Badge variant={u.status === "ACTIVE" ? "default" : "secondary"}>{u.status}</Badge></TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" aria-label="ตัวเลือกเพิ่มเติม"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(u)}><Pencil className="h-4 w-4 mr-2" />แก้ไข</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleStatus(u)}><ToggleLeft className="h-4 w-4 mr-2" />{u.status === "ACTIVE" ? "ระงับ" : "เปิดใช้งาน"}</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setPwTarget(u); setNewPw(""); setPwOpen(true); }}><KeyRound className="h-4 w-4 mr-2" />ตั้งรหัสผ่าน</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleSetRole(u.id, u.role === "USER" ? "ADMIN" : "USER")}><ShieldCheck className="h-4 w-4 mr-2" />สลับเป็น {u.role === "USER" ? "ADMIN" : "USER"}</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDelete(u.id)}><Trash2 className="h-4 w-4 mr-2" />ลบ</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>เพิ่มผู้ใช้ใหม่</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>ชื่อ</Label><Input value={createForm.firstName} onChange={(e) => setCreateForm((f) => ({ ...f, firstName: e.target.value }))} /></div>
            <div className="space-y-1"><Label>นามสกุล</Label><Input value={createForm.lastName} onChange={(e) => setCreateForm((f) => ({ ...f, lastName: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Username *</Label><Input value={createForm.username} onChange={(e) => setCreateForm((f) => ({ ...f, username: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Password *</Label><Input type="password" value={createForm.password} onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))} /></div>
            <div className="space-y-1"><Label>โทรศัพท์</Label><Input value={createForm.phone} onChange={(e) => setCreateForm((f) => ({ ...f, phone: e.target.value }))} /></div>
            <div className="col-span-2 space-y-1"><Label>อีเมล</Label><Input value={createForm.email} onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>ยกเลิก</Button>
            <Button onClick={handleCreate} disabled={creating}>{creating ? "กำลังสร้าง…" : "สร้าง"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>แก้ไข: {editTarget?.username}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>ชื่อ *</Label><Input value={editForm.firstName} onChange={(e) => setEditForm((f) => ({ ...f, firstName: e.target.value }))} /></div>
              <div className="space-y-1"><Label>นามสกุล *</Label><Input value={editForm.lastName} onChange={(e) => setEditForm((f) => ({ ...f, lastName: e.target.value }))} /></div>
            </div>
            <div className="space-y-1"><Label>โทรศัพท์</Label><Input value={editForm.phone} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} /></div>
            <div className="space-y-1"><Label>อีเมล</Label><Input value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>ยกเลิก</Button>
            <Button onClick={handleEdit} disabled={editing}>{editing ? "กำลังบันทึก…" : "บันทึก"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Set Password */}
      <Dialog open={pwOpen} onOpenChange={setPwOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>ตั้งรหัสผ่าน: {pwTarget?.username}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>รหัสผ่านใหม่ (อย่างน้อย 8 ตัว)</Label>
            <Input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSetPassword()} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwOpen(false)}>ยกเลิก</Button>
            <Button onClick={handleSetPassword} disabled={settingPw}>{settingPw ? "กำลังตั้ง…" : "ตั้งรหัสผ่าน"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
