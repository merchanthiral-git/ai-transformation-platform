import { AnimatedBgProvider } from "../../lib/animated-bg-context";
import { AnalyticsInit } from "../components/AnalyticsInit";
import { DesktopOnlyGate } from "../components/DesktopOnlyGate";

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return (
    <AnimatedBgProvider>
      <AnalyticsInit />
      <DesktopOnlyGate>
        {children}
      </DesktopOnlyGate>
    </AnimatedBgProvider>
  );
}
