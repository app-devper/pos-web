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

export const authLogin = (data: LoginRequest): Promise<LoginResponse> =>
  umApi.post("/auth/login", data);

export const authKeepAlive = (): Promise<KeepAliveResponse> =>
  umApi.get("/auth/keep-alive").then((response) => {
    const data = response as unknown as KeepAliveResponse;
    setToken(data.accessToken);
    return data;
  });

export const authGetSystem = (): Promise<System> =>
  umApi.get("/auth/system");

export const authLogout = (): Promise<MessageResponse> =>
  umApi.post("/auth/logout");

export const getMyInfo = (): Promise<User> =>
  umApi.get("/user/info");

export const listUsers = (): Promise<User[]> =>
  umApi.get("/user");

export const getUser = (id: string): Promise<User> =>
  umApi.get(`/user/${id}`);

export const createUser = (data: CreateUserRequest): Promise<User> =>
  umApi.post("/user", data);

export const updateUser = (id: string, data: UpdateUserRequest): Promise<User> =>
  umApi.put(`/user/${id}`, data);

export const deleteUser = (id: string): Promise<User> =>
  umApi.delete(`/user/${id}`);

export const updateUserStatus = (id: string, data: UpdateStatusRequest): Promise<User> =>
  umApi.patch(`/user/${id}/status`, data);

export const updateUserRole = (id: string, data: UpdateRoleRequest): Promise<User> =>
  umApi.patch(`/user/${id}/role`, data);

export const setUserPassword = (id: string, data: SetPasswordRequest): Promise<User> =>
  umApi.patch(`/user/${id}/set-password`, data);

export const changePassword = (data: ChangePasswordRequest): Promise<MessageResponse> =>
  umApi.patch("/user/change-password", data);
