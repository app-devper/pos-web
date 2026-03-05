"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Search, Plus, ArrowUpDown, X, Package, RefreshCw, ChevronLeft, Upload } from "lucide-react";
import { createProduct, updateProduct, deleteProduct, listCategories, createProductUnit, createProductPrice, importProductsCsv } from "@/lib/pos-api";
import { useProductCache } from "@/components/ProductCacheContext";
import type { ProductDetail, CreateProductRequest, Category, CSVImportResult } from "@/types/pos";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import ProductDetailPanel from "./_components/ProductDetailPanel";
import { ProductDetailProvider } from "./_components/ProductDetailContext";
import { useConfirm } from "@/components/ConfirmDialog";


const DRUG_REGISTRATIONS = [
  { value: "KHY9", label: "บัญชี ข.ย.9", desc: "บัญชีการซื้อยา" },
  { value: "KHY10", label: "บัญชี ข.ย.10", desc: "บัญชีการขายยาควบคุมพิเศษ" },
  { value: "KHY11", label: "บัญชี ข.ย.11", desc: "บัญชีการขายยาอันตราย" },
  { value: "KHY12", label: "บัญชี ข.ย.12", desc: "บัญชีการขายยาตามใบสั่งของผู้ประกอบวิชาชีพฯ" },
  { value: "KHY13", label: "บัญชี ข.ย.13", desc: "รายงานการขายยาตามที่เลขาธิการ อย. กำหนด" },
];

const DRUG_TYPES = [
  { value: "OTC", label: "ยาสามัญประจำบ้าน (OTC)" },
  { value: "DANGEROUS", label: "ยาอันตราย" },
  { value: "CONTROLLED", label: "ยาควบคุมพิเศษ" },
  { value: "PSYCHO", label: "วัตถุออกฤทธิ์ต่อจิตประสาท" },
  { value: "NARCOTIC", label: "ยาเสพติด" },
];


const NUM_CLS = "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

const EMPTY: CreateProductRequest = {
  name: "", nameEn: "", description: "", price: 0, costPrice: 0,
  unit: "", serialNumber: "", category: "", status: "ACTIVE", minStock: 0, drugRegistrations: [],
  drugInfo: undefined,
};

interface UnitForm { unit: string; price: number; costPrice: number; barcode: string; sku: string; }

const EMPTY_UNIT: UnitForm = { unit: "", price: 0, costPrice: 0, barcode: "", sku: "" };

export default function ProductsPage() {
  const { products: items, loading, refresh } = useProductCache();
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [sortBalance, setSortBalance] = useState(false);

  const [selected, setSelected] = useState<ProductDetail | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ProductDetail | null>(null);
  const [form, setForm] = useState<CreateProductRequest>(EMPTY);
  const [unitForm, setUnitForm] = useState<UnitForm>(EMPTY_UNIT);
  const [saving, setSaving] = useState(false);

  const [csvOpen, setCsvOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvUploading, setCsvUploading] = useState(false);
  const [csvResult, setCsvResult] = useState<CSVImportResult | null>(null);
  const confirm = useConfirm();

  useEffect(() => {
    listCategories()
      .then((c) => setCategories(Array.isArray(c) ? c : []))
      .catch(() => {});
  }, []);

  function selectProduct(p: ProductDetail) {
    setSelected(p);
  }

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setUnitForm(EMPTY_UNIT);
    setFormOpen(true);
  }
  function openEdit(p: ProductDetail) {
    setEditing(p);
    setForm({ name: p.name, nameEn: p.nameEn ?? "", description: p.description ?? "", price: p.price, costPrice: p.costPrice, unit: p.unit, serialNumber: p.serialNumber, category: p.category ?? "", status: p.status ?? "ACTIVE", minStock: p.minStock ?? 0, drugRegistrations: p.drugRegistrations ?? [], drugInfo: p.drugInfo ?? undefined });
    setFormOpen(true);
  }
  function closeForm() {
    setFormOpen(false);
    setEditing(null);
  }

  async function handleSave() {
    if (!form.name) return toast.error("กรุณากรอกชื่อสินค้า");
    setSaving(true);
    try {
      if (editing) {
        await updateProduct(editing.id, { name: form.name, nameEn: form.nameEn, description: form.description, category: form.category, status: form.status, drugRegistrations: form.drugRegistrations, drugInfo: form.drugInfo });
        toast.success("อัปเดตสินค้าแล้ว");
        setFormOpen(false);
      } else {
        if (!form.serialNumber) return toast.error("กรุณากรอกรหัสสินค้า");
        const product = await createProduct(form);
        if (product?.id && unitForm.unit) {
          const unit = await createProductUnit({ productId: product.id, unit: unitForm.unit, size: 1, costPrice: unitForm.costPrice || form.costPrice, barcode: unitForm.barcode || undefined });
          if (unit?.id && unitForm.price > 0) {
            await createProductPrice({ productId: product.id, unitId: unit.id, customerType: "General", price: unitForm.price });
          }
        }
        toast.success("สร้างสินค้าแล้ว");
        setFormOpen(false);
      }
      await refresh();
    } catch { toast.error("บันทึกไม่สำเร็จ"); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!(await confirm({ description: "ลบสินค้านี้?", destructive: true }))) return;
    try {
      await deleteProduct(id);
      toast.success("ลบสินค้าแล้ว");
      if (selected?.id === id) setSelected(null);
      await refresh();
    } catch { toast.error("ลบไม่สำเร็จ"); }
  }

  const filtered = items
    .filter((p) =>
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.serialNumber?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (!sortBalance) return 0;
      const qa = a.stocks?.reduce((s, st) => s + st.quantity, 0) ?? a.quantity;
      const qb = b.stocks?.reduce((s, st) => s + st.quantity, 0) ?? b.quantity;
      return qa - qb;
    });

  return (
    <div className="-m-4 md:-m-6 flex h-screen border-t overflow-hidden bg-background">

      {/* ── Left: Product list ── */}
      <div className="w-72 shrink-0 flex flex-col border-r">
        <div className="flex items-center gap-1 p-2 border-b">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ค้นหาสินค้า…"
              className="pl-8 h-9 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="absolute right-2 top-1/2 -translate-y-1/2" onClick={() => setSearch("")}>
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
          <Button size="icon" variant={sortBalance ? "default" : "ghost"} className="h-9 w-9 shrink-0" title="เรียงตามคงเหลือ" aria-label="เรียงตามคงเหลือ" onClick={() => setSortBalance((v) => !v)}>
            <ArrowUpDown className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" className="h-9 w-9 shrink-0" title="เพิ่มสินค้า" aria-label="เพิ่มสินค้า" onClick={openCreate}>
            <Plus className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" className="h-9 w-9 shrink-0" title="นำเข้า CSV" aria-label="นำเข้า CSV" onClick={() => { setCsvOpen(true); setCsvFile(null); setCsvResult(null); }}>
            <Upload className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" className="h-9 w-9 shrink-0" title="รีเฟรช" aria-label="รีเฟรช" onClick={() => refresh()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
              <Package className="h-8 w-8 opacity-30" />
              <p className="text-xs">ไม่พบสินค้า</p>
            </div>
          ) : (
            filtered.map((p) => {
              const qty = p.stocks?.reduce((s, st) => s + st.quantity, 0) ?? p.quantity;
              const isActive = selected?.id === p.id;
              return (
                <div key={p.id}>
                  <button
                    onClick={() => selectProduct(p)}
                    className={`w-full text-left px-4 py-3 flex items-center justify-between transition-colors ${isActive ? "bg-primary/10 border-l-2 border-primary" : "hover:bg-accent"}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {sortBalance ? `คงเหลือ ${qty} ${p.unit}` : p.unit}
                      </p>
                    </div>
                    <span className={`text-xs font-semibold ml-2 shrink-0 ${qty <= 0 ? "text-destructive" : qty <= 10 ? "text-yellow-600" : "text-muted-foreground"}`}>
                      {qty}
                    </span>
                  </button>
                  <Separator />
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Right: Detail panel or Form panel ── */}
      <div className="flex-1 min-w-0 overflow-hidden">
        {formOpen ? (
          <div className="flex flex-col h-full">
            {/* Form header */}
            <div className="flex items-center gap-3 px-6 py-4 border-b shrink-0">
              <button onClick={closeForm} className="text-muted-foreground hover:text-foreground">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h2 className="text-lg font-semibold">{editing ? "แก้ไขสินค้า" : "เพิ่มสินค้า"}</h2>
            </div>
            {/* Form body */}
            <div className="flex-1 overflow-y-auto min-h-0 p-6 space-y-6">
              {/* ── Section: ข้อมูลสินค้า ── */}
              <div>
                <h3 className="text-base font-semibold mb-4">ข้อมูลสินค้า</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 space-y-1">
                    <Label>ชื่อสินค้า *</Label>
                    <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>ชื่อภาษาอังกฤษ</Label>
                    <Input value={form.nameEn} onChange={(e) => setForm((f) => ({ ...f, nameEn: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>รหัสสินค้า *</Label>
                    <Input value={form.serialNumber} onChange={(e) => setForm((f) => ({ ...f, serialNumber: e.target.value }))} disabled={!!editing} />
                  </div>
                  {!editing && (
                    <div className="space-y-1">
                      <Label>หน่วยหลัก *</Label>
                      <Input value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} placeholder="เช่น กล่อง, แผ่น" />
                    </div>
                  )}
                  <div className="space-y-1">
                    <Label>หมวดหมู่</Label>
                    <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                      <SelectTrigger><SelectValue placeholder="เลือกหมวดหมู่" /></SelectTrigger>
                      <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
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
                  <div className="space-y-1">
                    <Label>จุดสั่งซื้อขั้นต่ำ (Min Stock)</Label>
                    <Input type="number" min={0} value={form.minStock === 0 ? "" : form.minStock} onChange={(e) => setForm((f) => ({ ...f, minStock: +e.target.value }))} className={NUM_CLS} placeholder="0" />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label>รายละเอียด</Label>
                    <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} />
                  </div>
                </div>
              </div>

              <Separator />

              {/* ── Section: หน่วยนับ และการขาย ── */}
              {!editing && (
                <div>
                  <h3 className="text-base font-semibold mb-1">ข้อมูลหน่วยนับ และการขาย</h3>
                  <p className="text-xs text-muted-foreground mb-4">สร้างหน่วยนับแรกให้สินค้าอัตโนมัติ (ไม่บังคับ)</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 space-y-1">
                      <Label>ชื่อหน่วยนับ <span className="text-xs text-muted-foreground font-normal">ภาษาไทย, อังกฤษ และตัวเลข</span></Label>
                      <Input value={unitForm.unit} onChange={(e) => setUnitForm((f) => ({ ...f, unit: e.target.value }))} placeholder="โปรดระบุหน่วยนับ" />
                    </div>
                    <div className="space-y-1">
                      <Label>ราคาขายต่อหน่วย <span className="text-xs text-muted-foreground font-normal">ค่าเริ่มต้น</span></Label>
                      <Input type="number" min={0} value={unitForm.price === 0 ? "" : unitForm.price} onChange={(e) => setUnitForm((f) => ({ ...f, price: +e.target.value }))} className={NUM_CLS} />
                    </div>
                    <div className="space-y-1">
                      <Label>ต้นทุนต่อหน่วย <span className="text-xs text-muted-foreground font-normal">ค่าเริ่มต้น</span></Label>
                      <Input type="number" min={0} value={unitForm.costPrice === 0 ? "" : unitForm.costPrice} onChange={(e) => setUnitForm((f) => ({ ...f, costPrice: +e.target.value }))} className={NUM_CLS} />
                    </div>
                    <div className="space-y-1">
                      <Label>บาร์โค้ด <span className="text-xs text-muted-foreground font-normal">ผูกกับหน่วยนับ</span></Label>
                      <Input value={unitForm.barcode} onChange={(e) => setUnitForm((f) => ({ ...f, barcode: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label>SKU <span className="text-xs text-muted-foreground font-normal">รหัสสินค้า</span></Label>
                      <Input value={unitForm.sku} onChange={(e) => setUnitForm((f) => ({ ...f, sku: e.target.value }))} />
                    </div>
                  </div>

                </div>
              )}

              {!editing && <Separator />}

              {/* ── Section: ข้อมูลยา ── */}
              <div>
                <h3 className="text-base font-semibold mb-4">ข้อมูลยา</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>ประเภทยา</Label>
                    <Select value={form.drugInfo?.drugType ?? ""} onValueChange={(v) => setForm((f) => ({ ...f, drugInfo: { ...f.drugInfo, drugType: v as CreateProductRequest["drugInfo"] extends { drugType?: infer T } ? T : never } }))}>
                      <SelectTrigger><SelectValue placeholder="เลือกประเภทยา" /></SelectTrigger>
                      <SelectContent>
                        {DRUG_TYPES.map((dt) => <SelectItem key={dt.value} value={dt.value}>{dt.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>ชื่อสามัญ</Label>
                    <Input value={form.drugInfo?.genericName ?? ""} onChange={(e) => setForm((f) => ({ ...f, drugInfo: { ...f.drugInfo, genericName: e.target.value } }))} placeholder="Generic Name" />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label>ยาตีกัน (Drug Interactions)</Label>
                    <Textarea
                      value={(form.drugInfo?.drugInteractions ?? []).join(", ")}
                      onChange={(e) => {
                        const val = e.target.value;
                        const interactions = val ? val.split(",").map((s) => s.trim()).filter(Boolean) : [];
                        setForm((f) => ({ ...f, drugInfo: { ...f.drugInfo, drugInteractions: interactions } }));
                      }}
                      rows={2}
                      placeholder="คั่นด้วยเครื่องหมาย , เช่น Warfarin, Aspirin"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* ── Section: การขึ้นทะเบียนบัญชี ── */}
              <div>
                <h3 className="text-base font-semibold mb-4">การขึ้นทะเบียนบัญชี</h3>
                <div className="space-y-1">
                  {DRUG_REGISTRATIONS.map((dr) => {
                    const checked = (form.drugRegistrations ?? []).includes(dr.value);
                    return (
                      <button key={dr.value} type="button"
                        onClick={() => setForm((f) => {
                          const regs = f.drugRegistrations ?? [];
                          return { ...f, drugRegistrations: checked ? regs.filter((r) => r !== dr.value) : [...regs, dr.value] };
                        })}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors ${
                          checked ? "border-primary bg-primary/5" : "border-border hover:bg-accent"
                        }`}
                      >
                        <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          checked ? "border-primary bg-primary" : "border-muted-foreground"
                        }`}>
                          {checked && <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{dr.label}</p>
                          <p className="text-xs text-muted-foreground">{dr.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            {/* Form footer */}
            <div className="shrink-0 border-t px-6 py-4 flex justify-end gap-2">
              <Button variant="outline" onClick={closeForm}>ยกเลิก</Button>
              <Button onClick={handleSave} disabled={saving}>{saving ? "กำลังบันทึก…" : "บันทึก"}</Button>
            </div>
          </div>
        ) : !selected ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
            <Package className="h-12 w-12 opacity-20" />
            <p className="text-sm">เลือกสินค้าเพื่อดูรายละเอียด</p>
            <Button variant="outline" size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" />เพิ่มสินค้าใหม่
            </Button>
          </div>
        ) : (
          <ProductDetailProvider product={selected} onProductReload={refresh}>
            <ProductDetailPanel onEdit={() => openEdit(selected)} />
          </ProductDetailProvider>
        )}
      </div>

      {/* CSV Import Dialog */}
      <Dialog open={csvOpen} onOpenChange={setCsvOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>นำเข้าสินค้าจาก CSV</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>เลือกไฟล์ CSV</Label>
              <Input type="file" accept=".csv" onChange={(e) => { setCsvFile(e.target.files?.[0] ?? null); setCsvResult(null); }} />
              {csvFile && <p className="text-xs text-muted-foreground">{csvFile.name} ({(csvFile.size / 1024).toFixed(1)} KB)</p>}
            </div>
            {csvUploading && (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                <span className="text-sm text-muted-foreground">กำลังอัปโหลด…</span>
              </div>
            )}
            {csvResult && (
              <div className="rounded border p-3 space-y-1 text-sm">
                <p className="font-medium">ผลการนำเข้า</p>
                <p className="text-green-600">สำเร็จ: {csvResult.success} รายการ</p>
                {(csvResult.failed ?? 0) > 0 && <p className="text-destructive">ล้มเหลว: {csvResult.failed} รายการ</p>}
                {csvResult.errors && csvResult.errors.length > 0 && (
                  <div className="max-h-32 overflow-y-auto text-xs text-destructive space-y-0.5 mt-1">
                    {csvResult.errors.map((err, i) => <p key={i}>{err}</p>)}
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCsvOpen(false)}>ปิด</Button>
            <Button disabled={!csvFile || csvUploading} onClick={async () => {
              if (!csvFile) return;
              setCsvUploading(true);
              setCsvResult(null);
              try {
                const res = await importProductsCsv(csvFile);
                setCsvResult(res);
                if (res.success > 0) { toast.success(`นำเข้าสำเร็จ ${res.success} รายการ`); refresh(); }
              } catch { toast.error("นำเข้าไม่สำเร็จ"); }
              finally { setCsvUploading(false); }
            }}>
              <Upload className="h-4 w-4 mr-2" />อัปโหลด
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
