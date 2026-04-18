"use client";
import { useEffect } from "react";
import { initAnalytics, trackFunnelStep, endAllSessions } from "../../lib/analytics";

export function AnalyticsInit() {
  useEffect(() => {
    initAnalytics();
    trackFunnelStep("landed");
    // End sessions on page unload
    const onUnload = () => endAllSessions();
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, []);
  return null;
}
