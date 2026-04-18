"use client";
import React, { useState, useEffect, useMemo } from "react";
import { MERIDIAN } from "../../lib/meridianData";
import { getNarrative, PERSONA_INFO, CHALLENGE_INFO, type Persona } from "../../lib/tutorialNarrative";
import { fmt } from "../../lib/formatters";

/* ═══════════════════════════════════════════════════════════════
   TUTORIAL — Personalized 8-step Meridian Financial story
   ═══════════════════════════════════════════════════════════════ */

const STEP_LABELS = ["The Situation", "The Data", "The Snapshot", "The Diagnosis", "The Design", "The Scenario", "The Plan", "You're Ready"];

function usePersistedTutorial() {
  const [persona, setPersona] = useState<Persona | null>(() => { try { const p = localStorage.getItem("tutorial_persona"); return p as Persona || null; } catch { return null; } });
  const [challenge, setChallenge] = useState<string>(() => { try { return localStorage.getItem("tutorial_challenge") || ""; } catch { return ""; } });
  const [step, setStep] = useState(() => { try { return Number(localStorage.getItem("tutorial_step") || "0"); } catch { return 0; } });
  useEffect(() => { if (persona) localStorage.setItem("tutorial_persona", persona); }, [persona]);
  useEffect(() => { if (challenge) localStorage.setItem("tutorial_challenge", challenge); }, [challenge]);
  useEffect(() => { localStorage.setItem("tutorial_step", String(step)); }, [step]);
  return { persona, setPersona, challenge, setChallenge, step, setStep };
}

export function Tutorial({ onClose, onGoToSandbox, onGoToNewProject }: {
  onClose: () => void;
  onGoToSandbox: () => void;
  onGoToNewProject: () => void;
}) {
  const { persona, setPersona, challenge, setChallenge, step, setStep } = usePersistedTutorial();
  const [showGate, setShowGate] = useState(!persona);
  const [thinkingDone, setThinkingDone] = useState(false);
  const [taskRevealCount, setTaskRevealCount] = useState(0);

  // Reset thinking state when step changes
  useEffect(() => { setThinkingDone(false); setTaskRevealCount(0); }, [step]);

  // Simulated agent thinking for step 4
  useEffect(() => {
    if (step === 3 && !thinkingDone) {
      const timer = setTimeout(() => setThinkingDone(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [step, thinkingDone]);

  // Staggered task reveal for step 5
  useEffect(() => {
    if (step === 4 && taskRevealCount < MERIDIAN.opsAnalystTasks.length) {
      const timer = setTimeout(() => setTaskRevealCount(c => c + 1), 100);
      return () => clearTimeout(timer);
    }
  }, [step, taskRevealCount]);

  const next = () => setStep(s => Math.min(s + 1, STEP_LABELS.length - 1));
  const prev = () => setStep(s => Math.max(s - 1, 0));

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); next(); }
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (step >= STEP_LABELS.length - 1) localStorage.setItem("tutorial_completed", "true");
  }, [step]);

  const narr = useMemo(() => getNarrative(step, persona || "chro"), [step, persona]);
  const pct = Math.round(((step + 1) / STEP_LABELS.length) * 100);
  const isLast = step === STEP_LABELS.length - 1;
  const minsLeft = Math.max(1, Math.round((STEP_LABELS.length - step - 1) * 1));

  // ── Personalization gate ──
  if (showGate) return <div style={{ position: "fixed", inset: 0, zIndex: 99998, background: "#0B1120", overflow: "auto", display: "flex", alignItems: "center", justifyContent: "center" }}>
    <div style={{ maxWidth: 640, width: "100%", padding: "0 32px" }}>
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <div style={{ width: 64, height: 64, borderRadius: 20, background: "linear-gradient(135deg, rgba(212,134,10,0.2), rgba(192,112,48,0.15))", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 28, marginBottom: 16, border: "2px solid rgba(212,134,10,0.3)" }}>M</div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "#f5e6d0", fontFamily: "'Outfit', sans-serif", marginBottom: 8 }}>Welcome to Meridian Financial</h1>
        <p style={{ fontSize: 15, color: "rgba(255,255,255,0.45)", maxWidth: 440, margin: "0 auto" }}>Before we begin, tell us about yourself so we can personalize the experience.</p>
      </div>

      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12 }}>What best describes your role?</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
          {(Object.entries(PERSONA_INFO) as [Persona, typeof PERSONA_INFO.chro][]).map(([key, info]) => <button key={key} onClick={() => setPersona(key)} style={{ padding: "16px 20px", borderRadius: 14, background: persona === key ? "rgba(59,130,246,0.1)" : "rgba(255,255,255,0.02)", border: `1.5px solid ${persona === key ? "rgba(59,130,246,0.4)" : "rgba(255,255,255,0.06)"}`, cursor: "pointer", textAlign: "left", transition: "all 0.2s" }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>{info.icon}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: persona === key ? "#60a5fa" : "#f5e6d0", fontFamily: "'Outfit', sans-serif" }}>{info.label}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>{info.subtitle}</div>
          </button>)}
        </div>
      </div>

      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12 }}>What's your biggest challenge right now?</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
          {Object.entries(CHALLENGE_INFO).map(([key, info]) => <button key={key} onClick={() => setChallenge(key)} style={{ padding: "16px 20px", borderRadius: 14, background: challenge === key ? "rgba(249,115,22,0.1)" : "rgba(255,255,255,0.02)", border: `1.5px solid ${challenge === key ? "rgba(249,115,22,0.4)" : "rgba(255,255,255,0.06)"}`, cursor: "pointer", textAlign: "left", transition: "all 0.2s" }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>{info.icon}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: challenge === key ? "#f97316" : "#f5e6d0", fontFamily: "'Outfit', sans-serif" }}>{info.label}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>{info.subtitle}</div>
          </button>)}
        </div>
      </div>

      <button onClick={() => { if (persona) setShowGate(false); }} disabled={!persona} style={{ width: "100%", padding: "14px", borderRadius: 14, background: persona ? "linear-gradient(135deg, #3B82F6, #6366F1)" : "rgba(255,255,255,0.05)", color: persona ? "#fff" : "rgba(255,255,255,0.2)", fontSize: 15, fontWeight: 700, cursor: persona ? "pointer" : "not-allowed", border: "none", fontFamily: "'Outfit', sans-serif" }}>Begin Meridian's Story →</button>
      <button onClick={onClose} style={{ display: "block", margin: "12px auto 0", fontSize: 13, color: "rgba(255,255,255,0.2)", background: "none", border: "none", cursor: "pointer" }}>Skip tutorial</button>
    </div>
  </div>;

  // ── Main tutorial ──
  return <div style={{ position: "fixed", inset: 0, zIndex: 99998, background: "#0B1120", overflow: "hidden", display: "flex", flexDirection: "column" }}>
    {/* Progress header */}
    <div style={{ background: "rgba(11,17,32,0.95)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
      <div style={{ height: 3, background: "rgba(255,255,255,0.05)" }}><div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg, #3B82F6, var(--purple))", transition: "width 0.4s cubic-bezier(0.34,1.56,0.64,1)" }} /></div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 24px" }}>
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", fontFamily: "'IBM Plex Mono', monospace" }}>{step + 1} of {STEP_LABELS.length} · {STEP_LABELS[step]}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {!isLast && <span style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>~{minsLeft} min left</span>}
          <button onClick={onClose} style={{ fontSize: 12, color: "rgba(255,255,255,0.2)", background: "none", border: "none", cursor: "pointer" }}>Skip ×</button>
        </div>
      </div>
    </div>

    {/* Two-panel layout */}
    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
      {/* Left panel — narrative */}
      <div style={{ width: "40%", padding: "32px 28px", overflowY: "auto", display: "flex", flexDirection: "column" }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#f5e6d0", fontFamily: "'Outfit', sans-serif", lineHeight: 1.3, marginBottom: 12 }}>{narr.headline}</h1>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 1.7, marginBottom: 20 }}>{narr.context}</p>
        <div style={{ padding: "14px 16px", borderRadius: 12, background: "rgba(212,134,10,0.06)", borderLeft: "3px solid rgba(212,134,10,0.4)", marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", lineHeight: 1.6 }}>{narr.insight}</div>
        </div>
        {narr.callout && <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.15)", marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: "#60a5fa", lineHeight: 1.5 }}>{narr.callout}</div>
        </div>}
        {step === 1 && <a href="/api/template" download style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 18px", borderRadius: 10, background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.3)", color: "#60a5fa", fontSize: 13, fontWeight: 600, textDecoration: "none", marginTop: 4 }}>📥 Download Template</a>}
        <div style={{ flex: 1 }} />
      </div>

      {/* Right panel — live demo */}
      <div style={{ flex: 1, background: "rgba(255,255,255,0.01)", borderLeft: "1px solid rgba(255,255,255,0.06)", padding: "24px", overflowY: "auto" }}>
        {/* Step 0: Company profile */}
        {step === 0 && <CompanyCard />}
        {/* Step 1: Data template */}
        {step === 1 && <DataPreview />}
        {/* Step 2: Snapshot KPIs */}
        {step === 2 && <SnapshotPanel />}
        {/* Step 3: Diagnosis */}
        {step === 3 && <DiagnosisPanel thinkingDone={thinkingDone} />}
        {/* Step 4: Design */}
        {step === 4 && <DesignPanel revealCount={taskRevealCount} />}
        {/* Step 5: Scenario */}
        {step === 5 && <ScenarioPanel />}
        {/* Step 6: Plan */}
        {step === 6 && <PlanPanel />}
        {/* Step 7: Handoff */}
        {step === 7 && <HandoffPanel />}
      </div>
    </div>

    {/* Bottom nav */}
    <div style={{ flexShrink: 0, padding: "12px 24px", background: "rgba(11,17,32,0.95)", backdropFilter: "blur(12px)", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ display: "flex", gap: 5 }}>{STEP_LABELS.map((_, i) => <button key={i} onClick={() => setStep(i)} style={{ width: i === step ? 22 : 7, height: 7, borderRadius: 4, background: i === step ? "#3B82F6" : i < step ? "rgba(59,130,246,0.3)" : "rgba(255,255,255,0.08)", border: "none", cursor: "pointer", transition: "all 0.2s" }} />)}</div>
      <div style={{ display: "flex", gap: 10 }}>
        {step > 0 && <button onClick={prev} style={{ padding: "9px 18px", borderRadius: 10, background: "transparent", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Outfit', sans-serif" }}>← Back</button>}
        {!isLast && <button onClick={next} style={{ padding: "9px 22px", borderRadius: 10, background: "linear-gradient(135deg, #3B82F6, #6366F1)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", border: "none", fontFamily: "'Outfit', sans-serif" }}>Next →</button>}
        {isLast && <>
          <button onClick={onGoToNewProject} style={{ padding: "9px 18px", borderRadius: 10, background: "transparent", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Outfit', sans-serif" }}>Upload my data →</button>
          <button onClick={onGoToSandbox} style={{ padding: "9px 22px", borderRadius: 10, background: "linear-gradient(135deg, #F97316, #EA580C)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", border: "none", fontFamily: "'Outfit', sans-serif" }}>Explore with real data →</button>
        </>}
      </div>
    </div>
  </div>;
}

/* ═══ RIGHT PANEL COMPONENTS — Live-rendered Meridian data ═══ */

function AnimNum({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => { let frame = 0; const total = 40; const tick = () => { frame++; setDisplay(Math.round(value * Math.min(frame / total, 1))); if (frame < total) requestAnimationFrame(tick); }; requestAnimationFrame(tick); }, [value]);
  return <>{fmt(display)}{suffix}</>;
}

function CompanyCard() {
  return <div style={{ maxWidth: 480, margin: "40px auto" }}>
    <div style={{ textAlign: "center", marginBottom: 24 }}>
      <div style={{ width: 72, height: 72, borderRadius: 20, background: "linear-gradient(135deg, #1a2a4a, #0f1f35)", border: "2px solid rgba(212,134,10,0.3)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 32, fontWeight: 800, color: "var(--accent-primary)", fontFamily: "'Outfit', sans-serif", marginBottom: 12 }}>M</div>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: "#f5e6d0", fontFamily: "'Outfit', sans-serif" }}>{MERIDIAN.name}</h2>
      <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: "rgba(212,134,10,0.12)", color: "var(--accent-primary)", marginTop: 6 }}>{MERIDIAN.industry}</span>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
      {[{ label: "Employees", value: MERIDIAN.employees }, { label: "Labor Cost", value: 2.1, suffix: "B" }, { label: "Functions", value: MERIDIAN.functions.length }, { label: "Readiness", value: MERIDIAN.readiness.overall, suffix: "/100" }].map(kpi => <div key={kpi.label} style={{ padding: 16, borderRadius: 14, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", textAlign: "center" }}>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{kpi.label}</div>
        <div style={{ fontSize: 24, fontWeight: 800, color: kpi.label === "Readiness" ? "var(--warning)" : "#f5e6d0", fontFamily: "'Outfit', sans-serif" }}>{kpi.suffix === "B" ? "$" : ""}<AnimNum value={kpi.value} />{kpi.suffix || ""}</div>
      </div>)}
    </div>
    <div style={{ marginTop: 16, padding: 14, borderRadius: 12, background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)", fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.6, textAlign: "center" }}>Readiness score 52/100 — below the industry benchmark of 65</div>
  </div>;
}

function DataPreview() {
  const tabs = ["Workforce", "Work Design", "Job Catalog", "Org Structure", "Skills"];
  const [active, setActive] = useState(0);
  useEffect(() => { const t = setInterval(() => setActive(a => (a + 1) % tabs.length), 2000); return () => clearInterval(t); }, []);
  const desc = ["6,200 employees with roles, levels, and reporting lines", "396 tasks across 47 roles with AI impact ratings", "47 role definitions with skills and career tracks", "8 functions with manager hierarchy", "89 skills mapped to roles and proficiency levels"];
  return <div style={{ maxWidth: 480, margin: "40px auto" }}>
    <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>{tabs.map((t, i) => <button key={t} onClick={() => setActive(i)} style={{ flex: 1, padding: "8px 4px", borderRadius: 8, fontSize: 11, fontWeight: 700, background: i === active ? "rgba(59,130,246,0.12)" : "rgba(255,255,255,0.02)", color: i === active ? "#60a5fa" : "rgba(255,255,255,0.3)", border: `1px solid ${i === active ? "rgba(59,130,246,0.3)" : "rgba(255,255,255,0.04)"}`, cursor: "pointer", transition: "all 0.2s", fontFamily: "'IBM Plex Mono', monospace" }}>{t}</button>)}</div>
    <div style={{ padding: 20, borderRadius: 14, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", textAlign: "center", minHeight: 80 }}>
      <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>{desc[active]}</div>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginTop: 16 }}>
      {[{ l: "Employees", v: "6,200" }, { l: "Roles", v: "47" }, { l: "Tasks", v: "396" }, { l: "Skills", v: "89" }].map(s => <div key={s.l} style={{ padding: 10, borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", textAlign: "center" }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#60a5fa", fontFamily: "'Outfit', sans-serif" }}>{s.v}</div>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{s.l}</div>
      </div>)}
    </div>
  </div>;
}

function SnapshotPanel() {
  return <div style={{ maxWidth: 520, margin: "20px auto" }}>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 16 }}>
      {[{ l: "Employees", v: MERIDIAN.employees, c: "#f5e6d0" }, { l: "AI Readiness", v: MERIDIAN.readiness.overall, c: "var(--warning)", s: "/100" }, { l: "Avg AI Impact", v: 6.8, c: "var(--risk)", s: "/10" }].map(k => <div key={k.l} style={{ padding: 14, borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", textAlign: "center" }}>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 3 }}>{k.l}</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: k.c }}><AnimNum value={k.v} />{k.s || ""}</div>
      </div>)}
    </div>
    <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Headcount by Function</div>
    {MERIDIAN.functions.map(fn => <div key={fn.name} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", width: 120, flexShrink: 0 }}>{fn.name}</span>
      <div style={{ flex: 1, height: 8, background: "rgba(255,255,255,0.04)", borderRadius: 4, overflow: "hidden" }}><div style={{ width: `${(fn.headcount / 1800) * 100}%`, height: "100%", borderRadius: 4, background: fn.color, transition: "width 0.8s ease" }} /></div>
      <span style={{ fontSize: 11, color: fn.color, fontWeight: 700, width: 40, textAlign: "right", fontFamily: "'IBM Plex Mono', monospace" }}>{fmt(fn.headcount)}</span>
    </div>)}
    <div style={{ marginTop: 16, padding: 12, borderRadius: 10, background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)", fontSize: 12, color: "rgba(255,255,255,0.5)" }}>⚡ Operations: AI impact 8.2 but readiness only 4.1 — the biggest gap in the org</div>
  </div>;
}

function DiagnosisPanel({ thinkingDone }: { thinkingDone: boolean }) {
  if (!thinkingDone) return <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 12 }}>
    <div style={{ display: "flex", gap: 6 }}>{[0, 1, 2].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: 4, background: "#3B82F6", animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />)}</div>
    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.3)" }}>Analyzing Meridian's workforce...</div>
    <style>{`@keyframes pulse { 0%,100% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.2); } }`}</style>
  </div>;

  const areas = [
    { area: "Operations automation", score: 9.1, roles: 3, quickWin: true },
    { area: "Compliance process digitization", score: 7.2, roles: 2, quickWin: false },
    { area: "Financial reporting automation", score: 7.8, roles: 2, quickWin: true },
    { area: "Risk model AI augmentation", score: 7.4, roles: 1, quickWin: false },
    { area: "Wealth management AI tools", score: 5.2, roles: 3, quickWin: false },
  ];
  return <div style={{ maxWidth: 520, margin: "20px auto" }}>
    <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>AI Opportunity Areas</div>
    {areas.map((a, i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", marginBottom: 6, animation: `fadeSlide 0.3s ease ${i * 0.1}s both` }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: `rgba(212,134,10,${a.score / 20})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "var(--accent-primary)" }}>{a.score}</div>
      <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600, color: "#f5e6d0" }}>{a.area}</div><div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{a.roles} roles affected</div></div>
      {a.quickWin && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: "rgba(16,185,129,0.1)", color: "var(--success)" }}>Quick Win</span>}
    </div>)}
    <div style={{ marginTop: 16, padding: 12, borderRadius: 10, background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.15)", fontSize: 12, color: "rgba(255,255,255,0.5)" }}>💡 Surprise: Wealth Management has 40% of roles flagged for AI augmentation within 18 months</div>
    <style>{`@keyframes fadeSlide { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
  </div>;
}

function DesignPanel({ revealCount }: { revealCount: number }) {
  const colors = { automate: "var(--risk)", augment: "var(--warning)", keep: "var(--success)" };
  const labels = { automate: "Automate", augment: "Augment", keep: "Keep Human" };
  return <div style={{ maxWidth: 520, margin: "20px auto" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
      <span style={{ fontSize: 14, fontWeight: 700, color: "#f5e6d0" }}>Operations Analyst</span>
      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>18 tasks · {fmt(420)} employees</span>
    </div>
    <div style={{ maxHeight: 320, overflowY: "auto" }}>
      {MERIDIAN.opsAnalystTasks.slice(0, revealCount).map((t, i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 8, marginBottom: 3, background: "rgba(255,255,255,0.02)", borderLeft: `3px solid ${colors[t.classification]}` }}>
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", flex: 1 }}>{t.name}</span>
        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 5, background: `${colors[t.classification]}15`, color: colors[t.classification] }}>{labels[t.classification]}</span>
      </div>)}
    </div>
    {revealCount >= MERIDIAN.opsAnalystTasks.length && <div style={{ marginTop: 16, padding: 14, borderRadius: 12, background: "rgba(212,134,10,0.06)", border: "1px solid rgba(212,134,10,0.2)" }}>
      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginBottom: 4 }}>This role doesn't disappear — it evolves</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>Operations Analyst</span>
        <span style={{ color: "var(--accent-primary)" }}>→</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--accent-primary)" }}>AI Operations Specialist</span>
      </div>
    </div>}
  </div>;
}

function ScenarioPanel() {
  const sc = MERIDIAN.scenario;
  const scenarios = [
    { name: "Current", hc: 6200, cost: 0, time: "—", attrition: "0%" },
    { name: "Optimized", hc: 6200 + sc.headcount_delta, cost: sc.cost_savings_pct, time: `${sc.timeline_months}mo`, attrition: `${sc.attrition_pct}%` },
    { name: "Aggressive", hc: 5780, cost: 18, time: "12mo", attrition: "6.8%" },
    { name: "Conservative", hc: 6100, cost: 6, time: "24mo", attrition: "1.2%" },
  ];
  return <div style={{ maxWidth: 520, margin: "20px auto" }}>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginBottom: 20 }}>
      {scenarios.map((s, i) => <div key={s.name} style={{ padding: 12, borderRadius: 10, background: i === 1 ? "rgba(212,134,10,0.08)" : "rgba(255,255,255,0.02)", border: `1px solid ${i === 1 ? "rgba(212,134,10,0.3)" : "rgba(255,255,255,0.04)"}`, textAlign: "center" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: i === 1 ? "var(--accent-primary)" : "rgba(255,255,255,0.3)", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>{s.name}</div>
        <div style={{ fontSize: 16, fontWeight: 800, color: "#f5e6d0", fontFamily: "'Outfit', sans-serif" }}>{fmt(s.hc)}</div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{s.cost > 0 ? `-${s.cost}% cost` : "baseline"}</div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{s.time} · {s.attrition}</div>
      </div>)}
    </div>
    <div style={{ padding: 14, borderRadius: 12, background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)" }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--success)", marginBottom: 4 }}>Recommended: Optimized Scenario</div>
      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>12% cost reduction with only 3.2% attrition over 18 months. $4.2M reskilling investment pays back in 14 months.</div>
    </div>
  </div>;
}

function PlanPanel() {
  return <div style={{ maxWidth: 520, margin: "20px auto" }}>
    <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Top Skills Gaps</div>
    {MERIDIAN.skillsGaps.map(g => <div key={g.skill} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", width: 130, flexShrink: 0 }}>{g.skill}</span>
      <div style={{ flex: 1, height: 6, background: "rgba(255,255,255,0.04)", borderRadius: 3, overflow: "hidden" }}><div style={{ height: "100%", borderRadius: 3, width: `${(g.employees / 2100) * 100}%`, background: g.severity === "critical" ? "var(--risk)" : g.severity === "high" ? "var(--warning)" : "#60a5fa" }} /></div>
      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", width: 50, textAlign: "right", fontFamily: "'IBM Plex Mono', monospace" }}>{fmt(g.employees)}</span>
    </div>)}
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 20 }}>
      {[{ l: "Wave 1", v: 800, c: "var(--risk)" }, { l: "Wave 2", v: 900, c: "var(--warning)" }, { l: "Wave 3", v: 400, c: "var(--success)" }].map(w => <div key={w.l} style={{ padding: 12, borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", textAlign: "center" }}>
        <div style={{ fontSize: 10, color: w.c, fontWeight: 700, marginBottom: 2 }}>{w.l}</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#f5e6d0" }}>{fmt(w.v)}</div>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>employees</div>
      </div>)}
    </div>
  </div>;
}

function HandoffPanel() {
  const checks = [
    "Diagnosed 6,200-person workforce in minutes",
    "Identified Operations as highest-risk, highest-opportunity",
    "Redesigned the Operations Analyst role task by task",
    "Built a scenario: 12% cost reduction in 18 months",
    "Planned reskilling for 2,100 employees",
  ];
  return <div style={{ maxWidth: 480, margin: "40px auto", textAlign: "center" }}>
    <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
    <h2 style={{ fontSize: 22, fontWeight: 800, color: "#f5e6d0", fontFamily: "'Outfit', sans-serif", marginBottom: 20 }}>Meridian has a transformation strategy.</h2>
    <div style={{ textAlign: "left", maxWidth: 380, margin: "0 auto" }}>
      {checks.map((c, i) => <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
        <span style={{ color: "var(--success)", fontSize: 14, marginTop: 1 }}>✓</span>
        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.5 }}>{c}</span>
      </div>)}
    </div>
    <div style={{ marginTop: 24, padding: 14, borderRadius: 12, background: "rgba(212,134,10,0.06)", border: "1px solid rgba(212,134,10,0.15)", fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>The platform did in 8 minutes what typically takes 8 weeks. Your Flight Recorder captured every step.</div>
  </div>;
}
