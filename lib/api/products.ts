import { posApi } from "./client";
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
  CSVImportResult,
  DrugInteractionResult,
  ProductLot,
  ProductLotDetail,
  ProductReceiveRequest,
} from "@/types/pos";

export const listProducts = (category?: string): Promise<ProductDetail[]> =>
  posApi.get("/products", { params: category ? { category } : {} });

export const getProduct = (productId: string): Promise<ProductDetail> =>
  posApi.get(`/products/${productId}`);

export const createProduct = (data: CreateProductRequest): Promise<Product> =>
  posApi.post("/products", data);

export const updateProduct = (productId: string, data: UpdateProductRequest): Promise<unknown> =>
  posApi.put(`/products/${productId}`, data);

export const deleteProduct = (productId: string): Promise<unknown> =>
  posApi.delete(`/products/${productId}`);

export const clearSoldFirst = (productId: string): Promise<unknown> =>
  posApi.delete(`/products/${productId}/sold-first`);

export const getProductBySerial = (serialNumber: string): Promise<ProductDetail> =>
  posApi.get(`/products/serial-number/${serialNumber}`);

export const generateSerialNumber = (): Promise<string> =>
  posApi.get("/products/serial-number");

export const getProductStocks = (productId: string): Promise<ProductStock[]> =>
  posApi.get(`/products/${productId}/stocks`);

export const getProductHistories = (productId: string): Promise<ProductHistory[]> =>
  posApi.get(`/products/${productId}/histories`);

export const createProductStock = (data: ProductStockRequest): Promise<unknown> =>
  posApi.post("/products/stocks", data);

export const updateProductStock = (stockId: string, data: UpdateProductStockRequest): Promise<unknown> =>
  posApi.put(`/products/stocks/${stockId}`, data);

export const deleteProductStock = (stockId: string): Promise<unknown> =>
  posApi.delete(`/products/stocks/${stockId}`);

export const updateStockQuantity = (stockId: string, data: unknown): Promise<unknown> =>
  posApi.patch(`/products/stocks/${stockId}/quantity`, data);

export const updateStockSequence = (stocks: { stockId: string; sequence: number }[]): Promise<unknown> =>
  posApi.patch("/products/stocks/sequence", { stocks });

export const getProductUnits = (productId: string): Promise<ProductUnit[]> =>
  posApi.get(`/products/${productId}/units`);

export const createProductUnit = (data: CreateProductUnitRequest): Promise<ProductUnit> =>
  posApi.post("/products/units", data);

export const updateProductUnit = (unitId: string, data: ProductUnitRequest): Promise<unknown> =>
  posApi.put(`/products/units/${unitId}`, data);

export const deleteProductUnit = (unitId: string): Promise<unknown> =>
  posApi.delete(`/products/units/${unitId}`);

export const getProductPrices = (productId: string): Promise<unknown> =>
  posApi.get(`/products/${productId}/prices`);

export const createProductPrice = (data: unknown): Promise<unknown> =>
  posApi.post("/products/prices", data);

export const updateProductPrice = (priceId: string, data: unknown): Promise<unknown> =>
  posApi.put(`/products/prices/${priceId}`, data);

export const deleteProductPrice = (priceId: string): Promise<unknown> =>
  posApi.delete(`/products/prices/${priceId}`);

export const checkExpireLots = (): Promise<ProductLotDetail[]> =>
  posApi.get("/products/lots/expire-notify");

export const createProductWithReceive = (data: ProductReceiveRequest): Promise<unknown> =>
  posApi.post("/products/receive", data);

export const checkDrugInteractions = (productIds: string[]): Promise<{ interactions: DrugInteractionResult[] }> =>
  posApi.post("/products/drug-interaction-check", { productIds });

export const importProductsCsv = (file: File): Promise<CSVImportResult> => {
  const formData = new FormData();
  formData.append("file", file);
  return posApi.post("/products/import-csv", formData, { headers: { "Content-Type": "multipart/form-data" } });
};

export const listLots = (startDate?: string, endDate?: string): Promise<ProductLot[]> =>
  posApi.get("/products/lots", { params: startDate && endDate ? { startDate, endDate } : {} });

export const getLot = (lotId: string): Promise<ProductLot> =>
  posApi.get(`/products/lots/${lotId}`);

export const createLot = (data: { productId: string; quantity: number; lotNumber: string; expireDate: string; costPrice: number }): Promise<unknown> =>
  posApi.post("/products/lots", data);

export const updateLot = (lotId: string, data: { quantity?: number; lotNumber: string; expireDate: string; costPrice: number }): Promise<unknown> =>
  posApi.put(`/products/lots/${lotId}`, data);

export const deleteLot = (lotId: string): Promise<unknown> =>
  posApi.delete(`/products/lots/${lotId}`);
