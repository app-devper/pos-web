"use client";

import { createContext, useContext, useEffect, useReducer, type ReactNode } from "react";
import { toast } from "sonner";
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

type State = { setting: Setting | null; loading: boolean };
type Action = { type: "loading" } | { type: "loaded"; setting: Setting } | { type: "error" };

function reducer(_state: State, action: Action): State {
  switch (action.type) {
    case "loading": return { setting: _state.setting, loading: true };
    case "loaded": return { setting: action.setting, loading: false };
    case "error": return { setting: _state.setting, loading: false };
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { setting: null, loading: true });

  useEffect(() => {
    let cancelled = false;
    dispatch({ type: "loading" });
    getSetting()
      .then((s) => { if (!cancelled) dispatch({ type: "loaded", setting: s }); })
      .catch((err) => {
        if (!cancelled) {
          dispatch({ type: "error" });
          toast.error("ไม่สามารถโหลดการตั้งค่าได้");
          console.error("Failed to load settings:", err);
        }
      });
    return () => { cancelled = true; };
  }, []);

  const reload = () => {
    dispatch({ type: "loading" });
    getSetting()
      .then((s) => dispatch({ type: "loaded", setting: s }))
      .catch((err) => {
        dispatch({ type: "error" });
        toast.error("ไม่สามารถโหลดการตั้งค่าได้");
        console.error("Failed to reload settings:", err);
      });
  };

  const isFeatureEnabled = (key: string) => state.setting?.features?.[key] ?? false;

  return (
    <SettingsContext.Provider value={{ setting: state.setting, loading: state.loading, reload, isFeatureEnabled }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);
