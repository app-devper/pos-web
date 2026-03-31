"use client";

import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Minus, ShoppingCart, UserSearch, X, ChevronRight, Info, Heart, Tag } from "lucide-react";
import { fmt } from "../_utils";
import type { CartItem } from "../_types";
import type { Patient } from "@/types/pos";

interface CartPanelProps {
  multiCartEnabled: boolean;
  tabs: { cart: CartItem[] }[];
  activeTab: number;
  setActiveTab: (idx: number) => void;
  removeTab: (idx: number) => void;
  addTab: () => void;
  cart: CartItem[];
  setDetailItem: (item: CartItem) => void;
  updateQty: (productId: string, delta: number) => void;
  customerCode: string;
  customerName: string;
  setCustomerPickerOpen: (open: boolean) => void;
  setCustomerCode: (value: string) => void;
  setCustomerName: (value: string) => void;
  patientLinkingEnabled: boolean;
  linkedPatient: Patient | null;
  setPatientPickerOpen: (open: boolean) => void;
  setLinkedPatient: (patient: Patient | null) => void;
  promoDiscount: number;
  openPromo: () => void;
  clearPromo: () => void;
  discount: number;
  setDiscountOpen: (open: boolean) => void;
  setDiscount: (value: number) => void;
  subtotal: number;
  total: number;
  openPay: () => void;
}

const MAX_TABS = 5;

export const CartPanel = memo(function CartPanel({
  multiCartEnabled,
  tabs,
  activeTab,
  setActiveTab,
  removeTab,
  addTab,
  cart,
  setDetailItem,
  updateQty,
  customerCode,
  customerName,
  setCustomerPickerOpen,
  setCustomerCode,
  setCustomerName,
  patientLinkingEnabled,
  linkedPatient,
  setPatientPickerOpen,
  setLinkedPatient,
  promoDiscount,
  openPromo,
  clearPromo,
  discount,
  setDiscountOpen,
  setDiscount,
  subtotal,
  total,
  openPay,
}: CartPanelProps) {
  return (
    <>
      <div className="shrink-0 border-b">
        {multiCartEnabled ? (
          <div className="flex items-center gap-0 overflow-x-auto px-1 pt-1">
            {tabs.map((t, i) => (
              <button
                key={i}
                onClick={() => setActiveTab(i)}
                className={`relative px-3 py-2 text-xs font-medium rounded-t-md transition-colors whitespace-nowrap ${activeTab === i ? "bg-background border border-b-0 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}
              >
                {t.cart.length > 0 ? `#${i + 1} (${t.cart.length})` : `#${i + 1}`}
                {tabs.length > 1 && (
                  <button
                    type="button"
                    aria-label={`ลบตะกร้า #${i + 1}`}
                    className="ml-1.5 text-muted-foreground hover:text-destructive"
                    onClick={(e) => { e.stopPropagation(); removeTab(i); }}
                  >
                    ×
                  </button>
                )}
              </button>
            ))}
            {tabs.length < MAX_TABS && (
              <button onClick={addTab} className="px-2 py-2 text-xs text-muted-foreground hover:text-primary" title="เพิ่มตะกร้า" aria-label="เพิ่มตะกร้า">
                <Plus className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ) : (
          <div className="px-4 py-3">
            <h2 className="text-base font-bold text-center">ตะกร้าสินค้า</h2>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground gap-2">
            <ShoppingCart className="h-8 w-8 opacity-30" />
            <p className="text-xs">เลือกสินค้าเพื่อเพิ่ม</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th className="text-left font-medium px-3 py-2">รายการ</th>
                <th className="text-center font-medium px-1 py-2">จำนวน</th>
                <th className="text-right font-medium px-3 py-2">ราคา</th>
              </tr>
            </thead>
            <tbody>
              {cart.map((item) => (
                <tr key={item.productId} className="border-b last:border-0 cursor-pointer hover:bg-accent/50" onClick={() => setDetailItem(item)}>
                  <td className="px-3 py-2.5 align-top">
                    <div className="flex items-start gap-1.5">
                      <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                      <div>
                        <p className="font-medium leading-tight line-clamp-2 text-xs">{item.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.unit || "ชิ้น"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-1 py-2.5 align-middle">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        aria-label="ลดจำนวน"
                        onClick={(e) => { e.stopPropagation(); updateQty(item.productId, -1); }}
                        className="h-6 w-6 rounded-full bg-destructive/15 text-destructive flex items-center justify-center hover:bg-destructive/25 transition-colors"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="text-sm font-medium w-5 text-center">{item.quantity}x</span>
                      <button
                        aria-label="เพิ่มจำนวน"
                        onClick={(e) => { e.stopPropagation(); updateQty(item.productId, 1); }}
                        className="h-6 w-6 rounded-full bg-primary/15 text-primary flex items-center justify-center hover:bg-primary/25 transition-colors"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right align-top">
                    <p className="font-semibold text-sm">฿{fmt(item.price * item.quantity)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.priceLabel ?? "ราคาหน้าร้าน"}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="shrink-0 border-t">
        <div className="flex items-center gap-2 px-3 py-2">
          <button
            className="flex-1 flex items-center gap-3 px-1 py-1 hover:bg-accent rounded-md transition-colors text-left"
            onClick={() => setCustomerPickerOpen(true)}
          >
            <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0">
              <UserSearch className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1 text-left">
              {customerName ? (
                <>
                  <p className="text-sm font-medium">{customerName}</p>
                  {customerCode && <p className="text-xs text-muted-foreground">{customerCode}</p>}
                </>
              ) : (
                <>
                  <p className="text-sm font-medium">เลือกข้อมูลลูกค้า</p>
                  <p className="text-xs text-muted-foreground">จากฐานข้อมูลลูกค้า</p>
                </>
              )}
            </div>
            {!customerCode && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </button>
          <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0">
            {customerCode ? (
              <button
                aria-label="ล้างลูกค้า"
                className="p-1 text-muted-foreground hover:text-foreground cursor-pointer"
                onClick={() => { setCustomerCode(""); setCustomerName(""); }}
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {patientLinkingEnabled && (
        <div className="shrink-0 border-t">
          <div className="flex items-center gap-2 px-3 py-2">
            <button
              className="flex-1 flex items-center gap-3 px-1 py-1 hover:bg-accent rounded-md transition-colors text-left"
              onClick={() => setPatientPickerOpen(true)}
            >
              <Heart className="h-4 w-4 text-pink-500 shrink-0" />
              <div className="flex-1 text-left">
                {linkedPatient ? (
                  <p className="text-xs font-medium">{[linkedPatient.firstName, linkedPatient.lastName].filter(Boolean).join(" ") || linkedPatient.customerCode}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">เลือกผู้ป่วย</p>
                )}
              </div>
              {!linkedPatient && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
            </button>
            <div className="h-8 w-8 flex items-center justify-center shrink-0">
              {linkedPatient ? (
                <button aria-label="ล้างผู้ป่วย" className="p-1 text-muted-foreground hover:text-foreground" onClick={() => setLinkedPatient(null)}>
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )}

      <div className="shrink-0 border-t bg-background">
        <div className="flex items-center justify-between px-4 py-2.5 border-b">
          <span className="text-sm text-muted-foreground">ราคาเฉพาะสินค้า</span>
          <span className="text-sm font-medium">฿{fmt(subtotal)}</span>
        </div>
        <div className="flex items-center justify-between px-4 py-2.5 border-b">
          <button
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            onClick={openPromo}
          >
            <Tag className="h-3.5 w-3.5" aria-hidden="true" />
            <span>โปรโมชัน</span>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          {promoDiscount > 0 ? (
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium text-destructive">-฿{fmt(promoDiscount)}</span>
              <button aria-label="ลบโปรโมชัน" className="text-muted-foreground hover:text-foreground" onClick={clearPromo}>
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">-</span>
          )}
        </div>
        <div className="flex items-center justify-between px-4 py-2.5 border-b">
          <button
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setDiscountOpen(true)}
          >
            <span>ส่วนลด (฿)</span>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          {discount > 0 ? (
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium text-destructive">-฿{fmt(discount)}</span>
              <button aria-label="ล้างส่วนลด" className="text-muted-foreground hover:text-foreground" onClick={() => setDiscount(0)}>
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">-</span>
          )}
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <span className="font-bold text-base">ยอดรวมสุทธิ</span>
          <span className="font-bold text-base text-primary">฿{fmt(total)}</span>
        </div>
        <div className="px-4 pb-4">
          <Button
            className="w-full h-14 flex flex-col gap-0.5 text-base"
            onClick={openPay}
            disabled={cart.length === 0}
          >
            <span>ชำระสินค้า ({cart.length} รายการ)</span>
            <span className="text-sm font-bold">฿{fmt(total)}</span>
          </Button>
        </div>
      </div>
    </>
  );
});
