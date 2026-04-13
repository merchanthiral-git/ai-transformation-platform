import { AnimatedBgProvider } from "../../lib/animated-bg-context";
import { AnalyticsInit } from "../components/AnalyticsInit";

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return (
    <AnimatedBgProvider>
      <AnalyticsInit />
      {children}
    </AnimatedBgProvider>
  );
}
