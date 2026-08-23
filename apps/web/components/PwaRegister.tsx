"use client";
import { useEffect } from "react";
export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;
    const register = () => void navigator.serviceWorker.register("/sw.js", { scope: "/" });
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(register, { timeout: 3_000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = setTimeout(register, 2_000);
    return () => clearTimeout(id);
  }, []);
  return null;
}
