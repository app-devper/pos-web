import axios from "axios";
import { getToken, getPosHost, clearSession } from "./auth";
import type {
  ProductDetail,
  Product,
  ProductStock,
  ProductUnit,
  CreateProductRequest,
  UpdateProductRequest,
  ProductStockRequest,
  UpdateProductStockRequest,
  ProductHistory,
  CreateProductUnitRequest,
  ProductUnitRequest,
  CreateOrderRequest,
  Order,
  Category,
  CategoryRequest,
  Customer,
  CustomerRequest,
  Setting,
  SettingRequest,
  Promotion,
  PromotionRequest,
  ApplyPromotionRequest,
  Patient,
  PatientRequest,
  UpdatePatientRequest,
  AllergyCheckRequest,
  AllergyCheckResult,
  DispensingLog,
  DispensingLogRequest,
  StockTransfer,
  StockTransferRequest,
  CustomerHistoryRequest,
  PharmacyReportResponse,
  Employee,
  EmployeeRequest,
  BarcodeRequest,
  DashboardSummary,
  DailyChartData,
  LowStockProduct,
  StockReport,
  ExpiringProduct,
  RefillReminder,
  ABCProduct,
  DeadStockProduct,
  CSVImportResult,
  DrugInteractionResult,
  ProductLot,
  ProductLotDetail,
  ReceiveItemData,
  Receive,
  CreateReceiveRequest,
  UpdateReceiveRequest,
  ProductReceiveRequest,
} from "@/types/pos";

function createPosAxios() {
  const instance = axios.create({
    headers: { "Content-Type": "application/json" },
  });

  instance.interceptors.request.use((config) => {
    const token = getToken();
    const host = getPosHost();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    if (host) config.baseURL = `${host}/api/pos/v1`;
    return config;
  });

  instance.interceptors.response.use(
    (res) => res,
    (err) => {
      if (err.response?.status === 401) {
        clearSession();
        if (typeof window !== "undefined") window.location.href = "/login";
      }
      return Promise.reject(err);
    }
  );

  return instance;
}

const posApi = createPosAxios();

// ─── Products ────────────────────────────────────────────────
export const listProducts = (category?: string) =>
  posApi.get<ProductDetail[]>("/products", { params: category ? { category } : {} }).then((r) => r.data);

export const getProduct = (productId: string) =>
  posApi.get<ProductDetail>(`/products/${productId}`).then((r) => r.data);

export const createProduct = (data: CreateProductRequest) =>
  posApi.post<Product>("/products", data).then((r) => r.data);

export const updateProduct = (productId: string, data: UpdateProductRequest) =>
  posApi.put(`/products/${productId}`, data).then((r) => r.data);

export const deleteProduct = (productId: string) =>
  posApi.delete(`/products/${productId}`).then((r) => r.data);

export const clearSoldFirst = (productId: string) =>
  posApi.delete(`/products/${productId}/sold-first`).then((r) => r.data);

export const getProductBySerial = (serialNumber: string) =>
  posApi.get(`/products/serial-number/${serialNumber}`).then((r) => r.data);

export const generateSerialNumber = () =>
  posApi.get("/products/serial-number").then((r) => r.data);

export const getProductStocks = (productId: string) =>
  posApi.get<ProductStock[]>(`/products/${productId}/stocks`).then((r) => r.data);

export const getProductHistories = (productId: string) =>
  posApi.get<ProductHistory[]>(`/products/${productId}/histories`).then((r) => r.data);

export const createProductStock = (data: ProductStockRequest) =>
  posApi.post("/products/stocks", data).then((r) => r.data);

export const updateProductStock = (stockId: string, data: UpdateProductStockRequest) =>
  posApi.put(`/products/stocks/${stockId}`, data).then((r) => r.data);

export const deleteProductStock = (stockId: string) =>
  posApi.delete(`/products/stocks/${stockId}`).then((r) => r.data);

export const updateStockQuantity = (stockId: string, data: unknown) =>
  posApi.patch(`/products/stocks/${stockId}/quantity`, data).then((r) => r.data);

export const updateStockSequence = (stocks: { stockId: string; sequence: number }[]) =>
  posApi.patch("/products/stocks/sequence", { stocks }).then((r) => r.data);

export const getProductUnits = (productId: string) =>
  posApi.get<ProductUnit[]>(`/products/${productId}/units`).then((r) => r.data);

export const createProductUnit = (data: CreateProductUnitRequest) =>
  posApi.post("/products/units", data).then((r) => r.data);

export const updateProductUnit = (unitId: string, data: ProductUnitRequest) =>
  posApi.put(`/products/units/${unitId}`, data).then((r) => r.data);

export const deleteProductUnit = (unitId: string) =>
  posApi.delete(`/products/units/${unitId}`).then((r) => r.data);

export const getProductPrices = (productId: string) =>
  posApi.get(`/products/${productId}/prices`).then((r) => r.data);

export const createProductPrice = (data: unknown) =>
  posApi.post("/products/prices", data).then((r) => r.data);

export const updateProductPrice = (priceId: string, data: unknown) =>
  posApi.put(`/products/prices/${priceId}`, data).then((r) => r.data);

export const deleteProductPrice = (priceId: string) =>
  posApi.delete(`/products/prices/${priceId}`).then((r) => r.data);

export const checkExpireLots = () =>
  posApi.get<ProductLotDetail[]>("/products/lots/expire-notify").then((r) => r.data);

export const createProductWithReceive = (data: ProductReceiveRequest) =>
  posApi.post("/products/receive", data).then((r) => r.data);

export const checkDrugInteractions = (productIds: string[]) =>
  posApi.post<{ interactions: DrugInteractionResult[] }>("/products/drug-interaction-check", { productIds }).then((r) => r.data);

export const importProductsCsv = (file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  return posApi.post<CSVImportResult>("/products/import-csv", formData, { headers: { "Content-Type": "multipart/form-data" } }).then((r) => r.data);
};

export const listLots = (startDate?: string, endDate?: string) =>
  posApi.get<ProductLot[]>("/products/lots", { params: startDate && endDate ? { startDate, endDate } : {} }).then((r) => r.data);

export const getLot = (lotId: string) =>
  posApi.get<ProductLot>(`/products/lots/${lotId}`).then((r) => r.data);

export const createLot = (data: { productId: string; quantity: number; lotNumber: string; expireDate: string; costPrice: number }) =>
  posApi.post("/products/lots", data).then((r) => r.data);

export const updateLot = (lotId: string, data: { quantity?: number; lotNumber: string; expireDate: string; costPrice: number }) =>
  posApi.put(`/products/lots/${lotId}`, data).then((r) => r.data);

export const deleteLot = (lotId: string) =>
  posApi.delete(`/products/lots/${lotId}`).then((r) => r.data);

// ─── Orders ──────────────────────────────────────────────────
export const createOrder = (data: CreateOrderRequest) =>
  posApi.post("/orders", data).then((r) => r.data?.data ?? r.data);

export const listOrders = (startDate: string, endDate: string) =>
  posApi.get<Order[]>("/orders", { params: { startDate, endDate } }).then((r) => r.data);

export const getOrder = (orderId: string) =>
  posApi.get(`/orders/${orderId}`).then((r) => r.data);

export const deleteOrder = (orderId: string) =>
  posApi.delete(`/orders/${orderId}`).then((r) => r.data);

export const updateOrderCustomerCode = (orderId: string, data: unknown) =>
  posApi.patch(`/orders/${orderId}/customer-code`, data).then((r) => r.data);

export const getOrdersByCustomer = (customerCode: string) =>
  posApi.get(`/orders/customers/${customerCode}`).then((r) => r.data);

export const listOrderItems = (startDate: string, endDate: string) =>
  posApi.get("/orders/items", { params: { startDate, endDate } }).then((r) => r.data);

export const getOrderItem = (itemId: string) =>
  posApi.get(`/orders/items/${itemId}`).then((r) => r.data);

export const printPrescriptionLabel = (orderId: string, size: "8x5" | "5x3" = "8x5") =>
  posApi.get(`/orders/${orderId}/prescription-label`, { params: { size }, responseType: "blob" }).then((r) => {
    const url = window.URL.createObjectURL(new Blob([r.data], { type: "application/pdf" }));
    const w = window.open(url);
    if (w) w.print();
  });

export const deleteOrderItem = (itemId: string) =>
  posApi.delete(`/orders/items/${itemId}`).then((r) => r.data);

export const deleteOrderItemByOrderProduct = (orderId: string, productId: string) =>
  posApi.delete(`/orders/${orderId}/products/${productId}`).then((r) => r.data);

// ─── Categories ───────────────────────────────────────────────
export const listCategories = () =>
  posApi.get<Category[]>("/categories").then((r) => r.data);

export const getCategory = (categoryId: string) =>
  posApi.get<Category>(`/categories/${categoryId}`).then((r) => r.data);

export const createCategory = (data: CategoryRequest) =>
  posApi.post("/categories", data).then((r) => r.data);

export const updateCategory = (categoryId: string, data: CategoryRequest) =>
  posApi.put(`/categories/${categoryId}`, data).then((r) => r.data);

export const deleteCategory = (categoryId: string) =>
  posApi.delete(`/categories/${categoryId}`).then((r) => r.data);

export const setDefaultCategory = (categoryId: string) =>
  posApi.patch(`/categories/${categoryId}/default`).then((r) => r.data);

// ─── Customers ────────────────────────────────────────────────
export const listCustomers = () =>
  posApi.get<Customer[]>("/customers").then((r) => r.data);

export const getCustomer = (customerId: string) =>
  posApi.get<Customer>(`/customers/${customerId}`).then((r) => r.data);

export const getCustomerByCode = (customerCode: string) =>
  posApi.get<Customer>(`/customers/code/${customerCode}`).then((r) => r.data);

export const createCustomer = (data: CustomerRequest) =>
  posApi.post("/customers", data).then((r) => r.data);

export const updateCustomer = (customerId: string, data: CustomerRequest) =>
  posApi.put(`/customers/${customerId}`, data).then((r) => r.data);

export const deleteCustomer = (customerId: string) =>
  posApi.delete(`/customers/${customerId}`).then((r) => r.data);

export const updateCustomerStatus = (customerId: string, data: { status: string }) =>
  posApi.patch(`/customers/${customerId}/status`, data).then((r) => r.data);

// ─── Suppliers ────────────────────────────────────────────────
export const listSuppliers = () =>
  posApi.get("/suppliers").then((r) => r.data);

export const getSupplier = (supplierId: string) =>
  posApi.get(`/suppliers/${supplierId}`).then((r) => r.data);

export const createSupplier = (data: unknown) =>
  posApi.post("/suppliers", data).then((r) => r.data);

export const updateSupplier = (supplierId: string, data: unknown) =>
  posApi.put(`/suppliers/${supplierId}`, data).then((r) => r.data);

export const deleteSupplier = (supplierId: string) =>
  posApi.delete(`/suppliers/${supplierId}`).then((r) => r.data);

export const getSupplierInfo = () =>
  posApi.get("/suppliers/info").then((r) => r.data);

export const updateSupplierInfo = (data: unknown) =>
  posApi.put("/suppliers/info", data).then((r) => r.data);

// ─── Receives ─────────────────────────────────────────────────
export const listReceives = (startDate: string, endDate: string) =>
  posApi.get<Receive[]>("/receives", { params: { startDate, endDate } }).then((r) => r.data);

export const getReceive = (receiveId: string) =>
  posApi.get<Receive>(`/receives/${receiveId}`).then((r) => r.data);

export const createReceive = (data: CreateReceiveRequest) =>
  posApi.post<Receive>("/receives", data).then((r) => r.data);

export const updateReceive = (receiveId: string, data: UpdateReceiveRequest) =>
  posApi.put<Receive>(`/receives/${receiveId}`, data).then((r) => r.data);

export const deleteReceive = (receiveId: string) =>
  posApi.delete(`/receives/${receiveId}`).then((r) => r.data);

export const updateReceiveTotalCost = (receiveId: string, data: { totalCost: number }) =>
  posApi.patch<Receive>(`/receives/${receiveId}/total-cost`, data).then((r) => r.data);

export const updateReceiveItems = (receiveId: string, data: { items: ReceiveItemData[] }) =>
  posApi.patch<Receive>(`/receives/${receiveId}/items`, data).then((r) => r.data);

export const importReceiveToStock = (receiveId: string) =>
  posApi.patch<Receive>(`/receives/${receiveId}/import`).then((r) => r.data);

// ─── Branches ─────────────────────────────────────────────────
export const listBranches = () =>
  posApi.get("/branches").then((r) => r.data);

export const getBranch = (branchId: string) =>
  posApi.get(`/branches/${branchId}`).then((r) => r.data);

export const createBranch = (data: unknown) =>
  posApi.post("/branches", data).then((r) => r.data);

export const updateBranch = (branchId: string, data: unknown) =>
  posApi.put(`/branches/${branchId}`, data).then((r) => r.data);

export const deleteBranch = (branchId: string) =>
  posApi.delete(`/branches/${branchId}`).then((r) => r.data);

export const updateBranchStatus = (branchId: string, data: { status: string }) =>
  posApi.patch(`/branches/${branchId}/status`, data).then((r) => r.data);

// ─── Employees ────────────────────────────────────────────────
export const listEmployees = () =>
  posApi.get<Employee[]>("/employees").then((r) => r.data);

export const getEmployee = (employeeId: string) =>
  posApi.get<Employee>(`/employees/${employeeId}`).then((r) => r.data);

export const getEmployeesByBranch = (branchId: string) =>
  posApi.get<Employee[]>(`/employees/branch/${branchId}`).then((r) => r.data);

export const createEmployee = (data: EmployeeRequest) =>
  posApi.post<Employee>("/employees", data).then((r) => r.data);

export const updateEmployee = (employeeId: string, data: Omit<EmployeeRequest, "userId">) =>
  posApi.put<Employee>(`/employees/${employeeId}`, data).then((r) => r.data);

export const deleteEmployee = (employeeId: string) =>
  posApi.delete(`/employees/${employeeId}`).then((r) => r.data);

// ─── Dashboard ────────────────────────────────────────────────
export const getDashboardSummary = (startDate: string, endDate: string) =>
  posApi.get<DashboardSummary>("/dashboard/summary", { params: { startDate, endDate } }).then((r) => r.data);

export const getDailyChart = (startDate: string, endDate: string) =>
  posApi.get<DailyChartData[]>("/dashboard/daily-chart", { params: { startDate, endDate } }).then((r) => r.data);

export const getLowStock = (threshold?: number) =>
  posApi.get<LowStockProduct[]>("/dashboard/low-stock", { params: threshold ? { threshold } : {} }).then((r) => r.data);

export const getStockReport = () =>
  posApi.get<StockReport[]>("/dashboard/stock-report").then((r) => r.data);

export const getMonthlyChart = () =>
  posApi.get<DailyChartData[]>("/dashboard/monthly-chart").then((r) => r.data);

export const getExpiringProducts = () =>
  posApi.get<ExpiringProduct[]>("/dashboard/expiring").then((r) => r.data);

export const getRefillReminders = () =>
  posApi.get<RefillReminder[]>("/dashboard/refill-reminders").then((r) => r.data);

export const getABCAnalysis = () =>
  posApi.get<ABCProduct[]>("/dashboard/abc-analysis").then((r) => r.data);

export const getDeadStockProducts = (days = 90) =>
  posApi.get<DeadStockProduct[]>(`/dashboard/dead-stock?days=${days}`).then((r) => r.data);

// ─── Settings ─────────────────────────────────────────────────
export const getSetting = () =>
  posApi.get<Setting>("/settings").then((r) => r.data);

export const upsertSetting = (data: SettingRequest) =>
  posApi.put("/settings", data).then((r) => r.data);

// ─── Promotions ───────────────────────────────────────────────
export const listPromotions = () =>
  posApi.get<Promotion[]>("/promotions").then((r) => r.data);

export const getPromotion = (id: string) =>
  posApi.get<Promotion>(`/promotions/${id}`).then((r) => r.data);

export const createPromotion = (data: PromotionRequest) =>
  posApi.post("/promotions", data).then((r) => r.data);

export const updatePromotion = (id: string, data: PromotionRequest) =>
  posApi.put(`/promotions/${id}`, data).then((r) => r.data);

export const deletePromotion = (id: string) =>
  posApi.delete(`/promotions/${id}`).then((r) => r.data);

export const applyPromotion = (data: ApplyPromotionRequest) =>
  posApi.post("/promotions/apply", data).then((r) => r.data);

// ─── Customer History ──────────────────────────────────────────
export const createCustomerHistory = (data: CustomerHistoryRequest) =>
  posApi.post("/customer-histories", data).then((r) => r.data);

export const getCustomerHistory = (customerCode: string) =>
  posApi.get(`/customer-histories/${customerCode}`).then((r) => r.data);

// ─── Patients ─────────────────────────────────────────────────
export const listPatients = () =>
  posApi.get<Patient[]>("/patients").then((r) => r.data);

export const getPatient = (id: string) =>
  posApi.get<Patient>(`/patients/${id}`).then((r) => r.data);

export const getPatientByCustomerCode = (customerCode: string) =>
  posApi.get<Patient>(`/patients/customer/${customerCode}`).then((r) => r.data);

export const createPatient = (data: PatientRequest) =>
  posApi.post<Patient>("/patients", data).then((r) => r.data);

export const updatePatient = (id: string, data: UpdatePatientRequest) =>
  posApi.put(`/patients/${id}`, data).then((r) => r.data);

export const deletePatient = (id: string) =>
  posApi.delete(`/patients/${id}`).then((r) => r.data);

export const checkAllergies = (patientId: string, data: AllergyCheckRequest) =>
  posApi.post<AllergyCheckResult[]>(`/patients/${patientId}/allergy-check`, data).then((r) => r.data);

// ─── Dispensing Logs ──────────────────────────────────────────
export const listDispensingLogs = () =>
  posApi.get<DispensingLog[]>("/dispensing-logs").then((r) => r.data);

export const getDispensingLog = (id: string) =>
  posApi.get(`/dispensing-logs/${id}`).then((r) => r.data);

export const getDispensingLogsByPatient = (patientId: string) =>
  posApi.get(`/dispensing-logs/patient/${patientId}`).then((r) => r.data);

export const createDispensingLog = (data: DispensingLogRequest) =>
  posApi.post<DispensingLog>("/dispensing-logs", data).then((r) => r.data);

// ─── Stock Transfers ──────────────────────────────────────────
export const listStockTransfers = () =>
  posApi.get<StockTransfer[]>("/stock-transfers").then((r) => r.data);

export const getStockTransfer = (id: string) =>
  posApi.get<StockTransfer>(`/stock-transfers/${id}`).then((r) => r.data);

export const createStockTransfer = (data: StockTransferRequest) =>
  posApi.post("/stock-transfers", data).then((r) => r.data);

export const approveStockTransfer = (id: string) =>
  posApi.patch(`/stock-transfers/${id}/approve`).then((r) => r.data);

export const rejectStockTransfer = (id: string) =>
  posApi.patch(`/stock-transfers/${id}/reject`).then((r) => r.data);

// ─── Reports ──────────────────────────────────────────────────
export const getReportUrl = (path: string, params?: Record<string, string | number>) => {
  const host = getPosHost();
  const token = getToken();
  const base = `${host}/api/pos/v1${path}`;
  const qp = new URLSearchParams();
  if (params) Object.entries(params).forEach(([k, v]) => qp.set(k, String(v)));
  if (token) qp.set("token", token);
  const qs = qp.toString();
  return qs ? `${base}?${qs}` : base;
};

export const downloadReport = async (path: string, params?: Record<string, string | number>, filename = "report") => {
  const token = getToken();
  const host = getPosHost();
  const response = await axios.get(`${host}/api/pos/v1${path}`, {
    params,
    responseType: "blob",
    headers: { Authorization: `Bearer ${token}` },
  });
  const url = URL.createObjectURL(response.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export const getPharmacyReportData = (key: "khy9" | "khy10" | "khy11" | "khy12" | "khy13", params: { startDate: string; endDate: string }) =>
  posApi.get<PharmacyReportResponse>(`/reports/pharmacy/${key}/data`, { params }).then((r) => r.data);

export const downloadBarcodePdf = async (data: BarcodeRequest) => {
  const token = getToken();
  const host = getPosHost();
  const response = await axios.post(`${host}/api/pos/v1/reports/barcodes/pdf`, data, {
    responseType: "blob",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  const url = URL.createObjectURL(response.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = "barcodes.pdf";
  a.click();
  URL.revokeObjectURL(url);
};
