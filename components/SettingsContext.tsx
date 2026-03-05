"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getSetting } from "@/lib/pos-api";
import type { Setting } from "@/types/pos";

interface SettingsContextValue {
  setting: Setting | null;
  loading: boolean;
  reload: () => void;
  isFeatureEnabled: (key: string) => boolean;
}

const SettingsContext = createContext<SettingsContextValue>({
  setting: null,
  loading: true,
  reload: () => {},
  isFeatureEnabled: () => false,
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [setting, setSetting] = useState<Setting | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    getSetting()
      .then(setSetting)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const isFeatureEnabled = (key: string) => setting?.features?.[key] ?? false;

  return (
    <SettingsContext.Provider value={{ setting, loading, reload: load, isFeatureEnabled }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);
