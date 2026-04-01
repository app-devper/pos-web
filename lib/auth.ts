import type { User } from "@/types/um";

const TOKEN_KEY = "pos_access_token";
const POS_HOST_KEY = "pos_api_host";
const USER_KEY = "pos_user_info";
const COOKIE_TOKEN_KEY = "pos_token";

function setCookie(name: string, value: string) {
  const isSecure = window.location.protocol === "https:";
  document.cookie = `${name}=${value};path=/;max-age=86400;SameSite=Strict${isSecure ? ";Secure" : ""}`;
}

function removeCookie(name: string) {
  document.cookie = `${name}=;path=/;max-age=0;SameSite=Strict`;
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
  setCookie(COOKIE_TOKEN_KEY, token);
}

export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  removeCookie(COOKIE_TOKEN_KEY);
}

export function getPosHost(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(POS_HOST_KEY);
}

export function setPosHost(host: string): void {
  localStorage.setItem(POS_HOST_KEY, host);
}

export function removePosHost(): void {
  localStorage.removeItem(POS_HOST_KEY);
}

export function getCurrentUser(): User | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function setCurrentUser(user: User): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function removeUserInfo(): void {
  localStorage.removeItem(USER_KEY);
}

export function clearSession(): void {
  removeToken();
  removePosHost();
  removeUserInfo();
}

export function isAuthenticated(): boolean {
  return !!getToken();
}
