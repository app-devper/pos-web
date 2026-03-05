"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getDashboardSummary, getDailyChart, getMonthlyChart, getLowStock, getExpiringProducts, getRefillReminders, getABCAnalysis, getDeadStockProducts } from "@/lib/pos-api";
import type { DashboardSummary, DailyChartData, LowStockProduct, ExpiringProduct, RefillReminder, ABCProduct, DeadStockProduct } from "@/types/pos";
import { TrendingUp, ShoppingCart, DollarSign, BarChart2, AlertTriangle, Clock, Pill, Archive, BarChart3, Percent } from "lucide-react";
import { Badge } from "@/components/ui/badge";

function today() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();
  return { start, end };
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [chart, setChart] = useState<DailyChartData[]>([]);
  const [monthlyChart, setMonthlyChart] = useState<DailyChartData[]>([]);
  const [chartMode, setChartMode] = useState<"daily" | "monthly">("daily");
  const [lowStock, setLowStock] = useState<LowStockProduct[]>([]);
  const [expiring, setExpiring] = useState<ExpiringProduct[]>([]);
  const [refills, setRefills] = useState<RefillReminder[]>([]);
  const [abcProducts, setAbcProducts] = useState<ABCProduct[]>([]);
  const [deadStock, setDeadStock] = useState<DeadStockProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { start, end } = today();
    Promise.all([
      getDashboardSummary(start, end),
      getDailyChart(start, end),
      getMonthlyChart().catch(() => []),
      getLowStock(10),
      getExpiringProducts().catch(() => []),
      getRefillReminders().catch(() => []),
      getABCAnalysis().catch(() => []),
      getDeadStockProducts().catch(() => []),
    ])
      .then(([s, c, mc, l, exp, ref, abc, dead]) => {
        setSummary(s);
        setChart(c);
        setMonthlyChart(Array.isArray(mc) ? mc : []);
        setLowStock(l);
        setExpiring(Array.isArray(exp) ? exp : []);
        setRefills(Array.isArray(ref) ? ref : []);
        setAbcProducts(Array.isArray(abc) ? abc : []);
        setDeadStock(Array.isArray(dead) ? dead : []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const fmt = (n: number) =>
    new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2 }).format(n);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">ยอดขาย</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">฿{fmt(summary?.totalRevenue ?? 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">คำสั่งซื้อ</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{summary?.totalOrders ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">ต้นทุน</CardTitle>
            <BarChart2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">฿{fmt(summary?.totalCost ?? 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">กำไร</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">฿{fmt(summary?.totalProfit ?? 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">Gross Margin</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">
              {summary && summary.totalRevenue > 0
                ? `${(((summary.totalRevenue - (summary.totalCost ?? 0)) / summary.totalRevenue) * 100).toFixed(1)}%`
                : "—"}
            </p>
            {summary && summary.totalRevenue > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                ฿{fmt(summary.totalRevenue - (summary.totalCost ?? 0))} / ฿{fmt(summary.totalRevenue)}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {(chart.length > 0 || monthlyChart.length > 0) && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">{chartMode === "daily" ? "ยอดขายรายวัน" : "ยอดขายรายเดือน"}</CardTitle>
            <div className="flex gap-1">
              <Button size="sm" variant={chartMode === "daily" ? "default" : "outline"} onClick={() => setChartMode("daily")}>รายวัน</Button>
              <Button size="sm" variant={chartMode === "monthly" ? "default" : "outline"} onClick={() => setChartMode("monthly")}>รายเดือน</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium">{chartMode === "daily" ? "วันที่" : "เดือน"}</th>
                    <th className="text-right py-2 font-medium">ยอดขาย</th>
                    <th className="text-right py-2 font-medium">กำไร</th>
                    <th className="text-right py-2 font-medium">รายการ</th>
                  </tr>
                </thead>
                <tbody>
                  {(chartMode === "daily" ? chart : monthlyChart).map((d, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-2">{chartMode === "daily" ? new Date(d.date).toLocaleDateString("th-TH") : d.date}</td>
                      <td className="py-2 text-right tabular-nums">฿{fmt(d.totalRevenue)}</td>
                      <td className="py-2 text-right tabular-nums text-green-600">฿{fmt(d.totalProfit ?? 0)}</td>
                      <td className="py-2 text-right tabular-nums">{d.totalOrders}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {lowStock.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <CardTitle className="text-base">สินค้าใกล้หมด</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {lowStock.map((p) => (
                  <div key={p.productId} className="flex items-center justify-between">
                    <span className="text-sm">{p.name}</span>
                    <Badge variant="destructive">{p.totalStock} {p.unit}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {expiring.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              <CardTitle className="text-base">สินค้าใกล้หมดอายุ</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {expiring.slice(0, 10).map((p, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div>
                      <span className="text-sm">{p.productName}</span>
                      <span className="text-xs text-muted-foreground ml-2">Lot: {p.lotNumber}</span>
                    </div>
                    <Badge variant="outline" className="text-orange-600 border-orange-300">
                      {new Date(p.expireDate).toLocaleDateString("th-TH")}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {refills.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <Pill className="h-5 w-5 text-blue-500" />
              <CardTitle className="text-base">รายการครบกำหนดรับยาซ้ำ</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {refills.slice(0, 10).map((r, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-sm font-mono">{r.patientId.slice(-8)}</span>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">ครบกำหนด: {new Date(r.estimatedRefill).toLocaleDateString("th-TH")}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {abcProducts.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <BarChart3 className="h-5 w-5 text-indigo-500" />
              <CardTitle className="text-base">ABC Analysis (3 เดือน)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {abcProducts.slice(0, 15).map((p, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant={p.class === "A" ? "default" : p.class === "B" ? "secondary" : "outline"} className="w-6 justify-center text-xs">{p.class}</Badge>
                      <span className="text-sm truncate max-w-[180px]">{p.productName}</span>
                    </div>
                    <span className="text-sm font-medium">฿{fmt(p.totalRevenue)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {deadStock.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <Archive className="h-5 w-5 text-gray-500" />
              <CardTitle className="text-base">Dead Stock (ไม่ขาย 90 วัน)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {deadStock.slice(0, 10).map((p, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div>
                      <span className="text-sm">{p.productName}</span>
                      <span className="text-xs text-muted-foreground ml-2">คงเหลือ: {p.quantity}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{p.lastSold ? new Date(p.lastSold).toLocaleDateString("th-TH") : "ไม่เคยขาย"}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
