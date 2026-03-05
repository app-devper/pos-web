"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, ArrowUpDown, ChevronUp, ChevronDown, History, ListOrdered } from "lucide-react";
import { useProductDetail } from "./ProductDetailContext";
import UnitDialog from "./UnitDialog";
import StockDialog from "./StockDialog";
import AdjustDialog from "./AdjustDialog";
import PriceDialog from "./PriceDialog";
import StockSequenceDialog from "./StockSequenceDialog";

interface Props {
  onEdit: () => void;
}

const fmt = (n: number) => new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2 }).format(n);

function InfoRow({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div>
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-sm">{label}</span>
        <span className={`text-sm font-medium ${valueClass ?? ""}`}>{value}</span>
      </div>
      <Separator />
    </div>
  );
}

export default function ProductDetailPanel({ onEdit }: Props) {
  const { state, actions } = useProductDetail();
  const {
    product, units, stocks, prices, branches, histories, loading,
    unitOpen, editingUnit,
    stockOpen, editingStock,
    adjustOpen, adjustTarget,
    priceOpen, editingPrice, newPriceUnitId,
    sequenceOpen,
  } = state;

  const getBranchName = (id: string) => branches.find((b) => b.id === id)?.name ?? id;
  const getUnitName = (id: string) => units.find((u) => u.id === id)?.unit ?? "-";
  const totalStock = stocks.reduce((s, st) => s + st.quantity, 0);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
        <div>
          <h2 className="text-lg font-semibold">{product.name}</h2>
          {product.nameEn && <p className="text-sm text-muted-foreground">{product.nameEn}</p>}
        </div>
        <Button size="sm" variant="outline" onClick={onEdit}>
          <Pencil className="h-4 w-4 mr-1" />แก้ไข
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
        </div>
      ) : (
        <Tabs defaultValue="info" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="shrink-0 w-full justify-start rounded-none border-b bg-transparent h-10 px-4 gap-1">
            <TabsTrigger value="info" className="text-xs rounded-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none">ข้อมูลทั่วไป</TabsTrigger>
            <TabsTrigger value="units" className="text-xs rounded-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none">หน่วยนับ</TabsTrigger>
            <TabsTrigger value="prices" className="text-xs rounded-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none">ราคา</TabsTrigger>
            <TabsTrigger value="stocks" className="text-xs rounded-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none">สต็อก</TabsTrigger>
            <TabsTrigger value="history" className="text-xs rounded-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none">ประวัติ</TabsTrigger>
          </TabsList>

          {/* ── Tab: ข้อมูลทั่วไป ── */}
          <TabsContent value="info" className="overflow-y-auto m-0 p-4 flex-1 min-h-0">
            <Card>
              <CardContent className="p-0">
                <InfoRow label="ประเภทสินค้า" value={product.category ?? "-"} />
                <InfoRow label="ชื่อสินค้า" value={product.name} />
                <InfoRow label="ชื่อภาษาอังกฤษ" value={product.nameEn ?? "-"} />
                <InfoRow
                  label="สถานะ"
                  value={product.status ?? "-"}
                  valueClass={product.status === "ACTIVE" ? "text-green-600" : "text-destructive"}
                />
                {product.description && <InfoRow label="รายละเอียด" value={product.description} />}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Tab: หน่วยนับ ── */}
          <TabsContent value="units" className="overflow-y-auto m-0 flex-1 min-h-0">
            <div className="flex justify-end px-4 pt-3 pb-2">
              <Button size="sm" onClick={() => actions.openUnitDialog()}>
                <Plus className="h-4 w-4 mr-1" />เพิ่มหน่วย
              </Button>
            </div>
            {units.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">ยังไม่มีหน่วยนับ</p>}
            {units.length > 0 && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-xs text-muted-foreground">
                    <th className="text-left px-4 py-2 font-medium">หน่วย</th>
                    <th className="text-center px-4 py-2 font-medium">ขนาด</th>
                    <th className="text-right px-4 py-2 font-medium">ต้นทุน</th>
                    <th className="text-left px-4 py-2 font-medium">บาร์โค้ด</th>
                    <th className="text-left px-4 py-2 font-medium">ปริมาณ</th>
                    <th className="px-2 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {units.map((u) => (
                    <tr key={u.id} className="border-b hover:bg-muted/20">
                      <td className="px-4 py-2.5 font-semibold">{u.unit}</td>
                      <td className="px-4 py-2.5 text-center">{u.size}</td>
                      <td className="px-4 py-2.5 text-right">฿{fmt(u.costPrice)}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{u.barcode || "-"}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{u.volume && u.volume > 0 ? `${u.volume}${u.volumeUnit}` : "-"}</td>
                      <td className="px-2 py-2">
                        <div className="flex gap-1 justify-end">
                          <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="แก้ไขหน่วย" onClick={() => actions.openUnitDialog(u)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" aria-label="ลบหน่วย" onClick={() => actions.deleteUnit(u.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </TabsContent>

          {/* ── Tab: ราคา ── */}
          <TabsContent value="prices" className="overflow-y-auto m-0 flex-1 min-h-0">
            {prices.length === 0 && units.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">ยังไม่มีราคา</p>}
            {units.map((u) => {
              const unitPrices = prices.filter((pr) => pr.unitId === u.id);
              return (
                <div key={u.id}>
                  <div className="flex items-center justify-between px-4 py-2 bg-muted/40">
                    <div>
                      <span className="text-sm font-semibold text-foreground">{u.unit}</span>
                      <span className="text-xs text-muted-foreground ml-2">ต้นทุน ฿{fmt(u.costPrice)}</span>
                    </div>
                    <Button size="sm" onClick={() => actions.openPriceDialog(undefined, u.id)}>
                      <Plus className="h-4 w-4 mr-1" />เพิ่มราคา
                    </Button>
                  </div>
                  {unitPrices.length === 0 ? (
                    <p className="text-xs text-muted-foreground px-4 py-2">ยังไม่มีราคา</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-xs text-muted-foreground">
                          <th className="text-left px-4 py-1.5 font-medium">ประเภทลูกค้า</th>
                          <th className="text-right px-4 py-1.5 font-medium">ราคาขาย</th>
                          <th className="px-2 py-1.5"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {unitPrices.map((pr) => (
                          <tr key={pr.id} className="border-b hover:bg-muted/20">
                            <td className="px-4 py-2.5">{{ General: "ลูกค้าทั่วไป", Regular: "ลูกค้า", Wholesaler: "ขายส่ง" }[pr.customerType] ?? pr.customerType}</td>
                            <td className="px-4 py-2.5 text-right font-semibold text-primary">฿{fmt(pr.price)}</td>
                            <td className="px-2 py-2">
                              <div className="flex gap-1 justify-end">
                                <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="แก้ไขราคา" onClick={() => actions.openPriceDialog(pr)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" aria-label="ลบราคา" onClick={() => actions.deletePrice(pr.id)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </td>
						  </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              );
            })}
            {/* ราคาที่ไม่มี unitId */}
            {prices.filter((pr) => !pr.unitId || !units.find((u) => u.id === pr.unitId)).length > 0 && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="text-left px-4 py-1.5 font-medium">ประเภทลูกค้า</th>
                    <th className="text-right px-4 py-1.5 font-medium">ราคาขาย</th>
                    <th className="px-2 py-1.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {prices.filter((pr) => !pr.unitId || !units.find((u) => u.id === pr.unitId)).map((pr) => (
                    <tr key={pr.id} className="border-b hover:bg-muted/20">
                      <td className="px-4 py-2.5">{{ General: "ลูกค้าทั่วไป", Regular: "ลูกค้า", Wholesaler: "ขายส่ง" }[pr.customerType] ?? pr.customerType}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-primary">฿{fmt(pr.price)}</td>
                      <td className="px-2 py-2">
                        <div className="flex gap-1 justify-end">
                          <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="แก้ไขราคา" onClick={() => actions.openPriceDialog(pr)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" aria-label="ลบราคา" onClick={() => actions.deletePrice(pr.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </TabsContent>

          {/* ── Tab: สต็อก ── */}
          <TabsContent value="stocks" className="overflow-y-auto m-0 flex-1 min-h-0">
            <div className="flex items-center justify-between px-4 pt-3 pb-2">
              <p className="text-sm font-semibold">คงเหลือรวม: <span className={totalStock <= 0 ? "text-destructive" : totalStock <= 10 ? "text-yellow-600" : "text-primary"}>{totalStock} {product.unit}</span></p>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => actions.openSequenceDialog()} disabled={stocks.length < 2}>
                  <ListOrdered className="h-4 w-4 mr-1" />เรียงลำดับ
                </Button>
                <Button size="sm" onClick={() => actions.openStockDialog()}>
                  <Plus className="h-4 w-4 mr-1" />เพิ่มสต็อก
                </Button>
              </div>
            </div>
            {stocks.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">ยังไม่มีสต็อก</p>}
            {stocks.length > 0 && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-xs text-muted-foreground">
                    <th className="px-2 py-2 w-8"></th>
                    <th className="text-left px-4 py-2 font-medium">วันที่นำเข้า</th>
                    <th className="text-left px-4 py-2 font-medium">หน่วย</th>
                    <th className="text-right px-4 py-2 font-medium">ต้นทุน</th>
                    <th className="text-right px-4 py-2 font-medium">คงเหลือ</th>
                    <th className="px-2 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {stocks.map((s, idx) => (
                    <tr key={s.id} className="border-b hover:bg-muted/20">
                      <td className="px-2 py-2">
                        <div className="flex flex-col items-center">
                          <Button size="icon" variant="ghost" className="h-5 w-5" disabled={idx === 0} aria-label="เลื่อนขึ้น" onClick={() => actions.moveStock(idx, "up")}>
                            <ChevronUp className="h-3 w-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-5 w-5" disabled={idx === stocks.length - 1} aria-label="เลื่อนลง" onClick={() => actions.moveStock(idx, "down")}>
                            <ChevronDown className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 font-medium">
                        {s.importDate ? new Date(s.importDate).toLocaleDateString("th-TH", { day: "2-digit", month: "2-digit", year: "numeric" }) : "-"}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">{getUnitName(s.unitId)}</td>
                      <td className="px-4 py-2.5 text-right">฿{fmt(s.costPrice || product.costPrice)}</td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          className={`font-semibold underline underline-offset-2 ${s.quantity <= 0 ? "text-destructive" : s.quantity <= 10 ? "text-yellow-600" : "text-primary"}`}
                          onClick={() => actions.openAdjustDialog(s)}
                        >
                          {s.quantity}
                        </button>
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex gap-1 justify-end">
                          <Button size="icon" variant="ghost" className="h-7 w-7" title="ปรับจำนวน" aria-label="ปรับจำนวน" onClick={() => actions.openAdjustDialog(s)}>
                            <ArrowUpDown className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="แก้ไขสต็อก" onClick={() => actions.openStockDialog(s)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" aria-label="ลบสต็อก" onClick={() => actions.deleteStock(s.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </TabsContent>

          {/* ── Tab: ประวัติ ── */}
          <TabsContent value="history" className="overflow-y-auto m-0 flex-1 min-h-0">
            {histories.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
                <History className="h-8 w-8 opacity-30" />
                <p className="text-sm">ยังไม่มีประวัติ</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-xs text-muted-foreground">
                    <th className="text-left px-4 py-2 font-medium">วันที่</th>
                    <th className="text-left px-4 py-2 font-medium">ประเภท</th>
                    <th className="text-left px-4 py-2 font-medium">รายละเอียด</th>
                    <th className="text-right px-4 py-2 font-medium">จำนวน</th>
                    <th className="text-right px-4 py-2 font-medium">คงเหลือ</th>
                  </tr>
                </thead>
                <tbody>
                  {histories.map((h) => {
                    const typeColor =
                      h.type.includes("ADD") ? "bg-green-100 text-green-700" :
                      h.type.includes("REMOVE") ? "bg-red-100 text-red-700" :
                      h.type.includes("UPDATE") ? "bg-yellow-100 text-yellow-700" :
                      "bg-muted text-muted-foreground";
                    const qtyColor = h.quantity > 0 ? "text-green-600" : h.quantity < 0 ? "text-destructive" : "";
                    const date = new Date(h.createdDate);
                    const dateStr = date.toLocaleDateString("th-TH", { day: "2-digit", month: "2-digit", year: "numeric" });
                    const timeStr = date.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
                    return (
                      <tr key={h.id} className="border-b hover:bg-muted/20">
                        <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{dateStr}<br />{timeStr}</td>
                        <td className="px-4 py-2.5">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeColor}`}>{h.type}</span>
                        </td>
                        <td className="px-4 py-2.5 text-xs">{h.description}</td>
                        <td className={`px-4 py-2.5 text-right font-semibold ${qtyColor}`}>
                          {h.quantity > 0 ? `+${h.quantity}` : h.quantity || "-"}
                        </td>
                        <td className="px-4 py-2.5 text-right text-muted-foreground">{h.balance ?? "-"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Dialogs */}
      <UnitDialog
        open={unitOpen}
        onOpenChange={actions.closeUnitDialog}
        productId={product.id}
        editing={editingUnit}
        onSaved={() => { actions.closeUnitDialog(); actions.reload(); }}
      />
      <StockDialog
        open={stockOpen}
        onOpenChange={actions.closeStockDialog}
        productId={product.id}
        editing={editingStock}
        units={units}
        branches={branches}
        onSaved={() => { actions.closeStockDialog(); actions.reload(); }}
      />
      <AdjustDialog
        open={adjustOpen}
        onOpenChange={actions.closeAdjustDialog}
        stock={adjustTarget}
        branchName={adjustTarget ? getBranchName(adjustTarget.branchId) : ""}
        onSaved={() => { actions.closeAdjustDialog(); actions.reload(); }}
      />
      <PriceDialog
        open={priceOpen}
        onOpenChange={actions.closePriceDialog}
        productId={product.id}
        unitId={newPriceUnitId ?? undefined}
        unitName={newPriceUnitId ? (units.find((u) => u.id === newPriceUnitId)?.unit) : undefined}
        editing={editingPrice}
        onSaved={() => { actions.closePriceDialog(); actions.reload(); }}
      />
      <StockSequenceDialog
        open={sequenceOpen}
        onOpenChange={actions.closeSequenceDialog}
        stocks={stocks}
        units={units}
        branches={branches}
        onSaved={() => { actions.closeSequenceDialog(); actions.reload(); }}
      />
    </div>
  );
}
