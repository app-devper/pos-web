import { posApi } from "./client";
import { downloadBlob } from "../utils";
import type { Order, OrderDetail, CreateOrderRequest } from "@/types/pos";

export const createOrder = (data: CreateOrderRequest): Promise<Order> =>
  posApi.post("/orders", data).then((r: any) => r?.data ?? r);

export const listOrders = (startDate: string, endDate: string): Promise<Order[]> =>
  posApi.get("/orders", { params: { startDate, endDate } });

export const getOrder = (orderId: string): Promise<OrderDetail> =>
  posApi.get(`/orders/${orderId}`);

export const deleteOrder = (orderId: string): Promise<unknown> =>
  posApi.delete(`/orders/${orderId}`);

export const updateOrderCustomerCode = (orderId: string, data: unknown): Promise<unknown> =>
  posApi.patch(`/orders/${orderId}/customer-code`, data);

export const getOrdersByCustomer = (customerCode: string): Promise<Order[]> =>
  posApi.get(`/orders/customers/${customerCode}`);

export const listOrderItems = (startDate: string, endDate: string): Promise<any> =>
  posApi.get("/orders/items", { params: { startDate, endDate } });

export const getOrderItem = (itemId: string): Promise<any> =>
  posApi.get(`/orders/items/${itemId}`);

export const printPrescriptionLabel = async (orderId: string, size: "8x5" | "5x3" = "8x5"): Promise<void> => {
  const response = await posApi.get<Blob>(`/orders/${orderId}/prescription-label`, { 
    params: { size }, 
    responseType: "blob" 
  });
  const url = window.URL.createObjectURL(response as unknown as Blob);
  const w = window.open(url);
  if (w) w.print();
};

export const deleteOrderItem = (itemId: string): Promise<unknown> =>
  posApi.delete(`/orders/items/${itemId}`);

export const deleteOrderItemByOrderProduct = (orderId: string, productId: string): Promise<unknown> =>
  posApi.delete(`/orders/${orderId}/products/${productId}`);
