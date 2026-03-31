import { createApiClient } from "./api-factory";
import { setToken } from "./auth";
import type {
  LoginRequest,
  LoginResponse,
  KeepAliveResponse,
  User,
  System,
  CreateUserRequest,
  UpdateUserRequest,
  ChangePasswordRequest,
  SetPasswordRequest,
  UpdateRoleRequest,
  UpdateStatusRequest,
  MessageResponse,
} from "@/types/um";

const umApi = createApiClient({
  baseURL: process.env.NEXT_PUBLIC_UM_API_URL,
});

export const authLogin = (data: LoginRequest) =>
  umApi.post<LoginResponse>("/auth/login", data).then((r) => r.data);

export const authKeepAlive = () =>
  umApi.get<KeepAliveResponse>("/auth/keep-alive").then((r) => {
    setToken(r.data.accessToken);
    return r.data;
  });

export const authGetSystem = () =>
  umApi.get<System>("/auth/system").then((r) => r.data);

export const authLogout = () =>
  umApi.post<MessageResponse>("/auth/logout").then((r) => r.data);

export const getMyInfo = () =>
  umApi.get<User>("/user/info").then((r) => r.data);

export const listUsers = () =>
  umApi.get<User[]>("/user").then((r) => r.data);

export const getUser = (id: string) =>
  umApi.get<User>(`/user/${id}`).then((r) => r.data);

export const createUser = (data: CreateUserRequest) =>
  umApi.post<User>("/user", data).then((r) => r.data);

export const updateUser = (id: string, data: UpdateUserRequest) =>
  umApi.put<User>(`/user/${id}`, data).then((r) => r.data);

export const deleteUser = (id: string) =>
  umApi.delete<User>(`/user/${id}`).then((r) => r.data);

export const updateUserStatus = (id: string, data: UpdateStatusRequest) =>
  umApi.patch<User>(`/user/${id}/status`, data).then((r) => r.data);

export const updateUserRole = (id: string, data: UpdateRoleRequest) =>
  umApi.patch<User>(`/user/${id}/role`, data).then((r) => r.data);

export const setUserPassword = (id: string, data: SetPasswordRequest) =>
  umApi.patch<User>(`/user/${id}/set-password`, data).then((r) => r.data);

export const changePassword = (data: ChangePasswordRequest) =>
  umApi.patch<MessageResponse>("/user/change-password", data).then((r) => r.data);
