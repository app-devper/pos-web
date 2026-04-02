"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Search, ShoppingCart, RefreshCw } from "lucide-react";
import { listCategories, createOrder, checkDrugInteractions, printPrescriptionLabel } from "@/lib/pos-api";
import { useProductCache } from "@/components/ProductCacheContext";
import { useSettings } from "@/components/SettingsContext";
import type { Category, Order, OrderPayment, Customer, Patient, ProductDetail } from "@/types/pos";

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
import { ProductGrid } from "./_components/ProductGrid";
import { CartPanel } from "./_components/CartPanel";
import { useCart, resolvePrice } from "./_hooks/useCart";
import { useCompliance } from "./_hooks/useCompliance";
import { usePromotion } from "./_hooks/usePromotion";
import { usePayments } from "./_hooks/usePayments";
import { fmt, buildOrderItemStocks, resolveOrderItemCostPrice } from "./_utils";
import type { CartItem } from "./_types";

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
  const [lastOrderPayments, setLastOrderPayments] = useState<OrderPayment[]>([]);
  const [lastOrderChange, setLastOrderChange] = useState(0);

  const handleSuccessOpenChange = useCallback((open: boolean) => {
    setSuccessOpen(open);
    if (!open) {
      setLastOrder(null);
      setLastOrderPayments([]);
      setLastOrderChange(0);
    }
  }, []);

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

    // Controlled drug compliance check — trigger from drugRegistrations[]
    if (controlledDrugEnabled) {
      const KHY_SALE_KEYS = ["KHY10", "KHY11", "KHY12", "KHY13"];
      const hasControlled = cart.some((item) => {
        const regs = item.productRef?.drugRegistrations ?? [];
        return regs.some((r) => KHY_SALE_KEYS.includes(r));
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
        licenseNo: compliance.complianceLicenseNo || undefined,
        prescriberName: compliance.complianceDoctor || undefined,
        buyerName: compliance.complianceBuyerName || undefined,
        buyerIdCard: compliance.complianceBuyerIdCard || undefined,
      };
      const order = await createOrder(orderPayload as Parameters<typeof createOrder>[0]);
      setLastOrder(order);
      setLastOrderPayments(orderPayload.payments);
      setLastOrderChange(Math.max(0, paymentsTotal - total));
      setPayOpen(false);
      setSuccessOpen(true);
      clearCart();
      setLinkedPatient(null);
      compliance.resetCompliance();
      refresh();
      toast.success("บันทึกคำสั่งซื้อสำเร็จ");
    } catch (e: unknown) {
      // Don't clear state on error - let user retry
      const errorMessage = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "บันทึกไม่สำเร็จ";
      toast.error(errorMessage);
      // Don't re-throw, just handle the error gracefully
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
        onOpenChange={handleSuccessOpenChange}
        order={lastOrder}
        payments={lastOrderPayments}
        change={lastOrderChange}
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
        licenseNo={compliance.complianceLicenseNo}
        onLicenseNoChange={compliance.setComplianceLicenseNo}
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
