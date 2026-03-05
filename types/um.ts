export type Role = "SUPER" | "ADMIN" | "USER";
export type UserStatus = "ACTIVE" | "INACTIVE";

export interface User {
  id: string;
  firstName?: string;
  lastName?: string;
  username: string;
  clientId: string;
  role: Role;
  status: UserStatus;
  phone?: string;
  email?: string;
  createdBy?: string;
  createdDate?: string;
  updatedBy?: string;
  updatedDate?: string;
}

export interface System {
  id: string;
  clientId: string;
  systemName: string;
  systemCode: string;
  host: string;
}

export interface LoginRequest {
  username: string;
  password: string;
  system: string;
}

export interface LoginResponse {
  accessToken: string;
}

export interface KeepAliveResponse {
  accessToken: string;
}

export interface CreateUserRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  username: string;
  password: string;
  clientId: string;
}

export interface UpdateUserRequest {
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
}

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

export interface SetPasswordRequest {
  password: string;
}

export interface UpdateRoleRequest {
  role: Role;
}

export interface UpdateStatusRequest {
  status: UserStatus;
}

export interface MessageResponse {
  message: string;
}

export interface AppError {
  code: string;
  message: string;
}
