const numberFmt = new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2 });
export const fmt = (n: number) => numberFmt.format(n);

export const CUSTOMER_TYPE_LABEL: Record<string, string> = {
    General: "ทั่วไป",
    Regular: "ประจำ",
    Wholesaler: "ขายส่ง",
};

export const CUSTOMER_TYPES = [
    { value: "General", label: "ทั่วไป" },
    { value: "Regular", label: "ประจำ" },
    { value: "Wholesaler", label: "ขายส่ง" },
];
