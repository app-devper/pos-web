"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Upload } from "lucide-react";
import { importProductsCsv } from "@/lib/pos-api";
import type { CSVImportResult } from "@/types/pos";

interface CsvImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CsvImportDialog({ open, onOpenChange, onSuccess }: CsvImportDialogProps) {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvUploading, setCsvUploading] = useState(false);
  const [csvResult, setCsvResult] = useState<CSVImportResult | null>(null);

  const handleClose = () => {
    onOpenChange(false);
    setCsvFile(null);
    setCsvResult(null);
  };

  const handleUpload = async () => {
    if (!csvFile) return;
    setCsvUploading(true);
    setCsvResult(null);
    try {
      const res = await importProductsCsv(csvFile);
      setCsvResult(res);
      if (res.success > 0 && res.failed === 0) {
        toast.success(`นำเข้าสำเร็จ ${res.success} รายการ`);
        onSuccess();
      } else if (res.success > 0 && res.failed > 0) {
        toast.warning(`นำเข้าสำเร็จ ${res.success} รายการ, ล้มเหลว ${res.failed} รายการ`);
      }
    } catch {
      toast.error("นำเข้าไม่สำเร็จ");
    } finally {
      setCsvUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>นำเข้าสินค้าจาก CSV</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label>เลือกไฟล์ CSV</Label>
            <Input
              type="file"
              accept=".csv"
              onChange={(e) => {
                setCsvFile(e.target.files?.[0] ?? null);
                setCsvResult(null);
              }}
            />
            {csvFile && (
              <p className="text-xs text-muted-foreground">
                {csvFile.name} ({(csvFile.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>
          {csvUploading && (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
              <span className="text-sm text-muted-foreground">กำลังอัปโหลด…</span>
            </div>
          )}
          {csvResult && (
            <div className="rounded border p-3 space-y-1 text-sm">
              <p className="font-medium">ผลการนำเข้า</p>
              <p className="text-green-600">สำเร็จ: {csvResult.success} รายการ</p>
              {(csvResult.failed ?? 0) > 0 && (
                <p className="text-destructive">ล้มเหลว: {csvResult.failed} รายการ</p>
              )}
              {csvResult.errors && csvResult.errors.length > 0 && (
                <div className="max-h-32 overflow-y-auto text-xs text-destructive space-y-0.5 mt-1">
                  {csvResult.errors.map((err, i) => (
                    <p key={i}>{err}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            ปิด
          </Button>
          <Button disabled={!csvFile || csvUploading} onClick={handleUpload}>
            <Upload className="h-4 w-4 mr-2" />
            อัปโหลด
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
