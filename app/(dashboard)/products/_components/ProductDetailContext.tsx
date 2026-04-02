"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  getProductUnits, getProductStocks, getProductPrices, listBranches, getProductHistories,
  deleteProductUnit, deleteProductStock, deleteProductPrice, updateStockSequence,
} from "@/lib/pos-api";
import type { ProductDetail, ProductUnit, ProductStock, ProductPrice, Branch, ProductHistory } from "@/types/pos";
import { useConfirm } from "@/components/ConfirmDialog";

interface ProductDetailState {
  product: ProductDetail;
  units: ProductUnit[];
  stocks: ProductStock[];
  prices: ProductPrice[];
  branches: Branch[];
  histories: ProductHistory[];
  loading: boolean;
  unitOpen: boolean;
  editingUnit: ProductUnit | null;
  stockOpen: boolean;
  editingStock: ProductStock | null;
  adjustOpen: boolean;
  adjustTarget: ProductStock | null;
  priceOpen: boolean;
  editingPrice: ProductPrice | null;
  newPriceUnitId: string | null;
  sequenceOpen: boolean;
}

interface ProductDetailActions {
  reload: () => void;
  openUnitDialog: (u?: ProductUnit) => void;
  closeUnitDialog: () => void;
  openStockDialog: (s?: ProductStock) => void;
  closeStockDialog: () => void;
  openAdjustDialog: (s: ProductStock) => void;
  closeAdjustDialog: () => void;
  openPriceDialog: (p?: ProductPrice, unitId?: string) => void;
  closePriceDialog: () => void;
  openSequenceDialog: () => void;
  closeSequenceDialog: () => void;
  deleteUnit: (id: string) => Promise<void>;
  deleteStock: (id: string) => Promise<void>;
  deletePrice: (id: string) => Promise<void>;
  moveStock: (index: number, direction: "up" | "down") => Promise<void>;
}

interface ProductDetailContextValue {
  state: ProductDetailState;
  actions: ProductDetailActions;
}

const ProductDetailContext = createContext<ProductDetailContextValue | null>(null);

export function useProductDetail() {
  const ctx = useContext(ProductDetailContext);
  if (!ctx) throw new Error("useProductDetail must be used within ProductDetailProvider");
  return ctx;
}

interface ProviderProps {
  product: ProductDetail;
  children: React.ReactNode;
}

export function ProductDetailProvider({ product, children }: ProviderProps) {
  const [units, setUnits] = useState<ProductUnit[]>([]);
  const [stocks, setStocks] = useState<ProductStock[]>([]);
  const [prices, setPrices] = useState<ProductPrice[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [histories, setHistories] = useState<ProductHistory[]>([]);
  const [loading, setLoading] = useState(false);

  const [unitOpen, setUnitOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<ProductUnit | null>(null);
  const [stockOpen, setStockOpen] = useState(false);
  const [editingStock, setEditingStock] = useState<ProductStock | null>(null);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustTarget, setAdjustTarget] = useState<ProductStock | null>(null);
  const [priceOpen, setPriceOpen] = useState(false);
  const [editingPrice, setEditingPrice] = useState<ProductPrice | null>(null);
  const [newPriceUnitId, setNewPriceUnitId] = useState<string | null>(null);
  const [sequenceOpen, setSequenceOpen] = useState(false);

  const reload = useCallback(() => {
    setLoading(true);
    setUnits([]); setStocks([]); setPrices([]);
    Promise.all([
      getProductUnits(product.id),
      getProductStocks(product.id),
      getProductPrices(product.id),
      listBranches(),
      getProductHistories(product.id),
    ])
      .then(([u, s, pr, b, h]) => {
        setUnits(Array.isArray(u) ? u : []);
        setStocks(Array.isArray(s) ? s : []);
        setPrices(Array.isArray(pr) ? (pr as ProductPrice[]) : []);
        setBranches(Array.isArray(b) ? (b as Branch[]) : []);
        setHistories(Array.isArray(h) ? (h as ProductHistory[]) : []);
      })
      .catch(() => toast.error("โหลด detail ไม่สำเร็จ"))
      .finally(() => setLoading(false));
  }, [product.id]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      reload();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [reload]);

  const confirm = useConfirm();

  const actions: ProductDetailActions = {
    reload,
    openUnitDialog: (u) => { setEditingUnit(u ?? null); setUnitOpen(true); },
    closeUnitDialog: () => setUnitOpen(false),
    openStockDialog: (s) => { setEditingStock(s ?? null); setStockOpen(true); },
    closeStockDialog: () => setStockOpen(false),
    openAdjustDialog: (s) => { setAdjustTarget(s); setAdjustOpen(true); },
    closeAdjustDialog: () => setAdjustOpen(false),
    openPriceDialog: (p, unitId) => { setEditingPrice(p ?? null); setNewPriceUnitId(unitId ?? null); setPriceOpen(true); },
    closePriceDialog: () => setPriceOpen(false),
    openSequenceDialog: () => setSequenceOpen(true),
    closeSequenceDialog: () => setSequenceOpen(false),

    deleteUnit: async (id) => {
      if (!(await confirm({ description: "ลบหน่วยนี้?", destructive: true }))) return;
      try { await deleteProductUnit(id); toast.success("ลบแล้ว"); reload(); }
      catch { toast.error("ลบไม่สำเร็จ"); }
    },
    deleteStock: async (id) => {
      if (!(await confirm({ description: "ลบ stock นี้?", destructive: true }))) return;
      try { await deleteProductStock(id); toast.success("ลบแล้ว"); reload(); }
      catch { toast.error("ลบไม่สำเร็จ"); }
    },
    deletePrice: async (id) => {
      if (!(await confirm({ description: "ลบราคานี้?", destructive: true }))) return;
      try { await deleteProductPrice(id); toast.success("ลบแล้ว"); reload(); }
      catch { toast.error("ลบไม่สำเร็จ"); }
    },
    moveStock: async (index, direction) => {
      const newStocks = [...stocks];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= newStocks.length) return;
      [newStocks[index], newStocks[targetIndex]] = [newStocks[targetIndex], newStocks[index]];
      try { await updateStockSequence(newStocks.map((s, i) => ({ stockId: s.id, sequence: i + 1 }))); reload(); }
      catch { toast.error("เรียงลำดับไม่สำเร็จ"); }
    },
  };

  const state: ProductDetailState = {
    product,
    units, stocks, prices, branches, histories, loading,
    unitOpen, editingUnit,
    stockOpen, editingStock,
    adjustOpen, adjustTarget,
    priceOpen, editingPrice, newPriceUnitId,
    sequenceOpen,
  };

  return (
    <ProductDetailContext value={{ state, actions }}>
      {children}
    </ProductDetailContext>
  );
}
