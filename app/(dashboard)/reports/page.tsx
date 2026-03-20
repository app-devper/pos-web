"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { downloadReport, getOrder, getOrdersByCustomer, getPharmacyReportData, getProduct, getProductHistories, getReportUrl, getSetting, listBranches, listCustomers, listOrders, listProducts, listReceives } from "@/lib/pos-api";
import { FileDown, FileText, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { printCustomerHistoryReport, printPharmacyReport, printPriceListReport, printPriceTagsReport, printProductHistoryReport, printReceiptDocument, printReceivesSummaryReport, printSalesReport } from "@/lib/report-print";

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

  const printSalesPdf = async () => {
    const key = "sales-pdf";
    setLoading(key);
    try {
      const from = new Date(startDate).toISOString();
      const to = new Date(endDate + "T23:59:59").toISOString();
      const [orders, setting, branches] = await Promise.all([
        listOrders(from, to),
        getSetting().catch(() => undefined),
        listBranches().catch(() => []),
      ]);
      printSalesReport({ startDate: from, endDate: to, orders: Array.isArray(orders) ? orders : [], setting, branches: Array.isArray(branches) ? branches : [] });
      toast.success("เปิดเอกสารสำหรับบันทึกเป็น PDF แล้ว");
    } catch {
      toast.error("สร้างรายงานขายไม่สำเร็จ");
    } finally {
      setLoading(null);
    }
  };

  const printCustomerHistoryPdf = async () => {
    if (!customerCode) return;
    const key = "cust-hist";
    setLoading(key);
    try {
      const [orders, customers, setting] = await Promise.all([
        getOrdersByCustomer(customerCode),
        listCustomers().catch(() => []),
        getSetting().catch(() => undefined),
      ]);
      const customer = Array.isArray(customers) ? customers.find((item) => item.code === customerCode) : undefined;
      printCustomerHistoryReport({
        customerCode,
        customer,
        orders: Array.isArray(orders) ? orders : [],
        setting,
      });
      toast.success("เปิดเอกสารสำหรับบันทึกเป็น PDF แล้ว");
    } catch {
      toast.error("สร้างประวัติลูกค้าไม่สำเร็จ");
    } finally {
      setLoading(null);
    }
  };

  const printOrderDocument = async (mode: "receipt" | "tax-invoice") => {
    if (!orderId) return;
    const key = mode;
    setLoading(key);
    try {
      const [order, setting, branches] = await Promise.all([
        getOrder(orderId),
        getSetting().catch(() => undefined),
        listBranches().catch(() => []),
      ]);
      const branch = Array.isArray(branches) ? branches.find((item) => item.id === order.branchId) : undefined;
      printReceiptDocument({
        title: mode === "receipt" ? "ใบเสร็จรับเงิน" : "ใบกำกับภาษี",
        order,
        setting,
        branch,
        showTaxId: mode === "tax-invoice",
      });
      toast.success("เปิดเอกสารสำหรับบันทึกเป็น PDF แล้ว");
    } catch {
      toast.error(mode === "receipt" ? "สร้างใบเสร็จไม่สำเร็จ" : "สร้างใบกำกับภาษีไม่สำเร็จ");
    } finally {
      setLoading(null);
    }
  };

  const printReceivesPdf = async () => {
    const key = "receives-pdf";
    setLoading(key);
    try {
      const from = new Date(startDate).toISOString();
      const to = new Date(endDate + "T23:59:59").toISOString();
      const [receives, setting] = await Promise.all([
        listReceives(from, to),
        getSetting().catch(() => undefined),
      ]);
      printReceivesSummaryReport({
        startDate: from,
        endDate: to,
        receives: Array.isArray(receives) ? receives : [],
        setting,
      });
      toast.success("เปิดเอกสารสำหรับบันทึกเป็น PDF แล้ว");
    } catch {
      toast.error("สร้างสรุปรับสินค้าไม่สำเร็จ");
    } finally {
      setLoading(null);
    }
  };

  const printProductHistoryPdf = async () => {
    if (!productId) return;
    const key = "prod-hist";
    setLoading(key);
    try {
      const [product, histories, setting] = await Promise.all([
        getProduct(productId),
        getProductHistories(productId),
        getSetting().catch(() => undefined),
      ]);
      printProductHistoryReport({
        product,
        histories: Array.isArray(histories) ? histories : [],
        setting,
      });
      toast.success("เปิดเอกสารสำหรับบันทึกเป็น PDF แล้ว");
    } catch {
      toast.error("สร้างประวัติสินค้าไม่สำเร็จ");
    } finally {
      setLoading(null);
    }
  };

  const printPriceListPdf = async (mode: "prices" | "price-tags") => {
    const key = mode === "prices" ? "prices-pdf" : "price-tags";
    setLoading(key);
    try {
      const [products, setting] = await Promise.all([
        listProducts(),
        getSetting().catch(() => undefined),
      ]);
      const items = Array.isArray(products) ? products : [];
      if (mode === "prices") printPriceListReport({ products: items, setting });
      else printPriceTagsReport({ products: items, setting });
      toast.success("เปิดเอกสารสำหรับบันทึกเป็น PDF แล้ว");
    } catch {
      toast.error(mode === "prices" ? "สร้างรายการราคาไม่สำเร็จ" : "สร้างป้ายราคาไม่สำเร็จ");
    } finally {
      setLoading(null);
    }
  };

  const printPharmacyPdf = async (key: "khy9" | "khy10" | "khy11" | "khy12" | "khy13") => {
    setLoading(key);
    try {
      const dateParams = {
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate + "T23:59:59").toISOString(),
      };
      const [report, setting] = await Promise.all([
        getPharmacyReportData(key, dateParams),
        getSetting().catch(() => undefined),
      ]);
      printPharmacyReport({ report, setting });
      toast.success("เปิดเอกสารสำหรับบันทึกเป็น PDF แล้ว");
    } catch {
      toast.error("สร้างรายงานร้านยาไม่สำเร็จ");
    } finally {
      setLoading(null);
    }
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
            <Button {...btnProps("sales-pdf")} onClick={printSalesPdf}>
              <FileDown className="h-4 w-4" />{loading === "sales-pdf" ? "กำลังสร้าง…" : "รายงานขาย (PDF จากหน้าเว็บ)"}
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
            <Button {...btnProps("price-tags")} onClick={() => printPriceListPdf("price-tags")}>
              <FileDown className="h-4 w-4" />{loading === "price-tags" ? "กำลังสร้าง…" : "ป้ายราคา (PDF จากหน้าเว็บ)"}
            </Button>
            <Button {...btnProps("prices-pdf")} onClick={() => printPriceListPdf("prices")}>
              <FileDown className="h-4 w-4" />{loading === "prices-pdf" ? "กำลังสร้าง…" : "รายการราคา (PDF จากหน้าเว็บ)"}
            </Button>
          </CardContent>
        </Card>

        {/* Receive Reports */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" />รายงานรับสินค้า</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Button {...btnProps("receives-pdf")} onClick={printReceivesPdf}>
              <FileDown className="h-4 w-4" />{loading === "receives-pdf" ? "กำลังสร้าง…" : "สรุปรับสินค้า (PDF จากหน้าเว็บ)"}
            </Button>
          </CardContent>
        </Card>

        {/* Receipt by Order */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" />ใบเสร็จ / ใบกำกับภาษี</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1"><Label className="text-xs">Order ID</Label><Input value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="กรอก Order ID" /></div>
            <div className="flex gap-2">
              <Button {...btnProps("receipt")} disabled={!orderId || loading === "receipt"} onClick={() => printOrderDocument("receipt")} className="flex-1 justify-start gap-2">
                <FileDown className="h-4 w-4" />{loading === "receipt" ? "กำลังสร้าง…" : "ใบเสร็จ (PDF จากหน้าเว็บ)"}
              </Button>
              <Button size="icon" variant="outline" disabled={!orderId} onClick={() => printOrderDocument("receipt")} title="เปิดสำหรับพิมพ์" aria-label="เปิดสำหรับพิมพ์ใบเสร็จ">
                <Eye className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-2">
              <Button {...btnProps("tax-invoice")} disabled={!orderId || loading === "tax-invoice"} onClick={() => printOrderDocument("tax-invoice")} className="flex-1 justify-start gap-2">
                <FileDown className="h-4 w-4" />{loading === "tax-invoice" ? "กำลังสร้าง…" : "ใบกำกับภาษี (PDF จากหน้าเว็บ)"}
              </Button>
              <Button size="icon" variant="outline" disabled={!orderId} onClick={() => printOrderDocument("tax-invoice")} title="เปิดสำหรับพิมพ์" aria-label="เปิดสำหรับพิมพ์ใบกำกับภาษี">
                <Eye className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Product History */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" />ประวัติสินค้า</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1"><Label className="text-xs">Product ID (เฉพาะสินค้า)</Label><Input value={productId} onChange={(e) => setProductId(e.target.value)} placeholder="กรอก Product ID" /></div>
            <Button {...btnProps("prod-hist")} disabled={!productId || loading === "prod-hist"} onClick={printProductHistoryPdf}>
              <FileDown className="h-4 w-4" />{loading === "prod-hist" ? "กำลังสร้าง…" : "ประวัติสินค้า (PDF จากหน้าเว็บ)"}
            </Button>
          </CardContent>
        </Card>

        {/* Customer History */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" />ประวัติลูกค้า</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1"><Label className="text-xs">รหัสลูกค้า</Label><Input value={customerCode} onChange={(e) => setCustomerCode(e.target.value)} placeholder="กรอกรหัสลูกค้า" /></div>
            <Button {...btnProps("cust-hist")} disabled={!customerCode || loading === "cust-hist"} onClick={printCustomerHistoryPdf}>
              <FileDown className="h-4 w-4" />{loading === "cust-hist" ? "กำลังสร้าง…" : "ประวัติลูกค้า (PDF จากหน้าเว็บ)"}
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
                    <Button {...btnProps(key)} className="flex-1 justify-start gap-2" onClick={() => printPharmacyPdf(key as "khy9" | "khy10" | "khy11" | "khy12" | "khy13")}>
                      <FileDown className="h-4 w-4" />{loading === key ? "…" : "PDF"}
                    </Button>
                    <Button {...btnProps(`${key}-csv`)} className="flex-1 justify-start gap-2" onClick={() => dl(`${key}-csv`, `/reports/pharmacy/${key}/csv`, dateParams, `${key}.csv`)}>
                      <FileDown className="h-4 w-4" />{loading === `${key}-csv` ? "…" : "CSV"}
                    </Button>
                    <Button size="icon" variant="outline" onClick={() => printPharmacyPdf(key as "khy9" | "khy10" | "khy11" | "khy12" | "khy13")} title="เปิดสำหรับพิมพ์" aria-label="เปิดสำหรับพิมพ์">
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
