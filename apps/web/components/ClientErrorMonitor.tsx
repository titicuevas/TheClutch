"use client";

import { useEffect } from "react";
import { reportClientError } from "../lib/clientError";

export function ClientErrorMonitor() {
  useEffect(() => {
    const runtimeError = () => reportClientError("runtime_error");
    const rejectedPromise = () => reportClientError("promise_rejection");
    window.addEventListener("error", runtimeError);
    window.addEventListener("unhandledrejection", rejectedPromise);
    return () => {
      window.removeEventListener("error", runtimeError);
      window.removeEventListener("unhandledrejection", rejectedPromise);
    };
  }, []);
  return null;
}
