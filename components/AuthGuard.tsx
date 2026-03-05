"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken, setToken, getPosHost, getCurrentUser, setCurrentUser } from "@/lib/auth";
import { authKeepAlive, getMyInfo } from "@/lib/um-api";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const routerRef = useRef(router);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = getToken();
    const host = getPosHost();

    if (!token || !host) {
      routerRef.current.replace("/login");
      return;
    }

    authKeepAlive()
      .then(async (res) => {
        setToken(res.accessToken);
        if (!getCurrentUser()) {
          const user = await getMyInfo();
          setCurrentUser(user);
        }
        setReady(true);
      })
      .catch(() => {
        routerRef.current.replace("/login");
      });
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
