import { posApi } from "./client";
import type { Receive, CreateReceiveRequest, UpdateReceiveRequest, ReceiveItemData, Employee, EmployeeRequest } from "@/types/pos";

// Receives
export const listReceives = (startDate: string, endDate: string): Promise<Receive[]> => 
  posApi.get("/receives", { params: { startDate, endDate } });
export const getReceive = (receiveId: string): Promise<Receive> => 
  posApi.get(`/receives/${receiveId}`);
export const createReceive = (data: CreateReceiveRequest): Promise<Receive> => 
  posApi.post("/receives", data);
export const updateReceive = (receiveId: string, data: UpdateReceiveRequest): Promise<Receive> => 
  posApi.put(`/receives/${receiveId}`, data);
export const deleteReceive = (receiveId: string): Promise<unknown> => 
  posApi.delete(`/receives/${receiveId}`);
export const updateReceiveTotalCost = (receiveId: string, data: { totalCost: number }): Promise<Receive> => 
  posApi.patch(`/receives/${receiveId}/total-cost`, data);
export const updateReceiveItems = (receiveId: string, data: { items: ReceiveItemData[] }): Promise<Receive> => 
  posApi.patch(`/receives/${receiveId}/items`, data);
export const importReceiveToStock = (receiveId: string): Promise<Receive> => 
  posApi.patch(`/receives/${receiveId}/import`);

// Branches
export const listBranches = (): Promise<any[]> => posApi.get("/branches");
export const getBranch = (branchId: string): Promise<any> => posApi.get(`/branches/${branchId}`);
export const createBranch = (data: unknown): Promise<any> => posApi.post("/branches", data);
export const updateBranch = (branchId: string, data: unknown): Promise<any> => posApi.put(`/branches/${branchId}`, data);
export const deleteBranch = (branchId: string): Promise<unknown> => posApi.delete(`/branches/${branchId}`);
export const updateBranchStatus = (branchId: string, data: { status: string }): Promise<unknown> => posApi.patch(`/branches/${branchId}/status`, data);

// Employees
export const listEmployees = (): Promise<Employee[]> => posApi.get("/employees");
export const getEmployee = (employeeId: string): Promise<Employee> => posApi.get(`/employees/${employeeId}`);
export const getEmployeesByBranch = (branchId: string): Promise<Employee[]> => posApi.get(`/employees/branch/${branchId}`);
export const createEmployee = (data: EmployeeRequest): Promise<Employee> => posApi.post("/employees", data);
export const updateEmployee = (employeeId: string, data: Omit<EmployeeRequest, "userId">): Promise<Employee> => posApi.put(`/employees/${employeeId}`, data);
export const deleteEmployee = (employeeId: string): Promise<unknown> => posApi.delete(`/employees/${employeeId}`);
