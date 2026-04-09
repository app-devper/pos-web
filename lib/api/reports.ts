import { posApi } from "./client";
import { getPosHost } from "../auth";
import { downloadBlob } from "../utils";
import type { 
  DispensingLog, DispensingLogRequest, StockTransfer, StockTransferRequest, PharmacyReportResponse, BarcodeRequest 
} from "@/types/pos";

// Dispensing Logs
export const listDispensingLogs = (): Promise<DispensingLog[]> => posApi.get("/dispensing-logs");
export const getDispensingLog = (id: string): Promise<DispensingLog> => posApi.get(`/dispensing-logs/${id}`);
export const getDispensingLogsByPatient = (patientId: string): Promise<DispensingLog[]> => posApi.get(`/dispensing-logs/patient/${patientId}`);
export const createDispensingLog = (data: DispensingLogRequest): Promise<DispensingLog> => posApi.post("/dispensing-logs", data);

// Stock Transfers
export const listStockTransfers = (): Promise<StockTransfer[]> => posApi.get("/stock-transfers");
export const getStockTransfer = (id: string): Promise<StockTransfer> => posApi.get(`/stock-transfers/${id}`);
export const createStockTransfer = (data: StockTransferRequest): Promise<unknown> => posApi.post("/stock-transfers", data);
export const approveStockTransfer = (id: string): Promise<unknown> => posApi.patch(`/stock-transfers/${id}/approve`);
export const rejectStockTransfer = (id: string): Promise<unknown> => posApi.patch(`/stock-transfers/${id}/reject`);

// Reports
export const getReportUrl = (path: string, params?: Record<string, string | number>) => {
  const host = getPosHost();
  const base = `${host}/api/pos/v1${path}`;
  const qp = new URLSearchParams();
  if (params) Object.entries(params).forEach(([k, v]) => qp.set(k, String(v)));
  const qs = qp.toString();
  return qs ? `${base}?${qs}` : base;
};

export const downloadReport = async (path: string, params?: Record<string, string | number>, filename = "report") => {
  const response = await posApi.get<Blob>(path, {
    params,
    responseType: "blob",
  });
  downloadBlob(response.data as Blob, filename);
};

export const getPharmacyReportData = (key: "khy9" | "khy10" | "khy11" | "khy12" | "khy13", params: { startDate: string; endDate: string }): Promise<PharmacyReportResponse> =>
  posApi.get(`/reports/pharmacy/${key}/data`, { params });

export const downloadBarcodePdf = async (data: BarcodeRequest) => {
  const response = await posApi.post<Blob>("/reports/barcodes/pdf", data, {
    responseType: "blob",
  });
  downloadBlob(response.data as Blob, "barcodes.pdf");
};
