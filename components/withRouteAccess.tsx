"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSettings } from "@/components/SettingsContext";
import { hasRole } from "@/lib/rbac";
import type { Role } from "@/types/um";

interface RouteAccessOptions {
  roles?: Role[];
  feature?: string;
  redirectTo?: string;
}

function AccessFallback() {
  return (
    <div className="flex justify-center py-20">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
}

export function withRouteAccess<P extends object>(
  Component: React.ComponentType<P>,
  options: RouteAccessOptions
) {
  const { roles, feature, redirectTo = "/dashboard" } = options;

  return function GuardedRoute(props: P) {
    const router = useRouter();
    const { loading: settingsLoading, isFeatureEnabled } = useSettings();

    const roleAllowed = !roles || roles.some((role) => hasRole(role));
    const featureReady = !feature || !settingsLoading;
    const featureAllowed = !feature || isFeatureEnabled(feature);
    const allowed = roleAllowed && featureAllowed;

    useEffect(() => {
      if (featureReady && !allowed) {
        router.replace(redirectTo);
      }
    }, [allowed, featureReady, router]);

    if (!featureReady || !allowed) {
      return <AccessFallback />;
    }

    return <Component {...props} />;
  };
}
