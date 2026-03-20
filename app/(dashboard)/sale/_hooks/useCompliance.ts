import { useState, useCallback } from "react";
import { toast } from "sonner";
import type { OrderPayment } from "@/types/pos";

export function useCompliance() {
    const [complianceOpen, setComplianceOpen] = useState(false);
    const [compliancePharmacist, setCompliancePharmacist] = useState("");
    const [complianceDoctor, setComplianceDoctor] = useState("");
    const [complianceBuyerName, setComplianceBuyerName] = useState("");
    const [complianceBuyerIdCard, setComplianceBuyerIdCard] = useState("");

    const validateCompliance = useCallback(() => {
        if (!compliancePharmacist.trim()) { toast.error("กรุณากรอกชื่อเภสัชกร"); return false; }
        if (!complianceBuyerName.trim()) { toast.error("กรุณากรอกชื่อผู้ซื้อ"); return false; }
        if (!complianceBuyerIdCard.trim()) { toast.error("กรุณากรอกเลขบัตรประชาชนผู้ซื้อ"); return false; }
        return true;
    }, [compliancePharmacist, complianceBuyerName, complianceBuyerIdCard]);

    const resetCompliance = useCallback(() => {
        setCompliancePharmacist("");
        setComplianceDoctor("");
        setComplianceBuyerName("");
        setComplianceBuyerIdCard("");
    }, []);

    return {
        complianceOpen, setComplianceOpen,
        compliancePharmacist, setCompliancePharmacist,
        complianceDoctor, setComplianceDoctor,
        complianceBuyerName, setComplianceBuyerName,
        complianceBuyerIdCard, setComplianceBuyerIdCard,
        validateCompliance,
        resetCompliance,
    };
}
