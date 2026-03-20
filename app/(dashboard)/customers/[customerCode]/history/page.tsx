"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Receipt, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getOrdersByCustomer, listCustomers } from "@/lib/pos-api";
import type { Customer, Order } from "@/types/pos";

const PAYMENT_LABEL: Record<string, string> = {
  CASH: "เงินสด",
  CREDIT: "บัตรเครดิต",
  PROMPTPAY: "พร้อมเพย์",
  TRANSFER: "โอนเงิน",
};

const STATUS_LABEL: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  ACTIVE: { label: "สำเร็จ", variant: "default" },
  COMPLETED: { label: "สำเร็จ", variant: "default" },
  VOIDED: { label: "ยกเลิก", variant: "destructive" },
  CANCELLED: { label: "ยกเลิก", variant: "destructive" },
};

export default function CustomerHistoryPage() {
  const params = useParams<{ customerCode: string }>();
  const customerCode = decodeURIComponent(params.customerCode ?? "");

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const currency = useMemo(
    () => new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2 }),
    []
  );

  const summary = useMemo(() => {
    const activeOrders = orders.filter((order) => order.status !== "VOIDED" && order.status !== "CANCELLED");
    return {
      count: activeOrders.length,
      total: activeOrders.reduce((sum, order) => sum + (order.total ?? 0), 0),
    };
  }, [orders]);

  const fmtDateTime = (value?: string) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString("th-TH", {
      day: "2-digit",
      month: "short",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  useEffect(() => {
    if (!customerCode) return;
    setLoading(true);
    Promise.all([listCustomers(), getOrdersByCustomer(customerCode)])
      .then(([customers, customerOrders]) => {
        const customerList = Array.isArray(customers) ? customers : [];
        const orderList = Array.isArray(customerOrders) ? customerOrders : [];
        setCustomer(customerList.find((item) => item.code === customerCode) ?? null);
        setOrders(orderList);
      })
      .catch(() => toast.error("โหลดประวัติการซื้อไม่สำเร็จ — ลองใหม่อีกครั้ง"))
      .finally(() => setLoading(false));
  }, [customerCode]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/customers">
                <ArrowLeft className="h-4 w-4" />กลับ
              </Link>
            </Button>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold">ประวัติการซื้อ</h1>
          <p className="text-sm text-muted-foreground">
            {customer ? `${customer.name} (${customer.code ?? "-"})` : customerCode || "ลูกค้า"}
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm text-muted-foreground">จำนวนรายการซื้อ</p>
              <p className="mt-1 text-2xl font-bold">{summary.count}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10" aria-hidden="true">
              <ShoppingBag className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm text-muted-foreground">ยอดซื้อรวม</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">฿{currency.format(summary.total)}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10" aria-hidden="true">
              <Receipt className="h-5 w-5 text-emerald-600" aria-hidden="true" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-base font-semibold">รายการย้อนหลัง</p>
              <p className="text-sm text-muted-foreground">แสดงประวัติการสั่งซื้อทั้งหมดของลูกค้ารายนี้</p>
            </div>
            {!loading && <Badge variant="secondary">{orders.length} รายการ</Badge>}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary" />
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
              <Receipt className="h-10 w-10 opacity-30" aria-hidden="true" />
              <p className="text-sm">ยังไม่มีประวัติการซื้อ</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>เลขที่</TableHead>
                    <TableHead>วันที่</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead>ช่องทางชำระ</TableHead>
                    <TableHead className="text-right">ยอดรวม</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.code || order.id.slice(-8)}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{fmtDateTime(order.createdDate)}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_LABEL[order.status]?.variant ?? "secondary"}>
                          {STATUS_LABEL[order.status]?.label ?? order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{PAYMENT_LABEL[order.type] ?? order.type}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums">฿{currency.format(order.total ?? 0)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
