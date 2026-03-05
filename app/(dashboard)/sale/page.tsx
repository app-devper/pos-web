"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, Minus, Trash2, ShoppingCart, CreditCard, Banknote, QrCode, Receipt, UserSearch, X, RefreshCw, ChevronRight, ChevronDown, Info, AlertTriangle, Heart, Shield, Tag } from "lucide-react";
import { listCategories, createOrder, listCustomers, checkDrugInteractions, listPatients, printPrescriptionLabel, applyPromotion } from "@/lib/pos-api";
import { useProductCache } from "@/components/ProductCacheContext";
import { useSettings } from "@/components/SettingsContext";
import type { ProductDetail, Category, OrderPayment, Customer, Patient } from "@/types/pos";

interface CartItem {
  productId: string;
  name: string;
  price: number;
  originalPrice: number;
  costPrice: number;
  quantity: number;
  unit: string;
  unitId: string;
  stocks: { stockId: string; quantity: number }[];
  selectedStockId?: string;
  discountPct?: number;
  discountAmt?: number;
  priceLabel?: string;
  productRef?: ProductDetail;
}

const PAYMENT_TYPES: { value: OrderPayment["type"]; label: string; icon: React.ReactNode }[] = [
  { value: "CASH", label: "เงินสด", icon: <Banknote className="h-4 w-4" /> },
  { value: "PROMPTPAY", label: "พร้อมเพย์", icon: <QrCode className="h-4 w-4" /> },
  { value: "TRANSFER", label: "โอนเงิน", icon: <Receipt className="h-4 w-4" /> },
  { value: "CREDIT", label: "เครดิต", icon: <CreditCard className="h-4 w-4" /> },
];

function CustomerPickerDialog({
  open, onOpenChange, onSelect,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSelect: (c: Customer) => void;
}) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    listCustomers()
      .then((data) => setCustomers(Array.isArray(data) ? data : []))
      .catch(() => { })
      .finally(() => setLoading(false));
  }, [open]);

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase();
    return !q || c.name.toLowerCase().includes(q) || (c.code ?? "").toLowerCase().includes(q);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>เลือกลูกค้า</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="ค้นหาชื่อหรือรหัสลูกค้า…"
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>
        <div className="max-h-72 overflow-y-auto -mx-6 px-6 space-y-1">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">ไม่พบลูกค้า</p>
          ) : (
            filtered.map((c) => (
              <button
                key={c.id}
                className="w-full text-left px-3 py-2.5 rounded-md hover:bg-accent flex items-center justify-between"
                onClick={() => { onSelect(c); onOpenChange(false); }}
              >
                <div>
                  <p className="text-sm font-medium">{c.name}</p>
                  {c.code && <p className="text-xs text-muted-foreground">{c.code}</p>}
                </div>
                {c.customerType && (
                  <span className="text-xs text-muted-foreground shrink-0 ml-2">{CUSTOMER_TYPE_LABEL[c.customerType] ?? c.customerType}</span>
                )}
              </button>
            ))
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>ยกเลิก</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const fmt = (n: number) =>
  new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2 }).format(n);

const CUSTOMER_TYPE_LABEL: Record<string, string> = { General: "\u0e2b\u0e19\u0e49\u0e32\u0e23\u0e49\u0e32\u0e19", Regular: "\u0e25\u0e39\u0e01\u0e04\u0e49\u0e32", Wholesaler: "\u0e02\u0e32\u0e22\u0e2a\u0e48\u0e07" };

function CartItemDialog({
  item,
  onClose,
  onConfirm,
  onRemove,
}: {
  item: CartItem;
  onClose: () => void;
  onConfirm: (updated: Partial<CartItem>) => void;
  onRemove: () => void;
}) {
  const p = item.productRef;
  const [quantity, setQuantity] = useState(item.quantity);
  const [unitId, setUnitId] = useState(item.unitId);
  const [selectedStockId, setSelectedStockId] = useState(item.selectedStockId ?? p?.stocks?.[0]?.id ?? "");
  const initPriceId = p?.prices?.find((pr) => pr.price === item.price)?.id ?? p?.prices?.[0]?.id ?? "";
  const [selectedPriceId, setSelectedPriceId] = useState(initPriceId);
  const [price, setPrice] = useState(item.price);
  const [discountPct, setDiscountPct] = useState(item.discountPct ?? 0);
  const [discountAmt, setDiscountAmt] = useState(item.discountAmt ?? 0);

  const units = p?.units ?? [];
  const stocks = p?.stocks ?? [];
  const prices = p?.prices ?? [];

  const selectedStock = stocks.find((s) => s.id === selectedStockId);
  const selectedUnit = units.find((u) => u.id === unitId);

  const selectedPriceObj = prices.find((pr) => pr.id === selectedPriceId);
  const priceLabel = selectedPriceObj ? (CUSTOMER_TYPE_LABEL[selectedPriceObj.customerType] ?? selectedPriceObj.customerType) : "หน้าร้าน";

  function handleConfirm() {
    const newStocks = stocks.map((s) => ({ stockId: s.id, quantity: s.quantity }));
    onConfirm({ quantity, unitId, unit: selectedUnit?.unit ?? item.unit, price, selectedStockId, discountPct, discountAmt, stocks: newStocks, priceLabel });
  }

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm p-0 gap-0 overflow-hidden">
        <DialogTitle className="sr-only">{item.name}</DialogTitle>
        {/* Header */}
        <div className="flex items-center justify-center px-4 py-3 border-b">
          <div className="font-semibold text-sm truncate">{item.name}</div>
        </div>

        <div className="divide-y">
          {/* จำนวนสินค้า */}
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm font-medium">จำนวนสินค้า</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{quantity} {selectedUnit?.unit ?? item.unit}</span>
              <div className="flex items-center gap-1">
                <button aria-label="ลดจำนวน" onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="h-6 w-6 rounded-full bg-destructive/15 text-destructive flex items-center justify-center">
                  <Minus className="h-3 w-3" />
                </button>
                <span className="w-6 text-center text-sm font-medium">{quantity}</span>
                <button aria-label="เพิ่มจำนวน" onClick={() => setQuantity((q) => q + 1)} className="h-6 w-6 rounded-full bg-primary/15 text-primary flex items-center justify-center">
                  <Plus className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>

          {/* หน่วยนับ */}
          {units.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm font-medium">หน่วยนับ</span>
              <Select value={unitId} onValueChange={setUnitId}>
                <SelectTrigger className="w-36 h-8 text-sm border-0 pr-0 justify-end gap-1 shadow-none focus:ring-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {units.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.unit}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* สต็อก */}
          {stocks.length > 0 && (
            <div className="px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">สต็อก</span>
                <Select value={selectedStockId} onValueChange={setSelectedStockId}>
                  <SelectTrigger className="w-40 h-8 text-sm border-0 pr-0 justify-end gap-1 shadow-none focus:ring-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {stocks.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.importDate ? new Date(s.importDate).toLocaleDateString("th-TH", { day: "2-digit", month: "2-digit", year: "2-digit" }) : s.id.slice(-6)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedStock && (
                <p className="text-xs text-primary mt-1">จำนวนที่นำเข้า {selectedStock.quantity} {selectedUnit?.unit ?? item.unit}</p>
              )}
            </div>
          )}

          {/* ราคาสินค้า */}
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">ราคาสินค้า</span>
              <Select value={selectedPriceId} onValueChange={(id) => { setSelectedPriceId(id); const found = prices.find((pr) => pr.id === id); if (found) setPrice(found.price); }}>
                <SelectTrigger className="w-44 h-8 text-sm border-0 pr-0 justify-end gap-1 shadow-none focus:ring-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {prices.filter((pr) => pr.price > 0).map((pr) => {
                    const label = CUSTOMER_TYPE_LABEL[pr.customerType] ?? pr.customerType;
                    return <SelectItem key={pr.id} value={pr.id}>฿{fmt(pr.price)} {label}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ส่วนลด % */}
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">ส่วนลดสินค้า (%)</span>
              <div className="flex items-center gap-2">
                {discountPct > 0 ? (
                  <span className="text-sm text-destructive">-{discountPct}%</span>
                ) : (
                  <span className="text-sm text-muted-foreground">-</span>
                )}
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={discountPct === 0 ? "" : discountPct}
                  onChange={(e) => setDiscountPct(parseFloat(e.target.value) || 0)}
                  className="h-7 w-16 text-xs text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  placeholder="0"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">คำนวณต่อหนึ่งหน่วย</p>
          </div>

          {/* ส่วนลด ฿ */}
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">ส่วนลดสินค้า (฿)</span>
              <div className="flex items-center gap-2">
                {discountAmt > 0 ? (
                  <span className="text-sm text-destructive">-฿{fmt(discountAmt)}</span>
                ) : (
                  <span className="text-sm text-muted-foreground">-</span>
                )}
                <Input
                  type="number"
                  min={0}
                  value={discountAmt === 0 ? "" : discountAmt}
                  onChange={(e) => setDiscountAmt(parseFloat(e.target.value) || 0)}
                  className="h-7 w-16 text-xs text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  placeholder="0"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">คำนวณต่อหนึ่งหน่วย</p>
          </div>
        </div>

        {/* Bottom buttons */}
        <div className="px-4 py-3 border-t">
          <div className="flex gap-2">
            <Button variant="destructive" className="flex-1" onClick={onRemove}>ยกเลิกสินค้า</Button>
            <Button className="flex-1" onClick={handleConfirm}>ยืนยัน</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PatientPickerContent({ onSelect }: { onSelect: (p: Patient) => void }) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listPatients()
      .then((data) => setPatients(Array.isArray(data) ? data : []))
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  const filtered = patients.filter((p) => {
    const q = search.toLowerCase();
    return !q || p.customerCode.toLowerCase().includes(q) ||
      (p.firstName ?? "").toLowerCase().includes(q) ||
      (p.lastName ?? "").toLowerCase().includes(q) ||
      (p.phone ?? "").includes(q);
  });

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="ค้นหาชื่อ, รหัส, เบอร์โทร…" className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} autoFocus />
      </div>
      <div className="max-h-60 overflow-y-auto space-y-1">
        {loading ? (
          <div className="flex justify-center py-6"><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" /></div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">ไม่พบผู้ป่วย</p>
        ) : (
          filtered.map((p) => (
            <button
              key={p.id}
              className="w-full text-left px-3 py-2 rounded-md hover:bg-accent flex items-center justify-between"
              onClick={() => onSelect(p)}
            >
              <div>
                <p className="text-sm font-medium">{[p.firstName, p.lastName].filter(Boolean).join(" ") || p.customerCode}</p>
                <p className="text-xs text-muted-foreground">{p.customerCode}{p.phone ? ` · ${p.phone}` : ""}</p>
              </div>
              {(p.allergies ?? []).length > 0 && (
                <Badge variant="outline" className="text-orange-600 border-orange-300 text-xs">แพ้ยา</Badge>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

const MAX_TABS = 6;

interface CartTab {
  cart: CartItem[];
  discount: number;
  customerCode: string;
  customerName: string;
}

const EMPTY_TAB: CartTab = { cart: [], discount: 0, customerCode: "", customerName: "" };

function loadTabs(): CartTab[] {
  if (typeof window === "undefined") return [{ ...EMPTY_TAB }];
  try {
    const s = sessionStorage.getItem("sale_tabs");
    if (s) {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { }
  return [{ ...EMPTY_TAB }];
}

function loadActiveTab(): number {
  if (typeof window === "undefined") return 0;
  try { return Number(sessionStorage.getItem("sale_activeTab")) || 0; } catch { return 0; }
}

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

  const [tabs, setTabs] = useState<CartTab[]>(loadTabs);
  const [activeTab, setActiveTab] = useState(loadActiveTab);

  const currentTab = tabs[activeTab] ?? EMPTY_TAB;
  const cart = currentTab.cart;
  const discount = currentTab.discount;
  const customerCode = currentTab.customerCode;
  const customerName = currentTab.customerName;

  function setCart(updater: CartItem[] | ((prev: CartItem[]) => CartItem[])) {
    setTabs((prev) => prev.map((t, i) => i === activeTab ? { ...t, cart: typeof updater === "function" ? updater(t.cart) : updater } : t));
  }
  function setDiscount(val: number | ((prev: number) => number)) {
    setTabs((prev) => prev.map((t, i) => i === activeTab ? { ...t, discount: typeof val === "function" ? val(t.discount) : val } : t));
  }
  function setCustomerCode(val: string) {
    setTabs((prev) => prev.map((t, i) => i === activeTab ? { ...t, customerCode: val } : t));
  }
  function setCustomerName(val: string) {
    setTabs((prev) => prev.map((t, i) => i === activeTab ? { ...t, customerName: val } : t));
  }

  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);

  const [payOpen, setPayOpen] = useState(false);
  const [payType, setPayType] = useState<OrderPayment["type"]>("CASH");
  const [cashInput, setCashInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [detailItem, setDetailItem] = useState<CartItem | null>(null);
  const [discountOpen, setDiscountOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [lastOrder, setLastOrder] = useState<unknown>(null);

  // Drug interaction alert (Phase 4C)
  const [drugAlerts, setDrugAlerts] = useState<{ productAName: string; productBName: string; interaction: string }[]>([]);
  const [drugAlertOpen, setDrugAlertOpen] = useState(false);

  // Allergy check (Phase 4D)
  const [allergyAlerts, setAllergyAlerts] = useState<string[]>([]);
  const [allergyAlertOpen, setAllergyAlertOpen] = useState(false);

  // Controlled drug compliance (Phase 4E)
  const [complianceOpen, setComplianceOpen] = useState(false);
  const [compliancePharmacist, setCompliancePharmacist] = useState("");
  const [complianceDoctor, setComplianceDoctor] = useState("");
  const [complianceBuyerName, setComplianceBuyerName] = useState("");
  const [complianceBuyerIdCard, setComplianceBuyerIdCard] = useState("");

  // Patient linking (Phase 4F)
  const [patientPickerOpen, setPatientPickerOpen] = useState(false);
  const [linkedPatient, setLinkedPatient] = useState<Patient | null>(null);

  // Multiple payments (Phase 4G)
  const [payments, setPayments] = useState<{ type: OrderPayment["type"]; amount: number }[]>([{ type: "CASH", amount: 0 }]);

  // Promotion code
  const [promoOpen, setPromoOpen] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoName, setPromoName] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);

  useEffect(() => {
    listCategories()
      .then((c) => setCategories(Array.isArray(c) ? c : []))
      .catch(() => { });
  }, []);

  // Re-hydrate productRef from product cache when products load
  useEffect(() => {
    if (products.length === 0) return;
    setTabs((prev) => prev.map((tab) => {
      const needsHydration = tab.cart.some((i) => !i.productRef);
      if (!needsHydration) return tab;
      return {
        ...tab, cart: tab.cart.map((i) => {
          if (i.productRef) return i;
          const p = products.find((pd) => pd.id === i.productId);
          return p ? { ...i, productRef: p } : i;
        })
      };
    }));
  }, [products]);

  // Sync tabs to sessionStorage
  useEffect(() => {
    try {
      const toStore = tabs.map((t) => ({ ...t, cart: t.cart.map(({ productRef, ...rest }) => rest) }));
      sessionStorage.setItem("sale_tabs", JSON.stringify(toStore));
    } catch { }
  }, [tabs]);
  useEffect(() => { try { sessionStorage.setItem("sale_activeTab", String(activeTab)); } catch { } }, [activeTab]);

  // Warn before navigating away if cart has items
  useEffect(() => {
    const hasItems = tabs.some((t) => t.cart.length > 0);
    if (!hasItems) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [tabs]);

  function resolvePrice(p: ProductDetail): { price: number; priceLabel: string } {
    const generalPrice = p.prices?.find((pr) => pr.customerType === "GENERAL");
    if (generalPrice && generalPrice.price > 0) return { price: generalPrice.price, priceLabel: "หน้าร้าน" };
    const anyPrice = p.prices?.find((pr) => pr.price > 0);
    if (anyPrice) return { price: anyPrice.price, priceLabel: CUSTOMER_TYPE_LABEL[anyPrice.customerType] ?? anyPrice.customerType };
    return { price: p.price, priceLabel: "หน้าร้าน" };
  }

  function resolveCostPrice(p: ProductDetail): number {
    const firstStock = p.stocks?.[0];
    if (firstStock?.costPrice && firstStock.costPrice > 0) return firstStock.costPrice;
    return p.costPrice;
  }

  function addToCart(p: ProductDetail) {
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.productId === p.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        return next;
      }
      const defaultUnit = p.units?.[0];
      const unitId = defaultUnit?.id ?? "";
      const stocks = (p.stocks ?? []).map((s) => ({ stockId: s.id, quantity: s.quantity }));
      const { price, priceLabel } = resolvePrice(p);
      const costPrice = resolveCostPrice(p);
      return [...prev, { productId: p.id, name: p.name, price, originalPrice: price, costPrice, quantity: 1, unit: p.unit, unitId, stocks, priceLabel, productRef: p }];
    });
  }

  function updateQty(productId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((i) => i.productId === productId ? { ...i, quantity: i.quantity + delta } : i)
        .filter((i) => i.quantity > 0)
    );
  }

  function removeFromCart(productId: string) {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  }

  function updatePrice(productId: string, price: number) {
    setCart((prev) => prev.map((i) => i.productId === productId ? { ...i, price } : i));
  }

  function clearCart() {
    setTabs((prev) => prev.map((t, i) => i === activeTab ? { ...EMPTY_TAB } : t));
  }

  function addTab() {
    if (tabs.length >= MAX_TABS) return;
    setTabs((prev) => [...prev, { ...EMPTY_TAB }]);
    setActiveTab(tabs.length);
  }

  function removeTab(idx: number) {
    if (tabs.length <= 1) return;
    setTabs((prev) => prev.filter((_, i) => i !== idx));
    if (activeTab >= idx && activeTab > 0) setActiveTab((a) => a - 1);
  }

  function handleSelectCustomer(c: Customer) {
    setCustomerCode(c.code ?? "");
    setCustomerName(c.name);
  }

  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const total = Math.max(0, subtotal - discount - promoDiscount);

  async function handleApplyPromo() {
    if (!promoCode.trim()) return;
    setPromoLoading(true);
    try {
      const result = await applyPromotion({ promotionCode: promoCode.trim(), orderTotal: subtotal, productIds: cart.map((i) => i.productId) });
      setPromoDiscount(result.discount ?? 0);
      setPromoName(result.name ?? promoCode);
      toast.success(`ใช้โปรโมชัน "${result.name}" ลด ฿${(result.discount ?? 0).toLocaleString()}`);
    } catch {
      toast.error("ไม่พบโปรโมชันหรือไม่ตรงเงื่อนไข");
      setPromoDiscount(0);
      setPromoName("");
    } finally {
      setPromoLoading(false);
    }
  }

  function clearPromo() {
    setPromoCode("");
    setPromoDiscount(0);
    setPromoName("");
  }
  const cashAmount = parseFloat(cashInput) || 0;
  const change = payType === "CASH" ? Math.max(0, cashAmount - total) : 0;

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
        setComplianceOpen(true);
        return;
      }
    }

    setPayments([{ type: "CASH", amount: total }]);
    setCashInput(total.toFixed(2));
    setPayOpen(true);
  }

  function handleComplianceConfirm() {
    if (!compliancePharmacist.trim()) return toast.error("กรุณากรอกชื่อเภสัชกร");
    if (!complianceBuyerName.trim()) return toast.error("กรุณากรอกชื่อผู้ซื้อ");
    if (!complianceBuyerIdCard.trim()) return toast.error("กรุณากรอกเลขบัตรประชาชนผู้ซื้อ");
    setComplianceOpen(false);
    setPayments([{ type: "CASH", amount: total }]);
    setCashInput(total.toFixed(2));
    setPayOpen(true);
  }

  function addPaymentRow() {
    setPayments((p) => [...p, { type: "CASH", amount: 0 }]);
  }

  function removePaymentRow(idx: number) {
    if (payments.length <= 1) return;
    setPayments((p) => p.filter((_, i) => i !== idx));
  }

  function updatePaymentRow(idx: number, field: "type" | "amount", value: string | number) {
    setPayments((p) => p.map((row, i) => i === idx ? { ...row, [field]: value } : row));
  }

  const paymentsTotal = payments.reduce((s, p) => s + (p.amount || 0), 0);

  async function handleConfirmPay() {
    if (paymentsTotal < total) return toast.error("ยอดชำระไม่ครบ");
    setSubmitting(true);
    try {
      const orderPayload = {
        customerCode: customerCode.trim() || undefined,
        discount: discount || undefined,
        items: cart.map((i) => ({ productId: i.productId, unitId: i.unitId, quantity: i.quantity, price: i.price, stocks: i.stocks })),
        payments: payments.filter((p) => p.amount > 0),
        type: payments[0]?.type ?? "CASH" as OrderPayment["type"],
        amount: paymentsTotal,
        total,
        patientId: linkedPatient?.id,
        pharmacistName: compliancePharmacist || undefined,
        prescriberName: complianceDoctor || undefined,
        buyerName: complianceBuyerName || undefined,
        buyerIdCard: complianceBuyerIdCard || undefined,
      };
      const order = await createOrder(orderPayload as Parameters<typeof createOrder>[0]);
      setLastOrder(order);
      setPayOpen(false);
      setSuccessOpen(true);
      clearCart();
      setLinkedPatient(null);
      setCompliancePharmacist("");
      setComplianceDoctor("");
      setComplianceBuyerName("");
      setComplianceBuyerIdCard("");
      toast.success("บันทึกการขายแล้ว");
    } catch (e: unknown) {
      toast.error(
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "บันทึกไม่สำเร็จ"
      );
    } finally {
      setSubmitting(false);
    }
  }

  const filteredProducts = products.filter((p) => {
    const matchCat = selectedCategory === "__all__" || p.category === selectedCategory;
    const q = search.toLowerCase();
    const matchSearch =
      !search ||
      p.name.toLowerCase().includes(q) ||
      (p.nameEn ?? "").toLowerCase().includes(q) ||
      p.serialNumber?.toLowerCase().includes(q) ||
      (p.drugInfo?.genericName ?? "").toLowerCase().includes(q) ||
      p.units?.some((u) => u.barcode?.toLowerCase().includes(q));
    return matchCat && matchSearch;
  });

  return (
    <div className="-m-4 md:-m-6 flex h-screen border-t overflow-hidden">
      {/* ─── Left: Product grid ─── */}
      <div className="flex-1 flex flex-col gap-3 min-w-0 p-4 md:p-6 border-r overflow-hidden">
        <div className="flex items-center justify-between shrink-0">
          <h1 className="text-2xl font-bold">ขายสินค้า</h1>
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
            <SelectTrigger className="w-44">
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
          {loadingProducts ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
              <ShoppingCart className="h-10 w-10 opacity-30" />
              <p className="text-sm">ไม่พบสินค้า</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 pb-4">
              {filteredProducts.map((p) => {
                const qty = p.stocks?.reduce((s, st) => s + st.quantity, 0) ?? p.quantity;
                const qtyColor = qty <= 0 ? "text-destructive" : qty <= 10 ? "text-yellow-600" : "text-muted-foreground";
                return (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    className="text-left rounded-lg border bg-card hover:bg-accent hover:border-primary transition-colors p-3 space-y-1 focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <p className="font-medium text-sm leading-tight line-clamp-2">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.serialNumber}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-primary font-semibold text-sm">฿{fmt(resolvePrice(p).price)}</span>
                      <Badge variant="secondary" className="text-xs">{p.unit}</Badge>
                    </div>
                    <p className={`text-xs font-medium ${qtyColor}`}>คงเหลือ: {qty}</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ─── Right: Cart ─── */}
      <div className="w-80 shrink-0 flex flex-col overflow-hidden border-l bg-background">
        {/* Cart Header + Tabs */}
        <div className="shrink-0 border-b">
          {multiCartEnabled ? (
            <div className="flex items-center gap-0 overflow-x-auto px-1 pt-1">
              {tabs.map((t, i) => (
                <button
                  key={i}
                  onClick={() => setActiveTab(i)}
                  className={`relative px-3 py-2 text-xs font-medium rounded-t-md transition-colors whitespace-nowrap ${activeTab === i ? "bg-background border border-b-0 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    }`}
                >
                  {t.cart.length > 0 ? `#${i + 1} (${t.cart.length})` : `#${i + 1}`}
                  {tabs.length > 1 && (
                    <span
                      className="ml-1.5 text-muted-foreground hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); removeTab(i); }}
                    >
                      ×
                    </span>
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

        {/* Cart List */}
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
                          <p className="text-xs text-muted-foreground mt-0.5">{item.unit}</p>
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

        {/* Customer Section */}
        <div className="shrink-0 border-t">
          <button
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors"
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
            {customerCode ? (
              <button
                aria-label="ล้างลูกค้า"
                className="p-1 text-muted-foreground hover:text-foreground cursor-pointer"
                onClick={(e) => { e.stopPropagation(); setCustomerCode(""); setCustomerName(""); }}
              >
                <X className="h-4 w-4" />
              </button>
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        </div>

        {/* Patient Linking (Phase 4F) */}
        {patientLinkingEnabled && (
          <div className="shrink-0 border-t">
            <button
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-accent transition-colors"
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
              {linkedPatient ? (
                <button aria-label="ล้างผู้ป่วย" className="p-1 text-muted-foreground hover:text-foreground" onClick={(e) => { e.stopPropagation(); setLinkedPatient(null); }}>
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </button>
          </div>
        )}

        {/* Summary */}
        <div className="shrink-0 border-t bg-background">
          {/* อ้างอิง/หมายเหตุ */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b">
            <button className="flex items-center gap-1 text-sm text-muted-foreground">
              <span>อ้างอิง/หมายเหตุ</span>
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            <span className="text-xs text-primary">ระบุข้อมูล</span>
          </div>
          {/* ราคาเฉพาะสินค้า */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b">
            <span className="text-sm text-muted-foreground">ราคาเฉพาะสินค้า</span>
            <span className="text-sm font-medium">฿{fmt(subtotal)}</span>
          </div>
          {/* โปรโมชัน */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b">
            <button
              className="flex items-center gap-1 text-sm text-muted-foreground"
              onClick={() => setPromoOpen((v) => !v)}
            >
              <Tag className="h-3.5 w-3.5" />
              <span>โปรโมชัน</span>
              <ChevronDown className="h-3.5 w-3.5" />
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
          {promoOpen && (
            <div className="px-4 pb-2.5 pt-1">
              {promoName ? (
                <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 rounded-md px-3 py-2">
                  <div>
                    <p className="text-xs font-medium text-green-700 dark:text-green-400">{promoName}</p>
                    <p className="text-xs text-green-600 dark:text-green-500">ลด ฿{fmt(promoDiscount)}</p>
                  </div>
                  <button onClick={clearPromo} className="text-muted-foreground hover:text-foreground">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-1.5">
                  <Input
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleApplyPromo()}
                    className="h-8 text-sm flex-1"
                    placeholder="กรอกรหัสโปรโมชัน"
                  />
                  <Button size="sm" className="h-8 text-xs" onClick={handleApplyPromo} disabled={promoLoading || !promoCode.trim()}>
                    {promoLoading ? "…" : "ใช้"}
                  </Button>
                </div>
              )}
            </div>
          )}
          {/* ส่วนลด */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b">
            <button
              className="flex items-center gap-1 text-sm text-muted-foreground"
              onClick={() => setDiscountOpen((v) => !v)}
            >
              <span>ส่วนลด (฿)</span>
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {discount > 0 ? (
              <span className="text-sm font-medium text-destructive">-฿{fmt(discount)}</span>
            ) : (
              <span className="text-sm text-muted-foreground">-</span>
            )}
          </div>
          {discountOpen && (
            <div className="px-4 pb-2.5">
              <Input
                type="number"
                min={0}
                value={discount === 0 ? "" : discount}
                onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                className="h-8 text-sm text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="0"
                autoFocus
              />
            </div>
          )}
          {/* ยอดรวมสุทธิ */}
          <div className="flex items-center justify-between px-4 py-3">
            <span className="font-bold text-base">ยอดรวมสุทธิ</span>
            <span className="font-bold text-base text-primary">฿{fmt(total)}</span>
          </div>
          {/* Pay Button */}
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
      </div>

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

      {/* ─── Payment dialog (multi-payment split) ─── */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>ชำระเงิน</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-between text-lg font-bold">
              <span>ยอดสุทธิ</span>
              <span className="text-primary">฿{fmt(total)}</span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>วิธีชำระ</Label>
                <button className="text-xs text-primary hover:underline" onClick={addPaymentRow}>+ เพิ่มช่องทาง</button>
              </div>
              {payments.map((row, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <select
                    className="border rounded-md px-2 py-1.5 text-sm bg-background flex-1"
                    value={row.type}
                    onChange={(e) => updatePaymentRow(idx, "type", e.target.value)}
                  >
                    {PAYMENT_TYPES.map((pt) => (
                      <option key={pt.value} value={pt.value}>{pt.label}</option>
                    ))}
                  </select>
                  <Input
                    type="number"
                    value={row.amount === 0 ? "" : row.amount}
                    onChange={(e) => updatePaymentRow(idx, "amount", parseFloat(e.target.value) || 0)}
                    className="w-28 text-right text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="0.00"
                  />
                  {payments.length > 1 && (
                    <button aria-label="ลบช่องทางชำระ" className="text-destructive hover:text-destructive/80" onClick={() => removePaymentRow(idx)}>
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              <div className="flex justify-between text-sm pt-1 border-t">
                <span className="text-muted-foreground">รวมชำระ</span>
                <span className={`font-semibold ${paymentsTotal >= total ? "text-green-600" : "text-destructive"}`}>
                  ฿{fmt(paymentsTotal)}
                </span>
              </div>
              {paymentsTotal > total && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">เงินทอน</span>
                  <span className="font-semibold text-green-600">฿{fmt(paymentsTotal - total)}</span>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayOpen(false)}>ยกเลิก</Button>
            <Button onClick={handleConfirmPay} disabled={submitting}>
              {submitting ? "กำลังบันทึก…" : "ยืนยันชำระ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Success dialog ─── */}
      <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>บันทึกการขายสำเร็จ</DialogTitle></DialogHeader>
          <div className="space-y-2 text-sm">
            <p className="text-muted-foreground">เลขที่คำสั่งซื้อ</p>
            <p className="font-mono font-semibold">
              {(lastOrder as Record<string, unknown>)?.id as string ?? "-"}
            </p>
            <p className="text-muted-foreground">ยอดรวม</p>
            <p className="font-semibold text-primary text-lg">
              ฿{fmt(((lastOrder as Record<string, unknown>)?.totalAmount as number) ?? 0)}
            </p>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            {isFeatureEnabled("prescriptionLabel") && !!(lastOrder as Record<string, unknown>)?.id && (
              <div className="flex gap-2 w-full">
                <Button
                  variant="outline"
                  className="flex-1 text-xs"
                  onClick={() => {
                    const orderId = (lastOrder as Record<string, unknown>)?.id as string;
                    printPrescriptionLabel(orderId, "8x5").catch(() => toast.error("พิมพ์ฉลากยาไม่สำเร็จ"));
                  }}
                >
                  🏷️ ฉลากยา 8×5 cm
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 text-xs"
                  onClick={() => {
                    const orderId = (lastOrder as Record<string, unknown>)?.id as string;
                    printPrescriptionLabel(orderId, "5x3").catch(() => toast.error("พิมพ์ฉลากยาไม่สำเร็จ"));
                  }}
                >
                  🏷️ ฉลากยา 5×3 cm
                </Button>
              </div>
            )}
            <Button onClick={() => setSuccessOpen(false)} className="w-full">ปิด</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Customer Picker ─── */}
      <CustomerPickerDialog
        open={customerPickerOpen}
        onOpenChange={setCustomerPickerOpen}
        onSelect={handleSelectCustomer}
      />

      {/* ─── Drug Interaction Alert (Phase 4C) ─── */}
      <Dialog open={drugAlertOpen} onOpenChange={setDrugAlertOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />พบปฏิกิริยาระหว่างยา
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {drugAlerts.map((a, i) => (
              <div key={i} className="rounded-md bg-destructive/10 p-3 text-sm">
                <p className="font-medium">{a.productAName} × {a.productBName}</p>
                <p className="text-xs text-muted-foreground mt-1">ปฏิกิริยา: {a.interaction}</p>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDrugAlertOpen(false)}>รับทราบ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Allergy Alert (Phase 4D) ─── */}
      <Dialog open={allergyAlertOpen} onOpenChange={setAllergyAlertOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <Heart className="h-5 w-5" />แจ้งเตือนการแพ้ยา
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">ผู้ป่วยอาจแพ้ยาต่อไปนี้:</p>
            {allergyAlerts.map((name, i) => (
              <div key={i} className="rounded-md bg-orange-100 dark:bg-orange-900/20 p-2 text-sm font-medium">{name}</div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAllergyAlertOpen(false)}>รับทราบ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Controlled Drug Compliance (Phase 4E) ─── */}
      <Dialog open={complianceOpen} onOpenChange={setComplianceOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />บันทึกยาควบคุม
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">ตะกร้ามียาควบคุมพิเศษ กรุณากรอกข้อมูลผู้สั่งจ่ายและผู้ซื้อ</p>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>ชื่อเภสัชกรผู้จ่ายยา *</Label>
              <Input value={compliancePharmacist} onChange={(e) => setCompliancePharmacist(e.target.value)} placeholder="ภก./ภญ. ..." />
            </div>
            <div className="space-y-1">
              <Label>ชื่อผู้สั่งจ่าย (ถ้ามี)</Label>
              <Input value={complianceDoctor} onChange={(e) => setComplianceDoctor(e.target.value)} placeholder="นพ./พญ. ..." />
            </div>
            <div className="space-y-1">
              <Label>ชื่อผู้ซื้อ *</Label>
              <Input value={complianceBuyerName} onChange={(e) => setComplianceBuyerName(e.target.value)} placeholder="ชื่อ-นามสกุลผู้ซื้อ" />
            </div>
            <div className="space-y-1">
              <Label>เลขบัตรประชาชนผู้ซื้อ *</Label>
              <Input value={complianceBuyerIdCard} onChange={(e) => setComplianceBuyerIdCard(e.target.value)} placeholder="X-XXXX-XXXXX-XX-X" maxLength={17} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setComplianceOpen(false)}>ยกเลิก</Button>
            <Button onClick={handleComplianceConfirm}>ยืนยันและชำระ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Patient Picker (Phase 4F) ─── */}
      <Dialog open={patientPickerOpen} onOpenChange={setPatientPickerOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>เลือกผู้ป่วย</DialogTitle></DialogHeader>
          <PatientPickerContent onSelect={(p) => { setLinkedPatient(p); setPatientPickerOpen(false); }} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setPatientPickerOpen(false)}>ยกเลิก</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
