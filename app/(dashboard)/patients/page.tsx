"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Search, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { listPatients, createPatient, updatePatient, deletePatient, getDispensingLogsByPatient } from "@/lib/pos-api";
import type { Patient, PatientRequest } from "@/types/pos";
import { useConfirm } from "@/components/ConfirmDialog";

const EMPTY: PatientRequest = { customerCode: "", idCard: "", firstName: "", lastName: "", phone: "", email: "", address: "", gender: "", bloodType: "", weight: 0, note: "", consentGiven: false };

export default function PatientsPage() {
  const [items, setItems] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Patient | null>(null);
  const [form, setForm] = useState<PatientRequest>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState<Patient | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [page, setPage] = useState(0);
  const pageSize = 20;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [dispensingHistory, setDispensingHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const confirm = useConfirm();

  const load = () => {
    setLoading(true);
    listPatients()
      .then(setItems)
      .catch(() => toast.error("โหลดข้อมูลไม่สำเร็จ"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  function openCreate() { setEditing(null); setForm(EMPTY); setOpen(true); }
  function openEdit(p: Patient) {
    setEditing(p);
    setForm({ customerCode: p.customerCode, idCard: p.idCard ?? "", firstName: p.firstName ?? "", lastName: p.lastName ?? "", phone: p.phone ?? "", email: p.email ?? "", address: p.address ?? "", gender: p.gender ?? "", bloodType: p.bloodType ?? "", weight: p.weight ?? 0, note: p.note ?? "", consentGiven: p.consentGiven ?? false });
    setOpen(true);
  }

  async function handleSave() {
    if (!form.customerCode.trim()) return toast.error("กรุณากรอกรหัสลูกค้า");
    setSaving(true);
    try {
      if (editing) await updatePatient(editing.id, form);
      else await createPatient(form);
      toast.success(editing ? "อัปเดตแล้ว" : "สร้างแล้ว");
      setOpen(false); load();
    } catch { toast.error("บันทึกไม่สำเร็จ"); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!(await confirm({ description: "ลบผู้ป่วยนี้?", destructive: true }))) return;
    try { await deletePatient(id); toast.success("ลบแล้ว"); load(); }
    catch { toast.error("ลบไม่สำเร็จ"); }
  }

  const filtered = items.filter((p) => {
    const q = search.toLowerCase();
    return p.customerCode.toLowerCase().includes(q) ||
      (p.idCard ?? "").includes(q) ||
      (p.firstName ?? "").toLowerCase().includes(q) ||
      (p.lastName ?? "").toLowerCase().includes(q) ||
      (p.phone ?? "").includes(q);
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const paginated = filtered.slice(safePage * pageSize, (safePage + 1) * pageSize);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">ผู้ป่วย</h1>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />เพิ่มผู้ป่วย</Button>
      </div>
      <Card>
        <CardHeader className="pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="ค้นหาด้วยรหัสลูกค้า หรือเลขบัตร…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div> : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>รหัสลูกค้า</TableHead><TableHead>ชื่อ-สกุล</TableHead><TableHead>โทรศัพท์</TableHead><TableHead>เพศ</TableHead><TableHead>หมู่เลือด</TableHead><TableHead className="w-24" />
              </TableRow></TableHeader>
              <TableBody>
                {paginated.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">ไม่พบข้อมูล</TableCell></TableRow>}
                {paginated.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.customerCode}</TableCell>
                    <TableCell>{[p.firstName, p.lastName].filter(Boolean).join(" ") || "-"}</TableCell>
                    <TableCell className="text-xs">{p.phone ?? "-"}</TableCell>
                    <TableCell>{p.gender ?? "-"}</TableCell>
                    <TableCell>{p.bloodType ?? "-"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" aria-label="ดูรายละเอียด" onClick={() => {
                        setDetail(p); setDetailOpen(true);
                        setLoadingHistory(true); setDispensingHistory([]);
                        getDispensingLogsByPatient(p.id).then(setDispensingHistory).catch(() => {}).finally(() => setLoadingHistory(false));
                      }}><Eye className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" aria-label="แก้ไข" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" className="text-destructive" aria-label="ลบ" onClick={() => handleDelete(p.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {filtered.length > pageSize && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <span className="text-xs text-muted-foreground">ทั้งหมด {filtered.length} รายการ · หน้า {safePage + 1}/{totalPages}</span>
              <div className="flex gap-1">
                <Button size="icon" variant="outline" className="h-8 w-8" disabled={safePage === 0} onClick={() => setPage(safePage - 1)} aria-label="หน้าก่อน"><ChevronLeft className="h-4 w-4" /></Button>
                <Button size="icon" variant="outline" className="h-8 w-8" disabled={safePage >= totalPages - 1} onClick={() => setPage(safePage + 1)} aria-label="หน้าถัดไป"><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>ข้อมูลผู้ป่วย</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">รหัสลูกค้า:</span> {detail.customerCode}</div>
                <div><span className="text-muted-foreground">เลขบัตร:</span> {detail.idCard ?? "-"}</div>
                <div><span className="text-muted-foreground">ชื่อ:</span> {detail.firstName ?? "-"}</div>
                <div><span className="text-muted-foreground">นามสกุล:</span> {detail.lastName ?? "-"}</div>
                <div><span className="text-muted-foreground">โทรศัพท์:</span> {detail.phone ?? "-"}</div>
                <div><span className="text-muted-foreground">อีเมล:</span> {detail.email ?? "-"}</div>
                <div><span className="text-muted-foreground">เพศ:</span> {detail.gender ?? "-"}</div>
                <div><span className="text-muted-foreground">หมู่เลือด:</span> {detail.bloodType ?? "-"}</div>
                <div><span className="text-muted-foreground">น้ำหนัก:</span> {detail.weight ?? "-"} กก.</div>
                <div><span className="text-muted-foreground">ยินยอม PDPA:</span> {detail.consentGiven ? "✓ ยินยอม" : "✗ ไม่ยินยอม"}</div>
              </div>
              {detail.address && <div><span className="text-muted-foreground">ที่อยู่:</span> {detail.address}</div>}
              {(detail.allergies ?? []).length > 0 && (
                <div>
                  <p className="font-medium mb-1">การแพ้ยา</p>
                  {detail.allergies!.map((a, i) => (
                    <div key={i} className="text-xs bg-destructive/10 text-destructive rounded px-2 py-1 mb-1">
                      {a.drugName} — {a.reaction} ({a.severity})
                    </div>
                  ))}
                </div>
              )}
              {(detail.chronicDiseases ?? []).length > 0 && (
                <div>
                  <p className="font-medium mb-1">โรคประจำตัว</p>
                  <p className="text-xs">{detail.chronicDiseases!.join(", ")}</p>
                </div>
              )}
              {(detail.currentMedications ?? []).length > 0 && (
                <div>
                  <p className="font-medium mb-1">ยาที่ใช้ประจำ</p>
                  <p className="text-xs">{detail.currentMedications!.join(", ")}</p>
                </div>
              )}
              {detail.note && <div><span className="text-muted-foreground">หมายเหตุ:</span> {detail.note}</div>}
              <div>
                <p className="font-medium mb-1">ประวัติการจ่ายยา</p>
                {loadingHistory ? (
                  <div className="flex justify-center py-4"><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" /></div>
                ) : dispensingHistory.length === 0 ? (
                  <p className="text-xs text-muted-foreground">ไม่มีประวัติ</p>
                ) : (
                  <div className="max-h-48 overflow-y-auto border rounded">
                    <Table>
                      <TableHeader><TableRow>
                        <TableHead className="text-xs">วันที่</TableHead>
                        <TableHead className="text-xs">สินค้า</TableHead>
                        <TableHead className="text-xs">จำนวน</TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {dispensingHistory.map((d: { id?: string; _id?: string; createdDate?: string; productName?: string; quantity?: number }, i: number) => (
                          <TableRow key={d.id ?? d._id ?? i}>
                            <TableCell className="text-xs">{d.createdDate ? new Date(d.createdDate).toLocaleDateString("th-TH") : "-"}</TableCell>
                            <TableCell className="text-xs">{d.productName ?? "-"}</TableCell>
                            <TableCell className="text-xs">{d.quantity ?? "-"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create/Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "แก้ไขข้อมูลผู้ป่วย" : "เพิ่มผู้ป่วย"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <Label>รหัสลูกค้า *</Label>
              <Input value={form.customerCode} onChange={(e) => setForm((f) => ({ ...f, customerCode: e.target.value }))} disabled={!!editing} />
            </div>
            <div className="space-y-1"><Label>ชื่อ</Label><Input value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} /></div>
            <div className="space-y-1"><Label>นามสกุล</Label><Input value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} /></div>
            <div className="space-y-1"><Label>เลขบัตรประชาชน</Label><Input value={form.idCard} onChange={(e) => setForm((f) => ({ ...f, idCard: e.target.value }))} /></div>
            <div className="space-y-1">
              <Label>เพศ</Label>
              <Select value={form.gender} onValueChange={(v) => setForm((f) => ({ ...f, gender: v }))}>
                <SelectTrigger><SelectValue placeholder="เลือก" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MALE">ชาย</SelectItem>
                  <SelectItem value="FEMALE">หญิง</SelectItem>
                  <SelectItem value="OTHER">อื่นๆ</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>โทรศัพท์</Label><Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} /></div>
            <div className="space-y-1"><Label>อีเมล</Label><Input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} /></div>
            <div className="space-y-1"><Label>หมู่เลือด</Label><Input value={form.bloodType} onChange={(e) => setForm((f) => ({ ...f, bloodType: e.target.value }))} placeholder="A, B, AB, O" /></div>
            <div className="space-y-1"><Label>น้ำหนัก (กก.)</Label><Input type="number" value={form.weight} onChange={(e) => setForm((f) => ({ ...f, weight: +e.target.value }))} /></div>
            <div className="col-span-2 space-y-1"><Label>ที่อยู่</Label><Input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} /></div>
            <div className="col-span-2 space-y-1"><Label>หมายเหตุ</Label><Input value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} /></div>
            <div className="col-span-2 flex items-center gap-3">
              <input type="checkbox" id="consentGiven" checked={form.consentGiven ?? false} onChange={(e) => setForm((f) => ({ ...f, consentGiven: e.target.checked }))} className="h-4 w-4" />
              <Label htmlFor="consentGiven">ยินยอมเปิดเผยข้อมูล (PDPA)</Label>
            </div>
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
