"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { downloadReport, getReportUrl } from "@/lib/pos-api";
import { FileDown, FileText, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function ReportsPage() {
  const [startDate, setStartDate] = useState(() => { const d = new Date(); d.setDate(1); return d.toISOString().split("T")[0]; });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [orderId, setOrderId] = useState("");
  const [productId, setProductId] = useState("");
  const [customerCode, setCustomerCode] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const preview = (path: string, params?: Record<string, string | number>) => {
    const url = getReportUrl(path, params);
    setPreviewUrl(url);
  };

  const dl = async (key: string, path: string, params?: Record<string, string | number>, filename?: string) => {
    setLoading(key);
    try {
      await downloadReport(path, params, filename ?? key + ".pdf");
      toast.success("ดาวน์โหลดสำเร็จ");
    } catch { toast.error("ดาวน์โหลดไม่สำเร็จ"); }
    finally { setLoading(null); }
  };

  const btnProps = (key: string) => ({
    disabled: loading === key,
    className: "w-full justify-start gap-2",
    variant: "outline" as const,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">รายงาน</h1>

      {/* Date range */}
      <div className="flex flex-wrap gap-3 items-end p-4 bg-muted/50 rounded-lg">
        <div className="space-y-1"><Label className="text-xs">วันที่เริ่ม</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-40" /></div>
        <div className="space-y-1"><Label className="text-xs">วันที่สิ้นสุด</Label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-40" /></div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Sales Reports */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" />รายงานการขาย</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Button {...btnProps("sales-pdf")} onClick={() => dl("sales-pdf", "/reports/sales/pdf", { startDate: new Date(startDate).toISOString(), endDate: new Date(endDate + "T23:59:59").toISOString() }, "sales-report.pdf")}>
              <FileDown className="h-4 w-4" />{loading === "sales-pdf" ? "กำลังดาวน์โหลด…" : "รายงานขาย (PDF)"}
            </Button>
            <Button {...btnProps("sales-excel")} onClick={() => dl("sales-excel", "/reports/sales/excel", { startDate: new Date(startDate).toISOString(), endDate: new Date(endDate + "T23:59:59").toISOString() }, "sales-report.xlsx")}>
              <FileDown className="h-4 w-4" />{loading === "sales-excel" ? "กำลังดาวน์โหลด…" : "รายงานขาย (Excel)"}
            </Button>
            <Button {...btnProps("sales-csv")} onClick={() => dl("sales-csv", "/reports/sales/csv", { startDate: new Date(startDate).toISOString(), endDate: new Date(endDate + "T23:59:59").toISOString() }, "sales-report.csv")}>
              <FileDown className="h-4 w-4" />{loading === "sales-csv" ? "กำลังดาวน์โหลด…" : "รายงานขาย (CSV)"}
            </Button>
            <Button {...btnProps("stocks-excel")} onClick={() => dl("stocks-excel", "/reports/stocks/excel", undefined, "stocks-report.xlsx")}>
              <FileDown className="h-4 w-4" />{loading === "stocks-excel" ? "กำลังดาวน์โหลด…" : "รายงานสต็อก (Excel)"}
            </Button>
            <Button {...btnProps("stocks-csv")} onClick={() => dl("stocks-csv", "/reports/stocks/csv", undefined, "stocks-report.csv")}>
              <FileDown className="h-4 w-4" />{loading === "stocks-csv" ? "กำลังดาวน์โหลด…" : "รายงานสต็อก (CSV)"}
            </Button>
            <Button {...btnProps("price-tags")} onClick={() => dl("price-tags", "/reports/price-tags/pdf", undefined, "price-tags.pdf")}>
              <FileDown className="h-4 w-4" />{loading === "price-tags" ? "กำลังดาวน์โหลด…" : "ป้ายราคา (PDF)"}
            </Button>
            <Button {...btnProps("prices-pdf")} onClick={() => dl("prices-pdf", "/reports/prices/pdf", undefined, "prices.pdf")}>
              <FileDown className="h-4 w-4" />{loading === "prices-pdf" ? "กำลังดาวน์โหลด…" : "รายการราคา (PDF)"}
            </Button>
          </CardContent>
        </Card>

        {/* Receive Reports */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" />รายงานรับสินค้า</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Button {...btnProps("receives-pdf")} onClick={() => dl("receives-pdf", "/reports/receives/summary/pdf", { startDate: new Date(startDate).toISOString(), endDate: new Date(endDate + "T23:59:59").toISOString() }, "receives-summary.pdf")}>
              <FileDown className="h-4 w-4" />{loading === "receives-pdf" ? "กำลังดาวน์โหลด…" : "สรุปรับสินค้า (PDF)"}
            </Button>
          </CardContent>
        </Card>

        {/* Receipt by Order */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" />ใบเสร็จ / ใบกำกับภาษี</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1"><Label className="text-xs">Order ID</Label><Input value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="กรอก Order ID" /></div>
            <div className="flex gap-2">
              <Button {...btnProps("receipt")} disabled={!orderId || loading === "receipt"} onClick={() => dl("receipt", `/reports/receipt/${orderId}/pdf`, undefined, "receipt.pdf")} className="flex-1 justify-start gap-2">
                <FileDown className="h-4 w-4" />{loading === "receipt" ? "กำลังดาวน์โหลด…" : "ใบเสร็จ (PDF)"}
              </Button>
              <Button size="icon" variant="outline" disabled={!orderId} onClick={() => preview(`/reports/receipt/${orderId}/pdf`)} title="ดูตัวอย่าง" aria-label="ดูตัวอย่างใบเสร็จ">
                <Eye className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-2">
              <Button {...btnProps("tax-invoice")} disabled={!orderId || loading === "tax-invoice"} onClick={() => dl("tax-invoice", `/reports/tax-invoice/${orderId}/pdf`, undefined, "tax-invoice.pdf")} className="flex-1 justify-start gap-2">
                <FileDown className="h-4 w-4" />{loading === "tax-invoice" ? "กำลังดาวน์โหลด…" : "ใบกำกับภาษี (PDF)"}
              </Button>
              <Button size="icon" variant="outline" disabled={!orderId} onClick={() => preview(`/reports/tax-invoice/${orderId}/pdf`)} title="ดูตัวอย่าง" aria-label="ดูตัวอย่างใบกำกับภาษี">
                <Eye className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Product History */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" />ประวัติสินค้า</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1"><Label className="text-xs">Product ID (เฉพาะสินค้า)</Label><Input value={productId} onChange={(e) => setProductId(e.target.value)} placeholder="กรอก Product ID (ถ้าต้องการ)" /></div>
            <Button {...btnProps("prod-hist")} onClick={() => {
              const path = productId ? `/reports/product-history/${productId}/pdf` : "/reports/product-history/pdf";
              const params = !productId ? { startDate: new Date(startDate).toISOString(), endDate: new Date(endDate + "T23:59:59").toISOString() } : undefined;
              dl("prod-hist", path, params, "product-history.pdf");
            }}>
              <FileDown className="h-4 w-4" />{loading === "prod-hist" ? "กำลังดาวน์โหลด…" : "ประวัติสินค้า (PDF)"}
            </Button>
          </CardContent>
        </Card>

        {/* Customer History */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" />ประวัติลูกค้า</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1"><Label className="text-xs">รหัสลูกค้า</Label><Input value={customerCode} onChange={(e) => setCustomerCode(e.target.value)} placeholder="กรอกรหัสลูกค้า" /></div>
            <Button {...btnProps("cust-hist")} disabled={!customerCode || loading === "cust-hist"} onClick={() => dl("cust-hist", `/reports/customer-history/${customerCode}/pdf`, undefined, "customer-history.pdf")}>
              <FileDown className="h-4 w-4" />{loading === "cust-hist" ? "กำลังดาวน์โหลด…" : "ประวัติลูกค้า (PDF)"}
            </Button>
          </CardContent>
        </Card>

        {/* Pharmacy Reports */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" />รายงานร้านยา (KHY)</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {([
              ["khy9", "ข.ย.9 — บัญชีการซื้อยา"],
              ["khy10", "ข.ย.10 — บัญชีการขายยาควบคุมพิเศษ"],
              ["khy11", "ข.ย.11 — บัญชีการขายยาอันตราย"],
              ["khy12", "ข.ย.12 — บัญชีการขายยาตามใบสั่งของผู้ประกอบวิชาชีพฯ"],
              ["khy13", "ข.ย.13 — รายงานการขายยาตามที่เลขาธิการ อย. กำหนด"],
            ] as [string, string][]).map(([key, label]) => {
              const dateParams = { startDate: new Date(startDate).toISOString(), endDate: new Date(endDate + "T23:59:59").toISOString() };
              return (
                <div key={key} className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">{label}</p>
                  <div className="flex gap-1.5">
                    <Button {...btnProps(key)} className="flex-1 justify-start gap-2" onClick={() => dl(key, `/reports/pharmacy/${key}`, dateParams, `${key}.pdf`)}>
                      <FileDown className="h-4 w-4" />{loading === key ? "…" : "PDF"}
                    </Button>
                    <Button {...btnProps(`${key}-csv`)} className="flex-1 justify-start gap-2" onClick={() => dl(`${key}-csv`, `/reports/pharmacy/${key}/csv`, dateParams, `${key}.csv`)}>
                      <FileDown className="h-4 w-4" />{loading === `${key}-csv` ? "…" : "CSV"}
                    </Button>
                    <Button size="icon" variant="outline" onClick={() => preview(`/reports/pharmacy/${key}`, dateParams)} title="ดูตัวอย่าง" aria-label="ดูตัวอย่าง">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Preview dialog */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader><DialogTitle>ดูตัวอย่างรายงาน</DialogTitle></DialogHeader>
          {previewUrl && (
            <iframe src={previewUrl} className="w-full flex-1 border rounded" title="Report Preview" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
