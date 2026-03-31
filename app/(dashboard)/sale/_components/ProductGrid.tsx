"use client";

import { memo } from "react";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart } from "lucide-react";
import { fmt } from "../_utils";
import type { ProductDetail } from "@/types/pos";

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

interface ProductGridProps {
  items: ProductGridItem[];
  loading: boolean;
  onAddToCart: (product: ProductDetail) => void;
}

export const ProductGrid = memo(function ProductGrid({
  items,
  loading,
  onAddToCart,
}: ProductGridProps) {
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
