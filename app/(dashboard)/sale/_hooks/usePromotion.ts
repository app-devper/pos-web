import { useState, useCallback } from "react";
import { toast } from "sonner";
import { applyPromotion } from "@/lib/pos-api";
import { fmt } from "../_utils";

export function usePromotion() {
    const [promoOpen, setPromoOpen] = useState(false);
    const [promoCode, setPromoCode] = useState("");
    const [promoDiscount, setPromoDiscount] = useState(0);
    const [promoName, setPromoName] = useState("");
    const [promoLoading, setPromoLoading] = useState(false);

    const applyPromo = useCallback(async (subtotal: number, productIds: string[]) => {
        if (!promoCode.trim()) return;
        setPromoLoading(true);
        try {
            const result = await applyPromotion({ promotionCode: promoCode.trim(), orderTotal: subtotal, productIds });
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
    }, [promoCode]);

    const clearPromo = useCallback(() => {
        setPromoCode("");
        setPromoDiscount(0);
        setPromoName("");
    }, []);

    return {
        promoOpen, setPromoOpen,
        promoCode, setPromoCode,
        promoDiscount, promoName,
        promoLoading,
        applyPromo,
        clearPromo,
    };
}
