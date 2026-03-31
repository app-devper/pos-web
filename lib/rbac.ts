import { getCurrentUser } from "./auth";
import type { Role } from "@/types/um";

// Role hierarchy - higher index = more permissions
const ROLE_HIERARCHY: Role[] = ["USER", "ADMIN", "SUPER"];

/**
 * Check if current user has at least the required role
 * SUPER > ADMIN > USER
 */
export function hasRole(requiredRole: Role): boolean {
  const user = getCurrentUser();
  if (!user) return false;
  
  const userRoleIndex = ROLE_HIERARCHY.indexOf(user.role);
  const requiredRoleIndex = ROLE_HIERARCHY.indexOf(requiredRole);
  
  if (userRoleIndex === -1 || requiredRoleIndex === -1) return false;
  return userRoleIndex >= requiredRoleIndex;
}

/**
 * Check if user has any of the specified roles
 */
export function hasAnyRole(roles: Role[]): boolean {
  const user = getCurrentUser();
  if (!user) return false;
  return roles.includes(user.role);
}

/**
 * Check if user has all of the specified roles
 */
export function hasAllRoles(roles: Role[]): boolean {
  const user = getCurrentUser();
  if (!user) return false;
  return roles.every((role) => user.role === role);
}

/**
 * Get current user's role
 */
export function getUserRole(): Role | null {
  const user = getCurrentUser();
  return user?.role ?? null;
}

/**
 * Check if user is admin or super
 */
export function isAdmin(): boolean {
  return hasAnyRole(["ADMIN", "SUPER"]);
}

/**
 * Check if user is super admin
 */
export function isSuper(): boolean {
  return hasRole("SUPER");
}

/**
 * Navigation item with RBAC
 */
export interface NavItem {
  href: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  roles?: Role[];
  feature?: string;
}

/**
 * Filter navigation items based on current user's role
 */
export function filterNavItems(items: NavItem[]): NavItem[] {
  return items.filter((item) => {
    if (item.roles && !hasAnyRole(item.roles)) return false;
    return true;
  });
}

/**
 * Permission matrix for fine-grained access control
 */
export type Permission = 
  | "products:read" | "products:create" | "products:update" | "products:delete"
  | "orders:read" | "orders:create" | "orders:update" | "orders:delete"
  | "customers:read" | "customers:create" | "customers:update" | "customers:delete"
  | "suppliers:read" | "suppliers:create" | "suppliers:update" | "suppliers:delete"
  | "receives:read" | "receives:create" | "receives:update" | "receives:delete"
  | "promotions:read" | "promotions:create" | "promotions:update" | "promotions:delete"
  | "reports:read"
  | "users:read" | "users:create" | "users:update" | "users:delete"
  | "branches:read" | "branches:create" | "branches:update" | "branches:delete"
  | "settings:read" | "settings:update";

/**
 * Role-based permission mapping
 */
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  SUPER: [
    "products:read", "products:create", "products:update", "products:delete",
    "orders:read", "orders:create", "orders:update", "orders:delete",
    "customers:read", "customers:create", "customers:update", "customers:delete",
    "suppliers:read", "suppliers:create", "suppliers:update", "suppliers:delete",
    "receives:read", "receives:create", "receives:update", "receives:delete",
    "promotions:read", "promotions:create", "promotions:update", "promotions:delete",
    "reports:read",
    "users:read", "users:create", "users:update", "users:delete",
    "branches:read", "branches:create", "branches:update", "branches:delete",
    "settings:read", "settings:update",
  ],
  ADMIN: [
    "products:read", "products:create", "products:update", "products:delete",
    "orders:read", "orders:create", "orders:update", "orders:delete",
    "customers:read", "customers:create", "customers:update", "customers:delete",
    "suppliers:read", "suppliers:create", "suppliers:update", "suppliers:delete",
    "receives:read", "receives:create", "receives:update", "receives:delete",
    "promotions:read", "promotions:create", "promotions:update", "promotions:delete",
    "reports:read",
    "users:read", "users:create", "users:update",
    "branches:read", "branches:create", "branches:update",
    "settings:read", "settings:update",
  ],
  USER: [
    "products:read",
    "orders:read", "orders:create",
    "customers:read", "customers:create", "customers:update",
    "suppliers:read",
    "receives:read",
    "promotions:read",
    "settings:read",
  ],
};

/**
 * Check if current user has a specific permission
 */
export function hasPermission(permission: Permission): boolean {
  const user = getCurrentUser();
  if (!user) return false;
  
  const permissions = ROLE_PERMISSIONS[user.role] ?? [];
  return permissions.includes(permission);
}

/**
 * Check if user has any of the specified permissions
 */
export function hasAnyPermission(permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(p));
}

/**
 * React hook for checking permissions (re-evaluates when user changes)
 * Note: This is a simple version that reads from localStorage on each call
 * For reactive updates, use with a proper state management solution
 */
export function usePermission(permission: Permission): boolean {
  return hasPermission(permission);
}

export function useRole(requiredRole: Role): boolean {
  return hasRole(requiredRole);
}
