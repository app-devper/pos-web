"use client";

import { useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import Sidebar from "@/components/Sidebar";
import { ProductCacheProvider } from "@/components/ProductCacheContext";
import { SettingsProvider } from "@/components/SettingsContext";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { ConfirmDialogProvider } from "@/components/ConfirmDialog";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <AuthGuard>
      <SettingsProvider>
      <ProductCacheProvider>
      <ConfirmDialogProvider>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md">ข้ามไปยังเนื้อหาหลัก</a>
      <div className="flex h-screen overflow-hidden">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex md:w-60 lg:w-64 shrink-0 flex-col">
          <Sidebar />
        </aside>

        {/* Mobile sidebar */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="fixed top-3 left-3 z-50 md:hidden"
              aria-label="เปิดเมนู"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64">
            <Sidebar onClose={() => setOpen(false)} />
          </SheetContent>
        </Sheet>

        {/* Main content */}
        <main id="main-content" className="flex-1 overflow-y-auto bg-muted/30">
          <div className="p-4 md:p-6">{children}</div>
        </main>
      </div>
      </ConfirmDialogProvider>
      </ProductCacheProvider>
      </SettingsProvider>
    </AuthGuard>
  );
}
