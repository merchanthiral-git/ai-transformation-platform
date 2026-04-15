"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import * as api from "../../../lib/api";
import type { Filters } from "../../../lib/api";
import {
  ViewContext, COLORS,
  KpiCard, Card, Empty, Badge,
  TabBar, PageHeader, LoadingSkeleton,
  usePersisted, showToast, fmtNum, ConfidenceBadge,
} from "../shared";

/* ═══════════════════════════════════════════════════════════════════════════
   O*NET Skills Map Engine — 4 Tabs
   ═══════════════════════════════════════════════════════════════════════════ */

// ── Hardcoded O*NET 35 Skills taxonomy ──
interface SkillDef { id: string; name: string; elementId: string }
interface SkillCategory { name: string; color: string; skills: SkillDef[] }

const SKILL_CATEGORIES: SkillCategory[] = [
  { name: "Basic Skills", color: "#3B82F6", skills: [
    { id: "bs1", name: "Reading Comprehension", elementId: "2.A.1.a" },
    { id: "bs2", name: "Active Listening", elementId: "2.A.1.b" },
    { id: "bs3", name: "Writing", elementId: "2.A.1.c" },
    { id: "bs4", name: "Speaking", elementId: "2.A.1.d" },
    { id: "bs5", name: "Mathematics", elementId: "2.A.1.e" },
    { id: "bs6", name: "Science", elementId: "2.A.1.f" },
  ]},
  { name: "Process Skills", color: "#8B5CF6", skills: [
    { id: "ps1", name: "Critical Thinking", elementId: "2.A.2.a" },
    { id: "ps2", name: "Active Learning", elementId: "2.A.2.b" },
    { id: "ps3", name: "Learning Strategies", elementId: "2.A.2.c" },
    { id: "ps4", name: "Monitoring", elementId: "2.A.2.d" },
  ]},
  { name: "Social Skills", color: "#10B981", skills: [
    { id: "ss1", name: "Social Perceptiveness", elementId: "2.B.1.a" },
    { id: "ss2", name: "Coordination", elementId: "2.B.1.b" },
    { id: "ss3", name: "Persuasion", elementId: "2.B.1.c" },
    { id: "ss4", name: "Negotiation", elementId: "2.B.1.d" },
    { id: "ss5", name: "Instructing", elementId: "2.B.1.e" },
    { id: "ss6", name: "Service Orientation", elementId: "2.B.1.f" },
  ]},
  { name: "Complex Problem Solving", color: "#F59E0B", skills: [
    { id: "cp1", name: "Complex Problem Solving", elementId: "2.B.2.i" },
  ]},
  { name: "Technical Skills", color: "#EF4444", skills: [
    { id: "ts1", name: "Operations Analysis", elementId: "2.B.3.a" },
    { id: "ts2", name: "Technology Design", elementId: "2.B.3.b" },
    { id: "ts3", name: "Equipment Selection", elementId: "2.B.3.c" },
    { id: "ts4", name: "Installation", elementId: "2.B.3.d" },
    { id: "ts5", name: "Programming", elementId: "2.B.3.e" },
    { id: "ts6", name: "Operation and Control", elementId: "2.B.3.g" },
    { id: "ts7", name: "Operation Monitoring", elementId: "2.B.3.h" },
    { id: "ts8", name: "Quality Control Analysis", elementId: "2.B.3.j" },
    { id: "ts9", name: "Troubleshooting", elementId: "2.B.3.k" },
    { id: "ts10", name: "Repairing", elementId: "2.B.3.l" },
    { id: "ts11", name: "Equipment Maintenance", elementId: "2.B.3.m" },
  ]},
  { name: "Systems Skills", color: "#06B6D4", skills: [
    { id: "sy1", name: "Judgment and Decision Making", elementId: "2.B.4.e" },
    { id: "sy2", name: "Systems Analysis", elementId: "2.B.4.f" },
    { id: "sy3", name: "Systems Evaluation", elementId: "2.B.4.g" },
  ]},
  { name: "Resource Management", color: "#F97316", skills: [
    { id: "rm1", name: "Time Management", elementId: "2.B.5.a" },
    { id: "rm2", name: "Management of Financial Resources", elementId: "2.B.5.b" },
    { id: "rm3", name: "Management of Material Resources", elementId: "2.B.5.c" },
    { id: "rm4", name: "Management of Personnel Resources", elementId: "2.B.5.d" },
  ]},
];

const ALL_SKILLS = SKILL_CATEGORIES.flatMap(c => c.skills.map(s => ({ ...s, category: c.name, color: c.color })));

function getCategoryForSkill(name: string) {
  for (const c of SKILL_CATEGORIES) {
    if (c.skills.some(s => s.name === name)) return { name: c.name, color: c.color };
  }
  return { name: "Unknown", color: "#888" };
}

// ── Styling helpers ──
const S = {
  panel: { background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 12, padding: 16 } as React.CSSProperties,
  input: { width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text-primary)", fontSize: 13, outline: "none" } as React.CSSProperties,
  treeItem: (active: boolean) => ({ padding: "6px 12px", borderRadius: 8, cursor: "pointer", fontSize: 13, color: active ? "var(--accent-primary)" : "var(--text-secondary)", background: active ? "var(--surface-2)" : "transparent", transition: "all 0.15s" }) as React.CSSProperties,
  sectionHead: { padding: "8px 8px", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 6, userSelect: "none" as const } as React.CSSProperties,
  bar: (pct: number, color: string) => ({ width: `${Math.max(pct, 4)}%`, height: 18, borderRadius: 4, background: color, transition: "width 0.3s" }) as React.CSSProperties,
  btn: (variant: "primary" | "secondary" | "ghost" = "primary") => ({
    padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", border: "none", transition: "all 0.15s",
    ...(variant === "primary" ? { background: "var(--accent-primary)", color: "#fff" } :
      variant === "secondary" ? { background: "var(--surface-2)", color: "var(--text-primary)", border: "1px solid var(--border)" } :
      { background: "transparent", color: "var(--text-secondary)" }),
  }) as React.CSSProperties,
  muted: { fontSize: 12, color: "var(--text-muted)" } as React.CSSProperties,
};

const TABS = [
  { id: "library", label: "Skills Library" },
  { id: "matcher", label: "Job Matcher" },
  { id: "mapper", label: "Skills Mapper" },
  { id: "export", label: "Export" },
];

// ── Main Component ──
export function SkillsMapEngine({ model, f, onBack, onNavigate }: {
  model: string; f: Filters; onBack: () => void; onNavigate?: (id: string) => void;
}) {
  // ── All hooks at top ──
  const [activeTab, setActiveTab] = usePersisted("skillsmap_tab", "library");
  const [searchQ, setSearchQ] = usePersisted("skillsmap_search", "");
  const [selectedSkill, setSelectedSkill] = usePersisted<string | null>("skillsmap_skill", null);
  const [selectedOcc, setSelectedOcc] = usePersisted<string | null>("skillsmap_occ", null);
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({ "Basic Skills": true });
  const [occExpanded, setOccExpanded] = useState(false);
  const [knowledgeExpanded, setKnowledgeExpanded] = useState(false);
  const [occSearchQ, setOccSearchQ] = useState("");

  // API data states
  const [apiSkills, setApiSkills] = useState<Record<string, unknown> | null>(null);
  const [occupations, setOccupations] = useState<Record<string, unknown>[]>([]);
  const [skillProfile, setSkillProfile] = useState<Record<string, unknown> | null>(null);
  const [occProfile, setOccProfile] = useState<Record<string, unknown> | null>(null);
  const [skillOccs, setSkillOccs] = useState<Record<string, unknown>[]>([]);
  const [occSkills, setOccSkills] = useState<Record<string, unknown>[]>([]);
  const [showAllOccs, setShowAllOccs] = useState(false);
  const [showAllSkills, setShowAllSkills] = useState(false);
  const [loading, setLoading] = useState(false);

  // Tab 2 state
  const [jobs, setJobs] = useState<Record<string, unknown>[]>([]);
  const [matchResults, setMatchResults] = useState<Record<string, Record<string, unknown>>>({});
  const [confirmedMatches, setConfirmedMatches] = useState<Record<string, string>>({});
  const [matchingAll, setMatchingAll] = useState(false);
  const [matchProgress, setMatchProgress] = useState(0);

  // Tab 3 state
  const [mappedJobs, setMappedJobs] = useState<Record<string, { skills: Record<string, unknown>[]; status: string }>>({});
  const [editingJob, setEditingJob] = useState<string | null>(null);
  const [jobSkillEdits, setJobSkillEdits] = useState<Record<string, unknown>[]>([]);

  // Tab 4 state
  const [exportView, setExportView] = useState<"job" | "skill">("job");
  const [exportByJob, setExportByJob] = useState<Record<string, unknown> | null>(null);
  const [exportBySkill, setExportBySkill] = useState<Record<string, unknown> | null>(null);
  const [exportSummary, setExportSummary] = useState<Record<string, unknown> | null>(null);

  // ── Load initial data on mount ──
  useEffect(() => {
    (async () => {
      try {
        const sk = await api.listOnetSkills();
        setApiSkills(sk);
      } catch (e) { console.error("[SkillsMap] listOnetSkills failed", e); }
      try {
        const occ = await api.searchOnetOccupations();
        const list = Array.isArray(occ) ? occ : ((occ as Record<string, unknown>)?.occupations as Record<string, unknown>[]) || [];
        setOccupations(list);
      } catch (e) { console.error("[SkillsMap] searchOnetOccupations failed", e); }
    })();
  }, []);

  // ── Load skill detail when selected ──
  useEffect(() => {
    if (!selectedSkill) { setSkillOccs([]); return; }
    const sk = ALL_SKILLS.find(s => s.id === selectedSkill);
    if (!sk) return;
    setLoading(true);
    setShowAllOccs(false);
    (async () => {
      try {
        const res = await api.getOnetSkillOccupations(sk.elementId);
        const list = Array.isArray(res) ? res : ((res as Record<string, unknown>)?.occupations as Record<string, unknown>[]) || [];
        setSkillOccs(list);
      } catch (e) { console.error("[SkillsMap] getOnetSkillOccupations failed", e); }
      setLoading(false);
    })();
  }, [selectedSkill]);

  // ── Load occupation detail when selected ──
  useEffect(() => {
    if (!selectedOcc) { setOccSkills([]); setOccProfile(null); return; }
    setLoading(true);
    setShowAllSkills(false);
    (async () => {
      try {
        const profile = await api.getOnetOccupation(selectedOcc);
        setOccProfile(profile);
      } catch (e) { console.error("[SkillsMap] getOnetOccupation failed", e); }
      try {
        const sk = await api.getOnetOccupationSkills(selectedOcc);
        const list = Array.isArray(sk) ? sk : ((sk as Record<string, unknown>)?.skills as Record<string, unknown>[]) || [];
        setOccSkills(list);
      } catch (e) { console.error("[SkillsMap] getOnetOccupationSkills failed", e); }
      setLoading(false);
    })();
  }, [selectedOcc]);

  // ── Load jobs for Tab 2 ──
  useEffect(() => {
    if (!model || activeTab !== "matcher") return;
    (async () => {
      try {
        const arch = await api.getJobArchitecture(model, f) as unknown as Record<string, unknown>;
        const rows = (arch?.rows as Record<string, unknown>[]) ||
                     (arch?.jobs as Record<string, unknown>[]) || [];
        // Deduplicate by title
        const seen = new Set<string>();
        const unique = rows.filter(r => {
          const t = (r.title || r.job_title || r.name || "") as string;
          if (!t || seen.has(t)) return false;
          seen.add(t);
          return true;
        });
        setJobs(unique);
      } catch (e) { console.error("[SkillsMap] getJobArchitecture failed", e); }
    })();
  }, [model, f.func, f.jf, f.sf, f.cl, activeTab]);

  // ── Load export data for Tab 4 ──
  useEffect(() => {
    if (activeTab !== "export") return;
    (async () => {
      try { setExportByJob(await api.getSkillsMapExportByJob()); } catch (e) { console.error(e); }
      try { setExportBySkill(await api.getSkillsMapExportBySkill()); } catch (e) { console.error(e); }
      try { setExportSummary(await api.getSkillsMapExportSummary()); } catch (e) { console.error(e); }
    })();
  }, [activeTab]);

  // ── Filtering logic ──
  const lowerQ = searchQ.toLowerCase();
  const filteredCategories = useMemo(() => {
    if (!lowerQ) return SKILL_CATEGORIES;
    return SKILL_CATEGORIES.map(c => ({
      ...c,
      skills: c.skills.filter(s => s.name.toLowerCase().includes(lowerQ) || c.name.toLowerCase().includes(lowerQ)),
    })).filter(c => c.skills.length > 0);
  }, [lowerQ]);

  const filteredOccs = useMemo(() => {
    const q = (occSearchQ || searchQ).toLowerCase();
    if (!q) return occupations.slice(0, 50);
    return occupations.filter(o => {
      const title = ((o.title || o.name || "") as string).toLowerCase();
      const code = ((o.soc_code || o.code || "") as string).toLowerCase();
      return title.includes(q) || code.includes(q);
    }).slice(0, 50);
  }, [occupations, occSearchQ, searchQ]);

  // ── Callbacks ──
  const handleSelectSkill = useCallback((id: string) => {
    setSelectedSkill(id);
    setSelectedOcc(null);
  }, [setSelectedSkill, setSelectedOcc]);

  const handleSelectOcc = useCallback((code: string) => {
    setSelectedOcc(code);
    setSelectedSkill(null);
  }, [setSelectedOcc, setSelectedSkill]);

  const toggleCat = useCallback((name: string) => {
    setExpandedCats(prev => ({ ...prev, [name]: !prev[name] }));
  }, []);

  const handleAutoMatchAll = useCallback(async () => {
    setMatchingAll(true);
    setMatchProgress(0);
    const total = jobs.length;
    for (let i = 0; i < total; i++) {
      const job = jobs[i];
      const title = (job.title || job.job_title || job.name || "") as string;
      try {
        const result = await api.matchJobToOnet(title, (job.description || "") as string);
        setMatchResults(prev => ({ ...prev, [title]: result }));
      } catch (e) { console.error("[SkillsMap] matchJobToOnet failed", e); }
      setMatchProgress(i + 1);
    }
    setMatchingAll(false);
  }, [jobs]);

  const handleConfirmMatch = useCallback(async (jobTitle: string, socCode: string) => {
    try {
      await api.confirmOnetMatch(jobTitle, socCode);
      setConfirmedMatches(prev => ({ ...prev, [jobTitle]: socCode }));
      showToast(`Matched: ${jobTitle} -> ${socCode}`);
    } catch (e) { console.error("[SkillsMap] confirmOnetMatch failed", e); }
  }, []);

  const handleAcceptHighConf = useCallback(() => {
    Object.entries(matchResults).forEach(([title, result]) => {
      const conf = (result.confidence || result.score || 0) as number;
      const code = (result.soc_code || result.code || "") as string;
      if (conf > 85 && code && !confirmedMatches[title]) {
        handleConfirmMatch(title, code);
      }
    });
  }, [matchResults, confirmedMatches, handleConfirmMatch]);

  const handleSaveMappedSkills = useCallback(async (jobId: string) => {
    try {
      await api.updateJobMappedSkills(jobId, jobSkillEdits);
      setMappedJobs(prev => ({ ...prev, [jobId]: { skills: jobSkillEdits, status: "Complete" } }));
      setEditingJob(null);
      showToast("Skills mapping saved");
    } catch (e) { console.error("[SkillsMap] updateJobMappedSkills failed", e); }
  }, [jobSkillEdits]);

  const confirmedCount = Object.keys(confirmedMatches).length;
  const mappedCount = Object.values(mappedJobs).filter(j => j.status === "Complete").length;

  // ── Render ──
  return React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 0, minHeight: "100%" } },
    React.createElement(PageHeader, {
      icon: "\uD83D\uDDFA\uFE0F", title: "O*NET Skills Map Engine",
      subtitle: "Browse skills, match jobs to O*NET, and build skill profiles",
      onBack,
    }),
    React.createElement("div", { style: { padding: "0 0 8px" } },
      React.createElement(TabBar, { tabs: TABS, active: activeTab, onChange: setActiveTab }),
    ),
    React.createElement("div", { style: { flex: 1, padding: "0 0 24px" } },
      activeTab === "library" ? renderLibrary() :
      activeTab === "matcher" ? renderMatcher() :
      activeTab === "mapper" ? renderMapper() :
      renderExport()
    ),
  );

  // ═══════════════════════════════════════════════════
  // TAB 1: Skills Library
  // ═══════════════════════════════════════════════════
  // ── Occupation browsing helpers ──
  const majorGroups = useMemo(() => {
    const groups: Record<string, { code: string; name: string; count: number }> = {};
    for (const o of occupations) {
      const mg = (o.major_group || "") as string;
      const mgn = (o.major_group_name || mg) as string;
      if (!mg) continue;
      if (!groups[mg]) groups[mg] = { code: mg, name: mgn, count: 0 };
      groups[mg].count++;
    }
    return Object.values(groups).sort((a, b) => a.code.localeCompare(b.code));
  }, [occupations]);

  const [majorGroupFilter, setMajorGroupFilter] = useState("All");
  const [jobZoneFilter, setJobZoneFilter] = useState("All");

  const browsableOccs = useMemo(() => {
    let list = [...occupations];
    if (majorGroupFilter !== "All") list = list.filter(o => (o.major_group as string) === majorGroupFilter);
    if (jobZoneFilter !== "All") list = list.filter(o => String(o.job_zone || "") === jobZoneFilter);
    if (searchQ) {
      const q = searchQ.toLowerCase();
      list = list.filter(o => {
        const title = ((o.title || "") as string).toLowerCase();
        const desc = ((o.description || "") as string).toLowerCase();
        const alts = ((o.alternate_titles || []) as string[]).join(" ").toLowerCase();
        const code = ((o.onet_soc_code || o.soc_code || "") as string).toLowerCase();
        return title.includes(q) || desc.includes(q) || alts.includes(q) || code.includes(q);
      });
    }
    return list.sort((a, b) => ((a.title || "") as string).localeCompare((b.title || "") as string));
  }, [occupations, majorGroupFilter, jobZoneFilter, searchQ]);

  const JZ_LABELS: Record<string, string> = { "1": "Little or No Preparation", "2": "Some Preparation", "3": "Medium Preparation", "4": "Considerable Preparation", "5": "Extensive Preparation" };
  const JZ_COLORS: Record<string, string> = { "1": "#10B981", "2": "#3B82F6", "3": "#F59E0B", "4": "#EF4444", "5": "#8B5CF6" };

  function renderLibrary() {
    return React.createElement("div", { style: { display: "flex", gap: 16, minHeight: 600 } },
      // ═══ LEFT PANEL — Filter & Browse ═══
      React.createElement("div", { style: { width: 300, flexShrink: 0, ...S.panel, overflowY: "auto", maxHeight: "75vh", display: "flex", flexDirection: "column" } },
        // Search
        React.createElement("input", {
          type: "text", placeholder: "Search occupations by title, code, or keyword...",
          value: searchQ, onChange: (e: React.ChangeEvent<HTMLInputElement>) => setSearchQ(e.target.value),
          style: { ...S.input, marginBottom: 10 },
        }),
        // Filters
        React.createElement("div", { style: { display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" as const } },
          React.createElement("select", {
            value: majorGroupFilter,
            onChange: (e: React.ChangeEvent<HTMLSelectElement>) => { setMajorGroupFilter(e.target.value); setSelectedOcc(null); },
            style: { ...S.input, flex: 1, fontSize: 12, padding: "5px 8px", minWidth: 120 },
          },
            React.createElement("option", { value: "All" }, "All Major Groups"),
            ...majorGroups.map(g => React.createElement("option", { key: g.code, value: g.code }, `${g.name} (${g.count})`)),
          ),
          React.createElement("select", {
            value: jobZoneFilter,
            onChange: (e: React.ChangeEvent<HTMLSelectElement>) => { setJobZoneFilter(e.target.value); setSelectedOcc(null); },
            style: { ...S.input, width: 80, fontSize: 12, padding: "5px 8px" },
          },
            React.createElement("option", { value: "All" }, "All Zones"),
            ...["1","2","3","4","5"].map(z => React.createElement("option", { key: z, value: z }, `Zone ${z}`)),
          ),
        ),
        // Count
        React.createElement("div", { style: { fontSize: 11, color: "var(--text-muted)", marginBottom: 8, paddingLeft: 4 } },
          `${browsableOccs.length} occupation${browsableOccs.length !== 1 ? "s" : ""}`
        ),
        // Occupation list
        React.createElement("div", { style: { flex: 1, overflowY: "auto" } },
          browsableOccs.length === 0
            ? React.createElement("div", { style: { ...S.muted, textAlign: "center" as const, padding: 24 } }, "No occupations match your filters")
            : browsableOccs.map(o => {
                const code = (o.onet_soc_code || o.soc_code || o.code || "") as string;
                const title = (o.title || o.name || "") as string;
                const jz = String(o.job_zone || "");
                const isActive = selectedOcc === code;
                return React.createElement("div", {
                  key: code,
                  onClick: () => handleSelectOcc(code),
                  style: {
                    padding: "8px 10px", borderRadius: 8, cursor: "pointer", marginBottom: 2,
                    background: isActive ? "rgba(212,134,10,0.1)" : "transparent",
                    borderLeft: isActive ? "3px solid var(--accent-primary)" : "3px solid transparent",
                    transition: "all 0.12s",
                  },
                },
                  React.createElement("div", { style: { fontSize: 13, fontWeight: isActive ? 600 : 400, color: isActive ? "var(--text-primary)" : "var(--text-secondary)", lineHeight: 1.3 } }, title),
                  React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 6, marginTop: 2 } },
                    React.createElement("span", { style: { fontSize: 11, color: "var(--text-muted)", fontFamily: "'IBM Plex Mono', monospace" } }, code),
                    jz ? React.createElement("span", { style: { fontSize: 10, fontWeight: 600, padding: "1px 5px", borderRadius: 4, background: `${JZ_COLORS[jz] || "#888"}15`, color: JZ_COLORS[jz] || "#888" } }, `Zone ${jz}`) : null,
                  ),
                );
              }),
        ),
      ),

      // ═══ RIGHT PANEL — Job Profile ═══
      React.createElement("div", { style: { flex: 1, ...S.panel, overflowY: "auto", maxHeight: "75vh" } },
        loading ? React.createElement(LoadingSkeleton, { rows: 8 }) :
        selectedOcc ? renderOccProfile() :
        renderLibraryWelcome()
      ),
    );
  }

  function renderLibraryWelcome() {
    return React.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400, gap: 16, textAlign: "center" as const } },
      React.createElement("div", { style: { fontSize: 48, opacity: 0.4 } }, "\uD83D\uDDFA\uFE0F"),
      React.createElement("div", { style: { fontSize: 20, fontWeight: 700, color: "var(--text-primary)" } }, "O*NET Job Architecture Browser"),
      React.createElement("div", { style: { fontSize: 14, color: "var(--text-secondary)", maxWidth: 480, lineHeight: 1.6 } },
        "Select an occupation from the left panel to view its full profile \u2014 skills, knowledge requirements, tasks, and technology skills."
      ),
      React.createElement("div", { style: S.muted }, `${occupations.length} occupations across ${majorGroups.length} major groups \u2022 35 skills \u2022 O*NET v30.2`),
    );
  }

  function renderOccProfile() {
    const profile = occProfile as Record<string, unknown> | null;
    const title = (profile?.title || profile?.name || selectedOcc || "") as string;
    const socCode = (profile?.onet_soc_code || profile?.soc_code || selectedOcc || "") as string;
    const description = (profile?.description || "") as string;
    const jobZone = String(profile?.job_zone || profile?.jobZone || "");
    const altTitles = (profile?.alternate_titles || profile?.alt_titles || []) as string[];
    const majorGroupName = (profile?.major_group_name || "") as string;
    const majorGroupCode = (profile?.major_group || "") as string;
    const tasks = (profile?.tasks || []) as Record<string, unknown>[];
    const techSkills = (profile?.technology_skills || []) as Record<string, unknown>[];
    const top = occSkills.slice(0, showAllSkills ? occSkills.length : 10);

    // Section styling
    const sectionTitle = (text: string) => React.createElement("h3", {
      style: { fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 10, paddingBottom: 6,
        borderBottom: "1px solid var(--border)", textTransform: "uppercase" as const, letterSpacing: 0.5 }
    }, text);

    return React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 20 } },
      // ── Section 1: Header ──
      React.createElement("div", null,
        React.createElement("h2", { style: { fontSize: 24, fontWeight: 800, color: "var(--text-primary)", margin: 0, lineHeight: 1.2, fontFamily: "'Outfit', sans-serif" } }, title),
        React.createElement("div", { style: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" as const, marginTop: 8 } },
          React.createElement("span", { style: { fontSize: 12, fontFamily: "'IBM Plex Mono', monospace", color: "var(--text-muted)", background: "var(--surface-2)", padding: "2px 8px", borderRadius: 4 } }, socCode),
          jobZone ? React.createElement("span", { style: { fontSize: 12, fontWeight: 600, padding: "2px 8px", borderRadius: 4, background: `${JZ_COLORS[jobZone] || "#888"}15`, color: JZ_COLORS[jobZone] || "#888" } }, `Zone ${jobZone} \u2014 ${JZ_LABELS[jobZone] || ""}`) : null,
          React.createElement("span", { style: { fontSize: 12, color: "var(--text-muted)", background: "var(--surface-2)", padding: "2px 8px", borderRadius: 4 } }, "O*NET Default"),
        ),
      ),

      // ── Section 2: Architecture Breadcrumb ──
      majorGroupName ? React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 6, fontSize: 13 } },
        React.createElement("span", { style: { cursor: "pointer", color: "var(--accent-primary)", fontWeight: 600 }, onClick: () => { setMajorGroupFilter(majorGroupCode); setSelectedOcc(null); } }, majorGroupName),
        React.createElement("span", { style: { color: "var(--text-muted)" } }, "\u203A"),
        React.createElement("span", { style: { color: "var(--text-secondary)", fontWeight: 500 } }, title),
      ) : null,

      // ── Section 3: Overview ──
      description ? React.createElement("div", null,
        sectionTitle("Overview"),
        React.createElement("p", { style: { fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7, margin: 0 } }, description),
      ) : null,

      // ── Alternate Titles ──
      altTitles.length > 0 ? React.createElement("div", null,
        React.createElement("div", { style: { fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6 } }, "Also Known As"),
        React.createElement("div", { style: { display: "flex", gap: 6, flexWrap: "wrap" as const } },
          ...altTitles.map((t, i) => React.createElement("span", { key: i, style: { fontSize: 12, padding: "3px 10px", borderRadius: 12, background: "var(--surface-2)", color: "var(--text-secondary)", border: "1px solid var(--border)" } }, t)),
        ),
      ) : null,

      // ── Section 4: Key Responsibilities (Tasks) ──
      tasks.length > 0 ? React.createElement("div", null,
        sectionTitle("Key Responsibilities"),
        React.createElement("ul", { style: { margin: 0, paddingLeft: 20 } },
          ...tasks.slice(0, 7).map((t, i) => React.createElement("li", {
            key: i, style: { fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 6 }
          }, (t.task || t.description || "") as string)),
        ),
      ) : null,

      // ── Section 5: Skills Profile ──
      React.createElement("div", null,
        sectionTitle("Skills Profile"),
        occSkills.length === 0
          ? React.createElement("div", { style: S.muted }, "Loading skills...")
          : React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 4 } },
              ...top.map((sk, i) => {
                const name = (sk.name || sk.skill_name || sk.title || "") as string;
                const importance = Number(sk.importance || sk.score || 0);
                const level = Number(sk.level || 0);
                const cat = getCategoryForSkill(name);
                const barPct = (importance / 5) * 100;
                return React.createElement("div", {
                  key: i,
                  style: { display: "grid", gridTemplateColumns: "140px 1fr 50px 50px", gap: 8, padding: "5px 0", alignItems: "center", borderBottom: i < top.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none" },
                },
                  React.createElement("span", { style: { fontSize: 13, color: "var(--text-secondary)", fontWeight: 500 } }, name),
                  React.createElement("div", { style: { height: 16, background: "var(--surface-2)", borderRadius: 4, overflow: "hidden" } },
                    React.createElement("div", { style: S.bar(barPct, cat.color) }),
                  ),
                  React.createElement("span", { style: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "var(--text-muted)", textAlign: "right" as const } }, importance.toFixed(1)),
                  React.createElement("span", { style: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "var(--text-muted)", textAlign: "right" as const } }, level.toFixed(1)),
                );
              }),
              !showAllSkills && occSkills.length > 10
                ? React.createElement("button", { style: { ...S.btn("ghost"), marginTop: 6, fontSize: 12 }, onClick: () => setShowAllSkills(true) }, `View all ${occSkills.length} skills`)
                : showAllSkills && occSkills.length > 10
                ? React.createElement("button", { style: { ...S.btn("ghost"), marginTop: 6, fontSize: 12 }, onClick: () => setShowAllSkills(false) }, "Show top 10 only")
                : null,
            ),
      ),

      // ── Section 6: Technology Skills ──
      techSkills.length > 0 ? React.createElement("div", null,
        sectionTitle("Technology Skills"),
        React.createElement("div", { style: { display: "flex", gap: 6, flexWrap: "wrap" as const } },
          ...techSkills.map((t, i) => {
            const name = (t.commodity_title || t.name || "") as string;
            const hot = t.hot_technology as boolean;
            return React.createElement("span", { key: i, style: {
              fontSize: 12, padding: "4px 10px", borderRadius: 6,
              background: hot ? "rgba(239,68,68,0.1)" : "var(--surface-2)",
              color: hot ? "var(--risk)" : "var(--text-secondary)",
              border: `1px solid ${hot ? "rgba(239,68,68,0.2)" : "var(--border)"}`,
              fontWeight: hot ? 600 : 400,
            } }, name + (hot ? " \uD83D\uDD25" : ""));
          }),
        ),
      ) : null,

      // ── Section 7: Education & Experience ──
      jobZone ? React.createElement("div", null,
        sectionTitle("Education & Experience"),
        React.createElement("div", { style: { fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6 } },
          `Job Zone ${jobZone}: ${JZ_LABELS[jobZone] || ""}. `,
          jobZone === "1" ? "Requires little or no prior work experience. Some basic education may be helpful." :
          jobZone === "2" ? "Typically requires a high school diploma and some previous work experience." :
          jobZone === "3" ? "Most require training in vocational schools, on-the-job experience, or an associate's degree." :
          jobZone === "4" ? "Most require a four-year bachelor's degree, but some do not. Considerable preparation is needed." :
          "Most require graduate school. Extensive skill, knowledge, and experience are needed.",
        ),
      ) : null,
    );
  }

  // ═══════════════════════════════════════════════════
  // TAB 2: Job Matcher
  // ═══════════════════════════════════════════════════
  function renderMatcher() {
    if (!model) {
      return React.createElement(Empty, { icon: "\uD83D\uDCBC", text: "Job Matcher Requires Workforce Data", subtitle: "Upload workforce data with job titles to match your roles against O*NET occupational classifications." });
    }
    if (jobs.length === 0) {
      return React.createElement("div", { style: S.panel },
        React.createElement(LoadingSkeleton, { rows: 4 }),
        React.createElement("div", { style: { ...S.muted, marginTop: 8 } }, "Loading job titles from workforce data..."),
      );
    }

    return React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 16 } },
      // Progress bar
      React.createElement("div", { style: { ...S.panel, display: "flex", alignItems: "center", gap: 16 } },
        React.createElement("div", { style: { flex: 1 } },
          React.createElement("div", { style: { fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 6 } },
            `${confirmedCount} of ${jobs.length} jobs matched (${confirmedCount} confirmed)`
          ),
          React.createElement("div", { style: { height: 8, background: "var(--surface-2)", borderRadius: 4, overflow: "hidden" } },
            React.createElement("div", { style: { width: `${jobs.length > 0 ? (confirmedCount / jobs.length) * 100 : 0}%`, height: "100%", background: "var(--success)", borderRadius: 4, transition: "width 0.3s" } }),
          ),
        ),
        React.createElement("button", { style: S.btn("primary"), onClick: handleAutoMatchAll, disabled: matchingAll },
          matchingAll ? `Matching... (${matchProgress}/${jobs.length})` : "Auto-Match All"
        ),
        React.createElement("button", { style: S.btn("secondary"), onClick: handleAcceptHighConf },
          "Accept All High Confidence (>85%)"
        ),
      ),

      // Job table
      React.createElement("div", { style: { ...S.panel, overflowX: "auto" as const } },
        React.createElement("table", { style: { width: "100%", borderCollapse: "collapse" as const, fontSize: 13 } },
          React.createElement("thead", null,
            React.createElement("tr", { style: { borderBottom: "2px solid var(--border)" } },
              ...[  "Job Title", "Function", "Match Status", "O*NET Match", "Confidence", "Actions"].map(h =>
                React.createElement("th", { key: h, style: { textAlign: "left" as const, padding: "8px 12px", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" as const } }, h)
              )
            ),
          ),
          React.createElement("tbody", null,
            ...jobs.map((job, i) => {
              const title = (job.title || job.job_title || job.name || "") as string;
              const func = (job.function || job.func || job.department || "") as string;
              const match = matchResults[title] as Record<string, unknown> | undefined;
              const confirmed = confirmedMatches[title];
              const matchTitle = match ? ((match.title || match.occupation || "") as string) : "";
              const matchCode = match ? ((match.soc_code || match.code || "") as string) : "";
              const confidence = match ? ((match.confidence || match.score || 0) as number) : 0;
              const status = confirmed ? "Confirmed" : match ? "Matched" : "Pending";
              const statusColor = confirmed ? "var(--success)" : match ? "var(--warning)" : "var(--text-muted)";

              return React.createElement("tr", { key: i, style: { borderBottom: "1px solid var(--border)" } },
                React.createElement("td", { style: { padding: "10px 12px", color: "var(--text-primary)", fontWeight: 500 } }, title),
                React.createElement("td", { style: { padding: "10px 12px", color: "var(--text-secondary)" } }, func),
                React.createElement("td", { style: { padding: "10px 12px" } },
                  React.createElement("span", { style: { color: statusColor, fontWeight: 600, fontSize: 12 } }, status)
                ),
                React.createElement("td", { style: { padding: "10px 12px", color: "var(--text-secondary)", fontSize: 12 } },
                  confirmed || matchTitle ? `${matchTitle} (${confirmed || matchCode})` : "\u2014"
                ),
                React.createElement("td", { style: { padding: "10px 12px" } },
                  match ? React.createElement(ConfidenceBadge, { score: confidence / 100, dataPoints: undefined, label: undefined }) : React.createElement("span", { style: S.muted }, "\u2014")
                ),
                React.createElement("td", { style: { padding: "10px 12px", display: "flex", gap: 6 } },
                  !confirmed && match ? React.createElement("button", { style: { ...S.btn("primary"), padding: "4px 10px", fontSize: 11 }, onClick: () => handleConfirmMatch(title, matchCode) }, "Accept") : null,
                  !confirmed && match ? React.createElement("button", { style: { ...S.btn("ghost"), padding: "4px 10px", fontSize: 11 }, onClick: () => {
                    setMatchResults(prev => { const next = { ...prev }; delete next[title]; return next; });
                  }}, "Skip") : null,
                  confirmed ? React.createElement("span", { style: { fontSize: 11, color: "var(--success)" } }, "\u2713 Confirmed") : null,
                ),
              );
            })
          ),
        ),
      ),
    );
  }

  // ═══════════════════════════════════════════════════
  // TAB 3: Skills Mapper
  // ═══════════════════════════════════════════════════
  function renderMapper() {
    const confirmedJobs = Object.entries(confirmedMatches);
    if (confirmedJobs.length === 0) {
      return React.createElement(Empty, { icon: "\uD83D\uDD17", text: "No Confirmed Job Matches", subtitle: "Use the Job Matcher tab first to match and confirm your job titles against O*NET occupations before mapping skills." });
    }

    if (editingJob) {
      return renderMapperEditor(editingJob);
    }

    return React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 16 } },
      React.createElement("div", { style: { ...S.panel, display: "flex", alignItems: "center", justifyContent: "space-between" } },
        React.createElement("span", { style: { fontSize: 14, fontWeight: 600, color: "var(--text-primary)" } },
          `${mappedCount} of ${confirmedJobs.length} jobs mapped`
        ),
        React.createElement("div", { style: { height: 8, width: 200, background: "var(--surface-2)", borderRadius: 4, overflow: "hidden" } },
          React.createElement("div", { style: { width: `${confirmedJobs.length > 0 ? (mappedCount / confirmedJobs.length) * 100 : 0}%`, height: "100%", background: "var(--accent-primary)", borderRadius: 4 } }),
        ),
      ),
      React.createElement("div", { style: S.panel },
        React.createElement("table", { style: { width: "100%", borderCollapse: "collapse" as const, fontSize: 13 } },
          React.createElement("thead", null,
            React.createElement("tr", { style: { borderBottom: "2px solid var(--border)" } },
              ...["Job Title", "O*NET Match", "Mapping Status", "Actions"].map(h =>
                React.createElement("th", { key: h, style: { textAlign: "left" as const, padding: "8px 12px", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" as const } }, h)
              )
            ),
          ),
          React.createElement("tbody", null,
            ...confirmedJobs.map(([title, socCode]) => {
              const mapped = mappedJobs[title];
              const status = mapped?.status || "Not Started";
              const statusColor = status === "Complete" ? "var(--success)" : status === "In Progress" ? "var(--warning)" : "var(--text-muted)";
              return React.createElement("tr", { key: title, style: { borderBottom: "1px solid var(--border)" } },
                React.createElement("td", { style: { padding: "10px 12px", color: "var(--text-primary)", fontWeight: 500 } }, title),
                React.createElement("td", { style: { padding: "10px 12px", color: "var(--text-secondary)", fontSize: 12, fontFamily: "'IBM Plex Mono', monospace" } }, socCode),
                React.createElement("td", { style: { padding: "10px 12px" } },
                  React.createElement("span", { style: { color: statusColor, fontWeight: 600, fontSize: 12 } }, status)
                ),
                React.createElement("td", { style: { padding: "10px 12px" } },
                  React.createElement("button", {
                    style: { ...S.btn("secondary"), padding: "4px 12px", fontSize: 11 },
                    onClick: async () => {
                      setEditingJob(title);
                      setMappedJobs(prev => ({ ...prev, [title]: { ...prev[title], status: "In Progress", skills: prev[title]?.skills || [] } }));
                      // Load O*NET skills for this occupation
                      try {
                        const sk = await api.getOnetOccupationSkills(socCode);
                        const list = Array.isArray(sk) ? sk : ((sk as Record<string, unknown>)?.skills as Record<string, unknown>[]) || [];
                        const sorted = [...list].sort((a, b) => ((b.importance || b.score || 0) as number) - ((a.importance || a.score || 0) as number));
                        const enriched = sorted.map(s => ({ ...s, keep: true, proficiency: "Intermediate" }));
                        setJobSkillEdits(enriched);
                      } catch (e) { console.error("[SkillsMap] getOnetOccupationSkills failed", e); }
                    },
                  }, status === "Complete" ? "Edit" : "Map Skills"),
                ),
              );
            })
          ),
        ),
      ),
    );
  }

  function renderMapperEditor(jobTitle: string) {
    return React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 16 } },
      React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12 } },
        React.createElement("button", { style: S.btn("ghost"), onClick: () => setEditingJob(null) }, "\u2190 Back"),
        React.createElement("h3", { style: { fontSize: 18, fontWeight: 700, color: "var(--text-primary)", margin: 0 } }, `Skills Profile: ${jobTitle}`),
      ),
      React.createElement("div", { style: S.panel },
        jobSkillEdits.length === 0
          ? React.createElement(LoadingSkeleton, { rows: 5 })
          : React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 4 } },
              React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1.5fr 2fr 140px 80px", gap: 8, padding: "8px 0", borderBottom: "2px solid var(--border)", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" as const } },
                React.createElement("span", null, "Skill"),
                React.createElement("span", null, "Importance"),
                React.createElement("span", null, "Proficiency"),
                React.createElement("span", null, "Include"),
              ),
              ...jobSkillEdits.map((sk, i) => {
                const name = (sk.name || sk.skill || sk.title || "") as string;
                const importance = (sk.importance || sk.score || 0) as number;
                const barPct = (importance / 5) * 100;
                const cat = getCategoryForSkill(name);
                const keep = sk.keep as boolean;
                const prof = (sk.proficiency || "Intermediate") as string;
                return React.createElement("div", {
                  key: i,
                  style: { display: "grid", gridTemplateColumns: "1.5fr 2fr 140px 80px", gap: 8, padding: "8px 0", alignItems: "center", borderBottom: "1px solid var(--border)", opacity: keep ? 1 : 0.4, fontSize: 13, color: "var(--text-secondary)" },
                },
                  React.createElement("span", null, name),
                  React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 6 } },
                    React.createElement("div", { style: { flex: 1, height: 18, background: "var(--surface-2)", borderRadius: 4, overflow: "hidden" } },
                      React.createElement("div", { style: S.bar(barPct, cat.color) }),
                    ),
                    React.createElement("span", { style: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, minWidth: 32 } }, importance.toFixed(1)),
                  ),
                  React.createElement("select", {
                    value: prof,
                    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => {
                      setJobSkillEdits(prev => prev.map((s, j) => j === i ? { ...s, proficiency: e.target.value } : s));
                    },
                    style: { ...S.input, padding: "4px 8px", fontSize: 12 },
                  },
                    ...["Foundational", "Intermediate", "Advanced", "Expert"].map(p =>
                      React.createElement("option", { key: p, value: p }, p)
                    )
                  ),
                  React.createElement("button", {
                    style: { ...S.btn(keep ? "primary" : "ghost"), padding: "4px 10px", fontSize: 11, minWidth: 60 },
                    onClick: () => {
                      setJobSkillEdits(prev => prev.map((s, j) => j === i ? { ...s, keep: !keep } : s));
                    },
                  }, keep ? "Keep" : "Remove"),
                );
              }),
            ),
        React.createElement("div", { style: { display: "flex", gap: 12, marginTop: 16 } },
          React.createElement("button", { style: S.btn("primary"), onClick: () => handleSaveMappedSkills(jobTitle) }, "Save Mapping"),
          React.createElement("button", {
            style: S.btn("secondary"),
            onClick: () => {
              setJobSkillEdits(prev => [...prev, { name: "Custom Skill", importance: 3, level: 3, keep: true, proficiency: "Intermediate", custom: true }]);
            },
          }, "+ Add Custom Skill"),
          React.createElement("button", { style: S.btn("ghost"), onClick: () => setEditingJob(null) }, "Cancel"),
        ),
      ),
    );
  }

  // ═══════════════════════════════════════════════════
  // TAB 4: Export
  // ═══════════════════════════════════════════════════
  function renderExport() {
    const summaryData = exportSummary as Record<string, unknown> | null;
    const totalJobs = (summaryData?.total_jobs || mappedCount || 0) as number;
    const totalSkills = (summaryData?.total_skills || 35) as number;
    const avgPerJob = (summaryData?.avg_skills_per_job || 0) as number;

    return React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 16 } },
      // Summary KPIs
      React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 } },
        React.createElement(KpiCard, { label: "Total Jobs Mapped", value: totalJobs }),
        React.createElement(KpiCard, { label: "Total Skills Assigned", value: totalSkills }),
        React.createElement(KpiCard, { label: "Avg Skills Per Job", value: avgPerJob > 0 ? avgPerJob.toFixed(1) : "\u2014" }),
      ),

      // View toggle
      React.createElement("div", { style: { display: "flex", gap: 8 } },
        React.createElement("button", {
          style: { ...S.btn(exportView === "job" ? "primary" : "secondary") },
          onClick: () => setExportView("job"),
        }, "By Job"),
        React.createElement("button", {
          style: { ...S.btn(exportView === "skill" ? "primary" : "secondary") },
          onClick: () => setExportView("skill"),
        }, "By Skill"),
      ),

      // Preview table
      React.createElement("div", { style: S.panel },
        exportView === "job" ? renderExportByJob() : renderExportBySkill(),
      ),

      // Download button
      React.createElement("div", { style: { display: "flex", gap: 12 } },
        React.createElement("button", {
          style: S.btn("primary"),
          onClick: () => showToast("Export coming soon"),
        }, "Download Excel"),
      ),
    );
  }

  function renderExportByJob() {
    const data = exportByJob as Record<string, unknown> | null;
    const rows = (data?.rows || data?.jobs || []) as Record<string, unknown>[];
    // Also show confirmed matches as fallback
    const confirmedJobs = Object.entries(confirmedMatches);
    const displayRows = rows.length > 0 ? rows : confirmedJobs.map(([title, code]) => ({
      title,
      soc_code: code,
      skills_count: mappedJobs[title]?.skills?.length || 0,
      status: mappedJobs[title]?.status || "Not Started",
    }));

    if (displayRows.length === 0) {
      return React.createElement(Empty, { icon: "\uD83D\uDCE6", text: "No Mapped Jobs to Export", subtitle: "Complete the Job Matcher and Skills Mapper tabs to generate exportable skill-to-role mappings." });
    }

    return React.createElement("table", { style: { width: "100%", borderCollapse: "collapse" as const, fontSize: 13 } },
      React.createElement("thead", null,
        React.createElement("tr", { style: { borderBottom: "2px solid var(--border)" } },
          ...["Job Title", "O*NET Code", "Skills Count", "Status"].map(h =>
            React.createElement("th", { key: h, style: { textAlign: "left" as const, padding: "8px 12px", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" as const } }, h)
          )
        ),
      ),
      React.createElement("tbody", null,
        ...displayRows.slice(0, 20).map((row, i) => {
          const r = row as Record<string, unknown>;
          return React.createElement("tr", { key: i, style: { borderBottom: "1px solid var(--border)" } },
            React.createElement("td", { style: { padding: "8px 12px", color: "var(--text-primary)" } }, (r.title || r.job_title || "") as string),
            React.createElement("td", { style: { padding: "8px 12px", color: "var(--text-secondary)", fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 } }, (r.soc_code || r.code || "") as string),
            React.createElement("td", { style: { padding: "8px 12px", color: "var(--text-secondary)" } }, String(r.skills_count || r.skills || 0)),
            React.createElement("td", { style: { padding: "8px 12px", color: "var(--text-muted)", fontSize: 12 } }, (r.status || "Mapped") as string),
          );
        })
      ),
    );
  }

  function renderExportBySkill() {
    const data = exportBySkill as Record<string, unknown> | null;
    const rows = (data?.rows || data?.skills || []) as Record<string, unknown>[];
    // Fallback: show all 35 skills with counts from mappedJobs
    const displayRows = rows.length > 0 ? rows : ALL_SKILLS.map(sk => {
      const jobCount = Object.values(mappedJobs).filter(j =>
        j.skills.some(s => (s.name || s.skill || "") === sk.name && s.keep !== false)
      ).length;
      return { skill: sk.name, category: sk.category, job_count: jobCount };
    });

    if (displayRows.length === 0) {
      return React.createElement("div", { style: { ...S.muted, padding: 24, textAlign: "center" as const } }, "No skill data to export yet");
    }

    return React.createElement("table", { style: { width: "100%", borderCollapse: "collapse" as const, fontSize: 13 } },
      React.createElement("thead", null,
        React.createElement("tr", { style: { borderBottom: "2px solid var(--border)" } },
          ...["Skill", "Category", "Jobs Using"].map(h =>
            React.createElement("th", { key: h, style: { textAlign: "left" as const, padding: "8px 12px", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" as const } }, h)
          )
        ),
      ),
      React.createElement("tbody", null,
        ...displayRows.slice(0, 35).map((row, i) => {
          const r = row as Record<string, unknown>;
          const skillName = (r.skill || r.name || "") as string;
          const cat = getCategoryForSkill(skillName);
          return React.createElement("tr", { key: i, style: { borderBottom: "1px solid var(--border)" } },
            React.createElement("td", { style: { padding: "8px 12px", color: "var(--text-primary)" } }, skillName),
            React.createElement("td", { style: { padding: "8px 12px" } },
              React.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: 6 } },
                React.createElement("span", { style: { width: 8, height: 8, borderRadius: "50%", background: cat.color, display: "inline-block" } }),
                React.createElement("span", { style: { color: "var(--text-secondary)", fontSize: 12 } }, (r.category || cat.name) as string),
              )
            ),
            React.createElement("td", { style: { padding: "8px 12px", color: "var(--text-secondary)", fontFamily: "'IBM Plex Mono', monospace" } }, String(r.job_count || 0)),
          );
        })
      ),
    );
  }
}
