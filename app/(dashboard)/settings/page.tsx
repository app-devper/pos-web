"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSetting, upsertSetting } from "@/lib/pos-api";
import type { SettingRequest } from "@/types/pos";

const FEATURE_FLAGS = [
  { key: "drugInteractionAlert", label: "แจ้งเตือนยาตีกัน", desc: "ตรวจสอบปฏิกิริยาระหว่างยาอัตโนมัติขณะขาย" },
  { key: "allergyCheck", label: "ตรวจสอบแพ้ยา", desc: "ตรวจสอบการแพ้ยาของผู้ป่วยขณะขาย" },
  { key: "controlledDrugCompliance", label: "บันทึกยาควบคุม", desc: "บังคับกรอกชื่อเภสัชกร/แพทย์สำหรับยาควบคุม" },
  { key: "patientLinking", label: "ผูกผู้ป่วยกับการขาย", desc: "เลือกผู้ป่วยเมื่อขายยาในหน้า POS" },
  { key: "multiCart", label: "Multi-Cart (6 ตะกร้า)", desc: "เปิดใช้แท็บตะกร้าหลายรายการพร้อมกัน" },
  { key: "prescriptionLabel", label: "พิมพ์ฉลากยา", desc: "พิมพ์ฉลากยาจากหน้า POS" },
  { key: "batchTracking", label: "จัดการ Lot/Batch", desc: "เปิดใช้การจัดการ Lot Number และวันหมดอายุ" },
];

const EMPTY: SettingRequest = {
  receiptFooter: "", companyName: "", companyAddress: "",
  companyPhone: "", companyTaxId: "", logoUrl: "", showCredit: false, promptPayId: "",
  features: {},
};

export default function SettingsPage() {
  const [form, setForm] = useState<SettingRequest>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSetting()
      .then((s) => setForm({
        receiptFooter: s.receiptFooter ?? "",
        companyName: s.companyName ?? "",
        companyAddress: s.companyAddress ?? "",
        companyPhone: s.companyPhone ?? "",
        companyTaxId: s.companyTaxId ?? "",
        logoUrl: s.logoUrl ?? "",
        showCredit: s.showCredit ?? false,
        promptPayId: s.promptPayId ?? "",
        features: s.features ?? {},
      }))
      .catch(() => toast.error("โหลดข้อมูลไม่สำเร็จ"))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await upsertSetting(form);
      toast.success("บันทึกการตั้งค่าแล้ว");
    } catch { toast.error("บันทึกไม่สำเร็จ"); }
    finally { setSaving(false); }
  }

  const f = (key: keyof SettingRequest) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">การตั้งค่า</h1>

      <Card>
        <CardHeader><CardTitle className="text-base">ข้อมูลกิจการ</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1"><Label>ชื่อกิจการ</Label><Input value={form.companyName} onChange={f("companyName")} /></div>
          <div className="space-y-1"><Label>ที่อยู่</Label><Textarea value={form.companyAddress} onChange={f("companyAddress")} rows={2} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1"><Label>โทรศัพท์</Label><Input value={form.companyPhone} onChange={f("companyPhone")} /></div>
            <div className="space-y-1"><Label>เลขประจำตัวผู้เสียภาษี</Label><Input value={form.companyTaxId} onChange={f("companyTaxId")} /></div>
          </div>
          <div className="space-y-1"><Label>URL โลโก้</Label><Input value={form.logoUrl} onChange={f("logoUrl")} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">ใบเสร็จ</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1"><Label>ข้อความท้ายใบเสร็จ</Label><Textarea value={form.receiptFooter} onChange={f("receiptFooter")} rows={3} /></div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="showCredit"
              checked={form.showCredit ?? false}
              onChange={(e) => setForm((p) => ({ ...p, showCredit: e.target.checked }))}
              className="h-4 w-4"
            />
            <Label htmlFor="showCredit">แสดงยอดเครดิตในใบเสร็จ</Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">PromptPay</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-1"><Label>หมายเลข PromptPay</Label><Input value={form.promptPayId} onChange={f("promptPayId")} placeholder="0812345678 หรือ เลขนิติบุคคล" /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Feature Toggles</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {FEATURE_FLAGS.map((ff) => (
            <div key={ff.key} className="flex items-start gap-3">
              <input
                type="checkbox"
                id={`ff-${ff.key}`}
                checked={form.features?.[ff.key] ?? false}
                onChange={(e) => setForm((p) => ({ ...p, features: { ...p.features, [ff.key]: e.target.checked } }))}
                className="h-4 w-4 mt-0.5"
              />
              <div>
                <Label htmlFor={`ff-${ff.key}`} className="cursor-pointer">{ff.label}</Label>
                <p className="text-xs text-muted-foreground">{ff.desc}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="w-full">{saving ? "กำลังบันทึก…" : "บันทึกการตั้งค่า"}</Button>
    </div>
  );
}
