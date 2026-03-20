"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { listProducts, getProduct } from "@/lib/pos-api";
import type { ProductDetail } from "@/types/pos";

interface ProductCacheContextValue {
  products: ProductDetail[];
  loading: boolean;
  lastFetched: Date | null;
  refresh: () => Promise<void>;
  updateById: (id: string) => Promise<void>;
}

const ProductCacheContext = createContext<ProductCacheContextValue | null>(null);

export function useProductCache() {
  const ctx = useContext(ProductCacheContext);
  if (!ctx) throw new Error("useProductCache must be used within ProductCacheProvider");
  return ctx;
}

export function ProductCacheProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<ProductDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listProducts();
      setProducts(Array.isArray(data) ? data : []);
      setLastFetched(new Date());
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  const updateById = useCallback(async (id: string) => {
    try {
      const updated = await getProduct(id);
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? updated : p))
      );
    } catch {
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo<ProductCacheContextValue>(() => ({
    products,
    loading,
    lastFetched,
    refresh,
    updateById,
  }), [products, loading, lastFetched, refresh, updateById]);

  return (
    <ProductCacheContext value={value}>
      {children}
    </ProductCacheContext>
  );
}
