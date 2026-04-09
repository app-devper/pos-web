"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Trash2, Search, ShoppingCart, DollarSign, TrendingUp, Receipt, ChevronLeft, X } from "lucide-react";
import { listOrders, deleteOrder, getOrder } from "@/lib/pos-api";
import { PAYMENT_LABEL, getOrderPayments, getPaymentSummary } from "@/lib/payment-summary";
import { useConfirm } from "@/components/ConfirmDialog";
import type { Order, OrderDetail } from "@/types/pos";
import { hasPermission } from "@/lib/rbac";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  ACTIVE: { label: "สำเร็จ", variant: "default" },
  COMPLETED: { label: "สำเร็จ", variant: "default" },
  VOIDED: { label: "ยกเลิก", variant: "destructive" },
  CANCELLED: { label: "ยกเลิก", variant: "destructive" },
};

function formatLocalDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toDayRange(date: string, boundary: "start" | "end") {
  return `${date}T${boundary === "start" ? "00:00:00.000" : "23:59:59.999"}`;
}

export default function OrdersPage() {
  const canDeleteOrder = hasPermission("orders:delete");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return formatLocalDateInput(d);
  });
  const [endDate, setEndDate] = useState(() => formatLocalDateInput(new Date()));
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const confirm = useConfirm();
  const dateRangeRef = useRef({ startDate, endDate });

  useEffect(() => {
    dateRangeRef.current = { startDate, endDate };
  }, [endDate, startDate]);

  const load = useCallback(() => {
    const { startDate: currentStartDate, endDate: currentEndDate } = dateRangeRef.current;
    setLoading(true);
    listOrders(toDayRange(currentStartDate, "start"), toDayRange(currentEndDate, "end"))
      .then((data) => setOrders(Array.isArray(data) ? data : []))
      .catch(() => toast.error("โหลดข้อมูลไม่สำเร็จ — ลองใหม่อีกครั้ง"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleView(id: string) {
    setDetailLoading(true);
    try {
      const d = await getOrder(id) as OrderDetail;
      setDetail(d);
    } catch { toast.error("โหลดรายละเอียดไม่สำเร็จ — ลองคลิกรายการอีกครั้ง"); }
    finally { setDetailLoading(false); }
  }

  async function handleDelete(id: string) {
    if (!canDeleteOrder) return;
    if (!(await confirm({ description: "ลบรายการขายนี้?", destructive: true }))) return;
    try {
      await deleteOrder(id);
      toast.success("ลบแล้ว");
      if (detail?.id === id) setDetail(null);
      load();
    } catch { toast.error("ลบไม่สำเร็จ — ลองใหม่หรือติดต่อผู้ดูแลระบบ"); }
  }

  const fmt = (n: number) => new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2 }).format(n);
  const fmtDate = (s?: string) => s ? new Date(s).toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "2-digit" }) : "-";
  const fmtTime = (s?: string) => s ? new Date(s).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) : "";
  const fmtDateTime = (s?: string) => s ? new Date(s).toLocaleString("th-TH", { day: "2-digit", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" }) : "-";
  const detailPayments = detail ? getOrderPayments(detail) : [];

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter !== "ALL" && o.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          o.code?.toLowerCase().includes(q) ||
          o.id?.toLowerCase().includes(q) ||
          o.customerCode?.toLowerCase().includes(q) ||
          o.customerName?.toLowerCase().includes(q) ||
          getPaymentSummary(o, (amount) => `฿${fmt(amount)}`).toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [orders, search, statusFilter]);

  const summary = useMemo(() => {
    const active = filtered.filter((o) => o.status !== "VOIDED" && o.status !== "CANCELLED");
    return {
      count: active.length,
      revenue: active.reduce((s, o) => s + (o.total ?? 0), 0),
      profit: active.reduce((s, o) => s + ((o.total ?? 0) - (o.totalCost ?? 0)), 0),
    };
  }, [filtered]);

  const statuses = useMemo(() => {
    const map = new Map<string, number>();
    orders.forEach((o) => map.set(o.status, (map.get(o.status) ?? 0) + 1));
    return map;
  }, [orders]);

  return (
    <div className="-m-4 md:-m-6 flex h-screen border-t overflow-hidden bg-background">
      {/* ── Left: order list ── */}
      <div className={`flex-1 flex flex-col min-w-0 ${detail ? "hidden sm:flex" : "flex"}`}>
        {/* Header */}
        <div className="shrink-0 border-b bg-background">
          <div className="px-4 sm:px-6 pt-4 pb-4 space-y-4">
            <div className="flex flex-col gap-1">
              <h1 className="text-xl sm:text-2xl font-bold">รายการขาย</h1>
              <p className="text-sm text-muted-foreground">ติดตามยอดขาย ค้นหารายการย้อนหลัง และดูรายละเอียดคำสั่งซื้อ</p>
            </div>

            <div className="rounded-2xl border bg-card p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border bg-background px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">จำนวนรายการ</p>
                      <p className="text-2xl font-bold mt-1">{summary.count}</p>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center" aria-hidden="true">
                      <ShoppingCart className="h-5 w-5 text-primary" aria-hidden="true" />
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border bg-background px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">ยอดขาย</p>
                      <p className="text-2xl font-bold mt-1 tabular-nums">฿{fmt(summary.revenue)}</p>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center" aria-hidden="true">
                      <DollarSign className="h-5 w-5 text-emerald-600" aria-hidden="true" />
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border bg-background px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">กำไร</p>
                      <p className={`text-2xl font-bold mt-1 tabular-nums ${summary.profit >= 0 ? "text-emerald-600" : "text-destructive"}`}>฿{fmt(summary.profit)}</p>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center" aria-hidden="true">
                      <TrendingUp className={`h-5 w-5 ${summary.profit >= 0 ? "text-amber-600" : "text-destructive"}`} aria-hidden="true" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4">
                <div className="flex flex-wrap gap-2 items-end">
                  <div className="space-y-1 w-[calc(50%-4px)] sm:w-auto">
                    <Label htmlFor="order-start-date" className="text-xs">วันที่เริ่ม</Label>
                    <Input id="order-start-date" name="order-start-date" type="date" autoComplete="off" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="sm:w-40 h-9" />
                  </div>
                  <div className="space-y-1 w-[calc(50%-4px)] sm:w-auto">
                    <Label htmlFor="order-end-date" className="text-xs">วันที่สิ้นสุด</Label>
                    <Input id="order-end-date" name="order-end-date" type="date" autoComplete="off" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="sm:w-40 h-9" />
                  </div>
                  <Button onClick={load} size="sm" className="h-9 px-4">ดูข้อมูล</Button>
                </div>

                <div className="relative min-w-0 lg:w-80 self-end h-9">
                  <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center" aria-hidden="true">
                    <Search className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <Input id="order-search" name="order-search" aria-label="ค้นหารายการ" placeholder="ค้นหาเลขที่, ลูกค้า…" className="h-9 pl-10 w-full" autoComplete="off" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
                <button onClick={() => setStatusFilter("ALL")} className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ${statusFilter === "ALL" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-accent"}`}>
                  ทั้งหมด ({orders.length})
                </button>
                {Array.from(statuses.entries()).map(([st, cnt]) => (
                  <button key={st} onClick={() => setStatusFilter(st)} className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ${statusFilter === st ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-accent"}`}>
                    {STATUS_MAP[st]?.label ?? st} ({cnt})
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Order list */}
        <div className="flex-1 overflow-y-auto bg-muted/20">
          {loading ? (
            <div className="flex justify-center py-12"><div className="animate-spin motion-reduce:animate-none rounded-full h-6 w-6 border-b-2 border-primary" /></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
              <Receipt className="h-10 w-10 opacity-25" aria-hidden="true" />
              <p className="text-sm">ไม่พบรายการ</p>
            </div>
          ) : (
            <div className="divide-y bg-background">
              {filtered.map((o) => {
                const isActive = detail?.id === o.id;
                return (
                  <button
                    key={o.id}
                    onClick={() => handleView(o.id)}
                    className={`w-full text-left px-4 sm:px-6 py-4 flex items-center justify-between gap-3 transition-colors touch-manipulation border-l-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset ${isActive ? "bg-primary/5 border-primary" : "border-transparent hover:bg-accent/60"}`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold">{o.code || o.id?.slice(-8)}</span>
                        <Badge variant={STATUS_MAP[o.status]?.variant ?? "secondary"} className="text-[10px] px-1.5 py-0">
                          {STATUS_MAP[o.status]?.label ?? o.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs text-muted-foreground">{fmtDate(o.createdDate)} {fmtTime(o.createdDate)}</span>
                        {o.customerCode && <span className="text-xs text-muted-foreground">• {o.customerCode}</span>}
                        {o.customerName && <span className="text-xs text-muted-foreground">• {o.customerName}</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-base font-semibold tabular-nums">฿{fmt(o.total ?? 0)}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{getPaymentSummary(o, (amount) => `฿${fmt(amount)}`)}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Right: detail panel ── */}
      {detail && (
        <>
          <Separator orientation="vertical" className="hidden sm:block opacity-50" />
          <div className="w-full sm:w-[420px] lg:w-[500px] shrink-0 flex flex-col border-l border-border/50 bg-card">
            {/* Detail header */}
            <div className="shrink-0 flex items-center justify-between px-4 py-4 border-b border-border/50 bg-background">
              <div className="flex items-center gap-2 min-w-0">
                <button onClick={() => setDetail(null)} aria-label="กลับ" className="sm:hidden text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded touch-manipulation">
                  <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                </button>
                <div className="min-w-0">
                  <p className="text-base font-semibold truncate">{detail.code || detail.id?.slice(-8)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{fmtDateTime(detail.createdDate)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={STATUS_MAP[detail.status]?.variant ?? "secondary"}>
                  {STATUS_MAP[detail.status]?.label ?? detail.status}
                </Badge>
                <Separator orientation="vertical" className="h-5 opacity-40" />
                {canDeleteOrder && (
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(detail.id)} aria-label="ลบรายการ">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button size="icon" variant="ghost" className="h-7 w-7 hidden sm:flex" onClick={() => setDetail(null)} aria-label="ปิดรายละเอียด">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {detailLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="animate-spin motion-reduce:animate-none rounded-full h-6 w-6 border-b-2 border-primary" />
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto bg-muted/10">
                {/* Customer info */}
                {(detail.customerCode || detail.customerName) && (
                  <div className="px-4 py-4 border-b border-border/50 bg-background">
                    <p className="text-xs text-muted-foreground">ลูกค้า</p>
                    <p className="text-sm font-medium mt-1">{detail.customerName || detail.customerCode}</p>
                    {detail.customerName && detail.customerCode && (
                      <p className="text-xs text-muted-foreground mt-0.5">{detail.customerCode}</p>
                    )}
                  </div>
                )}

                {/* Items */}
                <div className="px-4 py-4 bg-background">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">รายการสินค้า ({detail.items?.length ?? 0})</p>
                  {detail.items && detail.items.length > 0 ? (
                    <div className="space-y-2">
                      {detail.items.map((item, i) => (
                        <div key={item.id || i} className="flex items-start justify-between gap-3 rounded-xl border border-border/60 bg-card px-3 py-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium leading-tight">{item.product?.name ?? item.productId?.slice(-8)}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {item.quantity} x ฿{fmt(item.price)}
                              {item.discount > 0 && <span className="text-destructive ml-1">-฿{fmt(item.discount)}</span>}
                            </p>
                          </div>
                          <p className="text-sm font-semibold tabular-nums shrink-0">
                            ฿{fmt(item.quantity * item.price - (item.discount ?? 0))}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-4">ไม่มีข้อมูลสินค้า</p>
                  )}
                </div>

                <Separator className="opacity-50" />

                {/* Totals */}
                <div className="px-4 py-4 space-y-2 bg-background">
                  {(detail.discount ?? 0) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">ส่วนลด</span>
                      <span className="text-destructive tabular-nums">-฿{fmt(detail.discount ?? 0)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold">
                    <span>ยอดรวม</span>
                    <span className="tabular-nums">฿{fmt(detail.total ?? 0)}</span>
                  </div>
                </div>

                <Separator className="opacity-50" />

                {/* Payment */}
                <div className="px-4 py-4 bg-background">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">การชำระเงิน</p>
                  {detailPayments.length > 0 ? (
                    <div className="rounded-xl border border-border/60 bg-card p-3 space-y-2">
                      {detailPayments.map((payment, index) => (
                        <div key={payment.id ?? `${payment.type}-${index}`} className="flex justify-between text-sm">
                          <span className="flex items-center gap-1.5 text-foreground">
                            <Receipt className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                            {PAYMENT_LABEL[payment.type] ?? payment.type}
                            {detailPayments.length > 1 ? ` ${index + 1}` : ""}
                          </span>
                          <span className="tabular-nums font-medium">฿{fmt(payment.amount)}</span>
                        </div>
                      ))}
                      {(detailPayments[detailPayments.length - 1]?.change ?? 0) > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">เงินทอน</span>
                          <span className="tabular-nums text-emerald-600">฿{fmt(detailPayments[detailPayments.length - 1]?.change ?? 0)}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-2">ไม่มีข้อมูลการชำระ</p>
                  )}
                </div>

                {/* Pharmacy info */}
                {(detail.pharmacistName || detail.prescriberName || detail.buyerName) && (
                  <>
                    <Separator className="opacity-50" />
                    <div className="px-4 py-4 space-y-1.5 bg-background">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">ข้อมูลเพิ่มเติม</p>
                      {detail.pharmacistName && (
                        <div className="flex justify-between text-xs gap-4">
                          <span className="text-muted-foreground">เภสัชกร</span>
                          <span className="text-right">{detail.pharmacistName}</span>
                        </div>
                      )}
                      {detail.prescriberName && (
                        <div className="flex justify-between text-xs gap-4">
                          <span className="text-muted-foreground">แพทย์ผู้สั่ง</span>
                          <span className="text-right">{detail.prescriberName}</span>
                        </div>
                      )}
                      {detail.buyerName && (
                        <div className="flex justify-between text-xs gap-4">
                          <span className="text-muted-foreground">ผู้ซื้อ</span>
                          <span className="text-right">{detail.buyerName}{detail.buyerIdCard ? ` (${detail.buyerIdCard})` : ""}</span>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
