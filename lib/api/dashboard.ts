import { posApi } from "./client";
import type { 
  DashboardSummary, DailyChartData, LowStockProduct, StockReport, ExpiringProduct, RefillReminder, ABCProduct, DeadStockProduct,
  Setting, SettingRequest, Promotion, PromotionRequest, ApplyPromotionRequest, Patient, PatientRequest, UpdatePatientRequest,
  AllergyCheckRequest, AllergyCheckResult, CustomerHistoryRequest
} from "@/types/pos";

// Dashboard
export const getDashboardSummary = (startDate: string, endDate: string): Promise<DashboardSummary> =>
  posApi.get("/dashboard/summary", { params: { startDate, endDate } });
export const getDailyChart = (startDate: string, endDate: string): Promise<DailyChartData[]> =>
  posApi.get("/dashboard/daily-chart", { params: { startDate, endDate } });
export const getLowStock = (threshold?: number): Promise<LowStockProduct[]> =>
  posApi.get("/dashboard/low-stock", { params: threshold ? { threshold } : {} });
export const getStockReport = (): Promise<StockReport[]> =>
  posApi.get("/dashboard/stock-report");
export const getMonthlyChart = (): Promise<DailyChartData[]> =>
  posApi.get("/dashboard/monthly-chart");
export const getExpiringProducts = (): Promise<ExpiringProduct[]> =>
  posApi.get("/dashboard/expiring");
export const getRefillReminders = (): Promise<RefillReminder[]> =>
  posApi.get("/dashboard/refill-reminders");
export const getABCAnalysis = (): Promise<ABCProduct[]> =>
  posApi.get("/dashboard/abc-analysis");
export const getDeadStockProducts = (days = 90): Promise<DeadStockProduct[]> =>
  posApi.get(`/dashboard/dead-stock?days=${days}`);

// Settings
export const getSetting = (): Promise<Setting> => posApi.get("/settings");
export const upsertSetting = (data: SettingRequest): Promise<unknown> => posApi.put("/settings", data);

// Promotions
export const listPromotions = (): Promise<Promotion[]> => posApi.get("/promotions");
export const getPromotion = (id: string): Promise<Promotion> => posApi.get(`/promotions/${id}`);
export const createPromotion = (data: PromotionRequest): Promise<unknown> => posApi.post("/promotions", data);
export const updatePromotion = (id: string, data: PromotionRequest): Promise<unknown> => posApi.put(`/promotions/${id}`, data);
export const deletePromotion = (id: string): Promise<unknown> => posApi.delete(`/promotions/${id}`);
export const applyPromotion = (data: ApplyPromotionRequest): Promise<unknown> => posApi.post("/promotions/apply", data);

// Patients
export const listPatients = (): Promise<Patient[]> => posApi.get("/patients");
export const getPatient = (id: string): Promise<Patient> => posApi.get(`/patients/${id}`);
export const getPatientByCustomerCode = (customerCode: string): Promise<Patient> => posApi.get(`/patients/customer/${customerCode}`);
export const createPatient = (data: PatientRequest): Promise<Patient> => posApi.post("/patients", data);
export const updatePatient = (id: string, data: UpdatePatientRequest): Promise<unknown> => posApi.put(`/patients/${id}`, data);
export const deletePatient = (id: string): Promise<unknown> => posApi.delete(`/patients/${id}`);
export const checkAllergies = (patientId: string, data: AllergyCheckRequest): Promise<AllergyCheckResult[]> =>
  posApi.post(`/patients/${patientId}/allergy-check`, data);

// Customer History
export const createCustomerHistory = (data: CustomerHistoryRequest): Promise<unknown> => posApi.post("/customer-histories", data);
export const getCustomerHistory = (customerCode: string): Promise<any> => posApi.get(`/customer-histories/${customerCode}`);
