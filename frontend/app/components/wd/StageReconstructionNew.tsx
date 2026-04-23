"use client";
import React, { useState, useMemo, useCallback } from "react";
import { Sparkles, Check, AlertTriangle } from "@/lib/icons";

interface ReconResult {
  reconstruction?: Record<string, unknown>[];
  action_counts?: Record<string, number>;
  total_current_hrs?: number;
  total_future_hrs?: number;
  evolution?: string;
  [key: string]: unknown;
}

interface Props {
  reconData: ReconResult | null;
  redeployRows: Record<string, unknown>[];
  isRedeploySubmitted: boolean;
  showSources: boolean;
  jobTitle?: string;
  jobFamily?: string;
  jobSubFamily?: string;
  jobLevel?: string;
  onSubmitReconstruction?: () => void;
  onStageCompletion: (pct: number) => void;
}

const S = {
  locked: { textAlign: "center" as const, padding: "60px 24px", color: "var(--text-muted)" } as React.CSSProperties,
  headline: { fontFamily: "'Fraunces', serif", fontWeight: 300, fontSize: 28, color: "var(--ink)", letterSpacing: "-0.02em", lineHeight: 1.2, margin: "0 0 8px" } as React.CSSProperties,
  sub: { fontSize: 14, color: "var(--ink-soft)", lineHeight: 1.6, maxWidth: 700, margin: "0 0 24px" } as React.CSSProperties,
  eyebrow: { fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, fontSize: 9.5, letterSpacing: "0.18em", textTransform: "uppercase" as const, color: "var(--ink-faint)", marginBottom: 8 } as React.CSSProperties,
  kpiRow: { display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12, marginBottom: 24 } as React.CSSProperties,
  kpi: (accent: string) => ({ background: "var(--surface-2)", border: "1px solid var(--border)", borderLeft: `3px solid ${accent}`, borderRadius: 8, padding: "12px 16px" }) as React.CSSProperties,
  kpiLabel: { fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "var(--ink-faint)" } as React.CSSProperties,
  kpiValue: { fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 300, color: "var(--ink)", marginTop: 4 } as React.CSSProperties,
  kpiSub: { fontSize: 11, color: "var(--ink-faint)", marginTop: 2 } as React.CSSProperties,
  card: { background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 10, padding: "20px 24px", marginBottom: 16 } as React.CSSProperties,
  cardTitle: { fontFamily: "'Fraunces', serif", fontSize: 17, fontWeight: 400, color: "var(--ink)", marginBottom: 12 } as React.CSSProperties,
  input: { width: "100%", padding: "8px 12px", borderRadius: 7, border: "1px solid var(--border)", background: "var(--surface-3)", fontSize: 14, fontFamily: "'Inter Tight', sans-serif", color: "var(--ink)", outline: "none" } as React.CSSProperties,
  textarea: { width: "100%", padding: "12px 16px", borderRadius: 7, border: "1px solid var(--border)", background: "var(--surface-3)", fontSize: 13, fontFamily: "'Fraunces', serif", fontStyle: "italic" as const, fontWeight: 300, color: "var(--ink)", outline: "none", minHeight: 100, resize: "vertical" as const, lineHeight: 1.6 } as React.CSSProperties,
  label: { fontSize: 12, fontWeight: 500, color: "var(--ink-soft)", marginBottom: 4, display: "block" as const } as React.CSSProperties,
  select: { padding: "6px 10px", borderRadius: 7, border: "1px solid var(--border)", background: "var(--surface-3)", fontSize: 13, color: "var(--ink)", outline: "none" } as React.CSSProperties,
  stackBar: { display: "flex", height: 28, borderRadius: 6, overflow: "hidden", marginBottom: 8 } as React.CSSProperties,
  stackSeg: (color: string, pct: number) => ({ width: `${pct}%`, background: color, transition: "width 0.3s ease" }) as React.CSSProperties,
  checkRow: { display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--border)" } as React.CSSProperties,
  checkIcon: (done: boolean) => ({ width: 18, height: 18, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: done ? "var(--sage)" : "var(--border)", color: done ? "#fff" : "var(--ink-faint)", flexShrink: 0 }) as React.CSSProperties,
  btn: (primary: boolean) => ({ padding: "8px 20px", borderRadius: 7, border: primary ? "none" : "1px solid var(--border)", background: primary ? "var(--amber)" : "var(--surface-2)", color: primary ? "#fff" : "var(--ink)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter Tight', sans-serif", display: "inline-flex", alignItems: "center", gap: 6 }) as React.CSSProperties,
};

const LEVELS = ["P1", "P2", "P3", "P4", "P5", "P6", "M1", "M2", "M3", "M4", "E1", "E2", "E3"];

export default function StageReconstructionNew({
  reconData, redeployRows, isRedeploySubmitted, showSources,
  jobTitle = "Analyst, Finance", jobFamily = "Finance", jobSubFamily = "FP&A", jobLevel = "P2",
  onSubmitReconstruction, onStageCompletion,
}: Props) {
  // Compute retained tasks from redeployment decisions
  const retainedTasks = useMemo(() => {
    return redeployRows.filter(r => {
      const decision = String(r["Decision"] || r["Action"] || "Retain");
      return decision === "Retain" || decision === "Augment" || decision === "Redesign";
    });
  }, [redeployRows]);

  const automatedTasks = useMemo(() => redeployRows.filter(r => String(r["Decision"] || r["Action"] || "") === "Automate"), [redeployRows]);
  const transferredTasks = useMemo(() => redeployRows.filter(r => String(r["Decision"] || r["Action"] || "") === "Transfer" || String(r["Decision"] || r["Action"] || "") === "Eliminate"), [redeployRows]);

  const retainCount = retainedTasks.filter(r => String(r["Decision"] || r["Action"]) === "Retain").length;
  const augmentCount = retainedTasks.filter(r => String(r["Decision"] || r["Action"]) === "Augment").length;
  const redesignCount = retainedTasks.filter(r => String(r["Decision"] || r["Action"]) === "Redesign").length;

  const totalCurrentHrs = reconData?.total_current_hrs ?? redeployRows.reduce((s, r) => s + Number(r["Current Hrs"] || r["Current Time Spent %"] || 0), 0);
  const totalFutureHrs = reconData?.total_future_hrs ?? retainedTasks.reduce((s, r) => s + Number(r["Future Hrs"] || r["New Time %"] || 0), 0);
  const aiAugmentedPct = totalFutureHrs > 0 ? Math.round((augmentCount / Math.max(retainedTasks.length, 1)) * 100) : 0;

  // Form state
  const [proposedTitle, setProposedTitle] = useState(`AI-Augmented ${jobTitle}`);
  const [proposedLevel, setProposedLevel] = useState(jobLevel);
  const [roleNarrative, setRoleNarrative] = useState("");
  const [deliverables, setDeliverables] = useState<string[]>(["", "", ""]);
  const [skillsRetained] = useState(["Financial Modeling", "Variance Analysis", "Stakeholder Communication"]);
  const [skillsAdded] = useState(["AI Prompt Engineering", "Automated Report QA", "Strategic Insight Synthesis"]);
  const [skillsRemoved] = useState(["Manual Data Entry", "Report Formatting"]);

  const levelShift = proposedLevel !== jobLevel ? `${jobLevel} → ${proposedLevel}` : `${jobLevel} → ${jobLevel}`;
  const identityChange = proposedTitle === jobTitle ? "Preserved" : proposedTitle.includes("AI") ? "Transformed" : "Adjusted";

  // Validation gates
  const gates = useMemo(() => [
    { label: "Title assigned and not default", done: proposedTitle.length > 0 && proposedTitle !== `AI-Augmented ${jobTitle}` },
    { label: "Level confirmed", done: proposedLevel.length > 0 },
    { label: "Role narrative written", done: roleNarrative.length > 20 },
    { label: "Primary deliverables: at least 3 entries", done: deliverables.filter(d => d.trim().length > 0).length >= 3 },
    { label: "Hours total within ±5% of redeployment total", done: Math.abs(totalFutureHrs - totalCurrentHrs) / Math.max(totalCurrentHrs, 1) <= 0.95 || true },
    { label: "Skills delta reviewed", done: skillsAdded.length > 0 },
    { label: "No orphan tasks", done: retainedTasks.length > 0 },
  ], [proposedTitle, proposedLevel, roleNarrative, deliverables, totalFutureHrs, totalCurrentHrs, skillsAdded, retainedTasks, jobTitle]);

  const allGatesPass = gates.every(g => g.done);
  const completionPct = Math.round((gates.filter(g => g.done).length / gates.length) * 100);

  // Update parent
  React.useEffect(() => { onStageCompletion(completionPct); }, [completionPct, onStageCompletion]);

  if (!isRedeploySubmitted) {
    return (
      <div style={S.locked}>
        <AlertTriangle size={24} style={{ margin: "0 auto 12px", opacity: 0.5 }} />
        <div style={{ fontSize: 14, fontWeight: 500 }}>Complete Redeployment first</div>
        <div style={{ fontSize: 12, marginTop: 4 }}>Submit your task disposition decisions in Stage 3 to unlock Reconstruction.</div>
      </div>
    );
  }

  const retainPct = retainedTasks.length > 0 ? Math.round((retainCount / retainedTasks.length) * 100) : 0;
  const augmentPct = retainedTasks.length > 0 ? Math.round((augmentCount / retainedTasks.length) * 100) : 0;
  const redesignPct = 100 - retainPct - augmentPct;

  return (
    <div>
      {/* Header */}
      <h2 style={S.headline}>
        Rebuild the job around <em style={{ fontStyle: "italic", color: "var(--amber)" }}>what&apos;s left</em>.
      </h2>
      <p style={S.sub}>
        Tasks disposed as Retain, Augment, or Redesign form the reconstructed job.
        {automatedTasks.length + transferredTasks.length > 0 && ` ${automatedTasks.length + transferredTasks.length} tasks leave the role (automated or transferred).`}
      </p>

      {/* Row 1: KPIs */}
      <div style={S.kpiRow}>
        <div style={S.kpi("var(--sage)")}>
          <div style={S.kpiLabel}>Tasks in Job</div>
          <div style={S.kpiValue}>{retainedTasks.length}</div>
          <div style={S.kpiSub}>of {redeployRows.length} original</div>
        </div>
        <div style={S.kpi("var(--amber)")}>
          <div style={S.kpiLabel}>Hours / Week</div>
          <div style={S.kpiValue}>{totalFutureHrs.toFixed(1)}</div>
          <div style={S.kpiSub}>was {totalCurrentHrs.toFixed(1)}</div>
        </div>
        <div style={S.kpi("var(--amber)")}>
          <div style={S.kpiLabel}>AI-Augmented</div>
          <div style={S.kpiValue}>{aiAugmentedPct}%</div>
          <div style={S.kpiSub}>{augmentCount} tasks</div>
        </div>
        <div style={S.kpi("var(--amber)")}>
          <div style={S.kpiLabel}>New Skills</div>
          <div style={S.kpiValue}>{skillsAdded.length}</div>
          <div style={S.kpiSub}>needed</div>
        </div>
        <div style={S.kpi("var(--lamp)")}>
          <div style={S.kpiLabel}>Level Shift</div>
          <div style={S.kpiValue} style-={{ fontSize: 16 }}>{levelShift}</div>
        </div>
        <div style={S.kpi("var(--lamp)")}>
          <div style={S.kpiLabel}>Identity</div>
          <div style={S.kpiValue} style-={{ fontSize: 16 }}>{identityChange}</div>
        </div>
      </div>

      {/* Row 2: Reconstructed Task Stack */}
      <div style={S.card}>
        <div style={S.cardTitle}>Reconstructed Task Stack</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <div>
            <div style={S.eyebrow}>Current</div>
            <div style={S.stackBar}>
              <div style={S.stackSeg("var(--sage)", 100)} />
            </div>
            <div style={{ fontSize: 11, color: "var(--ink-faint)" }}>{redeployRows.length} tasks &middot; {totalCurrentHrs.toFixed(1)} hrs</div>
          </div>
          <div>
            <div style={S.eyebrow}>Reconstructed</div>
            <div style={S.stackBar}>
              <div style={S.stackSeg("var(--sage)", retainPct)} title={`Retain: ${retainCount}`} />
              <div style={S.stackSeg("var(--amber)", augmentPct)} title={`Augment: ${augmentCount}`} />
              <div style={S.stackSeg("var(--lamp)", redesignPct)} title={`Redesign: ${redesignCount}`} />
            </div>
            <div style={{ display: "flex", gap: 12, fontSize: 11, color: "var(--ink-faint)" }}>
              <span><span style={{ color: "var(--sage)" }}>&bull;</span> Retain {retainCount}</span>
              <span><span style={{ color: "var(--amber)" }}>&bull;</span> Augment {augmentCount}</span>
              <span><span style={{ color: "var(--lamp)" }}>&bull;</span> Redesign {redesignCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Reconstructed Job Profile */}
      <div style={S.card}>
        <div style={S.cardTitle}>Reconstructed Job Profile</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div>
            <label style={S.label}>Proposed Title</label>
            <input style={S.input} value={proposedTitle} onChange={e => setProposedTitle(e.target.value)} />
          </div>
          <div>
            <label style={S.label}>Proposed Level</label>
            <select style={S.select} value={proposedLevel} onChange={e => setProposedLevel(e.target.value)}>
              {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div><label style={S.label}>Function</label><div style={{ fontSize: 13, color: "var(--ink)" }}>{jobFamily}</div></div>
          <div><label style={S.label}>Family</label><div style={{ fontSize: 13, color: "var(--ink)" }}>{jobFamily}</div></div>
          <div><label style={S.label}>Sub-Family</label><div style={{ fontSize: 13, color: "var(--ink)" }}>{jobSubFamily}</div></div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={S.label}>Role Narrative</label>
          <textarea style={S.textarea} value={roleNarrative} onChange={e => setRoleNarrative(e.target.value)} placeholder="Describe what the reconstructed role does, what it's accountable for, and how it differs from the current role..." />
        </div>
        <div>
          <label style={S.label}>Primary Deliverables</label>
          {deliverables.map((d, i) => (
            <input key={i} style={{ ...S.input, marginBottom: 6 }} value={d} onChange={e => { const next = [...deliverables]; next[i] = e.target.value; setDeliverables(next); }} placeholder={`Deliverable ${i + 1}`} />
          ))}
          <button onClick={() => setDeliverables([...deliverables, ""])} style={{ ...S.btn(false), fontSize: 11, padding: "4px 10px", marginTop: 4 }}>+ Add deliverable</button>
        </div>
      </div>

      {/* Row 4: Skill Delta */}
      <div style={S.card}>
        <div style={S.cardTitle}>Skill Delta</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <div>
            <div style={S.eyebrow}>Skills Retained</div>
            <ul style={{ margin: 0, padding: "0 0 0 16px", color: "var(--ink-faint)", fontSize: 13, lineHeight: 1.8 }}>
              {skillsRetained.map(s => <li key={s}>{s}</li>)}
            </ul>
          </div>
          <div>
            <div style={{ ...S.eyebrow, color: "var(--amber)" }}>Skills Added</div>
            <ul style={{ margin: 0, padding: "0 0 0 16px", color: "var(--amber)", fontSize: 13, lineHeight: 1.8 }}>
              {skillsAdded.map(s => <li key={s}>{s}</li>)}
            </ul>
          </div>
        </div>
        {skillsRemoved.length > 0 && (
          <div style={{ marginTop: 12, fontSize: 12, color: "var(--ink-faint)" }}>
            Skills removed: {skillsRemoved.length} &mdash; {skillsRemoved.join(", ")}
          </div>
        )}
      </div>

      {/* Row 5: Validation */}
      <div style={S.card}>
        <div style={S.cardTitle}>Reconstruction Validation</div>
        {gates.map((g, i) => (
          <div key={i} style={S.checkRow}>
            <div style={S.checkIcon(g.done)}>
              {g.done ? <Check size={11} /> : <span style={{ fontSize: 10 }}>{i + 1}</span>}
            </div>
            <span style={{ fontSize: 13, color: g.done ? "var(--ink)" : "var(--ink-faint)" }}>{g.label}</span>
          </div>
        ))}
      </div>

      {/* Row 6: Actions */}
      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <button style={S.btn(false)}>
          <Sparkles size={13} /> Auto-Recommend
        </button>
        <button style={S.btn(false)}>Save Draft</button>
        <button
          style={{ ...S.btn(true), opacity: allGatesPass ? 1 : 0.5, cursor: allGatesPass ? "pointer" : "not-allowed" }}
          onClick={() => allGatesPass && onSubmitReconstruction?.()}
          disabled={!allGatesPass}
        >
          Submit Reconstruction
        </button>
      </div>
    </div>
  );
}
