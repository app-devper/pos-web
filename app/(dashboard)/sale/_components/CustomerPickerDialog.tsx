"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { listCustomers } from "@/lib/pos-api";
import type { Customer } from "@/types/pos";
import { CUSTOMER_TYPE_LABEL } from "../_utils";

export function CustomerPickerDialog({
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
