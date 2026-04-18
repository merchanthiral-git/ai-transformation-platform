import { AnimatedBgProvider } from "../../lib/animated-bg-context";
import { AnalyticsInit } from "../components/AnalyticsInit";
import { DesktopOnlyGate } from "../components/DesktopOnlyGate";
import { DensityProvider } from "../ui/density";
import { AmbientProvider } from "../ui/AmbientContext";

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return (
    <AnimatedBgProvider>
      <AnalyticsInit />
      <DensityProvider>
        <AmbientProvider>
          <DesktopOnlyGate>
            {children}
          </DesktopOnlyGate>
        </AmbientProvider>
      </DensityProvider>
    </AnimatedBgProvider>
  );
}
