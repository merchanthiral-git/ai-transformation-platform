/**
 * Canonical UI primitives barrel export.
 * All module components import from here — never from shared/ui-components.tsx directly.
 */

// Tokens & context
export * from "./tokens";
export { DensityProvider, useDensity } from "./density";
export { AmbientProvider, useAmbientLevel } from "./AmbientContext";

// Core components
export { Button } from "./Button";
export type { ButtonProps } from "./Button";
export { Card } from "./Card";
export { Badge } from "./Badge";
export { RAGIndicator } from "./RAGIndicator";
export { SourceBadge } from "./SourceBadge";
export { Citation } from "./Citation";

// KPI & metrics
export { KpiCard } from "./KpiCard";
export { HeroMetric } from "./HeroMetric";

// Empty states & loading
export { EmptyState } from "./EmptyState";
export { LoadingSkeleton } from "./LoadingSkeleton";
export { LoadingBar } from "./LoadingBar";

// Panels
export { ExpertPanel } from "./ExpertPanel";
export { InsightPanel } from "./InsightPanel";
export { NarrativePanel } from "./NarrativePanel";

// Navigation
export { TabBar } from "./TabBar";
export { StageStepper } from "./StageStepper";
export { FlowNav } from "./FlowNav";
export { Breadcrumb } from "./Breadcrumb";
export { PageHeader } from "./PageHeader";
export { ContextStrip } from "./ContextStrip";

// Data display
export { DataTable } from "./DataTable";
export type { Column, DataTableProps, RowAction, SortDirection } from "./DataTable.types";
export { ChartFrame } from "./ChartFrame";

// Scenario & methodology
export { ScenarioPicker } from "./ScenarioPicker";
export { MethodologyToggle } from "./MethodologyToggle";
export { DensityToggle } from "./DensityToggle";

// Overlays
export { DrilldownDrawer } from "./DrilldownDrawer";
export { Modal } from "./Modal";
export { Tooltip } from "./Tooltip";
