"use client";

import { memo, useEffect, useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Search, Plus, Minus, ShoppingCart, UserSearch, X, RefreshCw, ChevronRight, Info, Heart, Tag } from "lucide-react";
import { listCategories, createOrder, checkDrugInteractions, printPrescriptionLabel } from "@/lib/pos-api";
import { useProductCache } from "@/components/ProductCacheContext";
import { useSettings } from "@/components/SettingsContext";
import type { Category, Order, Customer, Patient, ProductDetail } from "@/types/pos";

import { CustomerPickerDialog } from "./_components/CustomerPickerDialog";
import { CartItemDialog } from "./_components/CartItemDialog";
import { PaymentDialog } from "./_components/PaymentDialog";
import { SuccessDialog } from "./_components/SuccessDialog";
import { DrugAlertDialog } from "./_components/DrugAlertDialog";
import { AllergyAlertDialog } from "./_components/AllergyAlertDialog";
import { ComplianceDialog } from "./_components/ComplianceDialog";
import { PromotionDialog } from "./_components/PromotionDialog";
import { DiscountDialog } from "./_components/DiscountDialog";
import { PatientPickerDialog } from "./_components/PatientPickerDialog";
import { useCart, resolvePrice } from "./_hooks/useCart";
import { useCompliance } from "./_hooks/useCompliance";
import { usePromotion } from "./_hooks/usePromotion";
import { usePayments } from "./_hooks/usePayments";
import { fmt } from "./_utils";
import { type CartItem, MAX_TABS } from "./_types";

type ProductGridItem = {
  id: string;
  name: string;
  serialNumber?: string;
  unit?: string;
  price: number;
  qty: number;
  qtyColor: string;
  disabled: boolean;
  product: ProductDetail;
};

type CartPanelProps = {
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
};

const ProductGrid = memo(function ProductGrid({
  items,
  loading,
  onAddToCart,
}: {
  items: ProductGridItem[];
  loading: boolean;
  onAddToCart: (product: ProductDetail) => void;
}) {
  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
        <ShoppingCart className="h-10 w-10 opacity-30" />
        <p className="text-sm">ไม่พบสินค้า</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3 pb-4 [content-visibility:auto]">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => !item.disabled && onAddToCart(item.product)}
          disabled={item.disabled}
          aria-disabled={item.disabled}
          className={`text-left rounded-lg border bg-card transition-colors p-2.5 sm:p-3 space-y-1 focus:outline-none focus:ring-2 focus:ring-primary ${item.disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-accent hover:border-primary"}`}
        >
          <p className="font-medium text-xs sm:text-sm leading-tight line-clamp-2">{item.name}</p>
          <p className="text-xs text-muted-foreground truncate">{item.serialNumber}</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-primary font-semibold text-xs sm:text-sm">฿{fmt(item.price)}</span>
            <Badge variant="secondary" className="text-[10px] sm:text-xs">{item.unit || "ชิ้น"}</Badge>
          </div>
          <p className={`text-xs font-medium ${item.qtyColor}`}>{item.disabled ? "สินค้าหมด" : `คงเหลือ: ${item.qty}`}</p>
        </button>
      ))}
    </div>
  );
});

const CartPanel = memo(function CartPanel({
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

export default function SalePage() {
  const { products, loading: loadingProducts, refresh } = useProductCache();
  const { isFeatureEnabled } = useSettings();
  const multiCartEnabled = isFeatureEnabled("multiCart");
  const drugInteractionEnabled = isFeatureEnabled("drugInteractionAlert");
  const allergyCheckEnabled = isFeatureEnabled("allergyCheck");
  const controlledDrugEnabled = isFeatureEnabled("controlledDrugCompliance");
  const patientLinkingEnabled = isFeatureEnabled("patientLinking");
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("__all__");

  const {
    tabs,
    activeTab,
    setActiveTab,
    cart,
    setCart,
    discount,
    setDiscount,
    customerCode,
    setCustomerCode,
    customerName,
    setCustomerName,
    addToCart,
    updateQty,
    removeFromCart,
    clearCart,
    addTab,
    removeTab,
  } = useCart(products);

  const compliance = useCompliance();
  const promo = usePromotion();
  const { payments, paymentsTotal, addPaymentRow, removePaymentRow, updatePaymentRow, resetPayments } = usePayments();

  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [detailItem, setDetailItem] = useState<CartItem | null>(null);
  const [discountOpen, setDiscountOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);

  // Drug interaction alert
  const [drugAlerts, setDrugAlerts] = useState<{ productAName: string; productBName: string; interaction: string }[]>([]);
  const [drugAlertOpen, setDrugAlertOpen] = useState(false);

  // Allergy check
  const [allergyAlerts, setAllergyAlerts] = useState<string[]>([]);
  const [allergyAlertOpen, setAllergyAlertOpen] = useState(false);

  // Patient linking
  const [patientPickerOpen, setPatientPickerOpen] = useState(false);
  const [linkedPatient, setLinkedPatient] = useState<Patient | null>(null);

  useEffect(() => {
    listCategories()
      .then((c) => setCategories(Array.isArray(c) ? c : []))
      .catch(() => { });
  }, []);

  // Warn before navigating away if cart has items
  useEffect(() => {
    const hasItems = tabs.some((t) => t.cart.length > 0);
    if (!hasItems) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [tabs]);



  const handleSelectCustomer = useCallback((c: Customer) => {
    setCustomerCode(c.code ?? "");
    setCustomerName(c.name);
  }, [setCustomerCode, setCustomerName]);

  const subtotal = useMemo(() => cart.reduce((s, i) => s + i.price * i.quantity, 0), [cart]);
  const total = useMemo(() => Math.max(0, subtotal - discount - promo.promoDiscount), [subtotal, discount, promo.promoDiscount]);

  const buildOrderItemStocks = useCallback((item: CartItem) => {
    let remaining = item.quantity;
    const prioritizedStocks = [...(item.stocks ?? [])].sort((a, b) => {
      if (item.selectedStockId) {
        if (a.stockId === item.selectedStockId) return -1;
        if (b.stockId === item.selectedStockId) return 1;
      }
      return 0;
    });

    return prioritizedStocks
      .map((stock) => {
        if (remaining <= 0) return null;
        const usedQty = Math.min(stock.quantity, remaining);
        if (usedQty <= 0) return null;
        remaining -= usedQty;
        return { stockId: stock.stockId, quantity: usedQty };
      })
      .filter((stock): stock is { stockId: string; quantity: number } => Boolean(stock));
  }, []);

  const resolveOrderItemCostPrice = useCallback((item: CartItem) => {
    const allocations = buildOrderItemStocks(item);
    const stockMap = new Map((item.productRef?.stocks ?? []).map((stock) => [stock.id, stock]));

    const totalAllocated = allocations.reduce((sum, stock) => sum + stock.quantity, 0);
    if (totalAllocated <= 0) return item.costPrice ?? 0;

    const totalCost = allocations.reduce((sum, allocation) => {
      const stock = stockMap.get(allocation.stockId);
      return sum + ((stock?.costPrice ?? item.costPrice ?? 0) * allocation.quantity);
    }, 0);

    return totalCost / totalAllocated;
  }, [buildOrderItemStocks]);

  async function openPay() {
    if (cart.length === 0) return toast.error("ยังไม่มีสินค้าในตะกร้า");

    // Drug interaction check
    if (drugInteractionEnabled && cart.length >= 2) {
      try {
        const result = await checkDrugInteractions(cart.map((i) => i.productId));
        if (result?.interactions?.length > 0) {
          setDrugAlerts(result.interactions);
          setDrugAlertOpen(true);
        }
      } catch { }
    }

    // Allergy check
    if (allergyCheckEnabled && linkedPatient) {
      const patientAllergies = (linkedPatient.allergies ?? []).map((a) => a.drugName.toLowerCase());
      if (patientAllergies.length > 0) {
        const matched = cart.filter((item) => {
          const name = item.name.toLowerCase();
          return patientAllergies.some((a) => name.includes(a) || a.includes(name));
        }).map((i) => i.name);
        if (matched.length > 0) {
          setAllergyAlerts(matched);
          setAllergyAlertOpen(true);
        }
      }
    }

    // Controlled drug compliance check
    if (controlledDrugEnabled) {
      const hasControlled = cart.some((item) => {
        const drugType = item.productRef?.drugInfo?.drugType;
        return drugType === "CONTROLLED" || drugType === "PSYCHO" || drugType === "NARCOTIC";
      });
      if (hasControlled) {
        compliance.setComplianceOpen(true);
        return;
      }
    }

    resetPayments(total);
    setPayOpen(true);
  }

  function handleComplianceConfirm() {
    if (!compliance.validateCompliance()) return;
    compliance.setComplianceOpen(false);
    resetPayments(total);
    setPayOpen(true);
  }

  async function handleConfirmPay() {
    if (paymentsTotal < total) return toast.error("ยอดชำระไม่ครบ");
    setSubmitting(true);
    try {
      const orderItems = cart.map((item) => {
        const stocks = buildOrderItemStocks(item);
        const costPrice = resolveOrderItemCostPrice(item);

        return {
          productId: item.productId,
          unitId: item.unitId,
          quantity: item.quantity,
          price: item.price,
          costPrice,
          stocks,
        };
      });

      const totalCost = orderItems.reduce((sum, item) => sum + (item.costPrice * item.quantity), 0);

      const orderPayload = {
        customerCode: customerCode.trim() || undefined,
        discount: discount || undefined,
        items: orderItems,
        payments: payments.filter((p) => p.amount > 0),
        type: payments[0]?.type ?? ("CASH" as const),
        amount: paymentsTotal,
        total,
        totalCost,
        patientId: linkedPatient?.id,
        pharmacistName: compliance.compliancePharmacist || undefined,
        prescriberName: compliance.complianceDoctor || undefined,
        buyerName: compliance.complianceBuyerName || undefined,
        buyerIdCard: compliance.complianceBuyerIdCard || undefined,
      };
      const order = await createOrder(orderPayload as Parameters<typeof createOrder>[0]);
      setLastOrder(order);
      setPayOpen(false);
      setSuccessOpen(true);
      clearCart();
      setLinkedPatient(null);
      compliance.resetCompliance();
      refresh();
      toast.success("บันทึกคำสั่งซื้อสำเร็จ");
    } catch (e: unknown) {
      toast.error(
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "บันทึกไม่สำเร็จ"
      );
    } finally {
      setSubmitting(false);
    }
  }

  const filteredProducts = useMemo(() => {
    const q = search.toLowerCase();
    return products.filter((p) => {
      const matchCat = selectedCategory === "__all__" || p.category === selectedCategory;
      const matchSearch =
        !search ||
        p.name.toLowerCase().includes(q) ||
        (p.nameEn ?? "").toLowerCase().includes(q) ||
        p.serialNumber?.toLowerCase().includes(q) ||
        (p.drugInfo?.genericName ?? "").toLowerCase().includes(q) ||
        p.units?.some((u) => u.barcode?.toLowerCase().includes(q));
      return matchCat && matchSearch;
    });
  }, [products, search, selectedCategory]);

  const productGridItems = useMemo<ProductGridItem[]>(() => {
    return filteredProducts.map((product) => {
      const qty = product.stocks?.reduce((sum, stock) => sum + stock.quantity, 0) ?? product.quantity;
      return {
        id: product.id,
        name: product.name,
        serialNumber: product.serialNumber,
        unit: product.unit,
        price: resolvePrice(product).price,
        qty,
        qtyColor: qty <= 0 ? "text-destructive" : qty <= 10 ? "text-yellow-600" : "text-muted-foreground",
        disabled: qty <= 0,
        product,
      };
    });
  }, [filteredProducts]);

  return (
    <div className="-m-4 md:-m-6 flex flex-col md:flex-row h-screen border-t overflow-hidden">
      {/* ─── Left: Product grid ─── */}
      <div className="flex-1 flex flex-col gap-2 sm:gap-3 min-w-0 p-3 sm:p-4 md:p-6 overflow-hidden pb-20 md:pb-6">
        <div className="flex items-center justify-between shrink-0">
          <h1 className="text-lg sm:text-2xl font-bold">ขายสินค้า</h1>
          <Button size="icon" variant="ghost" className="h-9 w-9" title="รีเฟรชสินค้า" aria-label="รีเฟรชสินค้า" onClick={() => refresh()} disabled={loadingProducts}>
            <RefreshCw className={`h-4 w-4 ${loadingProducts ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {/* Search + category filter */}
        <div className="flex gap-2 shrink-0">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ค้นหาสินค้า / บาร์โค้ด…"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-28 sm:w-44">
              <SelectValue placeholder="หมวดหมู่" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">ทั้งหมด</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Product cards */}
        <div className="flex-1 overflow-y-auto">
          <ProductGrid items={productGridItems} loading={loadingProducts} onAddToCart={addToCart} />
        </div>
      </div>

      {/* ─── Right: Cart (Desktop md+) ─── */}
      <div className="hidden md:flex w-80 lg:w-96 shrink-0 flex-col overflow-hidden border-l bg-background">
        <CartPanel
          multiCartEnabled={multiCartEnabled}
          tabs={tabs}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          removeTab={removeTab}
          addTab={addTab}
          cart={cart}
          setDetailItem={setDetailItem}
          updateQty={updateQty}
          customerCode={customerCode}
          customerName={customerName}
          setCustomerPickerOpen={setCustomerPickerOpen}
          setCustomerCode={setCustomerCode}
          setCustomerName={setCustomerName}
          patientLinkingEnabled={patientLinkingEnabled}
          linkedPatient={linkedPatient}
          setPatientPickerOpen={setPatientPickerOpen}
          setLinkedPatient={setLinkedPatient}
          promoDiscount={promo.promoDiscount}
          openPromo={() => promo.setPromoOpen(true)}
          clearPromo={promo.clearPromo}
          discount={discount}
          setDiscountOpen={setDiscountOpen}
          setDiscount={setDiscount}
          subtotal={subtotal}
          total={total}
          openPay={openPay}
        />
      </div>

      {/* ─── Mobile: Floating cart bar ─── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-background border-t shadow-lg safe-bottom">
        <button
          className="w-full flex items-center justify-between px-4 py-3 active:bg-accent transition-colors"
          onClick={() => setCartOpen(true)}
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <ShoppingCart className="h-5 w-5" />
              {cart.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                  {cart.length}
                </span>
              )}
            </div>
            <span className="text-sm font-medium">
              {cart.length > 0 ? `${cart.length} รายการ` : "ตะกร้าว่าง"}
            </span>
          </div>
          <span className="font-bold text-primary">฿{fmt(total)}</span>
        </button>
      </div>

      {/* ─── Mobile: Cart Sheet ─── */}
      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetContent side="right" className="w-full sm:w-96 p-0 flex flex-col">
          <CartPanel
            multiCartEnabled={multiCartEnabled}
            tabs={tabs}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            removeTab={removeTab}
            addTab={addTab}
            cart={cart}
            setDetailItem={setDetailItem}
            updateQty={updateQty}
            customerCode={customerCode}
            customerName={customerName}
            setCustomerPickerOpen={setCustomerPickerOpen}
            setCustomerCode={setCustomerCode}
            setCustomerName={setCustomerName}
            patientLinkingEnabled={patientLinkingEnabled}
            linkedPatient={linkedPatient}
            setPatientPickerOpen={setPatientPickerOpen}
            setLinkedPatient={setLinkedPatient}
            promoDiscount={promo.promoDiscount}
            openPromo={() => promo.setPromoOpen(true)}
            clearPromo={promo.clearPromo}
            discount={discount}
            setDiscountOpen={setDiscountOpen}
            setDiscount={setDiscount}
            subtotal={subtotal}
            total={total}
            openPay={openPay}
          />
        </SheetContent>
      </Sheet>

      {/* ─── Cart Item Detail Dialog ─── */}
      {detailItem && (
        <CartItemDialog
          item={detailItem}
          onClose={() => setDetailItem(null)}
          onConfirm={(updated) => {
            setCart((prev) => prev.map((i) => i.productId === detailItem.productId ? { ...i, ...updated } : i));
            setDetailItem(null);
          }}
          onRemove={() => {
            removeFromCart(detailItem.productId);
            setDetailItem(null);
          }}
        />
      )}

      {/* ─── Payment Dialog ─── */}
      <PaymentDialog
        open={payOpen}
        onOpenChange={setPayOpen}
        total={total}
        payments={payments}
        paymentsTotal={paymentsTotal}
        onAddRow={addPaymentRow}
        onRemoveRow={removePaymentRow}
        onUpdateRow={updatePaymentRow}
        onConfirm={handleConfirmPay}
        submitting={submitting}
      />

      {/* ─── Success Dialog ─── */}
      <SuccessDialog
        open={successOpen}
        onOpenChange={setSuccessOpen}
        order={lastOrder}
        prescriptionLabelEnabled={isFeatureEnabled("prescriptionLabel")}
        onPrintLabel={(orderId, size) => {
          printPrescriptionLabel(orderId, size).catch(() => toast.error("พิมพ์ฉลากยาไม่สำเร็จ"));
        }}
      />

      {/* ─── Customer Picker ─── */}
      <CustomerPickerDialog
        open={customerPickerOpen}
        onOpenChange={setCustomerPickerOpen}
        onSelect={handleSelectCustomer}
      />

      {/* ─── Drug Interaction Alert ─── */}
      <DrugAlertDialog
        open={drugAlertOpen}
        onOpenChange={setDrugAlertOpen}
        alerts={drugAlerts}
      />

      {/* ─── Allergy Alert ─── */}
      <AllergyAlertDialog
        open={allergyAlertOpen}
        onOpenChange={setAllergyAlertOpen}
        alerts={allergyAlerts}
      />

      {/* ─── Controlled Drug Compliance ─── */}
      <ComplianceDialog
        open={compliance.complianceOpen}
        onOpenChange={compliance.setComplianceOpen}
        pharmacist={compliance.compliancePharmacist}
        onPharmacistChange={compliance.setCompliancePharmacist}
        doctor={compliance.complianceDoctor}
        onDoctorChange={compliance.setComplianceDoctor}
        buyerName={compliance.complianceBuyerName}
        onBuyerNameChange={compliance.setComplianceBuyerName}
        buyerIdCard={compliance.complianceBuyerIdCard}
        onBuyerIdCardChange={compliance.setComplianceBuyerIdCard}
        onConfirm={handleComplianceConfirm}
      />

      {/* ─── Patient Picker ─── */}
      <PatientPickerDialog
        open={patientPickerOpen}
        onOpenChange={setPatientPickerOpen}
        onSelect={(p) => { setLinkedPatient(p); setPatientPickerOpen(false); }}
      />

      {/* ─── Promotion Dialog ─── */}
      <PromotionDialog
        open={promo.promoOpen}
        onOpenChange={promo.setPromoOpen}
        promoCode={promo.promoCode}
        onPromoCodeChange={promo.setPromoCode}
        promoName={promo.promoName}
        promoDiscount={promo.promoDiscount}
        promoLoading={promo.promoLoading}
        onApply={() => promo.applyPromo(subtotal, cart.map((i) => i.productId))}
        onClear={promo.clearPromo}
      />

      {/* ─── Discount Dialog ─── */}
      <DiscountDialog
        open={discountOpen}
        onOpenChange={setDiscountOpen}
        discount={discount}
        onDiscountChange={setDiscount}
        subtotal={subtotal}
      />
    </div>
  );
}
