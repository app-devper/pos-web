"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Search, Eye } from "lucide-react";
import { listOrders, deleteOrder, getOrder } from "@/lib/pos-api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useConfirm } from "@/components/ConfirmDialog";

export default function OrdersPage() {
  const [items, setItems] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [detail, setDetail] = useState<unknown>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const confirm = useConfirm();

  const load = () => {
    setLoading(true);
    listOrders(
      new Date(startDate).toISOString(),
      new Date(endDate + "T23:59:59").toISOString()
    )
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch(() => toast.error("โหลดข้อมูลไม่สำเร็จ"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  async function handleView(id: string) {
    try {
      const d = await getOrder(id);
      setDetail(d);
      setDetailOpen(true);
    } catch { toast.error("โหลดรายละเอียดไม่สำเร็จ"); }
  }

  async function handleDelete(id: string) {
    if (!(await confirm({ description: "ลบคำสั่งซื้อนี้?", destructive: true }))) return;
    try { await deleteOrder(id); toast.success("ลบแล้ว"); load(); }
    catch { toast.error("ลบไม่สำเร็จ"); }
  }

  const fmt = (n: number) => new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2 }).format(n);

  const rows = (items as Record<string, unknown>[]).filter((o) =>
    !search || JSON.stringify(o).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">รายการขาย</h1>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <Label className="text-xs">วันที่เริ่ม</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">วันที่สิ้นสุด</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-40" />
            </div>
            <Button onClick={load}>ค้นหา</Button>
            <div className="relative flex-1 min-w-40">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="กรอง…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>เลขที่</TableHead>
                  <TableHead>ลูกค้า</TableHead>
                  <TableHead className="text-right">ยอดรวม</TableHead>
                  <TableHead>วันที่</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">ไม่พบข้อมูล</TableCell></TableRow>}
                {rows.map((o) => (
                  <TableRow key={o.id as string}>
                    <TableCell className="font-mono text-xs">{(o.id as string)?.slice(-8)}</TableCell>
                    <TableCell>{(o.customerCode as string) ?? "-"}</TableCell>
                    <TableCell className="text-right tabular-nums">฿{fmt((o.totalAmount as number) ?? 0)}</TableCell>
                    <TableCell className="text-xs">{o.createdDate ? new Date(o.createdDate as string).toLocaleString("th-TH") : "-"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" aria-label="ดูรายละเอียด" onClick={() => handleView(o.id as string)}><Eye className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" className="text-destructive" aria-label="ลบ" onClick={() => handleDelete(o.id as string)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>รายละเอียดคำสั่งซื้อ</DialogTitle></DialogHeader>
          <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">{JSON.stringify(detail, null, 2)}</pre>
        </DialogContent>
      </Dialog>
    </div>
  );
}
