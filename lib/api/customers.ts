import { posApi } from "./client";
import type { Customer, CustomerRequest, Category, CategoryRequest } from "@/types/pos";

// Categories
export const listCategories = (): Promise<Category[]> => posApi.get("/categories");
export const getCategory = (categoryId: string): Promise<Category> => posApi.get(`/categories/${categoryId}`);
export const createCategory = (data: CategoryRequest): Promise<Category> => posApi.post("/categories", data);
export const updateCategory = (categoryId: string, data: CategoryRequest): Promise<Category> => posApi.put(`/categories/${categoryId}`, data);
export const deleteCategory = (categoryId: string): Promise<unknown> => posApi.delete(`/categories/${categoryId}`);
export const setDefaultCategory = (categoryId: string): Promise<unknown> => posApi.patch(`/categories/${categoryId}/default`);

// Customers
export const listCustomers = (): Promise<Customer[]> => posApi.get("/customers");
export const getCustomer = (customerId: string): Promise<Customer> => posApi.get(`/customers/${customerId}`);
export const getCustomerByCode = (customerCode: string): Promise<Customer> => posApi.get(`/customers/code/${customerCode}`);
export const createCustomer = (data: CustomerRequest): Promise<Customer> => posApi.post("/customers", data);
export const updateCustomer = (customerId: string, data: CustomerRequest): Promise<Customer> => posApi.put(`/customers/${customerId}`, data);
export const deleteCustomer = (customerId: string): Promise<unknown> => posApi.delete(`/customers/${customerId}`);
export const updateCustomerStatus = (customerId: string, data: { status: string }): Promise<unknown> => posApi.patch(`/customers/${customerId}/status`, data);

// Suppliers
export const listSuppliers = (): Promise<any[]> => posApi.get("/suppliers");
export const getSupplier = (supplierId: string): Promise<any> => posApi.get(`/suppliers/${supplierId}`);
export const createSupplier = (data: unknown): Promise<any> => posApi.post("/suppliers", data);
export const updateSupplier = (supplierId: string, data: unknown): Promise<any> => posApi.put(`/suppliers/${supplierId}`, data);
export const deleteSupplier = (supplierId: string): Promise<unknown> => posApi.delete(`/suppliers/${supplierId}`);
export const getSupplierInfo = (): Promise<any> => posApi.get("/suppliers/info");
export const updateSupplierInfo = (data: unknown): Promise<any> => posApi.put("/suppliers/info", data);
