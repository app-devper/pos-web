import { useState, useCallback } from "react";
import { toast } from "sonner";


export function useCompliance() {
    const [complianceOpen, setComplianceOpen] = useState(false);
    const [compliancePharmacist, setCompliancePharmacist] = useState("");
    const [complianceLicenseNo, setComplianceLicenseNo] = useState("");
    const [complianceDoctor, setComplianceDoctor] = useState("");
    const [complianceBuyerName, setComplianceBuyerName] = useState("");
    const [complianceBuyerIdCard, setComplianceBuyerIdCard] = useState("");

    const validateCompliance = useCallback(() => {
        if (!compliancePharmacist.trim()) { toast.error("กรุณากรอกชื่อเภสัชกร"); return false; }
        if (!complianceLicenseNo.trim()) { toast.error("กรุณากรอกเลขใบอนุญาตเภสัชกร"); return false; }
        if (!complianceBuyerName.trim()) { toast.error("กรุณากรอกชื่อผู้ซื้อ"); return false; }
        if (!complianceBuyerIdCard.trim()) { toast.error("กรุณากรอกเลขบัตรประชาชนผู้ซื้อ"); return false; }
        
        // Validate Thai ID card format: X-XXXX-XXXXX-XX-X
        const idCardPattern = /^\d{1}-\d{4}-\d{5}-\d{2}-\d{1}$/;
        if (!idCardPattern.test(complianceBuyerIdCard.trim())) {
            toast.error("รูปแบบเลขบัตรประชาชนไม่ถูกต้อง (เช่น 1-2345-67890-12-3)");
            return false;
        }
        
        return true;
    }, [compliancePharmacist, complianceLicenseNo, complianceBuyerName, complianceBuyerIdCard]);

    const resetCompliance = useCallback(() => {
        setCompliancePharmacist("");
        setComplianceLicenseNo("");
        setComplianceDoctor("");
        setComplianceBuyerName("");
        setComplianceBuyerIdCard("");
    }, []);

    return {
        complianceOpen, setComplianceOpen,
        compliancePharmacist, setCompliancePharmacist,
        complianceLicenseNo, setComplianceLicenseNo,
        complianceDoctor, setComplianceDoctor,
        complianceBuyerName, setComplianceBuyerName,
        complianceBuyerIdCard, setComplianceBuyerIdCard,
        validateCompliance,
        resetCompliance,
    };
}
