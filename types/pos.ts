export interface ErrorResponse {
  errcode: string;
  error: string;
}

// ─── Product ───────────────────────────────────────────────
export interface DrugInfo {
  genericName?: string;
  drugType?: "OTC" | "DANGEROUS" | "CONTROLLED" | "PSYCHO" | "NARCOTIC";
  dosageForm?: string;
  strength?: string;
  indication?: string;
  dosage?: string;
  sideEffects?: string;
  contraindications?: string;
  storageCondition?: string;
  manufacturer?: string;
  registrationNo?: string;
  isControlled?: boolean;
  drugInteractions?: string[];
}

export interface ProductUnit {
  id: string;
  productId: string;
  unit: string;
  size: number;
  costPrice: number;
  volume?: number;
  volumeUnit?: string;
  barcode?: string;
}

export interface ProductPrice {
  id: string;
  productId: string;
  unitId?: string;
  customerType: string;
  price: number;
}

export interface ProductStock {
  id: string;
  productId: string;
  branchId: string;
  unitId: string;
  quantity: number;
  costPrice: number;
  price?: number;
  lotNumber?: string;
  receiveCode?: string;
  expireDate?: string;
  importDate?: string;
  sequence?: number;
}

export interface Product {
  id: string;
  name: string;
  nameEn?: string;
  description?: string;
  price: number;
  costPrice: number;
  unit: string;
  quantity: number;
  serialNumber: string;
  category?: string;
  status?: string;
  minStock?: number;
  drugInfo?: DrugInfo;
  drugRegistrations?: string[];
  createdDate?: string;
}

export interface ProductDetail extends Product {
  units: ProductUnit[];
  prices: ProductPrice[];
  stocks: ProductStock[];
}

export interface CreateProductRequest {
  name: string;
  nameEn?: string;
  description?: string;
  price: number;
  costPrice: number;
  unit: string;
  serialNumber: string;
  category?: string;
  status?: string;
  minStock?: number;
  drugInfo?: DrugInfo;
  drugRegistrations?: string[];
}

export interface UpdateProductRequest {
  name: string;
  nameEn?: string;
  description?: string;
  category?: string;
  status?: string;
  minStock?: number;
  drugInfo?: DrugInfo;
  drugRegistrations?: string[];
}

export interface ProductStockRequest {
  productId: string;
  branchId?: string;
  unitId?: string;
  quantity: number;
  costPrice?: number;
  price?: number;
  lotNumber?: string;
  receiveCode?: string;
  expireDate?: string;
  importDate?: string;
}

export interface UpdateProductStockRequest {
  productId?: string;
  unitId?: string;
  costPrice?: number;
  price?: number;
  lotNumber?: string;
  expireDate?: string;
  importDate?: string;
}

export interface ProductHistory {
  id: string;
  type: string;
  description: string;
  unit: string;
  import: number;
  quantity: number;
  costPrice: number;
  price: number;
  balance: number;
  createdDate: string;
}

export interface ProductUnitRequest {
  productId?: string;
  unit?: string;
  size?: number;
  costPrice?: number;
  price?: number;
  volume?: number;
  volumeUnit?: string;
  barcode?: string;
}

// ─── Order ────────────────────────────────────────────────
export interface Order {
  id: string;
  branchId: string;
  code: string;
  customerCode?: string;
  customerName?: string;
  patientId?: string;
  pharmacistName?: string;
  prescriberName?: string;
  buyerName?: string;
  buyerIdCard?: string;
  status: string;
  total: number;
  totalCost: number;
  discount?: number;
  type: string;
  createdDate?: string;
}

export interface OrderItemStock {
  quantity: number;
  stockId: string;
}

export interface OrderItem {
  productId: string;
  unitId: string;
  quantity: number;
  price: number;
  costPrice?: number;
  discount?: number;
  stocks: OrderItemStock[];
}

export interface OrderPayment {
  type: "CASH" | "CREDIT" | "PROMPTPAY" | "TRANSFER";
  amount: number;
}

export interface CreateOrderRequest {
  customerCode?: string;
  customerName?: string;
  patientId?: string;
  pharmacistName?: string;
  prescriberName?: string;
  buyerName?: string;
  buyerIdCard?: string;
  items: OrderItem[];
  payments: OrderPayment[];
  type: "CASH" | "CREDIT" | "PROMPTPAY" | "TRANSFER";
  amount: number;
  total: number;
  discount?: number;
  change?: number;
  message?: string;
}

// ─── Category ─────────────────────────────────────────────
export interface Category {
  id: string;
  name: string;
  isDefault?: boolean;
}

export interface CategoryRequest {
  name: string;
}

// ─── Customer ─────────────────────────────────────────────
export interface Customer {
  id: string;
  customerType?: "General" | "Wholesaler" | "Regular";
  name: string;
  code?: string;
  address?: string;
  phone?: string;
  email?: string;
  status?: string;
}

export interface CustomerRequest {
  customerType?: "General" | "Wholesaler" | "Regular";
  name: string;
  address?: string;
  phone?: string;
  email?: string;
}

// ─── Supplier ─────────────────────────────────────────────
export interface Supplier {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  taxId?: string;
}

// ─── Branch ───────────────────────────────────────────────
export interface Branch {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  status?: string;
}

// ─── Employee ─────────────────────────────────────────────
export interface Employee {
  id: string;
  branchId: string;
  name: string;
  position?: string;
  phone?: string;
  email?: string;
}

// ─── Setting ──────────────────────────────────────────────
export interface Setting {
  id: string;
  branchId: string;
  receiptFooter?: string;
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyTaxId?: string;
  logoUrl?: string;
  showCredit?: boolean;
  promptPayId?: string;
  features?: Record<string, boolean>;
}

export interface SettingRequest {
  receiptFooter?: string;
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyTaxId?: string;
  logoUrl?: string;
  showCredit?: boolean;
  promptPayId?: string;
  features?: Record<string, boolean>;
}

// ─── Promotion ────────────────────────────────────────────
export interface Promotion {
  id: string;
  code: string;
  name: string;
  description?: string;
  type: "PERCENTAGE" | "FIXED";
  value: number;
  minPurchase?: number;
  maxDiscount?: number;
  startDate?: string;
  endDate?: string;
  productIds?: string[];
  status?: string;
}

export interface PromotionRequest {
  code: string;
  name: string;
  description?: string;
  type: "PERCENTAGE" | "FIXED";
  value: number;
  minPurchase?: number;
  maxDiscount?: number;
  startDate?: string;
  endDate?: string;
  productIds?: string[];
  status?: string;
}

export interface ApplyPromotionRequest {
  promotionCode: string;
  orderTotal: number;
  productIds?: string[];
}

// ─── Patient ──────────────────────────────────────────────
export interface DrugAllergy {
  drugName: string;
  reaction: string;
  severity: "MILD" | "MODERATE" | "SEVERE";
}

export interface Patient {
  id: string;
  branchId: string;
  customerCode: string;
  firstName?: string;
  lastName?: string;
  idCard?: string;
  phone?: string;
  email?: string;
  address?: string;
  dateOfBirth?: string;
  gender?: string;
  bloodType?: string;
  weight?: number;
  allergies?: DrugAllergy[];
  chronicDiseases?: string[];
  currentMedications?: string[];
  consentGiven?: boolean;
  consentDate?: string;
  note?: string;
  createdDate?: string;
}

export interface PatientRequest {
  customerCode: string;
  firstName?: string;
  lastName?: string;
  idCard?: string;
  phone?: string;
  email?: string;
  address?: string;
  dateOfBirth?: string;
  gender?: string;
  bloodType?: string;
  weight?: number;
  allergies?: DrugAllergy[];
  chronicDiseases?: string[];
  currentMedications?: string[];
  consentGiven?: boolean;
  consentDate?: string;
  note?: string;
}

export interface UpdatePatientRequest {
  firstName?: string;
  lastName?: string;
  idCard?: string;
  phone?: string;
  email?: string;
  address?: string;
  dateOfBirth?: string;
  gender?: string;
  bloodType?: string;
  weight?: number;
  allergies?: DrugAllergy[];
  chronicDiseases?: string[];
  currentMedications?: string[];
  consentGiven?: boolean;
  consentDate?: string;
  note?: string;
}

export interface AllergyCheckRequest {
  productIds: string[];
}

export interface AllergyCheckResult {
  productId: string;
  productName: string;
  drugName: string;
  reaction: string;
  severity: string;
}

// ─── Dispensing ───────────────────────────────────────────
export interface DispensingItem {
  productId: string;
  productName?: string;
  genericName?: string;
  quantity: number;
  unit?: string;
  dosage?: string;
  lotNumber?: string;
}

export interface DispensingLog {
  id: string;
  branchId: string;
  orderId: string;
  patientId: string;
  items: DispensingItem[];
  pharmacistName: string;
  licenseNo: string;
  note?: string;
  createdDate?: string;
}

export interface DispensingLogRequest {
  orderId: string;
  patientId: string;
  items: DispensingItem[];
  pharmacistName: string;
  licenseNo: string;
  note?: string;
}

// ─── Stock Transfer ───────────────────────────────────────
export interface StockTransferItem {
  productId: string;
  stockId?: string;
  quantity: number;
}

export interface StockTransfer {
  id: string;
  fromBranchId: string;
  toBranchId: string;
  items: StockTransferItem[];
  status: string;
  note?: string;
  createdDate?: string;
}

export interface StockTransferRequest {
  toBranchId: string;
  items: StockTransferItem[];
  note?: string;
}

// ─── Receive (GR) ────────────────────────────────────────
export interface ReceiveItemData {
  productId: string;
  costPrice: number;
  quantity: number;
  lotNumber?: string;
  expireDate?: string;
  unitId?: string;
  baseQuantity?: number;
}

export interface Receive {
  id: string;
  branchId: string;
  supplierId: string;
  code: string;
  reference?: string;
  totalCost: number;
  items: ReceiveItemData[];
  status?: string;
  createdDate?: string;
}

export interface CreateReceiveItemData {
  productId: string;
  costPrice: number;
  quantity: number;
  lotNumber: string;
  expireDate: string;
}

export interface CreateReceiveRequest {
  supplierId: string;
  reference?: string;
  items?: CreateReceiveItemData[];
}

export interface UpdateReceiveRequest {
  supplierId: string;
  reference?: string;
  totalCost: number;
  items: ReceiveItemData[];
}

export interface ProductReceiveRequest {
  name: string;
  serialNumber: string;
  price: number;
  costPrice: number;
  unit: string;
  quantity: number;
  lotNumber: string;
  expireDate: string;
  receiveId: string;
  category?: string;
  description?: string;
  nameEn?: string;
}

// ─── Product Lot ─────────────────────────────────────────
export interface ProductLot {
  id: string;
  productId: string;
  lotNumber: string;
  costPrice: number;
  quantity: number;
  expireDate: string;
  notify: boolean;
  createdDate?: string;
}

export interface ProductLotDetail extends ProductLot {
  product: Product;
}

// ─── Customer History ─────────────────────────────────────
export interface CustomerHistoryRequest {
  customerCode: string;
  type: string;
  description: string;
  reference?: string;
}

// ─── Dashboard ────────────────────────────────────────────
export interface DashboardSummary {
  totalOrders: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
}

export interface DailyChartData {
  date: string;
  totalOrders: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
}

export interface LowStockProduct {
  productId: string;
  name: string;
  serialNumber?: string;
  unit: string;
  totalStock: number;
}

export interface StockReport {
  productId: string;
  name: string;
  serialNumber?: string;
  unit: string;
  totalStock: number;
  totalCost: number;
}

export interface ExpiringProduct {
  id: string;
  productId: string;
  productName?: string;
  lotNumber: string;
  expireDate: string;
  quantity: number;
  product?: Product;
}

export interface RefillReminder {
  patientId: string;
  lastDispensed: string;
  estimatedRefill: string;
}

export interface ABCProduct {
  productId: string;
  productName: string;
  totalRevenue: number;
  totalQty: number;
  class: "A" | "B" | "C";
}

export interface DeadStockProduct {
  productId: string;
  productName: string;
  quantity: number;
  lastSold?: string;
  costPrice: number;
}

export interface CSVImportResult {
  success: number;
  failed: number;
  errors?: string[];
}

export interface DrugInteractionResult {
  productAId: string;
  productAName: string;
  productBId: string;
  productBName: string;
  interaction: string;
}

// ─── Employee ─────────────────────────────────────────────
export interface Employee {
  id: string;
  branchId: string;
  userId: string;
  role: string;
  createdBy?: string;
  createdDate?: string;
}

export interface EmployeeRequest {
  branchId: string;
  userId: string;
  role: string;
}

// ─── Barcode ──────────────────────────────────────────────
export interface BarcodeRequest {
  productIds: string[];
  copies?: number;
}
