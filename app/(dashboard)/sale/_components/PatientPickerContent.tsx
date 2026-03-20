"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { listPatients } from "@/lib/pos-api";
import type { Patient } from "@/types/pos";

export function PatientPickerContent({ onSelect }: { onSelect: (p: Patient) => void }) {
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
