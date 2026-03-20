import { useState, useMemo, useCallback } from "react";
import type { OrderPayment } from "@/types/pos";

export function usePayments() {
    const [payments, setPayments] = useState<{ type: OrderPayment["type"]; amount: number }[]>([{ type: "CASH", amount: 0 }]);

    const paymentsTotal = useMemo(() => payments.reduce((s, p) => s + (p.amount || 0), 0), [payments]);

    const addPaymentRow = useCallback(() => {
        setPayments((p) => [...p, { type: "CASH", amount: 0 }]);
    }, []);

    const removePaymentRow = useCallback((idx: number) => {
        if (payments.length <= 1) return;
        setPayments((p) => p.filter((_, i) => i !== idx));
    }, [payments.length]);

    const updatePaymentRow = useCallback((idx: number, field: "type" | "amount", value: string | number) => {
        setPayments((p) => p.map((row, i) => i === idx ? { ...row, [field]: value } : row));
    }, []);

    const resetPayments = useCallback((total: number) => {
        setPayments([{ type: "CASH", amount: total }]);
    }, []);

    return {
        payments,
        paymentsTotal,
        addPaymentRow,
        removePaymentRow,
        updatePaymentRow,
        resetPayments,
    };
}
