"use client";
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import * as api from "../../../lib/api";
import type { Filters } from "../../../lib/api";
import { fmt } from "../../../lib/formatters";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend, CartesianGrid } from "recharts";
import {
  ViewContext, COLORS, TT,
  KpiCard, Card, Empty, Badge, InsightPanel, NarrativePanel, DataTable,
  BarViz, DonutViz, RadarViz, TabBar, PageHeader, LoadingBar, LoadingSkeleton,
  ModuleExportButton, NextStepBar, ContextStrip, InfoButton,
  useApiData, usePersisted, useDebounce, callAI, showToast, logDec,
  exportToCSV, EmptyWithAction, JobDesignState, SIM_PRESETS,
  CareerFrameworkAccordion, HelpBookAccordion, ErrorBoundary,
  fmtNum,
} from "../shared";
import { SlidersHorizontal, Network, Sparkle, BookOpen, ChevronLeft, ChevronRight, Gauge, Settings2, Layers3, Check, X, TriangleAlert, GitBranch } from "@/lib/icons";
import { FlowNav, ExpertPanel } from "@/app/ui";
import { PathStepBanner } from "../designpaths/PathStepBanner";
import { SoftCompletionWarning } from "../designpaths/SoftCompletionWarning";
import { usePathBanner } from "../../lib/designpaths/usePathBanner";

export const OM_FUNCTIONS: Record<string, { label: string; icon: string; core: string[]; shared: string[]; enabling: string[]; interface_: string[] }> = {
  finance: { label: "Finance & Fund Ops", icon: "💰", core: ["Accounting & Close","Treasury & Cash Mgmt","Tax & Compliance","FP&A & Budgeting","Fund Administration","Financial Reporting","Internal Audit","Procurement","Accounts Payable","Accounts Receivable","Revenue Recognition","Cost Management"], shared: ["Financial Systems","Shared Reporting Pool","Data Governance"], enabling: ["ERP Platform","BI & Analytics Tools","Automation Layer"], interface_: ["Investor Reporting Portal","Management Dashboard","Regulatory Filing"] },
  technology: { label: "Technology & Data", icon: "⚙️", core: ["Software Engineering","Cloud Infrastructure","Data Engineering","Data Science & AI","Cybersecurity","IT Operations","Enterprise Architecture","Platform Engineering","Site Reliability","DevOps & CI/CD"], shared: ["Shared Dev Tools","Identity & Access","Monitoring & Observability"], enabling: ["Cloud Platform","API Gateway","ML Infrastructure"], interface_: ["Developer Portal","IT Service Desk","Client-Facing APIs"] },
  hr: { label: "Human Resources", icon: "👥", core: ["Talent Acquisition","Total Rewards & Comp","Learning & Development","People Analytics","Employee Relations","DEI & Belonging","HR Operations","Workforce Planning","Succession Planning","Performance Management","Organizational Design","Culture & Engagement"], shared: ["HRIS Platform","Payroll Processing","Benefits Administration"], enabling: ["People Analytics Platform","LMS","ATS"], interface_: ["Employee Self-Service","Manager Portal","Candidate Experience"] },
  legal: { label: "Legal & Compliance", icon: "⚖️", core: ["Corporate Legal","Regulatory Affairs","Compliance Operations","Risk Oversight","Privacy & Data Protection","IP & Contracts","Litigation","Policy & Governance","Ethics & Investigations","Licensing"], shared: ["Legal Operations","Contract Management","eDiscovery"], enabling: ["CLM Platform","Compliance Monitoring","Risk Database"], interface_: ["Policy Portal","Whistleblower Channel","Regulatory Dashboard"] },
  investments: { label: "Investment Management", icon: "📈", core: ["Research & Analysis","Deal Origination","Underwriting","Portfolio Management","Trading & Execution","Risk Analytics","Valuation","Asset Allocation","Due Diligence","Portfolio Monitoring","ESG Integration","Co-Investment","Fund Structuring"], shared: ["Investor Relations","Fund Accounting","Performance Reporting"], enabling: ["Trading Platform","Data Feeds","Risk Models","Portfolio Analytics"], interface_: ["Investor Portal","LP Reporting","Deal Pipeline Dashboard"] },
  operations: { label: "Operations", icon: "🔧", core: ["Supply Chain Planning","Manufacturing","Quality Assurance","Logistics & Distribution","Customer Operations","Facilities Management","Process Excellence","Inventory Management","Vendor Management","Safety & Compliance"], shared: ["Shared Services Center","Procurement Hub","Fleet Management"], enabling: ["ERP & MRP","IoT & Sensors","WMS"], interface_: ["Supplier Portal","Customer Service","Operations Dashboard"] },
  marketing: { label: "Marketing & Growth", icon: "📣", core: ["Brand Strategy","Digital Marketing","Content & Creative","Marketing Analytics","Demand Generation","Product Marketing","Communications & PR","Social Media","SEO & SEM","CRM & Lifecycle","Market Research","Events & Sponsorships"], shared: ["Marketing Ops","Creative Services Pool","Media Buying"], enabling: ["Marketing Automation","CMS","Analytics Platform"], interface_: ["Brand Portal","Partner Hub","Campaign Dashboard"] },
  product: { label: "Product & Engineering", icon: "🚀", core: ["Product Management","Frontend Engineering","Backend Engineering","Mobile Engineering","UX/UI Design","Quality Engineering","DevOps","Data Engineering","Machine Learning","Platform Services","Technical Architecture"], shared: ["Design System","Component Library","Testing Infrastructure"], enabling: ["CI/CD Pipeline","Feature Flags","Monitoring"], interface_: ["Product Roadmap Portal","API Documentation","Release Notes"] },
};
export const OM_ARCHETYPES: Record<string, { label: string; desc: string; visual: string; gov: string[]; shared: string[]; traits: Record<string, number>; corePrefix: string; coreSuffix: string; enableTheme: string[]; interfaceTheme: string[]; sharedTheme: string[] }> = {
  functional: { label: "Functional", desc: "Organized by expertise. Clear specialization, deep skill pools.", visual: "silos", gov: ["Executive Leadership Council","Functional Heads Forum","Budget & Resource Committee"], shared: ["HR Shared Services","IT Shared Services","Finance Shared Services","Legal Shared Services"], traits: { efficiency: 5, innovation: 2, speed: 2, scalability: 4, collaboration: 2 }, corePrefix: "", coreSuffix: " Center of Excellence", enableTheme: ["Enterprise Systems","Knowledge Management","Process Automation","Standards & Methodology"], interfaceTheme: ["Internal Service Desk","Reporting Portal","Policy & Compliance Hub"], sharedTheme: ["Centralized Analytics","Shared Admin Pool","Cross-Functional PMO"] },
  divisional: { label: "Divisional", desc: "Organized by business line / product / geography. P&L ownership.", visual: "divisions", gov: ["CEO & Executive Committee","Division Presidents Council","Corporate Strategy Board"], shared: ["Corporate Finance","Legal & Compliance CoE","HR Business Partners","Technology Platform"], traits: { efficiency: 3, innovation: 4, speed: 4, scalability: 3, collaboration: 2 }, corePrefix: "", coreSuffix: " — Division-Led", enableTheme: ["Division P&L Systems","Local Market Tools","Product Lifecycle Platform","Regional Infrastructure"], interfaceTheme: ["Division Dashboard","Customer-Facing Portal","Market Intelligence Hub"], sharedTheme: ["Corporate Shared Services","Cross-Division Synergies","Enterprise Risk Management"] },
  matrix: { label: "Matrix", desc: "Dual reporting: function + business line. Balances depth & breadth.", visual: "matrix", gov: ["Executive Steering Committee","Matrix Governance Board","Conflict Resolution Forum","Resource Arbitration"], shared: ["Shared Analytics & BI","Platform Technology","Talent Marketplace","Cross-Functional PMO"], traits: { efficiency: 3, innovation: 4, speed: 3, scalability: 4, collaboration: 5 }, corePrefix: "", coreSuffix: " (Matrix)", enableTheme: ["Collaboration Platform","Resource Management System","Dual-Reporting Tools","Integrated Planning Suite"], interfaceTheme: ["Unified Dashboard","Matrix Navigation Portal","Skills & Availability Finder"], sharedTheme: ["Shared Capability Pools","Integrated Reporting","Cross-Team Coordination"] },
  platform: { label: "Platform", desc: "Central platform enables autonomous teams. APIs over hierarchy.", visual: "hub", gov: ["Platform Steering Committee","API Governance Board","Standards & Interoperability Council"], shared: ["Core Platform Services","Data & Analytics Layer","Identity & Access Platform","Developer Experience"], traits: { efficiency: 4, innovation: 5, speed: 5, scalability: 5, collaboration: 4 }, corePrefix: "", coreSuffix: " as a Service", enableTheme: ["API Gateway","Self-Service Provisioning","Feature Flag Platform","Observability & Monitoring"], interfaceTheme: ["Developer Portal","Self-Service Marketplace","API Documentation Hub"], sharedTheme: ["Platform-as-a-Service Core","Shared Data Mesh","Common Component Library"] },
  network: { label: "Network", desc: "Fluid, project-based. Teams form and dissolve around missions.", visual: "network", gov: ["Mission Council","Resource Allocation Board","Network Coordination"], shared: ["Knowledge Graph","Talent Pool & Matching","Tooling Commons","Mission Support Services"], traits: { efficiency: 2, innovation: 5, speed: 5, scalability: 3, collaboration: 5 }, corePrefix: "", coreSuffix: " Squad", enableTheme: ["Mission Planning Tools","Team Formation Engine","Knowledge Sharing Platform","Rapid Prototyping Lab"], interfaceTheme: ["Mission Board","Skill Finder","Impact Dashboard"], sharedTheme: ["Floating Resource Pool","Shared Learning Hub","Cross-Mission Insights"] },
};
export const OM_OPMODELS: Record<string, { label: string; desc: string }> = {
  centralized: { label: "Centralized", desc: "Single point of control." }, decentralized: { label: "Decentralized", desc: "Local autonomy." }, federated: { label: "Federated", desc: "Central standards, local execution." }, hub_spoke: { label: "Hub-and-Spoke", desc: "CoE hub with embedded spokes." },
};
export const OM_GOVERNANCE: Record<string, { label: string; icon: string }> = {
  tight: { label: "Tight Governance", icon: "🔒" }, balanced: { label: "Balanced", icon: "⚖️" }, light: { label: "Light Governance", icon: "🌊" },
};
export const OM_LIFECYCLES: Record<string, string[]> = { finance: ["Plan","Record","Report","Analyze","Advise","Close"], technology: ["Discover","Design","Build","Test","Deploy","Operate"], hr: ["Attract","Recruit","Onboard","Develop","Perform","Retain"], legal: ["Identify","Assess","Advise","Draft","Review","Monitor"], investments: ["Research","Source","Diligence","Approve","Execute","Exit"], operations: ["Forecast","Source","Produce","Quality","Ship","Improve"], marketing: ["Research","Strategy","Create","Distribute","Measure","Optimize"], product: ["Discover","Define","Design","Build","Ship","Iterate"] };
export const OM_INTERFACES: Record<string, string[]> = { finance: ["Financial Reporting","Budget & Forecast","Capital Allocation","Audit & Controls"], technology: ["Service Catalog","Data Platform","Security Framework","Dev Portal"], hr: ["Employee Portal","Manager Dashboard","Talent Marketplace","Analytics"], legal: ["Contract Hub","Compliance Portal","Risk Dashboard","Policy Library"], investments: ["Deal Pipeline","Portfolio Dashboard","LP Reporting","Research Library"], operations: ["Order Mgmt","Inventory System","Quality Dashboard","Vendor Portal"], marketing: ["Campaign Hub","Analytics Dashboard","Brand Guidelines","Content Library"], product: ["Product Roadmap","Feature Requests","Release Notes","API Docs"] };
export const OM_COMPANIES: Record<string, { name: string; industry: string; archetype: string; opModel: string; governance: string }> = {
  toyota: { name: "Toyota", industry: "manufacturing", archetype: "functional", opModel: "federated", governance: "tight" },
  tesla: { name: "Tesla", industry: "manufacturing", archetype: "platform", opModel: "centralized", governance: "tight" },
  netflix: { name: "Netflix", industry: "technology", archetype: "network", opModel: "decentralized", governance: "light" },
  amazon: { name: "Amazon", industry: "retail", archetype: "divisional", opModel: "decentralized", governance: "balanced" },
  jpmorgan: { name: "JP Morgan", industry: "financial_services", archetype: "matrix", opModel: "federated", governance: "tight" },
  spotify: { name: "Spotify", industry: "technology", archetype: "matrix", opModel: "federated", governance: "light" },
  microsoft: { name: "Microsoft", industry: "technology", archetype: "platform", opModel: "federated", governance: "balanced" },
};

export function OmBlock({ label, colorClass = "core", highlight, wide, note }: { label: string; colorClass?: string; highlight?: boolean; wide?: boolean; note?: string }) {
  const cm: Record<string, { border: string; text: string }> = { core: { border: "#f4a83a", text: "#f4a83a" }, gov: { border: "var(--teal)", text: "var(--teal)" }, shared: { border: "var(--green)", text: "var(--green)" }, flow: { border: "var(--amber)", text: "var(--amber)" }, purple: { border: "var(--purple)", text: "var(--purple)" } };
  const c = cm[colorClass] || cm.core;
  return <div className="transition-all hover:-translate-y-0.5" style={{ background: highlight ? c.border : "#1e2030", border: `1.5px solid ${c.border}`, borderRadius: 6, padding: wide ? "10px 18px" : "8px 12px", minWidth: wide ? 160 : 80, flex: wide ? "1 1 0" : "0 0 auto", textAlign: "center" }}>
    <div style={{ color: highlight ? "#FFFFFF" : c.text, fontWeight: 600, fontSize: 15, lineHeight: 1.4 }}>{label}</div>
    {note && <div className="text-[15px] text-[var(--text-muted)] mt-0.5 italic">{note}</div>}
  </div>;
}

export const OperatingModelLab = React.memo(function OperatingModelLab({ onBack, model, f, projectId, onNavigateCanvas, onModelChange }: { onBack: () => void; model?: string; f?: Filters; projectId?: string; onNavigateCanvas?: () => void; onModelChange?: (modelId: string) => void }) {
  const [omData] = useApiData(() => model ? api.getOperatingModel(model, f || { func: "All", jf: "All", sf: "All", cl: "All" }) : Promise.resolve(null), [model]);
  const hasUploadedOM = omData && (omData as Record<string, unknown>).layers && Object.keys((omData as Record<string, unknown>).layers as object).length > 0;
  const [sandboxLoading, setSandboxLoading] = useState<string|null>(null);
  const seedCompanySandbox = async (companyKey: string, co: Record<string,string>) => {
    if(co.archetype) setArch(co.archetype); if(co.opModel) setOpModel(co.opModel); if(co.governance) setGov(co.governance);
    setSandboxLoading(companyKey);
    try {
      const resp = await api.apiFetch(`/api/sandbox/company?company=${encodeURIComponent(companyKey)}`);
      if (resp.ok) {
        const data = await resp.json();
        if (data.model) {
          // Direct model switch — flows through to all tabs
          if (onModelChange) onModelChange(data.model);
          localStorage.setItem("lastModel", JSON.stringify(data.model));
          showToast(`🏢 ${co.name || companyKey} loaded — ${data.employees} employees, ${data.tasks} tasks`);
        }
      }
    } catch { showToast("Couldn't load sandbox data — check that the backend is running"); }
    setSandboxLoading(null);
  };
  const [aiOmLoading, setAiOmLoading] = useState(false);
  const [aiOmReasoning, setAiOmReasoning] = useState("");
  const [aiCompanyInput, setAiCompanyInput] = useState("");
  const [aiCompanyGenerating, setAiCompanyGenerating] = useState(false);
  const [aiCompanies, setAiCompanies] = useState<Record<string, { name: string; industry: string; archetype: string; opModel: string; governance: string }>>({});
  const generateCompanyModel = async () => {
    if (!aiCompanyInput.trim() || aiCompanyGenerating) return;
    setAiCompanyGenerating(true);
    try { const raw = await callAI("Return ONLY valid JSON.", `What organizational archetype, operating model, and governance style does "${aiCompanyInput.trim()}" use? Return JSON: {"name":"${aiCompanyInput.trim()}","industry":"sector","archetype":"functional|divisional|matrix|platform|network","opModel":"centralized|decentralized|federated|hub_spoke","governance":"tight|balanced|light"}`); const c = JSON.parse(raw.replace(/```json\n?/g,"").replace(/```\n?/g,"").trim()); if (c.name) { setAiCompanies(p => ({...p, [c.name.toLowerCase().replace(/\s+/g,"_")]: c})); setArch(c.archetype); setOpModel(c.opModel); setGov(c.governance); setAiCompanyInput(""); }
    } catch (e) { console.error("[DesignModule] AI company model error", e); } setAiCompanyGenerating(false);
  };
  const [fn, setFnRaw] = useState("finance");
  const setFn = (f: string) => { setFnRaw(f); setRapidRows(({"finance":["Budget Approval","Investment Decisions","Audit Findings","Revenue Recognition","Tax Strategy","Vendor Selection","Financial Close","Capital Allocation"],"technology":["Architecture Decisions","Security Policies","Vendor/Tool Selection","Release Approvals","Data Governance","AI/ML Deployment","Infrastructure Changes","Tech Debt Priorities"],"hr":["Hiring Decisions","Comp Adjustments","Policy Changes","L&D Investment","Performance Ratings","Org Design","DEI Initiatives","Succession Planning"],"legal":["Litigation Strategy","Regulatory Response","Contract Approval","Policy Updates","Risk Acceptance","IP Decisions","Compliance Programs","Investigations"],"investments":["Investment Thesis","Deal Approval","Portfolio Rebalancing","Risk Limits","Valuation Methods","Exit Decisions","LP Communications","Fund Terms"],"operations":["Supply Chain Changes","Quality Standards","Vendor Selection","Process Redesign","Safety Protocols","Capacity Planning","Outsourcing","Technology Adoption"],"marketing":["Brand Guidelines","Campaign Approval","Budget Allocation","Channel Strategy","Pricing Input","Agency Selection","Content Standards","Market Entry"],"product":["Roadmap Priorities","Architecture Decisions","Feature Launch","Tech Stack","Design Standards","Quality Gates","Resource Allocation","Deprecation"]}[f] || []).map((d: string) => ({d, r:["D","A","R","P"]}))); };
  const [arch, setArch] = useState("functional");
  const [opModel, setOpModel] = useState("centralized");
  const [gov, setGov] = useState("balanced");
  const [omView, setOmView] = useState("1.1");
  const [showWelcome, setShowWelcome] = useState(true);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showTomSummary, setShowTomSummary] = useState(false);
  const [showPattern, setShowPattern] = useState(true);
  const [showCommittee, setShowCommittee] = useState(false);
  const [maturityScores, setMaturityScores] = usePersisted<Record<string, number>>(`${fn}_${arch}_maturity`, {});
  const [targetScores, setTargetScores] = usePersisted<Record<string, number>>(`${fn}_${arch}_target`, {});
  const defaultRapid = ({"finance":["Budget Approval","Investment Decisions","Audit Findings","Revenue Recognition","Tax Strategy","Vendor Selection","Financial Close","Capital Allocation"],"technology":["Architecture Decisions","Security Policies","Vendor/Tool Selection","Release Approvals","Data Governance","AI/ML Deployment","Infrastructure Changes","Tech Debt Priorities"],"hr":["Hiring Decisions","Comp Adjustments","Policy Changes","L&D Investment","Performance Ratings","Org Design","DEI Initiatives","Succession Planning"],"legal":["Litigation Strategy","Regulatory Response","Contract Approval","Policy Updates","Risk Acceptance","IP Decisions","Compliance Programs","Investigations"],"investments":["Investment Thesis","Deal Approval","Portfolio Rebalancing","Risk Limits","Valuation Methods","Exit Decisions","LP Communications","Fund Terms"],"operations":["Supply Chain Changes","Quality Standards","Vendor Selection","Process Redesign","Safety Protocols","Capacity Planning","Outsourcing","Technology Adoption"],"marketing":["Brand Guidelines","Campaign Approval","Budget Allocation","Channel Strategy","Pricing Input","Agency Selection","Content Standards","Market Entry"],"product":["Roadmap Priorities","Architecture Decisions","Feature Launch","Tech Stack","Design Standards","Quality Gates","Resource Allocation","Deprecation"]}[fn] || "Strategy,Budget,Talent,Technology,AI Implementation,Process Changes,Vendor Selection,Risk Management".split(",")).map((d: string) => ({d, r:["D","A","R","P"]}));
  const [serviceOverrides, setServiceOverrides] = useState<Record<string, string>>({});
  const [rapidRows, setRapidRows] = useState<{d:string;r:string[]}[]>(defaultRapid);
  const [aiBlueprint, setAiBlueprint] = useState<Record<string, string[]> | null>(null);

  // ── Taxonomy Configurator state ──
  const [omTaxonomy, setOmTaxonomy] = useState<Record<string, unknown> | null>(null);
  const [omIndustries, setOmIndustries] = usePersisted<string[]>(`${projectId}_om_industries`, []);
  const [omSelectedUnits, setOmSelectedUnits] = usePersisted<string[]>(`${projectId}_om_selected_units`, []);
  const [omCustomUnits, setOmCustomUnits] = usePersisted<{id:string;name:string;func:string;layer:string}[]>(`${projectId}_om_custom_units`, []);
  const [omRenames, setOmRenames] = usePersisted<Record<string,string>>(`${projectId}_om_renames`, {});
  const [omScopedUnits, setOmScopedUnits] = usePersisted<Record<string,string>>(`${projectId}_om_scoped`, {}); // unit_id -> "in"|"out"
  const [omSearch, setOmSearch] = useState("");
  const [omSearchResults, setOmSearchResults] = useState<Record<string,unknown>[]>([]);
  const [omExpandedFuncs, setOmExpandedFuncs] = useState<Record<string,boolean>>({});
  const pb = usePathBanner(model || "", "opmodel");
  const [omAddingCustom, setOmAddingCustom] = useState(false);
  const [omCustomName, setOmCustomName] = useState("");
  const [omCustomFunc, setOmCustomFunc] = useState("");
  const [omCustomLayer, setOmCustomLayer] = useState("Core");

  // ── Strategy Layer state ──
  const STRAT_PRIORITIES_ALL = [
    { id: "revenue", label: "Revenue Growth", icon: "📈", desc: "Expand top-line revenue through new markets, products, or channels" },
    { id: "cost", label: "Cost Optimization", icon: "💰", desc: "Reduce operating costs, improve efficiency, eliminate waste" },
    { id: "innovation", label: "Innovation & R&D", icon: "🔬", desc: "Develop new products, services, or business models" },
    { id: "cx", label: "Customer Experience", icon: "🎯", desc: "Improve satisfaction, retention, and lifetime value" },
    { id: "ops", label: "Operational Excellence", icon: "⚙️", desc: "Standardize, automate, and optimize processes" },
    { id: "risk", label: "Risk & Compliance", icon: "🛡️", desc: "Strengthen controls, regulatory compliance, and resilience" },
    { id: "talent", label: "Talent & Culture", icon: "🧑‍🤝‍🧑", desc: "Attract, develop, and retain top talent" },
    { id: "digital", label: "Digital / AI Transformation", icon: "🤖", desc: "Leverage technology and AI for competitive advantage" },
  ];
  const STARTER_TEMPLATES: { id: string; label: string; desc: string; priorities: string[]; arch: string; opModel: string; gov: string }[] = [
    { id: "tech_growth", label: "Tech Company Growth Stage", desc: "Digital-first, platform architecture, light governance", priorities: ["digital", "innovation", "talent"], arch: "platform", opModel: "federated", gov: "light" },
    { id: "fortune500", label: "Mature Fortune 500", desc: "Cost-optimized, matrix org, balanced governance", priorities: ["cost", "risk", "ops"], arch: "matrix", opModel: "federated", gov: "balanced" },
    { id: "pe_backed", label: "PE-Backed Transformation", desc: "Cost-focused, centralized shared services, tight governance", priorities: ["cost", "revenue", "digital"], arch: "functional", opModel: "centralized", gov: "tight" },
    { id: "consumer", label: "Consumer Brand", desc: "Customer-centric, divisional by market, balanced governance", priorities: ["cx", "innovation", "revenue"], arch: "divisional", opModel: "federated", gov: "balanced" },
    { id: "industrial", label: "Energy / Industrial", desc: "Ops-focused, functional structure, tight governance", priorities: ["ops", "risk", "cost"], arch: "functional", opModel: "hub_spoke", gov: "tight" },
  ];
  const PRIORITY_WHY: Record<string, string> = {
    revenue: "Typically leads to growth-oriented structures with market-facing teams empowered for speed.",
    cost: "Typically leads to more shared services, process standardization, and tighter governance.",
    innovation: "Typically leads to autonomous teams, higher R&D investment, and lighter governance.",
    cx: "Typically leads to customer-centric org design with journey-based team structures.",
    ops: "Typically leads to centralized process ownership and continuous improvement programs.",
    risk: "Typically leads to stronger controls, three-lines-of-defense, and compliance-heavy governance.",
    talent: "Typically leads to investment in L&D, flatter structures, and culture-first decision making.",
    digital: "Typically leads to platform-based architectures and cross-functional digital teams.",
  };
  const [stratPriorities, setStratPriorities] = usePersisted<string[]>(`${projectId}_strat_priorities`, []);
  const [stratDesignPrinciples, setStratDesignPrinciples] = usePersisted<Record<string, { value: number; rationale: string }>>(`${projectId}_strat_design_principles`, {
    centralize: { value: 50, rationale: "" }, standardize: { value: 50, rationale: "" },
    buildBuy: { value: 50, rationale: "" }, controlSpeed: { value: 50, rationale: "" },
    specialistGen: { value: 50, rationale: "" },
  });
  const [stratCapMatrix, setStratCapMatrix] = usePersisted<Record<string, string>>(`${projectId}_strat_cap_matrix`, {});
  const [stratVision, setStratVision] = usePersisted<string>(`${projectId}_strat_vision`, "");
  const [stratVisionGenerating, setStratVisionGenerating] = useState(false);
  const [stratBizModel, setStratBizModel] = usePersisted<Record<string, string[]>>(`${projectId}_strat_biz_model`, {
    value_prop: [], key_activities: [], key_resources: [], revenue_cost: [],
  });
  const [stratBizEditField, setStratBizEditField] = useState<string | null>(null);
  const [stratBizEditText, setStratBizEditText] = useState("");

  // ── Governance Layer state ──
  type GovDecision = { id: string; name: string; category: "Strategic" | "Tactical" | "Operational"; owner: string; speed: "Fast" | "Medium" | "Slow"; clarity: "Clear" | "Ambiguous" | "Undefined"; func: string; forumId: string };
  type GovForum = { id: string; name: string; purpose: string; cadence: string; chair: string; members: string[]; parentId: string };
  const GOV_DEFAULT_DECISIONS: GovDecision[] = [
    { id: "d1", name: "Approve annual budget", category: "Strategic", owner: "CFO", speed: "Slow", clarity: "Clear", func: "Finance", forumId: "" },
    { id: "d2", name: "Enter new market / geography", category: "Strategic", owner: "CEO", speed: "Slow", clarity: "Clear", func: "Strategy", forumId: "" },
    { id: "d3", name: "Major M&A / investment", category: "Strategic", owner: "CEO", speed: "Slow", clarity: "Clear", func: "Strategy", forumId: "" },
    { id: "d4", name: "Set pricing strategy", category: "Strategic", owner: "CMO", speed: "Medium", clarity: "Ambiguous", func: "Marketing", forumId: "" },
    { id: "d5", name: "Approve org restructuring", category: "Strategic", owner: "CHRO", speed: "Slow", clarity: "Ambiguous", func: "HR", forumId: "" },
    { id: "d6", name: "Select enterprise technology platform", category: "Strategic", owner: "CTO", speed: "Slow", clarity: "Clear", func: "Technology", forumId: "" },
    { id: "d7", name: "Approve new headcount", category: "Tactical", owner: "Function Head", speed: "Medium", clarity: "Clear", func: "HR", forumId: "" },
    { id: "d8", name: "Select technology vendor", category: "Tactical", owner: "CTO", speed: "Medium", clarity: "Ambiguous", func: "Technology", forumId: "" },
    { id: "d9", name: "Launch marketing campaign", category: "Tactical", owner: "CMO", speed: "Medium", clarity: "Clear", func: "Marketing", forumId: "" },
    { id: "d10", name: "Approve capital expenditure (>$100K)", category: "Tactical", owner: "CFO", speed: "Medium", clarity: "Clear", func: "Finance", forumId: "" },
    { id: "d11", name: "Change compensation bands", category: "Tactical", owner: "CHRO", speed: "Slow", clarity: "Ambiguous", func: "HR", forumId: "" },
    { id: "d12", name: "Approve vendor contract", category: "Tactical", owner: "Procurement Lead", speed: "Medium", clarity: "Clear", func: "Operations", forumId: "" },
    { id: "d13", name: "Release product feature", category: "Tactical", owner: "Product Lead", speed: "Fast", clarity: "Clear", func: "Product", forumId: "" },
    { id: "d14", name: "Approve regulatory filing", category: "Tactical", owner: "CLO", speed: "Medium", clarity: "Clear", func: "Legal", forumId: "" },
    { id: "d15", name: "Allocate project resources", category: "Tactical", owner: "Function Head", speed: "Medium", clarity: "Ambiguous", func: "Operations", forumId: "" },
    { id: "d16", name: "Approve training program", category: "Tactical", owner: "L&D Lead", speed: "Medium", clarity: "Ambiguous", func: "HR", forumId: "" },
    { id: "d17", name: "Hire individual contributor", category: "Operational", owner: "Hiring Manager", speed: "Fast", clarity: "Clear", func: "HR", forumId: "" },
    { id: "d18", name: "Approve travel / expenses", category: "Operational", owner: "Manager", speed: "Fast", clarity: "Clear", func: "Finance", forumId: "" },
    { id: "d19", name: "Resolve customer escalation", category: "Operational", owner: "Team Lead", speed: "Fast", clarity: "Clear", func: "Operations", forumId: "" },
    { id: "d20", name: "Deploy code to production", category: "Operational", owner: "Engineering Lead", speed: "Fast", clarity: "Clear", func: "Technology", forumId: "" },
    { id: "d21", name: "Approve purchase order (<$10K)", category: "Operational", owner: "Manager", speed: "Fast", clarity: "Clear", func: "Finance", forumId: "" },
    { id: "d22", name: "Schedule team capacity", category: "Operational", owner: "Team Lead", speed: "Fast", clarity: "Ambiguous", func: "Operations", forumId: "" },
    { id: "d23", name: "Grant system access", category: "Operational", owner: "IT Admin", speed: "Fast", clarity: "Clear", func: "Technology", forumId: "" },
    { id: "d24", name: "Update process documentation", category: "Operational", owner: "Process Owner", speed: "Fast", clarity: "Ambiguous", func: "Operations", forumId: "" },
    { id: "d25", name: "Set AI/automation policy", category: "Strategic", owner: "CTO", speed: "Slow", clarity: "Undefined", func: "Technology", forumId: "" },
  ];
  const [govDecisions, setGovDecisions] = usePersisted<GovDecision[]>(`${projectId}_gov_decisions`, GOV_DEFAULT_DECISIONS);
  const [govRapid, setGovRapid] = usePersisted<Record<string, Record<string, string>>>(`${projectId}_gov_rapid`, {});
  const [govForums, setGovForums] = usePersisted<GovForum[]>(`${projectId}_gov_forums`, [
    { id: "f1", name: "Board of Directors", purpose: "Strategic oversight, fiduciary governance", cadence: "Quarterly", chair: "Board Chair", members: ["CEO", "CFO", "Independent Directors"], parentId: "" },
    { id: "f2", name: "Executive Committee", purpose: "Enterprise strategy execution and cross-functional alignment", cadence: "Weekly", chair: "CEO", members: ["CFO", "CTO", "CHRO", "CMO", "COO"], parentId: "f1" },
    { id: "f3", name: "Operating Committee", purpose: "Operational performance review and tactical decisions", cadence: "Bi-weekly", chair: "COO", members: ["Function Heads", "BU Leads"], parentId: "f2" },
    { id: "f4", name: "Technology Steering Committee", purpose: "Technology investment and architecture decisions", cadence: "Monthly", chair: "CTO", members: ["CIO", "CISO", "Engineering Leads"], parentId: "f2" },
    { id: "f5", name: "People & Culture Committee", purpose: "Talent strategy, org design, and culture initiatives", cadence: "Monthly", chair: "CHRO", members: ["L&D Lead", "Talent Acquisition", "DEI Lead"], parentId: "f2" },
  ]);
  const [govView, setGovView] = useState<"catalogue" | "rapid" | "forums" | "bottlenecks">("catalogue");
  const [govCatFilter, setGovCatFilter] = useState("All");
  const [govFuncFilter, setGovFuncFilter] = useState("All");
  const [govSpeedFilter, setGovSpeedFilter] = useState("All");
  const [govClarityFilter, setGovClarityFilter] = useState("All");
  const [govAddingDecision, setGovAddingDecision] = useState(false);
  const [govNewDec, setGovNewDec] = useState({ name: "", category: "Tactical" as "Strategic"|"Tactical"|"Operational", owner: "", speed: "Medium" as "Fast"|"Medium"|"Slow", clarity: "Ambiguous" as "Clear"|"Ambiguous"|"Undefined", func: "Operations" });
  const [govAddingForum, setGovAddingForum] = useState(false);
  const [govNewForum, setGovNewForum] = useState({ name: "", purpose: "", cadence: "Monthly", chair: "", members: "", parentId: "" });
  const [govEditingDecId, setGovEditingDecId] = useState<string | null>(null);
  const GOV_RAPID_ROLES = ["CEO / Board", "Executive Sponsor", "Function Head", "Team Lead", "Subject Expert"];

  // ── Service Delivery Layer state ──
  const SVC_MODELS = ["In-House", "Shared Services", "COE", "Outsourced/BPO", "Hybrid"] as const;
  type SvcModel = typeof SVC_MODELS[number];
  const SVC_MODEL_COLORS: Record<string, string> = { "In-House": "#8ba87a", "Shared Services": "#a78bb8", "COE": "#a78bb8", "Outsourced/BPO": "#f4a83a", "Hybrid": "#f4a83a" };
  const SVC_FUNCTIONS_DEFAULT = [
    { id: "fin_ap", label: "Accounts Payable", func: "Finance" },
    { id: "fin_ar", label: "Accounts Receivable", func: "Finance" },
    { id: "fin_payroll", label: "Payroll", func: "Finance" },
    { id: "fin_reporting", label: "Financial Reporting", func: "Finance" },
    { id: "fin_tax", label: "Tax & Compliance", func: "Finance" },
    { id: "fin_fp", label: "FP&A / Budgeting", func: "Finance" },
    { id: "hr_recruit", label: "Talent Acquisition", func: "HR" },
    { id: "hr_onboard", label: "Onboarding & Admin", func: "HR" },
    { id: "hr_comp", label: "Compensation & Benefits", func: "HR" },
    { id: "hr_ld", label: "Learning & Development", func: "HR" },
    { id: "hr_hrbp", label: "HR Business Partnering", func: "HR" },
    { id: "hr_analytics", label: "People Analytics", func: "HR" },
    { id: "it_infra", label: "Infrastructure & Cloud", func: "Technology" },
    { id: "it_security", label: "Cybersecurity", func: "Technology" },
    { id: "it_support", label: "IT Service Desk", func: "Technology" },
    { id: "it_data", label: "Data & Analytics", func: "Technology" },
    { id: "it_dev", label: "Application Development", func: "Technology" },
    { id: "it_ai", label: "AI/ML Engineering", func: "Technology" },
    { id: "ops_procurement", label: "Procurement", func: "Operations" },
    { id: "ops_facilities", label: "Facilities Management", func: "Operations" },
    { id: "ops_supply", label: "Supply Chain", func: "Operations" },
    { id: "legal_contracts", label: "Contract Management", func: "Legal" },
    { id: "legal_compliance", label: "Regulatory Compliance", func: "Legal" },
    { id: "mkt_digital", label: "Digital Marketing", func: "Marketing" },
    { id: "mkt_brand", label: "Brand & Creative", func: "Marketing" },
  ];
  const [svcDeliveryMap, setSvcDeliveryMap] = usePersisted<Record<string, { current: SvcModel; target: SvcModel; rationale: string }>>(`${projectId}_svc_delivery`, {});
  const [svcView, setSvcView] = useState<"matrix" | "shared" | "coe" | "outsource" | "location">("matrix");
  type SvcSharedDef = { services: string; slaResponse: string; slaQuality: string; costPerTx: string; location: string; staffing: string; technology: string; costModel: string };
  const [svcSharedDefs, setSvcSharedDefs] = usePersisted<Record<string, SvcSharedDef>>(`${projectId}_svc_shared`, {});
  type SvcCoeDef = { expertise: string; mandate: string; placement: string; km: string; metrics: string };
  const [svcCoeDefs, setSvcCoeDefs] = usePersisted<Record<string, SvcCoeDef>>(`${projectId}_svc_coe`, {});
  type SvcOutscoreCard = { strategic: number; availability: number; costSavings: number; risk: number };
  const [svcOutsourceScores, setSvcOutsourceScores] = usePersisted<Record<string, SvcOutscoreCard>>(`${projectId}_svc_outsource`, {});
  type SvcLocationDef = { location: string; costIndex: string; talent: string; timezone: string; language: string; risk: string };
  const [svcLocations, setSvcLocations] = usePersisted<Record<string, SvcLocationDef>>(`${projectId}_svc_locations`, {});
  const [svcFuncFilter, setSvcFuncFilter] = useState("All");
  const [svcEditingRationale, setSvcEditingRationale] = useState<string | null>(null);

  // ── Process Layer state ──
  type ProcStep = { id: string; name: string; func: string; duration: string; system: string; automation: "Manual" | "Semi-Auto" | "Automated"; isHandoff?: boolean };
  type ProcDef = { id: string; name: string; owner: string; trigger: string; output: string; functions: string[]; cycleTime: string; steps: ProcStep[]; maturity: number; industryBenchmark: number };
  const PROC_FUNC_COLORS: Record<string, string> = { Finance: "#8ba87a", HR: "#a78bb8", Technology: "#a78bb8", Operations: "#f4a83a", Legal: "#e87a5d", Marketing: "#f4a83a", Sales: "#f4a83a", Product: "#e87a5d", "Customer Service": "#8ba87a", Strategy: "#a78bb8", Risk: "#e87a5d", Supply: "#f4a83a" };
  const PROC_DEFAULT: ProcDef[] = [
    { id: "p1", name: "Hire to Retire", owner: "CHRO", trigger: "Headcount request approved", output: "Employee offboarded / alumni", functions: ["HR", "Finance", "Technology", "Operations"], cycleTime: "30-365 days", maturity: 0, industryBenchmark: 3.2, steps: [
      { id: "p1s1", name: "Requisition Approval", func: "HR", duration: "2-5 days", system: "Workday", automation: "Semi-Auto" },
      { id: "p1s2", name: "Source & Screen Candidates", func: "HR", duration: "10-30 days", system: "Greenhouse/LinkedIn", automation: "Semi-Auto" },
      { id: "p1s3", name: "Interview & Select", func: "Operations", duration: "5-15 days", system: "Calendly/Teams", automation: "Manual", isHandoff: true },
      { id: "p1s4", name: "Offer & Negotiate", func: "HR", duration: "3-7 days", system: "DocuSign", automation: "Semi-Auto", isHandoff: true },
      { id: "p1s5", name: "Onboard & Provision", func: "Technology", duration: "1-5 days", system: "ServiceNow", automation: "Semi-Auto", isHandoff: true },
      { id: "p1s6", name: "Performance Management", func: "HR", duration: "Ongoing", system: "Workday", automation: "Semi-Auto" },
      { id: "p1s7", name: "Develop & Promote", func: "HR", duration: "Ongoing", system: "LMS", automation: "Manual" },
      { id: "p1s8", name: "Offboard & Exit", func: "HR", duration: "5-14 days", system: "Workday/ServiceNow", automation: "Semi-Auto" },
    ]},
    { id: "p2", name: "Order to Cash", owner: "CFO", trigger: "Customer places order", output: "Payment received & reconciled", functions: ["Sales", "Operations", "Finance"], cycleTime: "1-90 days", maturity: 0, industryBenchmark: 3.5, steps: [
      { id: "p2s1", name: "Order Entry", func: "Sales", duration: "< 1 day", system: "Salesforce/ERP", automation: "Semi-Auto" },
      { id: "p2s2", name: "Credit Check", func: "Finance", duration: "1-2 days", system: "ERP", automation: "Automated", isHandoff: true },
      { id: "p2s3", name: "Fulfill & Ship", func: "Operations", duration: "1-14 days", system: "WMS/ERP", automation: "Semi-Auto", isHandoff: true },
      { id: "p2s4", name: "Invoice Generation", func: "Finance", duration: "< 1 day", system: "ERP", automation: "Automated", isHandoff: true },
      { id: "p2s5", name: "Payment Collection", func: "Finance", duration: "30-60 days", system: "ERP/Bank", automation: "Semi-Auto" },
      { id: "p2s6", name: "Cash Reconciliation", func: "Finance", duration: "1-3 days", system: "ERP", automation: "Semi-Auto" },
    ]},
    { id: "p3", name: "Procure to Pay", owner: "CPO / CFO", trigger: "Purchase requisition created", output: "Vendor paid & recorded", functions: ["Operations", "Finance", "Legal"], cycleTime: "7-45 days", maturity: 0, industryBenchmark: 3.0, steps: [
      { id: "p3s1", name: "Requisition & Approval", func: "Operations", duration: "1-3 days", system: "ERP/Coupa", automation: "Semi-Auto" },
      { id: "p3s2", name: "Vendor Selection", func: "Operations", duration: "3-14 days", system: "Sourcing Platform", automation: "Manual" },
      { id: "p3s3", name: "Contract Negotiation", func: "Legal", duration: "5-30 days", system: "CLM", automation: "Manual", isHandoff: true },
      { id: "p3s4", name: "Purchase Order", func: "Operations", duration: "< 1 day", system: "ERP", automation: "Automated", isHandoff: true },
      { id: "p3s5", name: "Goods Receipt", func: "Operations", duration: "1-7 days", system: "ERP/WMS", automation: "Semi-Auto" },
      { id: "p3s6", name: "Invoice Match & Approve", func: "Finance", duration: "1-5 days", system: "ERP", automation: "Semi-Auto", isHandoff: true },
      { id: "p3s7", name: "Payment Execution", func: "Finance", duration: "1-3 days", system: "ERP/Bank", automation: "Automated" },
    ]},
    { id: "p4", name: "Record to Report", owner: "CFO", trigger: "Period end", output: "Financial statements published", functions: ["Finance", "Technology", "Operations"], cycleTime: "5-20 days", maturity: 0, industryBenchmark: 3.3, steps: [
      { id: "p4s1", name: "Sub-ledger Close", func: "Finance", duration: "1-3 days", system: "ERP", automation: "Semi-Auto" },
      { id: "p4s2", name: "Journal Entries", func: "Finance", duration: "1-2 days", system: "ERP", automation: "Semi-Auto" },
      { id: "p4s3", name: "Intercompany Reconciliation", func: "Finance", duration: "2-5 days", system: "ERP/BlackLine", automation: "Semi-Auto" },
      { id: "p4s4", name: "Consolidation", func: "Finance", duration: "1-3 days", system: "HFM/ERP", automation: "Automated" },
      { id: "p4s5", name: "Management Review", func: "Finance", duration: "1-2 days", system: "BI Tool", automation: "Manual" },
      { id: "p4s6", name: "Regulatory Filing", func: "Finance", duration: "1-5 days", system: "Filing System", automation: "Semi-Auto" },
    ]},
    { id: "p5", name: "Plan to Produce", owner: "COO", trigger: "Demand forecast generated", output: "Product delivered to customer", functions: ["Operations", "Supply", "Finance"], cycleTime: "7-90 days", maturity: 0, industryBenchmark: 2.8, steps: [
      { id: "p5s1", name: "Demand Planning", func: "Operations", duration: "3-7 days", system: "Planning Tool", automation: "Semi-Auto" },
      { id: "p5s2", name: "Supply Planning", func: "Supply", duration: "2-5 days", system: "ERP/SCM", automation: "Semi-Auto", isHandoff: true },
      { id: "p5s3", name: "Production Scheduling", func: "Operations", duration: "1-3 days", system: "MES/ERP", automation: "Semi-Auto" },
      { id: "p5s4", name: "Manufacturing / Execution", func: "Operations", duration: "1-60 days", system: "MES", automation: "Semi-Auto" },
      { id: "p5s5", name: "Quality Control", func: "Operations", duration: "1-3 days", system: "QMS", automation: "Semi-Auto" },
      { id: "p5s6", name: "Warehouse & Logistics", func: "Supply", duration: "1-7 days", system: "WMS/TMS", automation: "Semi-Auto", isHandoff: true },
    ]},
    { id: "p6", name: "Idea to Market", owner: "CPO", trigger: "Innovation idea submitted", output: "Product/service launched", functions: ["Product", "Technology", "Marketing", "Operations"], cycleTime: "30-365 days", maturity: 0, industryBenchmark: 2.5, steps: [
      { id: "p6s1", name: "Ideation & Screening", func: "Product", duration: "7-30 days", system: "Jira/Miro", automation: "Manual" },
      { id: "p6s2", name: "Business Case", func: "Product", duration: "7-14 days", system: "PowerPoint/Notion", automation: "Manual" },
      { id: "p6s3", name: "Design & Prototype", func: "Product", duration: "14-60 days", system: "Figma/CAD", automation: "Semi-Auto", isHandoff: true },
      { id: "p6s4", name: "Build & Test", func: "Technology", duration: "30-180 days", system: "CI/CD/Jira", automation: "Semi-Auto", isHandoff: true },
      { id: "p6s5", name: "Go-to-Market Prep", func: "Marketing", duration: "14-30 days", system: "CMS/Marketing", automation: "Semi-Auto", isHandoff: true },
      { id: "p6s6", name: "Launch & Measure", func: "Marketing", duration: "7-30 days", system: "Analytics", automation: "Semi-Auto" },
    ]},
    { id: "p7", name: "Issue to Resolution", owner: "VP Customer Service", trigger: "Customer raises issue", output: "Issue resolved & feedback captured", functions: ["Customer Service", "Technology", "Operations"], cycleTime: "< 1 day to 30 days", maturity: 0, industryBenchmark: 3.4, steps: [
      { id: "p7s1", name: "Issue Intake & Triage", func: "Customer Service", duration: "< 1 hour", system: "Zendesk/ServiceNow", automation: "Semi-Auto" },
      { id: "p7s2", name: "Investigation & Diagnosis", func: "Customer Service", duration: "1-24 hours", system: "CRM/Knowledge Base", automation: "Semi-Auto" },
      { id: "p7s3", name: "Escalation (if needed)", func: "Technology", duration: "1-5 days", system: "Jira/ServiceNow", automation: "Manual", isHandoff: true },
      { id: "p7s4", name: "Resolution & Communication", func: "Customer Service", duration: "< 1 day", system: "CRM", automation: "Semi-Auto" },
      { id: "p7s5", name: "Root Cause Analysis", func: "Operations", duration: "1-7 days", system: "RCA Tools", automation: "Manual", isHandoff: true },
      { id: "p7s6", name: "Feedback & Close", func: "Customer Service", duration: "< 1 day", system: "CRM/Survey", automation: "Automated" },
    ]},
    { id: "p8", name: "Risk to Mitigation", owner: "CRO", trigger: "Risk identified or event occurs", output: "Risk mitigated & controls verified", functions: ["Risk", "Legal", "Operations", "Technology"], cycleTime: "1-90 days", maturity: 0, industryBenchmark: 2.9, steps: [
      { id: "p8s1", name: "Risk Identification", func: "Risk", duration: "Ongoing", system: "GRC Platform", automation: "Semi-Auto" },
      { id: "p8s2", name: "Risk Assessment & Scoring", func: "Risk", duration: "1-5 days", system: "GRC Platform", automation: "Semi-Auto" },
      { id: "p8s3", name: "Control Design", func: "Risk", duration: "3-14 days", system: "GRC/Policy", automation: "Manual" },
      { id: "p8s4", name: "Control Implementation", func: "Operations", duration: "7-60 days", system: "Various", automation: "Manual", isHandoff: true },
      { id: "p8s5", name: "Monitoring & Testing", func: "Risk", duration: "Ongoing", system: "GRC/Analytics", automation: "Semi-Auto", isHandoff: true },
      { id: "p8s6", name: "Reporting & Audit", func: "Legal", duration: "5-14 days", system: "GRC/Audit", automation: "Semi-Auto", isHandoff: true },
    ]},
  ];
  const [procProcesses, setProcProcesses] = usePersisted<ProcDef[]>(`${projectId}_proc_processes`, PROC_DEFAULT);
  const [procView, setProcView] = useState<"map" | "detail" | "maturity" | "capmap" | "bottlenecks">("map");
  const [procSelectedId, setProcSelectedId] = useState<string | null>(null);
  const [procAddingStep, setProcAddingStep] = useState(false);
  const [procNewStep, setProcNewStep] = useState({ name: "", func: "Operations", duration: "", system: "", automation: "Manual" as ProcStep["automation"] });
  const [procAddingProcess, setProcAddingProcess] = useState(false);
  const [procNewProc, setProcNewProc] = useState({ name: "", owner: "", trigger: "", output: "", functions: "", cycleTime: "" });
  const [procAiGenerating, setProcAiGenerating] = useState(false);
  const [procCapMatrix, setProcCapMatrix] = usePersisted<Record<string, string>>(`${projectId}_proc_cap_matrix`, {});
  const procSelected = procProcesses.find(p => p.id === procSelectedId) || null;

  // ── Technology Layer state ──
  type TechSystem = { id: string; name: string; vendor: string; category: string; functions: string[]; capabilities: string[]; processes: string[]; users: string; annualCost: string; age: string; integration: "Standalone" | "Partial" | "Fully Integrated"; status: "Invest" | "Maintain" | "Migrate" | "Retire"; apiReady: "Ready" | "Needs Investment" | "Not Compatible"; dataQuality: string };
  const TECH_CATEGORIES = ["ERP", "CRM", "HCM", "BI/Analytics", "SCM", "CLM/Legal", "GRC", "Collaboration", "AI/ML", "RPA", "Custom App", "Other"] as const;
  const TECH_DEFAULT: TechSystem[] = [
    { id: "t1", name: "SAP S/4HANA", vendor: "SAP", category: "ERP", functions: ["Finance", "Operations", "Supply"], capabilities: ["Financial Reporting", "Procurement"], processes: ["Record to Report", "Procure to Pay"], users: "2,500", annualCost: "$3.2M", age: "3 years", integration: "Fully Integrated", status: "Invest", apiReady: "Ready", dataQuality: "High" },
    { id: "t2", name: "Workday HCM", vendor: "Workday", category: "HCM", functions: ["HR"], capabilities: ["Talent Acquisition", "Compensation & Benefits"], processes: ["Hire to Retire"], users: "1,800", annualCost: "$1.8M", age: "4 years", integration: "Fully Integrated", status: "Invest", apiReady: "Ready", dataQuality: "High" },
    { id: "t3", name: "Salesforce CRM", vendor: "Salesforce", category: "CRM", functions: ["Sales", "Marketing", "Customer Service"], capabilities: ["Sales Operations", "Customer Management"], processes: ["Order to Cash", "Issue to Resolution"], users: "1,200", annualCost: "$1.5M", age: "5 years", integration: "Fully Integrated", status: "Invest", apiReady: "Ready", dataQuality: "Medium" },
    { id: "t4", name: "ServiceNow ITSM", vendor: "ServiceNow", category: "Collaboration", functions: ["Technology", "HR", "Operations"], capabilities: ["IT Service Desk", "Onboarding"], processes: ["Issue to Resolution", "Hire to Retire"], users: "3,000", annualCost: "$1.1M", age: "3 years", integration: "Fully Integrated", status: "Invest", apiReady: "Ready", dataQuality: "High" },
    { id: "t5", name: "Power BI", vendor: "Microsoft", category: "BI/Analytics", functions: ["Finance", "HR", "Operations", "Marketing"], capabilities: ["Financial Reporting", "People Analytics"], processes: ["Record to Report"], users: "800", annualCost: "$120K", age: "4 years", integration: "Partial", status: "Maintain", apiReady: "Ready", dataQuality: "Medium" },
    { id: "t6", name: "Jira / Confluence", vendor: "Atlassian", category: "Collaboration", functions: ["Technology", "Product"], capabilities: ["Application Development"], processes: ["Idea to Market"], users: "600", annualCost: "$85K", age: "6 years", integration: "Partial", status: "Maintain", apiReady: "Ready", dataQuality: "Medium" },
    { id: "t7", name: "Coupa Procurement", vendor: "Coupa", category: "SCM", functions: ["Operations", "Finance"], capabilities: ["Procurement"], processes: ["Procure to Pay"], users: "400", annualCost: "$450K", age: "2 years", integration: "Fully Integrated", status: "Invest", apiReady: "Ready", dataQuality: "High" },
    { id: "t8", name: "BlackLine", vendor: "BlackLine", category: "ERP", functions: ["Finance"], capabilities: ["Financial Reporting"], processes: ["Record to Report"], users: "150", annualCost: "$280K", age: "3 years", integration: "Partial", status: "Maintain", apiReady: "Needs Investment", dataQuality: "High" },
    { id: "t9", name: "Greenhouse ATS", vendor: "Greenhouse", category: "HCM", functions: ["HR"], capabilities: ["Talent Acquisition"], processes: ["Hire to Retire"], users: "200", annualCost: "$180K", age: "4 years", integration: "Partial", status: "Maintain", apiReady: "Needs Investment", dataQuality: "Medium" },
    { id: "t10", name: "Legacy ERP (on-prem)", vendor: "Oracle", category: "ERP", functions: ["Finance", "Operations"], capabilities: ["Financial Reporting", "Procurement"], processes: ["Record to Report", "Procure to Pay"], users: "500", annualCost: "$800K", age: "12 years", integration: "Standalone", status: "Retire", apiReady: "Not Compatible", dataQuality: "Low" },
    { id: "t11", name: "SharePoint", vendor: "Microsoft", category: "Collaboration", functions: ["HR", "Legal", "Finance", "Operations"], capabilities: [], processes: [], users: "4,000", annualCost: "$95K", age: "8 years", integration: "Partial", status: "Maintain", apiReady: "Needs Investment", dataQuality: "Low" },
    { id: "t12", name: "Archer GRC", vendor: "RSA/Archer", category: "GRC", functions: ["Risk", "Legal"], capabilities: ["Regulatory Compliance"], processes: ["Risk to Mitigation"], users: "120", annualCost: "$350K", age: "5 years", integration: "Standalone", status: "Migrate", apiReady: "Not Compatible", dataQuality: "Medium" },
  ];
  const [techSystems, setTechSystems] = usePersisted<TechSystem[]>(`${projectId}_tech_systems`, TECH_DEFAULT);
  const [techView, setTechView] = useState<"portfolio" | "capmap" | "rationalize" | "dataflow" | "aiready">("portfolio");
  const [techCatFilter, setTechCatFilter] = useState("All");
  const [techStatusFilter, setTechStatusFilter] = useState("All");
  const [techAddingSystem, setTechAddingSystem] = useState(false);
  const [techEditingId, setTechEditingId] = useState<string | null>(null);
  const [techCapMatrix, setTechCapMatrix] = usePersisted<Record<string, string>>(`${projectId}_tech_cap_matrix`, {});
  const [techDataFlows, setTechDataFlows] = usePersisted<Record<string, { systems: string[]; dataTypes: string[]; manualFlags: string[] }>>(`${projectId}_tech_dataflows`, {});

  // ── People & Culture state ──
  const CULTURE_DIMS = [
    { id: "innovation", left: "Stability", right: "Innovation", leftIcon: "🏛", rightIcon: "💡" },
    { id: "autonomy", left: "Control", right: "Autonomy", leftIcon: "🔒", rightIcon: "🦅" },
    { id: "collaboration", left: "Individual", right: "Collaboration", leftIcon: "👤", rightIcon: "🤝" },
    { id: "speed", left: "Thoroughness", right: "Speed", leftIcon: "🔍", rightIcon: "⚡" },
    { id: "customer", left: "Process-centric", right: "Customer-centric", leftIcon: "📋", rightIcon: "🎯" },
    { id: "hierarchy", left: "Hierarchical", right: "Flat", leftIcon: "📊", rightIcon: "🌐" },
    { id: "risk", left: "Risk-averse", right: "Risk-taking", leftIcon: "🛡️", rightIcon: "🎲" },
    { id: "purpose", left: "Profit-driven", right: "Purpose-driven", leftIcon: "💰", rightIcon: "🌍" },
  ];
  const [cultureCurrent, setCultureCurrent] = usePersisted<Record<string, number>>(`${projectId}_culture_current`, {});
  const [cultureTarget, setCultureTarget] = usePersisted<Record<string, number>>(`${projectId}_culture_target`, {});
  const [pcView, setPcView] = useState<"culture" | "ways" | "leadership" | "capacity">("culture");

  type WowEntry = { current: string; target: string };
  type WowRow = { func: string; workModel: WowEntry; methodology: WowEntry; decisionMaking: WowEntry; meetingCadence: WowEntry; tools: WowEntry };
  const WOW_FUNCS_DEFAULT = ["Finance", "HR", "Technology", "Operations", "Product", "Marketing", "Legal", "Executive"];
  const [wowData, setWowData] = usePersisted<WowRow[]>(`${projectId}_wow_data`, WOW_FUNCS_DEFAULT.map(f => ({
    func: f,
    workModel: { current: "Hybrid", target: "Hybrid" },
    methodology: { current: f === "Technology" || f === "Product" ? "Agile" : "Waterfall", target: f === "Legal" || f === "Finance" ? "Hybrid" : "Agile" },
    decisionMaking: { current: f === "Executive" ? "Hierarchical" : "Consensus", target: "Delegated" },
    meetingCadence: { current: "Weekly team", target: f === "Technology" || f === "Product" ? "Daily standup" : "Weekly team" },
    tools: { current: "", target: "" },
  })));

  const LEADERSHIP_COMPETENCIES = [
    { id: "lc1", name: "Strategic Vision", desc: "Ability to set direction, anticipate disruption, and align organization to long-term goals" },
    { id: "lc2", name: "Innovation Leadership", desc: "Fosters experimentation, tolerates failure, champions new ideas and business models" },
    { id: "lc3", name: "Digital Fluency", desc: "Understands technology trends, AI/data capabilities, and digital transformation levers" },
    { id: "lc4", name: "People Development", desc: "Coaches, mentors, and builds diverse high-performing teams" },
    { id: "lc5", name: "Change Leadership", desc: "Leads through ambiguity, builds buy-in, sustains momentum during transformation" },
    { id: "lc6", name: "Operational Excellence", desc: "Drives efficiency, quality, and continuous improvement in processes" },
    { id: "lc7", name: "Customer Obsession", desc: "Puts customer needs at the center of decisions and designs" },
    { id: "lc8", name: "Collaboration & Influence", desc: "Builds cross-functional partnerships and leads without authority" },
  ];
  const [leadershipScores, setLeadershipScores] = usePersisted<Record<string, { current: number; required: number }>>(`${projectId}_leadership_scores`, {});

  const [changeLoad, setChangeLoad] = usePersisted<{ active: string; fatigue: number; infrastructure: number; history: number; notes: string }>(`${projectId}_change_capacity`, { active: "", fatigue: 0, infrastructure: 0, history: 0, notes: "" });

  // ── Financials state ──
  type FinFuncCost = { people: number; technology: number; outsourcing: number; facilities: number; peopleTgt: number; technologyTgt: number; outsourcingTgt: number; facilitiesTgt: number };
  const FIN_FUNCS = ["Finance", "HR", "Technology", "Operations", "Marketing", "Legal", "Product", "Executive"];
  const [finCosts, setFinCosts] = usePersisted<Record<string, FinFuncCost>>(`${projectId}_fin_costs`, Object.fromEntries(FIN_FUNCS.map(f => [f, {
    people: f === "Technology" ? 12000 : f === "Operations" ? 8000 : f === "Finance" ? 6000 : f === "HR" ? 5000 : f === "Marketing" ? 4500 : f === "Legal" ? 3500 : f === "Product" ? 7000 : 2500,
    technology: f === "Technology" ? 4000 : f === "Finance" ? 1500 : f === "HR" ? 1200 : f === "Operations" ? 1000 : f === "Marketing" ? 800 : 500,
    outsourcing: f === "Operations" ? 2000 : f === "Technology" ? 1500 : f === "Legal" ? 800 : f === "HR" ? 500 : 200,
    facilities: f === "Operations" ? 1200 : f === "Technology" ? 800 : 400,
    peopleTgt: f === "Technology" ? 11000 : f === "Operations" ? 6500 : f === "Finance" ? 5000 : f === "HR" ? 3800 : f === "Marketing" ? 4200 : f === "Legal" ? 3200 : f === "Product" ? 7500 : 2500,
    technologyTgt: f === "Technology" ? 5000 : f === "Finance" ? 2000 : f === "HR" ? 1800 : f === "Operations" ? 1200 : f === "Marketing" ? 1000 : 600,
    outsourcingTgt: f === "Operations" ? 3000 : f === "Technology" ? 2000 : f === "Legal" ? 1200 : f === "HR" ? 1500 : 300,
    facilitiesTgt: f === "Operations" ? 800 : f === "Technology" ? 600 : 300,
  }])));
  const [finView, setFinView] = useState<"abc" | "cts" | "rcg" | "compare" | "bizcase">("abc");
  type FinCtsEntry = { headcount: number; costPerEmp: number; benchmark: number };
  const [finCts, setFinCts] = usePersisted<Record<string, FinCtsEntry>>(`${projectId}_fin_cts`, {
    HR: { headcount: 85, costPerEmp: 2400, benchmark: 1800 }, Finance: { headcount: 60, costPerEmp: 1900, benchmark: 1500 }, Technology: { headcount: 120, costPerEmp: 3200, benchmark: 2600 },
  });
  type FinRcgEntry = { run: number; change: number; grow: number; runTgt: number; changeTgt: number; growTgt: number };
  const [finRcg, setFinRcg] = usePersisted<Record<string, FinRcgEntry>>(`${projectId}_fin_rcg`, Object.fromEntries(FIN_FUNCS.map(f => [f, {
    run: f === "Operations" ? 75 : f === "Technology" ? 55 : f === "Finance" ? 70 : 65, change: f === "Technology" ? 30 : f === "Operations" ? 15 : 20, grow: f === "Technology" ? 15 : f === "Product" ? 30 : f === "Marketing" ? 25 : 15,
    runTgt: f === "Operations" ? 60 : f === "Technology" ? 45 : f === "Finance" ? 60 : 55, changeTgt: f === "Technology" ? 30 : 25, growTgt: f === "Technology" ? 25 : f === "Product" ? 35 : f === "Marketing" ? 30 : 20,
  }])));
  const [finBizCase, setFinBizCase] = usePersisted<{ investment: string; annualSavings: string; revenueImpact: string; discountRate: string }>(`${projectId}_fin_bizcase`, { investment: "", annualSavings: "", revenueImpact: "", discountRate: "10" });
  const fmtK = (n: number) => n >= 1000 ? `${(n/1000).toFixed(1)}M` : `${n}K`;

  // ── Performance state ──
  type PerfKpi = { id: string; name: string; perspective: "Financial" | "Customer" | "Process" | "Learning"; current: string; target: string; owner: string; frequency: string; status: "Red" | "Amber" | "Green"; stratLink: string; indicator: "Leading" | "Lagging"; pairedWith: string };
  const PERF_DEFAULT_KPIS: PerfKpi[] = [
    { id: "k1", name: "Revenue Growth Rate", perspective: "Financial", current: "5%", target: "12%", owner: "CFO", frequency: "Quarterly", status: "Amber", stratLink: "revenue", indicator: "Lagging", pairedWith: "k13" },
    { id: "k2", name: "Operating Cost Reduction", perspective: "Financial", current: "2%", target: "15%", owner: "CFO", frequency: "Quarterly", status: "Red", stratLink: "cost", indicator: "Lagging", pairedWith: "k10" },
    { id: "k3", name: "ROI on Transformation", perspective: "Financial", current: "0%", target: "150%", owner: "CFO", frequency: "Annually", status: "Amber", stratLink: "digital", indicator: "Lagging", pairedWith: "" },
    { id: "k4", name: "Margin Improvement", perspective: "Financial", current: "18%", target: "22%", owner: "CFO", frequency: "Quarterly", status: "Amber", stratLink: "cost", indicator: "Lagging", pairedWith: "" },
    { id: "k5", name: "Net Promoter Score", perspective: "Customer", current: "32", target: "55", owner: "CMO", frequency: "Monthly", status: "Amber", stratLink: "cx", indicator: "Lagging", pairedWith: "k8" },
    { id: "k6", name: "Customer Satisfaction", perspective: "Customer", current: "3.8", target: "4.5", owner: "CMO", frequency: "Monthly", status: "Amber", stratLink: "cx", indicator: "Lagging", pairedWith: "" },
    { id: "k7", name: "Time-to-Serve (days)", perspective: "Customer", current: "12", target: "5", owner: "COO", frequency: "Weekly", status: "Red", stratLink: "ops", indicator: "Lagging", pairedWith: "k10" },
    { id: "k8", name: "First Contact Resolution %", perspective: "Customer", current: "65%", target: "85%", owner: "VP CS", frequency: "Weekly", status: "Amber", stratLink: "cx", indicator: "Leading", pairedWith: "k5" },
    { id: "k9", name: "Process Cycle Time (avg days)", perspective: "Process", current: "18", target: "8", owner: "COO", frequency: "Monthly", status: "Red", stratLink: "ops", indicator: "Lagging", pairedWith: "k10" },
    { id: "k10", name: "Automation Coverage %", perspective: "Process", current: "25%", target: "60%", owner: "CTO", frequency: "Monthly", status: "Amber", stratLink: "digital", indicator: "Leading", pairedWith: "k2" },
    { id: "k11", name: "Error / Rework Rate", perspective: "Process", current: "8%", target: "2%", owner: "COO", frequency: "Weekly", status: "Red", stratLink: "ops", indicator: "Lagging", pairedWith: "" },
    { id: "k12", name: "Cross-functional Handoffs", perspective: "Process", current: "42", target: "20", owner: "COO", frequency: "Monthly", status: "Amber", stratLink: "ops", indicator: "Leading", pairedWith: "k9" },
    { id: "k13", name: "Skills Coverage Index", perspective: "Learning", current: "62%", target: "85%", owner: "CHRO", frequency: "Quarterly", status: "Red", stratLink: "talent", indicator: "Leading", pairedWith: "k1" },
    { id: "k14", name: "Training Hours / Employee", perspective: "Learning", current: "12", target: "40", owner: "CHRO", frequency: "Monthly", status: "Red", stratLink: "talent", indicator: "Leading", pairedWith: "k13" },
    { id: "k15", name: "Internal Mobility Rate", perspective: "Learning", current: "8%", target: "20%", owner: "CHRO", frequency: "Quarterly", status: "Amber", stratLink: "talent", indicator: "Leading", pairedWith: "" },
    { id: "k16", name: "Employee Engagement Score", perspective: "Learning", current: "3.6", target: "4.3", owner: "CHRO", frequency: "Quarterly", status: "Amber", stratLink: "talent", indicator: "Leading", pairedWith: "k17" },
    { id: "k17", name: "Voluntary Attrition Rate", perspective: "Learning", current: "18%", target: "10%", owner: "CHRO", frequency: "Monthly", status: "Amber", stratLink: "talent", indicator: "Lagging", pairedWith: "k16" },
  ];
  const [perfKpis, setPerfKpis] = usePersisted<PerfKpi[]>(`${projectId}_perf_kpis`, PERF_DEFAULT_KPIS);
  const [perfView, setPerfView] = useState<"scorecard" | "okr" | "indicators" | "healthcheck">("scorecard");

  type PerfOkr = { id: string; level: "Enterprise" | "Function" | "Team"; objective: string; keyResults: { id: string; text: string; progress: number }[]; parentId: string };
  const [perfOkrs, setPerfOkrs] = usePersisted<PerfOkr[]>(`${projectId}_perf_okrs`, [
    { id: "o1", level: "Enterprise", objective: "Accelerate digital transformation across all functions", parentId: "", keyResults: [
      { id: "kr1a", text: "Achieve 60% automation coverage by Q4", progress: 40 },
      { id: "kr1b", text: "Reduce average process cycle time from 18 to 8 days", progress: 25 },
      { id: "kr1c", text: "Deploy AI-assisted decision making in 3 functions", progress: 33 },
    ]},
    { id: "o2", level: "Enterprise", objective: "Achieve operational cost excellence", parentId: "", keyResults: [
      { id: "kr2a", text: "Reduce operating costs by 15% year-over-year", progress: 15 },
      { id: "kr2b", text: "Consolidate from 12 to 8 enterprise systems", progress: 25 },
      { id: "kr2c", text: "Implement shared services for 4 functions", progress: 50 },
    ]},
    { id: "o3", level: "Function", objective: "Transform HR to a data-driven people function", parentId: "o1", keyResults: [
      { id: "kr3a", text: "Reduce time-to-hire from 45 to 25 days", progress: 40 },
      { id: "kr3b", text: "Achieve 85% skills coverage index", progress: 55 },
      { id: "kr3c", text: "Automate 80% of HR admin tasks", progress: 30 },
    ]},
    { id: "o4", level: "Function", objective: "Modernize finance operations", parentId: "o2", keyResults: [
      { id: "kr4a", text: "Reduce close cycle from 10 to 4 days", progress: 35 },
      { id: "kr4b", text: "Achieve 99.5% touchless invoice processing", progress: 60 },
    ]},
    { id: "o5", level: "Team", objective: "Build AI/ML engineering capability", parentId: "o3", keyResults: [
      { id: "kr5a", text: "Hire 5 ML engineers by Q2", progress: 60 },
      { id: "kr5b", text: "Deploy 3 production ML models", progress: 33 },
    ]},
  ]);
  const [perfAddingOkr, setPerfAddingOkr] = useState(false);
  const [perfNewOkr, setPerfNewOkr] = useState({ level: "Function" as PerfOkr["level"], objective: "", parentId: "" });

  const PERF_HEALTH_DIMS = [
    { id: "alignment", name: "Strategic Alignment", desc: "Is the operating model supporting current strategy?", questions: ["Strategy priorities are reflected in OM design", "Capability investments match strategic needs", "KPIs trace to strategic objectives", "Design principles are consistently applied"] },
    { id: "efficiency", name: "Efficiency", desc: "Is the model delivering at target cost?", questions: ["Cost-to-serve is at or below benchmark", "Automation targets are being met", "Redundant systems are being consolidated", "Shared services are operating at scale"] },
    { id: "effectiveness", name: "Effectiveness", desc: "Is the model producing quality outcomes?", questions: ["Process error rates are within target", "Customer/stakeholder satisfaction meets goals", "Decision quality has improved", "Outputs meet quality standards"] },
    { id: "agility", name: "Agility", desc: "Can the model adapt to change?", questions: ["New capabilities can be added within 90 days", "Processes can be reconfigured quickly", "Teams can be redeployed across priorities", "Technology stack supports rapid change"] },
    { id: "people", name: "People", desc: "Are roles clear, skills sufficient, culture aligned?", questions: ["Role clarity scores are above 4/5", "Skills coverage meets target levels", "Culture assessment gaps are closing", "Leadership competencies are developing"] },
  ];
  const [perfHealth, setPerfHealth] = usePersisted<Record<string, number>>(`${projectId}_perf_health`, {});

  // ── Transition Plan state ──
  type TransChange = { id: string; name: string; category: "Structure" | "Process" | "Technology" | "People" | "Governance"; from: string; to: string; affected: string; wave: number; dependencies: string[]; risk: string; owner: string; status: "Not Started" | "In Progress" | "Complete" };
  type TransParallel = { changeId: string; duration: string; exitCriteria: string; rollback: string };
  type TransStakeholder = { id: string; name: string; role: string; status: "Not Started" | "In Review" | "Approved" | "Rejected"; conditions: string };
  const TRANS_DEFAULT_CHANGES: TransChange[] = [
    { id: "tc1", name: "Establish shared services center", category: "Structure", from: "Embedded in each function", to: "Centralized SSC", affected: "Finance, HR, IT support", wave: 1, dependencies: [], risk: "Medium", owner: "COO", status: "Not Started" },
    { id: "tc2", name: "Implement new governance forums", category: "Governance", from: "Ad-hoc decision making", to: "Structured steering committees", affected: "All leadership", wave: 0, dependencies: [], risk: "Low", owner: "CEO", status: "Not Started" },
    { id: "tc3", name: "Deploy AI automation platform", category: "Technology", from: "Manual processes", to: "AI-augmented workflows", affected: "Operations, Finance", wave: 2, dependencies: ["tc6"], risk: "High", owner: "CTO", status: "Not Started" },
    { id: "tc4", name: "Redesign Hire-to-Retire process", category: "Process", from: "5 handoffs, 45-day cycle", to: "3 handoffs, 20-day cycle", affected: "HR, Hiring managers", wave: 1, dependencies: ["tc2"], risk: "Medium", owner: "CHRO", status: "Not Started" },
    { id: "tc5", name: "Reskill 200 employees for AI roles", category: "People", from: "Manual task execution", to: "AI-augmented knowledge work", affected: "Operations, Finance staff", wave: 2, dependencies: ["tc3"], risk: "High", owner: "CHRO", status: "Not Started" },
    { id: "tc6", name: "Retire legacy ERP system", category: "Technology", from: "Oracle on-prem ERP", to: "SAP S/4HANA (cloud)", affected: "Finance, Operations", wave: 2, dependencies: ["tc1"], risk: "High", owner: "CTO", status: "Not Started" },
    { id: "tc7", name: "Launch change champion network", category: "People", from: "No change infrastructure", to: "50 change champions across functions", affected: "All functions", wave: 0, dependencies: [], risk: "Low", owner: "CHRO", status: "Not Started" },
    { id: "tc8", name: "Consolidate CRM platforms", category: "Technology", from: "3 CRM systems", to: "1 unified Salesforce instance", affected: "Sales, Marketing, CS", wave: 1, dependencies: [], risk: "Medium", owner: "CTO", status: "Not Started" },
    { id: "tc9", name: "Implement RAPID decision rights", category: "Governance", from: "Unclear decision ownership", to: "RAPID framework for 25 decisions", affected: "All decision-makers", wave: 0, dependencies: ["tc2"], risk: "Low", owner: "CEO", status: "Not Started" },
    { id: "tc10", name: "Redesign org structure (spans & layers)", category: "Structure", from: "7 layers, 4:1 avg span", to: "5 layers, 7:1 avg span", affected: "All people managers", wave: 2, dependencies: ["tc1", "tc5"], risk: "High", owner: "CHRO", status: "Not Started" },
    { id: "tc11", name: "Quick win: automate expense approvals", category: "Process", from: "Manual 3-day approval", to: "Auto-approve <$500", affected: "All employees", wave: 0, dependencies: [], risk: "Low", owner: "CFO", status: "Not Started" },
    { id: "tc12", name: "Establish COE for data & analytics", category: "Structure", from: "Fragmented analytics teams", to: "Central D&A COE", affected: "Data analysts across functions", wave: 1, dependencies: ["tc2"], risk: "Medium", owner: "CDO", status: "Not Started" },
  ];
  const [transChanges, setTransChanges] = usePersisted<TransChange[]>(`${projectId}_trans_changes`, TRANS_DEFAULT_CHANGES);
  const [transView, setTransView] = useState<"migration" | "waves" | "dependencies" | "parallel" | "signoff">("migration");
  const [transParallels, setTransParallels] = usePersisted<TransParallel[]>(`${projectId}_trans_parallel`, []);
  const [transStakeholders, setTransStakeholders] = usePersisted<TransStakeholder[]>(`${projectId}_trans_stakeholders`, [
    { id: "s1", name: "CEO", role: "Executive Sponsor", status: "Not Started", conditions: "" },
    { id: "s2", name: "CFO", role: "Financial Approval", status: "Not Started", conditions: "" },
    { id: "s3", name: "CHRO", role: "People & Change", status: "Not Started", conditions: "" },
    { id: "s4", name: "CTO", role: "Technology Approval", status: "Not Started", conditions: "" },
    { id: "s5", name: "COO", role: "Operations Impact", status: "Not Started", conditions: "" },
    { id: "s6", name: "Board Representative", role: "Board Oversight", status: "Not Started", conditions: "" },
  ]);
  const [transAddingChange, setTransAddingChange] = useState(false);
  const [transAddingStakeholder, setTransAddingStakeholder] = useState(false);
  const TRANS_CAT_COLORS: Record<string, string> = { Structure: "#a78bb8", Process: "#8ba87a", Technology: "#a78bb8", People: "#f4a83a", Governance: "#f4a83a" };
  const TRANS_WAVE_LABELS = ["Wave 0: Foundations (M1-3)", "Wave 1: Quick Wins (M3-6)", "Wave 2: Core Changes (M6-12)", "Wave 3: Optimization (M12-18)"];

  // ── Model Governance state ──
  type MgovOwner = { role: string; name: string; scope: string };
  const [mgovOwners, setMgovOwners] = usePersisted<MgovOwner[]>(`${projectId}_mgov_owners`, [
    { role: "Model Owner", name: "", scope: "Accountable for the operating model delivering outcomes. Final escalation for model decisions." },
    { role: "Model Steward", name: "", scope: "Day-to-day management of model documentation, change requests, and version control." },
    { role: "Finance Owner", name: "", scope: "Owns finance function operating model: service delivery, processes, governance." },
    { role: "HR Owner", name: "", scope: "Owns people function model: talent processes, culture, ways of working." },
    { role: "Technology Owner", name: "", scope: "Owns technology function model: systems, architecture, AI enablement." },
    { role: "Operations Owner", name: "", scope: "Owns operations function model: processes, supply chain, shared services." },
  ]);
  const MGOV_RACI_ACTIVITIES = [
    "Annual OM review", "Quarterly health check", "Change request approval", "Version release", "KPI target setting",
    "Capability investment", "Service model changes", "Governance forum changes", "Process redesign approval", "Technology decisions",
  ];
  const [mgovRaci, setMgovRaci] = usePersisted<Record<string, Record<string, string>>>(`${projectId}_mgov_raci`, {});
  const [mgovView, setMgovView] = useState<"ownership" | "cadence" | "changes" | "versions">("ownership");

  type MgovReview = { id: string; name: string; type: "Quarterly" | "Annual" | "Triggered"; date: string; status: "Scheduled" | "Complete" | "Overdue"; participants: string; notes: string };
  const [mgovReviews, setMgovReviews] = usePersisted<MgovReview[]>(`${projectId}_mgov_reviews`, [
    { id: "mr1", name: "Q1 Health Check", type: "Quarterly", date: "2026-06-30", status: "Scheduled", participants: "Model Owner, Steward, Function Owners", notes: "" },
    { id: "mr2", name: "Q2 Health Check", type: "Quarterly", date: "2026-09-30", status: "Scheduled", participants: "Model Owner, Steward, Function Owners", notes: "" },
    { id: "mr3", name: "Q3 Health Check", type: "Quarterly", date: "2026-12-31", status: "Scheduled", participants: "Model Owner, Steward, Function Owners", notes: "" },
    { id: "mr4", name: "Year 1 Comprehensive Review", type: "Annual", date: "2027-03-31", status: "Scheduled", participants: "Executive Committee, all Function Owners, HR, Finance", notes: "" },
  ]);
  const MGOV_REVIEW_CHECKLIST = [
    "Are strategic priorities still valid?", "Is the model delivering target cost savings?",
    "Are KPIs on track (check balanced scorecard)?", "Have any governance bottlenecks emerged?",
    "Are process maturity scores improving?", "Is technology rationalization on track?",
    "Is culture shifting toward target state?", "Are change capacity limits being respected?",
  ];

  type MgovChangeReq = { id: string; title: string; reason: string; impact: string; cost: string; requestedBy: string; date: string; status: "Draft" | "Under Review" | "Approved" | "Rejected" | "Implemented"; approver: string };
  const [mgovChangeReqs, setMgovChangeReqs] = usePersisted<MgovChangeReq[]>(`${projectId}_mgov_changereqs`, []);
  const [mgovAddingCr, setMgovAddingCr] = useState(false);

  type MgovVersion = { id: string; version: string; date: string; summary: string; changes: string[]; author: string };
  const [mgovVersions, setMgovVersions] = usePersisted<MgovVersion[]>(`${projectId}_mgov_versions`, [
    { id: "v1", version: "1.0", date: "2026-04-11", summary: "Initial operating model design", changes: ["Strategy layer defined", "Governance forums established", "Service delivery model designed", "Process architecture mapped", "Technology portfolio assessed"], author: "Model Steward" },
  ]);
  const [mgovAddingVersion, setMgovAddingVersion] = useState(false);

  const stratPriorityLabel = (id: string) => STRAT_PRIORITIES_ALL.find(p => p.id === id)?.label || id;
  const stratPrioritySummary = stratPriorities.length >= 1
    ? `Your #1 priority is ${stratPriorityLabel(stratPriorities[0])}${stratPriorities.length >= 2 ? ` — followed by ${stratPriorityLabel(stratPriorities[1])}` : ""}. Recommendations will emphasize ${stratPriorities[0] === "cost" ? "efficiency and cost reduction" : stratPriorities[0] === "revenue" ? "growth and revenue generation" : stratPriorities[0] === "innovation" ? "innovation and R&D investment" : stratPriorities[0] === "cx" ? "customer-centricity" : stratPriorities[0] === "ops" ? "process optimization" : stratPriorities[0] === "risk" ? "risk mitigation and compliance" : stratPriorities[0] === "talent" ? "talent development and culture" : "digital transformation and AI adoption"}.`
    : "";

  // Fetch taxonomy when industries change
  useEffect(() => {
    api.getOMTaxonomy(omIndustries.length ? omIndustries : undefined).then(d => setOmTaxonomy(d));
  }, [omIndustries]);

  // Debounced search
  const debouncedOmSearch = useDebounce(omSearch, 300);
  useEffect(() => {
    if (debouncedOmSearch.length >= 2) {
      api.searchOMTaxonomy(debouncedOmSearch, omIndustries.length ? omIndustries : undefined).then(d => setOmSearchResults((d as Record<string,unknown>).results as Record<string,unknown>[] || []));
    } else { setOmSearchResults([]); }
  }, [debouncedOmSearch, omIndustries]);
  const fnD = OM_FUNCTIONS[fn]; const archD = OM_ARCHETYPES[arch];
  // Memoize derived layer computations — these build arrays every render
  const { govLayer, coreLayer, sharedLayer, enableLayer, interfaceLayer, teams } = useMemo(() => {
    // Governance: archetype base + governance tightness modifier
    const govExtra = gov === "tight" ? ["Audit & Oversight Committee","Policy Enforcement"] : gov === "light" ? [] : ["Governance Coordination"];
    const govLayer = [...archD.gov, ...govExtra];
    // Operating model modifier on shared layer
    const modelShared = opModel === "centralized" ? "Global Shared Services Center" : opModel === "decentralized" ? "Local Delivery Teams" : opModel === "federated" ? "Federated Centers of Expertise" : "Hub Center + Embedded Spokes";
    // Core: function capabilities + archetype suffix
    const coreLayer = fnD.core.map(c => archD.coreSuffix ? `${c}${archD.coreSuffix}` : c);
    // Shared: blend function shared + archetype shared themes
    const sharedLayer = [...(fnD.shared || []), modelShared, ...archD.sharedTheme.filter(s => !(fnD.shared || []).some(fs => fs.toLowerCase().includes(s.toLowerCase().split(" ")[0])))].slice(0, 6);
    // Enabling: archetype-specific enabling (overrides function default)
    const enableLayer = archD.enableTheme;
    // Interface: archetype-specific interface
    const interfaceLayer = archD.interfaceTheme;
    const teams = [...coreLayer, ...sharedLayer, ...enableLayer, ...interfaceLayer];
    return { govLayer, coreLayer, sharedLayer, enableLayer, interfaceLayer, teams };
  }, [fn, arch, gov, opModel, fnD, archD]);
  const getAiTier = useCallback((t: string) => { const l = t.toLowerCase();
    // Platform archetype pushes everything more toward AI
    const platformBoost = arch === "platform" ? 15 : arch === "network" ? 5 : 0;
    // Centralized model favors more automation
    const modelBoost = opModel === "centralized" ? 10 : opModel === "decentralized" ? -5 : 0;
    if (l.includes("analytics") || l.includes("data") || l.includes("reporting") || l.includes("qa") || l.includes("audit")) { const p = Math.min(70 + platformBoost + modelBoost, 95); return { tier: "AI-First" as const, color: "var(--purple)", pct: p }; }
    if (l.includes("ops") || l.includes("admin") || l.includes("procurement") || l.includes("processing") || l.includes("payable") || l.includes("receivable")) { const p = Math.min(45 + platformBoost + modelBoost, 85); return { tier: "AI-Augmented" as const, color: "#f4a83a", pct: p }; }
    if (l.includes("strategy") || l.includes("leadership") || l.includes("relations") || l.includes("counsel") || l.includes("culture")) { const p = Math.max(15 + platformBoost + modelBoost, 5); return { tier: "Human-Led" as const, color: "#8ba87a", pct: p }; }
    const p = Math.min(35 + platformBoost + modelBoost, 80); return { tier: "Hybrid" as const, color: "var(--amber)", pct: p }; }, [arch, opModel]);
  const getSM = useCallback((t: string) => { if (sharedLayer.some(s => s.toLowerCase().includes(t.toLowerCase().split(" ")[0]))) return "Shared"; return "Embedded"; }, [sharedLayer]);
  const { activeCoreLayer, activeSharedLayer, activeEnableLayer, activeInterfaceLayer, activeGovLayer, allCaps, stratCapabilities } = useMemo(() => {
    const activeCoreLayer = aiBlueprint?.core || coreLayer.map(c => c.replace(archD.coreSuffix, ""));
    const activeSharedLayer = aiBlueprint?.shared || sharedLayer;
    const activeEnableLayer = aiBlueprint?.enabling || enableLayer;
    const activeInterfaceLayer = aiBlueprint?.interface || interfaceLayer;
    const activeGovLayer = aiBlueprint?.governance || govLayer;
    const allCaps = [...activeGovLayer.map(g => ({name:g,layer:"Governance"})), ...activeCoreLayer.map(c => ({name:c,layer:"Core"})), ...activeSharedLayer.map(s => ({name:s,layer:"Shared"})), ...activeEnableLayer.map(e => ({name:e,layer:"Enabling"})), ...activeInterfaceLayer.map(i => ({name:i,layer:"Interface"}))];
    // Capability names for strategy mapping
    const stratCapabilities = [...activeCoreLayer.map(c => c.replace(archD.coreSuffix, "")), ...activeSharedLayer, ...activeEnableLayer];
    return { activeCoreLayer, activeSharedLayer, activeEnableLayer, activeInterfaceLayer, activeGovLayer, allCaps, stratCapabilities };
  }, [aiBlueprint, coreLayer, sharedLayer, enableLayer, interfaceLayer, govLayer, archD.coreSuffix]);
  const layerColors: Record<string,string> = useMemo(() => ({ Governance: "#e87a5d", Core: "#f4a83a", Shared: "#8ba87a", Enabling: "#a78bb8", Interface: "#f4a83a" }), []);

  // ── Step navigator structure ──
  const OM_PHASES = useMemo(() => [
    { id: "1", label: "Strategic Intent", icon: "🎯", color: "#f4a83a", steps: [
      { id: "1.1", label: "Strategic Priorities", desc: "Vision, priorities & design principles" },
      { id: "1.2", label: "Business Model & Value Chain", desc: "How you create and capture value" },
    ]},
    { id: "2", label: "Architecture Design", icon: "🏗️", color: "var(--amber)", steps: [
      { id: "2.1", label: "Capability Model", desc: "Capabilities, maturity & investment" },
      { id: "2.2", label: "Service Delivery Model", desc: "In-house, shared, COE, outsourced" },
      { id: "2.3", label: "Process Architecture", desc: "E2E processes, handoffs & maturity" },
      { id: "2.4", label: "Technology & Systems", desc: "App portfolio, rationalization & AI" },
      { id: "2.5", label: "Governance & Decisions", desc: "Decision rights, forums & bottlenecks" },
    ]},
    { id: "3", label: "People & Organization", icon: "👥", color: "var(--purple)", steps: [
      { id: "3.1", label: "Organization Structure", desc: "Blueprint, archetype & structure" },
      { id: "3.2", label: "Culture & Ways of Working", desc: "Culture, leadership & collaboration" },
      { id: "3.3", label: "Workforce Model", desc: "Skills, capacity & change readiness" },
    ]},
    { id: "4", label: "Business Case & Execution", icon: "📊", color: "#8ba87a", steps: [
      { id: "4.1", label: "Financial Model", desc: "Costing, ROI & business case" },
      { id: "4.2", label: "Performance Framework", desc: "Scorecard, OKRs & health check" },
      { id: "4.3", label: "Transition Plan", desc: "Waves, dependencies & sign-off" },
      { id: "4.4", label: "Model Governance", desc: "Ownership, reviews & versioning" },
    ]},
  ], []);

  // Step completion logic
  const stepComplete = useCallback((id: string): boolean => {
    switch (id) {
      case "1.1": return stratPriorities.length >= 1 && Object.values(stratDesignPrinciples).some(v => v.value !== 50);
      case "1.2": return Object.values(stratBizModel).some(arr => arr.length > 0);
      case "2.1": return Object.keys(maturityScores).length >= 3;
      case "2.2": return Object.keys(svcDeliveryMap).length >= 3;
      case "2.3": return procProcesses.some(p => p.maturity > 0);
      case "2.4": return techSystems.length >= 3;
      case "2.5": return govDecisions.length >= 5 && Object.keys(govRapid).length >= 3;
      case "3.1": return arch !== "functional" || opModel !== "centralized";
      case "3.2": return Object.keys(cultureCurrent).length >= 3;
      case "3.3": return changeLoad.fatigue > 0 || changeLoad.infrastructure > 0;
      case "4.1": return Object.keys(finCosts).length >= 3;
      case "4.2": return perfKpis.some(k => k.status !== "Amber");
      case "4.3": return transChanges.some(c => c.status !== "Not Started");
      case "4.4": return mgovOwners.some(o => o.name.length > 0);
      default: return false;
    }
  }, [stratPriorities, stratDesignPrinciples, stratBizModel, maturityScores, svcDeliveryMap, procProcesses, techSystems, govDecisions, govRapid, arch, opModel, cultureCurrent, changeLoad, finCosts, perfKpis, transChanges, mgovOwners]);
  const stepInProgress = useCallback((id: string): boolean => {
    if (stepComplete(id)) return false;
    switch (id) {
      case "1.1": return stratPriorities.length > 0 || stratVision.length > 0;
      case "1.2": return Object.values(stratBizModel).some(arr => arr.length > 0);
      case "2.1": return Object.keys(maturityScores).length > 0 || Object.keys(targetScores).length > 0;
      case "2.2": return Object.keys(svcDeliveryMap).length > 0;
      case "2.3": return procProcesses.length > 0;
      case "2.4": return techSystems.length > 0;
      case "2.5": return govDecisions.length > 0;
      case "3.2": return Object.keys(cultureCurrent).length > 0 || Object.keys(cultureTarget).length > 0;
      case "4.2": return perfKpis.length > 0;
      case "4.3": return transChanges.length > 0;
      default: return false;
    }
  }, [stepComplete, stratPriorities, stratVision, stratBizModel, maturityScores, targetScores, svcDeliveryMap, procProcesses, techSystems, govDecisions, cultureCurrent, cultureTarget, perfKpis, transChanges]);
  const { completedSteps, totalSteps, completionPct } = useMemo(() => {
    const completedSteps = OM_PHASES.flatMap(p => p.steps).filter(s => stepComplete(s.id)).length;
    const totalSteps = OM_PHASES.flatMap(p => p.steps).length;
    const completionPct = Math.round((completedSteps / totalSteps) * 100);
    return { completedSteps, totalSteps, completionPct };
  }, [OM_PHASES, stepComplete]);

  return <div>
    <PageHeader icon={<SlidersHorizontal />} title="Operating Model Lab" subtitle="Build a complete Target Operating Model — guided step by step" onBack={onBack} moduleId="opmodel" />
    {pb.bannerPaths.length > 0 && <PathStepBanner paths={pb.bannerPaths} onMarkComplete={pb.handleMarkComplete} onPause={pb.handlePause} onOpenPathDrawer={(srcId) => onBack()} />}
    {pb.completionWarning && <SoftCompletionWarning criterion={pb.completionWarning.criterion} onConfirm={pb.confirmComplete} onCancel={pb.cancelComplete} />}

    {showWelcome && <div style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "12px 16px", marginBottom: 16, background: "rgba(244,168,58,0.06)", border: "1px solid rgba(244,168,58,0.15)", borderLeft: "3px solid var(--amber)", borderRadius: 12 }}>
      <span style={{ fontSize: 20, flexShrink: 0, marginTop: 2 }}>💡</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>Welcome to the Operating Model Lab</div>
        <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>This 14-step guided process helps you design your organization's target operating model — how you'll structure capabilities, make decisions, and deliver services. Each step builds on the previous ones. Most organizations complete this in 3-5 sessions (~2 hours total). You can save progress and return anytime.</div>
      </div>
      <button onClick={() => setShowWelcome(false)} style={{ fontSize: 17, color: "#8a7f6d", background: "none", border: "none", cursor: "pointer", padding: 4, flexShrink: 0 }}>×</button>
    </div>}

    {/* ═══ COCKPIT HEADER ═══ */}
    <div style={{ display: "flex", gap: 24, alignItems: "center", padding: "16px 20px", marginBottom: 16, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16 }}>
      {/* LEFT: Progress ring */}
      <div style={{ position: "relative", width: 88, height: 88, flexShrink: 0 }}>
        <svg viewBox="0 0 88 88" style={{ width: 88, height: 88, transform: "rotate(-90deg)" }}>
          <circle cx="44" cy="44" r="38" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
          <circle cx="44" cy="44" r="38" fill="none" stroke={completionPct >= 70 ? "var(--sage)" : completionPct >= 30 ? "var(--amber)" : "var(--ink-faint)"} strokeWidth="6" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 38}`} strokeDashoffset={`${2 * Math.PI * 38 * (1 - completionPct / 100)}`} style={{ transition: "stroke-dashoffset 0.6s ease-out", filter: `drop-shadow(0 0 6px ${completionPct >= 70 ? "rgba(139,168,122,0.3)" : "rgba(244,168,58,0.3)"})` }} />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>{completedSteps}/{totalSteps}</span>
          <span style={{ fontSize: 11, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: "0.08em" }}>steps</span>
        </div>
      </div>

      {/* MIDDLE: DNA Strip + synthesis */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* 14-segment DNA strip */}
        <div style={{ display: "flex", gap: 3, marginBottom: 8 }}>
          {OM_PHASES.flatMap(p => p.steps).map((step, i) => {
            const done = stepComplete(step.id);
            const active = omView === step.id;
            const color = done ? "var(--sage)" : active ? "var(--amber)" : "var(--paper-solid)";
            return <div key={step.id} title={step.label} style={{ flex: 1, height: 6, borderRadius: 3, background: color, transition: "background 0.3s", cursor: "pointer", border: active ? "1px solid var(--amber)" : "1px solid transparent" }} onClick={() => setOmView(step.id)} />;
          })}
        </div>
        {/* Synthesis line */}
        <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
          {stratPriorities.length > 0
            ? `Your model is shaping up as a ${OM_ARCHETYPES[arch]?.label || arch} ${opModel.replace("_", "-")} with ${gov} governance${stratPriorities.length >= 2 ? `, optimized for ${STRAT_PRIORITIES_ALL.find(p => p.id === stratPriorities[0])?.label || ""} and ${STRAT_PRIORITIES_ALL.find(p => p.id === stratPriorities[1])?.label || ""}` : ""}.`
            : "Configure your strategic priorities to see your operating model take shape."}
        </div>
        {/* Action buttons */}
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button onClick={() => onNavigateCanvas && onNavigateCanvas()} style={{ padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, color: "var(--ink-faint)", background: "transparent", border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer" }}>Design Canvas</button>
          <button onClick={() => setShowTomSummary(true)} style={{ padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, color: "#fff", background: "#f4a83a", border: "none", cursor: "pointer" }}>View Target Operating Model</button>
          <button onClick={() => setShowCommittee(!showCommittee)} style={{ padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, color: showCommittee ? "#fff" : "var(--ink-faint)", background: showCommittee ? "var(--dusk)" : "transparent", border: "1px solid " + (showCommittee ? "var(--dusk)" : "rgba(255,255,255,0.08)"), cursor: "pointer" }}>Committee Review</button>
        </div>
      </div>

      {/* RIGHT: Model Fingerprint Radar */}
      <div style={{ width: 140, height: 140, flexShrink: 0, position: "relative" }}>
        <svg viewBox="0 0 140 140" style={{ width: "100%", height: "100%" }}>
          {/* Radar grid */}
          {[20, 40, 60].map(r => <circle key={r} cx="70" cy="70" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />)}
          {/* Axis lines + labels */}
          {(() => {
            const axes = [
              { label: "Decentral", key: "centralize", invert: true },
              { label: "Standard", key: "standardize", invert: false },
              { label: "Build", key: "buildBuy", invert: true },
              { label: "Speed", key: "controlSpeed", invert: false },
              { label: "Specialist", key: "specialistGen", invert: true },
            ];
            const angleStep = (2 * Math.PI) / axes.length;
            const startAngle = -Math.PI / 2;
            return <>
              {axes.map((ax, i) => {
                const angle = startAngle + i * angleStep;
                const ex = 70 + 60 * Math.cos(angle);
                const ey = 70 + 60 * Math.sin(angle);
                const lx = 70 + 68 * Math.cos(angle);
                const ly = 70 + 68 * Math.sin(angle);
                return <g key={ax.key}>
                  <line x1="70" y1="70" x2={ex} y2={ey} stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
                  <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fill="var(--ink-faint)" fontSize="7" fontWeight="600">{ax.label}</text>
                </g>;
              })}
              {/* Data polygon */}
              <polygon points={axes.map((ax, i) => {
                const angle = startAngle + i * angleStep;
                const raw = (stratDesignPrinciples[ax.key]?.value ?? 50) / 100;
                const val = ax.invert ? 1 - raw : raw;
                const r = 10 + val * 50;
                return `${70 + r * Math.cos(angle)},${70 + r * Math.sin(angle)}`;
              }).join(" ")} fill="rgba(244,168,58,0.15)" stroke="var(--amber)" strokeWidth="1.5" style={{ transition: "all 0.6s ease-out" }} />
              {/* Data dots */}
              {axes.map((ax, i) => {
                const angle = startAngle + i * angleStep;
                const raw = (stratDesignPrinciples[ax.key]?.value ?? 50) / 100;
                const val = ax.invert ? 1 - raw : raw;
                const r = 10 + val * 50;
                return <circle key={ax.key + "_dot"} cx={70 + r * Math.cos(angle)} cy={70 + r * Math.sin(angle)} r="3" fill="var(--amber)" style={{ transition: "all 0.6s ease-out" }} />;
              })}
            </>;
          })()}
        </svg>
        <div style={{ position: "absolute", bottom: -4, left: 0, right: 0, textAlign: "center", fontSize: 11, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Model Fingerprint</div>
      </div>
    </div>

    {/* ═══ TOM SUMMARY MODAL ═══ */}
    {showTomSummary && <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4" onClick={() => setShowTomSummary(false)}>
      <div className="bg-[var(--bg)] rounded-2xl border border-[var(--border)] max-w-[1200px] w-full max-h-[90vh] overflow-y-auto p-8" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <div><div className="text-[20px] font-extrabold text-[var(--text-primary)]">Target Operating Model — Summary</div><div className="text-[14px] text-[var(--text-muted)]">TOM-on-a-Page | Generated {new Date().toLocaleDateString()}</div></div>
          <button onClick={() => setShowTomSummary(false)} className="text-[20px] text-[var(--text-muted)] hover:text-[var(--text-primary)]">×</button>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {/* 1. Strategic Intent */}
          <div className="rounded-xl border-l-4 border border-[var(--border)] bg-[var(--surface-2)] p-4" style={{ borderLeftColor: "#f4a83a" }}>
            <div className="text-[13px] font-bold uppercase mb-2" style={{ color: "#f4a83a" }}>Strategic Intent</div>
            {stratPriorities.length > 0 ? <div className="space-y-1">{stratPriorities.map((id, i) => { const p = STRAT_PRIORITIES_ALL.find(x => x.id === id); return <div key={id} className="text-[13px]"><strong>#{i+1}</strong> {p?.icon} {p?.label}</div>; })}</div> : <div className="text-[13px] text-[var(--text-muted)]">Not configured</div>}
            {stratVision && <div className="text-[12px] text-[var(--text-muted)] mt-2 italic line-clamp-2">{stratVision}</div>}
          </div>
          {/* 2. Capability Heatmap */}
          <div className="rounded-xl border-l-4 border border-[var(--border)] bg-[var(--surface-2)] p-4" style={{ borderLeftColor: "var(--amber)" }}>
            <div className="text-[13px] font-bold uppercase mb-2" style={{ color: "var(--amber)" }}>Capability Maturity</div>
            <div className="space-y-1">{stratCapabilities.slice(0, 6).map(cap => { const s = maturityScores[cap] || 0; const t = targetScores[cap] || 0; return <div key={cap} className="flex items-center justify-between text-[12px]"><span className="truncate flex-1">{cap}</span><span className="font-bold ml-1" style={{ color: s >= 4 ? "#8ba87a" : s >= 3 ? "#f4a83a" : s > 0 ? "#e87a5d" : "#8a7f6d" }}>{s || "—"}{t ? `→${t}` : ""}</span></div>; })}</div>
          </div>
          {/* 3. Service Delivery */}
          <div className="rounded-xl border-l-4 border border-[var(--border)] bg-[var(--surface-2)] p-4" style={{ borderLeftColor: "var(--amber)" }}>
            <div className="text-[13px] font-bold uppercase mb-2" style={{ color: "var(--amber)" }}>Service Delivery</div>
            {(() => { const counts: Record<string, number> = {}; Object.values(svcDeliveryMap).forEach(v => { counts[v.target || v.current] = (counts[v.target || v.current] || 0) + 1; }); return Object.keys(counts).length > 0 ? <div className="space-y-1">{Object.entries(counts).map(([m, c]) => <div key={m} className="flex justify-between text-[12px]"><span>{m}</span><span className="font-bold">{c}</span></div>)}</div> : <div className="text-[13px] text-[var(--text-muted)]">Not configured</div>; })()}
          </div>
          {/* 4. Processes */}
          <div className="rounded-xl border-l-4 border border-[var(--border)] bg-[var(--surface-2)] p-4" style={{ borderLeftColor: "var(--amber)" }}>
            <div className="text-[13px] font-bold uppercase mb-2" style={{ color: "var(--amber)" }}>Process Overview</div>
            <div className="space-y-1">{procProcesses.slice(0, 6).map(p => <div key={p.id} className="flex justify-between text-[12px]"><span className="truncate flex-1">{p.name}</span><span className="font-bold ml-1" style={{ color: p.maturity >= 4 ? "#8ba87a" : p.maturity >= 3 ? "#f4a83a" : p.maturity > 0 ? "#e87a5d" : "#8a7f6d" }}>L{p.maturity || "—"}</span></div>)}</div>
          </div>
          {/* 5. Technology */}
          <div className="rounded-xl border-l-4 border border-[var(--border)] bg-[var(--surface-2)] p-4" style={{ borderLeftColor: "var(--amber)" }}>
            <div className="text-[13px] font-bold uppercase mb-2" style={{ color: "var(--amber)" }}>Technology Landscape</div>
            <div className="space-y-1">{techSystems.filter(s => s.status === "Invest").slice(0, 4).map(s => <div key={s.id} className="text-[12px]"><strong>{s.name}</strong> <span className="text-[var(--text-muted)]">({s.category})</span></div>)}{techSystems.filter(s => s.status === "Retire").length > 0 && <div className="text-[12px] text-[var(--risk)]">{techSystems.filter(s => s.status === "Retire").length} systems to retire</div>}</div>
          </div>
          {/* 6. Governance */}
          <div className="rounded-xl border-l-4 border border-[var(--border)] bg-[var(--surface-2)] p-4" style={{ borderLeftColor: "var(--amber)" }}>
            <div className="text-[13px] font-bold uppercase mb-2" style={{ color: "var(--amber)" }}>Governance</div>
            <div className="text-[12px]"><strong>{govDecisions.length}</strong> decisions catalogued</div>
            <div className="text-[12px]"><strong>{govForums.length}</strong> governance forums</div>
            <div className="text-[12px]">{govDecisions.filter(d => d.clarity === "Undefined").length > 0 ? <span className="text-[var(--risk)]">{govDecisions.filter(d => d.clarity === "Undefined").length} decisions lack clarity</span> : <span className="text-[var(--success)]">All decisions have clear owners</span>}</div>
          </div>
          {/* 7. Organization */}
          <div className="rounded-xl border-l-4 border border-[var(--border)] bg-[var(--surface-2)] p-4" style={{ borderLeftColor: "var(--purple)" }}>
            <div className="text-[13px] font-bold uppercase mb-2" style={{ color: "var(--purple)" }}>Organization</div>
            <div className="text-[12px]">Archetype: <strong>{archD.label}</strong></div>
            <div className="text-[12px]">Model: <strong>{opModel.replace("_", " ")}</strong> · {gov} governance</div>
            {(() => { const gaps = CULTURE_DIMS.filter(d => cultureCurrent[d.id] && cultureTarget[d.id] && Math.abs(cultureTarget[d.id] - cultureCurrent[d.id]) >= 2); return gaps.length > 0 ? <div className="text-[12px] text-[var(--warning)]">{gaps.length} culture gap{gaps.length > 1 ? "s" : ""} to close</div> : null; })()}
          </div>
          {/* 8. Financials */}
          <div className="rounded-xl border-l-4 border border-[var(--border)] bg-[var(--surface-2)] p-4" style={{ borderLeftColor: "#8ba87a" }}>
            <div className="text-[13px] font-bold uppercase mb-2" style={{ color: "#8ba87a" }}>Financials</div>
            {(() => { const curT = FIN_FUNCS.reduce((s, f) => { const c = finCosts[f]; return s + (c?.people||0) + (c?.technology||0) + (c?.outsourcing||0) + (c?.facilities||0); }, 0); const tgtT = FIN_FUNCS.reduce((s, f) => { const c = finCosts[f]; return s + (c?.peopleTgt||0) + (c?.technologyTgt||0) + (c?.outsourcingTgt||0) + (c?.facilitiesTgt||0); }, 0); const d = tgtT - curT; return <><div className="text-[12px]">Current: <strong>${fmtK(curT)}</strong>/yr</div><div className="text-[12px]">Target: <strong>${fmtK(tgtT)}</strong>/yr</div>{d !== 0 && <div className="text-[12px] font-bold" style={{ color: d < 0 ? "#8ba87a" : "#e87a5d" }}>{d < 0 ? "Saves" : "Costs"} ${fmtK(Math.abs(d))}/yr</div>}</>; })()}
          </div>
          {/* 9. Implementation */}
          <div className="rounded-xl border-l-4 border border-[var(--border)] bg-[var(--surface-2)] p-4" style={{ borderLeftColor: "#8ba87a" }}>
            <div className="text-[13px] font-bold uppercase mb-2" style={{ color: "#8ba87a" }}>Implementation</div>
            {[0,1,2,3].map(w => { const c = transChanges.filter(ch => ch.wave === w).length; return c > 0 ? <div key={w} className="text-[12px]">{TRANS_WAVE_LABELS[w].split("(")[0]}: <strong>{c} changes</strong></div> : null; })}
            {(() => { const approved = transStakeholders.filter(s => s.status === "Approved").length; return <div className="text-[12px] mt-1">Sign-off: <strong>{approved}/{transStakeholders.length}</strong> approved</div>; })()}
          </div>
          {/* 10. KPIs */}
          <div className="col-span-3 rounded-xl border-l-4 border border-[var(--border)] bg-[var(--surface-2)] p-4" style={{ borderLeftColor: "#8ba87a" }}>
            <div className="text-[13px] font-bold uppercase mb-2" style={{ color: "#8ba87a" }}>Key Performance Indicators</div>
            <div className="grid grid-cols-4 gap-2">{perfKpis.slice(0, 8).map(k => { const ragC: Record<string, string> = { Red: "#e87a5d", Amber: "#f4a83a", Green: "#8ba87a" }; return <div key={k.id} className="flex items-center gap-2 text-[12px]"><span className="w-2 h-2 rounded-full shrink-0" style={{ background: ragC[k.status] }} /><span className="truncate">{k.name}: <strong>{k.current}</strong> → {k.target}</span></div>; })}</div>
          </div>
        </div>
      </div>
    </div>}

    {/* ═══ MAIN LAYOUT: Step Navigator (left) + Content (right) ═══ */}
    <div className="flex gap-5">
      {/* ── LEFT: Step Navigator ── */}
      <div className="shrink-0 sticky top-4 self-start space-y-1 max-h-[calc(100vh-120px)] overflow-y-auto pr-1" style={{ width: "clamp(200px, 16vw, 240px)" }}>
        {/* Industry Setup */}
        <button onClick={() => setOmView("setup")} className="w-full text-left px-3 py-2 rounded-lg text-[13px] font-semibold transition-all mb-2" style={{ background: omView === "setup" ? "rgba(244,168,58,0.08)" : "#1e2030", color: omView === "setup" ? "var(--amber)" : "#8a7f6d", border: omView === "setup" ? "1px solid rgba(244,168,58,0.3)" : "1px solid var(--border)", borderLeft: omView === "setup" ? "3px solid var(--amber)" : undefined }}>
          <div>⚙️ Industry Setup <span className="text-[10px] text-[var(--text-muted)]">~10 min</span></div>
          <div className="text-[11px] text-[var(--text-muted)] font-normal mt-0.5">Function, archetype & model selection</div>
        </button>
        {OM_PHASES.map(phase => {
          const phaseComplete = phase.steps.every(s => stepComplete(s.id));
          const phaseStarted = phase.steps.some(s => stepComplete(s.id) || stepInProgress(s.id));
          return <div key={phase.id} className="mb-1">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: `${phase.color}08` }}>
              <span className="text-[14px]">{phase.icon}</span>
              <span className="text-[13px] font-bold uppercase tracking-wider" style={{ color: phase.color }}>{phase.label}</span>
              {phaseComplete && <span className="text-[11px] ml-auto text-[var(--success)]">✓</span>}
              {!phaseComplete && phaseStarted && <span className="text-[11px] ml-auto" style={{ color: phase.color }}>…</span>}
            </div>
            <div className="ml-2 border-l-2 border-[var(--border)] pl-2 space-y-0.5 mt-1 mb-2">
              {phase.steps.map(step => {
                const isActive = omView === step.id;
                const complete = stepComplete(step.id);
                const inProg = stepInProgress(step.id);
                const stepTime = (step.id === "3.2" || step.id === "4.1") ? "~15 min" : "~10 min";
                return <button key={step.id} onClick={() => setOmView(step.id)} className="w-full text-left px-2.5 py-2 rounded-lg transition-all group" style={{
                  background: isActive ? "rgba(244,168,58,0.08)" : "transparent",
                  border: isActive ? "1px solid rgba(244,168,58,0.3)" : "1px solid transparent",
                  borderLeft: isActive ? "3px solid var(--amber)" : "3px solid transparent",
                }}>
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] shrink-0" style={{ color: complete ? "#8ba87a" : inProg ? phase.color : "#8a7f6d" }}>{complete ? "🟢" : inProg ? "🟡" : "⚪"}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-[13px] font-semibold truncate" style={{ color: isActive ? "var(--amber)" : "var(--text-primary)" }}>{step.id} {step.label}</span>
                        <span className="text-[10px] text-[var(--text-muted)] shrink-0">{stepTime}</span>
                      </div>
                      <div className="text-[11px] text-[var(--text-muted)] truncate">{step.desc}</div>
                    </div>
                  </div>
                </button>;
              })}
            </div>
          </div>;
        })}
        <div style={{ height: 1, background: "var(--border)", margin: "8px 0" }} />
        <button onClick={() => setOmView("ledger")} style={{ width: "100%", textAlign: "left", padding: "8px 12px", borderRadius: 8, cursor: "pointer", background: omView === "ledger" ? "rgba(244,168,58,0.08)" : "transparent", border: omView === "ledger" ? "none" : "none", borderLeft: omView === "ledger" ? "3px solid var(--amber)" : "3px solid transparent", transition: "all 0.15s" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: omView === "ledger" ? "var(--amber)" : "var(--text-secondary)" }}>Decisions Ledger</div>
          <div style={{ fontSize: 11, color: "#8a7f6d", marginTop: 2 }}>Your operating model in your own words</div>
        </button>
      </div>

      {/* ── RIGHT: Content Area ── */}
      <div className="flex-1 min-w-0">
        {/* Strategy context banner — shows on non-strategy steps */}
        {!omView.startsWith("1.") && omView !== "setup" && stratPriorities.length > 0 && <div className="rounded-xl bg-[rgba(244,168,58,0.05)] border border-[rgba(244,168,58,0.15)] px-4 py-2 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[14px]"><span>🎯</span><span style={{ color: "#f4a83a" }}>{stratPrioritySummary}</span></div>
          <button onClick={() => setOmView("1.1")} className="text-[12px] text-[var(--text-muted)] hover:text-[var(--accent-primary)]">Edit</button>
        </div>}

        {/* Golden Thread — narrative context from prior choices */}
        {(() => {
          const parts: string[] = [];
          if (stratPriorities.length > 0) parts.push(`prioritizing ${stratPriorities.map(id => STRAT_PRIORITIES_ALL.find(p => p.id === id)?.label || id).join(", ")}`);
          if (arch !== "functional") parts.push(`using a ${OM_ARCHETYPES[arch]?.label || arch} archetype`);
          if (opModel !== "centralized") parts.push(`with ${opModel.replace("_", "-")} operations`);
          if (gov !== "balanced") parts.push(`under ${gov} governance`);
          const princParts: string[] = [];
          if ((stratDesignPrinciples.centralize?.value ?? 50) > 65) princParts.push("centralized");
          else if ((stratDesignPrinciples.centralize?.value ?? 50) < 35) princParts.push("decentralized");
          if ((stratDesignPrinciples.standardize?.value ?? 50) > 65) princParts.push("standardized");
          if (princParts.length) parts.push(`leaning ${princParts.join(" and ")}`);
          if (parts.length === 0) return null;
          return <div style={{ padding: "8px 16px", marginBottom: 16, background: "rgba(244,168,58,0.04)", border: "1px solid rgba(244,168,58,0.1)", borderRadius: 8, fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--amber)", marginRight: 8 }}>Your Golden Thread</span>
            You are building an operating model {parts.join(", ")}.
          </div>;
        })()}

        {/* ── SETUP: Industry Configurator ── */}
        {omView === "setup" && <div className="animate-tab-enter space-y-5">
          <Card title="Industry Setup — Pre-populate Your Operating Model">
            <div className="text-[15px] text-[var(--text-secondary)] mb-4">Select your industry to pre-populate capabilities, processes, and benchmarks. You can customize everything afterward.</div>
            {/* Company sandbox */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 mb-4">
              <div className="text-[14px] font-bold text-[var(--text-primary)] mb-2">Quick Start — Load a Company Template</div>
              <div className="flex gap-2 flex-wrap mb-3">{Object.entries({...OM_COMPANIES,...aiCompanies}).map(([k,c]) => { const co = c as Record<string,string>; return <button key={k} onClick={() => seedCompanySandbox(k, co)} disabled={sandboxLoading===k} className="px-3 py-1.5 rounded-lg text-[14px] font-semibold transition-all" style={{ background: sandboxLoading===k ? "rgba(224,144,64,0.2)" : "#1e2030", color: sandboxLoading===k ? "#f4a83a" : "#8a7f6d", border: "1px solid var(--border)" }}>{sandboxLoading===k ? "⏳ " : ""}{co.name||k}</button>; })}</div>
              <div className="flex gap-2"><input value={aiCompanyInput} onChange={e => setAiCompanyInput(e.target.value)} placeholder="Or type any company name..." className="flex-1 bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" onKeyDown={e => { if (e.key==="Enter") generateCompanyModel(); }} /><button onClick={generateCompanyModel} disabled={aiCompanyGenerating} className="px-4 py-2 rounded-lg text-[14px] font-semibold text-white" style={{ background: "linear-gradient(135deg, var(--accent-primary), var(--teal))" }}>{aiCompanyGenerating ? "..." : "☕ Generate"}</button></div>
            </div>
            {/* Starter Templates */}
            <div className="mb-4">
              <button onClick={() => setShowTemplates(!showTemplates)} style={{ padding: "7px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: "rgba(244,168,58,0.1)", color: "var(--amber)", border: "1px solid rgba(244,168,58,0.2)", cursor: "pointer" }}>Use a Starter Template</button>
              {showTemplates && <div style={{ marginTop: 8, padding: 12, background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.2)" }}>
                <div style={{ fontSize: 11, color: "#8a7f6d", marginBottom: 8 }}>Templates pre-fill the first 5 steps based on industry patterns. Adjust to match your organization.</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {STARTER_TEMPLATES.map(t => <button key={t.id} onClick={() => { setArch(t.arch); setOpModel(t.opModel); setGov(t.gov); setStratPriorities(t.priorities); setShowTemplates(false); showToast(`Template applied: ${t.label}`); }} style={{ padding: "10px 14px", borderRadius: 8, background: "#1e2030", border: "1px solid var(--border)", cursor: "pointer", textAlign: "left" as const }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{t.label}</div>
                    <div style={{ fontSize: 11, color: "#8a7f6d", marginTop: 2 }}>{t.desc}</div>
                  </button>)}
                </div>
              </div>}
            </div>
            {/* Architecture presets */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div><div className="text-[13px] font-bold text-[var(--text-muted)] uppercase mb-2">Archetype</div><div className="space-y-1">{Object.entries(OM_ARCHETYPES).map(([k,v]) => <button key={k} onClick={() => setArch(k)} className="w-full text-left px-3 py-1.5 rounded-lg text-[14px] transition-all" style={{ background: arch===k ? "rgba(167,139,184,0.1)" : "transparent", border: arch===k ? "1px solid var(--purple)" : "1px solid transparent", color: arch===k ? "var(--purple)" : "#8a7f6d" }}>{v.label}</button>)}</div></div>
              <div><div className="text-[13px] font-bold text-[var(--text-muted)] uppercase mb-2">Operating Model</div><div className="space-y-1">{["centralized","decentralized","federated","hub_spoke"].map(m => <button key={m} onClick={() => setOpModel(m)} className="w-full text-left px-3 py-1.5 rounded-lg text-[14px] transition-all" style={{ background: opModel===m ? "rgba(139,168,122,0.1)" : "transparent", border: opModel===m ? "1px solid var(--success)" : "1px solid transparent", color: opModel===m ? "#8ba87a" : "#8a7f6d" }}>{m.replace("_"," ")}</button>)}</div></div>
              <div><div className="text-[13px] font-bold text-[var(--text-muted)] uppercase mb-2">Governance Style</div><div className="space-y-1">{["tight","balanced","light"].map(g => <button key={g} onClick={() => setGov(g)} className="w-full text-left px-3 py-1.5 rounded-lg text-[14px] transition-all" style={{ background: gov===g ? "rgba(244,168,58,0.1)" : "transparent", border: gov===g ? "1px solid var(--warning)" : "1px solid transparent", color: gov===g ? "#f4a83a" : "#8a7f6d" }}>{g}</button>)}</div>
                <button onClick={async () => { setAiOmLoading(true); try { const r = await callAI("Return ONLY valid JSON.", `For ${fnD.label}, recommend: {"archetype":"functional|divisional|matrix|platform|network","opModel":"centralized|decentralized|federated|hub_spoke","governance":"tight|balanced|light","reasoning":"2 sentences"}`); const p = JSON.parse(r.replace(/```json\n?/g,"").replace(/```\n?/g,"").trim()); if (p.archetype) setArch(p.archetype); if (p.opModel) setOpModel(p.opModel); if (p.governance) setGov(p.governance); setAiOmReasoning(p.reasoning||""); } catch (e) { console.error("[DesignModule] AI OM recommend error", e); } setAiOmLoading(false); }} disabled={aiOmLoading} className="w-full mt-2 px-3 py-1.5 rounded-lg text-[13px] font-semibold text-white" style={{ background: "linear-gradient(135deg, var(--accent-primary), var(--teal))", opacity: aiOmLoading ? 0.5 : 1 }}>{aiOmLoading ? "..." : "☕ AI Recommend"}</button>
                {aiOmReasoning && <div className="text-[13px] text-[var(--text-secondary)] bg-[var(--bg)] rounded-lg p-2 mt-2">{aiOmReasoning}</div>}
              </div>
            </div>
            <button onClick={() => setOmView("1.1")} className="w-full px-4 py-3 rounded-xl text-[15px] font-semibold text-white" style={{ background: "linear-gradient(135deg, var(--accent-primary), var(--teal))" }}>Begin Building Your Operating Model →</button>
          </Card>
        </div>}

        {/* ═══ PHASE 1: STRATEGIC INTENT ═══ */}

        {/* ── Step 1.1: Strategic Priorities ── */}
        {omView === "1.1" && <div className="animate-tab-enter space-y-5">

          {/* ─── 1. STRATEGIC PRIORITIES ─── */}
          <Card title="Strategic Priorities — Select & Rank Your Top 3">
            <div className="text-[15px] text-[var(--text-secondary)] mb-4">Choose your organization{"'"}s top 3 strategic priorities and rank them. These priorities anchor every recommendation across the operating model.</div>
            <div style={{ display: "flex", gap: 12, padding: "12px 16px", marginBottom: 16, background: "rgba(244,168,58,0.06)", border: "1px solid rgba(244,168,58,0.15)", borderLeft: "3px solid var(--amber)", borderRadius: 12 }}>
              <span style={{ fontSize: 15, flexShrink: 0 }}>ℹ</span>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>Your top 3 priorities become the lens through which every operating model decision is evaluated. Most Fortune 500 organizations pick 2-3 from: Cost Optimization, Digital Transformation, and Operational Excellence. Consumer-facing companies often add Customer Experience. Choose based on what your board and CEO talk about most.</div>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {STRAT_PRIORITIES_ALL.map(p => {
                const rank = stratPriorities.indexOf(p.id);
                const isSelected = rank >= 0;
                const isFull = stratPriorities.length >= 3;
                const rankColors = ["var(--amber)", "var(--amber)", "var(--amber)"];
                return <button key={p.id} onClick={() => {
                  setStratPriorities(prev => {
                    if (isSelected) return prev.filter(x => x !== p.id);
                    if (prev.length >= 3) return prev;
                    return [...prev, p.id];
                  });
                }} className="relative rounded-xl p-4 text-left transition-all hover:-translate-y-0.5" style={{
                  background: isSelected ? `rgba(244,168,58,0.08)` : "#1e2030",
                  border: isSelected ? `2px solid var(--amber)` : "1px solid var(--border)",
                  opacity: !isSelected && isFull ? 0.7 : 1,
                }}>
                  {isSelected && <div className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center text-[15px] font-extrabold text-white" style={{ background: "var(--amber)" }}>{rank + 1}</div>}
                  <div className="text-2xl mb-2">{p.icon}</div>
                  <div className="text-[15px] font-bold" style={{ color: isSelected ? "var(--amber)" : "var(--text-primary)" }}>{p.label}</div>
                  <div className="text-[13px] text-[var(--text-muted)] mt-1 leading-snug">{p.desc}</div>
                  {PRIORITY_WHY[p.id] && <div className="text-[12px] mt-1.5 leading-snug" style={{ color: "#8a7f6d", fontStyle: "italic", opacity: 0.8 }}>{PRIORITY_WHY[p.id]}</div>}
                </button>;
              })}
            </div>
            {stratPriorities.length > 0 && <div className="mt-4 flex items-center gap-3">
              <div className="flex items-center gap-2">
                {stratPriorities.map((id, i) => {
                  const p = STRAT_PRIORITIES_ALL.find(x => x.id === id);
                  return <React.Fragment key={id}>
                    {i > 0 && <span className="text-[var(--text-muted)]">→</span>}
                    <span className="px-3 py-1.5 rounded-lg text-[15px] font-bold" style={{ background: ["#f4a83a","var(--teal)","var(--teal)"][i] + "18", color: ["#f4a83a","var(--teal)","var(--teal)"][i] }}>#{i+1} {p?.icon} {p?.label}</span>
                  </React.Fragment>;
                })}
              </div>
              <button onClick={() => setStratPriorities([])} className="ml-auto text-[13px] text-[var(--text-muted)] hover:text-[var(--risk)]">Revert Changes</button>
            </div>}
            {stratPriorities.length > 0 && <div className="mt-3 rounded-lg bg-[rgba(244,168,58,0.06)] border border-[rgba(244,168,58,0.15)] px-4 py-3 text-[15px]" style={{ color: "#f4a83a" }}>
              {stratPrioritySummary}
            </div>}
            {stratPriorities.length > 1 && <div className="mt-2 text-[14px] text-[var(--text-muted)]">Drag to re-order: {stratPriorities.map((id, i) => {
              const p = STRAT_PRIORITIES_ALL.find(x => x.id === id);
              return <button key={id} className="inline-flex items-center gap-1 mx-1 px-2 py-0.5 rounded bg-[var(--surface-2)] hover:bg-[var(--bg)] transition-all" onClick={() => {
                setStratPriorities(prev => {
                  const arr = [...prev];
                  if (i === 0) { const [item] = arr.splice(i, 1); arr.push(item); }
                  else { [arr[i-1], arr[i]] = [arr[i], arr[i-1]]; }
                  return arr;
                });
              }}><span className="text-[14px]">{i > 0 ? "↑" : "↓"}</span> {p?.icon} {p?.label}</button>;
            })}</div>}
            {stratPriorities.length >= 2 && <div style={{ marginTop: 16, padding: "16px 20px", background: "rgba(244,168,58,0.04)", border: "1px solid rgba(244,168,58,0.12)", borderRadius: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--amber)", marginBottom: 8 }}>Downstream Impact Preview</div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 12 }}>Because you prioritized {stratPriorities.map(id => STRAT_PRIORITIES_ALL.find(p => p.id === id)?.label).filter(Boolean).join(", ")}:</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {stratPriorities.includes("cost") && <button onClick={() => setOmView("2.2")} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 8, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", cursor: "pointer", fontSize: 12, color: "var(--text-secondary)", textAlign: "left" as const }}>{"\u2192"} Step 2.2 Service Delivery will lean toward shared services and outsourcing</button>}
                {stratPriorities.includes("ops") && <button onClick={() => setOmView("2.3")} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 8, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", cursor: "pointer", fontSize: 12, color: "var(--text-secondary)", textAlign: "left" as const }}>{"\u2192"} Step 2.3 Process Architecture will emphasize standardization and automation</button>}
                {stratPriorities.includes("digital") && <button onClick={() => setOmView("setup")} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 8, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", cursor: "pointer", fontSize: 12, color: "var(--text-secondary)", textAlign: "left" as const }}>{"\u2192"} Architecture will favor platform-based models with API-first design</button>}
                {stratPriorities.includes("innovation") && <button onClick={() => setOmView("setup")} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 8, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", cursor: "pointer", fontSize: 12, color: "var(--text-secondary)", textAlign: "left" as const }}>{"\u2192"} Organization will favor network/squad structures with lighter governance</button>}
                {stratPriorities.includes("risk") && <button onClick={() => setOmView("3.2")} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 8, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", cursor: "pointer", fontSize: 12, color: "var(--text-secondary)", textAlign: "left" as const }}>{"\u2192"} Governance will emphasize three-lines-of-defense and tight controls</button>}
                {stratPriorities.includes("cx") && <button onClick={() => setOmView("setup")} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 8, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", cursor: "pointer", fontSize: 12, color: "var(--text-secondary)", textAlign: "left" as const }}>{"\u2192"} Organization will favor customer-journey-based team structures</button>}
                {stratPriorities.includes("revenue") && <button onClick={() => setOmView("4.1")} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 8, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", cursor: "pointer", fontSize: 12, color: "var(--text-secondary)", textAlign: "left" as const }}>{"\u2192"} Financial Model will target revenue-enabling investments over cost cuts</button>}
                {stratPriorities.includes("talent") && <button onClick={() => setOmView("3.2")} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 8, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", cursor: "pointer", fontSize: 12, color: "var(--text-secondary)", textAlign: "left" as const }}>{"\u2192"} Organization & Culture will emphasize L&D investment and flatter structures</button>}
              </div>
            </div>}
          </Card>

          {/* ─── 2. DESIGN PRINCIPLES ─── */}
          <Card title="Design Principles — Define Your Operating Model Rules">
            <div className="text-[15px] text-[var(--text-secondary)] mb-4">Set the design principles that will guide all operating model decisions. These become rules that constrain recommendations.</div>
            <div className="space-y-5">
              {[
                { key: "centralize", left: "Decentralize", right: "Centralize", leftIcon: "🌐", rightIcon: "🏢", leftDesc: "Functions operate independently with local autonomy", rightDesc: "Functions consolidated into shared centers" },
                { key: "standardize", left: "Customize", right: "Standardize", leftIcon: "🎨", rightIcon: "📏", leftDesc: "Tailored processes per business unit / region", rightDesc: "Uniform processes and policies across the org" },
                { key: "buildBuy", left: "Build In-House", right: "Buy / Partner", leftIcon: "🔨", rightIcon: "🤝", leftDesc: "Develop capabilities internally", rightDesc: "Acquire or outsource capabilities" },
                { key: "controlSpeed", left: "Speed", right: "Control", leftIcon: "⚡", rightIcon: "🔒", leftDesc: "Minimize approvals, empower teams", rightDesc: "Rigorous governance and oversight" },
                { key: "specialistGen", left: "Generalist", right: "Specialist", leftIcon: "🔄", rightIcon: "🎯", leftDesc: "Broad roles, cross-functional flexibility", rightDesc: "Deep expertise, narrow focus" },
              ].map(p => {
                const val = stratDesignPrinciples[p.key]?.value ?? 50;
                const rationale = stratDesignPrinciples[p.key]?.rationale ?? "";
                const setVal = (v: number) => setStratDesignPrinciples(prev => ({ ...prev, [p.key]: { ...prev[p.key], value: v, rationale: prev[p.key]?.rationale || "" } }));
                const setRat = (r: string) => setStratDesignPrinciples(prev => ({ ...prev, [p.key]: { ...prev[p.key], rationale: r, value: prev[p.key]?.value ?? 50 } }));
                const leanLabel = val < 35 ? p.left : val > 65 ? p.right : "Balanced";
                const leanColor = val < 35 ? "var(--purple)" : val > 65 ? "#f4a83a" : "#8a7f6d";
                const sliderDescs: Record<string, string[]> = {
                  centralize: [
                    "Each business unit operates independently with full local autonomy. Highest agility, lowest consistency.",
                    "Business units have significant autonomy within a loose central framework.",
                    "A mix of central guidance and local autonomy. Most common for federated organizations.",
                    "Central team sets most standards; local teams execute with some flexibility.",
                    "All decisions and operations consolidated. Highest consistency, lowest agility.",
                  ],
                  standardize: [
                    "Every team customizes processes for local needs. Maximum flexibility, minimal reuse.",
                    "Local teams lead with some shared templates and guidelines.",
                    "Core processes standardized, edge cases customized. Balance of efficiency and fit.",
                    "Strong global standards with limited local exceptions.",
                    "One way of doing things everywhere. Maximum efficiency, minimum local flexibility.",
                  ],
                  buildBuy: [
                    "Everything built internally. Maximum control, highest cost and time investment.",
                    "Mostly in-house with selective partnerships for non-core needs.",
                    "Balanced mix of internal capability and external partnerships.",
                    "Strategic partnerships for most capabilities; in-house for differentiators only.",
                    "Fully outsourced / partner-led. Fastest to market, least internal control.",
                  ],
                  controlSpeed: [
                    "Minimal approvals, teams fully empowered. Fastest execution, highest risk tolerance.",
                    "Light governance with post-hoc review. Teams move fast with guardrails.",
                    "Balanced approval process. Key decisions governed, routine work empowered.",
                    "Structured governance with clear escalation paths and checkpoints.",
                    "Rigorous multi-layer approval for all decisions. Lowest risk, slowest execution.",
                  ],
                  specialistGen: [
                    "Broad generalist roles. Maximum flexibility, cross-functional movement encouraged.",
                    "Mostly generalist with some specialist depth in critical areas.",
                    "Balanced: T-shaped professionals with breadth and selective depth.",
                    "Deep specialization expected, with some cross-training opportunities.",
                    "Narrow, deep expertise. Maximum depth, minimum role flexibility.",
                  ],
                };
                const descIdx = val <= 20 ? 0 : val <= 40 ? 1 : val <= 60 ? 2 : val <= 80 ? 3 : 4;
                const sliderDesc = sliderDescs[p.key]?.[descIdx] || "";
                const placeholderMap: Record<string, string> = {
                  centralize: "Example: We centralize back-office functions because scale economies outweigh local customization needs...",
                  standardize: "Example: We standardize core processes to reduce duplication while allowing regional teams to adapt customer-facing workflows...",
                  buildBuy: "Example: We build in-house where it creates competitive advantage and partner for commodity capabilities...",
                  controlSpeed: "Example: We lean toward speed because our market moves fast and first-mover advantage matters more than perfection...",
                  specialistGen: "Example: We favor specialists in technical roles but generalists in leadership to ensure cross-functional thinking...",
                };
                return <div key={p.key} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2"><span className="text-lg">{p.leftIcon}</span><span className="text-[15px] font-bold text-[var(--text-primary)]">{p.left}</span></div>
                    <div className="px-3 py-1 rounded-full text-[14px] font-bold" style={{ background: `${leanColor}15`, color: leanColor }}>{leanLabel}</div>
                    <div className="flex items-center gap-2"><span className="text-[15px] font-bold text-[var(--text-primary)]">{p.right}</span><span className="text-lg">{p.rightIcon}</span></div>
                  </div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-[13px] text-[var(--text-muted)] w-20 text-right shrink-0">{p.leftDesc.split(",")[0]}</span>
                    <input type="range" min={0} max={100} value={val} onChange={e => setVal(Number(e.target.value))}
                      className="flex-1 h-2 rounded-full appearance-none cursor-pointer"
                      style={{ background: `linear-gradient(to right, "var(--purple)" 0%, "#8a7f6d" 50%, "#f4a83a" 100%)` }} />
                    <span className="text-[13px] text-[var(--text-muted)] w-20 shrink-0">{p.rightDesc.split(",")[0]}</span>
                  </div>
                  {sliderDesc && <div className="text-[12px] text-[var(--text-muted)] mb-2 px-1 leading-relaxed italic">{sliderDesc}</div>}
                  <div className="text-[11px] mb-2 px-1" style={{ color: "rgba(34,197,94,0.7)" }}>Most commonly chosen: Balanced (67% of orgs)</div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[13px] font-semibold text-[var(--text-secondary)]">WHY THIS CHOICE?</span>
                    {rationale.trim().length > 0 && <span style={{ color: "var(--sage)", fontSize: 14 }}>&#10003;</span>}
                  </div>
                  <input type="text" value={rationale} onChange={e => setRat(e.target.value)}
                    placeholder={placeholderMap[p.key] || `Example: We ${p.right.toLowerCase()} because...`}
                    className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none mt-1" />
                  {p.key === "centralize" && <details style={{ marginTop: 8, marginBottom: 16 }}>
                    <summary style={{ fontSize: 12, color: "var(--amber)", cursor: "pointer", fontWeight: 600, userSelect: "none" }}>Deep Thinking — 3 min read</summary>
                    <div style={{ padding: "12px 16px", marginTop: 8, background: "rgba(96,165,250,0.04)", border: "1px solid rgba(96,165,250,0.1)", borderRadius: 12, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.8 }}>
                      <p style={{ marginBottom: 12 }}>The centralization question is the oldest debate in organizational design. It&apos;s rarely binary. The real question is: which capabilities benefit from scale (centralize), and which benefit from proximity to the customer (decentralize)?</p>
                      <p style={{ marginBottom: 12 }}>The failure mode most organizations make is symmetry — applying the same answer to every function. Finance often centralizes well. Sales rarely does. Technology splits along a seam: infrastructure central, product engineering distributed.</p>
                      <p style={{ marginBottom: 0 }}>The strongest models explicitly define this disaggregation rather than picking one global answer. Ask yourself: &quot;For each of our 8-10 major capabilities, where does value come from — scale or proximity?&quot; The answer is your centralization blueprint.</p>
                    </div>
                  </details>}
                  {p.key === "standardize" && <details style={{ marginTop: 8, marginBottom: 16 }}>
                    <summary style={{ fontSize: 12, color: "var(--amber)", cursor: "pointer", fontWeight: 600, userSelect: "none" }}>Deep Thinking — 2 min read</summary>
                    <div style={{ padding: "12px 16px", marginTop: 8, background: "rgba(96,165,250,0.04)", border: "1px solid rgba(96,165,250,0.1)", borderRadius: 12, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.8 }}>
                      <p style={{ marginBottom: 12 }}>Standardization is about trading local optimization for global efficiency. The insight most organizations miss: you don&apos;t standardize processes — you standardize outcomes. The best-performing organizations define &quot;what good looks like&quot; centrally, but let local teams find their own path to get there.</p>
                      <p style={{ marginBottom: 0 }}>A useful heuristic: standardize anything a customer never sees (back-office, compliance, reporting), customize anything they do see (product, service delivery, pricing). This gives you efficiency where it matters and differentiation where it counts.</p>
                    </div>
                  </details>}
                </div>;
              })}
            </div>
          </Card>

          {/* ─── 3. STRATEGY-TO-CAPABILITY MAPPING ─── */}
          {stratPriorities.length > 0 && <Card title="Strategy-to-Capability Mapping">
            <div className="text-[15px] text-[var(--text-secondary)] mb-4">Map how each capability supports your strategic priorities. Capabilities critical to multiple priorities are strategic differentiators.</div>
            {(() => {
              const levels = ["Critical", "Important", "Supporting", "Not Required"] as const;
              const levelColors: Record<string, string> = { Critical: "#e87a5d", Important: "#f4a83a", Supporting: "#8a7f6d", "Not Required": "#5a5245" };
              // Count criticals per capability
              const criticalCounts: Record<string, number> = {};
              const anyLink: Record<string, boolean> = {};
              stratCapabilities.forEach(cap => {
                let cc = 0; let linked = false;
                stratPriorities.forEach(pri => {
                  const val = stratCapMatrix[`${pri}__${cap}`];
                  if (val === "Critical") cc++;
                  if (val && val !== "Not Required") linked = true;
                });
                criticalCounts[cap] = cc;
                anyLink[cap] = linked;
              });
              const differentiators = stratCapabilities.filter(c => criticalCounts[c] >= 2);
              const outsourceCandidates = stratCapabilities.filter(c => !anyLink[c] && stratPriorities.length >= 2);
              return <>
                {/* Summary badges */}
                {(differentiators.length > 0 || outsourceCandidates.length > 0) && <div className="flex flex-wrap gap-3 mb-4">
                  {differentiators.length > 0 && <div className="rounded-xl bg-[rgba(232,122,93,0.06)] border border-[rgba(232,122,93,0.2)] px-4 py-2">
                    <div className="text-[14px] font-bold text-[var(--risk)] uppercase mb-1">Strategic Differentiators</div>
                    <div className="flex flex-wrap gap-1">{differentiators.map(c => <span key={c} className="px-2 py-0.5 rounded-full text-[13px] font-semibold bg-[rgba(232,122,93,0.1)] text-[var(--risk)]">{c}</span>)}</div>
                  </div>}
                  {outsourceCandidates.length > 0 && <div className="rounded-xl bg-[var(--surface-2)] border border-[var(--border)] px-4 py-2">
                    <div className="text-[13px] font-semibold text-[var(--text-muted)] uppercase mb-1">Outsource / Simplify Candidates</div>
                    <div className="flex flex-wrap gap-1">{outsourceCandidates.map(c => <span key={c} className="px-2 py-0.5 rounded-full text-[13px] text-[var(--text-muted)] bg-[var(--bg)]">{c}</span>)}</div>
                  </div>}
                </div>}
                {/* Matrix */}
                <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
                  <table className="w-full"><thead><tr className="bg-[var(--surface-2)]">
                    <th className="px-3 py-2 text-left text-[14px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)] sticky left-0 bg-[var(--surface-2)] z-10 min-w-[160px]">Capability</th>
                    {stratPriorities.map((pri, i) => {
                      const p = STRAT_PRIORITIES_ALL.find(x => x.id === pri);
                      return <th key={pri} className="px-2 py-2 text-center text-[14px] font-semibold border-b border-[var(--border)] min-w-[100px]" style={{ color: ["#f4a83a","var(--teal)","var(--teal)"][i] }}>{p?.icon} {p?.label}</th>;
                    })}
                    <th className="px-2 py-2 text-center text-[14px] font-semibold text-[var(--text-muted)] border-b border-[var(--border)]">Score</th>
                  </tr></thead>
                  <tbody>{stratCapabilities.map(cap => {
                    const score = stratPriorities.reduce((s, pri) => {
                      const v = stratCapMatrix[`${pri}__${cap}`];
                      return s + (v === "Critical" ? 3 : v === "Important" ? 2 : v === "Supporting" ? 1 : 0);
                    }, 0);
                    return <tr key={cap} className="border-b border-[var(--border)] hover:bg-[var(--surface-2)]/50">
                      <td className="px-3 py-2 text-[14px] font-semibold text-[var(--text-primary)] sticky left-0 bg-[var(--bg)] z-10">
                        {cap}
                        {criticalCounts[cap] >= 2 && <span className="ml-1 text-[12px] text-[var(--risk)]" title="Strategic Differentiator">★</span>}
                      </td>
                      {stratPriorities.map(pri => {
                        const val = stratCapMatrix[`${pri}__${cap}`] || "";
                        return <td key={pri} className="px-2 py-2 text-center">
                          <button onClick={() => {
                            const cycle = ["", "Critical", "Important", "Supporting", "Not Required"];
                            const next = cycle[(cycle.indexOf(val) + 1) % cycle.length];
                            setStratCapMatrix(prev => ({ ...prev, [`${pri}__${cap}`]: next }));
                          }} className="px-2 py-0.5 rounded-full text-[13px] font-semibold min-w-[70px] transition-all" style={{
                            background: val ? `${levelColors[val]}12` : "#1e2030",
                            color: val ? levelColors[val] : "#8a7f6d",
                            border: val ? `1px solid ${levelColors[val]}30` : "1px solid var(--border)",
                          }}>{val || "—"}</button>
                        </td>;
                      })}
                      <td className="px-2 py-2 text-center">
                        <span className="text-[14px] font-bold" style={{ color: score >= 6 ? "#e87a5d" : score >= 3 ? "#f4a83a" : "#8a7f6d" }}>{score || "—"}</span>
                      </td>
                    </tr>;
                  })}</tbody></table>
                </div>
                <div className="flex gap-4 mt-2 text-[13px] text-[var(--text-muted)]">
                  {levels.map(l => <span key={l} className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: levelColors[l] }} />{l}</span>)}
                  <span className="flex items-center gap-1"><span className="text-[var(--risk)]">★</span> = Critical to 2+ priorities</span>
                </div>
              </>;
            })()}
          </Card>}

          {/* ─── 4. TARGET STATE VISION ─── */}
          <Card title="Target State Vision">
            <div className="text-[15px] text-[var(--text-secondary)] mb-3">Define your 3-5 sentence target state vision. This appears as context across all operating model tabs.</div>
            <textarea value={stratVision} onChange={e => setStratVision(e.target.value)}
              placeholder="Example: We will be a digitally-enabled, customer-centric organization that leverages AI to automate routine operations while investing in specialist talent for strategic advisory. Our operating model will centralize shared services for efficiency while embedding business partners in each division..."
              className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-4 py-3 text-[15px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none resize-none leading-relaxed"
              rows={4} />
            <div className="flex items-center justify-between mt-3">
              <button onClick={async () => {
                setStratVisionGenerating(true);
                try {
                  const priLabels = stratPriorities.map(id => stratPriorityLabel(id)).join(", ");
                  const principles = Object.entries(stratDesignPrinciples).map(([k, v]) => {
                    const labels: Record<string, [string, string]> = { centralize: ["Decentralize", "Centralize"], standardize: ["Customize", "Standardize"], buildBuy: ["Build", "Buy/Partner"], controlSpeed: ["Speed", "Control"], specialistGen: ["Generalist", "Specialist"] };
                    const [left, right] = labels[k] || [k, k];
                    const lean = v.value < 35 ? left : v.value > 65 ? right : `Balanced ${left}/${right}`;
                    return `${lean}${v.rationale ? ` (${v.rationale})` : ""}`;
                  }).join("; ");
                  const prompt = `Generate a compelling 3-5 sentence target state vision for an organization with these strategic priorities: ${priLabels || "not yet defined"}. Design principles: ${principles}. Function focus: ${fnD.label}. Archetype: ${archD.label}. Operating model: ${opModel.replace("_"," ")}. Write in first-person plural ("We will..."). Be specific and strategic, not generic.`;
                  const result = await callAI("You are a McKinsey-level operating model strategist. Write a concise, powerful target state vision statement.", prompt);
                  setStratVision(result.replace(/```/g, "").replace(/^["']|["']$/g, "").trim());
                } catch { showToast("AI couldn't draft the vision — try again"); }
                setStratVisionGenerating(false);
              }} disabled={stratVisionGenerating} className="px-4 py-2 rounded-xl text-[15px] font-semibold text-white flex items-center gap-2" style={{ background: "linear-gradient(135deg, var(--accent-primary), var(--teal))", opacity: stratVisionGenerating ? 0.5 : 1 }}>
                {stratVisionGenerating ? "Generating..." : "✨ AI Draft Vision"}
              </button>
              <span className="text-[14px] text-[var(--text-muted)]">{stratVision.length > 0 ? `${stratVision.split(/[.!?]+/).filter(Boolean).length} sentences` : "No vision set"}</span>
            </div>
          </Card>

          {/* ─── 5. BUSINESS MODEL CANVAS ─── */}
          <Card title="Business Model Canvas">
            <div className="text-[15px] text-[var(--text-secondary)] mb-4">Define the business model your operating model must support. Click any quadrant to add items.</div>
            <div className="grid grid-cols-2 gap-4">
              {([
                { key: "value_prop", label: "Value Proposition", icon: "💎", color: "#f4a83a", desc: "What value do you deliver to customers?" },
                { key: "key_activities", label: "Key Activities", icon: "⚡", color: "#8ba87a", desc: "What activities are essential to deliver value?" },
                { key: "key_resources", label: "Key Resources", icon: "🏗️", color: "var(--purple)", desc: "What resources and capabilities are critical?" },
                { key: "revenue_cost", label: "Revenue & Cost Structure", icon: "💰", color: "#f4a83a", desc: "How does the org generate revenue and manage costs?" },
              ] as const).map(q => {
                const items = stratBizModel[q.key] || [];
                const isEditing = stratBizEditField === q.key;
                return <div key={q.key} className="rounded-xl border p-4" style={{ background: `${q.color}04`, borderColor: `${q.color}25` }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{q.icon}</span>
                    <span className="text-[15px] font-bold" style={{ color: q.color }}>{q.label}</span>
                  </div>
                  <div className="text-[13px] text-[var(--text-muted)] mb-3">{q.desc}</div>
                  <div className="space-y-1.5 mb-3 min-h-[40px]">
                    {items.map((item, idx) => <div key={idx} className="flex items-center gap-2 group">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: q.color }} />
                      <span className="text-[14px] text-[var(--text-primary)] flex-1">{item}</span>
                      <button onClick={() => setStratBizModel(prev => ({ ...prev, [q.key]: prev[q.key].filter((_, i) => i !== idx) }))}
                        className="text-[14px] text-[var(--text-muted)] opacity-0 group-hover:opacity-100 hover:text-[var(--risk)] transition-all">×</button>
                    </div>)}
                    {items.length === 0 && <div className="text-[14px] text-[var(--text-muted)] italic">No items yet</div>}
                  </div>
                  {isEditing ? <div className="flex gap-2">
                    <input type="text" value={stratBizEditText} onChange={e => setStratBizEditText(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && stratBizEditText.trim()) { setStratBizModel(prev => ({ ...prev, [q.key]: [...(prev[q.key] || []), stratBizEditText.trim()] })); setStratBizEditText(""); } if (e.key === "Escape") { setStratBizEditField(null); setStratBizEditText(""); } }}
                      placeholder="Type and press Enter..."
                      className="flex-1 bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
                      autoFocus />
                    <button onClick={() => { if (stratBizEditText.trim()) { setStratBizModel(prev => ({ ...prev, [q.key]: [...(prev[q.key] || []), stratBizEditText.trim()] })); setStratBizEditText(""); } setStratBizEditField(null); }}
                      className="px-3 py-1.5 rounded-lg text-[14px] font-semibold" style={{ background: `${q.color}15`, color: q.color }}>Add</button>
                  </div> : <button onClick={() => { setStratBizEditField(q.key); setStratBizEditText(""); }}
                    className="w-full px-3 py-1.5 rounded-lg text-[14px] font-semibold text-[var(--text-muted)] border border-dashed border-[var(--border)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-all">+ Add Item</button>}
                </div>;
              })}
            </div>
          </Card>

          {/* Strategy completion status */}
          {(() => {
            const checks = [
              { done: stratPriorities.length >= 1, label: "Strategic priorities selected" },
              { done: Object.values(stratDesignPrinciples).some(v => v.value !== 50), label: "Design principles configured" },
              { done: Object.values(stratCapMatrix).some(v => v && v !== "Not Required"), label: "Capabilities mapped to strategy" },
              { done: stratVision.length > 20, label: "Target state vision defined" },
              { done: Object.values(stratBizModel).some(arr => arr.length > 0), label: "Business model outlined" },
            ];
            const completed = checks.filter(c => c.done).length;
            return <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-[15px] font-bold text-[var(--text-primary)]">Strategy Readiness</div>
                <div className="text-[14px] font-bold" style={{ color: completed >= 4 ? "#8ba87a" : completed >= 2 ? "#f4a83a" : "#8a7f6d" }}>{completed}/5 complete</div>
              </div>
              <div className="h-2 bg-[var(--bg)] rounded-full overflow-hidden mb-3"><div className="h-full rounded-full transition-all" style={{ width: `${(completed / 5) * 100}%`, background: completed >= 4 ? "#8ba87a" : "#f4a83a" }} /></div>
              <div className="grid grid-cols-2 gap-2">
                {checks.map(c => <div key={c.label} className="flex items-center gap-2 text-[14px]">
                  <span style={{ color: c.done ? "#8ba87a" : "#8a7f6d" }}>{c.done ? "✓" : "○"}</span>
                  <span style={{ color: c.done ? "var(--text-primary)" : "#8a7f6d" }}>{c.label}</span>
                </div>)}
              </div>
              {completed >= 3 && <button onClick={() => setOmView("1.2")} className="mt-3 w-full px-4 py-2 rounded-xl text-[15px] font-semibold text-white" style={{ background: "linear-gradient(135deg, var(--accent-primary), var(--teal))" }}>Continue to Step 1.2: Business Model →</button>}
            </div>;
          })()}
        </div>}

        {/* ── Step 1.2: Business Model & Value Chain ── */}
        {omView === "1.2" && <div className="animate-tab-enter space-y-5">
          <Card title="Step 1.2 — Business Model & Value Chain">
            <div className="text-[15px] text-[var(--text-secondary)] mb-4">Define how your organization creates and captures value. This determines where your operating model must excel.</div>
          </Card>
          {/* Reuse business model canvas from strategy state */}
          <Card title="Business Model Canvas">
            <div className="text-[15px] text-[var(--text-secondary)] mb-4">Define the business model your operating model must support. Click any quadrant to add items.</div>
            <div className="grid grid-cols-2 gap-4">
              {([
                { key: "value_prop", label: "Value Proposition", icon: "💎", color: "#f4a83a", desc: "What value do you deliver to customers?" },
                { key: "key_activities", label: "Key Activities", icon: "⚡", color: "#8ba87a", desc: "What activities are essential to deliver value?" },
                { key: "key_resources", label: "Key Resources", icon: "🏗️", color: "var(--purple)", desc: "What resources and capabilities are critical?" },
                { key: "revenue_cost", label: "Revenue & Cost Structure", icon: "💰", color: "#f4a83a", desc: "How does the org generate revenue and manage costs?" },
              ] as const).map(q => {
                const items = stratBizModel[q.key] || [];
                const isEditing = stratBizEditField === q.key;
                return <div key={q.key} className="rounded-xl border p-4" style={{ background: `${q.color}04`, borderColor: `${q.color}25` }}>
                  <div className="flex items-center gap-2 mb-2"><span className="text-lg">{q.icon}</span><span className="text-[15px] font-bold" style={{ color: q.color }}>{q.label}</span></div>
                  <div className="text-[13px] text-[var(--text-muted)] mb-3">{q.desc}</div>
                  <div className="space-y-1.5 mb-3 min-h-[40px]">
                    {items.map((item, idx) => <div key={idx} className="flex items-center gap-2 group"><span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: q.color }} /><span className="text-[14px] text-[var(--text-primary)] flex-1">{item}</span><button onClick={() => setStratBizModel(prev => ({ ...prev, [q.key]: prev[q.key].filter((_, i) => i !== idx) }))} className="text-[14px] text-[var(--text-muted)] opacity-0 group-hover:opacity-100 hover:text-[var(--risk)] transition-all">×</button></div>)}
                    {items.length === 0 && <div className="text-[14px] text-[var(--text-muted)] italic">No items yet</div>}
                  </div>
                  {isEditing ? <div className="flex gap-2"><input type="text" value={stratBizEditText} onChange={e => setStratBizEditText(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && stratBizEditText.trim()) { setStratBizModel(prev => ({ ...prev, [q.key]: [...(prev[q.key] || []), stratBizEditText.trim()] })); setStratBizEditText(""); } if (e.key === "Escape") { setStratBizEditField(null); setStratBizEditText(""); } }} placeholder="Type and press Enter..." className="flex-1 bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none" autoFocus /><button onClick={() => { if (stratBizEditText.trim()) { setStratBizModel(prev => ({ ...prev, [q.key]: [...(prev[q.key] || []), stratBizEditText.trim()] })); setStratBizEditText(""); } setStratBizEditField(null); }} className="px-3 py-1.5 rounded-lg text-[14px] font-semibold" style={{ background: `${q.color}15`, color: q.color }}>Add</button></div> : <button onClick={() => { setStratBizEditField(q.key); setStratBizEditText(""); }} className="w-full px-3 py-1.5 rounded-lg text-[14px] font-semibold text-[var(--text-muted)] border border-dashed border-[var(--border)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-all">+ Add Item</button>}
                </div>;
              })}
            </div>
          </Card>
          {/* Value chain from function */}
          <Card title="Value Chain — Primary Activities">
            <div className="text-[15px] text-[var(--text-secondary)] mb-4">End-to-end value chain showing how {fnD.label} creates and delivers value across lifecycle stages.</div>
            <div className="flex items-stretch gap-0 mb-4 overflow-x-auto">
              {(OM_LIFECYCLES[fn] || ["Plan","Execute","Deliver","Measure","Optimize","Improve"]).map((stage, i, arr) => {
                const ai = getAiTier(stage); const isLast = i === arr.length - 1;
                return <div key={stage} className="flex-1 min-w-[110px] relative">
                  <div className="rounded-xl p-3 bg-[var(--surface-2)] border border-[var(--border)] mx-0.5 h-full">
                    <div className="text-[13px] font-bold text-[var(--text-muted)] uppercase">Stage {i+1}</div>
                    <div className="text-[14px] font-bold text-[var(--text-primary)] mb-1">{stage}</div>
                    <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full" style={{background:ai.color}} /><span className="text-[12px]" style={{color:ai.color}}>{ai.tier}</span></div>
                  </div>
                  {!isLast && <div className="absolute right-[-6px] top-1/2 -translate-y-1/2 z-10 text-[var(--text-muted)] text-[12px]">→</div>}
                </div>;
              })}
            </div>
            <div className="text-[13px] font-bold text-[var(--text-muted)] uppercase mb-2">Support Activities</div>
            <div className="flex gap-2 flex-wrap">{[...fnD.shared, ...fnD.enabling.slice(0,3)].map(s => <span key={s} className="px-2 py-1 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[13px] text-[var(--text-secondary)]">{s}</span>)}</div>
          </Card>
          <button onClick={() => setOmView("2.1")} className="w-full px-4 py-3 rounded-xl text-[15px] font-semibold text-white" style={{ background: "linear-gradient(135deg, var(--amber), var(--amber))" }}>Continue to Step 2.1: Capability Model →</button>
        </div>}

        {/* ── Industry Configurator (accessible from setup) ── */}
        {omView === "setup-cfg" && <div className="animate-tab-enter">
          {/* Industry Selector */}
          <Card title="Step 1 — Select Industries">
            <div className="text-[15px] text-[var(--text-secondary)] mb-3">Select all industries that apply to this organization. Universal functions are always included.</div>
            <div className="flex flex-wrap gap-2">
              {((omTaxonomy as Record<string,unknown>)?.available_industries as {id:string;label:string;icon:string;examples:string;function_count:number;unit_count:number}[] || []).map(ind => {
                const selected = omIndustries.includes(ind.id);
                return <button key={ind.id} onClick={() => setOmIndustries(prev => selected ? prev.filter(i => i !== ind.id) : [...prev, ind.id])}
                  className="px-3 py-2 rounded-xl text-[15px] font-semibold transition-all" style={{
                    border: selected ? "2px solid var(--accent-primary)" : "1px solid var(--border)",
                    background: selected ? "rgba(244,168,58,0.08)" : "transparent",
                    color: selected ? "#f4a83a" : "#8a7f6d",
                  }}>
                  <span className="mr-1">{ind.icon}</span> {ind.label}
                  <span className="ml-1 opacity-50">({ind.unit_count})</span>
                </button>;
              })}
            </div>
            {omIndustries.length > 0 && <div className="mt-2 text-[15px] text-[var(--accent-primary)]">{omIndustries.length} industrie(s) selected</div>}
          </Card>

          {/* Search */}
          <Card title="Step 2 — Browse & Select Operating Units">
            <div className="flex gap-3 mb-4">
              <input value={omSearch} onChange={e => setOmSearch(e.target.value)} placeholder="Search operating units..." className="flex-1 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[15px] text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] placeholder:text-[var(--text-muted)]" />
              <div className="flex items-center gap-2 text-[15px] text-[var(--text-muted)] font-data">
                {(() => { const t = omTaxonomy as Record<string,unknown>; const s = t?.stats as Record<string,number>; return s ? `${omSelectedUnits.length} selected · ${s.total_units || 0} total` : ""; })()}
              </div>
            </div>

            {/* Search results */}
            {omSearchResults.length > 0 && <div className="mb-4 bg-[var(--surface-2)] rounded-xl p-3 border border-[var(--accent-primary)]/20">
              <div className="text-[15px] font-bold text-[var(--accent-primary)] uppercase mb-2">Search Results</div>
              {omSearchResults.map((r: Record<string,unknown>) => {
                const uid = String(r.id);
                const isSelected = omSelectedUnits.includes(uid);
                return <div key={uid} className="flex items-center gap-2 py-1.5 border-b border-[var(--border)] last:border-0">
                  <input type="checkbox" checked={isSelected} onChange={() => setOmSelectedUnits(prev => isSelected ? prev.filter(u => u !== uid) : [...prev, uid])} style={{ accentColor: "#f4a83a" }} />
                  <span className="text-[15px] text-[var(--text-primary)] flex-1">{String(r.name)}</span>
                  <span className="text-[14px] px-1.5 py-0.5 rounded bg-[var(--surface-1)] text-[var(--text-muted)]">{String(r.layer)}</span>
                  <span className="text-[14px] text-[var(--text-muted)]">{String(r.function_label)}</span>
                  <span className="text-[14px] font-data text-[var(--accent-primary)]">{(Number(r.score) * 100).toFixed(0)}%</span>
                </div>;
              })}
            </div>}

            {/* Function tree */}
            {(() => {
              const tax = (omTaxonomy as Record<string,unknown>)?.taxonomy as Record<string,unknown>;
              const funcs = (tax?.functions || {}) as Record<string, {label:string;icon:string;source:string;units:{id:string;name:string;layer:string;source:string}[]}>;
              return <div className="space-y-2">
                {Object.entries(funcs).map(([fid, fdata]) => {
                  const expanded = omExpandedFuncs[fid] !== false; // default expanded
                  const selectedCount = fdata.units.filter(u => omSelectedUnits.includes(u.id)).length;
                  const allSelected = selectedCount === fdata.units.length && fdata.units.length > 0;
                  return <div key={fid} className="bg-[var(--surface-2)] rounded-xl border border-[var(--border)] overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2.5 cursor-pointer hover:bg-[var(--hover)] transition-colors" onClick={() => setOmExpandedFuncs(prev => ({...prev, [fid]: !expanded}))}>
                      <span className="text-[15px]">{fdata.icon}</span>
                      <span className="text-[15px] font-semibold text-[var(--text-primary)] flex-1 font-heading">{fdata.label}</span>
                      <span className="text-[15px] font-data" style={{ color: selectedCount > 0 ? "#f4a83a" : "#8a7f6d" }}>{selectedCount}/{fdata.units.length}</span>
                      <input type="checkbox" checked={allSelected} onChange={() => {
                        const ids = fdata.units.map(u => u.id);
                        setOmSelectedUnits(prev => allSelected ? prev.filter(u => !ids.includes(u)) : [...new Set([...prev, ...ids])]);
                      }} onClick={e => e.stopPropagation()} style={{ accentColor: "#f4a83a" }} />
                      {fdata.source !== "universal" && <span className="text-[15px] px-1.5 py-0.5 rounded-full bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]">Industry</span>}
                      <span className="text-[var(--text-muted)] text-[15px]" style={{ transform: `rotate(${expanded ? 90 : 0}deg)`, transition: "transform 0.2s" }}>▸</span>
                    </div>
                    {expanded && <div className="px-4 pb-3 space-y-1">
                      {fdata.units.map(u => {
                        const isSelected = omSelectedUnits.includes(u.id);
                        const scope = omScopedUnits[u.id] || "in";
                        const displayName = omRenames[u.id] || u.name;
                        const layerColors: Record<string,string> = { "Governance": "#e87a5d", "Core": "#f4a83a", "Shared Services": "#8ba87a", "Enabling": "#f4a83a", "Interface": "#a78bb8" };
                        return <div key={u.id} className="flex items-center gap-2 py-1 group">
                          <input type="checkbox" checked={isSelected} onChange={() => setOmSelectedUnits(prev => isSelected ? prev.filter(x => x !== u.id) : [...prev, u.id])} style={{ accentColor: "#f4a83a" }} />
                          <span className={`text-[15px] flex-1 ${isSelected ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"}`}>{displayName}</span>
                          <span className="text-[15px] px-1.5 py-0.5 rounded font-semibold" style={{ color: layerColors[u.layer] || "#8a7f6d", background: `${layerColors[u.layer] || "#8a7f6d"}15` }}>{u.layer}</span>
                          {isSelected && <button onClick={() => setOmScopedUnits(prev => ({...prev, [u.id]: scope === "in" ? "out" : "in"}))} className="text-[15px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: scope === "in" ? "#8ba87a" : "#8a7f6d", border: `1px solid ${scope === "in" ? "#8ba87a" : "var(--border)"}` }}>{scope === "in" ? "In Scope" : "Out of Scope"}</button>}
                        </div>;
                      })}
                    </div>}
                  </div>;
                })}
              </div>;
            })()}
          </Card>

          {/* Customization */}
          <Card title="Step 3 — Custom Operating Units">
            <div className="text-[15px] text-[var(--text-secondary)] mb-3">Add operating units not in the taxonomy, or rename existing ones to match your client's terminology.</div>
            {omCustomUnits.length > 0 && <div className="space-y-1 mb-3">
              {omCustomUnits.map((cu, i) => <div key={cu.id} className="flex items-center gap-2 bg-[var(--surface-2)] rounded-lg px-3 py-2">
                <span className="text-[15px] text-[var(--text-primary)] flex-1">{cu.name}</span>
                <span className="text-[15px] text-[var(--text-muted)]">{cu.func}</span>
                <span className="text-[14px] px-1.5 py-0.5 rounded bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]">{cu.layer}</span>
                <button onClick={() => setOmCustomUnits(prev => prev.filter((_, j) => j !== i))} className="text-[var(--text-muted)] hover:text-[var(--risk)] text-[15px]">✕</button>
              </div>)}
            </div>}
            {omAddingCustom ? <div className="bg-[var(--surface-2)] rounded-xl p-4 border border-[var(--accent-primary)]/20 space-y-3">
              <input value={omCustomName} onChange={e => setOmCustomName(e.target.value)} placeholder="Operating unit name" className="w-full bg-[var(--surface-1)] border border-[var(--border)] rounded-lg px-3 py-2 text-[15px] text-[var(--text-primary)] outline-none" />
              <div className="flex gap-2">
                <input value={omCustomFunc} onChange={e => setOmCustomFunc(e.target.value)} placeholder="Function (e.g. Finance)" className="flex-1 bg-[var(--surface-1)] border border-[var(--border)] rounded-lg px-3 py-2 text-[15px] text-[var(--text-primary)] outline-none" />
                <select value={omCustomLayer} onChange={e => setOmCustomLayer(e.target.value)} className="bg-[var(--surface-1)] border border-[var(--border)] rounded-lg px-3 py-2 text-[15px] text-[var(--text-primary)]">
                  {["Governance","Core","Shared Services","Enabling","Interface"].map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { if (omCustomName.trim()) { setOmCustomUnits(prev => [...prev, {id:`cust_${Date.now()}`,name:omCustomName.trim(),func:omCustomFunc||"Custom",layer:omCustomLayer}]); setOmCustomName(""); setOmCustomFunc(""); setOmAddingCustom(false); }}} className="px-4 py-1.5 rounded-lg text-[15px] font-semibold bg-[var(--accent-primary)] text-white">Add</button>
                <button onClick={() => setOmAddingCustom(false)} className="px-4 py-1.5 rounded-lg text-[15px] font-semibold text-[var(--text-muted)] border border-[var(--border)]">Cancel</button>
              </div>
            </div> : <button onClick={() => setOmAddingCustom(true)} className="px-4 py-2 rounded-lg text-[15px] font-semibold text-[var(--accent-primary)] border border-[var(--accent-primary)]/30 hover:bg-[var(--accent-primary)]/5 transition-all">+ Add Custom Unit</button>}
          </Card>

          {/* Summary */}
          <Card title="Coverage Summary">
            <div className="grid grid-cols-4 gap-3 mb-4">
              <KpiCard label="Functions" value={(() => { const t = (omTaxonomy as Record<string,unknown>)?.taxonomy as Record<string,unknown>; return Object.keys((t?.functions || {}) as object).length; })()} />
              <KpiCard label="Units Selected" value={omSelectedUnits.length} accent />
              <KpiCard label="In Scope" value={Object.values(omScopedUnits).filter(v => v === "in").length || omSelectedUnits.length} />
              <KpiCard label="Custom Units" value={omCustomUnits.length} />
            </div>
            <div className="flex gap-2">
              <button onClick={async () => {
                await api.saveOMConfig({ model_id: model || "Demo_Model", industries: omIndustries, selected_units: omSelectedUnits, custom_units: omCustomUnits, renames: omRenames, scoped_units: omScopedUnits });
                showToast("Operating model configuration saved");
              }} className="px-4 py-2 rounded-lg text-[15px] font-semibold bg-[var(--accent-primary)] text-white hover:opacity-90 transition-all">💾 Save Configuration</button>
              <button onClick={() => { setOmSelectedUnits([]); setOmCustomUnits([]); setOmRenames({}); setOmScopedUnits({}); setOmIndustries([]); showToast("Configuration reset to defaults — start fresh"); }} className="px-4 py-2 rounded-lg text-[15px] font-semibold text-[var(--text-muted)] border border-[var(--border)] hover:text-[var(--risk)]">Revert Changes</button>
            </div>
          </Card>
        </div>}

        {omView === "3.1" && <Card title={`${fnD.label} — ${archD.label} Architecture`}>
          <div className="flex items-center justify-between mb-3">
            <div className="text-[15px] text-[var(--text-secondary)]">{archD.desc} · {opModel.replace("_"," ")} · {gov} governance</div>
            <button onClick={async () => {
              setAiOmLoading(true);
              try {
                const raw = await callAI("Return ONLY valid JSON.", `Generate a detailed operating model blueprint for a ${fnD.label} function using a ${archD.label} archetype. Return JSON: {"governance":["3-4 governance bodies"],"core":["10-15 core capabilities specific to ${fnD.label}"],"shared":["3-5 shared services"],"enabling":["3-4 enabling platforms/tools"],"interface":["3-4 interface touchpoints"]}. Be specific to ${fnD.label} — not generic.`);
                const parsed = JSON.parse(raw.replace(/\`\`\`json\n?/g,"").replace(/\`\`\`\n?/g,"").trim());
                if (parsed.core) setAiBlueprint(parsed);
              } catch (e) { console.error("[DesignModule] AI blueprint error", e); } setAiOmLoading(false);
            }} disabled={aiOmLoading} className="px-3 py-1.5 rounded-lg text-[15px] font-semibold text-white shrink-0" style={{ background: "linear-gradient(135deg, var(--accent-primary), var(--teal))" }}>{aiOmLoading ? "..." : "☕ AI Custom Blueprint"}</button>
          </div>

          {aiBlueprint && <div className="bg-[rgba(224,144,64,0.06)] border border-[rgba(224,144,64,0.15)] rounded-lg px-3 py-2 mb-3 flex items-center justify-between"><span className="text-[15px]" style={{ color: "var(--sky-gold)" }}>☕ Showing AI-generated blueprint</span><button onClick={() => setAiBlueprint(null)} className="text-[15px] text-[var(--text-muted)] hover:text-[var(--text-primary)]">Revert to standard blueprint</button></div>}
          <div className="space-y-2">
            {[{label:"Governance",items:aiBlueprint?.governance || govLayer,color:"#e87a5d"},{label:"Core Components",items:aiBlueprint?.core || coreLayer,color:"#f4a83a",grid:true},{label:"Shared Services",items:aiBlueprint?.shared || sharedLayer,color:"#8ba87a"},{label:"Enabling",items:aiBlueprint?.enabling || enableLayer,color:"#a78bb8"},{label:"Interface",items:aiBlueprint?.interface || interfaceLayer,color:"#f4a83a"}].map(layer => <div key={layer.label} className="rounded-xl p-3 border-l-4" style={{ background: `${layer.color}06`, borderColor: layer.color }}>
              <div className="flex items-center justify-between mb-2"><div className="text-[14px] font-bold uppercase tracking-wider" style={{ color: layer.color }}>{layer.label}</div><div className="text-[14px]" style={{ color: `${layer.color}80` }}>{layer.items.length} capabilities</div></div>
              <div className={layer.grid ? `grid gap-2 ${layer.items.length <= 4 ? "grid-cols-4" : layer.items.length <= 6 ? "grid-cols-3" : layer.items.length <= 9 ? "grid-cols-3 lg:grid-cols-4" : "grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"}` : "flex gap-2 flex-wrap"}>{layer.items.map(t => { const ai = getAiTier(t); return <div key={t} className={`rounded-lg p-2.5 border ${layer.grid ? "" : "px-3 py-2"}`} style={{ background: "#1e2030", borderColor: "var(--border)" }}><div className="text-[15px] font-semibold text-[var(--text-primary)]">{t.replace(archD.coreSuffix, "")}</div>{archD.coreSuffix && layer.grid && <div className="text-[15px] italic mt-0.5" style={{ color: `${layer.color}80` }}>{archD.coreSuffix.replace(" — ", "").replace(" as a ", "").trim()}</div>}{layer.grid && <div className="flex items-center gap-1 mt-0.5"><div className="w-1.5 h-1.5 rounded-full" style={{ background: ai.color }} /><span className="text-[15px]" style={{ color: ai.color }}>{ai.tier}</span></div>}</div>; })}</div>
            </div>)}
          </div>
        </Card>}

        {omView === "2.1" && <Card title={<div>Capability Maturity Assessment<div style={{ fontSize: 11, color: "#8a7f6d", marginTop: 2, fontWeight: 400 }}>What your organization needs to be good at</div></div>}>
          {(() => { const scores = Object.values(maturityScores).filter(v => v > 0); const avg = scores.length ? (scores.reduce((a,b) => a+b, 0) / scores.length).toFixed(1) : "—"; const tScores = Object.values(targetScores).filter(v => v > 0); const tAvg = tScores.length ? (tScores.reduce((a,b) => a+b, 0) / tScores.length).toFixed(1) : "—"; return <div className="flex gap-4 mb-4">{[{label:"Current Avg",val:avg,color:"#f4a83a"},{label:"Target Avg",val:tAvg,color:"#8ba87a"},{label:"Capabilities Rated",val:`${scores.length}/${allCaps.length}`,color:"var(--text-secondary)"},{label:"Gap",val:scores.length && tScores.length ? (Number(tAvg)-Number(avg)).toFixed(1) : "—",color:"#f4a83a"}].map(k => <div key={k.label} className="flex-1 rounded-xl p-3 bg-[var(--surface-2)] text-center"><div className="text-[17px] font-extrabold" style={{color:k.color}}>{k.val}</div><div className="text-[14px] text-[var(--text-muted)] uppercase">{k.label}</div></div>)}</div>; })()}
          <div className="text-[15px] text-[var(--text-secondary)] mb-3">Rate current state (left) and target state (right) for each capability.</div>
          <div className="overflow-x-auto rounded-lg border border-[var(--border)]"><table className="w-full"><thead><tr className="bg-[var(--surface-2)]"><th className="px-3 py-2 text-left text-[15px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">Capability</th><th className="px-2 py-2 text-center text-[15px] font-semibold text-[var(--text-muted)] border-b border-[var(--border)]">Layer</th>{[1,2,3,4,5].map(n => <th key={n} className="px-2 py-2 text-center text-[15px] border-b border-[var(--border)] text-[var(--text-muted)]">{n}</th>)}<th className="px-1 py-2 text-center text-[14px] border-b border-[var(--border)] text-[var(--text-muted)]">|</th>{[1,2,3,4,5].map(n => <th key={`t${n}`} className="px-2 py-2 text-center text-[15px] border-b border-[var(--border)] text-[var(--success)]">{n}</th>)}<th className="px-2 py-2 text-center text-[15px] border-b border-[var(--border)] text-[var(--text-muted)]">AI</th></tr></thead>
          <tbody>{allCaps.map(cap => { const sc = maturityScores[cap.name]||0; const ai = getAiTier(cap.name); return <tr key={cap.name} className="border-b border-[var(--border)]"><td className="px-3 py-1.5 text-[15px] font-semibold">{cap.name}</td><td className="px-2 py-1.5 text-center"><span className="text-[14px] px-1.5 py-0.5 rounded-full" style={{ background: `${layerColors[cap.layer]}12`, color: layerColors[cap.layer] }}>{cap.layer}</span></td>{[1,2,3,4,5].map(n => <td key={n} className="px-2 py-1.5 text-center"><button onClick={() => setMaturityScores(p => ({...p,[cap.name]: p[cap.name] === n ? 0 : n}))} className="w-6 h-6 rounded text-[15px] font-bold" style={{ background: sc>=n ? `${n<=2?"#e87a5d":n<=3?"#f4a83a":"#8ba87a"}20` : "#1e2030", color: sc>=n ? (n<=2?"#e87a5d":n<=3?"#f4a83a":"#8ba87a") : "#8a7f6d" }}>{n}</button></td>)}<td className="px-1 py-1.5 text-center text-[var(--border)]">│</td>{[1,2,3,4,5].map(n => <td key={`t${n}`} className="px-2 py-1.5 text-center"><button onClick={() => setTargetScores(p => ({...p,[cap.name]: p[cap.name] === n ? 0 : n}))} className="w-6 h-6 rounded text-[15px] font-bold" style={{ background: (targetScores[cap.name]||0)>=n ? `${n<=2?"#e87a5d":n<=3?"#f4a83a":"#8ba87a"}20` : "#1e2030", color: (targetScores[cap.name]||0)>=n ? (n<=2?"#e87a5d":n<=3?"#f4a83a":"#8ba87a") : "#8a7f6d" }}>{n}</button></td>)}<td className="px-2 py-1.5 text-center"><span className="text-[14px]" style={{ color: ai.color }}>{ai.tier}</span></td></tr>; })}</tbody></table></div>
          <div className="flex gap-3 mt-2 text-[14px] text-[var(--text-muted)]">{["1=Ad Hoc","2=Emerging","3=Defined","4=Managed","5=Optimized"].map(l => <span key={l}>{l}</span>)}</div>
        </Card>}

        {/* ── Step 2.2: Service Delivery Model ── */}
        {omView === "2.2" && <div className="animate-tab-enter space-y-5">
          {/* Sub-navigation */}
          <div className="flex gap-1 rounded-xl bg-[var(--surface-2)] p-1 border border-[var(--border)]">
            {([
              { id: "matrix" as const, label: "Delivery Matrix", icon: "📊" },
              { id: "shared" as const, label: "Shared Services", icon: "🏢" },
              { id: "coe" as const, label: "COE Designer", icon: "🎓" },
              { id: "outsource" as const, label: "Outsource Scoring", icon: "📋" },
              { id: "location" as const, label: "Location Strategy", icon: "🌍" },
            ]).map(v => <button key={v.id} onClick={() => setSvcView(v.id)} className="flex-1 px-3 py-2 rounded-lg text-[14px] font-semibold transition-all" style={{
              background: svcView === v.id ? "rgba(244,168,58,0.12)" : "transparent",
              color: svcView === v.id ? "#f4a83a" : "#8a7f6d",
            }}>{v.icon} {v.label}</button>)}
          </div>

          {/* ─── 1. DELIVERY MODEL MATRIX ─── */}
          {svcView === "matrix" && <Card title={<div>Delivery Model Matrix — Current vs. Target State<div style={{ fontSize: 11, color: "#8a7f6d", marginTop: 2, fontWeight: 400 }}>How services reach the business</div></div>}>
            <div className="text-[15px] text-[var(--text-secondary)] mb-4">For each function/capability, set the current and target delivery model. Shifts are color-coded.</div>
            {/* Filter & summary */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-[13px] text-[var(--text-muted)]">Function:</span>
                <select value={svcFuncFilter} onChange={e => setSvcFuncFilter(e.target.value)} className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-2 py-1 text-[14px] text-[var(--text-primary)] outline-none">
                  <option value="All">All Functions</option>
                  {Array.from(new Set(SVC_FUNCTIONS_DEFAULT.map(f => f.func))).sort().map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              {(() => {
                const shifts = SVC_FUNCTIONS_DEFAULT.filter(f => { const m = svcDeliveryMap[f.id]; return m && m.current && m.target && m.current !== m.target; });
                const major = shifts.filter(f => { const m = svcDeliveryMap[f.id]; return (m.current === "In-House" && (m.target === "Outsourced/BPO")) || (m.current === "Outsourced/BPO" && m.target === "In-House"); });
                return <div className="flex gap-3 text-[14px]">
                  <span className="text-[var(--text-muted)]">{shifts.length} shift{shifts.length !== 1 ? "s" : ""}</span>
                  {major.length > 0 && <span className="text-[var(--risk)]">{major.length} major</span>}
                </div>;
              })()}
            </div>
            {/* KPI row */}
            <div className="grid grid-cols-5 gap-2 mb-4">
              {SVC_MODELS.map(m => {
                const currentCount = SVC_FUNCTIONS_DEFAULT.filter(f => (svcDeliveryMap[f.id]?.current || "In-House") === m).length;
                const targetCount = SVC_FUNCTIONS_DEFAULT.filter(f => (svcDeliveryMap[f.id]?.target || svcDeliveryMap[f.id]?.current || "In-House") === m).length;
                const delta = targetCount - currentCount;
                return <div key={m} className="rounded-xl p-2.5 bg-[var(--surface-2)] text-center">
                  <div className="text-[13px] font-bold" style={{ color: SVC_MODEL_COLORS[m] }}>{m}</div>
                  <div className="text-[15px] font-extrabold text-[var(--text-primary)]">{currentCount} → {targetCount}</div>
                  {delta !== 0 && <div className="text-[13px] font-semibold" style={{ color: delta > 0 ? "#8ba87a" : "#f4a83a" }}>{delta > 0 ? "+" : ""}{delta}</div>}
                </div>;
              })}
            </div>
            {/* Matrix table */}
            <div className="overflow-x-auto rounded-lg border border-[var(--border)]"><table className="w-full"><thead><tr className="bg-[var(--surface-2)]">
              <th className="px-3 py-2 text-left text-[13px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)] min-w-[180px]">Capability</th>
              <th className="px-2 py-2 text-center text-[13px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">Function</th>
              <th className="px-2 py-2 text-center text-[13px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)] min-w-[140px]">Current</th>
              <th className="px-1 py-2 text-center text-[13px] text-[var(--text-muted)] border-b border-[var(--border)]">→</th>
              <th className="px-2 py-2 text-center text-[13px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)] min-w-[140px]">Target</th>
              <th className="px-2 py-2 text-center text-[13px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">Shift</th>
              <th className="px-2 py-2 text-left text-[13px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)] min-w-[200px]">Rationale</th>
            </tr></thead><tbody>
              {SVC_FUNCTIONS_DEFAULT.filter(f => svcFuncFilter === "All" || f.func === svcFuncFilter).map(f => {
                const entry = svcDeliveryMap[f.id] || { current: "In-House" as SvcModel, target: "In-House" as SvcModel, rationale: "" };
                const current = entry.current || "In-House";
                const target = entry.target || current;
                const noChange = current === target;
                const majorShift = (current === "In-House" && target === "Outsourced/BPO") || (current === "Outsourced/BPO" && target === "In-House");
                const shiftColor = noChange ? "#8ba87a" : majorShift ? "#e87a5d" : "#f4a83a";
                const shiftLabel = noChange ? "No Change" : majorShift ? "Major" : "Shift";
                const setField = (field: "current" | "target", val: SvcModel) => setSvcDeliveryMap(prev => ({ ...prev, [f.id]: { ...entry, current: field === "current" ? val : (prev[f.id]?.current || "In-House"), target: field === "target" ? val : (prev[f.id]?.target || prev[f.id]?.current || "In-House"), rationale: prev[f.id]?.rationale || "" } }));
                return <tr key={f.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-2)]/50">
                  <td className="px-3 py-2 text-[14px] font-semibold text-[var(--text-primary)]">{f.label}</td>
                  <td className="px-2 py-2 text-center text-[13px] text-[var(--text-muted)]">{f.func}</td>
                  <td className="px-2 py-2 text-center">
                    <select value={current} onChange={e => setField("current", e.target.value as SvcModel)} className="bg-[var(--bg)] border rounded-lg px-2 py-1 text-[13px] font-semibold outline-none" style={{ borderColor: `${SVC_MODEL_COLORS[current]}40`, color: SVC_MODEL_COLORS[current] }}>
                      {SVC_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </td>
                  <td className="px-1 py-2 text-center text-[var(--text-muted)]">→</td>
                  <td className="px-2 py-2 text-center">
                    <select value={target} onChange={e => setField("target", e.target.value as SvcModel)} className="bg-[var(--bg)] border rounded-lg px-2 py-1 text-[13px] font-semibold outline-none" style={{ borderColor: `${SVC_MODEL_COLORS[target]}40`, color: SVC_MODEL_COLORS[target] }}>
                      {SVC_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-2 text-center"><span className="px-2 py-0.5 rounded-full text-[12px] font-bold" style={{ background: `${shiftColor}12`, color: shiftColor }}>{shiftLabel}</span></td>
                  <td className="px-2 py-2">
                    {svcEditingRationale === f.id ? <input value={entry.rationale} onChange={e => setSvcDeliveryMap(prev => ({...prev, [f.id]: {...(prev[f.id] || {current: "In-House" as SvcModel, target: "In-House" as SvcModel, rationale: ""}), rationale: e.target.value}}))} onBlur={() => setSvcEditingRationale(null)} onKeyDown={e => { if (e.key === "Enter") setSvcEditingRationale(null); }} className="w-full bg-[var(--bg)] border border-[var(--border)] rounded px-2 py-1 text-[13px] outline-none" autoFocus placeholder="Why this change..." /> : <button onClick={() => setSvcEditingRationale(f.id)} className="text-[13px] text-left w-full truncate" style={{ color: entry.rationale ? "var(--text-secondary)" : "#8a7f6d" }}>{entry.rationale || "Click to add rationale..."}</button>}
                  </td>
                </tr>;
              })}
            </tbody></table></div>
            <div className="flex gap-3 mt-2 text-[13px] text-[var(--text-muted)]">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[var(--success)]" />No Change</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[var(--warning)]" />Model Shift</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[var(--risk)]" />Major Change</span>
            </div>
          </Card>}

          {/* ─── 2. SHARED SERVICES DESIGNER ─── */}
          {svcView === "shared" && <Card title="Shared Services Designer">
            {(() => {
              const sharedFuncs = SVC_FUNCTIONS_DEFAULT.filter(f => {
                const m = svcDeliveryMap[f.id]; return m && (m.current === "Shared Services" || m.target === "Shared Services");
              });
              if (sharedFuncs.length === 0) return <div className="text-center py-10">
                <div className="text-[40px] mb-3">🏢</div>
                <div className="text-[15px] font-semibold text-[var(--text-primary)] mb-1">No Shared Services Defined</div>
                <div className="text-[14px] text-[var(--text-muted)] mb-4">Set capabilities to &quot;Shared Services&quot; in the Delivery Matrix to configure them here.</div>
                <button onClick={() => setSvcView("matrix")} className="px-4 py-2 rounded-lg text-[14px] font-semibold text-[var(--accent-primary)] border border-[var(--accent-primary)]/30">Go to Delivery Matrix</button>
              </div>;
              return <div className="space-y-4">
                <div className="text-[15px] text-[var(--text-secondary)] mb-2">Define SLAs, staffing, technology, and cost models for each shared service.</div>
                {sharedFuncs.map(f => {
                  const def = svcSharedDefs[f.id] || { services: "", slaResponse: "", slaQuality: "", costPerTx: "", location: "Onshore", staffing: "Pooled", technology: "", costModel: "" };
                  const update = (field: string, val: string) => setSvcSharedDefs(prev => ({ ...prev, [f.id]: { ...def, [field]: val } }));
                  return <div key={f.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-[15px] font-bold text-[var(--text-primary)]">{f.label}</span>
                      <span className="px-2 py-0.5 rounded-full text-[12px] font-semibold" style={{ background: `${SVC_MODEL_COLORS["Shared Services"]}15`, color: SVC_MODEL_COLORS["Shared Services"] }}>Shared Services</span>
                      <span className="text-[13px] text-[var(--text-muted)]">{f.func}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="text-[12px] text-[var(--text-muted)] uppercase block mb-1">Services Included</label><input value={def.services} onChange={e => update("services", e.target.value)} placeholder="e.g. Invoice processing, vendor payments..." className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" /></div>
                      <div><label className="text-[12px] text-[var(--text-muted)] uppercase block mb-1">Location</label><select value={def.location} onChange={e => update("location", e.target.value)} className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[14px] text-[var(--text-primary)] outline-none"><option>Onshore</option><option>Nearshore</option><option>Offshore</option><option>Multi-site</option></select></div>
                      <div><label className="text-[12px] text-[var(--text-muted)] uppercase block mb-1">SLA: Response Time</label><input value={def.slaResponse} onChange={e => update("slaResponse", e.target.value)} placeholder="e.g. 24 hours, 4 hours SLA..." className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" /></div>
                      <div><label className="text-[12px] text-[var(--text-muted)] uppercase block mb-1">SLA: Quality Metric</label><input value={def.slaQuality} onChange={e => update("slaQuality", e.target.value)} placeholder="e.g. 99.5% accuracy, <2% error rate..." className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" /></div>
                      <div><label className="text-[12px] text-[var(--text-muted)] uppercase block mb-1">Staffing Model</label><select value={def.staffing} onChange={e => update("staffing", e.target.value)} className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[14px] text-[var(--text-primary)] outline-none"><option>Dedicated</option><option>Pooled</option><option>Blended</option></select></div>
                      <div><label className="text-[12px] text-[var(--text-muted)] uppercase block mb-1">Cost per Transaction</label><input value={def.costPerTx} onChange={e => update("costPerTx", e.target.value)} placeholder="e.g. $3.50/invoice, $12/ticket..." className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" /></div>
                      <div><label className="text-[12px] text-[var(--text-muted)] uppercase block mb-1">Supporting Technology</label><input value={def.technology} onChange={e => update("technology", e.target.value)} placeholder="e.g. SAP, ServiceNow, Workday..." className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" /></div>
                      <div><label className="text-[12px] text-[var(--text-muted)] uppercase block mb-1">Cost Model</label><input value={def.costModel} onChange={e => update("costModel", e.target.value)} placeholder="e.g. per-employee, per-transaction..." className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" /></div>
                    </div>
                  </div>;
                })}
              </div>;
            })()}
          </Card>}

          {/* ─── 3. COE DESIGNER ─── */}
          {svcView === "coe" && <Card title="Center of Excellence (COE) Designer">
            {(() => {
              const coeFuncs = SVC_FUNCTIONS_DEFAULT.filter(f => {
                const m = svcDeliveryMap[f.id]; return m && (m.current === "COE" || m.target === "COE");
              });
              if (coeFuncs.length === 0) return <div className="text-center py-10">
                <div className="text-[40px] mb-3">🎓</div>
                <div className="text-[15px] font-semibold text-[var(--text-primary)] mb-1">No COEs Defined</div>
                <div className="text-[14px] text-[var(--text-muted)] mb-4">Set capabilities to &quot;COE&quot; in the Delivery Matrix to design them here.</div>
                <button onClick={() => setSvcView("matrix")} className="px-4 py-2 rounded-lg text-[14px] font-semibold text-[var(--accent-primary)] border border-[var(--accent-primary)]/30">Go to Delivery Matrix</button>
              </div>;
              return <div className="space-y-4">
                <div className="text-[15px] text-[var(--text-secondary)] mb-2">Define the expertise, mandate, and success metrics for each Center of Excellence.</div>
                {coeFuncs.map(f => {
                  const def = svcCoeDefs[f.id] || { expertise: "", mandate: "Advisory + Execution", placement: "Centralized", km: "", metrics: "" };
                  const update = (field: string, val: string) => setSvcCoeDefs(prev => ({ ...prev, [f.id]: { ...def, [field]: val } }));
                  return <div key={f.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-[15px] font-bold text-[var(--text-primary)]">{f.label}</span>
                      <span className="px-2 py-0.5 rounded-full text-[12px] font-semibold" style={{ background: `${SVC_MODEL_COLORS["COE"]}15`, color: SVC_MODEL_COLORS["COE"] }}>COE</span>
                      <span className="text-[13px] text-[var(--text-muted)]">{f.func}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2"><label className="text-[12px] text-[var(--text-muted)] uppercase block mb-1">Expertise Provided</label><input value={def.expertise} onChange={e => update("expertise", e.target.value)} placeholder="e.g. Advanced analytics, ML model development, data governance..." className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" /></div>
                      <div><label className="text-[12px] text-[var(--text-muted)] uppercase block mb-1">Mandate</label><select value={def.mandate} onChange={e => update("mandate", e.target.value)} className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[14px] text-[var(--text-primary)] outline-none"><option>Advisory Only</option><option>Advisory + Execution</option><option>Execution Only</option></select></div>
                      <div><label className="text-[12px] text-[var(--text-muted)] uppercase block mb-1">Placement</label><select value={def.placement} onChange={e => update("placement", e.target.value)} className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[14px] text-[var(--text-primary)] outline-none"><option>Centralized</option><option>Embedded in Business</option><option>Hub & Spoke</option></select></div>
                      <div><label className="text-[12px] text-[var(--text-muted)] uppercase block mb-1">Knowledge Management</label><input value={def.km} onChange={e => update("km", e.target.value)} placeholder="e.g. Playbooks, training, internal wiki..." className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" /></div>
                      <div><label className="text-[12px] text-[var(--text-muted)] uppercase block mb-1">Success Metrics</label><input value={def.metrics} onChange={e => update("metrics", e.target.value)} placeholder="e.g. # projects delivered, adoption rate, NPS..." className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" /></div>
                    </div>
                  </div>;
                })}
              </div>;
            })()}
          </Card>}

          {/* ─── 4. OUTSOURCING DECISION MATRIX ─── */}
          {svcView === "outsource" && <Card title="Outsourcing Decision Matrix">
            {(() => {
              const outsourceFuncs = SVC_FUNCTIONS_DEFAULT.filter(f => {
                const m = svcDeliveryMap[f.id]; return m && (m.target === "Outsourced/BPO" || m.current === "Outsourced/BPO");
              });
              const scoredFuncs = outsourceFuncs.filter(f => svcOutsourceScores[f.id]);
              if (outsourceFuncs.length === 0) return <div className="text-center py-10">
                <div className="text-[40px] mb-3">📋</div>
                <div className="text-[15px] font-semibold text-[var(--text-primary)] mb-1">No Outsourcing Candidates</div>
                <div className="text-[14px] text-[var(--text-muted)] mb-4">Set capabilities to &quot;Outsourced/BPO&quot; in the Delivery Matrix to evaluate them here.</div>
                <button onClick={() => setSvcView("matrix")} className="px-4 py-2 rounded-lg text-[14px] font-semibold text-[var(--accent-primary)] border border-[var(--accent-primary)]/30">Go to Delivery Matrix</button>
              </div>;
              return <div className="space-y-5">
                <div className="text-[15px] text-[var(--text-secondary)] mb-2">Score each outsourcing candidate on 4 dimensions (1-5). The 2x2 matrix below shows recommendations.</div>
                {/* Scoring table */}
                <div className="overflow-x-auto rounded-lg border border-[var(--border)]"><table className="w-full"><thead><tr className="bg-[var(--surface-2)]">
                  <th className="px-3 py-2 text-left text-[13px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">Capability</th>
                  <th className="px-2 py-2 text-center text-[13px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">Strategic Importance</th>
                  <th className="px-2 py-2 text-center text-[13px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">Vendor Availability</th>
                  <th className="px-2 py-2 text-center text-[13px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">Cost Savings</th>
                  <th className="px-2 py-2 text-center text-[13px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">Risk Level</th>
                  <th className="px-2 py-2 text-center text-[13px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">Recommendation</th>
                </tr></thead><tbody>
                  {outsourceFuncs.map(f => {
                    const scores = svcOutsourceScores[f.id] || { strategic: 3, availability: 3, costSavings: 3, risk: 3 };
                    const setScore = (field: keyof SvcOutscoreCard, val: number) => setSvcOutsourceScores(prev => ({ ...prev, [f.id]: { ...scores, [field]: scores[field] === val ? 0 : val } }));
                    const rec = scores.strategic <= 2 && scores.costSavings >= 4 ? "Outsource" : scores.strategic >= 4 ? "Keep In-House" : "Evaluate";
                    const recColor = rec === "Outsource" ? "#8ba87a" : rec === "Keep In-House" ? "var(--purple)" : "#f4a83a";
                    return <tr key={f.id} className="border-b border-[var(--border)]">
                      <td className="px-3 py-2 text-[14px] font-semibold text-[var(--text-primary)]">{f.label}<div className="text-[12px] text-[var(--text-muted)]">{f.func}</div></td>
                      {(["strategic", "availability", "costSavings", "risk"] as const).map(dim => <td key={dim} className="px-2 py-2 text-center">
                        <div className="flex items-center justify-center gap-0.5">
                          {[1,2,3,4,5].map(n => <button key={n} onClick={() => setScore(dim, n)} className="w-6 h-6 rounded text-[13px] font-bold transition-all" style={{
                            background: scores[dim] >= n ? `${n <= 2 ? "#8ba87a" : n <= 3 ? "#f4a83a" : "#e87a5d"}20` : "#1e2030",
                            color: scores[dim] >= n ? (n <= 2 ? "#8ba87a" : n <= 3 ? "#f4a83a" : "#e87a5d") : "#8a7f6d",
                          }}>{n}</button>)}
                        </div>
                      </td>)}
                      <td className="px-2 py-2 text-center"><span className="px-2 py-0.5 rounded-full text-[13px] font-bold" style={{ background: `${recColor}12`, color: recColor }}>{rec}</span></td>
                    </tr>;
                  })}
                </tbody></table></div>
                {/* 2x2 quadrant */}
                {scoredFuncs.length > 0 && <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                  <div className="text-[13px] font-semibold text-[var(--text-muted)] uppercase mb-3">Strategic Importance vs. Cost Savings — Outsource Decision Map</div>
                  <div className="grid grid-cols-2 gap-0 border border-[var(--border)] rounded-lg overflow-hidden" style={{ minHeight: 200 }}>
                    {/* Quadrants: [High Strat / High Cost] [High Strat / Low Cost] [Low Strat / High Cost] [Low Strat / Low Cost] */}
                    {[
                      { label: "Keep In-House", desc: "High strategic value, high savings potential — build internal capability", color: "var(--purple)", bg: "rgba(167,139,184,0.04)", filter: (s: SvcOutscoreCard) => s.strategic >= 4 && s.costSavings >= 4 },
                      { label: "Invest & Protect", desc: "High strategic value, low savings — core competency, invest more", color: "#f4a83a", bg: "rgba(244,168,58,0.04)", filter: (s: SvcOutscoreCard) => s.strategic >= 4 && s.costSavings < 4 },
                      { label: "Outsource", desc: "Low strategic value, high savings — clear outsource candidate", color: "#8ba87a", bg: "rgba(139,168,122,0.04)", filter: (s: SvcOutscoreCard) => s.strategic < 4 && s.costSavings >= 4 },
                      { label: "Evaluate Carefully", desc: "Low strategic value, low savings — limited benefit either way", color: "#f4a83a", bg: "rgba(244,168,58,0.04)", filter: (s: SvcOutscoreCard) => s.strategic < 4 && s.costSavings < 4 },
                    ].map((q, qi) => <div key={qi} className="p-3 border-r border-b border-[var(--border)] last:border-r-0" style={{ background: q.bg }}>
                      <div className="text-[14px] font-bold mb-0.5" style={{ color: q.color }}>{q.label}</div>
                      <div className="text-[12px] text-[var(--text-muted)] mb-2">{q.desc}</div>
                      <div className="flex flex-wrap gap-1">
                        {outsourceFuncs.filter(f => { const s = svcOutsourceScores[f.id]; return s && q.filter(s); }).map(f => <span key={f.id} className="px-2 py-0.5 rounded text-[12px] font-semibold" style={{ background: `${q.color}15`, color: q.color }}>{f.label}</span>)}
                      </div>
                    </div>)}
                  </div>
                  <div className="flex justify-between mt-2 text-[12px] text-[var(--text-muted)]">
                    <span>← High Cost Savings</span><span>Low Cost Savings →</span>
                  </div>
                  <div className="flex justify-center mt-0.5 text-[12px] text-[var(--text-muted)]">↑ High Strategic Importance | Low Strategic Importance ↓</div>
                </div>}
              </div>;
            })()}
          </Card>}

          {/* ─── 5. LOCATION STRATEGY ─── */}
          {svcView === "location" && <Card title="Location Strategy">
            {(() => {
              const locationFuncs = SVC_FUNCTIONS_DEFAULT.filter(f => {
                const m = svcDeliveryMap[f.id];
                return m && (m.target === "Shared Services" || m.target === "Outsourced/BPO" || m.current === "Shared Services" || m.current === "Outsourced/BPO");
              });
              if (locationFuncs.length === 0) return <div className="text-center py-10">
                <div className="text-[40px] mb-3">🌍</div>
                <div className="text-[15px] font-semibold text-[var(--text-primary)] mb-1">No Location Decisions Needed</div>
                <div className="text-[14px] text-[var(--text-muted)] mb-4">Location strategy applies to Shared Services and Outsourced capabilities. Set some in the Delivery Matrix first.</div>
                <button onClick={() => setSvcView("matrix")} className="px-4 py-2 rounded-lg text-[14px] font-semibold text-[var(--accent-primary)] border border-[var(--accent-primary)]/30">Go to Delivery Matrix</button>
              </div>;
              const LOCATION_PRESETS = [
                { name: "US (Onshore)", costIndex: "100", talent: "High", timezone: "US/Americas", language: "English", risk: "Low" },
                { name: "India", costIndex: "25-35", talent: "Very High", timezone: "IST (UTC+5:30)", language: "English", risk: "Low-Medium" },
                { name: "Poland", costIndex: "40-50", talent: "High", timezone: "CET (UTC+1)", language: "English/Polish", risk: "Low" },
                { name: "Philippines", costIndex: "20-30", talent: "High", timezone: "PHT (UTC+8)", language: "English", risk: "Medium" },
                { name: "Mexico (Nearshore)", costIndex: "35-45", talent: "Medium-High", timezone: "CST (UTC-6)", language: "Spanish/English", risk: "Low-Medium" },
                { name: "UK", costIndex: "85-95", talent: "High", timezone: "GMT (UTC+0)", language: "English", risk: "Low" },
                { name: "Singapore", costIndex: "70-80", talent: "High", timezone: "SGT (UTC+8)", language: "English", risk: "Low" },
                { name: "Costa Rica", costIndex: "30-40", talent: "Medium", timezone: "CST (UTC-6)", language: "Spanish/English", risk: "Low" },
              ];
              return <div className="space-y-5">
                <div className="text-[15px] text-[var(--text-secondary)] mb-2">Assign delivery locations and compare options for each shared service or outsourced capability.</div>
                {/* Location reference cards */}
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {LOCATION_PRESETS.map(loc => <div key={loc.name} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                    <div className="text-[14px] font-bold text-[var(--text-primary)] mb-1">{loc.name}</div>
                    <div className="space-y-0.5 text-[12px]">
                      <div className="flex justify-between"><span className="text-[var(--text-muted)]">Cost Index</span><span className="font-semibold" style={{ color: parseInt(loc.costIndex) <= 35 ? "#8ba87a" : parseInt(loc.costIndex) <= 60 ? "#f4a83a" : "var(--text-primary)" }}>{loc.costIndex}</span></div>
                      <div className="flex justify-between"><span className="text-[var(--text-muted)]">Talent</span><span className="font-semibold text-[var(--text-secondary)]">{loc.talent}</span></div>
                      <div className="flex justify-between"><span className="text-[var(--text-muted)]">Timezone</span><span className="text-[var(--text-secondary)]">{loc.timezone}</span></div>
                      <div className="flex justify-between"><span className="text-[var(--text-muted)]">Language</span><span className="text-[var(--text-secondary)]">{loc.language}</span></div>
                      <div className="flex justify-between"><span className="text-[var(--text-muted)]">Risk</span><span className="font-semibold" style={{ color: loc.risk === "Low" ? "#8ba87a" : loc.risk.includes("Medium") ? "#f4a83a" : "#e87a5d" }}>{loc.risk}</span></div>
                    </div>
                  </div>)}
                </div>
                {/* Location assignments */}
                <div className="overflow-x-auto rounded-lg border border-[var(--border)]"><table className="w-full"><thead><tr className="bg-[var(--surface-2)]">
                  <th className="px-3 py-2 text-left text-[13px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">Capability</th>
                  <th className="px-2 py-2 text-center text-[13px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">Model</th>
                  <th className="px-2 py-2 text-left text-[13px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">Location</th>
                  <th className="px-2 py-2 text-center text-[13px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">Cost Index</th>
                  <th className="px-2 py-2 text-center text-[13px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">Talent</th>
                  <th className="px-2 py-2 text-center text-[13px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">Timezone</th>
                  <th className="px-2 py-2 text-center text-[13px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">Risk</th>
                </tr></thead><tbody>
                  {locationFuncs.map(f => {
                    const target = svcDeliveryMap[f.id]?.target || svcDeliveryMap[f.id]?.current || "Shared Services";
                    const loc = svcLocations[f.id] || { location: "", costIndex: "", talent: "", timezone: "", language: "", risk: "" };
                    const update = (field: string, val: string) => setSvcLocations(prev => ({ ...prev, [f.id]: { ...loc, [field]: val } }));
                    // Auto-fill from preset
                    const applyPreset = (preset: typeof LOCATION_PRESETS[0]) => {
                      setSvcLocations(prev => ({ ...prev, [f.id]: { location: preset.name, costIndex: preset.costIndex, talent: preset.talent, timezone: preset.timezone, language: preset.language, risk: preset.risk } }));
                    };
                    return <tr key={f.id} className="border-b border-[var(--border)]">
                      <td className="px-3 py-2"><div className="text-[14px] font-semibold text-[var(--text-primary)]">{f.label}</div><div className="text-[12px] text-[var(--text-muted)]">{f.func}</div></td>
                      <td className="px-2 py-2 text-center"><span className="px-2 py-0.5 rounded-full text-[12px] font-semibold" style={{ background: `${SVC_MODEL_COLORS[target] || "#888"}15`, color: SVC_MODEL_COLORS[target] || "#888" }}>{target}</span></td>
                      <td className="px-2 py-2"><select value={loc.location} onChange={e => { const preset = LOCATION_PRESETS.find(p => p.name === e.target.value); if (preset) applyPreset(preset); else update("location", e.target.value); }} className="bg-[var(--bg)] border border-[var(--border)] rounded-lg px-2 py-1 text-[13px] text-[var(--text-primary)] outline-none w-full">
                        <option value="">Select...</option>
                        {LOCATION_PRESETS.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                      </select></td>
                      <td className="px-2 py-2 text-center text-[14px] font-semibold" style={{ color: parseInt(loc.costIndex) <= 35 ? "#8ba87a" : parseInt(loc.costIndex) <= 60 ? "#f4a83a" : "var(--text-primary)" }}>{loc.costIndex || "—"}</td>
                      <td className="px-2 py-2 text-center text-[13px] text-[var(--text-secondary)]">{loc.talent || "—"}</td>
                      <td className="px-2 py-2 text-center text-[13px] text-[var(--text-secondary)]">{loc.timezone || "—"}</td>
                      <td className="px-2 py-2 text-center"><span className="text-[13px] font-semibold" style={{ color: loc.risk === "Low" ? "#8ba87a" : loc.risk.includes("Medium") ? "#f4a83a" : loc.risk ? "#e87a5d" : "#8a7f6d" }}>{loc.risk || "—"}</span></td>
                    </tr>;
                  })}
                </tbody></table></div>
              </div>;
            })()}
          </Card>}
        </div>}

        {/* ── Step 2.5: Governance & Decision Rights ── */}
        {omView === "2.5" && <div className="animate-tab-enter space-y-5">
          {/* Sub-navigation */}
          <div className="flex gap-1 rounded-xl bg-[var(--surface-2)] p-1 border border-[var(--border)]">
            {([
              { id: "catalogue" as const, label: "Decision Catalogue", icon: "📋" },
              { id: "rapid" as const, label: "RAPID Modeler", icon: "⚡" },
              { id: "forums" as const, label: "Forum Designer", icon: "🏛" },
              { id: "bottlenecks" as const, label: "Bottleneck Analyzer", icon: "🔍" },
            ]).map(v => <button key={v.id} onClick={() => setGovView(v.id)} className="flex-1 px-3 py-2 rounded-lg text-[14px] font-semibold transition-all" style={{
              background: govView === v.id ? "rgba(244,168,58,0.12)" : "transparent",
              color: govView === v.id ? "#f4a83a" : "#8a7f6d",
            }}>{v.icon} {v.label}</button>)}
          </div>

          {/* ─── 1. DECISION CATALOGUE ─── */}
          {govView === "catalogue" && <Card title={<div>Decision Catalogue<div style={{ fontSize: 11, color: "#8a7f6d", marginTop: 2, fontWeight: 400 }}>Who decides what, and how fast</div></div>}>
            <div className="text-[15px] text-[var(--text-secondary)] mb-4">Inventory of key organizational decisions. Click any cell to edit inline.</div>
            {/* Filters */}
            <div className="flex gap-2 flex-wrap mb-4">
              {[
                { label: "Category", val: govCatFilter, set: setGovCatFilter, opts: ["All", "Strategic", "Tactical", "Operational"] },
                { label: "Function", val: govFuncFilter, set: setGovFuncFilter, opts: ["All", ...Array.from(new Set(govDecisions.map(d => d.func))).sort()] },
                { label: "Speed", val: govSpeedFilter, set: setGovSpeedFilter, opts: ["All", "Fast", "Medium", "Slow"] },
                { label: "Clarity", val: govClarityFilter, set: setGovClarityFilter, opts: ["All", "Clear", "Ambiguous", "Undefined"] },
              ].map(f => <div key={f.label} className="flex items-center gap-1">
                <span className="text-[13px] text-[var(--text-muted)]">{f.label}:</span>
                <select value={f.val} onChange={e => f.set(e.target.value)} className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-2 py-1 text-[14px] text-[var(--text-primary)] outline-none">
                  {f.opts.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>)}
              <div className="ml-auto flex items-center gap-2">
                <span className="text-[14px] text-[var(--text-muted)]">{govDecisions.filter(d => (govCatFilter === "All" || d.category === govCatFilter) && (govFuncFilter === "All" || d.func === govFuncFilter) && (govSpeedFilter === "All" || d.speed === govSpeedFilter) && (govClarityFilter === "All" || d.clarity === govClarityFilter)).length} decisions</span>
                <button onClick={() => setGovAddingDecision(true)} className="px-3 py-1.5 rounded-lg text-[14px] font-semibold text-white" style={{ background: "linear-gradient(135deg, var(--accent-primary), var(--teal))" }}>+ Add Decision</button>
              </div>
            </div>
            {/* KPIs */}
            <div className="grid grid-cols-4 gap-3 mb-4">
              {[
                { label: "Total Decisions", val: govDecisions.length, color: "var(--text-primary)" },
                { label: "Undefined Clarity", val: govDecisions.filter(d => d.clarity === "Undefined").length, color: "#e87a5d" },
                { label: "Slow Decisions", val: govDecisions.filter(d => d.speed === "Slow").length, color: "#f4a83a" },
                { label: "Strategic", val: govDecisions.filter(d => d.category === "Strategic").length, color: "var(--purple)" },
              ].map(k => <div key={k.label} className="rounded-xl p-3 bg-[var(--surface-2)] text-center"><div className="text-[20px] font-extrabold" style={{ color: k.color, fontFamily: "'JetBrains Mono', monospace" }}>{k.val}</div><div className="text-[13px] text-[var(--text-muted)] uppercase">{k.label}</div></div>)}
            </div>
            {/* Add form */}
            {govAddingDecision && <div className="rounded-xl border border-[var(--accent-primary)]/30 bg-[rgba(244,168,58,0.04)] p-4 mb-4 space-y-3">
              <div className="text-[15px] font-bold text-[var(--accent-primary)]">Add New Decision</div>
              <div className="grid grid-cols-2 gap-3">
                <input value={govNewDec.name} onChange={e => setGovNewDec(p => ({...p, name: e.target.value}))} placeholder="Decision name..." className="col-span-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[15px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" />
                <select value={govNewDec.category} onChange={e => setGovNewDec(p => ({...p, category: e.target.value as GovDecision["category"]}))} className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] text-[var(--text-primary)] outline-none"><option value="Strategic">Strategic</option><option value="Tactical">Tactical</option><option value="Operational">Operational</option></select>
                <input value={govNewDec.owner} onChange={e => setGovNewDec(p => ({...p, owner: e.target.value}))} placeholder="Owner role/title..." className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" />
                <select value={govNewDec.speed} onChange={e => setGovNewDec(p => ({...p, speed: e.target.value as GovDecision["speed"]}))} className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] text-[var(--text-primary)] outline-none"><option value="Fast">Fast (&lt;1 week)</option><option value="Medium">Medium (1-4 weeks)</option><option value="Slow">Slow (&gt;4 weeks)</option></select>
                <select value={govNewDec.clarity} onChange={e => setGovNewDec(p => ({...p, clarity: e.target.value as GovDecision["clarity"]}))} className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] text-[var(--text-primary)] outline-none"><option value="Clear">Clear</option><option value="Ambiguous">Ambiguous</option><option value="Undefined">Undefined</option></select>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { if (!govNewDec.name.trim()) return; setGovDecisions(prev => [...prev, { ...govNewDec, id: `d${Date.now()}`, func: govNewDec.func, forumId: "" }]); setGovNewDec({ name: "", category: "Tactical", owner: "", speed: "Medium", clarity: "Ambiguous", func: "Operations" }); setGovAddingDecision(false); }} className="px-4 py-2 rounded-lg text-[14px] font-semibold text-white" style={{ background: "#f4a83a" }}>Add</button>
                <button onClick={() => setGovAddingDecision(false)} className="px-4 py-2 rounded-lg text-[14px] font-semibold text-[var(--text-muted)] border border-[var(--border)]">Cancel</button>
              </div>
            </div>}
            {/* Decision table */}
            <div className="overflow-x-auto rounded-lg border border-[var(--border)]"><table className="w-full"><thead><tr className="bg-[var(--surface-2)]">
              <th className="px-3 py-2 text-left text-[13px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">Decision</th>
              <th className="px-2 py-2 text-center text-[13px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">Category</th>
              <th className="px-2 py-2 text-center text-[13px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">Function</th>
              <th className="px-2 py-2 text-center text-[13px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">Owner</th>
              <th className="px-2 py-2 text-center text-[13px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">Speed</th>
              <th className="px-2 py-2 text-center text-[13px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">Clarity</th>
              <th className="px-2 py-2 text-center text-[13px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">Forum</th>
              <th className="px-1 py-2 border-b border-[var(--border)]"></th>
            </tr></thead><tbody>
              {govDecisions.filter(d => (govCatFilter === "All" || d.category === govCatFilter) && (govFuncFilter === "All" || d.func === govFuncFilter) && (govSpeedFilter === "All" || d.speed === govSpeedFilter) && (govClarityFilter === "All" || d.clarity === govClarityFilter)).map(d => {
                const catColors: Record<string, string> = { Strategic: "#a78bb8", Tactical: "#f4a83a", Operational: "#8ba87a" };
                const speedColors: Record<string, string> = { Fast: "#8ba87a", Medium: "#f4a83a", Slow: "#e87a5d" };
                const clarityColors: Record<string, string> = { Clear: "#8ba87a", Ambiguous: "#f4a83a", Undefined: "#e87a5d" };
                const forum = govForums.find(f => f.id === d.forumId);
                const isEditing = govEditingDecId === d.id;
                return <tr key={d.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-2)]/50">
                  <td className="px-3 py-2 text-[14px] font-semibold text-[var(--text-primary)]">{isEditing ? <input value={d.name} onChange={e => setGovDecisions(prev => prev.map(x => x.id === d.id ? {...x, name: e.target.value} : x))} className="bg-[var(--bg)] border border-[var(--border)] rounded px-2 py-1 text-[14px] w-full outline-none" /> : d.name}</td>
                  <td className="px-2 py-2 text-center">{isEditing ? <select value={d.category} onChange={e => setGovDecisions(prev => prev.map(x => x.id === d.id ? {...x, category: e.target.value as GovDecision["category"]} : x))} className="bg-[var(--bg)] border border-[var(--border)] rounded px-1 py-0.5 text-[13px] outline-none"><option>Strategic</option><option>Tactical</option><option>Operational</option></select> : <span className="px-2 py-0.5 rounded-full text-[13px] font-semibold" style={{ background: `${catColors[d.category]}12`, color: catColors[d.category] }}>{d.category}</span>}</td>
                  <td className="px-2 py-2 text-center text-[14px] text-[var(--text-secondary)]">{isEditing ? <input value={d.func} onChange={e => setGovDecisions(prev => prev.map(x => x.id === d.id ? {...x, func: e.target.value} : x))} className="bg-[var(--bg)] border border-[var(--border)] rounded px-1 py-0.5 text-[13px] w-20 outline-none" /> : d.func}</td>
                  <td className="px-2 py-2 text-center text-[14px] text-[var(--text-secondary)]">{isEditing ? <input value={d.owner} onChange={e => setGovDecisions(prev => prev.map(x => x.id === d.id ? {...x, owner: e.target.value} : x))} className="bg-[var(--bg)] border border-[var(--border)] rounded px-1 py-0.5 text-[13px] w-24 outline-none" /> : d.owner}</td>
                  <td className="px-2 py-2 text-center">{isEditing ? <select value={d.speed} onChange={e => setGovDecisions(prev => prev.map(x => x.id === d.id ? {...x, speed: e.target.value as GovDecision["speed"]} : x))} className="bg-[var(--bg)] border border-[var(--border)] rounded px-1 py-0.5 text-[13px] outline-none"><option>Fast</option><option>Medium</option><option>Slow</option></select> : <span className="px-2 py-0.5 rounded-full text-[13px] font-semibold" style={{ background: `${speedColors[d.speed]}12`, color: speedColors[d.speed] }}>{d.speed}</span>}</td>
                  <td className="px-2 py-2 text-center">{isEditing ? <select value={d.clarity} onChange={e => setGovDecisions(prev => prev.map(x => x.id === d.id ? {...x, clarity: e.target.value as GovDecision["clarity"]} : x))} className="bg-[var(--bg)] border border-[var(--border)] rounded px-1 py-0.5 text-[13px] outline-none"><option>Clear</option><option>Ambiguous</option><option>Undefined</option></select> : <span className="px-2 py-0.5 rounded-full text-[13px] font-semibold" style={{ background: `${clarityColors[d.clarity]}12`, color: clarityColors[d.clarity] }}>{d.clarity}</span>}</td>
                  <td className="px-2 py-2 text-center">{isEditing ? <select value={d.forumId} onChange={e => setGovDecisions(prev => prev.map(x => x.id === d.id ? {...x, forumId: e.target.value} : x))} className="bg-[var(--bg)] border border-[var(--border)] rounded px-1 py-0.5 text-[13px] outline-none"><option value="">None</option>{govForums.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select> : <span className="text-[13px]" style={{ color: forum ? "#f4a83a" : "#8a7f6d" }}>{forum ? forum.name : "—"}</span>}</td>
                  <td className="px-1 py-2 text-center">
                    <div className="flex gap-1">
                      <button onClick={() => setGovEditingDecId(isEditing ? null : d.id)} className="text-[14px] text-[var(--text-muted)] hover:text-[var(--accent-primary)]">{isEditing ? "✓" : "✎"}</button>
                      <button onClick={() => setGovDecisions(prev => prev.filter(x => x.id !== d.id))} className="text-[14px] text-[var(--text-muted)] hover:text-[var(--risk)]">×</button>
                    </div>
                  </td>
                </tr>;
              })}
            </tbody></table></div>
          </Card>}

          {/* ─── 2. RAPID MODELER ─── */}
          {govView === "rapid" && <Card title="RAPID Decision Rights Matrix">
            <div className="text-[15px] text-[var(--text-secondary)] mb-4">Assign RAPID roles for each decision. Click cells to cycle through R → A → P → I → D → clear. Every decision needs exactly one D (Decide).</div>
            {/* Validation summary */}
            {(() => {
              const issues: { dec: string; issue: string; severity: "error" | "warn" }[] = [];
              govDecisions.forEach(d => {
                const roles = govRapid[d.id] || {};
                const dCount = Object.values(roles).filter(v => v === "D").length;
                const rCount = Object.values(roles).filter(v => v === "R").length;
                if (dCount === 0 && Object.keys(roles).length > 0) issues.push({ dec: d.name, issue: "No Decider (D) assigned", severity: "error" });
                if (dCount > 1) issues.push({ dec: d.name, issue: `${dCount} Deciders — only one allowed`, severity: "error" });
                // Check rubber-stamping: same role is both R and D
                GOV_RAPID_ROLES.forEach(role => {
                  if (roles[role] === "D" && Object.entries(roles).some(([r, v]) => r !== role && v === "R" && r === role)) issues.push({ dec: d.name, issue: `${role} is both Recommend and Decide`, severity: "warn" });
                });
                if (rCount === 0 && Object.keys(roles).length > 0) issues.push({ dec: d.name, issue: "No Recommender (R) assigned", severity: "warn" });
              });
              // Check bottleneck: any role is "D" on too many decisions
              const dCounts: Record<string, number> = {};
              govDecisions.forEach(d => { const roles = govRapid[d.id] || {}; Object.entries(roles).forEach(([role, v]) => { if (v === "D") dCounts[role] = (dCounts[role] || 0) + 1; }); });
              Object.entries(dCounts).forEach(([role, count]) => { if (count > 5) issues.push({ dec: role, issue: `Decides on ${count} decisions — potential bottleneck`, severity: "warn" }); });
              if (issues.length === 0) return null;
              return <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3 mb-4 space-y-1">
                <div className="text-[13px] font-semibold text-[var(--text-muted)] uppercase mb-1">Validation Issues ({issues.length})</div>
                {issues.slice(0, 8).map((iss, i) => <div key={i} className="flex items-center gap-2 text-[14px]">
                  <span style={{ color: iss.severity === "error" ? "#e87a5d" : "#f4a83a" }}>{iss.severity === "error" ? "✗" : "⚠"}</span>
                  <span className="font-semibold text-[var(--text-primary)]">{iss.dec}</span>
                  <span className="text-[var(--text-muted)]">— {iss.issue}</span>
                </div>)}
                {issues.length > 8 && <div className="text-[13px] text-[var(--text-muted)]">...and {issues.length - 8} more</div>}
              </div>;
            })()}
            {/* Matrix */}
            <div className="overflow-x-auto rounded-lg border border-[var(--border)]"><table className="w-full"><thead><tr className="bg-[var(--surface-2)]">
              <th className="px-3 py-2 text-left text-[13px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)] sticky left-0 bg-[var(--surface-2)] z-10 min-w-[200px]">Decision</th>
              <th className="px-2 py-2 text-center text-[13px] font-semibold text-[var(--text-muted)] border-b border-[var(--border)]">Cat.</th>
              {GOV_RAPID_ROLES.map(role => <th key={role} className="px-2 py-2 text-center text-[13px] font-semibold text-[var(--text-muted)] border-b border-[var(--border)] min-w-[90px]">{role}</th>)}
              <th className="px-2 py-2 text-center text-[13px] font-semibold text-[var(--text-muted)] border-b border-[var(--border)]">Valid</th>
            </tr></thead><tbody>
              {govDecisions.map(d => {
                const roles = govRapid[d.id] || {};
                const dCount = Object.values(roles).filter(v => v === "D").length;
                const hasAssignments = Object.keys(roles).length > 0;
                const valid = dCount === 1;
                const catColors: Record<string, string> = { Strategic: "#a78bb8", Tactical: "#f4a83a", Operational: "#8ba87a" };
                const rapidColors: Record<string, string> = { R: "#f4a83a", A: "#8ba87a", P: "#a78bb8", I: "#8a7f6d", D: "#f4a83a" };
                return <tr key={d.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-2)]/50">
                  <td className="px-3 py-2 text-[14px] font-semibold text-[var(--text-primary)] sticky left-0 bg-[var(--bg)] z-10">{d.name}</td>
                  <td className="px-2 py-2 text-center"><span className="text-[12px] font-bold" style={{ color: catColors[d.category] }}>{d.category[0]}</span></td>
                  {GOV_RAPID_ROLES.map(role => {
                    const val = roles[role] || "";
                    return <td key={role} className="px-2 py-2 text-center">
                      <button onClick={() => {
                        const cycle = ["", "R", "A", "P", "I", "D"];
                        const next = cycle[(cycle.indexOf(val) + 1) % cycle.length];
                        setGovRapid(prev => ({ ...prev, [d.id]: { ...(prev[d.id] || {}), [role]: next } }));
                      }} className="w-7 h-7 rounded-lg items-center justify-center text-[14px] font-bold inline-flex cursor-pointer transition-all" style={{
                        background: val ? `${rapidColors[val] || "#8a7f6d"}15` : "#1e2030",
                        color: val ? rapidColors[val] || "#8a7f6d" : "var(--border)",
                        border: val ? `1px solid ${rapidColors[val] || "#8a7f6d"}30` : "1px solid var(--border)",
                      }}>{val || "·"}</button>
                    </td>;
                  })}
                  <td className="px-2 py-2 text-center"><span style={{ color: !hasAssignments ? "#8a7f6d" : valid ? "#8ba87a" : "#e87a5d" }}>{!hasAssignments ? "—" : valid ? "✓" : "✗"}</span></td>
                </tr>;
              })}
            </tbody></table></div>
            <div className="flex gap-4 mt-3 text-[14px] text-[var(--text-muted)]">{[{l:"R",n:"Recommend",c:"#f4a83a"},{l:"A",n:"Agree (veto)",c:"#8ba87a"},{l:"P",n:"Perform",c:"#a78bb8"},{l:"I",n:"Input",c:"#8a7f6d"},{l:"D",n:"Decide (one only)",c:"#f4a83a"}].map(x => <span key={x.l} className="flex items-center gap-1"><span className="w-5 h-5 rounded text-[13px] font-bold flex items-center justify-center" style={{background:`${x.c}15`,color:x.c}}>{x.l}</span>{x.n}</span>)}</div>
          </Card>}

          {/* ─── 3. GOVERNANCE FORUM DESIGNER ─── */}
          {govView === "forums" && <Card title="Governance Forum Designer">
            <div className="text-[15px] text-[var(--text-secondary)] mb-4">Design governance bodies and link decisions to forums. Orphaned decisions (not assigned to any forum) are flagged.</div>
            {/* Orphan check */}
            {(() => {
              const orphans = govDecisions.filter(d => !d.forumId);
              if (orphans.length === 0) return null;
              return <div className="rounded-xl border border-[var(--warning)]/30 bg-[rgba(244,168,58,0.04)] p-3 mb-4">
                <div className="text-[14px] font-bold text-[var(--warning)] mb-1">⚠ {orphans.length} Orphaned Decision{orphans.length > 1 ? "s" : ""} — not assigned to any forum</div>
                <div className="flex flex-wrap gap-1">{orphans.slice(0, 10).map(d => <span key={d.id} className="px-2 py-0.5 rounded-full text-[13px] bg-[rgba(244,168,58,0.1)] text-[var(--warning)]">{d.name}</span>)}{orphans.length > 10 && <span className="text-[13px] text-[var(--text-muted)]">+{orphans.length - 10} more</span>}</div>
              </div>;
            })()}
            {/* Governance hierarchy visualization */}
            <div className="mb-5">
              <div className="text-[13px] font-semibold text-[var(--text-muted)] uppercase mb-3">Governance Hierarchy</div>
              <div className="space-y-3">
                {(() => {
                  const topLevel = govForums.filter(f => !f.parentId);
                  const renderForum = (forum: GovForum, depth: number): React.ReactNode => {
                    const children = govForums.filter(f => f.parentId === forum.id);
                    const linkedDecs = govDecisions.filter(d => d.forumId === forum.id);
                    const cadenceColors: Record<string, string> = { Weekly: "#8ba87a", "Bi-weekly": "#f4a83a", Monthly: "#f4a83a", Quarterly: "#a78bb8", "Ad hoc": "#8a7f6d" };
                    return <div key={forum.id} style={{ marginLeft: depth * 24 }}>
                      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3 mb-2">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            {depth > 0 && <span className="text-[var(--text-muted)]">↳</span>}
                            <span className="text-[15px] font-bold text-[var(--text-primary)]">{forum.name}</span>
                            <span className="px-2 py-0.5 rounded-full text-[12px] font-semibold" style={{ background: `${cadenceColors[forum.cadence] || "#8a7f6d"}12`, color: cadenceColors[forum.cadence] || "#8a7f6d" }}>{forum.cadence}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] text-[var(--text-muted)]">Chair: {forum.chair}</span>
                            <button onClick={() => setGovForums(prev => prev.filter(f => f.id !== forum.id))} className="text-[14px] text-[var(--text-muted)] hover:text-[var(--risk)]">×</button>
                          </div>
                        </div>
                        <div className="text-[14px] text-[var(--text-secondary)] mb-1">{forum.purpose}</div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[13px] text-[var(--text-muted)]">Members:</span>
                          {forum.members.map((m, i) => <span key={i} className="px-1.5 py-0.5 rounded bg-[var(--bg)] text-[13px] text-[var(--text-secondary)]">{m}</span>)}
                        </div>
                        {linkedDecs.length > 0 && <div className="mt-2 flex items-center gap-2 flex-wrap">
                          <span className="text-[13px] text-[var(--text-muted)]">Decisions ({linkedDecs.length}):</span>
                          {linkedDecs.map(d => <span key={d.id} className="px-2 py-0.5 rounded-full text-[12px] font-semibold bg-[rgba(244,168,58,0.08)] text-[var(--accent-primary)]">{d.name}</span>)}
                        </div>}
                      </div>
                      {children.map(c => renderForum(c, depth + 1))}
                    </div>;
                  };
                  return topLevel.map(f => renderForum(f, 0));
                })()}
              </div>
            </div>
            {/* Add forum */}
            {govAddingForum ? <div className="rounded-xl border border-[var(--accent-primary)]/30 bg-[rgba(244,168,58,0.04)] p-4 space-y-3">
              <div className="text-[15px] font-bold text-[var(--accent-primary)]">Add Governance Forum</div>
              <div className="grid grid-cols-2 gap-3">
                <input value={govNewForum.name} onChange={e => setGovNewForum(p => ({...p, name: e.target.value}))} placeholder="Forum name..." className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" />
                <input value={govNewForum.chair} onChange={e => setGovNewForum(p => ({...p, chair: e.target.value}))} placeholder="Chair (role/title)..." className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" />
                <input value={govNewForum.purpose} onChange={e => setGovNewForum(p => ({...p, purpose: e.target.value}))} placeholder="Purpose..." className="col-span-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" />
                <select value={govNewForum.cadence} onChange={e => setGovNewForum(p => ({...p, cadence: e.target.value}))} className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] text-[var(--text-primary)] outline-none">
                  <option>Weekly</option><option>Bi-weekly</option><option>Monthly</option><option>Quarterly</option><option>Ad hoc</option>
                </select>
                <select value={govNewForum.parentId} onChange={e => setGovNewForum(p => ({...p, parentId: e.target.value}))} className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] text-[var(--text-primary)] outline-none">
                  <option value="">No parent (top-level)</option>
                  {govForums.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
                <input value={govNewForum.members} onChange={e => setGovNewForum(p => ({...p, members: e.target.value}))} placeholder="Members (comma-separated)..." className="col-span-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => { if (!govNewForum.name.trim()) return; setGovForums(prev => [...prev, { id: `f${Date.now()}`, name: govNewForum.name, purpose: govNewForum.purpose, cadence: govNewForum.cadence, chair: govNewForum.chair, members: govNewForum.members.split(",").map(m => m.trim()).filter(Boolean), parentId: govNewForum.parentId }]); setGovNewForum({ name: "", purpose: "", cadence: "Monthly", chair: "", members: "", parentId: "" }); setGovAddingForum(false); }} className="px-4 py-2 rounded-lg text-[14px] font-semibold text-white" style={{ background: "#f4a83a" }}>Add Forum</button>
                <button onClick={() => setGovAddingForum(false)} className="px-4 py-2 rounded-lg text-[14px] font-semibold text-[var(--text-muted)] border border-[var(--border)]">Cancel</button>
              </div>
            </div> : <button onClick={() => setGovAddingForum(true)} className="w-full px-4 py-2 rounded-xl text-[14px] font-semibold text-[var(--text-muted)] border border-dashed border-[var(--border)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-all">+ Add Governance Forum</button>}
          </Card>}

          {/* ─── 4. BOTTLENECK ANALYZER ─── */}
          {govView === "bottlenecks" && <Card title="Decision Bottleneck Analyzer">
            <div className="text-[15px] text-[var(--text-secondary)] mb-4">Auto-identified bottlenecks and governance friction points based on your decision catalogue and RAPID assignments.</div>
            {(() => {
              // Analyze bottlenecks
              const undefinedClarity = govDecisions.filter(d => d.clarity === "Undefined");
              const slowStrategic = govDecisions.filter(d => d.category === "Strategic" && d.speed === "Slow");
              const slowTactical = govDecisions.filter(d => d.category === "Tactical" && d.speed === "Slow");
              const slowOps = govDecisions.filter(d => d.category === "Operational" && d.speed !== "Fast");
              // Bottleneck persons: who has "D" on too many decisions
              const deciderLoad: Record<string, { count: number; decisions: string[] }> = {};
              govDecisions.forEach(d => {
                const roles = govRapid[d.id] || {};
                Object.entries(roles).forEach(([role, v]) => {
                  if (v === "D") {
                    if (!deciderLoad[role]) deciderLoad[role] = { count: 0, decisions: [] };
                    deciderLoad[role].count++;
                    deciderLoad[role].decisions.push(d.name);
                  }
                });
                // Also check by owner
                if (!Object.values(roles).includes("D")) {
                  if (!deciderLoad[d.owner]) deciderLoad[d.owner] = { count: 0, decisions: [] };
                  deciderLoad[d.owner].count++;
                  deciderLoad[d.owner].decisions.push(d.name);
                }
              });
              const bottleneckPeople = Object.entries(deciderLoad).filter(([, v]) => v.count >= 4).sort((a, b) => b[1].count - a[1].count);
              // Veto bottlenecks: functions with too many A (Agree/veto) assignments
              const vetoByFunc: Record<string, number> = {};
              govDecisions.forEach(d => {
                const roles = govRapid[d.id] || {};
                Object.values(roles).forEach(v => { if (v === "A") vetoByFunc[d.func] = (vetoByFunc[d.func] || 0) + 1; });
              });
              const vetoBottlenecks = Object.entries(vetoByFunc).filter(([, v]) => v >= 3).sort((a, b) => b[1] - a[1]);
              // Orphaned decisions
              const orphanedDecs = govDecisions.filter(d => !d.forumId);
              // Overall health score
              const totalIssues = undefinedClarity.length + slowTactical.length + slowOps.length + bottleneckPeople.length + vetoBottlenecks.length + Math.floor(orphanedDecs.length / 3);
              const healthScore = Math.max(0, Math.min(100, 100 - totalIssues * 8));
              const healthColor = healthScore >= 70 ? "#8ba87a" : healthScore >= 40 ? "#f4a83a" : "#e87a5d";
              const healthLabel = healthScore >= 70 ? "Healthy" : healthScore >= 40 ? "Needs Attention" : "Critical";

              return <div className="space-y-5">
                {/* Health score */}
                <div className="grid grid-cols-4 gap-3">
                  <div className="rounded-xl p-4 bg-[var(--surface-2)] text-center col-span-1">
                    <div className="text-[24px] font-extrabold" style={{ color: healthColor, fontFamily: "'JetBrains Mono', monospace" }}>{healthScore}</div>
                    <div className="text-[13px] font-bold uppercase" style={{ color: healthColor }}>{healthLabel}</div>
                    <div className="text-[12px] text-[var(--text-muted)]">Governance Health</div>
                  </div>
                  <div className="rounded-xl p-4 bg-[var(--surface-2)] text-center">
                    <div className="text-[20px] font-extrabold text-[var(--risk)]">{undefinedClarity.length}</div>
                    <div className="text-[13px] text-[var(--text-muted)] uppercase">No Clear Owner</div>
                  </div>
                  <div className="rounded-xl p-4 bg-[var(--surface-2)] text-center">
                    <div className="text-[20px] font-extrabold text-[var(--warning)]">{bottleneckPeople.length}</div>
                    <div className="text-[13px] text-[var(--text-muted)] uppercase">Bottleneck Roles</div>
                  </div>
                  <div className="rounded-xl p-4 bg-[var(--surface-2)] text-center">
                    <div className="text-[20px] font-extrabold text-[var(--warning)]">{orphanedDecs.length}</div>
                    <div className="text-[13px] text-[var(--text-muted)] uppercase">Orphaned Decisions</div>
                  </div>
                </div>

                {/* Bottleneck people heatmap */}
                {bottleneckPeople.length > 0 && <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                  <div className="text-[13px] font-semibold text-[var(--text-muted)] uppercase mb-3">Decision Bottleneck Roles</div>
                  <div className="space-y-3">{bottleneckPeople.map(([role, data]) => {
                    const pct = Math.min(100, (data.count / govDecisions.length) * 100 * 3);
                    return <div key={role}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[15px] font-semibold text-[var(--text-primary)]">{role}</span>
                        <span className="text-[14px] font-bold" style={{ color: data.count >= 8 ? "#e87a5d" : "#f4a83a" }}>{data.count} decisions</span>
                      </div>
                      <div className="h-3 bg-[var(--bg)] rounded-full overflow-hidden mb-1"><div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: data.count >= 8 ? "#e87a5d" : "#f4a83a" }} /></div>
                      <div className="flex flex-wrap gap-1">{data.decisions.slice(0, 5).map(dn => <span key={dn} className="text-[12px] text-[var(--text-muted)] bg-[var(--bg)] px-1.5 py-0.5 rounded">{dn}</span>)}{data.decisions.length > 5 && <span className="text-[12px] text-[var(--text-muted)]">+{data.decisions.length - 5}</span>}</div>
                    </div>;
                  })}</div>
                </div>}

                {/* Undefined clarity */}
                {undefinedClarity.length > 0 && <div className="rounded-xl border border-[var(--risk)]/20 bg-[rgba(232,122,93,0.03)] p-4">
                  <div className="text-[14px] font-bold text-[var(--risk)] uppercase mb-2">Decisions with No Clear Owner ({undefinedClarity.length})</div>
                  <div className="space-y-2">{undefinedClarity.map(d => <div key={d.id} className="flex items-center justify-between p-2 rounded-lg bg-[var(--surface-2)]">
                    <span className="text-[14px] font-semibold text-[var(--text-primary)]">{d.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] text-[var(--text-muted)]">{d.func}</span>
                      <span className="px-2 py-0.5 rounded-full text-[12px] font-semibold bg-[rgba(232,122,93,0.1)] text-[var(--risk)]">{d.category}</span>
                    </div>
                  </div>)}</div>
                </div>}

                {/* Speed mismatches */}
                {(slowTactical.length > 0 || slowOps.length > 0) && <div className="rounded-xl border border-[var(--warning)]/20 bg-[rgba(244,168,58,0.03)] p-4">
                  <div className="text-[14px] font-bold text-[var(--warning)] uppercase mb-2">Speed Mismatches</div>
                  {slowTactical.length > 0 && <div className="mb-2"><div className="text-[13px] text-[var(--text-muted)] mb-1">Tactical decisions taking &gt;4 weeks (should be 1-4 weeks):</div><div className="flex flex-wrap gap-1">{slowTactical.map(d => <span key={d.id} className="px-2 py-0.5 rounded-full text-[13px] bg-[rgba(244,168,58,0.1)] text-[var(--warning)]">{d.name}</span>)}</div></div>}
                  {slowOps.length > 0 && <div><div className="text-[13px] text-[var(--text-muted)] mb-1">Operational decisions not fast (&lt;1 week):</div><div className="flex flex-wrap gap-1">{slowOps.map(d => <span key={d.id} className="px-2 py-0.5 rounded-full text-[13px] bg-[rgba(244,168,58,0.1)] text-[var(--warning)]">{d.name}</span>)}</div></div>}
                </div>}

                {/* Veto bottlenecks */}
                {vetoBottlenecks.length > 0 && <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                  <div className="text-[13px] font-semibold text-[var(--text-muted)] uppercase mb-2">Functions with Excessive Veto Points</div>
                  <div className="grid grid-cols-3 gap-3">{vetoBottlenecks.map(([func, count]) => <div key={func} className="rounded-lg p-3 bg-[var(--bg)] text-center">
                    <div className="text-[17px] font-extrabold text-[var(--warning)]">{count}</div>
                    <div className="text-[14px] text-[var(--text-primary)]">{func}</div>
                    <div className="text-[12px] text-[var(--text-muted)]">agree/veto gates</div>
                  </div>)}</div>
                </div>}

                {/* Recommendations */}
                <div className="rounded-xl border border-[var(--accent-primary)]/20 bg-[rgba(244,168,58,0.04)] p-4">
                  <div className="text-[14px] font-bold text-[var(--accent-primary)] uppercase mb-2">Recommendations</div>
                  <div className="space-y-2">
                    {bottleneckPeople.length > 0 && <div className="flex items-start gap-2 text-[14px]"><span className="text-[var(--accent-primary)] shrink-0 mt-0.5">→</span><span className="text-[var(--text-secondary)]">Consider delegating {bottleneckPeople.reduce((s, [, d]) => s + Math.max(0, d.count - 3), 0)} tactical/operational decisions from <strong>{bottleneckPeople[0][0]}</strong> to function heads to reduce decision concentration.</span></div>}
                    {undefinedClarity.length > 0 && <div className="flex items-start gap-2 text-[14px]"><span className="text-[var(--accent-primary)] shrink-0 mt-0.5">→</span><span className="text-[var(--text-secondary)]">Assign clear owners for {undefinedClarity.length} decision{undefinedClarity.length > 1 ? "s" : ""} with undefined clarity — ambiguity slows execution and creates organizational friction.</span></div>}
                    {orphanedDecs.length > 3 && <div className="flex items-start gap-2 text-[14px]"><span className="text-[var(--accent-primary)] shrink-0 mt-0.5">→</span><span className="text-[var(--text-secondary)]">{orphanedDecs.length} decisions are not linked to any governance forum. Assign each to a forum in the Decision Catalogue tab to ensure accountability.</span></div>}
                    {slowOps.length > 0 && <div className="flex items-start gap-2 text-[14px]"><span className="text-[var(--accent-primary)] shrink-0 mt-0.5">→</span><span className="text-[var(--text-secondary)]">{slowOps.length} operational decisions are slower than expected. Operational decisions should resolve in &lt;1 week — consider pre-approving or setting threshold-based auto-approval rules.</span></div>}
                    {vetoBottlenecks.length > 0 && <div className="flex items-start gap-2 text-[14px]"><span className="text-[var(--accent-primary)] shrink-0 mt-0.5">→</span><span className="text-[var(--text-secondary)]">{vetoBottlenecks[0][0]} has {vetoBottlenecks[0][1]} veto/agree gates — consider shifting from "Agree" to "Input" for lower-risk decisions to improve speed.</span></div>}
                    {totalIssues === 0 && <div className="flex items-start gap-2 text-[14px]"><span className="text-[var(--success)] shrink-0 mt-0.5">✓</span><span className="text-[var(--text-secondary)]">No significant governance bottlenecks detected. Your decision framework appears well-structured.</span></div>}
                  </div>
                </div>
              </div>;
            })()}
          </Card>}
        </div>}

        {/* ── Step 2.3: Process Architecture ── */}
        {omView === "2.3" && <div className="animate-tab-enter space-y-5">
          {/* Sub-navigation */}
          <div className="flex gap-1 rounded-xl bg-[var(--surface-2)] p-1 border border-[var(--border)]">
            {([
              { id: "map" as const, label: "E2E Process Map", icon: "🗺" },
              { id: "detail" as const, label: "Process Detail", icon: "🔍" },
              { id: "maturity" as const, label: "Maturity Assessment", icon: "📊" },
              { id: "capmap" as const, label: "Capability Mapping", icon: "🔗" },
              { id: "bottlenecks" as const, label: "Handoff Analyzer", icon: "⚡" },
            ]).map(v => <button key={v.id} onClick={() => setProcView(v.id)} className="flex-1 px-3 py-2 rounded-lg text-[14px] font-semibold transition-all" style={{
              background: procView === v.id ? "rgba(244,168,58,0.12)" : "transparent",
              color: procView === v.id ? "#f4a83a" : "#8a7f6d",
            }}>{v.icon} {v.label}</button>)}
          </div>

          {/* ─── 1. E2E PROCESS MAP ─── */}
          {procView === "map" && <Card title={<div>End-to-End Process Map<div style={{ fontSize: 11, color: "#8a7f6d", marginTop: 2, fontWeight: 400 }}>How work flows end-to-end</div></div>}>
            <div className="text-[15px] text-[var(--text-secondary)] mb-4">Core enterprise processes spanning multiple functions. Click any process to see detailed steps.</div>
            {/* Summary KPIs */}
            <div className="grid grid-cols-4 gap-3 mb-4">
              {[
                { label: "Processes", val: procProcesses.length, color: "var(--text-primary)" },
                { label: "Total Steps", val: procProcesses.reduce((s, p) => s + p.steps.length, 0), color: "#f4a83a" },
                { label: "Total Handoffs", val: procProcesses.reduce((s, p) => s + p.steps.filter(st => st.isHandoff).length, 0), color: "#f4a83a" },
                { label: "Avg Maturity", val: (() => { const rated = procProcesses.filter(p => p.maturity > 0); return rated.length ? (rated.reduce((s, p) => s + p.maturity, 0) / rated.length).toFixed(1) : "—"; })(), color: "#8ba87a" },
              ].map(k => <div key={k.label} className="rounded-xl p-3 bg-[var(--surface-2)] text-center"><div className="text-[20px] font-extrabold" style={{ color: k.color }}>{k.val}</div><div className="text-[13px] text-[var(--text-muted)] uppercase">{k.label}</div></div>)}
            </div>
            {/* Process cards */}
            <div className="space-y-3">
              {procProcesses.map(proc => {
                const handoffs = proc.steps.filter(s => s.isHandoff).length;
                const funcsInvolved = Array.from(new Set(proc.steps.map(s => s.func)));
                return <div key={proc.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 hover:border-[var(--accent-primary)]/30 transition-all cursor-pointer" onClick={() => { setProcSelectedId(proc.id); setProcView("detail"); }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="text-[16px] font-bold text-[var(--text-primary)]">{proc.name}</div>
                      {proc.maturity > 0 && <span className="px-2 py-0.5 rounded-full text-[12px] font-bold" style={{ background: `${proc.maturity >= 4 ? "#8ba87a" : proc.maturity >= 3 ? "#f4a83a" : "#f4a83a"}12`, color: proc.maturity >= 4 ? "#8ba87a" : proc.maturity >= 3 ? "#f4a83a" : "#f4a83a" }}>L{proc.maturity}</span>}
                    </div>
                    <div className="flex items-center gap-3 text-[14px] text-[var(--text-muted)]">
                      <span>{proc.steps.length} steps</span>
                      <span style={{ color: handoffs > 4 ? "#e87a5d" : handoffs > 2 ? "#f4a83a" : "#8a7f6d" }}>{handoffs} handoffs</span>
                      <span>{proc.cycleTime}</span>
                      <button onClick={e => { e.stopPropagation(); setProcProcesses(prev => prev.filter(p => p.id !== proc.id)); }} className="text-[var(--text-muted)] hover:text-[var(--risk)]">×</button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mb-2 text-[14px]">
                    <span className="text-[var(--text-muted)]">Owner: <strong className="text-[var(--text-secondary)]">{proc.owner}</strong></span>
                    <span className="text-[var(--border)]">|</span>
                    <span className="text-[var(--text-muted)]">{proc.trigger}</span>
                    <span className="text-[var(--text-muted)]">→</span>
                    <span className="text-[var(--text-muted)]">{proc.output}</span>
                  </div>
                  {/* Mini step flow */}
                  <div className="flex items-center gap-0.5 overflow-x-auto">
                    {proc.steps.map((step, si) => <React.Fragment key={step.id}>
                      {si > 0 && <span className="text-[12px] shrink-0" style={{ color: step.isHandoff ? "#f4a83a" : "#8a7f6d" }}>{step.isHandoff ? "⚡" : "→"}</span>}
                      <div className="px-2 py-1 rounded text-[12px] font-semibold shrink-0 border" style={{
                        background: `${PROC_FUNC_COLORS[step.func] || "#888"}08`,
                        borderColor: `${PROC_FUNC_COLORS[step.func] || "#888"}30`,
                        color: PROC_FUNC_COLORS[step.func] || "#8a7f6d",
                      }}>{step.name.length > 15 ? step.name.slice(0, 13) + "..." : step.name}</div>
                    </React.Fragment>)}
                  </div>
                  {/* Function tags */}
                  <div className="flex gap-1 mt-2">{funcsInvolved.map(f => <span key={f} className="px-1.5 py-0.5 rounded text-[11px] font-semibold" style={{ background: `${PROC_FUNC_COLORS[f] || "#888"}12`, color: PROC_FUNC_COLORS[f] || "#888" }}>{f}</span>)}</div>
                </div>;
              })}
            </div>
            {/* Add process */}
            {procAddingProcess ? <div className="rounded-xl border border-[var(--accent-primary)]/30 bg-[rgba(244,168,58,0.04)] p-4 mt-3 space-y-3">
              <div className="text-[15px] font-bold text-[var(--accent-primary)]">Add Custom Process</div>
              <div className="grid grid-cols-2 gap-3">
                <input value={procNewProc.name} onChange={e => setProcNewProc(p => ({...p, name: e.target.value}))} placeholder="Process name (e.g. Comply to Certify)..." className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" />
                <input value={procNewProc.owner} onChange={e => setProcNewProc(p => ({...p, owner: e.target.value}))} placeholder="Process owner (e.g. CTO)..." className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" />
                <input value={procNewProc.trigger} onChange={e => setProcNewProc(p => ({...p, trigger: e.target.value}))} placeholder="Start trigger..." className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" />
                <input value={procNewProc.output} onChange={e => setProcNewProc(p => ({...p, output: e.target.value}))} placeholder="End output..." className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" />
                <input value={procNewProc.functions} onChange={e => setProcNewProc(p => ({...p, functions: e.target.value}))} placeholder="Functions involved (comma-separated)..." className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" />
                <input value={procNewProc.cycleTime} onChange={e => setProcNewProc(p => ({...p, cycleTime: e.target.value}))} placeholder="Cycle time (e.g. 7-30 days)..." className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => { if (!procNewProc.name.trim()) return; setProcProcesses(prev => [...prev, { id: `p${Date.now()}`, name: procNewProc.name, owner: procNewProc.owner, trigger: procNewProc.trigger, output: procNewProc.output, functions: procNewProc.functions.split(",").map(f => f.trim()).filter(Boolean), cycleTime: procNewProc.cycleTime, steps: [], maturity: 0, industryBenchmark: 3.0 }]); setProcNewProc({ name: "", owner: "", trigger: "", output: "", functions: "", cycleTime: "" }); setProcAddingProcess(false); }} className="px-4 py-2 rounded-lg text-[14px] font-semibold text-white" style={{ background: "#f4a83a" }}>Add Process</button>
                <button onClick={() => setProcAddingProcess(false)} className="px-4 py-2 rounded-lg text-[14px] font-semibold text-[var(--text-muted)] border border-[var(--border)]">Cancel</button>
              </div>
            </div> : <button onClick={() => setProcAddingProcess(true)} className="w-full px-4 py-2 rounded-xl text-[14px] font-semibold text-[var(--text-muted)] border border-dashed border-[var(--border)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-all mt-3">+ Add Custom Process</button>}
          </Card>}

          {/* ─── 2. PROCESS DETAIL VIEW ─── */}
          {procView === "detail" && <Card title={procSelected ? `${procSelected.name} — Process Steps` : "Select a Process"}>
            {!procSelected ? <div className="text-center py-10">
              <div className="text-[40px] mb-3">🔍</div>
              <div className="text-[15px] text-[var(--text-muted)] mb-4">Select a process from the E2E Map to see its steps.</div>
              <button onClick={() => setProcView("map")} className="px-4 py-2 rounded-lg text-[14px] font-semibold text-[var(--accent-primary)] border border-[var(--accent-primary)]/30">Go to Process Map</button>
            </div> : <>
              {/* Process selector */}
              <div className="flex items-center gap-2 mb-4">
                <select value={procSelectedId || ""} onChange={e => setProcSelectedId(e.target.value)} className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[14px] text-[var(--text-primary)] outline-none">
                  {procProcesses.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <span className="text-[14px] text-[var(--text-muted)]">Owner: {procSelected.owner} | {procSelected.cycleTime}</span>
                <button onClick={async () => {
                  setProcAiGenerating(true);
                  try {
                    const raw = await callAI("Return ONLY valid JSON array.", `Generate 6-8 detailed process steps for the "${procSelected.name}" process. Each step: {"name":"step name","func":"owning function","duration":"estimate","system":"system used","automation":"Manual|Semi-Auto|Automated","isHandoff":true/false}. Mark cross-functional transitions as handoffs. Be specific to the process.`);
                    const steps = JSON.parse(raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
                    if (Array.isArray(steps)) { setProcProcesses(prev => prev.map(p => p.id === procSelected.id ? { ...p, steps: steps.map((s: Record<string, unknown>, i: number) => ({ ...s, id: `${procSelected.id}s${i+1}`, automation: s.automation || "Manual" })) as ProcStep[] } : p)); }
                  } catch { showToast("That took longer than expected. Try again in a moment."); }
                  setProcAiGenerating(false);
                }} disabled={procAiGenerating} className="ml-auto px-3 py-1.5 rounded-lg text-[14px] font-semibold text-white shrink-0" style={{ background: "linear-gradient(135deg, var(--accent-primary), var(--teal))", opacity: procAiGenerating ? 0.5 : 1 }}>{procAiGenerating ? "Generating..." : "✨ AI Generate Steps"}</button>
              </div>
              {/* Horizontal flow */}
              <div className="overflow-x-auto pb-3 mb-4">
                <div className="flex items-stretch gap-1 min-w-max">
                  {procSelected.steps.map((step, si) => {
                    const funcColor = PROC_FUNC_COLORS[step.func] || "#888";
                    const autoColors: Record<string, string> = { Manual: "#e87a5d", "Semi-Auto": "#f4a83a", Automated: "#8ba87a" };
                    return <React.Fragment key={step.id}>
                      {si > 0 && <div className="flex items-center shrink-0 px-1">
                        {step.isHandoff ? <div className="flex flex-col items-center"><span className="text-[14px] text-[var(--warning)]">⚡</span><span className="text-[9px] text-[var(--warning)] font-semibold">Handoff</span></div> : <span className="text-[var(--text-muted)]">→</span>}
                      </div>}
                      <div className="rounded-xl p-3 min-w-[140px] max-w-[160px] border-t-4" style={{ background: "#1e2030", border: `1px solid ${funcColor}25`, borderTopColor: funcColor, borderTopWidth: 4 }}>
                        <div className="text-[14px] font-bold text-[var(--text-primary)] mb-1 leading-tight">{step.name}</div>
                        <div className="text-[12px] font-semibold mb-1" style={{ color: funcColor }}>{step.func}</div>
                        <div className="text-[12px] text-[var(--text-muted)] mb-0.5">{step.duration}</div>
                        <div className="text-[12px] text-[var(--text-muted)] mb-1 truncate" title={step.system}>{step.system || "No system"}</div>
                        <span className="px-1.5 py-0.5 rounded text-[11px] font-semibold" style={{ background: `${autoColors[step.automation]}12`, color: autoColors[step.automation] }}>{step.automation}</span>
                        <button onClick={() => setProcProcesses(prev => prev.map(p => p.id === procSelected.id ? { ...p, steps: p.steps.filter(s => s.id !== step.id) } : p))} className="float-right text-[12px] text-[var(--text-muted)] hover:text-[var(--risk)] mt-1">×</button>
                      </div>
                    </React.Fragment>;
                  })}
                </div>
              </div>
              {/* Function legend */}
              <div className="flex gap-2 flex-wrap mb-4">{Array.from(new Set(procSelected.steps.map(s => s.func))).map(f => <span key={f} className="flex items-center gap-1 text-[13px]"><span className="w-3 h-1.5 rounded-full" style={{ background: PROC_FUNC_COLORS[f] || "#888" }} /><span style={{ color: PROC_FUNC_COLORS[f] || "#888" }}>{f}</span></span>)}</div>
              {/* Add step */}
              {procAddingStep ? <div className="rounded-xl border border-[var(--accent-primary)]/30 bg-[rgba(244,168,58,0.04)] p-4 space-y-3">
                <div className="text-[14px] font-bold text-[var(--accent-primary)]">Add Step</div>
                <div className="grid grid-cols-3 gap-2">
                  <input value={procNewStep.name} onChange={e => setProcNewStep(p => ({...p, name: e.target.value}))} placeholder="Step name..." className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" />
                  <input value={procNewStep.func} onChange={e => setProcNewStep(p => ({...p, func: e.target.value}))} placeholder="Function..." className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" />
                  <input value={procNewStep.duration} onChange={e => setProcNewStep(p => ({...p, duration: e.target.value}))} placeholder="Duration..." className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" />
                  <input value={procNewStep.system} onChange={e => setProcNewStep(p => ({...p, system: e.target.value}))} placeholder="System..." className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" />
                  <select value={procNewStep.automation} onChange={e => setProcNewStep(p => ({...p, automation: e.target.value as ProcStep["automation"]}))} className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-[14px] text-[var(--text-primary)] outline-none"><option>Manual</option><option>Semi-Auto</option><option>Automated</option></select>
                  <div className="flex gap-2">
                    <button onClick={() => { if (!procNewStep.name.trim()) return; setProcProcesses(prev => prev.map(p => p.id === procSelected.id ? { ...p, steps: [...p.steps, { id: `${procSelected.id}s${Date.now()}`, name: procNewStep.name, func: procNewStep.func, duration: procNewStep.duration, system: procNewStep.system, automation: procNewStep.automation, isHandoff: p.steps.length > 0 && p.steps[p.steps.length-1].func !== procNewStep.func }] } : p)); setProcNewStep({ name: "", func: "Operations", duration: "", system: "", automation: "Manual" }); }} className="px-3 py-1.5 rounded-lg text-[14px] font-semibold text-white" style={{ background: "#f4a83a" }}>Add</button>
                    <button onClick={() => setProcAddingStep(false)} className="px-3 py-1.5 rounded-lg text-[14px] font-semibold text-[var(--text-muted)] border border-[var(--border)]">Done</button>
                  </div>
                </div>
              </div> : <button onClick={() => setProcAddingStep(true)} className="px-4 py-2 rounded-xl text-[14px] font-semibold text-[var(--text-muted)] border border-dashed border-[var(--border)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-all w-full">+ Add Step</button>}
            </>}
          </Card>}

          {/* ─── 3. PROCESS MATURITY ASSESSMENT ─── */}
          {procView === "maturity" && <Card title="Process Maturity Assessment">
            <div className="text-[15px] text-[var(--text-secondary)] mb-4">Rate each process on a 1-5 maturity scale. Industry benchmarks shown for comparison.</div>
            {/* Radar chart data + maturity levels legend */}
            {(() => {
              const rated = procProcesses.filter(p => p.maturity > 0);
              const avgMaturity = rated.length ? (rated.reduce((s, p) => s + p.maturity, 0) / rated.length) : 0;
              const avgBenchmark = procProcesses.length ? (procProcesses.reduce((s, p) => s + p.industryBenchmark, 0) / procProcesses.length) : 0;
              return <>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="rounded-xl p-3 bg-[var(--surface-2)] text-center"><div className="text-[20px] font-extrabold" style={{ color: avgMaturity >= 3.5 ? "#8ba87a" : avgMaturity >= 2.5 ? "#f4a83a" : "#e87a5d" }}>{avgMaturity ? avgMaturity.toFixed(1) : "—"}</div><div className="text-[13px] text-[var(--text-muted)] uppercase">Your Average</div></div>
                  <div className="rounded-xl p-3 bg-[var(--surface-2)] text-center"><div className="text-[20px] font-extrabold text-[var(--accent-primary)]">{avgBenchmark.toFixed(1)}</div><div className="text-[13px] text-[var(--text-muted)] uppercase">Industry Average</div></div>
                  <div className="rounded-xl p-3 bg-[var(--surface-2)] text-center"><div className="text-[20px] font-extrabold" style={{ color: avgMaturity >= avgBenchmark ? "#8ba87a" : "#e87a5d" }}>{avgMaturity ? (avgMaturity - avgBenchmark >= 0 ? "+" : "") + (avgMaturity - avgBenchmark).toFixed(1) : "—"}</div><div className="text-[13px] text-[var(--text-muted)] uppercase">Gap</div></div>
                </div>
                {/* Radar */}
                <div className="h-[280px] mb-4">
                  <RadarViz data={procProcesses.map(p => ({ subject: p.name.length > 16 ? p.name.slice(0, 14) + "..." : p.name, current: p.maturity || 0, benchmark: p.industryBenchmark, max: 5 }))} />
                </div>
              </>;
            })()}
            {/* Maturity rating table */}
            <div className="overflow-x-auto rounded-lg border border-[var(--border)]"><table className="w-full"><thead><tr className="bg-[var(--surface-2)]">
              <th className="px-3 py-2 text-left text-[13px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">Process</th>
              {[1,2,3,4,5].map(n => <th key={n} className="px-2 py-2 text-center text-[13px] font-semibold text-[var(--text-muted)] border-b border-[var(--border)]">{n}</th>)}
              <th className="px-2 py-2 text-center text-[13px] font-semibold text-[var(--text-muted)] border-b border-[var(--border)]">Benchmark</th>
              <th className="px-2 py-2 text-center text-[13px] font-semibold text-[var(--text-muted)] border-b border-[var(--border)]">Gap</th>
            </tr></thead><tbody>
              {procProcesses.map(proc => {
                const gap = proc.maturity > 0 ? proc.maturity - proc.industryBenchmark : 0;
                return <tr key={proc.id} className="border-b border-[var(--border)]">
                  <td className="px-3 py-2 text-[14px] font-semibold text-[var(--text-primary)]">{proc.name}<div className="text-[12px] text-[var(--text-muted)]">{proc.owner}</div></td>
                  {[1,2,3,4,5].map(n => <td key={n} className="px-2 py-2 text-center"><button onClick={() => setProcProcesses(prev => prev.map(p => p.id === proc.id ? { ...p, maturity: p.maturity === n ? 0 : n } : p))} className="w-7 h-7 rounded-lg text-[14px] font-bold transition-all" style={{
                    background: proc.maturity >= n ? `${n <= 2 ? "#e87a5d" : n <= 3 ? "#f4a83a" : "#8ba87a"}20` : "#1e2030",
                    color: proc.maturity >= n ? (n <= 2 ? "#e87a5d" : n <= 3 ? "#f4a83a" : "#8ba87a") : "#8a7f6d",
                  }}>{n}</button></td>)}
                  <td className="px-2 py-2 text-center text-[14px] font-semibold text-[var(--accent-primary)]">{proc.industryBenchmark.toFixed(1)}</td>
                  <td className="px-2 py-2 text-center text-[14px] font-bold" style={{ color: proc.maturity === 0 ? "#8a7f6d" : gap >= 0 ? "#8ba87a" : "#e87a5d" }}>{proc.maturity === 0 ? "—" : (gap >= 0 ? "+" : "") + gap.toFixed(1)}</td>
                </tr>;
              })}
            </tbody></table></div>
            <div className="flex gap-3 mt-2 text-[13px] text-[var(--text-muted)]">{["1=Ad Hoc", "2=Repeatable", "3=Defined", "4=Managed", "5=Optimized"].map(l => <span key={l}>{l}</span>)}</div>
            {/* Gap insights */}
            {(() => {
              const gaps = procProcesses.filter(p => p.maturity > 0 && p.maturity < p.industryBenchmark).sort((a, b) => (a.maturity - a.industryBenchmark) - (b.maturity - b.industryBenchmark));
              if (gaps.length === 0) return null;
              return <div className="mt-4 rounded-xl border border-[var(--warning)]/20 bg-[rgba(244,168,58,0.04)] p-4">
                <div className="text-[14px] font-bold text-[var(--warning)] uppercase mb-2">Gap Analysis — Below Industry Benchmark</div>
                <div className="space-y-2">{gaps.map(p => <div key={p.id} className="flex items-center gap-2 text-[14px]">
                  <span className="text-[var(--warning)]">⚠</span>
                  <span className="text-[var(--text-secondary)]">Your <strong>{p.name}</strong> process is at Level {p.maturity} vs. industry average Level {p.industryBenchmark.toFixed(1)} — gap of {(p.industryBenchmark - p.maturity).toFixed(1)}</span>
                </div>)}</div>
              </div>;
            })()}
          </Card>}

          {/* ─── 4. PROCESS-TO-CAPABILITY MAPPING ─── */}
          {procView === "capmap" && <Card title="Process-to-Capability Mapping">
            <div className="text-[15px] text-[var(--text-secondary)] mb-4">Map which capabilities enable which processes. Click cells to toggle. Gaps highlight where low-maturity capabilities constrain critical processes.</div>
            {(() => {
              // Use stratCapabilities from earlier
              const caps = stratCapabilities.length > 0 ? stratCapabilities.slice(0, 15) : activeCoreLayer.map(c => c.replace(archD.coreSuffix, "")).slice(0, 15);
              return <div className="overflow-x-auto rounded-lg border border-[var(--border)]"><table className="w-full"><thead><tr className="bg-[var(--surface-2)]">
                <th className="px-3 py-2 text-left text-[13px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)] sticky left-0 bg-[var(--surface-2)] z-10 min-w-[160px]">Process</th>
                {caps.map(cap => <th key={cap} className="px-1 py-2 text-center border-b border-[var(--border)]" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", minWidth: 36 }}><span className="text-[12px] font-semibold text-[var(--text-muted)]">{cap.length > 18 ? cap.slice(0, 16) + "..." : cap}</span></th>)}
              </tr></thead><tbody>
                {procProcesses.map(proc => <tr key={proc.id} className="border-b border-[var(--border)]">
                  <td className="px-3 py-2 text-[14px] font-semibold text-[var(--text-primary)] sticky left-0 bg-[var(--bg)] z-10">{proc.name}</td>
                  {caps.map(cap => {
                    const key = `${proc.id}__${cap}`;
                    const linked = procCapMatrix[key] === "1";
                    const capMaturity = maturityScores[cap] || 0;
                    const isGap = linked && capMaturity > 0 && capMaturity <= 2;
                    return <td key={cap} className="px-1 py-2 text-center">
                      <button onClick={() => setProcCapMatrix(prev => ({ ...prev, [key]: linked ? "" : "1" }))} className="w-6 h-6 rounded transition-all" style={{
                        background: isGap ? "rgba(232,122,93,0.15)" : linked ? "rgba(244,168,58,0.15)" : "#1e2030",
                        border: isGap ? "1px solid var(--risk)" : linked ? "1px solid var(--accent-primary)" : "1px solid var(--border)",
                        color: isGap ? "#e87a5d" : linked ? "#f4a83a" : "var(--border)",
                      }}>{isGap ? "!" : linked ? "●" : ""}</button>
                    </td>;
                  })}
                </tr>)}
              </tbody></table></div>;
            })()}
            <div className="flex gap-4 mt-2 text-[13px] text-[var(--text-muted)]">
              <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-[rgba(244,168,58,0.15)] border border-[var(--accent-primary)] text-[var(--accent-primary)] text-[12px] text-center font-bold">●</span> Linked</span>
              <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-[rgba(232,122,93,0.15)] border border-[var(--risk)] text-[var(--risk)] text-[12px] text-center font-bold">!</span> Gap — capability maturity too low</span>
            </div>
          </Card>}

          {/* ─── 5. HANDOFF & BOTTLENECK ANALYZER ─── */}
          {procView === "bottlenecks" && <Card title="Handoff & Bottleneck Analyzer">
            <div className="text-[15px] text-[var(--text-secondary)] mb-4">Identifies cross-functional handoffs, bottleneck processes, and improvement opportunities.</div>
            {(() => {
              const analysis = procProcesses.map(proc => {
                const totalHandoffs = proc.steps.filter(s => s.isHandoff).length;
                const crossFuncHandoffs = proc.steps.filter((s, i) => i > 0 && s.func !== proc.steps[i-1].func).length;
                const manualSteps = proc.steps.filter(s => s.automation === "Manual").length;
                const noSystemHandoffs = proc.steps.filter(s => s.isHandoff && (!s.system || s.system === "No system")).length;
                const uniqueFuncs = new Set(proc.steps.map(s => s.func)).size;
                const complexity = totalHandoffs * 2 + manualSteps + crossFuncHandoffs;
                return { proc, totalHandoffs, crossFuncHandoffs, manualSteps, noSystemHandoffs, uniqueFuncs, complexity };
              }).sort((a, b) => b.complexity - a.complexity);

              const highHandoff = analysis.filter(a => a.totalHandoffs > 4);
              const unsupported = analysis.filter(a => a.noSystemHandoffs > 0);
              const totalCrossFunc = analysis.reduce((s, a) => s + a.crossFuncHandoffs, 0);

              return <div className="space-y-5">
                {/* KPIs */}
                <div className="grid grid-cols-4 gap-3">
                  <div className="rounded-xl p-3 bg-[var(--surface-2)] text-center"><div className="text-[20px] font-extrabold text-[var(--text-primary)]">{analysis.reduce((s, a) => s + a.totalHandoffs, 0)}</div><div className="text-[13px] text-[var(--text-muted)] uppercase">Total Handoffs</div></div>
                  <div className="rounded-xl p-3 bg-[var(--surface-2)] text-center"><div className="text-[20px] font-extrabold text-[var(--warning)]">{totalCrossFunc}</div><div className="text-[13px] text-[var(--text-muted)] uppercase">Cross-Functional</div></div>
                  <div className="rounded-xl p-3 bg-[var(--surface-2)] text-center"><div className="text-[20px] font-extrabold text-[var(--risk)]">{highHandoff.length}</div><div className="text-[13px] text-[var(--text-muted)] uppercase">High Handoff (&gt;4)</div></div>
                  <div className="rounded-xl p-3 bg-[var(--surface-2)] text-center"><div className="text-[20px] font-extrabold text-[var(--risk)]">{unsupported.reduce((s, a) => s + a.noSystemHandoffs, 0)}</div><div className="text-[13px] text-[var(--text-muted)] uppercase">Unsupported Handoffs</div></div>
                </div>
                {/* Bottleneck heatmap */}
                <div className="space-y-2">
                  <div className="text-[14px] font-bold text-[var(--text-muted)] uppercase">Process Complexity Ranking</div>
                  {analysis.map(a => {
                    const maxComplexity = Math.max(...analysis.map(x => x.complexity), 1);
                    const pct = (a.complexity / maxComplexity) * 100;
                    const color = a.complexity >= maxComplexity * 0.7 ? "#e87a5d" : a.complexity >= maxComplexity * 0.4 ? "#f4a83a" : "#8ba87a";
                    return <div key={a.proc.id} className="rounded-lg bg-[var(--surface-2)] p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[14px] font-semibold text-[var(--text-primary)]">{a.proc.name}</span>
                        <div className="flex items-center gap-3 text-[13px]">
                          <span className="text-[var(--text-muted)]">{a.proc.steps.length} steps</span>
                          <span style={{ color: a.totalHandoffs > 4 ? "#e87a5d" : "#8a7f6d" }}>{a.totalHandoffs} handoffs</span>
                          <span style={{ color: a.crossFuncHandoffs > 3 ? "#f4a83a" : "#8a7f6d" }}>{a.crossFuncHandoffs} cross-func</span>
                          <span className="text-[var(--text-muted)]">{a.uniqueFuncs} functions</span>
                          <span style={{ color: a.manualSteps > 3 ? "#e87a5d" : "#8a7f6d" }}>{a.manualSteps} manual</span>
                        </div>
                      </div>
                      <div className="h-2.5 bg-[var(--bg)] rounded-full overflow-hidden"><div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} /></div>
                    </div>;
                  })}
                </div>
                {/* Flagged issues */}
                {(highHandoff.length > 0 || unsupported.length > 0) && <div className="rounded-xl border border-[var(--warning)]/20 bg-[rgba(244,168,58,0.04)] p-4">
                  <div className="text-[14px] font-bold text-[var(--warning)] uppercase mb-2">Flagged Issues</div>
                  <div className="space-y-2">
                    {highHandoff.map(a => <div key={`hh-${a.proc.id}`} className="flex items-start gap-2 text-[14px]"><span className="text-[var(--risk)] shrink-0 mt-0.5">⚠</span><span className="text-[var(--text-secondary)]"><strong>{a.proc.name}</strong> has {a.totalHandoffs} handoffs ({a.crossFuncHandoffs} cross-functional) — high complexity drives delays and errors.</span></div>)}
                    {unsupported.map(a => <div key={`us-${a.proc.id}`} className="flex items-start gap-2 text-[14px]"><span className="text-[var(--risk)] shrink-0 mt-0.5">✗</span><span className="text-[var(--text-secondary)]"><strong>{a.proc.name}</strong> has {a.noSystemHandoffs} handoff{a.noSystemHandoffs > 1 ? "s" : ""} with no supporting system — manual transitions are error-prone.</span></div>)}
                  </div>
                </div>}
                {/* Recommendations */}
                <div className="rounded-xl border border-[var(--accent-primary)]/20 bg-[rgba(244,168,58,0.04)] p-4">
                  <div className="text-[14px] font-bold text-[var(--accent-primary)] uppercase mb-2">Recommendations</div>
                  <div className="space-y-2">
                    {analysis.filter(a => a.totalHandoffs > 4).slice(0, 3).map(a => {
                      const consecutiveSameFunc = a.proc.steps.reduce((groups: { func: string; count: number; start: number }[], step, i) => {
                        if (i === 0 || step.func !== a.proc.steps[i-1].func) groups.push({ func: step.func, count: 1, start: i });
                        else groups[groups.length-1].count++;
                        return groups;
                      }, []);
                      const mergeable = consecutiveSameFunc.filter(g => g.count === 1).length;
                      return <div key={a.proc.id} className="flex items-start gap-2 text-[14px]"><span className="text-[var(--accent-primary)] shrink-0 mt-0.5">→</span><span className="text-[var(--text-secondary)]">Consolidate single-step function handoffs in <strong>{a.proc.name}</strong> to potentially eliminate {Math.min(mergeable, a.crossFuncHandoffs - 2)} handoffs and reduce cycle time.</span></div>;
                    })}
                    {analysis.filter(a => a.manualSteps >= 3).slice(0, 2).map(a => <div key={`auto-${a.proc.id}`} className="flex items-start gap-2 text-[14px]"><span className="text-[var(--accent-primary)] shrink-0 mt-0.5">→</span><span className="text-[var(--text-secondary)]"><strong>{a.proc.name}</strong> has {a.manualSteps} manual steps — automate data handoffs to reduce processing time and error rates.</span></div>)}
                    {analysis.every(a => a.totalHandoffs <= 4 && a.manualSteps < 3) && <div className="flex items-start gap-2 text-[14px]"><span className="text-[var(--success)] shrink-0 mt-0.5">✓</span><span className="text-[var(--text-secondary)]">No critical bottlenecks detected. Processes are within acceptable complexity thresholds.</span></div>}
                  </div>
                </div>
              </div>;
            })()}
          </Card>}
        </div>}

        {/* ── Step 2.4: Technology & Systems ── */}
        {omView === "2.4" && <div className="animate-tab-enter space-y-5">
          {/* Sub-navigation */}
          <div className="flex gap-1 rounded-xl bg-[var(--surface-2)] p-1 border border-[var(--border)]">
            {([
              { id: "portfolio" as const, label: "App Portfolio", icon: "📋" },
              { id: "capmap" as const, label: "Capability Map", icon: "🔗" },
              { id: "rationalize" as const, label: "Rationalization", icon: "🔧" },
              { id: "dataflow" as const, label: "Data Flows", icon: "🔄" },
              { id: "aiready" as const, label: "AI Readiness", icon: "🤖" },
            ]).map(v => <button key={v.id} onClick={() => setTechView(v.id)} className="flex-1 px-3 py-2 rounded-lg text-[14px] font-semibold transition-all" style={{
              background: techView === v.id ? "rgba(244,168,58,0.12)" : "transparent",
              color: techView === v.id ? "#f4a83a" : "#8a7f6d",
            }}>{v.icon} {v.label}</button>)}
          </div>

          {/* ─── 1. APPLICATION PORTFOLIO ─── */}
          {techView === "portfolio" && <Card title="Application Portfolio Inventory">
            <div className="text-[15px] text-[var(--text-secondary)] mb-4">Enterprise application landscape. Click the pencil to edit, × to remove.</div>
            {/* Filters + summary */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-[13px] text-[var(--text-muted)]">Category:</span>
                <select value={techCatFilter} onChange={e => setTechCatFilter(e.target.value)} className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-2 py-1 text-[14px] text-[var(--text-primary)] outline-none">
                  <option value="All">All</option>{TECH_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <span className="text-[13px] text-[var(--text-muted)] ml-2">Status:</span>
                <select value={techStatusFilter} onChange={e => setTechStatusFilter(e.target.value)} className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-2 py-1 text-[14px] text-[var(--text-primary)] outline-none">
                  <option value="All">All</option><option>Invest</option><option>Maintain</option><option>Migrate</option><option>Retire</option>
                </select>
              </div>
              <button onClick={() => setTechAddingSystem(true)} className="px-3 py-1.5 rounded-lg text-[14px] font-semibold text-white" style={{ background: "linear-gradient(135deg, var(--accent-primary), var(--teal))" }}>+ Add System</button>
            </div>
            {/* KPIs */}
            <div className="grid grid-cols-5 gap-2 mb-4">
              {[
                { label: "Total Systems", val: techSystems.length, color: "var(--text-primary)" },
                { label: "Invest", val: techSystems.filter(s => s.status === "Invest").length, color: "#8ba87a" },
                { label: "Maintain", val: techSystems.filter(s => s.status === "Maintain").length, color: "#f4a83a" },
                { label: "Migrate", val: techSystems.filter(s => s.status === "Migrate").length, color: "#f4a83a" },
                { label: "Retire", val: techSystems.filter(s => s.status === "Retire").length, color: "#e87a5d" },
              ].map(k => <div key={k.label} className="rounded-xl p-2.5 bg-[var(--surface-2)] text-center"><div className="text-[17px] font-extrabold" style={{ color: k.color }}>{k.val}</div><div className="text-[12px] text-[var(--text-muted)] uppercase">{k.label}</div></div>)}
            </div>
            {/* Add form */}
            {techAddingSystem && <div className="rounded-xl border border-[var(--accent-primary)]/30 bg-[rgba(244,168,58,0.04)] p-4 mb-4 space-y-3">
              <div className="text-[15px] font-bold text-[var(--accent-primary)]">Add System</div>
              {(() => {
                const [ns, setNs] = [techEditingId ? techSystems.find(s => s.id === techEditingId) : null, null] as const; void ns; void setNs;
                return <div className="grid grid-cols-3 gap-2">
                  <input id="tech-name" placeholder="System name..." className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" />
                  <input id="tech-vendor" placeholder="Vendor..." className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" />
                  <select id="tech-cat" className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[14px] text-[var(--text-primary)] outline-none">{TECH_CATEGORIES.map(c => <option key={c}>{c}</option>)}</select>
                  <input id="tech-users" placeholder="# Users..." className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" />
                  <input id="tech-cost" placeholder="Annual cost..." className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" />
                  <input id="tech-age" placeholder="Age/version..." className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" />
                </div>;
              })()}
              <div className="flex gap-2">
                <button onClick={() => {
                  const el = (id: string) => (document.getElementById(id) as HTMLInputElement | HTMLSelectElement)?.value || "";
                  const name = el("tech-name"); if (!name) return;
                  setTechSystems(prev => [...prev, { id: `t${Date.now()}`, name, vendor: el("tech-vendor"), category: el("tech-cat"), functions: [], capabilities: [], processes: [], users: el("tech-users"), annualCost: el("tech-cost"), age: el("tech-age"), integration: "Partial", status: "Maintain", apiReady: "Needs Investment", dataQuality: "Medium" }]);
                  setTechAddingSystem(false);
                }} className="px-4 py-2 rounded-lg text-[14px] font-semibold text-white" style={{ background: "#f4a83a" }}>Add</button>
                <button onClick={() => setTechAddingSystem(false)} className="px-4 py-2 rounded-lg text-[14px] font-semibold text-[var(--text-muted)] border border-[var(--border)]">Cancel</button>
              </div>
            </div>}
            {/* Table */}
            <div className="overflow-x-auto rounded-lg border border-[var(--border)]"><table className="w-full text-[14px]"><thead><tr className="bg-[var(--surface-2)]">
              {["System","Vendor","Category","Functions","Users","Cost","Age","Integration","Status",""].map(h => <th key={h} className="px-2 py-2 text-left text-[12px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)] whitespace-nowrap">{h}</th>)}
            </tr></thead><tbody>
              {techSystems.filter(s => (techCatFilter === "All" || s.category === techCatFilter) && (techStatusFilter === "All" || s.status === techStatusFilter)).map(sys => {
                const statusColors: Record<string, string> = { Invest: "#8ba87a", Maintain: "#f4a83a", Migrate: "#f4a83a", Retire: "#e87a5d" };
                const intColors: Record<string, string> = { Standalone: "#e87a5d", Partial: "#f4a83a", "Fully Integrated": "#8ba87a" };
                const isEditing = techEditingId === sys.id;
                const update = (field: string, val: unknown) => setTechSystems(prev => prev.map(s => s.id === sys.id ? { ...s, [field]: val } : s));
                return <tr key={sys.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-2)]/50">
                  <td className="px-2 py-2 font-semibold text-[var(--text-primary)]">{isEditing ? <input value={sys.name} onChange={e => update("name", e.target.value)} className="bg-[var(--bg)] border border-[var(--border)] rounded px-1 py-0.5 text-[13px] w-28 outline-none" /> : sys.name}</td>
                  <td className="px-2 py-2 text-[var(--text-secondary)]">{isEditing ? <input value={sys.vendor} onChange={e => update("vendor", e.target.value)} className="bg-[var(--bg)] border border-[var(--border)] rounded px-1 py-0.5 text-[13px] w-20 outline-none" /> : sys.vendor}</td>
                  <td className="px-2 py-2"><span className="px-1.5 py-0.5 rounded text-[12px] font-semibold bg-[var(--surface-2)] text-[var(--text-secondary)]">{isEditing ? <select value={sys.category} onChange={e => update("category", e.target.value)} className="bg-[var(--bg)] border border-[var(--border)] rounded px-1 py-0.5 text-[12px] outline-none">{TECH_CATEGORIES.map(c => <option key={c}>{c}</option>)}</select> : sys.category}</span></td>
                  <td className="px-2 py-2 text-[13px] text-[var(--text-muted)]">{sys.functions.join(", ") || "—"}</td>
                  <td className="px-2 py-2 text-[var(--text-secondary)]">{sys.users}</td>
                  <td className="px-2 py-2 text-[var(--text-secondary)]">{sys.annualCost}</td>
                  <td className="px-2 py-2 text-[var(--text-muted)]">{sys.age}</td>
                  <td className="px-2 py-2">{isEditing ? <select value={sys.integration} onChange={e => update("integration", e.target.value)} className="bg-[var(--bg)] border border-[var(--border)] rounded px-1 py-0.5 text-[12px] outline-none"><option>Standalone</option><option>Partial</option><option>Fully Integrated</option></select> : <span className="text-[12px] font-semibold" style={{ color: intColors[sys.integration] }}>{sys.integration}</span>}</td>
                  <td className="px-2 py-2">{isEditing ? <select value={sys.status} onChange={e => update("status", e.target.value)} className="bg-[var(--bg)] border border-[var(--border)] rounded px-1 py-0.5 text-[12px] outline-none"><option>Invest</option><option>Maintain</option><option>Migrate</option><option>Retire</option></select> : <span className="px-1.5 py-0.5 rounded-full text-[12px] font-bold" style={{ background: `${statusColors[sys.status]}12`, color: statusColors[sys.status] }}>{sys.status}</span>}</td>
                  <td className="px-2 py-2"><div className="flex gap-1">
                    <button onClick={() => setTechEditingId(isEditing ? null : sys.id)} className="text-[13px] text-[var(--text-muted)] hover:text-[var(--accent-primary)]">{isEditing ? "✓" : "✎"}</button>
                    <button onClick={() => setTechSystems(prev => prev.filter(s => s.id !== sys.id))} className="text-[13px] text-[var(--text-muted)] hover:text-[var(--risk)]">×</button>
                  </div></td>
                </tr>;
              })}
            </tbody></table></div>
          </Card>}

          {/* ─── 2. CAPABILITY-TO-SYSTEM MAPPING ─── */}
          {techView === "capmap" && <Card title="Capability-to-System Coverage Map">
            <div className="text-[15px] text-[var(--text-secondary)] mb-4">Map which systems support which capabilities. Red = unsupported, amber = single system, green = well-covered.</div>
            {(() => {
              const caps = stratCapabilities.length > 0 ? stratCapabilities.slice(0, 12) : activeCoreLayer.map(c => c.replace(archD.coreSuffix, "")).slice(0, 12);
              // Coverage analysis
              const coverage: Record<string, { systems: string[]; level: "none" | "partial" | "covered" | "redundant" }> = {};
              caps.forEach(cap => {
                const linked = techSystems.filter(sys => {
                  const key = `${cap}__${sys.id}`;
                  return techCapMatrix[key] === "1" || sys.capabilities.some(c => c.toLowerCase().includes(cap.toLowerCase().split(" ")[0]));
                });
                coverage[cap] = { systems: linked.map(s => s.name), level: linked.length === 0 ? "none" : linked.length === 1 ? "partial" : linked.length >= 3 ? "redundant" : "covered" };
              });
              const unsupported = Object.entries(coverage).filter(([, v]) => v.level === "none");
              const redundant = Object.entries(coverage).filter(([, v]) => v.level === "redundant");
              return <>
                {/* Summary */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                  <div className="rounded-xl p-2.5 bg-[var(--surface-2)] text-center"><div className="text-[17px] font-extrabold text-[var(--success)]">{Object.values(coverage).filter(v => v.level === "covered").length}</div><div className="text-[12px] text-[var(--text-muted)] uppercase">Well Covered</div></div>
                  <div className="rounded-xl p-2.5 bg-[var(--surface-2)] text-center"><div className="text-[17px] font-extrabold text-[var(--warning)]">{Object.values(coverage).filter(v => v.level === "partial").length}</div><div className="text-[12px] text-[var(--text-muted)] uppercase">Single System</div></div>
                  <div className="rounded-xl p-2.5 bg-[var(--surface-2)] text-center"><div className="text-[17px] font-extrabold text-[var(--risk)]">{unsupported.length}</div><div className="text-[12px] text-[var(--text-muted)] uppercase">Unsupported</div></div>
                  <div className="rounded-xl p-2.5 bg-[var(--surface-2)] text-center"><div className="text-[17px] font-extrabold text-[var(--purple)]">{redundant.length}</div><div className="text-[12px] text-[var(--text-muted)] uppercase">Redundant (3+)</div></div>
                </div>
                {/* Matrix */}
                <div className="overflow-x-auto rounded-lg border border-[var(--border)]"><table className="w-full"><thead><tr className="bg-[var(--surface-2)]">
                  <th className="px-3 py-2 text-left text-[12px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)] sticky left-0 bg-[var(--surface-2)] z-10 min-w-[140px]">Capability</th>
                  {techSystems.map(sys => <th key={sys.id} className="px-1 py-2 text-center border-b border-[var(--border)]" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", minWidth: 32 }}><span className="text-[11px] font-semibold text-[var(--text-muted)]">{sys.name.length > 14 ? sys.name.slice(0, 12) + ".." : sys.name}</span></th>)}
                  <th className="px-2 py-2 text-center text-[12px] font-semibold text-[var(--text-muted)] border-b border-[var(--border)]">Level</th>
                </tr></thead><tbody>
                  {caps.map(cap => {
                    const cov = coverage[cap];
                    const levelColors: Record<string, string> = { none: "#e87a5d", partial: "#f4a83a", covered: "#8ba87a", redundant: "#a78bb8" };
                    const levelLabels: Record<string, string> = { none: "Gap", partial: "1 sys", covered: "OK", redundant: `${cov.systems.length} sys` };
                    return <tr key={cap} className="border-b border-[var(--border)]">
                      <td className="px-3 py-1.5 text-[13px] font-semibold text-[var(--text-primary)] sticky left-0 bg-[var(--bg)] z-10">{cap}</td>
                      {techSystems.map(sys => {
                        const key = `${cap}__${sys.id}`;
                        const linked = techCapMatrix[key] === "1" || sys.capabilities.some(c => c.toLowerCase().includes(cap.toLowerCase().split(" ")[0]));
                        return <td key={sys.id} className="px-1 py-1.5 text-center"><button onClick={() => setTechCapMatrix(prev => ({ ...prev, [key]: linked ? "" : "1" }))} className="w-5 h-5 rounded transition-all text-[11px]" style={{
                          background: linked ? "rgba(139,168,122,0.15)" : "#1e2030",
                          border: linked ? "1px solid var(--success)" : "1px solid var(--border)",
                          color: linked ? "#8ba87a" : "var(--border)",
                        }}>{linked ? "●" : ""}</button></td>;
                      })}
                      <td className="px-2 py-1.5 text-center"><span className="px-1.5 py-0.5 rounded-full text-[11px] font-bold" style={{ background: `${levelColors[cov.level]}12`, color: levelColors[cov.level] }}>{levelLabels[cov.level]}</span></td>
                    </tr>;
                  })}
                </tbody></table></div>
                {/* Alerts */}
                {(unsupported.length > 0 || redundant.length > 0) && <div className="mt-3 space-y-2">
                  {unsupported.length > 0 && <div className="rounded-lg bg-[rgba(232,122,93,0.04)] border border-[var(--risk)]/20 p-3"><div className="text-[13px] font-bold text-[var(--risk)] uppercase mb-1">Unsupported Capabilities</div><div className="flex flex-wrap gap-1">{unsupported.map(([cap]) => <span key={cap} className="px-2 py-0.5 rounded-full text-[12px] bg-[rgba(232,122,93,0.1)] text-[var(--risk)]">{cap}</span>)}</div></div>}
                  {redundant.length > 0 && <div className="rounded-lg bg-[rgba(167,139,184,0.04)] border border-[var(--purple)]/20 p-3"><div className="text-[13px] font-bold text-[var(--purple)] uppercase mb-1">Potential Redundancy (3+ systems)</div>{redundant.map(([cap, v]) => <div key={cap} className="text-[13px] text-[var(--text-secondary)] mt-1"><strong>{cap}</strong>: {v.systems.join(", ")}</div>)}</div>}
                </div>}
              </>;
            })()}
          </Card>}

          {/* ─── 3. SYSTEM RATIONALIZATION ─── */}
          {techView === "rationalize" && <Card title="System Rationalization Analyzer">
            <div className="text-[15px] text-[var(--text-secondary)] mb-4">Auto-detects redundant systems by category. Estimates consolidation savings and recommends action.</div>
            {(() => {
              // Group by category, find duplicates
              const catGroups: Record<string, TechSystem[]> = {};
              techSystems.forEach(s => { if (!catGroups[s.category]) catGroups[s.category] = []; catGroups[s.category].push(s); });
              const redundancies = Object.entries(catGroups).filter(([, syss]) => syss.length >= 2).sort((a, b) => b[1].length - a[1].length);
              const retireTargets = techSystems.filter(s => s.status === "Retire" || s.status === "Migrate");
              // Parse cost for estimation
              const parseCost = (c: string) => { const m = c.replace(/[^0-9.KMk]/g, ""); const num = parseFloat(m); if (c.toLowerCase().includes("m")) return num * 1000000; if (c.toLowerCase().includes("k")) return num * 1000; return num || 0; };
              const fmtCostShort = (n: number) => n >= 1000000 ? `$${(n/1000000).toFixed(1)}M` : n >= 1000 ? `$${(n/1000).toFixed(0)}K` : `$${n}`;
              const potentialSavings = retireTargets.reduce((s, sys) => s + parseCost(sys.annualCost), 0);

              return <div className="space-y-5">
                {/* Summary */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl p-3 bg-[var(--surface-2)] text-center"><div className="text-[20px] font-extrabold text-[var(--purple)]">{redundancies.length}</div><div className="text-[13px] text-[var(--text-muted)] uppercase">Redundant Categories</div></div>
                  <div className="rounded-xl p-3 bg-[var(--surface-2)] text-center"><div className="text-[20px] font-extrabold text-[var(--warning)]">{retireTargets.length}</div><div className="text-[13px] text-[var(--text-muted)] uppercase">Migrate/Retire</div></div>
                  <div className="rounded-xl p-3 bg-[var(--surface-2)] text-center"><div className="text-[20px] font-extrabold text-[var(--success)]">{potentialSavings > 0 ? fmtCostShort(potentialSavings) : "—"}</div><div className="text-[13px] text-[var(--text-muted)] uppercase">Potential Savings</div></div>
                </div>
                {/* Redundancy cards */}
                {redundancies.map(([cat, syss]) => {
                  const totalCost = syss.reduce((s, sys) => s + parseCost(sys.annualCost), 0);
                  const savingsEst = syss.length >= 3 ? totalCost * 0.4 : totalCost * 0.25;
                  const complexity = syss.some(s => s.integration === "Fully Integrated") ? "High" : syss.some(s => s.integration === "Partial") ? "Medium" : "Low";
                  const complexityColor = complexity === "High" ? "#e87a5d" : complexity === "Medium" ? "#f4a83a" : "#8ba87a";
                  return <div key={cat} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div><span className="text-[15px] font-bold text-[var(--text-primary)]">{cat}</span><span className="text-[14px] text-[var(--text-muted)] ml-2">— {syss.length} systems</span></div>
                      <div className="flex gap-3 text-[14px]">
                        <span className="text-[var(--text-muted)]">Total: {fmtCostShort(totalCost)}/yr</span>
                        <span className="text-[var(--success)] font-semibold">Savings: ~{fmtCostShort(savingsEst)}/yr</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 mb-3">{syss.map(sys => {
                      const statusColors: Record<string, string> = { Invest: "#8ba87a", Maintain: "#f4a83a", Migrate: "#f4a83a", Retire: "#e87a5d" };
                      return <div key={sys.id} className="rounded-lg p-2.5 bg-[var(--bg)] border border-[var(--border)]">
                        <div className="text-[14px] font-semibold text-[var(--text-primary)]">{sys.name}</div>
                        <div className="text-[12px] text-[var(--text-muted)]">{sys.vendor} · {sys.age}</div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-[12px] text-[var(--text-secondary)]">{sys.annualCost}</span>
                          <span className="px-1.5 py-0.5 rounded-full text-[11px] font-bold" style={{ background: `${statusColors[sys.status]}12`, color: statusColors[sys.status] }}>{sys.status}</span>
                        </div>
                      </div>;
                    })}</div>
                    <div className="flex items-center gap-4 text-[13px]">
                      <span className="text-[var(--text-muted)]">Migration complexity: <strong style={{ color: complexityColor }}>{complexity}</strong></span>
                      <span className="text-[var(--text-muted)]">Recommendation: <strong className="text-[var(--accent-primary)]">{syss.length >= 3 ? `Consolidate to 1-2 systems — save ~${fmtCostShort(savingsEst)}/yr` : `Evaluate consolidation — potential ${fmtCostShort(savingsEst)}/yr savings`}</strong></span>
                    </div>
                  </div>;
                })}
                {redundancies.length === 0 && <div className="text-center py-8 text-[var(--text-muted)]">No redundant system categories detected. Each category has a single system.</div>}
                {/* Quick wins */}
                {retireTargets.length > 0 && <div className="rounded-xl border border-[var(--accent-primary)]/20 bg-[rgba(244,168,58,0.04)] p-4">
                  <div className="text-[14px] font-bold text-[var(--accent-primary)] uppercase mb-2">Quick Wins — Systems Marked for Retire/Migrate</div>
                  <div className="space-y-2">{retireTargets.map(sys => <div key={sys.id} className="flex items-center justify-between p-2 rounded-lg bg-[var(--surface-2)]">
                    <div><span className="text-[14px] font-semibold text-[var(--text-primary)]">{sys.name}</span><span className="text-[13px] text-[var(--text-muted)] ml-2">{sys.vendor} · {sys.category}</span></div>
                    <div className="flex items-center gap-3"><span className="text-[14px] text-[var(--text-secondary)]">{sys.annualCost}/yr</span><span className="px-2 py-0.5 rounded-full text-[12px] font-bold" style={{ background: sys.status === "Retire" ? "rgba(232,122,93,0.1)" : "rgba(244,168,58,0.1)", color: sys.status === "Retire" ? "#e87a5d" : "#f4a83a" }}>{sys.status}</span></div>
                  </div>)}</div>
                </div>}
              </div>;
            })()}
          </Card>}

          {/* ─── 4. DATA FLOW MAPPING ─── */}
          {techView === "dataflow" && <Card title="Data Flow Mapping">
            <div className="text-[15px] text-[var(--text-secondary)] mb-4">For each core process, map which systems are involved and how data flows between them. Flag manual transfers.</div>
            <div className="space-y-4">
              {procProcesses.map(proc => {
                const flow = techDataFlows[proc.id] || { systems: [], dataTypes: [], manualFlags: [] };
                // Auto-detect systems from process steps
                const autoSystems = Array.from(new Set(proc.steps.map(s => s.system).filter(Boolean).flatMap(s => s.split("/")))).slice(0, 6);
                const displaySystems = flow.systems.length > 0 ? flow.systems : autoSystems;
                return <div key={proc.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                  <div className="text-[15px] font-bold text-[var(--text-primary)] mb-3">{proc.name}</div>
                  {/* Flow visualization */}
                  <div className="flex items-center gap-1 overflow-x-auto pb-2 mb-3">
                    {displaySystems.map((sys, i) => {
                      const isManual = flow.manualFlags.includes(sys);
                      const matchedTech = techSystems.find(t => t.name.toLowerCase().includes(sys.toLowerCase()) || sys.toLowerCase().includes(t.name.toLowerCase().split(" ")[0]));
                      return <React.Fragment key={`${proc.id}-${sys}-${i}`}>
                        {i > 0 && <div className="flex flex-col items-center shrink-0 px-1">
                          <span className="text-[14px]" style={{ color: isManual ? "#e87a5d" : "#8ba87a" }}>{isManual ? "✋" : "→"}</span>
                          <span className="text-[9px]" style={{ color: isManual ? "#e87a5d" : "#8a7f6d" }}>{isManual ? "Manual" : "Auto"}</span>
                        </div>}
                        <div className="rounded-lg px-3 py-2 shrink-0 text-center min-w-[100px]" style={{
                          background: matchedTech ? `${matchedTech.status === "Retire" ? "rgba(232,122,93,0.06)" : "#1e2030"}` : "var(--bg)",
                          border: `1px solid ${matchedTech?.status === "Retire" ? "#e87a5d" : isManual ? "#f4a83a" : "var(--border)"}`,
                        }}>
                          <div className="text-[13px] font-semibold text-[var(--text-primary)]">{sys}</div>
                          {matchedTech && <div className="text-[11px] text-[var(--text-muted)]">{matchedTech.vendor}</div>}
                        </div>
                      </React.Fragment>;
                    })}
                  </div>
                  {/* Edit flow */}
                  <div className="flex gap-2">
                    <input value={(flow.systems || []).join(", ")} onChange={e => setTechDataFlows(prev => ({ ...prev, [proc.id]: { ...flow, systems: e.target.value.split(",").map(s => s.trim()).filter(Boolean) } }))} placeholder="Systems in order (comma-separated)..." className="flex-1 bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[13px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" />
                    <input value={(flow.manualFlags || []).join(", ")} onChange={e => setTechDataFlows(prev => ({ ...prev, [proc.id]: { ...flow, manualFlags: e.target.value.split(",").map(s => s.trim()).filter(Boolean) } }))} placeholder="Manual transfer points..." className="w-48 bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[13px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" />
                  </div>
                </div>;
              })}
            </div>
            <div className="flex gap-3 mt-3 text-[13px] text-[var(--text-muted)]">
              <span className="flex items-center gap-1"><span className="text-[var(--success)]">→</span> Automated integration</span>
              <span className="flex items-center gap-1"><span className="text-[var(--risk)]">✋</span> Manual data transfer — error-prone</span>
            </div>
          </Card>}

          {/* ─── 5. AI/AUTOMATION READINESS ─── */}
          {techView === "aiready" && <Card title="AI/Automation Readiness per System">
            <div className="text-[15px] text-[var(--text-secondary)] mb-4">Assess each system{"'"}s ability to integrate with AI tools. Score API availability, data accessibility, and automation potential.</div>
            {/* Summary */}
            {(() => {
              const ready = techSystems.filter(s => s.apiReady === "Ready").length;
              const needsInv = techSystems.filter(s => s.apiReady === "Needs Investment").length;
              const notComp = techSystems.filter(s => s.apiReady === "Not Compatible").length;
              const readyPct = techSystems.length ? Math.round((ready / techSystems.length) * 100) : 0;
              return <div className="grid grid-cols-4 gap-3 mb-4">
                <div className="rounded-xl p-3 bg-[var(--surface-2)] text-center"><div className="text-[20px] font-extrabold" style={{ color: readyPct >= 60 ? "#8ba87a" : readyPct >= 30 ? "#f4a83a" : "#e87a5d" }}>{readyPct}%</div><div className="text-[13px] text-[var(--text-muted)] uppercase">AI Ready</div></div>
                <div className="rounded-xl p-3 bg-[var(--surface-2)] text-center"><div className="text-[20px] font-extrabold text-[var(--success)]">{ready}</div><div className="text-[13px] text-[var(--text-muted)] uppercase">Ready</div></div>
                <div className="rounded-xl p-3 bg-[var(--surface-2)] text-center"><div className="text-[20px] font-extrabold text-[var(--warning)]">{needsInv}</div><div className="text-[13px] text-[var(--text-muted)] uppercase">Needs Investment</div></div>
                <div className="rounded-xl p-3 bg-[var(--surface-2)] text-center"><div className="text-[20px] font-extrabold text-[var(--risk)]">{notComp}</div><div className="text-[13px] text-[var(--text-muted)] uppercase">Not Compatible</div></div>
              </div>;
            })()}
            {/* System readiness table */}
            <div className="overflow-x-auto rounded-lg border border-[var(--border)]"><table className="w-full"><thead><tr className="bg-[var(--surface-2)]">
              <th className="px-3 py-2 text-left text-[12px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">System</th>
              <th className="px-2 py-2 text-center text-[12px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">Category</th>
              <th className="px-2 py-2 text-center text-[12px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">Integration</th>
              <th className="px-2 py-2 text-center text-[12px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">API Ready</th>
              <th className="px-2 py-2 text-center text-[12px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">Data Quality</th>
              <th className="px-2 py-2 text-center text-[12px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">AI Score</th>
            </tr></thead><tbody>
              {techSystems.map(sys => {
                const apiColors: Record<string, string> = { Ready: "#8ba87a", "Needs Investment": "#f4a83a", "Not Compatible": "#e87a5d" };
                const dqColors: Record<string, string> = { High: "#8ba87a", Medium: "#f4a83a", Low: "#e87a5d" };
                const aiScore = (sys.apiReady === "Ready" ? 3 : sys.apiReady === "Needs Investment" ? 1.5 : 0) + (sys.integration === "Fully Integrated" ? 1 : sys.integration === "Partial" ? 0.5 : 0) + (sys.dataQuality === "High" ? 1 : sys.dataQuality === "Medium" ? 0.5 : 0);
                const maxScore = 5;
                const aiPct = Math.round((aiScore / maxScore) * 100);
                return <tr key={sys.id} className="border-b border-[var(--border)]">
                  <td className="px-3 py-2"><div className="text-[14px] font-semibold text-[var(--text-primary)]">{sys.name}</div><div className="text-[12px] text-[var(--text-muted)]">{sys.vendor}</div></td>
                  <td className="px-2 py-2 text-center text-[13px] text-[var(--text-secondary)]">{sys.category}</td>
                  <td className="px-2 py-2 text-center">
                    <select value={sys.integration} onChange={e => setTechSystems(prev => prev.map(s => s.id === sys.id ? { ...s, integration: e.target.value as TechSystem["integration"] } : s))} className="bg-[var(--bg)] border border-[var(--border)] rounded px-1 py-0.5 text-[12px] outline-none">{(["Standalone", "Partial", "Fully Integrated"] as const).map(o => <option key={o} value={o}>{o}</option>)}</select>
                  </td>
                  <td className="px-2 py-2 text-center">
                    <select value={sys.apiReady} onChange={e => setTechSystems(prev => prev.map(s => s.id === sys.id ? { ...s, apiReady: e.target.value as TechSystem["apiReady"] } : s))} className="bg-[var(--bg)] border rounded px-1 py-0.5 text-[12px] font-semibold outline-none" style={{ borderColor: `${apiColors[sys.apiReady]}40`, color: apiColors[sys.apiReady] }}>{(["Ready", "Needs Investment", "Not Compatible"] as const).map(o => <option key={o} value={o}>{o}</option>)}</select>
                  </td>
                  <td className="px-2 py-2 text-center">
                    <select value={sys.dataQuality} onChange={e => setTechSystems(prev => prev.map(s => s.id === sys.id ? { ...s, dataQuality: e.target.value } : s))} className="bg-[var(--bg)] border rounded px-1 py-0.5 text-[12px] font-semibold outline-none" style={{ borderColor: `${dqColors[sys.dataQuality] || "#8a7f6d"}40`, color: dqColors[sys.dataQuality] || "#8a7f6d" }}><option>High</option><option>Medium</option><option>Low</option></select>
                  </td>
                  <td className="px-2 py-2 text-center">
                    <div className="flex items-center gap-1 justify-center"><div className="w-12 h-2 bg-[var(--bg)] rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${aiPct}%`, background: aiPct >= 70 ? "#8ba87a" : aiPct >= 40 ? "#f4a83a" : "#e87a5d" }} /></div><span className="text-[12px] font-bold" style={{ color: aiPct >= 70 ? "#8ba87a" : aiPct >= 40 ? "#f4a83a" : "#e87a5d" }}>{aiPct}%</span></div>
                  </td>
                </tr>;
              })}
            </tbody></table></div>
            {/* Recommendations */}
            {(() => {
              const blockers = techSystems.filter(s => s.apiReady === "Not Compatible" && s.status !== "Retire");
              const lowData = techSystems.filter(s => s.dataQuality === "Low" && s.status !== "Retire");
              if (blockers.length === 0 && lowData.length === 0) return null;
              return <div className="mt-4 rounded-xl border border-[var(--accent-primary)]/20 bg-[rgba(244,168,58,0.04)] p-4">
                <div className="text-[14px] font-bold text-[var(--accent-primary)] uppercase mb-2">AI Readiness Recommendations</div>
                <div className="space-y-2">
                  {blockers.map(s => <div key={s.id} className="flex items-start gap-2 text-[14px]"><span className="text-[var(--risk)] shrink-0 mt-0.5">✗</span><span className="text-[var(--text-secondary)]"><strong>{s.name}</strong> is not AI-compatible — consider migrating to {s.category === "GRC" ? "a modern cloud GRC platform" : s.category === "ERP" ? "a cloud ERP with API layer" : "a platform with REST APIs"} to enable AI integration.</span></div>)}
                  {lowData.map(s => <div key={s.id} className="flex items-start gap-2 text-[14px]"><span className="text-[var(--warning)] shrink-0 mt-0.5">⚠</span><span className="text-[var(--text-secondary)]"><strong>{s.name}</strong> has low data quality — AI models trained on poor data will produce unreliable results. Invest in data cleansing before AI deployment.</span></div>)}
                </div>
              </div>;
            })()}
          </Card>}
        </div>}

        {/* ── PEOPLE & CULTURE TAB ── */}
        {omView === "3.2" && <div className="animate-tab-enter space-y-5">
          {/* Sub-navigation */}
          <div className="flex gap-1 rounded-xl bg-[var(--surface-2)] p-1 border border-[var(--border)]">
            {([
              { id: "culture" as const, label: "Culture Assessment", icon: "🎭" },
              { id: "ways" as const, label: "Ways of Working", icon: "🔧" },
              { id: "leadership" as const, label: "Leadership Model", icon: "👑" },
              { id: "capacity" as const, label: "Change Capacity", icon: "📊" },
            ]).map(v => <button key={v.id} onClick={() => setPcView(v.id)} className="flex-1 px-3 py-2 rounded-lg text-[14px] font-semibold transition-all" style={{
              background: pcView === v.id ? "rgba(244,168,58,0.12)" : "transparent",
              color: pcView === v.id ? "#f4a83a" : "#8a7f6d",
            }}>{v.icon} {v.label}</button>)}
          </div>

          {/* ─── 1. CULTURE ASSESSMENT ─── */}
          {pcView === "culture" && <Card title="Culture Assessment — Current vs. Required">
            <div className="text-[15px] text-[var(--text-secondary)] mb-4">Score your current culture and the culture required for the target operating model on each dimension (1-5).</div>
            {/* Radar chart */}
            {(() => {
              const hasData = Object.keys(cultureCurrent).length > 0 || Object.keys(cultureTarget).length > 0;
              const radarData = CULTURE_DIMS.map(d => ({ subject: d.right, current: cultureCurrent[d.id] || 0, required: cultureTarget[d.id] || 0, max: 5 }));
              const gaps = CULTURE_DIMS.map(d => ({ dim: d, current: cultureCurrent[d.id] || 0, target: cultureTarget[d.id] || 0, gap: (cultureTarget[d.id] || 0) - (cultureCurrent[d.id] || 0) })).filter(g => g.current > 0 && g.target > 0).sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap));
              const biggestGap = gaps.length > 0 ? gaps[0] : null;
              return <>
                {hasData && <div className="h-[280px] mb-4"><RadarViz data={radarData} /></div>}
                {biggestGap && Math.abs(biggestGap.gap) >= 2 && <div className="rounded-xl border border-[var(--warning)]/20 bg-[rgba(244,168,58,0.04)] px-4 py-3 mb-4">
                  <div className="text-[14px] text-[var(--warning)]">
                    <strong>Biggest culture gap:</strong> Your culture is <strong>{biggestGap.gap < 0 ? biggestGap.dim.right : biggestGap.dim.left}</strong> ({biggestGap.current}/5) but your target operating model requires <strong>{biggestGap.gap > 0 ? biggestGap.dim.right : biggestGap.dim.left}</strong> ({biggestGap.target}/5) — gap of {Math.abs(biggestGap.gap).toFixed(0)} levels.
                  </div>
                </div>}
              </>;
            })()}
            {/* Scoring table */}
            <div className="space-y-4">
              {CULTURE_DIMS.map(dim => {
                const cur = cultureCurrent[dim.id] || 0;
                const tgt = cultureTarget[dim.id] || 0;
                const gap = cur > 0 && tgt > 0 ? tgt - cur : 0;
                return <div key={dim.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2"><span>{dim.leftIcon}</span><span className="text-[14px] font-semibold text-[var(--text-muted)]">{dim.left}</span></div>
                    {gap !== 0 && <span className="px-2 py-0.5 rounded-full text-[12px] font-bold" style={{ background: Math.abs(gap) >= 2 ? "rgba(232,122,93,0.1)" : "rgba(244,168,58,0.1)", color: Math.abs(gap) >= 2 ? "#e87a5d" : "#f4a83a" }}>Gap: {gap > 0 ? "+" : ""}{gap}</span>}
                    <div className="flex items-center gap-2"><span className="text-[14px] font-semibold text-[var(--text-muted)]">{dim.right}</span><span>{dim.rightIcon}</span></div>
                  </div>
                  {/* Current */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[12px] text-[var(--text-muted)] w-16 shrink-0 uppercase">Current</span>
                    <div className="flex gap-1 flex-1 justify-center">{[1,2,3,4,5].map(n => <button key={n} onClick={() => setCultureCurrent(p => ({...p, [dim.id]: p[dim.id] === n ? 0 : n}))} className="w-9 h-7 rounded-lg text-[14px] font-bold transition-all" style={{
                      background: cur >= n ? "rgba(244,168,58,0.15)" : "var(--bg)", color: cur >= n ? "#f4a83a" : "#8a7f6d", border: cur >= n ? "1px solid var(--accent-primary)" : "1px solid var(--border)",
                    }}>{n}</button>)}</div>
                  </div>
                  {/* Target */}
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] text-[var(--text-muted)] w-16 shrink-0 uppercase">Required</span>
                    <div className="flex gap-1 flex-1 justify-center">{[1,2,3,4,5].map(n => <button key={n} onClick={() => setCultureTarget(p => ({...p, [dim.id]: p[dim.id] === n ? 0 : n}))} className="w-9 h-7 rounded-lg text-[14px] font-bold transition-all" style={{
                      background: tgt >= n ? "rgba(139,168,122,0.15)" : "var(--bg)", color: tgt >= n ? "#8ba87a" : "#8a7f6d", border: tgt >= n ? "1px solid var(--success)" : "1px solid var(--border)",
                    }}>{n}</button>)}</div>
                  </div>
                </div>;
              })}
            </div>
            <div className="flex gap-4 mt-3 text-[13px] text-[var(--text-muted)]">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-[rgba(244,168,58,0.15)] border border-[var(--accent-primary)]" /> Current</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-[rgba(139,168,122,0.15)] border border-[var(--success)]" /> Required</span>
              <span>1 = Left anchor, 5 = Right anchor</span>
            </div>
          </Card>}

          {/* ─── 2. WAYS OF WORKING ─── */}
          {pcView === "ways" && <Card title="Ways of Working — Current vs. Target">
            <div className="text-[15px] text-[var(--text-secondary)] mb-4">Define how each function works today and how they should work in the target operating model.</div>
            <div className="overflow-x-auto rounded-lg border border-[var(--border)]"><table className="w-full text-[14px]"><thead><tr className="bg-[var(--surface-2)]">
              <th className="px-3 py-2 text-left text-[12px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">Function</th>
              {["Work Model", "Methodology", "Decision-Making", "Meeting Cadence", "Collaboration Tools"].map(h => <th key={h} className="px-1 py-2 text-center text-[11px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]" colSpan={2}>{h}<div className="flex justify-center gap-1 mt-0.5"><span className="text-[9px] text-[var(--accent-primary)]">Now</span><span className="text-[9px] text-[var(--success)]">Target</span></div></th>)}
            </tr></thead><tbody>
              {wowData.map((row, ri) => {
                const update = (field: keyof Omit<WowRow, "func">, which: "current" | "target", val: string) => setWowData(prev => prev.map((r, i) => i === ri ? { ...r, [field]: { ...r[field], [which]: val } } : r));
                const selCls = "bg-[var(--bg)] border border-[var(--border)] rounded px-1 py-0.5 text-[12px] outline-none w-full";
                const changed = (f: keyof Omit<WowRow, "func">) => row[f].current !== row[f].target;
                const cellBg = (f: keyof Omit<WowRow, "func">) => changed(f) ? "rgba(244,168,58,0.04)" : "";
                return <tr key={row.func} className="border-b border-[var(--border)]">
                  <td className="px-3 py-2 font-semibold text-[var(--text-primary)]">{row.func}</td>
                  <td className="px-1 py-1.5" style={{ background: cellBg("workModel") }}><select value={row.workModel.current} onChange={e => update("workModel", "current", e.target.value)} className={selCls}><option>Fully office</option><option>Hybrid</option><option>Fully remote</option></select></td>
                  <td className="px-1 py-1.5" style={{ background: cellBg("workModel") }}><select value={row.workModel.target} onChange={e => update("workModel", "target", e.target.value)} className={selCls} style={{ color: changed("workModel") ? "#8ba87a" : undefined }}><option>Fully office</option><option>Hybrid</option><option>Fully remote</option></select></td>
                  <td className="px-1 py-1.5" style={{ background: cellBg("methodology") }}><select value={row.methodology.current} onChange={e => update("methodology", "current", e.target.value)} className={selCls}><option>Agile</option><option>Waterfall</option><option>Hybrid</option></select></td>
                  <td className="px-1 py-1.5" style={{ background: cellBg("methodology") }}><select value={row.methodology.target} onChange={e => update("methodology", "target", e.target.value)} className={selCls} style={{ color: changed("methodology") ? "#8ba87a" : undefined }}><option>Agile</option><option>Waterfall</option><option>Hybrid</option></select></td>
                  <td className="px-1 py-1.5" style={{ background: cellBg("decisionMaking") }}><select value={row.decisionMaking.current} onChange={e => update("decisionMaking", "current", e.target.value)} className={selCls}><option>Consensus</option><option>Delegated</option><option>Hierarchical</option></select></td>
                  <td className="px-1 py-1.5" style={{ background: cellBg("decisionMaking") }}><select value={row.decisionMaking.target} onChange={e => update("decisionMaking", "target", e.target.value)} className={selCls} style={{ color: changed("decisionMaking") ? "#8ba87a" : undefined }}><option>Consensus</option><option>Delegated</option><option>Hierarchical</option></select></td>
                  <td className="px-1 py-1.5" style={{ background: cellBg("meetingCadence") }}><select value={row.meetingCadence.current} onChange={e => update("meetingCadence", "current", e.target.value)} className={selCls}><option>Daily standup</option><option>Weekly team</option><option>Bi-weekly sprint</option><option>Monthly review</option></select></td>
                  <td className="px-1 py-1.5" style={{ background: cellBg("meetingCadence") }}><select value={row.meetingCadence.target} onChange={e => update("meetingCadence", "target", e.target.value)} className={selCls} style={{ color: changed("meetingCadence") ? "#8ba87a" : undefined }}><option>Daily standup</option><option>Weekly team</option><option>Bi-weekly sprint</option><option>Monthly review</option></select></td>
                  <td className="px-1 py-1.5"><input value={row.tools.current} onChange={e => update("tools", "current", e.target.value)} placeholder="Current..." className="bg-[var(--bg)] border border-[var(--border)] rounded px-1 py-0.5 text-[12px] outline-none w-full placeholder:text-[var(--text-muted)]" /></td>
                  <td className="px-1 py-1.5"><input value={row.tools.target} onChange={e => update("tools", "target", e.target.value)} placeholder="Target..." className="bg-[var(--bg)] border border-[var(--border)] rounded px-1 py-0.5 text-[12px] outline-none w-full placeholder:text-[var(--text-muted)]" style={{ color: row.tools.current !== row.tools.target && row.tools.target ? "#8ba87a" : undefined }} /></td>
                </tr>;
              })}
            </tbody></table></div>
            {/* Change summary */}
            {(() => {
              const totalChanges = wowData.reduce((s, r) => s + (["workModel", "methodology", "decisionMaking", "meetingCadence"] as const).filter(f => r[f].current !== r[f].target).length, 0);
              return totalChanges > 0 ? <div className="mt-3 rounded-lg bg-[rgba(244,168,58,0.04)] border border-[var(--warning)]/20 px-4 py-2 text-[14px] text-[var(--warning)]">{totalChanges} way-of-working change{totalChanges > 1 ? "s" : ""} planned across {wowData.filter(r => (["workModel", "methodology", "decisionMaking", "meetingCadence"] as const).some(f => r[f].current !== r[f].target)).length} functions. Amber-highlighted cells show shifts.</div> : null;
            })()}
          </Card>}

          {/* ─── 3. LEADERSHIP MODEL ─── */}
          {pcView === "leadership" && <Card title="Leadership Competency Model">
            <div className="text-[15px] text-[var(--text-secondary)] mb-4">Rate your current leadership team against the competencies required for the target operating model.</div>
            {/* Radar */}
            {(() => {
              const hasData = Object.values(leadershipScores).some(v => v.current > 0 || v.required > 0);
              if (!hasData) return null;
              const radarData = LEADERSHIP_COMPETENCIES.map(c => ({ subject: c.name.length > 14 ? c.name.slice(0, 12) + ".." : c.name, current: leadershipScores[c.id]?.current || 0, required: leadershipScores[c.id]?.required || 0, max: 5 }));
              return <div className="h-[260px] mb-4"><RadarViz data={radarData} /></div>;
            })()}
            {/* Competency cards */}
            <div className="space-y-3">
              {LEADERSHIP_COMPETENCIES.map(comp => {
                const scores = leadershipScores[comp.id] || { current: 0, required: 0 };
                const gap = scores.current > 0 && scores.required > 0 ? scores.current - scores.required : 0;
                return <div key={comp.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="text-[15px] font-bold text-[var(--text-primary)]">{comp.name}</div>
                      <div className="text-[13px] text-[var(--text-muted)]">{comp.desc}</div>
                    </div>
                    {gap !== 0 && <span className="px-2 py-0.5 rounded-full text-[12px] font-bold shrink-0 ml-3" style={{ background: gap < -1 ? "rgba(232,122,93,0.1)" : gap < 0 ? "rgba(244,168,58,0.1)" : "rgba(139,168,122,0.1)", color: gap < -1 ? "#e87a5d" : gap < 0 ? "#f4a83a" : "#8ba87a" }}>Gap: {gap > 0 ? "+" : ""}{gap}</span>}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[12px] text-[var(--text-muted)] uppercase">Current Strength</span>
                      <div className="flex gap-1 mt-1">{[1,2,3,4,5].map(n => <button key={n} onClick={() => setLeadershipScores(p => ({...p, [comp.id]: { ...scores, current: scores.current === n ? 0 : n }}))} className="w-8 h-6 rounded text-[13px] font-bold transition-all" style={{
                        background: scores.current >= n ? "rgba(244,168,58,0.15)" : "var(--bg)", color: scores.current >= n ? "#f4a83a" : "#8a7f6d", border: scores.current >= n ? "1px solid var(--accent-primary)" : "1px solid var(--border)",
                      }}>{n}</button>)}</div>
                    </div>
                    <div>
                      <span className="text-[12px] text-[var(--text-muted)] uppercase">Required Level</span>
                      <div className="flex gap-1 mt-1">{[1,2,3,4,5].map(n => <button key={n} onClick={() => setLeadershipScores(p => ({...p, [comp.id]: { ...scores, required: scores.required === n ? 0 : n }}))} className="w-8 h-6 rounded text-[13px] font-bold transition-all" style={{
                        background: scores.required >= n ? "rgba(139,168,122,0.15)" : "var(--bg)", color: scores.required >= n ? "#8ba87a" : "#8a7f6d", border: scores.required >= n ? "1px solid var(--success)" : "1px solid var(--border)",
                      }}>{n}</button>)}</div>
                    </div>
                  </div>
                </div>;
              })}
            </div>
            {/* Gap summary */}
            {(() => {
              const gaps = LEADERSHIP_COMPETENCIES.map(c => ({ name: c.name, gap: (leadershipScores[c.id]?.current || 0) - (leadershipScores[c.id]?.required || 0) })).filter(g => leadershipScores[g.name.toLowerCase().replace(/ /g, "")] || Object.keys(leadershipScores).some(k => { const comp = LEADERSHIP_COMPETENCIES.find(c => c.id === k); return comp?.name === g.name && ((leadershipScores[k]?.current || 0) > 0); }));
              const scored = LEADERSHIP_COMPETENCIES.filter(c => leadershipScores[c.id]?.current > 0 && leadershipScores[c.id]?.required > 0);
              const strengths = scored.filter(c => (leadershipScores[c.id]?.current || 0) >= (leadershipScores[c.id]?.required || 0));
              const weaknesses = scored.filter(c => (leadershipScores[c.id]?.current || 0) < (leadershipScores[c.id]?.required || 0)).sort((a, b) => ((leadershipScores[a.id]?.current || 0) - (leadershipScores[a.id]?.required || 0)) - ((leadershipScores[b.id]?.current || 0) - (leadershipScores[b.id]?.required || 0)));
              if (scored.length === 0) return null;
              return <div className="mt-4 rounded-xl border border-[var(--accent-primary)]/20 bg-[rgba(244,168,58,0.04)] p-4">
                <div className="text-[14px] font-bold text-[var(--accent-primary)] uppercase mb-2">Leadership Gap Analysis</div>
                {strengths.length > 0 && <div className="text-[14px] text-[var(--text-secondary)] mb-2"><strong className="text-[var(--success)]">Strengths:</strong> {strengths.map(c => c.name).join(", ")}</div>}
                {weaknesses.length > 0 && <div className="space-y-1">{weaknesses.map(c => <div key={c.id} className="text-[14px] text-[var(--text-secondary)]"><span className="text-[var(--risk)]">→</span> <strong>{c.name}</strong>: current {leadershipScores[c.id]?.current}/5 vs. required {leadershipScores[c.id]?.required}/5 — invest in development</div>)}</div>}
              </div>;
            })()}
          </Card>}

          {/* ─── 4. CHANGE CAPACITY ASSESSMENT ─── */}
          {pcView === "capacity" && <Card title={<div>Change Capacity Assessment<div style={{ fontSize: 11, color: "#8a7f6d", marginTop: 2, fontWeight: 400 }}>Whether the organization can absorb more change</div></div>}>
            <div className="text-[15px] text-[var(--text-secondary)] mb-4">Assess your organization{"'"}s ability to absorb transformation. Overloading change capacity is the #1 reason transformations fail.</div>
            <div className="grid grid-cols-2 gap-5">
              {/* Left: inputs */}
              <div className="space-y-4">
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                  <label className="text-[14px] font-bold text-[var(--text-primary)] block mb-2">Active Change Initiatives</label>
                  <input value={changeLoad.active} onChange={e => setChangeLoad(p => ({...p, active: e.target.value}))} placeholder="e.g. ERP migration, org restructure, AI rollout, new CRM..." className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" />
                  <div className="text-[12px] text-[var(--text-muted)] mt-1">Count: {changeLoad.active ? changeLoad.active.split(",").filter(Boolean).length : 0} initiatives</div>
                </div>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                  <label className="text-[14px] font-bold text-[var(--text-primary)] block mb-2">Change Fatigue Level</label>
                  <div className="flex gap-1">{[1,2,3,4,5].map(n => <button key={n} onClick={() => setChangeLoad(p => ({...p, fatigue: p.fatigue === n ? 0 : n}))} className="flex-1 py-2 rounded-lg text-[14px] font-bold transition-all" style={{
                    background: changeLoad.fatigue >= n ? `${n <= 2 ? "#8ba87a" : n <= 3 ? "#f4a83a" : "#e87a5d"}15` : "var(--bg)",
                    color: changeLoad.fatigue >= n ? (n <= 2 ? "#8ba87a" : n <= 3 ? "#f4a83a" : "#e87a5d") : "#8a7f6d",
                    border: changeLoad.fatigue >= n ? `1px solid ${n <= 2 ? "#8ba87a" : n <= 3 ? "#f4a83a" : "#e87a5d"}` : "1px solid var(--border)",
                  }}>{n}</button>)}</div>
                  <div className="flex justify-between text-[11px] text-[var(--text-muted)] mt-1"><span>Low fatigue</span><span>Severe fatigue</span></div>
                </div>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                  <label className="text-[14px] font-bold text-[var(--text-primary)] block mb-2">Change Infrastructure</label>
                  <div className="flex gap-1">{[1,2,3,4,5].map(n => <button key={n} onClick={() => setChangeLoad(p => ({...p, infrastructure: p.infrastructure === n ? 0 : n}))} className="flex-1 py-2 rounded-lg text-[14px] font-bold transition-all" style={{
                    background: changeLoad.infrastructure >= n ? `${n <= 2 ? "#e87a5d" : n <= 3 ? "#f4a83a" : "#8ba87a"}15` : "var(--bg)",
                    color: changeLoad.infrastructure >= n ? (n <= 2 ? "#e87a5d" : n <= 3 ? "#f4a83a" : "#8ba87a") : "#8a7f6d",
                    border: changeLoad.infrastructure >= n ? `1px solid ${n <= 2 ? "#e87a5d" : n <= 3 ? "#f4a83a" : "#8ba87a"}` : "1px solid var(--border)",
                  }}>{n}</button>)}</div>
                  <div className="flex justify-between text-[11px] text-[var(--text-muted)] mt-1"><span>No change team</span><span>Mature change org</span></div>
                </div>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                  <label className="text-[14px] font-bold text-[var(--text-primary)] block mb-2">Historical Change Success</label>
                  <div className="flex gap-1">{[1,2,3,4,5].map(n => <button key={n} onClick={() => setChangeLoad(p => ({...p, history: p.history === n ? 0 : n}))} className="flex-1 py-2 rounded-lg text-[14px] font-bold transition-all" style={{
                    background: changeLoad.history >= n ? `${n <= 2 ? "#e87a5d" : n <= 3 ? "#f4a83a" : "#8ba87a"}15` : "var(--bg)",
                    color: changeLoad.history >= n ? (n <= 2 ? "#e87a5d" : n <= 3 ? "#f4a83a" : "#8ba87a") : "#8a7f6d",
                    border: changeLoad.history >= n ? `1px solid ${n <= 2 ? "#e87a5d" : n <= 3 ? "#f4a83a" : "#8ba87a"}` : "1px solid var(--border)",
                  }}>{n}</button>)}</div>
                  <div className="flex justify-between text-[11px] text-[var(--text-muted)] mt-1"><span>Most changes fail</span><span>Strong track record</span></div>
                </div>
              </div>
              {/* Right: output */}
              <div className="space-y-4">
                {(() => {
                  const activeCount = changeLoad.active ? changeLoad.active.split(",").filter(Boolean).length : 0;
                  const capacity = Math.max(1, Math.round((changeLoad.infrastructure || 1) * 1.5 + (changeLoad.history || 1) * 0.5 - (changeLoad.fatigue || 3) * 0.5 + 1));
                  const loadPct = activeCount > 0 ? Math.round((activeCount / capacity) * 100) : 0;
                  const status = loadPct > 120 ? "Over Capacity" : loadPct > 80 ? "At Capacity" : loadPct > 0 ? "Has Room" : "Not Assessed";
                  const statusColor = loadPct > 120 ? "#e87a5d" : loadPct > 80 ? "#f4a83a" : "#8ba87a";
                  return <>
                    {/* Gauge */}
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-6 text-center">
                      <div className="text-[14px] text-[var(--text-muted)] uppercase mb-2">Change Capacity Status</div>
                      <div className="text-[32px] font-extrabold mb-1" style={{ color: statusColor }}>{status}</div>
                      <div className="h-4 bg-[var(--bg)] rounded-full overflow-hidden mx-auto max-w-[250px] mb-3">
                        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(loadPct, 150)}%`, background: `linear-gradient(to right, "#8ba87a", ${loadPct > 80 ? "#f4a83a" : "#8ba87a"}, ${loadPct > 100 ? "#e87a5d" : "#8ba87a"})` }} />
                      </div>
                      <div className="text-[15px] text-[var(--text-secondary)]">
                        Your organization can absorb <strong style={{ color: "#f4a83a" }}>~{capacity}</strong> concurrent change initiatives.
                        {activeCount > 0 && <> You currently have <strong style={{ color: activeCount > capacity ? "#e87a5d" : "#8ba87a" }}>{activeCount}</strong>.</>}
                      </div>
                    </div>
                    {/* Dimension scores */}
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: "Fatigue", val: changeLoad.fatigue, invert: true, desc: changeLoad.fatigue >= 4 ? "High fatigue — reduce load" : changeLoad.fatigue >= 2 ? "Moderate" : "Low fatigue" },
                        { label: "Infrastructure", val: changeLoad.infrastructure, invert: false, desc: changeLoad.infrastructure >= 4 ? "Strong change team" : changeLoad.infrastructure >= 2 ? "Basic support" : "No change team" },
                        { label: "Track Record", val: changeLoad.history, invert: false, desc: changeLoad.history >= 4 ? "Strong success history" : changeLoad.history >= 2 ? "Mixed results" : "Poor track record" },
                        { label: "Load", val: activeCount, invert: true, desc: `${activeCount} active initiative${activeCount !== 1 ? "s" : ""}`, raw: true },
                      ].map(d => <div key={d.label} className="rounded-xl p-3 bg-[var(--bg)] text-center">
                        <div className="text-[17px] font-extrabold" style={{ color: d.raw ? (activeCount > capacity ? "#e87a5d" : "#8ba87a") : (d.invert ? (d.val >= 4 ? "#e87a5d" : d.val >= 2 ? "#f4a83a" : "#8ba87a") : (d.val >= 4 ? "#8ba87a" : d.val >= 2 ? "#f4a83a" : "#e87a5d")) }}>{d.raw ? activeCount : d.val || "—"}</div>
                        <div className="text-[13px] font-semibold text-[var(--text-muted)] uppercase">{d.label}</div>
                        <div className="text-[12px] text-[var(--text-muted)]">{d.desc}</div>
                      </div>)}
                    </div>
                    {/* Recommendation */}
                    <div className="rounded-xl border border-[var(--accent-primary)]/20 bg-[rgba(244,168,58,0.04)] p-4">
                      <div className="text-[14px] font-bold text-[var(--accent-primary)] uppercase mb-2">Recommendation</div>
                      <div className="text-[14px] text-[var(--text-secondary)]">
                        {loadPct > 120 ? `Organization appears over capacity. Consider pausing or sequencing ${activeCount - capacity} initiative${activeCount - capacity > 1 ? "s" : ""}. Running too many changes simultaneously increases failure risk by 60%.` :
                         loadPct > 80 ? "Organization is approaching capacity. Consider prioritizing and sequencing remaining changes carefully before adding new initiatives." :
                         activeCount > 0 ? `You have room for ${capacity - activeCount} more concurrent initiative${capacity - activeCount > 1 ? "s" : ""}. Your change infrastructure can support additional transformation work.` :
                         "Enter your active change initiatives to assess capacity."}
                      </div>
                      {changeLoad.fatigue >= 4 && <div className="text-[14px] text-[var(--text-secondary)] mt-2"><span className="text-[var(--risk)]">⚠</span> High change fatigue detected. Consider a &quot;change holiday&quot; — pause non-critical changes for 1-2 months to rebuild organizational resilience.</div>}
                    </div>
                  </>;
                })()}
              </div>
            </div>
          </Card>}
        </div>}

        {/* ── Step 3.3: Workforce Model ── */}
        {omView === "3.3" && <div className="animate-tab-enter space-y-5">
          <Card title="Step 3.3 — Workforce Model & Change Capacity">
            <div className="text-[15px] text-[var(--text-secondary)] mb-4">Assess your organization{"'"}s capacity to absorb transformation and define workforce requirements.</div>
          </Card>
          {/* Reuse change capacity from People & Culture */}
          <Card title="Change Capacity Assessment">
            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-4">
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4"><label className="text-[14px] font-bold text-[var(--text-primary)] block mb-2">Active Change Initiatives</label><input value={changeLoad.active} onChange={e => setChangeLoad(p => ({...p, active: e.target.value}))} placeholder="e.g. ERP migration, org restructure, AI rollout..." className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" /><div className="text-[12px] text-[var(--text-muted)] mt-1">Count: {changeLoad.active ? changeLoad.active.split(",").filter(Boolean).length : 0}</div></div>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4"><label className="text-[14px] font-bold text-[var(--text-primary)] block mb-2">Change Fatigue (1-5)</label><div className="flex gap-1">{[1,2,3,4,5].map(n => <button key={n} onClick={() => setChangeLoad(p => ({...p, fatigue: p.fatigue === n ? 0 : n}))} className="flex-1 py-2 rounded-lg text-[14px] font-bold" style={{ background: changeLoad.fatigue >= n ? `${n <= 2 ? "#8ba87a" : n <= 3 ? "#f4a83a" : "#e87a5d"}15` : "var(--bg)", color: changeLoad.fatigue >= n ? (n <= 2 ? "#8ba87a" : n <= 3 ? "#f4a83a" : "#e87a5d") : "#8a7f6d", border: changeLoad.fatigue >= n ? `1px solid ${n <= 2 ? "#8ba87a" : n <= 3 ? "#f4a83a" : "#e87a5d"}` : "1px solid var(--border)" }}>{n}</button>)}</div></div>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4"><label className="text-[14px] font-bold text-[var(--text-primary)] block mb-2">Change Infrastructure (1-5)</label><div className="flex gap-1">{[1,2,3,4,5].map(n => <button key={n} onClick={() => setChangeLoad(p => ({...p, infrastructure: p.infrastructure === n ? 0 : n}))} className="flex-1 py-2 rounded-lg text-[14px] font-bold" style={{ background: changeLoad.infrastructure >= n ? `${n <= 2 ? "#e87a5d" : n <= 3 ? "#f4a83a" : "#8ba87a"}15` : "var(--bg)", color: changeLoad.infrastructure >= n ? (n <= 2 ? "#e87a5d" : n <= 3 ? "#f4a83a" : "#8ba87a") : "#8a7f6d", border: changeLoad.infrastructure >= n ? `1px solid ${n <= 2 ? "#e87a5d" : n <= 3 ? "#f4a83a" : "#8ba87a"}` : "1px solid var(--border)" }}>{n}</button>)}</div></div>
              </div>
              <div className="space-y-4">
                {(() => { const activeCount = changeLoad.active ? changeLoad.active.split(",").filter(Boolean).length : 0; const capacity = Math.max(1, Math.round((changeLoad.infrastructure || 1) * 1.5 + (changeLoad.history || 1) * 0.5 - (changeLoad.fatigue || 3) * 0.5 + 1)); const status = activeCount > capacity * 1.2 ? "Over Capacity" : activeCount > capacity * 0.8 ? "At Capacity" : activeCount > 0 ? "Has Room" : "Not Assessed"; const statusColor = activeCount > capacity * 1.2 ? "#e87a5d" : activeCount > capacity * 0.8 ? "#f4a83a" : "#8ba87a"; return <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-6 text-center"><div className="text-[14px] text-[var(--text-muted)] uppercase mb-2">Change Capacity</div><div className="text-[32px] font-extrabold mb-1" style={{ color: statusColor }}>{status}</div><div className="text-[14px] text-[var(--text-secondary)]">Can absorb ~{capacity} concurrent initiatives.{activeCount > 0 && <> Currently have <strong>{activeCount}</strong>.</>}</div></div>; })()}
              </div>
            </div>
          </Card>
          <button onClick={() => setOmView("4.1")} className="w-full px-4 py-3 rounded-xl text-[15px] font-semibold text-white" style={{ background: "linear-gradient(135deg, var(--success), var(--sage))" }}>Continue to Step 4.1: Financial Model →</button>
        </div>}

        {/* ── Step 4.1: Financial Model ── */}
        {omView === "4.1" && <div className="animate-tab-enter space-y-5">
          <div className="flex gap-1 rounded-xl bg-[var(--surface-2)] p-1 border border-[var(--border)]">
            {([
              { id: "abc" as const, label: "Activity Costing", icon: "📊" },
              { id: "cts" as const, label: "Cost-to-Serve", icon: "🎯" },
              { id: "rcg" as const, label: "Run/Change/Grow", icon: "📈" },
              { id: "compare" as const, label: "OM Cost Compare", icon: "⚖️" },
              { id: "bizcase" as const, label: "Business Case", icon: "💼" },
            ]).map(v => <button key={v.id} onClick={() => setFinView(v.id)} className="flex-1 px-3 py-2 rounded-lg text-[14px] font-semibold transition-all" style={{
              background: finView === v.id ? "rgba(244,168,58,0.12)" : "transparent",
              color: finView === v.id ? "#f4a83a" : "#8a7f6d",
            }}>{v.icon} {v.label}</button>)}
          </div>

          {/* ─── 1. ACTIVITY-BASED COSTING ─── */}
          {finView === "abc" && <Card title={<div>Activity-Based Costing — Current vs. Target ($K)<div style={{ fontSize: 11, color: "#8a7f6d", marginTop: 2, fontWeight: 400 }}>What each capability costs to deliver</div></div>}>
            <div className="text-[16px] text-[var(--text-secondary)] mb-5" style={{ fontFamily: "'Inter Tight', sans-serif" }}>Cost components per function in thousands ($K). Click any cell to edit.</div>
            {(() => {
              const totalCur = FIN_FUNCS.reduce((s, f) => { const c = finCosts[f]; return s + (c?.people||0) + (c?.technology||0) + (c?.outsourcing||0) + (c?.facilities||0); }, 0);
              const totalTgt = FIN_FUNCS.reduce((s, f) => { const c = finCosts[f]; return s + (c?.peopleTgt||0) + (c?.technologyTgt||0) + (c?.outsourcingTgt||0) + (c?.facilitiesTgt||0); }, 0);
              const delta = totalTgt - totalCur;
              const funcColors: Record<string, string> = { Finance: "#f4a83a", HR: "#a78bb8", Technology: "#f4a83a", Operations: "#f4a83a", Marketing: "#e87a5d", Legal: "#e87a5d", Product: "#8ba87a", Executive: "#a78bb8" };
              return <>
                {/* Glass KPI cards */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="kpi-glass"><div className="text-[24px] font-extrabold font-data text-[var(--text-primary)]" style={{ animation: "countUp 0.5s ease-out", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>${fmtK(totalCur)}</div><div className="text-[13px] text-[var(--text-muted)] uppercase tracking-wider mt-1" style={{ fontFamily: "'Inter Tight', sans-serif" }}>Current Total</div></div>
                  <div className="kpi-glass" style={{ background: "linear-gradient(135deg, rgba(14,165,233,0.08), rgba(19,27,46,0.9))" }}><div className="text-[24px] font-extrabold font-data" style={{ color: "var(--amber)", animation: "countUp 0.5s ease-out", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>${fmtK(totalTgt)}</div><div className="text-[13px] text-[var(--text-muted)] uppercase tracking-wider mt-1" style={{ fontFamily: "'Inter Tight', sans-serif" }}>Target Total</div></div>
                  <div className="kpi-glass" style={{ background: `linear-gradient(135deg, ${delta <= 0 ? "rgba(139,168,122,0.08)" : "rgba(232,122,93,0.08)"}, rgba(19,27,46,0.9))` }}><div className="flex items-center justify-center gap-2"><span className="text-[18px]">{delta <= 0 ? "↓" : "↑"}</span><span className="text-[24px] font-extrabold font-data" style={{ color: delta <= 0 ? "#8ba87a" : "#e87a5d", animation: "countUp 0.5s ease-out", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>${fmtK(Math.abs(delta))}</span></div><div className="text-[13px] text-[var(--text-muted)] uppercase tracking-wider mt-1" style={{ fontFamily: "'Inter Tight', sans-serif" }}>{delta <= 0 ? "Annual Savings" : "Additional Cost"}</div></div>
                </div>
                {/* Premium table */}
                <div className="overflow-x-auto rounded-2xl border border-[var(--border)]" style={{ boxShadow: "var(--shadow-2)" }}><table className="w-full"><thead><tr style={{ background: "linear-gradient(135deg, var(--surface-2), var(--surface-3))" }}>
                  <th className="px-4 py-3 text-left text-[13px] font-bold text-[var(--text-muted)] uppercase tracking-wider border-b border-[var(--border)]" style={{ fontFamily: "'Inter Tight', sans-serif" }}>Function</th>
                  {["People","Technology","Outsource","Facilities"].map(h => <th key={h} className="px-2 py-3 text-center text-[12px] font-bold text-[var(--text-muted)] uppercase tracking-wider border-b border-[var(--border)]" colSpan={2} style={{ fontFamily: "'Inter Tight', sans-serif" }}>{h}<div className="flex justify-center gap-2 mt-1"><span className="text-[11px] font-semibold" style={{ color: "#f4a83a" }}>Now</span><span className="text-[11px] font-semibold" style={{ color: "var(--amber)" }}>Target</span></div></th>)}
                  <th className="px-3 py-3 text-center text-[12px] font-bold text-[var(--text-muted)] uppercase border-b border-[var(--border)]" style={{ fontFamily: "'Inter Tight', sans-serif" }}>Total</th>
                  <th className="px-3 py-3 text-center text-[12px] font-bold uppercase border-b border-[var(--border)]" style={{ color: "var(--amber)", fontFamily: "'Inter Tight', sans-serif" }}>Target</th>
                  <th className="px-3 py-3 text-center text-[12px] font-bold text-[var(--text-muted)] uppercase border-b border-[var(--border)]" style={{ fontFamily: "'Inter Tight', sans-serif" }}>Delta</th>
                </tr></thead><tbody>
                  {FIN_FUNCS.map((f, fi) => {
                    const c = finCosts[f] || { people: 0, technology: 0, outsourcing: 0, facilities: 0, peopleTgt: 0, technologyTgt: 0, outsourcingTgt: 0, facilitiesTgt: 0 };
                    const curTotal = c.people + c.technology + c.outsourcing + c.facilities;
                    const tgtTotal = c.peopleTgt + c.technologyTgt + c.outsourcingTgt + c.facilitiesTgt;
                    const d = tgtTotal - curTotal;
                    const inp = (field: keyof FinFuncCost, isTgt?: boolean) => <input type="number" value={c[field] || ""} onChange={e => setFinCosts(prev => ({...prev, [f]: {...c, [field]: Number(e.target.value) || 0}}))} className="bg-transparent border-b border-transparent hover:border-[var(--border)] rounded-none px-1 py-1 text-[15px] text-right outline-none w-16 font-data transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" style={{ color: isTgt ? "var(--amber)" : "var(--text-primary)" }} />;
                    return <tr key={f} className="border-b border-[var(--border)] transition-colors" style={{ background: fi % 2 === 0 ? "rgba(244,168,58,0.02)" : "transparent" }}>
                      <td className="px-4 py-3 text-[16px] font-bold text-[var(--text-primary)]" style={{ fontFamily: "'Inter Tight', sans-serif", borderLeft: `3px solid ${funcColors[f] || "#888"}` }}>{f}</td>
                      <td className="px-2 py-2 text-right">{inp("people")}</td><td className="px-2 py-2 text-right">{inp("peopleTgt", true)}</td>
                      <td className="px-2 py-2 text-right">{inp("technology")}</td><td className="px-2 py-2 text-right">{inp("technologyTgt", true)}</td>
                      <td className="px-2 py-2 text-right">{inp("outsourcing")}</td><td className="px-2 py-2 text-right">{inp("outsourcingTgt", true)}</td>
                      <td className="px-2 py-2 text-right">{inp("facilities")}</td><td className="px-2 py-2 text-right">{inp("facilitiesTgt", true)}</td>
                      <td className="px-3 py-3 text-right text-[16px] font-bold font-data text-[var(--text-primary)]">${fmtK(curTotal)}</td>
                      <td className="px-3 py-3 text-right text-[16px] font-bold font-data" style={{ color: "var(--amber)" }}>${fmtK(tgtTotal)}</td>
                      <td className="px-3 py-3 text-right"><span className="text-[15px] font-extrabold font-data px-2 py-0.5 rounded-lg" style={{ color: d <= 0 ? "#8ba87a" : "#e87a5d", background: d <= 0 ? "rgba(139,168,122,0.08)" : "rgba(232,122,93,0.08)" }}>{d <= 0 ? "" : "+"}{fmtK(d)}</span></td>
                    </tr>;
                  })}
                </tbody></table></div>
              </>;
            })()}
          </Card>}

          {/* ─── 2. COST-TO-SERVE ─── */}
          {finView === "cts" && <Card title="Cost-to-Serve Analysis — Service Functions">
            <div className="text-[16px] text-[var(--text-secondary)] mb-6" style={{ fontFamily: "'Inter Tight', sans-serif" }}>Cost per employee served vs. industry benchmark, by function.</div>
            <div className="space-y-5">
              {Object.entries(finCts).map(([func, data]) => {
                const gap = data.costPerEmp - data.benchmark;
                const gapPct = data.benchmark > 0 ? Math.round((gap / data.benchmark) * 100) : 0;
                const maxVal = Math.max(data.costPerEmp, data.benchmark, 1);
                const costPct = (data.costPerEmp / maxVal) * 100;
                const benchPct = (data.benchmark / maxVal) * 100;
                // Ring gauge: 0-100% of circumference
                const ringRadius = 40; const ringCirc = 2 * Math.PI * ringRadius;
                const ringFill = (data.costPerEmp / (data.benchmark * 1.5 || 1)) * 100;
                const ringOffset = ringCirc - (Math.min(ringFill, 100) / 100) * ringCirc;
                // Gradient bar position: benchmark at center (50%), cost position relative
                const barPos = data.benchmark > 0 ? Math.min(95, Math.max(5, 50 + (gap / data.benchmark) * 50)) : 50;
                return <div key={func} className="glass-card p-6">
                  <div className="flex gap-6">
                    {/* Left: Ring gauge */}
                    <div className="shrink-0 flex flex-col items-center justify-center" style={{ width: 120 }}>
                      <svg width="100" height="100" viewBox="0 0 100 100" className="transform -rotate-90">
                        <circle cx="50" cy="50" r={ringRadius} fill="none" stroke="#1e2030" strokeWidth="8" />
                        <circle cx="50" cy="50" r={ringRadius} fill="none" stroke={gap > 0 ? "#e87a5d" : "#8ba87a"} strokeWidth="8" strokeDasharray={ringCirc} strokeDashoffset={ringOffset} strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.8s ease-out" }} />
                        {/* Benchmark marker */}
                        <circle cx="50" cy="50" r={ringRadius} fill="none" stroke="#f4a83a" strokeWidth="2" strokeDasharray={`2 ${ringCirc - 2}`} strokeDashoffset={ringCirc - (Math.min(100, benchPct / 1.5 * 100 / maxVal) / 100) * ringCirc} opacity="0.6" />
                      </svg>
                      <div className="absolute text-center" style={{ marginTop: -4 }}>
                        <div className="text-[17px] font-extrabold font-data" style={{ color: gap > 0 ? "#e87a5d" : "#8ba87a" }}>{gap > 0 ? "+" : ""}${Math.abs(gap)}</div>
                        <div className="text-[9px] text-[var(--text-muted)] uppercase">gap</div>
                      </div>
                    </div>
                    {/* Right: details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-[22px] font-bold text-[var(--text-primary)]" style={{ fontFamily: "'Inter Tight', sans-serif" }}>{func}</span>
                        <span className="px-2.5 py-1 rounded-full text-[12px] font-semibold bg-[var(--surface-2)] text-[var(--text-muted)]">{data.headcount} staff</span>
                      </div>
                      <div className="flex items-baseline gap-4 mb-3 text-[16px]">
                        <span className="font-data"><span className="text-[var(--text-muted)] text-[13px] uppercase mr-1">Yours</span><input type="number" value={data.costPerEmp} onChange={e => setFinCts(prev => ({...prev, [func]: {...data, costPerEmp: Number(e.target.value) || 0}}))} className="font-extrabold text-[var(--text-primary)] bg-transparent outline-none w-20 border-b border-transparent hover:border-[var(--border)] font-data text-[16px]" /><span className="text-[var(--text-muted)] text-[13px]">/emp</span></span>
                        <span className="text-[var(--text-muted)]">vs.</span>
                        <span className="font-data"><span className="text-[var(--text-muted)] text-[13px] uppercase mr-1">Benchmark</span><input type="number" value={data.benchmark} onChange={e => setFinCts(prev => ({...prev, [func]: {...data, benchmark: Number(e.target.value) || 0}}))} className="font-extrabold text-[var(--accent-primary)] bg-transparent outline-none w-20 border-b border-transparent hover:border-[var(--border)] font-data text-[16px]" /><span className="text-[var(--text-muted)] text-[13px]">/emp</span></span>
                        <span className="font-extrabold font-data" style={{ color: gap > 0 ? "#e87a5d" : "#8ba87a" }}>({gapPct > 0 ? "+" : ""}{gapPct}%)</span>
                      </div>
                      {/* Gradient zone bar */}
                      <div className="relative mb-3">
                        <div className="gradient-bar-zones" />
                        <div className="absolute top-[-3px] w-3 h-3 rounded-full border-2 border-white" style={{ left: `calc(${barPos}% - 6px)`, background: gap > 0 ? "#e87a5d" : gap < 0 ? "#8ba87a" : "#f4a83a", boxShadow: "0 1px 4px rgba(0,0,0,0.3)", transition: "left 0.5s ease-out" }} />
                        <div className="flex justify-between mt-1 text-[11px] text-[var(--text-muted)]"><span>Below benchmark</span><span>At benchmark</span><span>Above</span></div>
                      </div>
                      {/* Insight */}
                      {gap > 0 && <div className="text-[15px] text-[var(--text-secondary)] border-l-2 pl-3 mt-2" style={{ borderColor: "#f4a83a" }}>
                        {func === "HR" ? "Implementing shared services and AI-assisted onboarding could reduce cost-to-serve by 25%." : func === "Technology" ? "Consolidating service desk and automating L1 support could reduce cost by 20%." : "Standardizing processes and automating reporting could close the gap."}
                      </div>}
                    </div>
                  </div>
                </div>;
              })}
              <button onClick={() => {
                const func = prompt("Add cost-to-serve for which function?");
                if (func && !finCts[func]) setFinCts(prev => ({...prev, [func]: { headcount: 50, costPerEmp: 2000, benchmark: 1500 }}));
              }} className="w-full px-4 py-2 rounded-xl text-[14px] font-semibold text-[var(--text-muted)] border border-dashed border-[var(--border)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-all">+ Add Function</button>
            </div>
          </Card>}

          {/* ─── 3. RUN / CHANGE / GROW ─── */}
          {finView === "rcg" && <Card title="Run / Change / Grow Budget Allocation">
            <div className="text-[16px] text-[var(--text-secondary)] mb-4" style={{ fontFamily: "'Inter Tight', sans-serif" }}>Allocate budget across Run (BAU), Change (transformation), and Grow (innovation).</div>
            {/* Summary row */}
            {(() => {
              const totals = FIN_FUNCS.reduce((s, f) => { const r = finRcg[f] || { run: 65, change: 20, grow: 15, runTgt: 55, changeTgt: 25, growTgt: 20 }; return { run: s.run + r.run, change: s.change + r.change, grow: s.grow + r.grow, runTgt: s.runTgt + r.runTgt, changeTgt: s.changeTgt + r.changeTgt, growTgt: s.growTgt + r.growTgt }; }, { run: 0, change: 0, grow: 0, runTgt: 0, changeTgt: 0, growTgt: 0 });
              const n = FIN_FUNCS.length || 1;
              const avgR = Math.round(totals.runTgt / n); const avgC = Math.round(totals.changeTgt / n); const avgG = Math.round(totals.growTgt / n);
              return <div className="glass-card p-4 mb-5">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="text-[15px] text-[var(--text-muted)]">Target Avg: <span className="font-bold font-data" style={{ color: "#f4a83a" }}>Run {avgR}%</span> · <span className="font-bold font-data" style={{ color: "var(--amber)" }}>Change {avgC}%</span> · <span className="font-bold font-data" style={{ color: "#8ba87a" }}>Grow {avgG}%</span></div>
                  <div className="flex gap-3 text-[13px] text-[var(--text-muted)]">
                    <span>Benchmark: 60/25/15</span>
                    <span className="font-semibold" style={{ color: avgR <= 60 ? "#8ba87a" : "#f4a83a" }}>Run {avgR > 60 ? `+${avgR - 60}%` : `${avgR - 60}%`}</span>
                    <span className="font-semibold" style={{ color: avgG >= 15 ? "#8ba87a" : "#f4a83a" }}>Grow {avgG >= 15 ? "✓" : `${avgG - 15}%`}</span>
                  </div>
                </div>
              </div>;
            })()}
            {/* Function cards as vertical allocation bars */}
            <div className="grid grid-cols-4 lg:grid-cols-8 gap-3">
              {FIN_FUNCS.map(f => {
                const r = finRcg[f] || { run: 65, change: 20, grow: 15, runTgt: 55, changeTgt: 25, growTgt: 20 };
                const update = (field: keyof FinRcgEntry, val: number) => setFinRcg(prev => ({...prev, [f]: {...r, [field]: val}}));
                // Benchmark overlay
                const benchRun = 60, benchChange = 25, benchGrow = 15;
                return <div key={f} className="glass-card p-3 flex flex-col">
                  <div className="text-[14px] font-bold text-[var(--text-primary)] text-center mb-2" style={{ fontFamily: "'Inter Tight', sans-serif" }}>{f.slice(0, 8)}</div>
                  {/* Vertical stacked bar */}
                  <div className="relative flex-1 min-h-[180px] rounded-xl overflow-hidden border border-[var(--border)]">
                    {/* Grow (top) */}
                    <div className="absolute bottom-0 left-0 right-0 flex flex-col">
                      <div className="flex items-center justify-center transition-all" style={{ height: `${r.growTgt * 1.8}px`, background: "rgba(139,168,122,0.25)" }}>
                        <span className="text-[12px] font-bold text-[var(--success)]">{r.growTgt}%</span>
                      </div>
                      <div className="flex items-center justify-center transition-all" style={{ height: `${r.changeTgt * 1.8}px`, background: "rgba(14,165,233,0.2)" }}>
                        <span className="text-[12px] font-bold" style={{ color: "var(--amber)" }}>{r.changeTgt}%</span>
                      </div>
                      <div className="flex items-center justify-center transition-all" style={{ height: `${r.runTgt * 1.8}px`, background: "rgba(244,168,58,0.15)" }}>
                        <span className="text-[12px] font-bold text-[var(--accent-primary)]">{r.runTgt}%</span>
                      </div>
                    </div>
                    {/* Benchmark dashed overlay */}
                    <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
                      <div style={{ height: `${benchGrow * 1.8}px` }} className="border-t border-dashed border-white/10" />
                      <div style={{ height: `${benchChange * 1.8}px` }} className="border-t border-dashed border-white/10" />
                    </div>
                  </div>
                  {/* Inline editors */}
                  <div className="mt-2 space-y-1">
                    {(["run", "change", "grow"] as const).map(k => {
                      const colors = { run: "#f4a83a", change: "var(--amber)", grow: "#8ba87a" };
                      return <div key={k} className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase" style={{ color: colors[k] }}>{k[0]}</span>
                        <input type="number" value={r[`${k}Tgt` as keyof FinRcgEntry]} onChange={e => update(`${k}Tgt` as keyof FinRcgEntry, Number(e.target.value) || 0)} className="w-10 bg-transparent border-b border-transparent hover:border-[var(--border)] text-[12px] text-right outline-none font-data text-[var(--text-primary)]" />
                      </div>;
                    })}
                  </div>
                </div>;
              })}
            </div>
            {/* Legend */}
            <div className="flex gap-4 mt-3 text-[13px] text-[var(--text-muted)]">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: "rgba(244,168,58,0.15)" }} />Run (BAU)</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: "rgba(14,165,233,0.2)" }} />Change</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: "rgba(139,168,122,0.25)" }} />Grow</span>
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 border-t border-dashed border-white/30" style={{ width: 12 }} />Benchmark</span>
            </div>
          </Card>}

          {/* ─── 4. OM COST COMPARISON ─── */}
          {finView === "compare" && <Card title="Operating Model Cost Comparison">
            <div className="text-[15px] text-[var(--text-secondary)] mb-4">Side-by-side comparison: Current State vs. Target State. Costs aggregated from Activity-Based Costing.</div>
            {(() => {
              const curPeople = FIN_FUNCS.reduce((s, f) => s + (finCosts[f]?.people || 0), 0);
              const curTech = FIN_FUNCS.reduce((s, f) => s + (finCosts[f]?.technology || 0), 0);
              const curOut = FIN_FUNCS.reduce((s, f) => s + (finCosts[f]?.outsourcing || 0), 0);
              const curFac = FIN_FUNCS.reduce((s, f) => s + (finCosts[f]?.facilities || 0), 0);
              const curTotal = curPeople + curTech + curOut + curFac;
              const tgtPeople = FIN_FUNCS.reduce((s, f) => s + (finCosts[f]?.peopleTgt || 0), 0);
              const tgtTech = FIN_FUNCS.reduce((s, f) => s + (finCosts[f]?.technologyTgt || 0), 0);
              const tgtOut = FIN_FUNCS.reduce((s, f) => s + (finCosts[f]?.outsourcingTgt || 0), 0);
              const tgtFac = FIN_FUNCS.reduce((s, f) => s + (finCosts[f]?.facilitiesTgt || 0), 0);
              const tgtTotal = tgtPeople + tgtTech + tgtOut + tgtFac;
              const netDelta = tgtTotal - curTotal;
              const peopleSav = curPeople - tgtPeople;
              const techInv = tgtTech - curTech;
              const rows = [
                { label: "People", cur: curPeople, tgt: tgtPeople, color: "#f4a83a" },
                { label: "Technology", cur: curTech, tgt: tgtTech, color: "var(--purple)" },
                { label: "Outsourcing", cur: curOut, tgt: tgtOut, color: "#f4a83a" },
                { label: "Facilities", cur: curFac, tgt: tgtFac, color: "#8ba87a" },
              ];
              const upfront = techInv > 0 ? techInv * 0.8 : 500; // estimate upfront from tech investment
              const annualSav = netDelta < 0 ? Math.abs(netDelta) : 0;
              const paybackMonths = annualSav > 0 ? Math.round((upfront / annualSav) * 12) : 0;
              return <div className="space-y-5">
                <div className="grid grid-cols-2 gap-5">
                  {/* Current */}
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                    <div className="text-[13px] font-semibold text-[var(--text-muted)] uppercase mb-3">Current State</div>
                    <div className="text-[24px] font-extrabold text-[var(--text-primary)] mb-3">${fmtK(curTotal)}<span className="text-[14px] text-[var(--text-muted)] font-normal ml-1">/year</span></div>
                    {rows.map(r => <div key={r.label} className="mb-2">
                      <div className="flex justify-between text-[14px] mb-1"><span className="text-[var(--text-secondary)]">{r.label}</span><span className="font-semibold">${fmtK(r.cur)}</span></div>
                      <div className="h-2 bg-[var(--bg)] rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${(r.cur / curTotal) * 100}%`, background: r.color }} /></div>
                    </div>)}
                  </div>
                  {/* Target */}
                  <div className="rounded-xl border-2 border-[var(--accent-primary)]/30 bg-[var(--surface-2)] p-4">
                    <div className="text-[14px] font-bold text-[var(--accent-primary)] uppercase mb-3">Target State</div>
                    <div className="text-[24px] font-extrabold text-[var(--accent-primary)] mb-3">${fmtK(tgtTotal)}<span className="text-[14px] text-[var(--text-muted)] font-normal ml-1">/year</span></div>
                    {rows.map(r => { const d = r.tgt - r.cur; return <div key={r.label} className="mb-2">
                      <div className="flex justify-between text-[14px] mb-1"><span className="text-[var(--text-secondary)]">{r.label}</span><span className="font-semibold">${fmtK(r.tgt)} <span className="text-[12px]" style={{ color: d <= 0 ? "#8ba87a" : "#e87a5d" }}>({d <= 0 ? "" : "+"}{fmtK(d)})</span></span></div>
                      <div className="h-2 bg-[var(--bg)] rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${(r.tgt / Math.max(curTotal, tgtTotal)) * 100}%`, background: r.color }} /></div>
                    </div>; })}
                  </div>
                </div>
                {/* Summary */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl p-4 text-center" style={{ background: netDelta <= 0 ? "rgba(139,168,122,0.06)" : "rgba(232,122,93,0.06)", border: `1px solid ${netDelta <= 0 ? "#8ba87a" : "#e87a5d"}20` }}>
                    <div className="text-[24px] font-extrabold" style={{ color: netDelta <= 0 ? "#8ba87a" : "#e87a5d" }}>{netDelta <= 0 ? "-" : "+"}${fmtK(Math.abs(netDelta))}</div>
                    <div className="text-[13px] text-[var(--text-muted)] uppercase">{netDelta <= 0 ? "Annual Savings" : "Additional Cost"}</div>
                  </div>
                  <div className="rounded-xl p-4 bg-[var(--surface-2)] text-center border border-[var(--border)]">
                    <div className="text-[24px] font-extrabold text-[var(--warning)]">${fmtK(upfront)}</div>
                    <div className="text-[13px] text-[var(--text-muted)] uppercase">Est. Upfront Investment</div>
                  </div>
                  <div className="rounded-xl p-4 bg-[var(--surface-2)] text-center border border-[var(--border)]">
                    <div className="text-[24px] font-extrabold text-[var(--accent-primary)]">{paybackMonths > 0 ? `${paybackMonths} mo` : "—"}</div>
                    <div className="text-[13px] text-[var(--text-muted)] uppercase">Payback Period</div>
                  </div>
                </div>
                {annualSav > 0 && <div className="rounded-xl border border-[var(--accent-primary)]/20 bg-[rgba(244,168,58,0.04)] p-4 text-[14px] text-[var(--text-secondary)]">
                  <strong className="text-[var(--accent-primary)]">Summary:</strong> Target operating model saves <strong>${fmtK(annualSav)}</strong> annually{peopleSav > 0 && <> (primarily from <strong>${fmtK(peopleSav)}</strong> people cost reduction)</>}{techInv > 0 && <>, requiring <strong>${fmtK(techInv)}</strong> additional technology investment</>}. Estimated upfront cost of <strong>${fmtK(upfront)}</strong> yields a <strong>{paybackMonths}-month</strong> payback.
                </div>}
              </div>;
            })()}
          </Card>}

          {/* ─── 5. BUSINESS CASE BUILDER ─── */}
          {finView === "bizcase" && <Card title="Business Case Builder">
            <div className="text-[15px] text-[var(--text-secondary)] mb-4">Aggregate all financial impacts into a single business case. Edit inputs to model scenarios.</div>
            {(() => {
              // Auto-calculate from other tabs
              const curTotal = FIN_FUNCS.reduce((s, f) => { const c = finCosts[f]; return s + (c?.people||0) + (c?.technology||0) + (c?.outsourcing||0) + (c?.facilities||0); }, 0);
              const tgtTotal = FIN_FUNCS.reduce((s, f) => { const c = finCosts[f]; return s + (c?.peopleTgt||0) + (c?.technologyTgt||0) + (c?.outsourcingTgt||0) + (c?.facilitiesTgt||0); }, 0);
              const autoSavings = Math.max(0, curTotal - tgtTotal);
              const autoInvestment = FIN_FUNCS.reduce((s, f) => { const c = finCosts[f]; const techDelta = (c?.technologyTgt||0) - (c?.technology||0); return s + (techDelta > 0 ? techDelta : 0); }, 0) * 0.8;

              const investment = Number(finBizCase.investment) || autoInvestment || 0;
              const annualSavings = Number(finBizCase.annualSavings) || autoSavings || 0;
              const revenueImpact = Number(finBizCase.revenueImpact) || 0;
              const discountRate = Number(finBizCase.discountRate) || 10;
              const totalAnnualBenefit = annualSavings + revenueImpact;
              const paybackMonths = totalAnnualBenefit > 0 ? Math.round((investment / totalAnnualBenefit) * 12) : 0;
              const roi = investment > 0 ? Math.round(((totalAnnualBenefit * 3 - investment) / investment) * 100) : 0;
              // Simple NPV over 3 years
              const npv = -investment + totalAnnualBenefit / (1 + discountRate/100) + totalAnnualBenefit / Math.pow(1 + discountRate/100, 2) + totalAnnualBenefit / Math.pow(1 + discountRate/100, 3);
              const riskAdjustedRoi = Math.round(roi * 0.75); // 25% risk haircut

              return <div className="grid grid-cols-2 gap-5">
                {/* Left: Inputs */}
                <div className="space-y-4">
                  <div className="text-[14px] font-bold text-[var(--text-muted)] uppercase">Inputs</div>
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 space-y-3">
                    <div><label className="text-[13px] text-[var(--text-muted)] block mb-1">One-Time Investment ($K) {autoInvestment > 0 && <span className="text-[11px] text-[var(--accent-primary)]">auto: {autoInvestment.toFixed(0)}</span>}</label>
                    <input type="number" value={finBizCase.investment} onChange={e => setFinBizCase(p => ({...p, investment: e.target.value}))} placeholder={autoInvestment.toFixed(0)} className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-[15px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" /></div>
                    <div><label className="text-[13px] text-[var(--text-muted)] block mb-1">Annual Recurring Savings ($K) {autoSavings > 0 && <span className="text-[11px] text-[var(--accent-primary)]">auto: {autoSavings.toFixed(0)}</span>}</label>
                    <input type="number" value={finBizCase.annualSavings} onChange={e => setFinBizCase(p => ({...p, annualSavings: e.target.value}))} placeholder={autoSavings.toFixed(0)} className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-[15px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" /></div>
                    <div><label className="text-[13px] text-[var(--text-muted)] block mb-1">Annual Revenue Impact ($K)</label>
                    <input type="number" value={finBizCase.revenueImpact} onChange={e => setFinBizCase(p => ({...p, revenueImpact: e.target.value}))} placeholder="0" className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-[15px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" /></div>
                    <div><label className="text-[13px] text-[var(--text-muted)] block mb-1">Discount Rate (%)</label>
                    <input type="number" value={finBizCase.discountRate} onChange={e => setFinBizCase(p => ({...p, discountRate: e.target.value}))} className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-[15px] text-[var(--text-primary)] outline-none" /></div>
                  </div>
                </div>
                {/* Right: Outputs */}
                <div className="space-y-4">
                  <div className="text-[14px] font-bold text-[var(--text-muted)] uppercase">Business Case Summary</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl p-4 bg-[var(--surface-2)] border border-[var(--border)] text-center"><div className="text-[20px] font-extrabold text-[var(--warning)]">${fmtK(investment)}</div><div className="text-[12px] text-[var(--text-muted)] uppercase">Investment</div></div>
                    <div className="rounded-xl p-4 bg-[var(--surface-2)] border border-[var(--border)] text-center"><div className="text-[20px] font-extrabold text-[var(--success)]">${fmtK(annualSavings)}</div><div className="text-[12px] text-[var(--text-muted)] uppercase">Annual Savings</div></div>
                    <div className="rounded-xl p-4 bg-[var(--surface-2)] border border-[var(--border)] text-center"><div className="text-[20px] font-extrabold text-[var(--accent-primary)]">{paybackMonths > 0 ? `${paybackMonths} mo` : "—"}</div><div className="text-[12px] text-[var(--text-muted)] uppercase">Payback Period</div></div>
                    <div className="rounded-xl p-4 bg-[var(--surface-2)] border border-[var(--border)] text-center"><div className="text-[20px] font-extrabold" style={{ color: roi > 0 ? "#8ba87a" : "#e87a5d" }}>{roi}%</div><div className="text-[12px] text-[var(--text-muted)] uppercase">3-Year ROI</div></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl p-4 border text-center" style={{ background: npv > 0 ? "rgba(139,168,122,0.06)" : "rgba(232,122,93,0.06)", borderColor: npv > 0 ? "rgba(139,168,122,0.2)" : "rgba(232,122,93,0.2)" }}>
                      <div className="text-[20px] font-extrabold" style={{ color: npv > 0 ? "#8ba87a" : "#e87a5d" }}>${fmtK(Math.round(npv))}</div>
                      <div className="text-[12px] text-[var(--text-muted)] uppercase">3-Year NPV</div>
                    </div>
                    <div className="rounded-xl p-4 bg-[var(--surface-2)] border border-[var(--border)] text-center">
                      <div className="text-[20px] font-extrabold text-[var(--purple)]">{riskAdjustedRoi}%</div>
                      <div className="text-[12px] text-[var(--text-muted)] uppercase">Risk-Adj. ROI (75%)</div>
                    </div>
                  </div>
                  {/* Narrative */}
                  <div className="rounded-xl border border-[var(--accent-primary)]/20 bg-[rgba(244,168,58,0.04)] p-4 text-[14px] text-[var(--text-secondary)]">
                    <strong className="text-[var(--accent-primary)]">Executive Summary:</strong> {investment > 0 && annualSavings > 0 ? <>This transformation requires a <strong>${fmtK(investment)}</strong> one-time investment and delivers <strong>${fmtK(annualSavings)}</strong> in annual recurring savings{revenueImpact > 0 && <> plus <strong>${fmtK(revenueImpact)}</strong> in annual revenue impact</>}. The investment pays back in <strong>{paybackMonths} months</strong> with a 3-year NPV of <strong>${fmtK(Math.round(npv))}</strong> (at {discountRate}% discount rate). Risk-adjusted 3-year ROI is <strong>{riskAdjustedRoi}%</strong>.</> : "Enter investment and savings figures to generate the business case narrative."}
                  </div>
                </div>
              </div>;
            })()}
          </Card>}
        </div>}

        {/* ── PERFORMANCE TAB ── */}
        {omView === "4.2" && <div className="animate-tab-enter space-y-5">
          <div className="flex gap-1 rounded-xl bg-[var(--surface-2)] p-1 border border-[var(--border)]">
            {([
              { id: "scorecard" as const, label: "Balanced Scorecard", icon: "📋" },
              { id: "okr" as const, label: "OKR Framework", icon: "🎯" },
              { id: "indicators" as const, label: "Leading/Lagging", icon: "⚡" },
              { id: "healthcheck" as const, label: "OM Health Check", icon: "🩺" },
            ]).map(v => <button key={v.id} onClick={() => setPerfView(v.id)} className="flex-1 px-3 py-2 rounded-lg text-[14px] font-semibold transition-all" style={{
              background: perfView === v.id ? "rgba(244,168,58,0.12)" : "transparent",
              color: perfView === v.id ? "#f4a83a" : "#8a7f6d",
            }}>{v.icon} {v.label}</button>)}
          </div>

          {/* ─── 1. BALANCED SCORECARD ─── */}
          {perfView === "scorecard" && <Card title={<div>Balanced Scorecard Dashboard<div style={{ fontSize: 11, color: "#8a7f6d", marginTop: 2, fontWeight: 400 }}>Connecting strategy to measurable outcomes</div></div>}>
            <div className="text-[15px] text-[var(--text-secondary)] mb-4">KPIs across 4 perspectives. Click RAG status to cycle. Linked to your strategic priorities from the Strategy tab.</div>
            {/* Summary */}
            {(() => {
              const rag = { Red: perfKpis.filter(k => k.status === "Red").length, Amber: perfKpis.filter(k => k.status === "Amber").length, Green: perfKpis.filter(k => k.status === "Green").length };
              return <div className="grid grid-cols-4 gap-3 mb-4">
                <div className="rounded-xl p-3 bg-[var(--surface-2)] text-center"><div className="text-[20px] font-extrabold text-[var(--text-primary)]">{perfKpis.length}</div><div className="text-[12px] text-[var(--text-muted)] uppercase">Total KPIs</div></div>
                <div className="rounded-xl p-3 bg-[var(--surface-2)] text-center"><div className="text-[20px] font-extrabold text-[var(--success)]">{rag.Green}</div><div className="text-[12px] text-[var(--text-muted)] uppercase">On Track</div></div>
                <div className="rounded-xl p-3 bg-[var(--surface-2)] text-center"><div className="text-[20px] font-extrabold text-[var(--warning)]">{rag.Amber}</div><div className="text-[12px] text-[var(--text-muted)] uppercase">At Risk</div></div>
                <div className="rounded-xl p-3 bg-[var(--surface-2)] text-center"><div className="text-[20px] font-extrabold text-[var(--risk)]">{rag.Red}</div><div className="text-[12px] text-[var(--text-muted)] uppercase">Off Track</div></div>
              </div>;
            })()}
            {/* Perspectives */}
            {(["Financial", "Customer", "Process", "Learning"] as const).map(perspective => {
              const pColors: Record<string, string> = { Financial: "#f4a83a", Customer: "#8ba87a", Process: "var(--purple)", Learning: "#f4a83a" };
              const pIcons: Record<string, string> = { Financial: "💰", Customer: "🎯", Process: "⚙️", Learning: "📚" };
              const kpis = perfKpis.filter(k => k.perspective === perspective);
              return <div key={perspective} className="rounded-xl border-l-4 border border-[var(--border)] bg-[var(--surface-2)] p-4 mb-3" style={{ borderLeftColor: pColors[perspective] }}>
                <div className="flex items-center gap-2 mb-3"><span>{pIcons[perspective]}</span><span className="text-[15px] font-bold uppercase tracking-wider" style={{ color: pColors[perspective] }}>{perspective === "Learning" ? "Learning & Growth" : perspective === "Customer" ? "Customer / Stakeholder" : perspective === "Process" ? "Internal Process" : perspective}</span><span className="text-[13px] text-[var(--text-muted)]">{kpis.length} KPIs</span></div>
                <div className="overflow-x-auto"><table className="w-full text-[14px]"><thead><tr>
                  <th className="px-2 py-1 text-left text-[12px] font-semibold text-[var(--text-muted)] uppercase">KPI</th>
                  <th className="px-2 py-1 text-center text-[12px] font-semibold text-[var(--text-muted)]">Current</th>
                  <th className="px-2 py-1 text-center text-[12px] font-semibold text-[var(--text-muted)]">Target</th>
                  <th className="px-2 py-1 text-center text-[12px] font-semibold text-[var(--text-muted)]">Owner</th>
                  <th className="px-2 py-1 text-center text-[12px] font-semibold text-[var(--text-muted)]">Freq</th>
                  <th className="px-2 py-1 text-center text-[12px] font-semibold text-[var(--text-muted)]">Strategy</th>
                  <th className="px-2 py-1 text-center text-[12px] font-semibold text-[var(--text-muted)]">RAG</th>
                </tr></thead><tbody>
                  {kpis.map(kpi => {
                    const ragColors: Record<string, string> = { Red: "#e87a5d", Amber: "#f4a83a", Green: "#8ba87a" };
                    const stratP = STRAT_PRIORITIES_ALL.find(p => p.id === kpi.stratLink);
                    return <tr key={kpi.id} className="border-t border-[var(--border)]/50">
                      <td className="px-2 py-1.5 font-semibold text-[var(--text-primary)]">{kpi.name}</td>
                      <td className="px-2 py-1.5 text-center"><input value={kpi.current} onChange={e => setPerfKpis(prev => prev.map(k => k.id === kpi.id ? {...k, current: e.target.value} : k))} className="bg-[var(--bg)] border border-[var(--border)] rounded px-1 py-0.5 text-[13px] text-center outline-none w-14" /></td>
                      <td className="px-2 py-1.5 text-center"><input value={kpi.target} onChange={e => setPerfKpis(prev => prev.map(k => k.id === kpi.id ? {...k, target: e.target.value} : k))} className="bg-[var(--bg)] border border-[var(--border)] rounded px-1 py-0.5 text-[13px] text-center outline-none w-14" /></td>
                      <td className="px-2 py-1.5 text-center text-[13px] text-[var(--text-muted)]">{kpi.owner}</td>
                      <td className="px-2 py-1.5 text-center text-[12px] text-[var(--text-muted)]">{kpi.frequency}</td>
                      <td className="px-2 py-1.5 text-center">{stratP ? <span className="text-[11px]" title={stratP.label}>{stratP.icon}</span> : <span className="text-[11px] text-[var(--text-muted)]">—</span>}</td>
                      <td className="px-2 py-1.5 text-center"><button onClick={() => { const cycle: PerfKpi["status"][] = ["Green", "Amber", "Red"]; setPerfKpis(prev => prev.map(k => k.id === kpi.id ? {...k, status: cycle[(cycle.indexOf(k.status) + 1) % 3]} : k)); }} className="w-6 h-6 rounded-full cursor-pointer" style={{ background: ragColors[kpi.status], border: `2px solid ${ragColors[kpi.status]}` }} title={kpi.status} /></td>
                    </tr>;
                  })}
                </tbody></table></div>
              </div>;
            })}
          </Card>}

          {/* ─── 2. OKR FRAMEWORK ─── */}
          {perfView === "okr" && <Card title="OKR Framework — Objectives & Key Results">
            <div className="text-[15px] text-[var(--text-secondary)] mb-4">Objectives cascade from Enterprise → Function → Team. Drag the progress slider for each Key Result.</div>
            {/* OKR tree */}
            {(() => {
              const renderOkr = (okr: PerfOkr, depth: number): React.ReactNode => {
                const children = perfOkrs.filter(o => o.parentId === okr.id);
                const avgProgress = okr.keyResults.length ? Math.round(okr.keyResults.reduce((s, kr) => s + kr.progress, 0) / okr.keyResults.length) : 0;
                const levelColors: Record<string, string> = { Enterprise: "#f4a83a", Function: "#a78bb8", Team: "#8ba87a" };
                return <div key={okr.id} style={{ marginLeft: depth * 20 }} className="mb-3">
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {depth > 0 && <span className="text-[var(--text-muted)]">↳</span>}
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold" style={{ background: `${levelColors[okr.level]}15`, color: levelColors[okr.level] }}>{okr.level}</span>
                        <span className="text-[15px] font-bold text-[var(--text-primary)]">{okr.objective}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-bold" style={{ color: avgProgress >= 70 ? "#8ba87a" : avgProgress >= 40 ? "#f4a83a" : "#e87a5d" }}>{avgProgress}%</span>
                        <button onClick={() => setPerfOkrs(prev => prev.filter(o => o.id !== okr.id))} className="text-[13px] text-[var(--text-muted)] hover:text-[var(--risk)]">×</button>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="h-2 bg-[var(--bg)] rounded-full overflow-hidden mb-3"><div className="h-full rounded-full transition-all" style={{ width: `${avgProgress}%`, background: avgProgress >= 70 ? "#8ba87a" : avgProgress >= 40 ? "#f4a83a" : "#e87a5d" }} /></div>
                    {/* Key Results */}
                    <div className="space-y-2 ml-2">
                      {okr.keyResults.map(kr => <div key={kr.id} className="flex items-center gap-3">
                        <span className="text-[13px] text-[var(--text-muted)] shrink-0">KR</span>
                        <span className="text-[14px] text-[var(--text-secondary)] flex-1">{kr.text}</span>
                        <input type="range" min={0} max={100} value={kr.progress} onChange={e => setPerfOkrs(prev => prev.map(o => o.id === okr.id ? {...o, keyResults: o.keyResults.map(k => k.id === kr.id ? {...k, progress: Number(e.target.value)} : k)} : o))} className="w-24 h-1.5 rounded-full appearance-none cursor-pointer" style={{ background: `linear-gradient(to right, ${kr.progress >= 70 ? "#8ba87a" : kr.progress >= 40 ? "#f4a83a" : "#e87a5d"} ${kr.progress}%, "var(--bg)" ${kr.progress}%)` }} />
                        <span className="text-[13px] font-bold w-10 text-right" style={{ color: kr.progress >= 70 ? "#8ba87a" : kr.progress >= 40 ? "#f4a83a" : "#e87a5d" }}>{kr.progress}%</span>
                      </div>)}
                    </div>
                  </div>
                  {children.map(c => renderOkr(c, depth + 1))}
                </div>;
              };
              return perfOkrs.filter(o => !o.parentId).map(o => renderOkr(o, 0));
            })()}
            {/* Add OKR */}
            {perfAddingOkr ? <div className="rounded-xl border border-[var(--accent-primary)]/30 bg-[rgba(244,168,58,0.04)] p-4 space-y-3">
              <div className="text-[15px] font-bold text-[var(--accent-primary)]">Add Objective</div>
              <div className="grid grid-cols-3 gap-3">
                <select value={perfNewOkr.level} onChange={e => setPerfNewOkr(p => ({...p, level: e.target.value as PerfOkr["level"]}))} className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] text-[var(--text-primary)] outline-none"><option>Enterprise</option><option>Function</option><option>Team</option></select>
                <input value={perfNewOkr.objective} onChange={e => setPerfNewOkr(p => ({...p, objective: e.target.value}))} placeholder="Objective..." className="col-span-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" />
              </div>
              {perfNewOkr.level !== "Enterprise" && <select value={perfNewOkr.parentId} onChange={e => setPerfNewOkr(p => ({...p, parentId: e.target.value}))} className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] text-[var(--text-primary)] outline-none">
                <option value="">No parent</option>{perfOkrs.filter(o => o.level === "Enterprise" || (perfNewOkr.level === "Team" && o.level === "Function")).map(o => <option key={o.id} value={o.id}>{o.objective}</option>)}
              </select>}
              <div className="flex gap-2">
                <button onClick={() => { if (!perfNewOkr.objective.trim()) return; setPerfOkrs(prev => [...prev, { id: `o${Date.now()}`, level: perfNewOkr.level, objective: perfNewOkr.objective, parentId: perfNewOkr.parentId, keyResults: [{ id: `kr${Date.now()}`, text: "Key Result 1", progress: 0 }] }]); setPerfNewOkr({ level: "Function", objective: "", parentId: "" }); setPerfAddingOkr(false); }} className="px-4 py-2 rounded-lg text-[14px] font-semibold text-white" style={{ background: "#f4a83a" }}>Add</button>
                <button onClick={() => setPerfAddingOkr(false)} className="px-4 py-2 rounded-lg text-[14px] font-semibold text-[var(--text-muted)] border border-[var(--border)]">Cancel</button>
              </div>
            </div> : <button onClick={() => setPerfAddingOkr(true)} className="w-full px-4 py-2 rounded-xl text-[14px] font-semibold text-[var(--text-muted)] border border-dashed border-[var(--border)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-all">+ Add Objective</button>}
          </Card>}

          {/* ─── 3. LEADING VS. LAGGING INDICATORS ─── */}
          {perfView === "indicators" && <Card title="Leading vs. Lagging Indicator Mapping">
            <div className="text-[15px] text-[var(--text-secondary)] mb-4">Each lagging indicator (outcome) should have at least one leading indicator (driver) paired. Click to toggle type and set pairs.</div>
            {(() => {
              const leading = perfKpis.filter(k => k.indicator === "Leading");
              const lagging = perfKpis.filter(k => k.indicator === "Lagging");
              const unpairedLagging = lagging.filter(k => !k.pairedWith || !perfKpis.find(p => p.id === k.pairedWith));
              return <div className="space-y-5">
                {/* Summary */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl p-3 bg-[var(--surface-2)] text-center"><div className="text-[20px] font-extrabold text-[var(--success)]">{leading.length}</div><div className="text-[12px] text-[var(--text-muted)] uppercase">Leading (Drivers)</div></div>
                  <div className="rounded-xl p-3 bg-[var(--surface-2)] text-center"><div className="text-[20px] font-extrabold text-[var(--accent-primary)]">{lagging.length}</div><div className="text-[12px] text-[var(--text-muted)] uppercase">Lagging (Outcomes)</div></div>
                  <div className="rounded-xl p-3 bg-[var(--surface-2)] text-center"><div className="text-[20px] font-extrabold" style={{ color: unpairedLagging.length > 0 ? "#e87a5d" : "#8ba87a" }}>{unpairedLagging.length}</div><div className="text-[12px] text-[var(--text-muted)] uppercase">Unpaired Lagging</div></div>
                </div>
                {/* Unpaired warning */}
                {unpairedLagging.length > 0 && <div className="rounded-xl border border-[var(--warning)]/20 bg-[rgba(244,168,58,0.04)] p-3">
                  <div className="text-[14px] font-bold text-[var(--warning)] mb-1">⚠ Measuring outcomes without drivers</div>
                  <div className="text-[14px] text-[var(--text-secondary)]">{unpairedLagging.map(k => k.name).join(", ")} — these lagging indicators have no paired leading indicator. You{"'"}re seeing results but can{"'"}t predict or influence them.</div>
                </div>}
                {/* Paired view */}
                <div className="space-y-3">
                  {perfKpis.map(kpi => {
                    const paired = kpi.pairedWith ? perfKpis.find(k => k.id === kpi.pairedWith) : null;
                    const typeColor = kpi.indicator === "Leading" ? "#8ba87a" : "#f4a83a";
                    return <div key={kpi.id} className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3 flex items-center gap-3">
                      <button onClick={() => setPerfKpis(prev => prev.map(k => k.id === kpi.id ? {...k, indicator: k.indicator === "Leading" ? "Lagging" : "Leading"} : k))} className="px-2 py-0.5 rounded-full text-[12px] font-bold shrink-0" style={{ background: `${typeColor}15`, color: typeColor, border: `1px solid ${typeColor}30` }}>{kpi.indicator}</button>
                      <span className="text-[14px] font-semibold text-[var(--text-primary)] flex-1">{kpi.name}</span>
                      <span className="text-[12px] text-[var(--text-muted)]">{kpi.perspective}</span>
                      {kpi.indicator === "Lagging" && <><span className="text-[var(--text-muted)]">←</span>
                        <select value={kpi.pairedWith} onChange={e => setPerfKpis(prev => prev.map(k => k.id === kpi.id ? {...k, pairedWith: e.target.value} : k))} className="bg-[var(--bg)] border border-[var(--border)] rounded px-1 py-0.5 text-[12px] outline-none w-40">
                          <option value="">No pair</option>{leading.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </select>
                      </>}
                      {kpi.indicator === "Leading" && paired && <><span className="text-[var(--text-muted)]">→</span><span className="text-[12px] text-[var(--accent-primary)]">{paired.name}</span></>}
                    </div>;
                  })}
                </div>
                {/* Example pairs */}
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                  <div className="text-[13px] font-semibold text-[var(--text-muted)] uppercase mb-2">Example Leading → Lagging Pairs</div>
                  <div className="space-y-1 text-[14px] text-[var(--text-secondary)]">
                    {[
                      ["Employee engagement score", "Voluntary attrition rate"],
                      ["Training completion rate", "Skills coverage index"],
                      ["Automation coverage %", "Operating cost reduction"],
                      ["First contact resolution %", "Net Promoter Score"],
                      ["Cross-functional handoffs", "Process cycle time"],
                    ].map(([lead, lag], i) => <div key={i}><span className="text-[var(--success)]">{lead}</span> <span className="text-[var(--text-muted)]">→</span> <span className="text-[var(--accent-primary)]">{lag}</span></div>)}
                  </div>
                </div>
              </div>;
            })()}
          </Card>}

          {/* ─── 4. OM HEALTH CHECK ─── */}
          {perfView === "healthcheck" && <Card title="Operating Model Health Check">
            <div className="text-[15px] text-[var(--text-secondary)] mb-4">Periodic assessment across 5 dimensions. Recommended: quarterly for Year 1, then annually. Score each dimension 1-5.</div>
            {/* Radar */}
            {(() => {
              const hasData = Object.values(perfHealth).some(v => v > 0);
              const avg = hasData ? (Object.values(perfHealth).reduce((s, v) => s + v, 0) / Math.max(Object.values(perfHealth).filter(v => v > 0).length, 1)) : 0;
              return <>
                {hasData && <div className="grid grid-cols-2 gap-5 mb-4">
                  <div className="h-[260px]"><RadarViz data={PERF_HEALTH_DIMS.map(d => ({ subject: d.name, current: perfHealth[d.id] || 0, benchmark: 3.5, max: 5 }))} /></div>
                  <div className="flex flex-col justify-center">
                    <div className="text-center mb-4"><div className="text-[32px] font-extrabold" style={{ color: avg >= 4 ? "#8ba87a" : avg >= 3 ? "#f4a83a" : "#e87a5d" }}>{avg.toFixed(1)}</div><div className="text-[14px] text-[var(--text-muted)] uppercase">Overall OM Health</div><div className="text-[14px] font-semibold" style={{ color: avg >= 4 ? "#8ba87a" : avg >= 3 ? "#f4a83a" : "#e87a5d" }}>{avg >= 4 ? "Strong" : avg >= 3 ? "Developing" : avg >= 2 ? "Needs Attention" : "Critical"}</div></div>
                    <div className="grid grid-cols-2 gap-2">{PERF_HEALTH_DIMS.map(d => <div key={d.id} className="rounded-lg p-2 bg-[var(--bg)] text-center"><div className="text-[16px] font-bold" style={{ color: (perfHealth[d.id]||0) >= 4 ? "#8ba87a" : (perfHealth[d.id]||0) >= 3 ? "#f4a83a" : "#e87a5d" }}>{perfHealth[d.id] || "—"}</div><div className="text-[11px] text-[var(--text-muted)]">{d.name}</div></div>)}</div>
                  </div>
                </div>}
              </>;
            })()}
            {/* Dimension cards */}
            <div className="space-y-4">
              {PERF_HEALTH_DIMS.map(dim => {
                const score = perfHealth[dim.id] || 0;
                return <div key={dim.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div><div className="text-[15px] font-bold text-[var(--text-primary)]">{dim.name}</div><div className="text-[13px] text-[var(--text-muted)]">{dim.desc}</div></div>
                    <div className="flex gap-1">{[1,2,3,4,5].map(n => <button key={n} onClick={() => setPerfHealth(p => ({...p, [dim.id]: p[dim.id] === n ? 0 : n}))} className="w-9 h-7 rounded-lg text-[14px] font-bold transition-all" style={{
                      background: score >= n ? `${n <= 2 ? "#e87a5d" : n <= 3 ? "#f4a83a" : "#8ba87a"}15` : "var(--bg)",
                      color: score >= n ? (n <= 2 ? "#e87a5d" : n <= 3 ? "#f4a83a" : "#8ba87a") : "#8a7f6d",
                      border: score >= n ? `1px solid ${n <= 2 ? "#e87a5d" : n <= 3 ? "#f4a83a" : "#8ba87a"}` : "1px solid var(--border)",
                    }}>{n}</button>)}</div>
                  </div>
                  {/* Checklist */}
                  <div className="grid grid-cols-2 gap-1 mt-2">{dim.questions.map((q, i) => <div key={i} className="flex items-center gap-2 text-[13px] text-[var(--text-secondary)]"><span style={{ color: score >= 3 ? "#8ba87a" : score > 0 ? "#f4a83a" : "#8a7f6d" }}>{score >= 3 ? "✓" : score > 0 ? "~" : "○"}</span>{q}</div>)}</div>
                </div>;
              })}
            </div>
            {/* Review cadence */}
            <div className="mt-4 rounded-xl border border-[var(--accent-primary)]/20 bg-[rgba(244,168,58,0.04)] p-4 text-[14px] text-[var(--text-secondary)]">
              <strong className="text-[var(--accent-primary)]">Review Cadence:</strong> Conduct this health check <strong>quarterly</strong> during the first year of operating model transformation, then shift to <strong>annually</strong> once the model stabilizes. Track scores over time to identify regression.
            </div>
          </Card>}
        </div>}

        {/* ── TRANSITION PLAN TAB ── */}
        {omView === "4.3" && <div className="animate-tab-enter space-y-5">
          <div className="flex gap-1 rounded-xl bg-[var(--surface-2)] p-1 border border-[var(--border)]">
            {([
              { id: "migration" as const, label: "Migration Map", icon: "🗺" },
              { id: "waves" as const, label: "Wave Planning", icon: "🌊" },
              { id: "dependencies" as const, label: "Dependencies", icon: "🔗" },
              { id: "parallel" as const, label: "Parallel Running", icon: "⚡" },
              { id: "signoff" as const, label: "Sign-off Tracker", icon: "✅" },
            ]).map(v => <button key={v.id} onClick={() => setTransView(v.id)} className="flex-1 px-3 py-2 rounded-lg text-[14px] font-semibold transition-all" style={{
              background: transView === v.id ? "rgba(244,168,58,0.12)" : "transparent",
              color: transView === v.id ? "#f4a83a" : "#8a7f6d",
            }}>{v.icon} {v.label}</button>)}
          </div>

          {/* ─── 1. MIGRATION MAP ─── */}
          {transView === "migration" && <Card title="Current → Future State Migration Map">
            <div className="text-[15px] text-[var(--text-secondary)] mb-4">All operating model changes, categorized by type. Click the status to cycle, × to remove.</div>
            {/* Category summary */}
            <div className="flex gap-2 flex-wrap mb-4">
              {(["Structure", "Process", "Technology", "People", "Governance"] as const).map(cat => {
                const count = transChanges.filter(c => c.category === cat).length;
                return <div key={cat} className="rounded-xl px-3 py-2 text-center" style={{ background: `${TRANS_CAT_COLORS[cat]}08`, border: `1px solid ${TRANS_CAT_COLORS[cat]}25` }}>
                  <div className="text-[15px] font-extrabold" style={{ color: TRANS_CAT_COLORS[cat] }}>{count}</div>
                  <div className="text-[12px] font-semibold" style={{ color: TRANS_CAT_COLORS[cat] }}>{cat}</div>
                </div>;
              })}
              <div className="rounded-xl px-3 py-2 bg-[var(--surface-2)] text-center ml-auto"><div className="text-[15px] font-extrabold text-[var(--text-primary)]">{transChanges.length}</div><div className="text-[12px] text-[var(--text-muted)]">Total</div></div>
            </div>
            {/* Change cards */}
            <div className="space-y-3">
              {transChanges.map(change => {
                const statusColors: Record<string, string> = { "Not Started": "#8a7f6d", "In Progress": "#f4a83a", Complete: "#8ba87a" };
                const deps = change.dependencies.map(dId => transChanges.find(c => c.id === dId)?.name).filter(Boolean);
                return <div key={change.id} className="rounded-xl border-l-4 border border-[var(--border)] bg-[var(--surface-2)] p-4" style={{ borderLeftColor: TRANS_CAT_COLORS[change.category] }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold" style={{ background: `${TRANS_CAT_COLORS[change.category]}15`, color: TRANS_CAT_COLORS[change.category] }}>{change.category}</span>
                      <span className="text-[15px] font-bold text-[var(--text-primary)]">{change.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] text-[var(--text-muted)]">{TRANS_WAVE_LABELS[change.wave]?.split("(")[0]}</span>
                      <button onClick={() => { const cycle: TransChange["status"][] = ["Not Started", "In Progress", "Complete"]; setTransChanges(prev => prev.map(c => c.id === change.id ? {...c, status: cycle[(cycle.indexOf(c.status) + 1) % 3]} : c)); }} className="px-2 py-0.5 rounded-full text-[12px] font-bold" style={{ background: `${statusColors[change.status]}15`, color: statusColors[change.status] }}>{change.status}</button>
                      <button onClick={() => setTransChanges(prev => prev.filter(c => c.id !== change.id))} className="text-[13px] text-[var(--text-muted)] hover:text-[var(--risk)]">×</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[14px]">
                    <div className="flex gap-2"><span className="text-[var(--text-muted)] shrink-0">From:</span><span className="text-[var(--text-secondary)]">{change.from}</span></div>
                    <div className="flex gap-2"><span className="text-[var(--text-muted)] shrink-0">To:</span><span className="text-[var(--accent-primary)]">{change.to}</span></div>
                    <div className="flex gap-2"><span className="text-[var(--text-muted)] shrink-0">Affected:</span><span className="text-[var(--text-secondary)]">{change.affected}</span></div>
                    <div className="flex gap-2"><span className="text-[var(--text-muted)] shrink-0">Owner:</span><span className="text-[var(--text-secondary)]">{change.owner}</span></div>
                  </div>
                  {deps.length > 0 && <div className="flex gap-1 mt-2 flex-wrap"><span className="text-[12px] text-[var(--text-muted)]">Depends on:</span>{deps.map(d => <span key={d} className="px-1.5 py-0.5 rounded text-[11px] bg-[var(--bg)] text-[var(--text-secondary)]">{d}</span>)}</div>}
                  <div className="flex items-center gap-2 mt-1"><span className="text-[12px] text-[var(--text-muted)]">Risk:</span><span className="text-[12px] font-semibold" style={{ color: change.risk === "High" ? "#e87a5d" : change.risk === "Medium" ? "#f4a83a" : "#8ba87a" }}>{change.risk}</span></div>
                </div>;
              })}
            </div>
            {/* Add change */}
            {transAddingChange ? <div className="rounded-xl border border-[var(--accent-primary)]/30 bg-[rgba(244,168,58,0.04)] p-4 mt-3 space-y-3">
              <div className="text-[15px] font-bold text-[var(--accent-primary)]">Add Change</div>
              {(() => { const els: Record<string, string> = {}; return <>
                <div className="grid grid-cols-2 gap-3">
                  <input id="trans-name" placeholder="Change name..." className="col-span-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" />
                  <select id="trans-cat" className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] outline-none"><option>Structure</option><option>Process</option><option>Technology</option><option>People</option><option>Governance</option></select>
                  <select id="trans-wave" className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] outline-none"><option value="0">Wave 0</option><option value="1">Wave 1</option><option value="2">Wave 2</option><option value="3">Wave 3</option></select>
                  <input id="trans-from" placeholder="From (current state)..." className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] outline-none placeholder:text-[var(--text-muted)]" />
                  <input id="trans-to" placeholder="To (target state)..." className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] outline-none placeholder:text-[var(--text-muted)]" />
                  <input id="trans-affected" placeholder="Who's affected..." className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] outline-none placeholder:text-[var(--text-muted)]" />
                  <input id="trans-owner" placeholder="Owner..." className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] outline-none placeholder:text-[var(--text-muted)]" />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { void els; const el = (id: string) => (document.getElementById(id) as HTMLInputElement | HTMLSelectElement)?.value || ""; const name = el("trans-name"); if (!name) return; setTransChanges(prev => [...prev, { id: `tc${Date.now()}`, name, category: el("trans-cat") as TransChange["category"], from: el("trans-from"), to: el("trans-to"), affected: el("trans-affected"), wave: Number(el("trans-wave")), dependencies: [], risk: "Medium", owner: el("trans-owner"), status: "Not Started" }]); setTransAddingChange(false); }} className="px-4 py-2 rounded-lg text-[14px] font-semibold text-white" style={{ background: "#f4a83a" }}>Add</button>
                  <button onClick={() => setTransAddingChange(false)} className="px-4 py-2 rounded-lg text-[14px] font-semibold text-[var(--text-muted)] border border-[var(--border)]">Cancel</button>
                </div>
              </>; })()}
            </div> : <button onClick={() => setTransAddingChange(true)} className="w-full px-4 py-2 rounded-xl text-[14px] font-semibold text-[var(--text-muted)] border border-dashed border-[var(--border)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-all mt-3">+ Add Change</button>}
          </Card>}

          {/* ─── 2. WAVE PLANNING ─── */}
          {transView === "waves" && <Card title="Wave Planning — Implementation Timeline">
            <div className="text-[15px] text-[var(--text-secondary)] mb-4">Changes organized into implementation waves. Click wave buttons to reassign. Timeline shows parallel execution.</div>
            {/* Timeline visualization */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 mb-4">
              <div className="flex items-end gap-0 h-32">
                {[0,1,2,3].map(wave => {
                  const changes = transChanges.filter(c => c.wave === wave);
                  const maxHeight = Math.max(...[0,1,2,3].map(w => transChanges.filter(c => c.wave === w).length), 1);
                  const height = (changes.length / maxHeight) * 100;
                  const waveColors = ["#8a7f6d", "#8ba87a", "#f4a83a", "#a78bb8"];
                  return <div key={wave} className="flex-1 flex flex-col items-center">
                    <div className="text-[13px] font-bold mb-1" style={{ color: waveColors[wave] }}>{changes.length}</div>
                    <div className="w-full rounded-t-lg transition-all" style={{ height: `${Math.max(height, 8)}%`, background: `${waveColors[wave]}20`, borderTop: `3px solid ${waveColors[wave]}` }} />
                  </div>;
                })}
              </div>
              <div className="flex gap-0 mt-2">{TRANS_WAVE_LABELS.map((label, i) => <div key={i} className="flex-1 text-center text-[12px] text-[var(--text-muted)]">{label.split("(")[0]}<div className="text-[11px]">({label.split("(")[1]?.replace(")", "") || ""})</div></div>)}</div>
            </div>
            {/* Wave details */}
            {[0,1,2,3].map(wave => {
              const changes = transChanges.filter(c => c.wave === wave);
              const waveColors = ["#8a7f6d", "#8ba87a", "#f4a83a", "#a78bb8"];
              const waveIcons = ["🏗", "⚡", "🔧", "🔬"];
              return <div key={wave} className="rounded-xl border-l-4 border border-[var(--border)] bg-[var(--surface-2)] p-4 mb-3" style={{ borderLeftColor: waveColors[wave] }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2"><span>{waveIcons[wave]}</span><span className="text-[15px] font-bold" style={{ color: waveColors[wave] }}>{TRANS_WAVE_LABELS[wave]}</span></div>
                  <span className="text-[14px] text-[var(--text-muted)]">{changes.length} changes</span>
                </div>
                {changes.length === 0 ? <div className="text-[14px] text-[var(--text-muted)] italic">No changes assigned to this wave</div> : <div className="space-y-2">{changes.map(ch => {
                  const highRisk = ch.risk === "High";
                  return <div key={ch.id} className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg)]">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded text-[11px] font-bold" style={{ background: `${TRANS_CAT_COLORS[ch.category]}15`, color: TRANS_CAT_COLORS[ch.category] }}>{ch.category}</span>
                      <span className="text-[14px] font-semibold text-[var(--text-primary)]">{ch.name}</span>
                      {highRisk && <span className="text-[11px] text-[var(--risk)]">⚠ High risk</span>}
                    </div>
                    <div className="flex items-center gap-1">{[0,1,2,3].map(w => <button key={w} onClick={() => setTransChanges(prev => prev.map(c => c.id === ch.id ? {...c, wave: w} : c))} className="w-6 h-5 rounded text-[11px] font-bold" style={{ background: ch.wave === w ? `${waveColors[w]}20` : "transparent", color: ch.wave === w ? waveColors[w] : "#8a7f6d", border: ch.wave === w ? `1px solid ${waveColors[w]}` : "1px solid var(--border)" }}>W{w}</button>)}</div>
                  </div>;
                })}</div>}
              </div>;
            })}
          </Card>}

          {/* ─── 3. INTERDEPENDENCY MAPPING ─── */}
          {transView === "dependencies" && <Card title="Interdependency Mapping">
            <div className="text-[15px] text-[var(--text-secondary)] mb-4">Map dependencies between changes. Flag circular dependencies and identify the critical path.</div>
            {(() => {
              // Build dependency graph
              const depMap: Record<string, string[]> = {};
              transChanges.forEach(c => { depMap[c.id] = c.dependencies; });
              // Detect circular
              const circular: string[][] = [];
              const visited = new Set<string>();
              const checkCircular = (id: string, path: string[]): void => {
                if (path.includes(id)) { circular.push([...path, id]); return; }
                if (visited.has(id)) return;
                visited.add(id);
                (depMap[id] || []).forEach(depId => checkCircular(depId, [...path, id]));
              };
              transChanges.forEach(c => { visited.clear(); checkCircular(c.id, []); });
              // Critical path (longest chain)
              const chainLength = (id: string, seen = new Set<string>()): number => {
                if (seen.has(id)) return 0;
                seen.add(id);
                const deps = depMap[id] || [];
                if (deps.length === 0) return 1;
                return 1 + Math.max(...deps.map(d => chainLength(d, new Set(seen))));
              };
              const chains = transChanges.map(c => ({ change: c, length: chainLength(c.id) })).sort((a, b) => b.length - a.length);
              const criticalPath = chains[0]?.length || 0;
              // Orphans (no dependencies and nothing depends on them)
              const dependedOn = new Set(transChanges.flatMap(c => c.dependencies));
              const orphans = transChanges.filter(c => c.dependencies.length === 0 && !dependedOn.has(c.id));

              return <div className="space-y-5">
                {/* Summary */}
                <div className="grid grid-cols-4 gap-3">
                  <div className="rounded-xl p-3 bg-[var(--surface-2)] text-center"><div className="text-[20px] font-extrabold text-[var(--text-primary)]">{transChanges.reduce((s, c) => s + c.dependencies.length, 0)}</div><div className="text-[12px] text-[var(--text-muted)] uppercase">Dependencies</div></div>
                  <div className="rounded-xl p-3 bg-[var(--surface-2)] text-center"><div className="text-[20px] font-extrabold text-[var(--accent-primary)]">{criticalPath}</div><div className="text-[12px] text-[var(--text-muted)] uppercase">Critical Path Depth</div></div>
                  <div className="rounded-xl p-3 bg-[var(--surface-2)] text-center"><div className="text-[20px] font-extrabold" style={{ color: circular.length > 0 ? "#e87a5d" : "#8ba87a" }}>{circular.length}</div><div className="text-[12px] text-[var(--text-muted)] uppercase">Circular Deps</div></div>
                  <div className="rounded-xl p-3 bg-[var(--surface-2)] text-center"><div className="text-[20px] font-extrabold text-[var(--text-muted)]">{orphans.length}</div><div className="text-[12px] text-[var(--text-muted)] uppercase">Independent</div></div>
                </div>
                {circular.length > 0 && <div className="rounded-xl border border-[var(--risk)]/20 bg-[rgba(232,122,93,0.04)] p-3">
                  <div className="text-[14px] font-bold text-[var(--risk)] mb-1">⚠ Circular Dependencies Detected</div>
                  {circular.slice(0, 3).map((chain, i) => <div key={i} className="text-[14px] text-[var(--text-secondary)]">{chain.map(id => transChanges.find(c => c.id === id)?.name || id).join(" → ")}</div>)}
                </div>}
                {/* Dependency table */}
                <div className="space-y-2">
                  {transChanges.map(change => {
                    const deps = change.dependencies.map(dId => transChanges.find(c => c.id === dId)).filter(Boolean) as TransChange[];
                    const dependents = transChanges.filter(c => c.dependencies.includes(change.id));
                    const depth = chainLength(change.id);
                    const isCritical = depth === criticalPath;
                    return <div key={change.id} className="rounded-lg border bg-[var(--surface-2)] p-3 flex items-center gap-3" style={{ borderTopColor: isCritical ? "#f4a83a" : "var(--border)", borderRightColor: isCritical ? "#f4a83a" : "var(--border)", borderBottomColor: isCritical ? "#f4a83a" : "var(--border)", borderLeftWidth: isCritical ? 3 : 1, borderLeftColor: isCritical ? "#f4a83a" : undefined }}>
                      <div className="flex-1">
                        <div className="flex items-center gap-2"><span className="text-[14px] font-semibold text-[var(--text-primary)]">{change.name}</span>{isCritical && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[rgba(244,168,58,0.1)] text-[var(--accent-primary)]">Critical Path</span>}</div>
                        <div className="flex gap-3 mt-1 text-[12px]">
                          {deps.length > 0 && <span className="text-[var(--text-muted)]">Needs: {deps.map(d => d.name).join(", ")}</span>}
                          {dependents.length > 0 && <span className="text-[var(--success)]">Enables: {dependents.map(d => d.name).join(", ")}</span>}
                          {deps.length === 0 && dependents.length === 0 && <span className="text-[var(--text-muted)]">Independent — can start anytime</span>}
                        </div>
                      </div>
                      <select value="" onChange={e => { if (e.target.value) setTransChanges(prev => prev.map(c => c.id === change.id ? {...c, dependencies: [...c.dependencies, e.target.value]} : c)); e.target.value = ""; }} className="bg-[var(--bg)] border border-[var(--border)] rounded px-1 py-0.5 text-[12px] outline-none w-28">
                        <option value="">+ Depends on</option>
                        {transChanges.filter(c => c.id !== change.id && !change.dependencies.includes(c.id)).map(c => <option key={c.id} value={c.id}>{c.name.slice(0, 25)}</option>)}
                      </select>
                    </div>;
                  })}
                </div>
              </div>;
            })()}
          </Card>}

          {/* ─── 4. PARALLEL RUNNING ─── */}
          {transView === "parallel" && <Card title="Parallel Running Model">
            <div className="text-[15px] text-[var(--text-secondary)] mb-4">For major changes, define a period where old and new models run simultaneously with exit criteria and rollback plans.</div>
            {(() => {
              const majorChanges = transChanges.filter(c => c.risk === "High");
              if (majorChanges.length === 0) return <div className="text-center py-10 text-[var(--text-muted)]">No high-risk changes identified. Parallel running is recommended for high-risk transitions.</div>;
              return <div className="space-y-4">{majorChanges.map(change => {
                const existing = transParallels.find(p => p.changeId === change.id);
                const par = existing || { changeId: change.id, duration: "", exitCriteria: "", rollback: "" };
                const update = (field: string, val: string) => {
                  setTransParallels(prev => { const idx = prev.findIndex(p => p.changeId === change.id); if (idx >= 0) return prev.map((p, i) => i === idx ? {...p, [field]: val} : p); return [...prev, {...par, [field]: val}]; });
                };
                return <div key={change.id} className="rounded-xl border-l-4 border border-[var(--border)] bg-[var(--surface-2)] p-4" style={{ borderLeftColor: "#e87a5d" }}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[14px] text-[var(--risk)]">⚠</span>
                    <span className="text-[15px] font-bold text-[var(--text-primary)]">{change.name}</span>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[rgba(232,122,93,0.1)] text-[var(--risk)]">High Risk</span>
                  </div>
                  <div className="text-[14px] text-[var(--text-muted)] mb-3">{change.from} → {change.to}</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-[12px] text-[var(--text-muted)] uppercase block mb-1">Parallel Run Duration</label><input value={par.duration} onChange={e => update("duration", e.target.value)} placeholder="e.g. 4 weeks, 1 month..." className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" /></div>
                    <div><label className="text-[12px] text-[var(--text-muted)] uppercase block mb-1">Exit Criteria — Switch Off Old Model When</label><input value={par.exitCriteria} onChange={e => update("exitCriteria", e.target.value)} placeholder="e.g. 99% accuracy for 2 weeks..." className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" /></div>
                    <div className="col-span-2"><label className="text-[12px] text-[var(--text-muted)] uppercase block mb-1">Rollback Plan</label><input value={par.rollback} onChange={e => update("rollback", e.target.value)} placeholder="e.g. Revert to legacy ERP within 48 hours, restore backup..." className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" /></div>
                  </div>
                </div>;
              })}</div>;
            })()}
          </Card>}

          {/* ─── 5. STAKEHOLDER SIGN-OFF ─── */}
          {transView === "signoff" && <Card title="Stakeholder Sign-off Tracker">
            <div className="text-[15px] text-[var(--text-secondary)] mb-4">Track approvals from key stakeholders. All approvals required before go-live.</div>
            {/* Progress */}
            {(() => {
              const approved = transStakeholders.filter(s => s.status === "Approved").length;
              const total = transStakeholders.length;
              const pct = total > 0 ? Math.round((approved / total) * 100) : 0;
              return <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[15px] font-bold text-[var(--text-primary)]">Approval Progress</span>
                  <span className="text-[15px] font-extrabold" style={{ color: pct === 100 ? "#8ba87a" : pct >= 50 ? "#f4a83a" : "#8a7f6d" }}>{approved}/{total} approved</span>
                </div>
                <div className="h-3 bg-[var(--bg)] rounded-full overflow-hidden"><div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pct === 100 ? "#8ba87a" : pct >= 50 ? "#f4a83a" : "#f4a83a" }} /></div>
                {pct === 100 && <div className="mt-2 text-[14px] text-[var(--success)] font-semibold">✓ All stakeholders have approved — ready for go-live</div>}
              </div>;
            })()}
            {/* Stakeholder cards */}
            <div className="space-y-2">
              {transStakeholders.map(sh => {
                const statusColors: Record<string, string> = { "Not Started": "#8a7f6d", "In Review": "#f4a83a", Approved: "#8ba87a", Rejected: "#e87a5d" };
                const statusIcons: Record<string, string> = { "Not Started": "○", "In Review": "◐", Approved: "✓", Rejected: "✗" };
                return <div key={sh.id} className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3">
                  <div className="flex items-center gap-3">
                    <span className="text-[16px] w-6 text-center" style={{ color: statusColors[sh.status] }}>{statusIcons[sh.status]}</span>
                    <div className="flex-1">
                      <div className="text-[14px] font-semibold text-[var(--text-primary)]">{sh.name}</div>
                      <div className="text-[13px] text-[var(--text-muted)]">{sh.role}</div>
                    </div>
                    <select value={sh.status} onChange={e => setTransStakeholders(prev => prev.map(s => s.id === sh.id ? {...s, status: e.target.value as TransStakeholder["status"]} : s))} className="bg-[var(--bg)] border rounded-lg px-2 py-1 text-[13px] font-semibold outline-none" style={{ borderColor: `${statusColors[sh.status]}40`, color: statusColors[sh.status] }}>
                      <option>Not Started</option><option>In Review</option><option>Approved</option><option>Rejected</option>
                    </select>
                    <button onClick={() => setTransStakeholders(prev => prev.filter(s => s.id !== sh.id))} className="text-[13px] text-[var(--text-muted)] hover:text-[var(--risk)]">×</button>
                  </div>
                  <input value={sh.conditions} onChange={e => setTransStakeholders(prev => prev.map(s => s.id === sh.id ? {...s, conditions: e.target.value} : s))} placeholder="Conditions or comments..." className="w-full mt-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[13px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" />
                </div>;
              })}
            </div>
            {/* Add stakeholder */}
            {transAddingStakeholder ? <div className="rounded-xl border border-[var(--accent-primary)]/30 bg-[rgba(244,168,58,0.04)] p-4 mt-3 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input id="sh-name" placeholder="Name/Title..." className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] outline-none placeholder:text-[var(--text-muted)]" />
                <input id="sh-role" placeholder="Approval role..." className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] outline-none placeholder:text-[var(--text-muted)]" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => { const el = (id: string) => (document.getElementById(id) as HTMLInputElement)?.value || ""; const name = el("sh-name"); if (!name) return; setTransStakeholders(prev => [...prev, { id: `s${Date.now()}`, name, role: el("sh-role"), status: "Not Started", conditions: "" }]); setTransAddingStakeholder(false); }} className="px-4 py-2 rounded-lg text-[14px] font-semibold text-white" style={{ background: "#f4a83a" }}>Add</button>
                <button onClick={() => setTransAddingStakeholder(false)} className="px-4 py-2 rounded-lg text-[14px] font-semibold text-[var(--text-muted)] border border-[var(--border)]">Cancel</button>
              </div>
            </div> : <button onClick={() => setTransAddingStakeholder(true)} className="w-full px-4 py-2 rounded-xl text-[14px] font-semibold text-[var(--text-muted)] border border-dashed border-[var(--border)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-all mt-3">+ Add Stakeholder</button>}
          </Card>}
        </div>}

        {/* ── MODEL GOVERNANCE TAB ── */}
        {omView === "4.4" && <div className="animate-tab-enter space-y-5">
          <div className="flex gap-1 rounded-xl bg-[var(--surface-2)] p-1 border border-[var(--border)]">
            {([
              { id: "ownership" as const, label: "Model Ownership", icon: "👤" },
              { id: "cadence" as const, label: "Review Cadence", icon: "📅" },
              { id: "changes" as const, label: "Change Control", icon: "📝" },
              { id: "versions" as const, label: "Version Control", icon: "🔢" },
            ]).map(v => <button key={v.id} onClick={() => setMgovView(v.id)} className="flex-1 px-3 py-2 rounded-lg text-[14px] font-semibold transition-all" style={{
              background: mgovView === v.id ? "rgba(244,168,58,0.12)" : "transparent",
              color: mgovView === v.id ? "#f4a83a" : "#8a7f6d",
            }}>{v.icon} {v.label}</button>)}
          </div>

          {/* ─── 1. MODEL OWNERSHIP ─── */}
          {mgovView === "ownership" && <div className="space-y-5">
            <Card title="Operating Model Ownership">
              <div className="text-[15px] text-[var(--text-secondary)] mb-4">Define who owns and governs the operating model post-implementation.</div>
              <div className="space-y-3">
                {mgovOwners.map((owner, i) => {
                  const isGlobal = i < 2;
                  return <div key={i} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-lg">{isGlobal ? (i === 0 ? "👑" : "🛡") : "🏢"}</span>
                      <span className="text-[15px] font-bold" style={{ color: isGlobal ? "#f4a83a" : "var(--text-primary)" }}>{owner.role}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="text-[12px] text-[var(--text-muted)] uppercase block mb-1">Name / Title</label>
                      <input value={owner.name} onChange={e => setMgovOwners(prev => prev.map((o, j) => j === i ? {...o, name: e.target.value} : o))} placeholder="Assign owner..." className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" /></div>
                      <div><label className="text-[12px] text-[var(--text-muted)] uppercase block mb-1">Scope & Accountability</label>
                      <input value={owner.scope} onChange={e => setMgovOwners(prev => prev.map((o, j) => j === i ? {...o, scope: e.target.value} : o))} className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[14px] text-[var(--text-secondary)] outline-none" /></div>
                    </div>
                  </div>;
                })}
                <button onClick={() => setMgovOwners(prev => [...prev, { role: "Function Owner", name: "", scope: "" }])} className="w-full px-4 py-2 rounded-xl text-[14px] font-semibold text-[var(--text-muted)] border border-dashed border-[var(--border)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-all">+ Add Owner</button>
              </div>
            </Card>
            <Card title="RACI for Model Governance Activities">
              <div className="text-[15px] text-[var(--text-secondary)] mb-4">Assign R/A/C/I roles for key governance activities. Click cells to cycle.</div>
              <div className="overflow-x-auto rounded-lg border border-[var(--border)]"><table className="w-full text-[14px]"><thead><tr className="bg-[var(--surface-2)]">
                <th className="px-3 py-2 text-left text-[12px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)] min-w-[180px]">Activity</th>
                {mgovOwners.slice(0, 6).map((o, i) => <th key={i} className="px-2 py-2 text-center text-[11px] font-semibold text-[var(--text-muted)] border-b border-[var(--border)] min-w-[70px]">{o.role.replace("Owner", "").trim() || `Owner ${i+1}`}</th>)}
              </tr></thead><tbody>
                {MGOV_RACI_ACTIVITIES.map(activity => <tr key={activity} className="border-b border-[var(--border)]">
                  <td className="px-3 py-2 text-[14px] font-semibold text-[var(--text-primary)]">{activity}</td>
                  {mgovOwners.slice(0, 6).map((_, oi) => {
                    const key = `${activity}__${oi}`;
                    const val = mgovRaci[key]?.[activity] || mgovRaci[key] as unknown as string || "";
                    const realVal = typeof val === "string" ? val : "";
                    const raciColors: Record<string, string> = { R: "#f4a83a", A: "#e87a5d", C: "#a78bb8", I: "#8a7f6d" };
                    return <td key={oi} className="px-2 py-2 text-center">
                      <button onClick={() => {
                        const cycle = ["", "R", "A", "C", "I"];
                        const next = cycle[(cycle.indexOf(realVal) + 1) % cycle.length];
                        setMgovRaci(prev => ({...prev, [key]: next as unknown as Record<string, string>}));
                      }} className="w-7 h-7 rounded-lg text-[14px] font-bold inline-flex items-center justify-center transition-all" style={{
                        background: realVal ? `${raciColors[realVal] || "#8a7f6d"}15` : "#1e2030",
                        color: realVal ? raciColors[realVal] || "#8a7f6d" : "var(--border)",
                        border: realVal ? `1px solid ${raciColors[realVal] || "#8a7f6d"}30` : "1px solid var(--border)",
                      }}>{realVal || "·"}</button>
                    </td>;
                  })}
                </tr>)}
              </tbody></table></div>
              <div className="flex gap-4 mt-2 text-[13px] text-[var(--text-muted)]">{[{l:"R",n:"Responsible",c:"#f4a83a"},{l:"A",n:"Accountable",c:"#e87a5d"},{l:"C",n:"Consulted",c:"#a78bb8"},{l:"I",n:"Informed",c:"#8a7f6d"}].map(x => <span key={x.l} className="flex items-center gap-1"><span className="w-5 h-5 rounded text-[13px] font-bold flex items-center justify-center" style={{background:`${x.c}15`,color:x.c}}>{x.l}</span>{x.n}</span>)}</div>
            </Card>
          </div>}

          {/* ─── 2. REVIEW CADENCE ─── */}
          {mgovView === "cadence" && <Card title="Review Cadence & Calendar">
            <div className="text-[15px] text-[var(--text-secondary)] mb-4">Schedule formal operating model reviews. Quarterly for the first year, then annually.</div>
            {/* Timeline */}
            <div className="flex gap-2 mb-5 overflow-x-auto pb-2">
              {mgovReviews.sort((a, b) => a.date.localeCompare(b.date)).map(rev => {
                const typeColors: Record<string, string> = { Quarterly: "#f4a83a", Annual: "#a78bb8", Triggered: "#f4a83a" };
                const statusColors: Record<string, string> = { Scheduled: "#8a7f6d", Complete: "#8ba87a", Overdue: "#e87a5d" };
                return <div key={rev.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 min-w-[200px] shrink-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold" style={{ background: `${typeColors[rev.type]}15`, color: typeColors[rev.type] }}>{rev.type}</span>
                    <button onClick={() => { const cycle: MgovReview["status"][] = ["Scheduled", "Complete", "Overdue"]; setMgovReviews(prev => prev.map(r => r.id === rev.id ? {...r, status: cycle[(cycle.indexOf(r.status) + 1) % 3]} : r)); }} className="px-2 py-0.5 rounded-full text-[11px] font-bold" style={{ background: `${statusColors[rev.status]}15`, color: statusColors[rev.status] }}>{rev.status}</button>
                  </div>
                  <div className="text-[15px] font-bold text-[var(--text-primary)] mb-1">{rev.name}</div>
                  <div className="text-[13px] text-[var(--text-muted)] mb-1">{rev.date}</div>
                  <div className="text-[12px] text-[var(--text-muted)]">{rev.participants}</div>
                  <input value={rev.notes} onChange={e => setMgovReviews(prev => prev.map(r => r.id === rev.id ? {...r, notes: e.target.value} : r))} placeholder="Notes..." className="w-full mt-2 bg-[var(--bg)] border border-[var(--border)] rounded px-2 py-1 text-[12px] outline-none placeholder:text-[var(--text-muted)]" />
                  <button onClick={() => setMgovReviews(prev => prev.filter(r => r.id !== rev.id))} className="text-[12px] text-[var(--text-muted)] hover:text-[var(--risk)] mt-1">Remove</button>
                </div>;
              })}
              <button onClick={() => setMgovReviews(prev => [...prev, { id: `mr${Date.now()}`, name: "New Review", type: "Quarterly", date: new Date().toISOString().split("T")[0], status: "Scheduled", participants: "Model Owner, Steward", notes: "" }])} className="rounded-xl border-2 border-dashed border-[var(--border)] min-w-[120px] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--accent-primary)] hover:border-[var(--accent-primary)] transition-all shrink-0">+ Add Review</button>
            </div>
            {/* Review checklist */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
              <div className="text-[13px] font-semibold text-[var(--text-muted)] uppercase mb-3">Standard Review Checklist</div>
              <div className="grid grid-cols-2 gap-2">{MGOV_REVIEW_CHECKLIST.map((q, i) => <div key={i} className="flex items-center gap-2 text-[14px] text-[var(--text-secondary)]"><span className="text-[var(--text-muted)]">☐</span>{q}</div>)}</div>
            </div>
            {/* Trigger conditions */}
            <div className="rounded-xl border border-[var(--warning)]/20 bg-[rgba(244,168,58,0.04)] p-4 mt-4">
              <div className="text-[14px] font-bold text-[var(--warning)] uppercase mb-2">Triggered Review Conditions</div>
              <div className="space-y-1 text-[14px] text-[var(--text-secondary)]">
                {["Strategy changes (new priorities, pivot, or M&A)", "Major market disruption or competitive shift", "Health check score drops below 3.0", "2+ KPIs move to Red status", "Senior leadership change (new CEO, COO, CHRO)"].map((cond, i) => <div key={i} className="flex items-center gap-2"><span className="text-[var(--warning)]">⚡</span>{cond}</div>)}
              </div>
            </div>
          </Card>}

          {/* ─── 3. CHANGE CONTROL ─── */}
          {mgovView === "changes" && <Card title="Operating Model Change Control">
            <div className="text-[15px] text-[var(--text-secondary)] mb-4">Formal process for requesting and approving changes to the operating model. All changes are logged.</div>
            {/* Summary */}
            <div className="grid grid-cols-4 gap-3 mb-4">
              {[
                { label: "Total Requests", val: mgovChangeReqs.length, color: "var(--text-primary)" },
                { label: "Under Review", val: mgovChangeReqs.filter(r => r.status === "Under Review").length, color: "#f4a83a" },
                { label: "Approved", val: mgovChangeReqs.filter(r => r.status === "Approved" || r.status === "Implemented").length, color: "#8ba87a" },
                { label: "Rejected", val: mgovChangeReqs.filter(r => r.status === "Rejected").length, color: "#e87a5d" },
              ].map(k => <div key={k.label} className="rounded-xl p-3 bg-[var(--surface-2)] text-center"><div className="text-[17px] font-extrabold" style={{ color: k.color }}>{k.val}</div><div className="text-[12px] text-[var(--text-muted)] uppercase">{k.label}</div></div>)}
            </div>
            {/* Change log */}
            {mgovChangeReqs.length > 0 && <div className="overflow-x-auto rounded-lg border border-[var(--border)] mb-4"><table className="w-full text-[14px]"><thead><tr className="bg-[var(--surface-2)]">
              {["Title", "Reason", "Impact", "Cost", "Requested By", "Date", "Status", "Approver", ""].map(h => <th key={h} className="px-2 py-2 text-left text-[12px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)] whitespace-nowrap">{h}</th>)}
            </tr></thead><tbody>
              {mgovChangeReqs.map(cr => {
                const statusColors: Record<string, string> = { Draft: "#8a7f6d", "Under Review": "#f4a83a", Approved: "#8ba87a", Rejected: "#e87a5d", Implemented: "#a78bb8" };
                return <tr key={cr.id} className="border-b border-[var(--border)]">
                  <td className="px-2 py-2 font-semibold text-[var(--text-primary)]">{cr.title}</td>
                  <td className="px-2 py-2 text-[var(--text-secondary)] max-w-[150px] truncate">{cr.reason}</td>
                  <td className="px-2 py-2 text-[var(--text-muted)] max-w-[120px] truncate">{cr.impact}</td>
                  <td className="px-2 py-2 text-[var(--text-secondary)]">{cr.cost}</td>
                  <td className="px-2 py-2 text-[var(--text-muted)]">{cr.requestedBy}</td>
                  <td className="px-2 py-2 text-[var(--text-muted)]">{cr.date}</td>
                  <td className="px-2 py-2"><button onClick={() => { const cycle: MgovChangeReq["status"][] = ["Draft", "Under Review", "Approved", "Rejected", "Implemented"]; setMgovChangeReqs(prev => prev.map(r => r.id === cr.id ? {...r, status: cycle[(cycle.indexOf(r.status) + 1) % cycle.length]} : r)); }} className="px-2 py-0.5 rounded-full text-[12px] font-bold" style={{ background: `${statusColors[cr.status]}12`, color: statusColors[cr.status] }}>{cr.status}</button></td>
                  <td className="px-2 py-2"><input value={cr.approver} onChange={e => setMgovChangeReqs(prev => prev.map(r => r.id === cr.id ? {...r, approver: e.target.value} : r))} placeholder="Approver..." className="bg-[var(--bg)] border border-[var(--border)] rounded px-1 py-0.5 text-[12px] w-20 outline-none placeholder:text-[var(--text-muted)]" /></td>
                  <td className="px-2 py-2"><button onClick={() => setMgovChangeReqs(prev => prev.filter(r => r.id !== cr.id))} className="text-[13px] text-[var(--text-muted)] hover:text-[var(--risk)]">×</button></td>
                </tr>;
              })}
            </tbody></table></div>}
            {/* Add change request */}
            {mgovAddingCr ? <div className="rounded-xl border border-[var(--accent-primary)]/30 bg-[rgba(244,168,58,0.04)] p-4 space-y-3">
              <div className="text-[15px] font-bold text-[var(--accent-primary)]">New Change Request</div>
              <div className="grid grid-cols-2 gap-3">
                <input id="cr-title" placeholder="What change is requested..." className="col-span-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] outline-none placeholder:text-[var(--text-muted)]" />
                <input id="cr-reason" placeholder="Why (business justification)..." className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] outline-none placeholder:text-[var(--text-muted)]" />
                <input id="cr-impact" placeholder="Impact on other model areas..." className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] outline-none placeholder:text-[var(--text-muted)]" />
                <input id="cr-cost" placeholder="Estimated cost..." className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] outline-none placeholder:text-[var(--text-muted)]" />
                <input id="cr-by" placeholder="Requested by..." className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] outline-none placeholder:text-[var(--text-muted)]" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => { const el = (id: string) => (document.getElementById(id) as HTMLInputElement)?.value || ""; const title = el("cr-title"); if (!title) return; setMgovChangeReqs(prev => [...prev, { id: `cr${Date.now()}`, title, reason: el("cr-reason"), impact: el("cr-impact"), cost: el("cr-cost"), requestedBy: el("cr-by"), date: new Date().toISOString().split("T")[0], status: "Draft", approver: "" }]); setMgovAddingCr(false); }} className="px-4 py-2 rounded-lg text-[14px] font-semibold text-white" style={{ background: "#f4a83a" }}>Submit</button>
                <button onClick={() => setMgovAddingCr(false)} className="px-4 py-2 rounded-lg text-[14px] font-semibold text-[var(--text-muted)] border border-[var(--border)]">Cancel</button>
              </div>
            </div> : <button onClick={() => setMgovAddingCr(true)} className="w-full px-4 py-2 rounded-xl text-[14px] font-semibold text-[var(--text-muted)] border border-dashed border-[var(--border)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-all">+ New Change Request</button>}
          </Card>}

          {/* ─── 4. VERSION CONTROL ─── */}
          {mgovView === "versions" && <Card title="Operating Model Version History">
            <div className="text-[15px] text-[var(--text-secondary)] mb-4">Track model evolution over time. Each version captures what changed and why.</div>
            {/* Timeline */}
            <div className="space-y-4">
              {mgovVersions.sort((a, b) => b.date.localeCompare(a.date)).map((ver, vi) => {
                const isLatest = vi === 0;
                const prevVer = mgovVersions.sort((a, b) => b.date.localeCompare(a.date))[vi + 1];
                return <div key={ver.id} className="relative">
                  {/* Timeline line */}
                  {vi < mgovVersions.length - 1 && <div className="absolute left-[18px] top-[40px] w-0.5 h-[calc(100%+16px)] bg-[var(--border)]" />}
                  <div className="flex gap-4">
                    <div className="w-9 h-9 rounded-full border-2 flex items-center justify-center shrink-0 z-10" style={{ background: isLatest ? "#f4a83a" : "#1e2030", borderColor: isLatest ? "#f4a83a" : "var(--border)", color: isLatest ? "white" : "#8a7f6d" }}>
                      <span className="text-[12px] font-bold">{ver.version}</span>
                    </div>
                    <div className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4" style={{ borderColor: isLatest ? "#f4a83a" : undefined }}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[16px] font-bold text-[var(--text-primary)]">v{ver.version}</span>
                          {isLatest && <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[rgba(244,168,58,0.1)] text-[var(--accent-primary)]">Current</span>}
                        </div>
                        <div className="flex items-center gap-2 text-[13px] text-[var(--text-muted)]">
                          <span>{ver.date}</span>
                          <span>by {ver.author}</span>
                          {!isLatest && <button onClick={() => setMgovVersions(prev => prev.filter(v => v.id !== ver.id))} className="text-[var(--text-muted)] hover:text-[var(--risk)]">×</button>}
                        </div>
                      </div>
                      <div className="text-[14px] text-[var(--text-secondary)] mb-2">{ver.summary}</div>
                      <div className="space-y-1">{ver.changes.map((ch, ci) => <div key={ci} className="flex items-center gap-2 text-[14px]"><span className="text-[var(--success)]">+</span><span className="text-[var(--text-secondary)]">{ch}</span></div>)}</div>
                      {prevVer && <div className="mt-2 text-[12px] text-[var(--text-muted)]">Previous: v{prevVer.version} ({prevVer.date})</div>}
                    </div>
                  </div>
                </div>;
              })}
            </div>
            {/* Add version */}
            {mgovAddingVersion ? <div className="rounded-xl border border-[var(--accent-primary)]/30 bg-[rgba(244,168,58,0.04)] p-4 mt-4 space-y-3">
              <div className="text-[15px] font-bold text-[var(--accent-primary)]">Release New Version</div>
              <div className="grid grid-cols-3 gap-3">
                <input id="ver-num" placeholder="Version (e.g. 1.1)..." className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] outline-none placeholder:text-[var(--text-muted)]" />
                <input id="ver-author" placeholder="Author..." className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] outline-none placeholder:text-[var(--text-muted)]" />
                <input id="ver-date" type="date" defaultValue={new Date().toISOString().split("T")[0]} className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] outline-none" />
                <input id="ver-summary" placeholder="Summary of changes..." className="col-span-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] outline-none placeholder:text-[var(--text-muted)]" />
                <input id="ver-changes" placeholder="Changes (comma-separated)..." className="col-span-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] outline-none placeholder:text-[var(--text-muted)]" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => { const el = (id: string) => (document.getElementById(id) as HTMLInputElement)?.value || ""; const version = el("ver-num"); if (!version) return; setMgovVersions(prev => [...prev, { id: `v${Date.now()}`, version, date: el("ver-date") || new Date().toISOString().split("T")[0], summary: el("ver-summary"), changes: el("ver-changes").split(",").map(c => c.trim()).filter(Boolean), author: el("ver-author") || "Model Steward" }]); setMgovAddingVersion(false); }} className="px-4 py-2 rounded-lg text-[14px] font-semibold text-white" style={{ background: "#f4a83a" }}>Release</button>
                <button onClick={() => setMgovAddingVersion(false)} className="px-4 py-2 rounded-lg text-[14px] font-semibold text-[var(--text-muted)] border border-[var(--border)]">Cancel</button>
              </div>
            </div> : <button onClick={() => setMgovAddingVersion(true)} className="w-full px-4 py-2 rounded-xl text-[14px] font-semibold text-[var(--text-muted)] border border-dashed border-[var(--border)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-all mt-4">+ Release New Version</button>}
          </Card>}
        </div>}

        {omView === "ledger" && <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-faint)", marginBottom: 24 }}>Operating Model Charter</div>

          {/* Title */}
          <h2 style={{ fontSize: 24, fontWeight: 300, color: "var(--text-primary)", marginBottom: 8, lineHeight: 1.3 }}>Our organization&apos;s operating model, in our own words</h2>
          <div style={{ fontSize: 13, color: "#8a7f6d", marginBottom: 32 }}>Auto-generated from your {completedSteps} completed steps &middot; {new Date().toLocaleDateString()}</div>

          {/* Section 1: Strategic Intent */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--amber)", marginBottom: 8 }}>Section 1: Strategic Intent</div>
            <p style={{ fontSize: 15, color: "var(--text-secondary)", lineHeight: 1.8 }}>
              {stratPriorities.length > 0
                ? `We have chosen ${stratPriorities.map(id => STRAT_PRIORITIES_ALL.find(p => p.id === id)?.label || id).join(", ")} as our top strategic priorities${stratVision ? `. Our vision: "${stratVision.slice(0, 200)}"` : ""}. These priorities will guide every downstream operating model decision.`
                : "Strategic priorities have not yet been configured."}
            </p>
            {Object.entries(stratDesignPrinciples).some(([, v]) => v.rationale) && <p style={{ fontSize: 15, color: "var(--text-secondary)", lineHeight: 1.8, marginTop: 8 }}>
              Our design principles emphasize{" "}
              {(stratDesignPrinciples.centralize?.value ?? 50) > 60 ? "centralized operations" : (stratDesignPrinciples.centralize?.value ?? 50) < 40 ? "decentralized autonomy" : "balanced centralization"}
              {" and "}
              {(stratDesignPrinciples.standardize?.value ?? 50) > 60 ? "standardized processes" : (stratDesignPrinciples.standardize?.value ?? 50) < 40 ? "customized approaches" : "a balance of standardization and customization"}.
              {stratDesignPrinciples.centralize?.rationale ? ` Rationale: ${stratDesignPrinciples.centralize.rationale.slice(0, 150)}.` : ""}
            </p>}
          </div>

          {/* Section 2: Architecture */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--amber)", marginBottom: 8 }}>Section 2: Architecture &amp; Capabilities</div>
            <p style={{ fontSize: 15, color: "var(--text-secondary)", lineHeight: 1.8 }}>
              We are building a <strong>{OM_ARCHETYPES[arch]?.label || arch}</strong> organization with a <strong>{opModel.replace("_", "-")}</strong> operating model and <strong>{gov}</strong> governance. {OM_ARCHETYPES[arch]?.desc || ""}
            </p>
            {Object.keys(svcDeliveryMap).length > 0 && <p style={{ fontSize: 15, color: "var(--text-secondary)", lineHeight: 1.8, marginTop: 8 }}>
              Service delivery is configured across {Object.keys(svcDeliveryMap).length} functions, with delivery models including {Array.from(new Set(Object.values(svcDeliveryMap).map(v => v.target || v.current))).join(", ")}.
            </p>}
          </div>

          {/* Section 3: Governance */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--amber)", marginBottom: 8 }}>Section 3: Governance &amp; Decisions</div>
            <p style={{ fontSize: 15, color: "var(--text-secondary)", lineHeight: 1.8 }}>
              Our governance framework includes {govDecisions.length} catalogued decisions across {govForums.length} governance forums.
              {govDecisions.filter(d => d.clarity === "Undefined").length > 0 ? ` ${govDecisions.filter(d => d.clarity === "Undefined").length} decisions still need clarity assigned.` : " All decisions have clear ownership."}
            </p>
          </div>

          {/* Section 4: Financial */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--amber)", marginBottom: 8 }}>Section 4: Financial &amp; Implementation</div>
            <p style={{ fontSize: 15, color: "var(--text-secondary)", lineHeight: 1.8 }}>
              {perfKpis.length > 0 ? `${perfKpis.length} KPIs are being tracked to measure operating model effectiveness.` : "KPIs have not yet been configured."}
              {" "}{transChanges.length > 0 ? `${transChanges.length} changes are planned across the implementation waves.` : "Implementation planning has not yet begun."}
            </p>
          </div>

          {/* Export button */}
          <div style={{ display: "flex", gap: 12, paddingTop: 24, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <button onClick={() => {
              const text = `OPERATING MODEL CHARTER\n${"=".repeat(40)}\nGenerated: ${new Date().toLocaleDateString()}\n\nSECTION 1: STRATEGIC INTENT\n${stratPriorities.length > 0 ? `Priorities: ${stratPriorities.map(id => STRAT_PRIORITIES_ALL.find(p => p.id === id)?.label || id).join(", ")}` : "Not configured"}\n${stratVision ? `Vision: ${stratVision}` : ""}\n\nSECTION 2: ARCHITECTURE\nArchetype: ${OM_ARCHETYPES[arch]?.label || arch}\nModel: ${opModel.replace("_", "-")}\nGovernance: ${gov}\n\nSECTION 3: GOVERNANCE\n${govDecisions.length} decisions catalogued\n${govForums.length} governance forums\n\nSECTION 4: IMPLEMENTATION\n${perfKpis.length} KPIs tracked\n${transChanges.length} changes planned`;
              navigator.clipboard.writeText(text);
              showToast("Operating Model Charter copied to clipboard");
            }} style={{ padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: "#f4a83a", color: "#fff", border: "none", cursor: "pointer" }}>Copy as Charter</button>
            <button onClick={() => showToast("PDF export is in development — use Copy as Charter for now")} style={{ padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: "transparent", color: "var(--ink-faint)", border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer" }}>Export as PDF</button>
          </div>
        </div>}

      </div>{/* end content area */}

      {/* Committee Review modal */}
      {showCommittee && <div className="fixed inset-0 bg-black/60 z-[9998] flex items-center justify-center p-4" onClick={() => setShowCommittee(false)}>
        <div className="bg-[var(--bg)] rounded-2xl border border-[var(--border)] max-w-[900px] w-full max-h-[85vh] overflow-y-auto p-8" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>Committee Review</div>
              <div style={{ fontSize: 13, color: "#8a7f6d" }}>Pressure-test your operating model from 5 executive perspectives</div>
            </div>
            <button onClick={() => setShowCommittee(false)} style={{ fontSize: 20, color: "#8a7f6d", background: "none", border: "none", cursor: "pointer" }}>×</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {[
              { role: "CEO", icon: "👤", color: "var(--amber)", questions: [
                `Does this ${OM_ARCHETYPES[arch]?.label} model support our growth ambitions?`,
                stratPriorities.includes("revenue") ? "How will this accelerate revenue growth?" : "Is this model flexible enough for our next 3 years?",
                `Can we attract the talent we need under ${gov} governance?`,
              ]},
              { role: "CFO", icon: "💰", color: "var(--sage)", questions: [
                `What's the total cost to implement this ${opModel.replace("_", "-")} model?`,
                (stratDesignPrinciples.centralize?.value ?? 50) > 60 ? "Will centralization deliver the 15-20% savings we expect?" : "Are we leaving cost efficiencies on the table with this level of decentralization?",
                "What's the break-even timeline on restructuring costs?",
              ]},
              { role: "CHRO", icon: "👥", color: "var(--dusk)", questions: [
                `Can our people adapt to a ${OM_ARCHETYPES[arch]?.label} structure?`,
                gov === "tight" ? "Will tight governance stifle our culture of innovation?" : "Do we have the leadership bench for distributed decision-making?",
                "What's the change management plan for the first 6 months?",
              ]},
              { role: "CIO/CTO", icon: "⚙️", color: "var(--amber)", questions: [
                arch === "platform" ? "Do we have the platform engineering capacity to build this?" : "Is our tech architecture compatible with this operating model?",
                "How will we handle the data integration across functions?",
                (stratDesignPrinciples.standardize?.value ?? 50) > 60 ? "Can we standardize technology platforms fast enough?" : "How do we prevent tool proliferation with decentralized tech decisions?",
              ]},
              { role: "COO", icon: "🔧", color: "var(--coral)", questions: [
                `How long will the transition to ${opModel.replace("_", "-")} take?`,
                "What's the operational disruption risk during the transition?",
                `Have we pressure-tested this model against our top 3 processes?`,
              ]},
            ].map(exec => <div key={exec.role} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 20 }}>{exec.icon}</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: exec.color }}>{exec.role}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {exec.questions.map((q, i) => <div key={i} style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5, padding: "8px 12px", background: "rgba(255,255,255,0.02)", borderRadius: 8, borderLeft: `2px solid ${exec.color}30` }}>"{q}"</div>)}
              </div>
            </div>)}
          </div>
        </div>
      </div>}

      {/* Pattern matching intelligence */}
      {completedSteps >= 5 && showPattern && (() => {
        const patterns: { name: string; match: boolean; desc: string; strengths: string[]; examples: string[] }[] = [
          { name: "Federated Platform", match: opModel === "federated" && (stratDesignPrinciples.centralize?.value ?? 50) >= 40 && (stratDesignPrinciples.centralize?.value ?? 50) <= 65, desc: "Central platform enables local teams. Standards set centrally, execution distributed.", strengths: ["Scale + agility balance", "Reusable platforms", "Clear accountability"], examples: ["Unilever", "Microsoft", "Spotify"] },
          { name: "Shared Services Hub", match: opModel === "centralized" && (stratDesignPrinciples.standardize?.value ?? 50) > 60, desc: "Consolidated shared services drive cost efficiency. One way of working globally.", strengths: ["Cost reduction 15-25%", "Process consistency", "Scale economies"], examples: ["P&G", "IBM", "Accenture"] },
          { name: "Agile Network", match: arch === "network" || (gov === "light" && stratPriorities.includes("innovation")), desc: "Fluid, mission-based teams form around problems. Minimal hierarchy.", strengths: ["Speed to market", "Innovation", "Talent attraction"], examples: ["Spotify (squads)", "Valve", "Netflix"] },
          { name: "Digital-Native", match: arch === "platform" && stratPriorities.includes("digital"), desc: "Platform-first with APIs, self-service, and data-driven decision making.", strengths: ["Technical scalability", "Developer velocity", "Data leverage"], examples: ["Amazon", "Google", "Stripe"] },
          { name: "Traditional Multinational", match: arch === "matrix" && gov === "tight", desc: "Matrix organization with strong regional/functional dual reporting.", strengths: ["Global scale", "Local responsiveness", "Risk controls"], examples: ["Siemens", "Nestlé", "HSBC"] },
        ];
        const detected = patterns.find(p => p.match) || patterns[0];
        return <div style={{ position: "fixed", bottom: 24, right: 24, width: 340, zIndex: 40, background: "var(--surface-1)", border: "1px solid rgba(96,165,250,0.2)", borderRadius: 16, padding: 20, boxShadow: "0 24px 64px rgba(0,0,0,0.4)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--amber)" }}>Pattern Detected</div>
            <button onClick={() => setShowPattern(false)} style={{ fontSize: 15, color: "var(--ink-faint)", background: "none", border: "none", cursor: "pointer" }}>×</button>
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>{detected.name}</div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 12 }}>{detected.desc}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 12 }}>
            {detected.strengths.map(s => <span key={s} style={{ padding: "2px 8px", borderRadius: 6, fontSize: 11, background: "rgba(139,168,122,0.08)", color: "var(--sage)", fontWeight: 600 }}>{s}</span>)}
          </div>
          <div style={{ fontSize: 11, color: "var(--ink-faint)", marginBottom: 12 }}>Similar to: {detected.examples.join(", ")}</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setShowPattern(false)} style={{ flex: 1, padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: "rgba(244,168,58,0.1)", color: "var(--amber)", border: "1px solid rgba(244,168,58,0.2)", cursor: "pointer" }}>Yes, continue</button>
            <button onClick={() => { setShowPattern(false); showToast("Try adjusting your design principles and archetype to explore alternatives"); }} style={{ flex: 1, padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: "transparent", color: "var(--ink-faint)", border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer" }}>Show alternatives</button>
          </div>
        </div>;
      })()}

    </div>{/* end flex layout */}

    <FlowNav
      previous={{ target: { kind: "module", moduleId: "build" }, label: "Org Design Studio", icon: <Network /> }}
      next={{ target: { kind: "module", moduleId: "simulate" }, label: "Impact Simulator", icon: <Gauge /> }}
    />
  </div>;

});
