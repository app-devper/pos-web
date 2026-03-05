"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  LayoutDashboard, Package, ShoppingCart, Tag, Users, Truck,
  ClipboardList, Building2, Settings, FileText,
  Receipt, CreditCard, FileCheck, Percent, Heart, Pill,
  ArrowLeftRight, BarChart3, LogOut, ChevronRight, UserCircle,
} from "lucide-react";
import { authLogout } from "@/lib/um-api";
import { clearSession, getCurrentUser } from "@/lib/auth";
import { useSettings } from "@/components/SettingsContext";

const mainGroup = {
  label: "หลัก",
  items: [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/sale", label: "ขายสินค้า", icon: ShoppingCart },
    { href: "/orders", label: "รายการขาย", icon: Receipt },
    { href: "/products", label: "สินค้า", icon: Package },
    { href: "/categories", label: "หมวดหมู่", icon: Tag },
    { href: "/customers", label: "ลูกค้า", icon: Users },
  ],
};

const managementGroup = {
  label: "การจัดการ",
  items: [
    { href: "/suppliers", label: "ผู้จัดจำหน่าย", icon: Truck, roles: ["ADMIN", "SUPER"] as string[] },
    { href: "/receives", label: "รับสินค้า (GR)", icon: ClipboardList, roles: ["ADMIN", "SUPER"] as string[] },
    { href: "/promotions", label: "โปรโมชัน", icon: Percent, roles: ["ADMIN", "SUPER"] as string[] },
    { href: "/stock-transfers", label: "โอนสต็อก", icon: ArrowLeftRight, roles: ["ADMIN", "SUPER"] as string[] },
  ],
};

const pharmacyGroup = {
  label: "ร้านยา",
  items: [
    { href: "/patients", label: "ผู้ป่วย", icon: Heart, feature: "patientLinking" as const },
    { href: "/dispensing-logs", label: "บันทึกจ่ายยา", icon: Pill },
    { href: "/batches", label: "จัดการล็อต", icon: ClipboardList, feature: "batchTracking" as const },
  ],
};

const reportGroup = {
  label: "รายงาน",
  items: [
    { href: "/reports", label: "รายงาน", icon: BarChart3, roles: ["ADMIN", "SUPER"] as string[] },
  ],
};

const adminGroup = {
  label: "ผู้ดูแลระบบ",
  items: [
    { href: "/branches", label: "จัดการสาขา", icon: Building2 },
    { href: "/users", label: "จัดการผู้ใช้", icon: UserCircle },
    { href: "/settings", label: "การตั้งค่า", icon: Settings },
  ],
};

const accountGroup = {
  label: "บัญชี",
  items: [
    { href: "/profile", label: "โปรไฟล์", icon: UserCircle },
  ],
};

export default function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const currentUser = getCurrentUser();
  const role = currentUser?.role ?? "USER";
  const { isFeatureEnabled } = useSettings();

  const navGroups = [
    mainGroup,
    managementGroup,
    pharmacyGroup,
    reportGroup,
    ...(role === "ADMIN" || role === "SUPER" ? [adminGroup] : []),
    accountGroup,
  ].map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      const feat = (item as { feature?: string }).feature;
      if (feat && !isFeatureEnabled(feat)) return false;
      const roles = (item as { roles?: string[] }).roles;
      if (roles && !roles.includes(role)) return false;
      return true;
    }),
  })).filter((g) => g.items.length > 0);

  async function handleLogout() {
    try {
      await authLogout();
    } catch {
      // ignore
    }
    clearSession();
    toast.success("ออกจากระบบแล้ว");
    router.replace("/login");
  }

  return (
    <div className="flex flex-col h-full bg-background border-r">
      <div className="px-4 py-4 border-b">
        <h1 className="font-bold text-lg text-primary">POS Pharma</h1>
        <p className="text-xs text-muted-foreground">ระบบขายหน้าร้าน</p>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2 min-h-0">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-3">
            <p className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {group.label}
            </p>
            {group.items.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                    active
                      ? "bg-primary text-primary-foreground font-medium"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1">{label}</span>
                  {active && <ChevronRight className="h-3 w-3" />}
                </Link>
              );
            })}
            <Separator className="mt-2" />
          </div>
        ))}
      </div>

      <div className="p-3 border-t">
        <Button variant="ghost" className="w-full justify-start gap-2 text-destructive hover:text-destructive" onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
          ออกจากระบบ
        </Button>
      </div>
    </div>
  );
}
