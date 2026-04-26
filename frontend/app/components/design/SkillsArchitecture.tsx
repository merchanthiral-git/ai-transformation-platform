"use client";
import React, { useState } from "react";
import { Sparkles } from "@/lib/icons";
import type { Filters } from "../../../lib/api";
import type { ViewContext } from "../shared/ui-components";
import { PageHeader } from "../shared/ui-components";
import { usePersisted } from "../shared/hooks";
import { FlowNav } from "@/app/ui";
import type { JobSkillBundle } from "../../../types/skills";
import { SEED_SKILLS } from "./skills-seed-taxonomy";
import { InheritUpstreamTab } from "./InheritUpstreamTab";
import { DeriveSkillsTab } from "./DeriveSkillsTab";

/* ═══════════════════════════════════════════════════════════════
   TAB NAV
   ═══════════════════════════════════════════════════════════════ */

const STEPS = [
  { id: 1, label: "1. Inherit" },
  { id: 2, label: "2. Derive" },
  { id: 3, label: "3. Bundle" },
  { id: 4, label: "4. Shifts" },
  { id: 5, label: "5. Supply / demand" },
];

function SkillsArchTabs({ activeStep, onStepChange }: { activeStep: number; onStepChange: (s: number) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "8px 12px", background: "var(--surface-2)", borderRadius: 10, marginBottom: 16 }}>
      {STEPS.map(s => (
        <button key={s.id} onClick={() => onStepChange(s.id)}
          style={{
            padding: "6px 16px", fontSize: 12, fontWeight: activeStep === s.id ? 600 : 400,
            borderRadius: 8, border: "none", cursor: "pointer",
            background: activeStep === s.id ? "var(--surface-1)" : "transparent",
            color: activeStep === s.id ? "var(--text-primary)" : "var(--text-muted)",
            boxShadow: activeStep === s.id ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
            transition: "all 0.15s ease",
          }}>
          {s.label}
        </button>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN MODULE
   ═══════════════════════════════════════════════════════════════ */

interface Props {
  model: string;
  f: Filters;
  onBack: () => void;
  onNavigate?: (id: string) => void;
  viewCtx?: ViewContext;
  jobStates?: Record<string, { currentTasks?: unknown[]; futureTasks?: unknown[]; savedAt?: string }>;
}

export function SkillsArchitecture({ model, f, onBack, onNavigate, viewCtx, jobStates }: Props) {
  const [step, setStep] = usePersisted<number>(`${model}_skills_arch_step`, 1);
  const [bundles, setBundles] = usePersisted<Record<string, JobSkillBundle>>(`${model}_skill_bundles`, {});

  return (
    <div>
      <PageHeader
        icon={<Sparkles />}
        title="Skills Architecture"
        subtitle="Translate redesigned work into the capability model that powers it"
        onBack={onBack}
        moduleId="skills-arch"
        viewCtx={viewCtx}
      />

      <SkillsArchTabs activeStep={step} onStepChange={setStep} />

      {step === 1 && (
        <InheritUpstreamTab
          model={model}
          f={f}
          jobStates={jobStates}
          seedSkills={SEED_SKILLS}
          onContinue={() => setStep(2)}
        />
      )}

      {step === 2 && (
        <DeriveSkillsTab
          model={model}
          jobStates={jobStates || {}}
          bundles={bundles}
          setBundles={setBundles}
          seedSkills={SEED_SKILLS}
        />
      )}

      {step === 3 && (
        <div style={{ padding: "48px 20px", textAlign: "center", background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 12 }}>
          <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>📦</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>Bundle into Jobs</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Coming in next build phase</div>
        </div>
      )}

      {step === 4 && (
        <div style={{ padding: "48px 20px", textAlign: "center", background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 12 }}>
          <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>🔄</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>Skill Shifts</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Coming in next build phase</div>
        </div>
      )}

      {step === 5 && (
        <div style={{ padding: "48px 20px", textAlign: "center", background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 12 }}>
          <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>📊</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>Supply vs Demand</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Coming in next build phase</div>
        </div>
      )}

      <FlowNav
        previous={{ target: { kind: "module", moduleId: "ja-design" }, label: "Job Architecture Design" }}
        next={{ target: { kind: "module", moduleId: "bbba" }, label: "Build/Buy/Borrow/Auto" }}
      />
    </div>
  );
}
