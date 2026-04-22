// shared.tsx — barrel re-export for backwards compatibility
// Order matters: each module's imports must be satisfied by modules above it
export * from "./shared/animations";
export * from "./shared/constants";
export * from "./shared/hooks";
export * from "./shared/ChartWrapper";
export * from "./shared/ui-components";
export * from "./shared/visualizations";
export { GlossaryTip } from "./GlossaryTip";
