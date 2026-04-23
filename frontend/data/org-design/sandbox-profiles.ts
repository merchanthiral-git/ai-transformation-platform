// frontend/data/org-design/sandbox-profiles.ts
//
// Per-sandbox company profiles for the Org Design Studio.
// Each of the 24 sandbox companies has a research-grounded current-state and
// future-state profile: strategic intent, N-1 rosters, diagnostics, archetype
// recommendation, and per-principle spectrum positions (Kates-Kesler 10).
//
// These are *illustrative* profiles for the sandbox — they reflect publicly
// reported structures, SEC filings, leadership pages, and credible industry
// transformation narratives (2024–2026). They are not insider data. Consultants
// using the Studio on real engagements replace these with calibrated client data.
//
// Positions on the spectrum are 0.0 to 1.0 where:
//   leftAnchor = 0.0, rightAnchor = 1.0
// For Kates-Kesler 10 Principles, higher positions generally indicate more
// mature / enterprise / customer-back / single-threaded organization design.

// ────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────

export type CapSize = 'small' | 'mid' | 'large';

export type PrinciplePositions = {
  strategicClarity: number;
  accountability: number;
  designOrientation: number;
  capabilityLocation: number;
  decisionGeography: number;
  layerEconomy: number;
  functionalPosture: number;
  sharedServices: number;
  governanceSpeed: number;
  cultureCongruence: number;
};

export type N1Role = {
  title: string;
  fn: 'exec' | 'finance' | 'ops' | 'legal' | 'hr' | 'marketing' | 'commercial' | 'digital' | 'brand' | 'engineering' | 'product' | 'risk' | 'clinical';
  sub: string;          // functional context sub-label
  span: number;         // approximate direct reports
  om: 'core' | 'enable' | 'shared';
  status?: 'new' | 'moved' | 'eliminated';
  note?: string;
  warn?: boolean;       // flag for diagnostics overlay (e.g., span outlier, capability gap)
};

export type StateProfile = {
  archetype: string;
  rootTitle: string;       // CEO/President title
  rootSub: string;         // e.g., "Founder era" / "Strategic Intent: Platform"
  n1: N1Role[];
  diagnostics: {
    avgSpan: number;
    layers: number;
    duplicated: number;
    mgrToIC: number;
    gaAsPctRev: number;
  };
};

export type SandboxProfile = {
  key: string;                        // matches COMPANY_MAP key: "palantir"
  company: string;                    // "Palantir Technologies"
  ticker: string;                     // "PLTR"
  industry: string;                   // "Technology"
  cap: CapSize;
  headcount: number;                  // record count
  strategicContext: {
    revenue: string;
    regions: string;
    segments: string;
    horizon: string;
    ceoMandate: string;               // italic-orange-emphasized directional thesis
    transformationFrom: string;       // archetype pill: "from"
    transformationTo: string;         // archetype pill: "to"
  };
  current: StateProfile;
  future: StateProfile;
  positions: {                        // per-principle dot positions for the 4 default comparators
    current: PrinciplePositions;
    future: PrinciplePositions;
    market: PrinciplePositions;       // industry median (seed)
    peer: { name: string; positions: PrinciplePositions };   // named peer comparator
  };
  archetypeRanking: {                 // fit ratings across 8 standard archetypes
    functional: 'strong' | 'partial' | 'poor' | 'current';
    regionalHolding: 'strong' | 'partial' | 'poor' | 'current';
    frontBack: 'strong' | 'partial' | 'poor' | 'current';
    matrix: 'strong' | 'partial' | 'poor' | 'current';
    productDivisional: 'strong' | 'partial' | 'poor' | 'current';
    ambidextrous: 'strong' | 'partial' | 'poor' | 'current';
    platform: 'strong' | 'partial' | 'poor' | 'current';
    networked: 'strong' | 'partial' | 'poor' | 'current';
  };
  chosenArchetype: keyof SandboxProfile['archetypeRanking'];
  pullQuote: { text: string; attr: string };
  designRationaleHeadline: string;    // italic-orange on key phrase
  designRationaleBody: string;
};

// ────────────────────────────────────────────────────────────────────────
// Industry median positions (seed values per industry)
// ────────────────────────────────────────────────────────────────────────

const MEDIAN_TECH: PrinciplePositions = {
  strategicClarity: 0.68, accountability: 0.72, designOrientation: 0.75,
  capabilityLocation: 0.62, decisionGeography: 0.48, layerEconomy: 0.72,
  functionalPosture: 0.70, sharedServices: 0.68, governanceSpeed: 0.74, cultureCongruence: 0.68,
};

const MEDIAN_FINSVC: PrinciplePositions = {
  strategicClarity: 0.62, accountability: 0.80, designOrientation: 0.55,
  capabilityLocation: 0.68, decisionGeography: 0.55, layerEconomy: 0.42,
  functionalPosture: 0.60, sharedServices: 0.72, governanceSpeed: 0.45, cultureCongruence: 0.60,
};

const MEDIAN_HEALTH: PrinciplePositions = {
  strategicClarity: 0.58, accountability: 0.62, designOrientation: 0.58,
  capabilityLocation: 0.60, decisionGeography: 0.60, layerEconomy: 0.50,
  functionalPosture: 0.58, sharedServices: 0.65, governanceSpeed: 0.48, cultureCongruence: 0.58,
};

const MEDIAN_RETAIL: PrinciplePositions = {
  strategicClarity: 0.65, accountability: 0.70, designOrientation: 0.72,
  capabilityLocation: 0.55, decisionGeography: 0.68, layerEconomy: 0.55,
  functionalPosture: 0.62, sharedServices: 0.70, governanceSpeed: 0.62, cultureCongruence: 0.65,
};

const MEDIAN_MFG: PrinciplePositions = {
  strategicClarity: 0.60, accountability: 0.75, designOrientation: 0.55,
  capabilityLocation: 0.65, decisionGeography: 0.58, layerEconomy: 0.45,
  functionalPosture: 0.65, sharedServices: 0.68, governanceSpeed: 0.48, cultureCongruence: 0.60,
};

const MEDIAN_CONSULTING: PrinciplePositions = {
  strategicClarity: 0.72, accountability: 0.78, designOrientation: 0.80,
  capabilityLocation: 0.58, decisionGeography: 0.62, layerEconomy: 0.68,
  functionalPosture: 0.72, sharedServices: 0.58, governanceSpeed: 0.70, cultureCongruence: 0.75,
};

const MEDIAN_ENERGY: PrinciplePositions = {
  strategicClarity: 0.55, accountability: 0.72, designOrientation: 0.42,
  capabilityLocation: 0.68, decisionGeography: 0.58, layerEconomy: 0.42,
  functionalPosture: 0.62, sharedServices: 0.70, governanceSpeed: 0.45, cultureCongruence: 0.55,
};

const MEDIAN_AERO: PrinciplePositions = {
  strategicClarity: 0.58, accountability: 0.82, designOrientation: 0.50,
  capabilityLocation: 0.72, decisionGeography: 0.48, layerEconomy: 0.40,
  functionalPosture: 0.68, sharedServices: 0.68, governanceSpeed: 0.42, cultureCongruence: 0.58,
};

// ════════════════════════════════════════════════════════════════════════
// PROFILES
// ════════════════════════════════════════════════════════════════════════

export const SANDBOX_PROFILES: Record<string, SandboxProfile> = {

  // ────────────────────────────────────────────────────────────────────
  // TECHNOLOGY
  // ────────────────────────────────────────────────────────────────────

  palantir: {
    key: "palantir",
    company: "Palantir Technologies",
    ticker: "PLTR",
    industry: "Technology",
    cap: "small",
    headcount: 3800,
    strategicContext: {
      revenue: "~$2.9B",
      regions: "US-led · Global commercial push",
      segments: "Gov · Commercial · AIP",
      horizon: "18 months",
      ceoMandate: "Scale commercial AIP without breaking the forward-deployed-engineer model that made Gotham and Foundry defensible.",
      transformationFrom: "Platform-IC-led",
      transformationTo: "Dual-engine (Gov + AIP)",
    },
    current: {
      archetype: "Platform / Forward-Deployed",
      rootTitle: "Chief Executive Officer",
      rootSub: "Founder-led · Flat-by-design",
      n1: [
        { title: "President & COO",                 fn: "exec",        sub: "Ops · Commercial",  span: 9, om: "core"   },
        { title: "Chief Technology Officer",        fn: "engineering", sub: "Platform",          span: 7, om: "core"   },
        { title: "Chief Financial Officer",         fn: "finance",     sub: "Finance · IR",      span: 5, om: "enable" },
        { title: "General Counsel",                 fn: "legal",       sub: "Legal · Compliance",span: 3, om: "shared" },
        { title: "Head of Government",              fn: "commercial",  sub: "Gov GTM",           span: 8, om: "core", warn: true },
        { title: "Head of Forward Deployed",        fn: "engineering", sub: "FDE Org",           span: 12, om: "core" },
        { title: "Chief People Officer",            fn: "hr",          sub: "People",            span: 4, om: "enable" },
      ],
      diagnostics: { avgSpan: 6.9, layers: 5, duplicated: 6, mgrToIC: 5.8, gaAsPctRev: 22.4 },
    },
    future: {
      archetype: "Ambidextrous",
      rootTitle: "Chief Executive Officer",
      rootSub: "Strategic Intent: Dual-engine scale",
      n1: [
        { title: "President & COO",                 fn: "exec",        sub: "Operating execution", span: 8, om: "core", status: "moved", note: "Scope tightens to operating rhythm" },
        { title: "Chief Technology Officer",        fn: "engineering", sub: "Platform",            span: 7, om: "core" },
        { title: "Chief Financial Officer",         fn: "finance",     sub: "Finance · IR",        span: 5, om: "enable" },
        { title: "Chief Legal & Compliance Officer",fn: "legal",       sub: "Legal · Risk · Policy", span: 4, om: "shared", status: "moved", note: "Elevated from GC; policy surface expands" },
        { title: "President, Government Business",  fn: "commercial",  sub: "Gov P&L",             span: 6, om: "core", status: "new", note: "Standalone P&L for defense/intel" },
        { title: "President, Commercial (AIP)",     fn: "commercial",  sub: "Commercial P&L",      span: 7, om: "core", status: "new", note: "Separate P&L to scale AIP" },
        { title: "Chief Forward Deployed Officer",  fn: "engineering", sub: "FDE Network",         span: 8, om: "core", status: "moved", note: "FDE becomes a named capability, not a title bucket" },
        { title: "Chief People Officer",            fn: "hr",          sub: "People",              span: 4, om: "enable" },
        { title: "Chief Marketing Officer",         fn: "marketing",   sub: "Brand · Demand",      span: 3, om: "enable", status: "new", note: "First true CMO; commercial scale demands it" },
      ],
      diagnostics: { avgSpan: 5.8, layers: 5, duplicated: 2, mgrToIC: 6.4, gaAsPctRev: 19.8 },
    },
    positions: {
      current: {
        strategicClarity: 0.68, accountability: 0.45, designOrientation: 0.60,
        capabilityLocation: 0.30, decisionGeography: 0.35, layerEconomy: 0.80,
        functionalPosture: 0.55, sharedServices: 0.30, governanceSpeed: 0.80, cultureCongruence: 0.78,
      },
      future: {
        strategicClarity: 0.85, accountability: 0.78, designOrientation: 0.75,
        capabilityLocation: 0.55, decisionGeography: 0.48, layerEconomy: 0.80,
        functionalPosture: 0.70, sharedServices: 0.55, governanceSpeed: 0.82, cultureCongruence: 0.78,
      },
      market: MEDIAN_TECH,
      peer: {
        name: "Anduril (peer)",
        positions: {
          strategicClarity: 0.75, accountability: 0.68, designOrientation: 0.62,
          capabilityLocation: 0.50, decisionGeography: 0.40, layerEconomy: 0.82,
          functionalPosture: 0.60, sharedServices: 0.40, governanceSpeed: 0.85, cultureCongruence: 0.80,
        },
      },
    },
    archetypeRanking: {
      functional: "poor", regionalHolding: "poor", frontBack: "partial",
      matrix: "partial", productDivisional: "partial", ambidextrous: "strong",
      platform: "current", networked: "partial",
    },
    chosenArchetype: "ambidextrous",
    pullQuote: {
      text: "Explore and exploit cannot live in the same reporting line — but they must share the same strategic intent.",
      attr: "— O'Reilly & Tushman, The Ambidextrous Organization",
    },
    designRationaleHeadline: "Split the engine, preserve the culture.",
    designRationaleBody: "Government and commercial AIP have different cadences, different sales motions, and different failure modes. An ambidextrous design gives each a dedicated P&L while the FDE network remains the shared, named capability that makes Palantir distinct.",
  },

  servicenow: {
    key: "servicenow",
    company: "ServiceNow",
    ticker: "NOW",
    industry: "Technology",
    cap: "mid",
    headcount: 12000,
    strategicContext: {
      revenue: "~$10.6B",
      regions: "Global · North America majority",
      segments: "ITSM · ITOM · CRM · HR Service · GenAI",
      horizon: "24 months",
      ceoMandate: "Become the enterprise AI workflow platform without losing the ITSM wedge that built the franchise.",
      transformationFrom: "Product-led with heavy sales",
      transformationTo: "Platform + vertical workflows",
    },
    current: {
      archetype: "Functional with GTM overlay",
      rootTitle: "Chief Executive Officer",
      rootSub: "Scale era",
      n1: [
        { title: "President & COO",                 fn: "exec",        sub: "Operations",        span: 10, om: "core" },
        { title: "Chief Product Officer",           fn: "product",     sub: "Platform · Workflows", span: 8, om: "core", warn: true },
        { title: "Chief Technology Officer",        fn: "engineering", sub: "Platform Eng",      span: 7, om: "core" },
        { title: "Chief Revenue Officer",           fn: "commercial",  sub: "Global Sales",      span: 10, om: "core", warn: true },
        { title: "Chief Marketing Officer",         fn: "marketing",   sub: "Demand · Brand",    span: 6, om: "enable" },
        { title: "Chief Customer Officer",          fn: "commercial",  sub: "Customer Success",  span: 7, om: "core" },
        { title: "Chief Financial Officer",         fn: "finance",     sub: "Finance · IR",      span: 6, om: "enable" },
        { title: "Chief Legal Officer",             fn: "legal",       sub: "Legal · Compliance",span: 4, om: "shared" },
        { title: "Chief People Officer",            fn: "hr",          sub: "People",            span: 5, om: "enable" },
      ],
      diagnostics: { avgSpan: 7.0, layers: 7, duplicated: 8, mgrToIC: 5.5, gaAsPctRev: 14.2 },
    },
    future: {
      archetype: "Front-Back (Platform + Industry)",
      rootTitle: "Chief Executive Officer",
      rootSub: "Strategic Intent: AI workflow platform",
      n1: [
        { title: "President & COO",                 fn: "exec",        sub: "Operations",           span: 10, om: "core" },
        { title: "President, Platform (Back)",      fn: "product",     sub: "Now Platform · AI",    span: 8, om: "core", status: "moved", note: "Platform becomes a named P&L, not one of N functions" },
        { title: "President, Industry Solutions (Front)", fn: "commercial", sub: "Industry GTM",    span: 6, om: "core", status: "new", note: "Vertical workflows organized by industry" },
        { title: "Chief Technology Officer",        fn: "engineering", sub: "Platform Eng",         span: 7, om: "core" },
        { title: "Chief Revenue Officer",           fn: "commercial",  sub: "Global Sales",         span: 9, om: "core" },
        { title: "Chief Customer Officer",          fn: "commercial",  sub: "Customer Success",     span: 6, om: "core", status: "moved", note: "Tighter hand-off to Industry front" },
        { title: "Chief Marketing Officer",         fn: "marketing",   sub: "Demand · Brand",       span: 6, om: "enable" },
        { title: "Chief Financial Officer",         fn: "finance",     sub: "Finance · IR",         span: 6, om: "enable" },
        { title: "Chief Legal Officer",             fn: "legal",       sub: "Legal · Compliance",   span: 4, om: "shared" },
        { title: "Chief People Officer",            fn: "hr",          sub: "People",               span: 5, om: "enable" },
      ],
      diagnostics: { avgSpan: 6.7, layers: 6, duplicated: 3, mgrToIC: 6.2, gaAsPctRev: 12.6 },
    },
    positions: {
      current: {
        strategicClarity: 0.65, accountability: 0.60, designOrientation: 0.65,
        capabilityLocation: 0.55, decisionGeography: 0.45, layerEconomy: 0.60,
        functionalPosture: 0.68, sharedServices: 0.65, governanceSpeed: 0.62, cultureCongruence: 0.70,
      },
      future: {
        strategicClarity: 0.82, accountability: 0.78, designOrientation: 0.82,
        capabilityLocation: 0.72, decisionGeography: 0.55, layerEconomy: 0.75,
        functionalPosture: 0.72, sharedServices: 0.72, governanceSpeed: 0.78, cultureCongruence: 0.72,
      },
      market: MEDIAN_TECH,
      peer: {
        name: "Salesforce (peer)",
        positions: {
          strategicClarity: 0.72, accountability: 0.70, designOrientation: 0.78,
          capabilityLocation: 0.65, decisionGeography: 0.50, layerEconomy: 0.62,
          functionalPosture: 0.68, sharedServices: 0.70, governanceSpeed: 0.70, cultureCongruence: 0.68,
        },
      },
    },
    archetypeRanking: {
      functional: "current", regionalHolding: "poor", frontBack: "strong",
      matrix: "partial", productDivisional: "partial", ambidextrous: "partial",
      platform: "partial", networked: "poor",
    },
    chosenArchetype: "frontBack",
    pullQuote: {
      text: "The front-back organization lets you be global where scale matters and local where relevance does.",
      attr: "— Jay Galbraith, Designing the Customer-Centric Organization",
    },
    designRationaleHeadline: "Platform in the back, industry in the front.",
    designRationaleBody: "Vertical buyers want workflows that feel native to healthcare, public sector, or financial services — not a generic platform. Front-back protects platform economics while giving industries the proximity and vocabulary they need.",
  },

  adobe: {
    key: "adobe",
    company: "Adobe",
    ticker: "ADBE",
    industry: "Technology",
    cap: "large",
    headcount: 30000,
    strategicContext: {
      revenue: "~$21B",
      regions: "Global · ~45% intl",
      segments: "Digital Media · Digital Experience · Document Cloud",
      horizon: "24 months",
      ceoMandate: "Defend Creative Cloud against generative AI disruption while making Firefly the enterprise AI content standard.",
      transformationFrom: "Segment P&Ls with shared platform",
      transformationTo: "AI-native, capability-centered",
    },
    current: {
      archetype: "Product Divisional (Digital Media / DX / Doc)",
      rootTitle: "Chair & CEO",
      rootSub: "Multi-segment era",
      n1: [
        { title: "President, Digital Media",            fn: "product",     sub: "Creative · Firefly",        span: 8, om: "core" },
        { title: "President, Digital Experience",       fn: "product",     sub: "Marketing · Analytics",     span: 8, om: "core" },
        { title: "Chief Technology Officer",            fn: "engineering", sub: "Tech · AI Research",        span: 7, om: "core", warn: true },
        { title: "Chief Financial Officer",             fn: "finance",     sub: "Finance · IR",              span: 6, om: "enable" },
        { title: "Chief Revenue Officer",               fn: "commercial",  sub: "Global GTM",                span: 9, om: "core" },
        { title: "Chief Marketing Officer",             fn: "marketing",   sub: "Brand · Demand",            span: 6, om: "enable" },
        { title: "Chief People Officer",                fn: "hr",          sub: "People",                    span: 5, om: "enable" },
        { title: "General Counsel",                     fn: "legal",       sub: "Legal · Compliance",        span: 4, om: "shared" },
        { title: "Chief Strategy Officer",              fn: "exec",        sub: "Corp Dev · Strategy",       span: 3, om: "enable" },
      ],
      diagnostics: { avgSpan: 6.2, layers: 7, duplicated: 9, mgrToIC: 5.2, gaAsPctRev: 17.8 },
    },
    future: {
      archetype: "Ambidextrous (Creative + AI capability)",
      rootTitle: "Chair & CEO",
      rootSub: "Strategic Intent: AI-native content infrastructure",
      n1: [
        { title: "President, Digital Media",            fn: "product",     sub: "Creative Apps",             span: 7, om: "core", status: "moved" },
        { title: "President, Digital Experience",       fn: "product",     sub: "Marketing · Analytics",     span: 8, om: "core" },
        { title: "President, Firefly & Gen-AI",         fn: "engineering", sub: "AI Capability P&L",         span: 6, om: "core", status: "new", note: "AI becomes a P&L, not a feature" },
        { title: "Chief Technology Officer",            fn: "engineering", sub: "Tech · Research",           span: 6, om: "core" },
        { title: "Chief Financial Officer",             fn: "finance",     sub: "Finance · IR",              span: 6, om: "enable" },
        { title: "Chief Revenue Officer",               fn: "commercial",  sub: "Global GTM",                span: 9, om: "core" },
        { title: "Chief Marketing Officer",             fn: "marketing",   sub: "Brand · Demand",            span: 6, om: "enable" },
        { title: "Chief Trust & Policy Officer",        fn: "legal",       sub: "AI Policy · Content Auth",  span: 4, om: "shared", status: "new", note: "Content Credentials and AI trust as named function" },
        { title: "Chief People Officer",                fn: "hr",          sub: "People",                    span: 5, om: "enable" },
        { title: "Chief Strategy Officer",              fn: "exec",        sub: "Corp Dev · Strategy",       span: 3, om: "enable" },
      ],
      diagnostics: { avgSpan: 6.0, layers: 6, duplicated: 3, mgrToIC: 6.0, gaAsPctRev: 15.4 },
    },
    positions: {
      current: {
        strategicClarity: 0.58, accountability: 0.65, designOrientation: 0.68,
        capabilityLocation: 0.50, decisionGeography: 0.55, layerEconomy: 0.48,
        functionalPosture: 0.68, sharedServices: 0.68, governanceSpeed: 0.58, cultureCongruence: 0.65,
      },
      future: {
        strategicClarity: 0.82, accountability: 0.75, designOrientation: 0.80,
        capabilityLocation: 0.72, decisionGeography: 0.60, layerEconomy: 0.70,
        functionalPosture: 0.72, sharedServices: 0.75, governanceSpeed: 0.72, cultureCongruence: 0.70,
      },
      market: MEDIAN_TECH,
      peer: {
        name: "Canva (peer)",
        positions: {
          strategicClarity: 0.78, accountability: 0.72, designOrientation: 0.80,
          capabilityLocation: 0.65, decisionGeography: 0.50, layerEconomy: 0.78,
          functionalPosture: 0.68, sharedServices: 0.58, governanceSpeed: 0.80, cultureCongruence: 0.75,
        },
      },
    },
    archetypeRanking: {
      functional: "poor", regionalHolding: "poor", frontBack: "partial",
      matrix: "partial", productDivisional: "current", ambidextrous: "strong",
      platform: "partial", networked: "poor",
    },
    chosenArchetype: "ambidextrous",
    pullQuote: {
      text: "A firm's ability to explore new opportunities while exploiting current ones is a major source of competitive advantage.",
      attr: "— Charles A. O'Reilly, Lead and Disrupt",
    },
    designRationaleHeadline: "Generative AI deserves its own operating system.",
    designRationaleBody: "Firefly and enterprise Gen-AI move on different clockspeeds than Creative Cloud. A dedicated AI P&L with shared research avoids the common trap of burying a disruptive capability inside a defensive division.",
  },

  // ────────────────────────────────────────────────────────────────────
  // FINANCIAL SERVICES
  // ────────────────────────────────────────────────────────────────────

  evercore: {
    key: "evercore",
    company: "Evercore",
    ticker: "EVR",
    industry: "Financial Services",
    cap: "small",
    headcount: 2200,
    strategicContext: {
      revenue: "~$2.8B",
      regions: "US-led · UK · continental EU",
      segments: "Advisory · Wealth Mgmt · Equities",
      horizon: "24 months",
      ceoMandate: "Defend the partnership economics while scaling sector coverage into private capital and tech M&A.",
      transformationFrom: "Generalist banker partnership",
      transformationTo: "Sector-led advisory platform",
    },
    current: {
      archetype: "Functional partnership",
      rootTitle: "Chief Executive Officer",
      rootSub: "Partner-led",
      n1: [
        { title: "Co-Chairman, Investment Banking",   fn: "commercial", sub: "Advisory",           span: 12, om: "core", warn: true },
        { title: "President, Advisory",               fn: "commercial", sub: "M&A Execution",      span: 10, om: "core" },
        { title: "Head of Equities",                  fn: "commercial", sub: "Institutional Eq",   span: 6, om: "core" },
        { title: "Head of Wealth Management",         fn: "commercial", sub: "WM",                 span: 5, om: "core" },
        { title: "Chief Financial Officer",           fn: "finance",    sub: "Finance · IR",       span: 5, om: "enable" },
        { title: "General Counsel",                   fn: "legal",      sub: "Legal · Compliance", span: 4, om: "shared" },
        { title: "Chief Human Resources Officer",     fn: "hr",         sub: "People",             span: 3, om: "enable" },
      ],
      diagnostics: { avgSpan: 6.4, layers: 5, duplicated: 3, mgrToIC: 4.2, gaAsPctRev: 28.5 },
    },
    future: {
      archetype: "Front-Back (Sector coverage + Execution)",
      rootTitle: "Chief Executive Officer",
      rootSub: "Strategic Intent: Sector-led platform",
      n1: [
        { title: "Global Head of Sector Coverage",    fn: "commercial", sub: "Tech · HC · FIG · Cons · Ind", span: 9, om: "core", status: "new", note: "Coverage elevated over geography" },
        { title: "Global Head of Product (M&A · RX · PC)", fn: "commercial", sub: "Execution Products",     span: 6, om: "core", status: "new", note: "Product execution alongside coverage" },
        { title: "Head of Equities",                  fn: "commercial", sub: "Institutional Eq",   span: 6, om: "core" },
        { title: "Head of Wealth Management",         fn: "commercial", sub: "WM",                 span: 5, om: "core" },
        { title: "Chief Financial Officer",           fn: "finance",    sub: "Finance · IR",       span: 5, om: "enable" },
        { title: "Chief Legal & Compliance Officer", fn: "legal",      sub: "Legal · Compliance", span: 4, om: "shared", status: "moved", note: "Compliance elevated as regulation tightens" },
        { title: "Chief Human Resources Officer",     fn: "hr",         sub: "People",             span: 3, om: "enable" },
      ],
      diagnostics: { avgSpan: 5.4, layers: 4, duplicated: 1, mgrToIC: 5.0, gaAsPctRev: 24.8 },
    },
    positions: {
      current: {
        strategicClarity: 0.62, accountability: 0.70, designOrientation: 0.62,
        capabilityLocation: 0.55, decisionGeography: 0.48, layerEconomy: 0.65,
        functionalPosture: 0.60, sharedServices: 0.55, governanceSpeed: 0.62, cultureCongruence: 0.72,
      },
      future: {
        strategicClarity: 0.82, accountability: 0.82, designOrientation: 0.78,
        capabilityLocation: 0.72, decisionGeography: 0.52, layerEconomy: 0.78,
        functionalPosture: 0.68, sharedServices: 0.62, governanceSpeed: 0.72, cultureCongruence: 0.75,
      },
      market: MEDIAN_FINSVC,
      peer: {
        name: "Lazard (peer)",
        positions: {
          strategicClarity: 0.68, accountability: 0.75, designOrientation: 0.65,
          capabilityLocation: 0.60, decisionGeography: 0.62, layerEconomy: 0.55,
          functionalPosture: 0.62, sharedServices: 0.58, governanceSpeed: 0.58, cultureCongruence: 0.68,
        },
      },
    },
    archetypeRanking: {
      functional: "current", regionalHolding: "poor", frontBack: "strong",
      matrix: "partial", productDivisional: "partial", ambidextrous: "partial",
      platform: "poor", networked: "partial",
    },
    chosenArchetype: "frontBack",
    pullQuote: {
      text: "In advisory, the client relationship is the business — structure must serve coverage, not dilute it.",
      attr: "— Roger Altman, Evercore Founder (paraphrase)",
    },
    designRationaleHeadline: "Coverage leads, execution follows.",
    designRationaleBody: "Moving to sector-first coverage with dedicated execution products (M&A / Restructuring / Private Capital) puts the client-facing banker in charge of the relationship while scaled execution teams protect quality and leverage.",
  },

  raymondjames: {
    key: "raymondjames",
    company: "Raymond James Financial",
    ticker: "RJF",
    industry: "Financial Services",
    cap: "mid",
    headcount: 16000,
    strategicContext: {
      revenue: "~$12B",
      regions: "US · Canada · UK",
      segments: "PCG · Capital Markets · Asset Mgmt · Banking",
      horizon: "36 months",
      ceoMandate: "Grow the Private Client Group advisor network while scaling bank balance sheet and asset management fee income.",
      transformationFrom: "Advisor-first federation",
      transformationTo: "Integrated wealth + bank platform",
    },
    current: {
      archetype: "Federated Divisional",
      rootTitle: "Chief Executive Officer",
      rootSub: "Advisor-first · Federated",
      n1: [
        { title: "President, Private Client Group",   fn: "commercial", sub: "PCG · Advisors",          span: 9, om: "core", warn: true },
        { title: "President, Capital Markets",        fn: "commercial", sub: "Equity · Fixed Income",   span: 7, om: "core" },
        { title: "President, Asset Management",       fn: "commercial", sub: "AM",                       span: 5, om: "core" },
        { title: "President, Raymond James Bank",     fn: "commercial", sub: "Bank",                     span: 6, om: "core" },
        { title: "Chief Financial Officer",           fn: "finance",    sub: "Finance · IR",             span: 6, om: "enable" },
        { title: "Chief Operating Officer",           fn: "ops",        sub: "Ops · Tech",               span: 7, om: "shared" },
        { title: "General Counsel",                   fn: "legal",      sub: "Legal · Compliance",       span: 5, om: "shared" },
        { title: "Chief Human Resources Officer",     fn: "hr",         sub: "People",                   span: 5, om: "enable" },
        { title: "Chief Risk Officer",                fn: "risk",       sub: "Enterprise Risk",          span: 4, om: "shared" },
      ],
      diagnostics: { avgSpan: 6.0, layers: 7, duplicated: 11, mgrToIC: 5.0, gaAsPctRev: 16.2 },
    },
    future: {
      archetype: "Ambidextrous (Integrated wealth + bank)",
      rootTitle: "Chief Executive Officer",
      rootSub: "Strategic Intent: Integrated wealth platform",
      n1: [
        { title: "President, Wealth (PCG + AM + Bank)", fn: "commercial", sub: "Integrated P&L",         span: 9, om: "core", status: "new", note: "PCG, AM, and Bank report into one wealth P&L" },
        { title: "President, Capital Markets",        fn: "commercial", sub: "Equity · Fixed Income",   span: 7, om: "core" },
        { title: "Chief Financial Officer",           fn: "finance",    sub: "Finance · IR",             span: 6, om: "enable" },
        { title: "Chief Operating Officer",           fn: "ops",        sub: "Ops · Platform Tech",      span: 7, om: "shared", status: "moved", note: "Shared platform explicitly cross-segment" },
        { title: "Chief Risk Officer",                fn: "risk",       sub: "Enterprise Risk",          span: 4, om: "shared" },
        { title: "Chief Legal & Compliance Officer", fn: "legal",      sub: "Legal · Compliance",       span: 5, om: "shared" },
        { title: "Chief Human Resources Officer",     fn: "hr",         sub: "People",                   span: 5, om: "enable" },
        { title: "Chief Digital & Advisor Tech Officer", fn: "digital", sub: "Advisor tech",             span: 4, om: "enable", status: "new", note: "Advisor experience as dedicated C-suite priority" },
      ],
      diagnostics: { avgSpan: 5.9, layers: 6, duplicated: 3, mgrToIC: 5.8, gaAsPctRev: 14.8 },
    },
    positions: {
      current: {
        strategicClarity: 0.60, accountability: 0.75, designOrientation: 0.55,
        capabilityLocation: 0.50, decisionGeography: 0.70, layerEconomy: 0.42,
        functionalPosture: 0.58, sharedServices: 0.55, governanceSpeed: 0.45, cultureCongruence: 0.75,
      },
      future: {
        strategicClarity: 0.78, accountability: 0.82, designOrientation: 0.75,
        capabilityLocation: 0.72, decisionGeography: 0.68, layerEconomy: 0.62,
        functionalPosture: 0.70, sharedServices: 0.78, governanceSpeed: 0.62, cultureCongruence: 0.75,
      },
      market: MEDIAN_FINSVC,
      peer: {
        name: "LPL Financial (peer)",
        positions: {
          strategicClarity: 0.65, accountability: 0.72, designOrientation: 0.58,
          capabilityLocation: 0.55, decisionGeography: 0.60, layerEconomy: 0.50,
          functionalPosture: 0.60, sharedServices: 0.65, governanceSpeed: 0.55, cultureCongruence: 0.60,
        },
      },
    },
    archetypeRanking: {
      functional: "poor", regionalHolding: "partial", frontBack: "partial",
      matrix: "partial", productDivisional: "current", ambidextrous: "strong",
      platform: "partial", networked: "poor",
    },
    chosenArchetype: "ambidextrous",
    pullQuote: {
      text: "Federations optimize for autonomy. Platforms optimize for leverage. Choose the balance, then pick the structure.",
      attr: "— Amy Kates & Greg Kesler, Bridging Organization Design",
    },
    designRationaleHeadline: "The advisor is the front door — the platform is the building.",
    designRationaleBody: "Integrating PCG, Asset Management, and the Bank under one wealth P&L preserves advisor independence while unlocking balance-sheet and fee-income synergies that the federated model leaves on the table.",
  },

  goldman: {
    key: "goldman",
    company: "Goldman Sachs",
    ticker: "GS",
    industry: "Financial Services",
    cap: "large",
    headcount: 35000,
    strategicContext: {
      revenue: "~$49B",
      regions: "Global · NYC HQ · London · APAC",
      segments: "Global Banking & Markets · Asset & Wealth · Platform Solutions",
      horizon: "36 months",
      ceoMandate: "Return to core strength in Banking & Markets and Asset & Wealth while winding down consumer missteps and re-platforming tech.",
      transformationFrom: "Three-segment with consumer drag",
      transformationTo: "Focused Banking & Markets + A&W + Platform",
    },
    current: {
      archetype: "Segment Divisional with Platform Overlay",
      rootTitle: "Chair & CEO",
      rootSub: "Post-Marcus reset",
      n1: [
        { title: "President & COO",                   fn: "exec",       sub: "Operations",              span: 12, om: "core", warn: true },
        { title: "Head of Global Banking & Markets",  fn: "commercial", sub: "IB · FICC · Equities",    span: 10, om: "core", warn: true },
        { title: "Head of Asset & Wealth Management", fn: "commercial", sub: "A&W · PWM",                span: 8, om: "core" },
        { title: "Head of Platform Solutions",        fn: "commercial", sub: "Transaction · Cards",     span: 5, om: "core" },
        { title: "Chief Financial Officer",           fn: "finance",    sub: "Finance · Treasury · IR", span: 8, om: "enable" },
        { title: "Chief Information Officer",         fn: "engineering", sub: "Technology",             span: 8, om: "shared" },
        { title: "Chief Risk Officer",                fn: "risk",       sub: "Enterprise Risk",         span: 5, om: "shared" },
        { title: "Global Head of Human Capital Mgmt", fn: "hr",         sub: "People",                   span: 5, om: "enable" },
        { title: "General Counsel",                   fn: "legal",      sub: "Legal · Compliance",       span: 5, om: "shared" },
        { title: "Chief of Staff",                    fn: "exec",       sub: "Executive Office",         span: 3, om: "enable" },
      ],
      diagnostics: { avgSpan: 6.9, layers: 9, duplicated: 14, mgrToIC: 4.8, gaAsPctRev: 26.4 },
    },
    future: {
      archetype: "Ambidextrous (Core + Platform)",
      rootTitle: "Chair & CEO",
      rootSub: "Strategic Intent: Core excellence + Platform leverage",
      n1: [
        { title: "President & COO",                   fn: "exec",       sub: "Operations",              span: 10, om: "core" },
        { title: "Head of Global Banking & Markets",  fn: "commercial", sub: "IB · FICC · Equities",    span: 9, om: "core" },
        { title: "Head of Asset & Wealth Management", fn: "commercial", sub: "A&W · PWM",                span: 8, om: "core" },
        { title: "Head of Platform Solutions",        fn: "commercial", sub: "Transaction Banking",     span: 4, om: "core", status: "moved", note: "Wind down consumer; focus on Transaction Banking" },
        { title: "Chief Financial Officer",           fn: "finance",    sub: "Finance · Treasury · IR", span: 8, om: "enable" },
        { title: "Chief Technology Officer",          fn: "engineering", sub: "Engineering · AI",       span: 7, om: "core", status: "moved", note: "CIO reframed as CTO; engineering elevated" },
        { title: "Chief Risk Officer",                fn: "risk",       sub: "Enterprise Risk",         span: 5, om: "shared" },
        { title: "Chief People Officer",              fn: "hr",         sub: "People",                   span: 5, om: "enable" },
        { title: "General Counsel",                   fn: "legal",      sub: "Legal · Compliance",       span: 5, om: "shared" },
      ],
      diagnostics: { avgSpan: 6.8, layers: 8, duplicated: 6, mgrToIC: 5.4, gaAsPctRev: 23.8 },
    },
    positions: {
      current: {
        strategicClarity: 0.55, accountability: 0.72, designOrientation: 0.50,
        capabilityLocation: 0.60, decisionGeography: 0.58, layerEconomy: 0.35,
        functionalPosture: 0.62, sharedServices: 0.68, governanceSpeed: 0.42, cultureCongruence: 0.55,
      },
      future: {
        strategicClarity: 0.82, accountability: 0.82, designOrientation: 0.70,
        capabilityLocation: 0.78, decisionGeography: 0.62, layerEconomy: 0.58,
        functionalPosture: 0.70, sharedServices: 0.78, governanceSpeed: 0.62, cultureCongruence: 0.65,
      },
      market: MEDIAN_FINSVC,
      peer: {
        name: "Morgan Stanley (peer)",
        positions: {
          strategicClarity: 0.78, accountability: 0.78, designOrientation: 0.72,
          capabilityLocation: 0.72, decisionGeography: 0.58, layerEconomy: 0.50,
          functionalPosture: 0.68, sharedServices: 0.72, governanceSpeed: 0.55, cultureCongruence: 0.62,
        },
      },
    },
    archetypeRanking: {
      functional: "poor", regionalHolding: "partial", frontBack: "partial",
      matrix: "partial", productDivisional: "current", ambidextrous: "strong",
      platform: "partial", networked: "poor",
    },
    chosenArchetype: "ambidextrous",
    pullQuote: {
      text: "Focus is subtraction. A great design is as defined by what it refuses to include as by what it embraces.",
      attr: "— Naomi Stanford, Guide to Organization Design",
    },
    designRationaleHeadline: "Return to strength, platform with discipline.",
    designRationaleBody: "Winding down Marcus and sharpening Platform Solutions around Transaction Banking clarifies where the firm competes. Elevating engineering from CIO to CTO signals tech as core capability, not cost center.",
  },

  // ────────────────────────────────────────────────────────────────────
  // HEALTHCARE
  // ────────────────────────────────────────────────────────────────────

  hims: {
    key: "hims",
    company: "Hims & Hers Health",
    ticker: "HIMS",
    industry: "Healthcare",
    cap: "small",
    headcount: 1500,
    strategicContext: {
      revenue: "~$1.5B",
      regions: "US-led · UK expansion",
      segments: "Mental Health · Sexual Health · Weight Loss · Dermatology",
      horizon: "18 months",
      ceoMandate: "Scale the telehealth + compounded pharmacy model into durable specialty verticals before PBMs and payers catch up.",
      transformationFrom: "D2C marketing-led",
      transformationTo: "Specialty health platform",
    },
    current: {
      archetype: "Functional D2C",
      rootTitle: "Chief Executive Officer",
      rootSub: "Founder-led",
      n1: [
        { title: "Chief Operating Officer",            fn: "ops",         sub: "Ops · Pharmacy",        span: 7, om: "core" },
        { title: "Chief Technology Officer",           fn: "engineering", sub: "Product · Eng",         span: 6, om: "core" },
        { title: "Chief Marketing Officer",            fn: "marketing",   sub: "Brand · Performance",   span: 5, om: "core", warn: true },
        { title: "Chief Medical Officer",              fn: "clinical",    sub: "Clinical · Safety",     span: 4, om: "core" },
        { title: "Chief Financial Officer",            fn: "finance",     sub: "Finance · IR",          span: 4, om: "enable" },
        { title: "General Counsel",                    fn: "legal",       sub: "Legal · Regulatory",    span: 3, om: "shared" },
        { title: "Chief People Officer",               fn: "hr",          sub: "People",                span: 3, om: "enable" },
      ],
      diagnostics: { avgSpan: 4.6, layers: 5, duplicated: 2, mgrToIC: 6.2, gaAsPctRev: 32.5 },
    },
    future: {
      archetype: "Product Divisional (Specialty P&Ls)",
      rootTitle: "Chief Executive Officer",
      rootSub: "Strategic Intent: Specialty health platform",
      n1: [
        { title: "President, Weight Management",       fn: "commercial",  sub: "GLP-1 · Compounded",    span: 5, om: "core", status: "new", note: "Flagship growth vector deserves its own P&L" },
        { title: "President, Mental Health",           fn: "commercial",  sub: "MH vertical",           span: 4, om: "core", status: "new" },
        { title: "President, Core Specialties",        fn: "commercial",  sub: "Sexual · Derm · Hair",  span: 5, om: "core", status: "new" },
        { title: "Chief Operating Officer",            fn: "ops",         sub: "Ops · Pharmacy",        span: 7, om: "core" },
        { title: "Chief Technology Officer",           fn: "engineering", sub: "Product · AI",          span: 6, om: "core" },
        { title: "Chief Medical Officer",              fn: "clinical",    sub: "Clinical · Safety",     span: 4, om: "shared", status: "moved", note: "Clinical as shared safety function" },
        { title: "Chief Financial Officer",            fn: "finance",     sub: "Finance · IR",          span: 4, om: "enable" },
        { title: "Chief Legal & Compliance Officer",   fn: "legal",       sub: "Legal · Regulatory",    span: 4, om: "shared", status: "moved" },
        { title: "Chief People Officer",               fn: "hr",          sub: "People",                span: 3, om: "enable" },
      ],
      diagnostics: { avgSpan: 4.7, layers: 5, duplicated: 1, mgrToIC: 6.8, gaAsPctRev: 26.8 },
    },
    positions: {
      current: {
        strategicClarity: 0.58, accountability: 0.52, designOrientation: 0.78,
        capabilityLocation: 0.35, decisionGeography: 0.40, layerEconomy: 0.78,
        functionalPosture: 0.60, sharedServices: 0.55, governanceSpeed: 0.82, cultureCongruence: 0.72,
      },
      future: {
        strategicClarity: 0.82, accountability: 0.80, designOrientation: 0.82,
        capabilityLocation: 0.62, decisionGeography: 0.45, layerEconomy: 0.78,
        functionalPosture: 0.68, sharedServices: 0.72, governanceSpeed: 0.78, cultureCongruence: 0.72,
      },
      market: MEDIAN_HEALTH,
      peer: {
        name: "Ro (peer)",
        positions: {
          strategicClarity: 0.65, accountability: 0.68, designOrientation: 0.72,
          capabilityLocation: 0.55, decisionGeography: 0.45, layerEconomy: 0.78,
          functionalPosture: 0.58, sharedServices: 0.58, governanceSpeed: 0.75, cultureCongruence: 0.68,
        },
      },
    },
    archetypeRanking: {
      functional: "current", regionalHolding: "poor", frontBack: "partial",
      matrix: "partial", productDivisional: "strong", ambidextrous: "partial",
      platform: "partial", networked: "poor",
    },
    chosenArchetype: "productDivisional",
    pullQuote: {
      text: "Specialty-led structure creates margin resilience when a commoditizing market catches up to the wedge.",
      attr: "— Clayton Christensen, The Innovator's Prescription",
    },
    designRationaleHeadline: "Specialties deserve owners.",
    designRationaleBody: "As compounded GLP-1 economics normalize and regulators look harder at telehealth, each specialty needs a named P&L leader who can defend it. Clinical, Legal, and Operations become shared capabilities.",
  },

  molina: {
    key: "molina",
    company: "Molina Healthcare",
    ticker: "MOH",
    industry: "Healthcare",
    cap: "mid",
    headcount: 14000,
    strategicContext: {
      revenue: "~$40B",
      regions: "US multi-state",
      segments: "Medicaid · Medicare · Marketplace",
      horizon: "36 months",
      ceoMandate: "Win redeterminations, expand into dual-eligible, and modernize care management technology.",
      transformationFrom: "State-federated Medicaid operator",
      transformationTo: "Multi-line government-sponsored health plan",
    },
    current: {
      archetype: "Regional Holding (State plans)",
      rootTitle: "President & CEO",
      rootSub: "State-federated",
      n1: [
        { title: "President, Health Plan Services",   fn: "commercial", sub: "States + Plans",        span: 14, om: "core", warn: true },
        { title: "Chief Medical Officer",             fn: "clinical",   sub: "Medical · Quality",     span: 5, om: "core" },
        { title: "Chief Financial Officer",           fn: "finance",    sub: "Finance · Actuarial",   span: 6, om: "enable" },
        { title: "Chief Operating Officer",           fn: "ops",        sub: "Ops · Claims",          span: 7, om: "shared" },
        { title: "Chief Information Officer",         fn: "engineering", sub: "IT",                   span: 5, om: "shared" },
        { title: "Chief Legal Officer",               fn: "legal",      sub: "Legal · Regulatory",    span: 4, om: "shared" },
        { title: "Chief Human Resources Officer",     fn: "hr",         sub: "People",                span: 4, om: "enable" },
        { title: "Chief Strategy Officer",            fn: "exec",       sub: "Corp Dev · M&A",        span: 3, om: "enable" },
      ],
      diagnostics: { avgSpan: 6.0, layers: 7, duplicated: 12, mgrToIC: 4.8, gaAsPctRev: 10.8 },
    },
    future: {
      archetype: "Matrix (Line of Business × State)",
      rootTitle: "President & CEO",
      rootSub: "Strategic Intent: Multi-LOB platform",
      n1: [
        { title: "President, Medicaid",               fn: "commercial", sub: "Medicaid LOB P&L",      span: 8, om: "core", status: "new" },
        { title: "President, Medicare",               fn: "commercial", sub: "MA · D-SNP P&L",        span: 6, om: "core", status: "new" },
        { title: "President, Marketplace",            fn: "commercial", sub: "ACA LOB P&L",           span: 4, om: "core", status: "new" },
        { title: "Chief Medical Officer",             fn: "clinical",   sub: "Medical · Quality",     span: 5, om: "shared", status: "moved", note: "Shared across LOBs" },
        { title: "Chief Financial Officer",           fn: "finance",    sub: "Finance · Actuarial",   span: 6, om: "enable" },
        { title: "Chief Operating Officer",           fn: "ops",        sub: "Ops · Claims Platform", span: 7, om: "shared" },
        { title: "Chief Technology Officer",          fn: "engineering", sub: "Care Mgmt Tech · AI",  span: 5, om: "shared", status: "moved", note: "CIO reframed as CTO" },
        { title: "Chief Legal & Compliance Officer",  fn: "legal",      sub: "Legal · Regulatory",    span: 4, om: "shared", status: "moved" },
        { title: "Chief Human Resources Officer",     fn: "hr",         sub: "People",                span: 4, om: "enable" },
      ],
      diagnostics: { avgSpan: 5.4, layers: 6, duplicated: 4, mgrToIC: 5.8, gaAsPctRev: 9.4 },
    },
    positions: {
      current: {
        strategicClarity: 0.52, accountability: 0.58, designOrientation: 0.48,
        capabilityLocation: 0.55, decisionGeography: 0.80, layerEconomy: 0.40,
        functionalPosture: 0.55, sharedServices: 0.60, governanceSpeed: 0.45, cultureCongruence: 0.52,
      },
      future: {
        strategicClarity: 0.78, accountability: 0.80, designOrientation: 0.72,
        capabilityLocation: 0.72, decisionGeography: 0.65, layerEconomy: 0.62,
        functionalPosture: 0.68, sharedServices: 0.78, governanceSpeed: 0.62, cultureCongruence: 0.62,
      },
      market: MEDIAN_HEALTH,
      peer: {
        name: "Centene (peer)",
        positions: {
          strategicClarity: 0.58, accountability: 0.65, designOrientation: 0.52,
          capabilityLocation: 0.60, decisionGeography: 0.72, layerEconomy: 0.38,
          functionalPosture: 0.60, sharedServices: 0.65, governanceSpeed: 0.48, cultureCongruence: 0.55,
        },
      },
    },
    archetypeRanking: {
      functional: "poor", regionalHolding: "current", frontBack: "partial",
      matrix: "strong", productDivisional: "partial", ambidextrous: "poor",
      platform: "poor", networked: "poor",
    },
    chosenArchetype: "matrix",
    pullQuote: {
      text: "Matrix works when the business truly runs on two dimensions at once — punish it with a single-axis design and you'll see it in the P&L.",
      attr: "— Christopher Bartlett & Sumantra Ghoshal, Managing Across Borders",
    },
    designRationaleHeadline: "Line-of-business owners, state platform.",
    designRationaleBody: "The LOB is where actuarial risk, regulation, and product differentiation live — it deserves a president. State plans remain a critical operating axis but no longer the primary P&L.",
  },

  elevance: {
    key: "elevance",
    company: "Elevance Health",
    ticker: "ELV",
    industry: "Healthcare",
    cap: "large",
    headcount: 32000,
    strategicContext: {
      revenue: "~$175B",
      regions: "US · multi-state Blue plans",
      segments: "Commercial · Medicare · Medicaid · Carelon",
      horizon: "36 months",
      ceoMandate: "Scale Carelon health services as a real counterweight to payer cyclicality while keeping BCBS plan trust.",
      transformationFrom: "Payer with services adjacency",
      transformationTo: "Integrated payer-services platform",
    },
    current: {
      archetype: "Segment Divisional with Platform (Carelon)",
      rootTitle: "President & CEO",
      rootSub: "Post-Anthem rebrand",
      n1: [
        { title: "President, Health Benefits (Plans)", fn: "commercial", sub: "Commercial · Gov Plans", span: 10, om: "core", warn: true },
        { title: "President, Carelon",                fn: "commercial", sub: "Services Platform",      span: 8, om: "core" },
        { title: "Chief Financial Officer",           fn: "finance",    sub: "Finance · Actuarial",    span: 7, om: "enable" },
        { title: "Chief Health Officer",              fn: "clinical",   sub: "Medical · Clinical",     span: 5, om: "core" },
        { title: "Chief Operating Officer",           fn: "ops",        sub: "Ops · Claims",           span: 8, om: "shared" },
        { title: "Chief Digital Officer",             fn: "digital",    sub: "Digital · Data",         span: 5, om: "enable" },
        { title: "Chief Legal Officer",               fn: "legal",      sub: "Legal · Regulatory",     span: 5, om: "shared" },
        { title: "Chief Human Resources Officer",     fn: "hr",         sub: "People",                 span: 5, om: "enable" },
        { title: "Chief Strategy Officer",            fn: "exec",       sub: "Corp Dev · M&A",         span: 3, om: "enable" },
      ],
      diagnostics: { avgSpan: 6.2, layers: 8, duplicated: 12, mgrToIC: 5.0, gaAsPctRev: 9.8 },
    },
    future: {
      archetype: "Ambidextrous (Plans + Services)",
      rootTitle: "President & CEO",
      rootSub: "Strategic Intent: Integrated payer-services",
      n1: [
        { title: "President, Health Benefits",        fn: "commercial", sub: "Plans P&L",              span: 8, om: "core" },
        { title: "President, Carelon",                fn: "commercial", sub: "Services P&L",           span: 8, om: "core", status: "moved", note: "Strengthened independent mandate" },
        { title: "Chief Integration & Synergy Officer", fn: "exec",     sub: "Cross-segment value",    span: 3, om: "enable", status: "new", note: "Manages plan-services interlock without collapsing P&Ls" },
        { title: "Chief Financial Officer",           fn: "finance",    sub: "Finance · Actuarial",    span: 7, om: "enable" },
        { title: "Chief Health Officer",              fn: "clinical",   sub: "Medical · Clinical",     span: 5, om: "shared", status: "moved", note: "Clinical as shared capability" },
        { title: "Chief Technology Officer",          fn: "engineering", sub: "Platform · AI",         span: 6, om: "shared", status: "new", note: "Technology elevated from CIO" },
        { title: "Chief Operating Officer",           fn: "ops",        sub: "Ops · Claims Platform",  span: 8, om: "shared" },
        { title: "Chief Legal & Compliance Officer",  fn: "legal",      sub: "Legal · Regulatory",     span: 5, om: "shared", status: "moved" },
        { title: "Chief Human Resources Officer",     fn: "hr",         sub: "People",                 span: 5, om: "enable" },
      ],
      diagnostics: { avgSpan: 6.1, layers: 7, duplicated: 5, mgrToIC: 5.6, gaAsPctRev: 8.6 },
    },
    positions: {
      current: {
        strategicClarity: 0.58, accountability: 0.68, designOrientation: 0.55,
        capabilityLocation: 0.62, decisionGeography: 0.62, layerEconomy: 0.42,
        functionalPosture: 0.60, sharedServices: 0.68, governanceSpeed: 0.48, cultureCongruence: 0.55,
      },
      future: {
        strategicClarity: 0.80, accountability: 0.82, designOrientation: 0.75,
        capabilityLocation: 0.75, decisionGeography: 0.62, layerEconomy: 0.58,
        functionalPosture: 0.72, sharedServices: 0.80, governanceSpeed: 0.62, cultureCongruence: 0.65,
      },
      market: MEDIAN_HEALTH,
      peer: {
        name: "UnitedHealth Group (peer)",
        positions: {
          strategicClarity: 0.78, accountability: 0.82, designOrientation: 0.72,
          capabilityLocation: 0.80, decisionGeography: 0.58, layerEconomy: 0.45,
          functionalPosture: 0.72, sharedServices: 0.78, governanceSpeed: 0.55, cultureCongruence: 0.62,
        },
      },
    },
    archetypeRanking: {
      functional: "poor", regionalHolding: "partial", frontBack: "partial",
      matrix: "partial", productDivisional: "current", ambidextrous: "strong",
      platform: "partial", networked: "poor",
    },
    chosenArchetype: "ambidextrous",
    pullQuote: {
      text: "Two engines, one firm — but only if you manage the interlock, not the merger.",
      attr: "— O'Reilly & Tushman, Lead and Disrupt",
    },
    designRationaleHeadline: "Two engines, one firm, one interlock.",
    designRationaleBody: "Carelon and Plans move on different clockspeeds — one builds services against commercial rivals, the other manages utilization risk. A Chief Integration Officer manages the value interlock without collapsing either P&L.",
  },

  // ────────────────────────────────────────────────────────────────────
  // RETAIL
  // ────────────────────────────────────────────────────────────────────

  fivebelow: {
    key: "fivebelow",
    company: "Five Below",
    ticker: "FIVE",
    industry: "Retail",
    cap: "small",
    headcount: 4500,
    strategicContext: {
      revenue: "~$3.8B",
      regions: "US · 1,700+ stores",
      segments: "Store-led discount · Five Beyond",
      horizon: "24 months",
      ceoMandate: "Stabilize store-level economics, fix shrink, and recommit to the tightly merchandised value proposition.",
      transformationFrom: "Growth-mode merchandising",
      transformationTo: "Disciplined store P&L + tight merchandising",
    },
    current: {
      archetype: "Functional retail",
      rootTitle: "Chief Executive Officer",
      rootSub: "Growth-to-discipline pivot",
      n1: [
        { title: "Chief Merchandising Officer",       fn: "commercial", sub: "Buying · Planning",      span: 8, om: "core", warn: true },
        { title: "Chief Operating Officer",           fn: "ops",        sub: "Stores · DC",            span: 9, om: "core", warn: true },
        { title: "Chief Financial Officer",           fn: "finance",    sub: "Finance · IR",           span: 5, om: "enable" },
        { title: "Chief Marketing Officer",           fn: "marketing",  sub: "Brand · Loyalty",        span: 4, om: "enable" },
        { title: "Chief Human Resources Officer",     fn: "hr",         sub: "People",                 span: 4, om: "enable" },
        { title: "Chief Legal Officer",               fn: "legal",      sub: "Legal",                  span: 3, om: "shared" },
        { title: "Chief Information Officer",         fn: "engineering", sub: "IT",                    span: 3, om: "shared" },
      ],
      diagnostics: { avgSpan: 5.1, layers: 5, duplicated: 3, mgrToIC: 18.2, gaAsPctRev: 7.8 },
    },
    future: {
      archetype: "Functional retail (tightened)",
      rootTitle: "Chief Executive Officer",
      rootSub: "Strategic Intent: Disciplined value retail",
      n1: [
        { title: "Chief Merchandising Officer",       fn: "commercial", sub: "Buying · Planning",      span: 8, om: "core" },
        { title: "Chief Stores Officer",              fn: "ops",        sub: "Store Ops · Shrink",     span: 7, om: "core", status: "new", note: "Stores split out from broader COO mandate" },
        { title: "Chief Supply Chain Officer",        fn: "ops",        sub: "DC · Logistics",         span: 5, om: "core", status: "new", note: "Supply chain split out from broader COO mandate" },
        { title: "Chief Financial Officer",           fn: "finance",    sub: "Finance · IR",           span: 5, om: "enable" },
        { title: "Chief Marketing Officer",           fn: "marketing",  sub: "Brand · Loyalty",        span: 4, om: "enable" },
        { title: "Chief Human Resources Officer",     fn: "hr",         sub: "People",                 span: 4, om: "enable" },
        { title: "Chief Legal & Compliance Officer",  fn: "legal",      sub: "Legal · Ethics",         span: 3, om: "shared", status: "moved" },
        { title: "Chief Technology Officer",          fn: "engineering", sub: "IT · POS · Data",       span: 3, om: "shared", status: "moved" },
      ],
      diagnostics: { avgSpan: 4.9, layers: 5, duplicated: 1, mgrToIC: 16.8, gaAsPctRev: 7.2 },
    },
    positions: {
      current: {
        strategicClarity: 0.58, accountability: 0.52, designOrientation: 0.72,
        capabilityLocation: 0.40, decisionGeography: 0.45, layerEconomy: 0.70,
        functionalPosture: 0.58, sharedServices: 0.65, governanceSpeed: 0.62, cultureCongruence: 0.65,
      },
      future: {
        strategicClarity: 0.78, accountability: 0.78, designOrientation: 0.78,
        capabilityLocation: 0.60, decisionGeography: 0.52, layerEconomy: 0.72,
        functionalPosture: 0.65, sharedServices: 0.70, governanceSpeed: 0.72, cultureCongruence: 0.70,
      },
      market: MEDIAN_RETAIL,
      peer: {
        name: "Dollar Tree (peer)",
        positions: {
          strategicClarity: 0.55, accountability: 0.65, designOrientation: 0.58,
          capabilityLocation: 0.52, decisionGeography: 0.60, layerEconomy: 0.52,
          functionalPosture: 0.60, sharedServices: 0.68, governanceSpeed: 0.55, cultureCongruence: 0.58,
        },
      },
    },
    archetypeRanking: {
      functional: "current", regionalHolding: "poor", frontBack: "partial",
      matrix: "poor", productDivisional: "poor", ambidextrous: "poor",
      platform: "poor", networked: "poor",
    },
    chosenArchetype: "functional",
    pullQuote: {
      text: "When the format is the strategy, the organization's job is to not get in the way.",
      attr: "— Naomi Stanford, Organization Design: The Practitioner's Guide",
    },
    designRationaleHeadline: "Split the COO, protect the format.",
    designRationaleBody: "A single COO managing stores, DCs, and shrink is too much surface area during a discipline reset. Splitting Stores from Supply Chain creates clear accountability for the two metrics that matter most right now: shrink and cost-to-serve.",
  },

  williamssonoma: {
    key: "williamssonoma",
    company: "Williams-Sonoma",
    ticker: "WSM",
    industry: "Retail",
    cap: "mid",
    headcount: 10000,
    strategicContext: {
      revenue: "~$7.8B",
      regions: "US-led · limited intl",
      segments: "Pottery Barn · West Elm · Williams Sonoma · Rejuvenation",
      horizon: "24 months",
      ceoMandate: "Hold digital-first retail leadership while deepening B2B and shared supply-chain advantage across brands.",
      transformationFrom: "Brand portfolio",
      transformationTo: "Shared platform with brand fronts",
    },
    current: {
      archetype: "Brand Divisional",
      rootTitle: "President & CEO",
      rootSub: "Brand-led",
      n1: [
        { title: "President, Pottery Barn",            fn: "brand",      sub: "Brand P&L",               span: 6, om: "core" },
        { title: "President, West Elm",                fn: "brand",      sub: "Brand P&L",               span: 5, om: "core" },
        { title: "President, Williams Sonoma Brand",   fn: "brand",      sub: "Brand P&L",               span: 5, om: "core" },
        { title: "President, Rejuvenation / Mark & Graham", fn: "brand", sub: "Emerging Brands",         span: 4, om: "core" },
        { title: "Chief Supply Chain Officer",         fn: "ops",        sub: "Supply · DC · Delivery",  span: 7, om: "shared", warn: true },
        { title: "Chief Digital Officer",              fn: "digital",    sub: "Digital · Data",          span: 5, om: "shared" },
        { title: "Chief Financial Officer",            fn: "finance",    sub: "Finance · IR",            span: 5, om: "enable" },
        { title: "Chief Marketing Officer",            fn: "marketing",  sub: "Enterprise Brand",        span: 4, om: "enable" },
        { title: "Chief Human Resources Officer",      fn: "hr",         sub: "People",                  span: 4, om: "enable" },
        { title: "General Counsel",                    fn: "legal",      sub: "Legal",                   span: 3, om: "shared" },
      ],
      diagnostics: { avgSpan: 5.1, layers: 6, duplicated: 14, mgrToIC: 10.8, gaAsPctRev: 11.2 },
    },
    future: {
      archetype: "Front-Back (Brand fronts + Shared platform)",
      rootTitle: "President & CEO",
      rootSub: "Strategic Intent: Shared platform, branded fronts",
      n1: [
        { title: "President, Home Brands (PB + WE)",   fn: "brand",      sub: "Combined home P&L",       span: 8, om: "core", status: "new", note: "Pottery Barn + West Elm consolidated" },
        { title: "President, WS Culinary Brands",      fn: "brand",      sub: "WS + Culinary adj.",      span: 5, om: "core", status: "moved" },
        { title: "President, Emerging Brands",         fn: "brand",      sub: "Rej · Mark & Graham · Incubation", span: 4, om: "core" },
        { title: "President, B2B",                     fn: "commercial", sub: "Contract · Hospitality",  span: 4, om: "core", status: "new", note: "Separate P&L for B2B growth" },
        { title: "Chief Supply Chain Officer",         fn: "ops",        sub: "Supply · DC · Delivery",  span: 7, om: "shared" },
        { title: "Chief Digital & Data Officer",       fn: "digital",    sub: "Platform · AI",           span: 5, om: "shared", status: "moved" },
        { title: "Chief Financial Officer",            fn: "finance",    sub: "Finance · IR",            span: 5, om: "enable" },
        { title: "Chief Human Resources Officer",      fn: "hr",         sub: "People",                  span: 4, om: "enable" },
        { title: "Chief Legal & Compliance Officer",   fn: "legal",      sub: "Legal · Ethics",          span: 3, om: "shared", status: "moved" },
      ],
      diagnostics: { avgSpan: 5.0, layers: 5, duplicated: 5, mgrToIC: 11.4, gaAsPctRev: 9.8 },
    },
    positions: {
      current: {
        strategicClarity: 0.62, accountability: 0.68, designOrientation: 0.72,
        capabilityLocation: 0.45, decisionGeography: 0.55, layerEconomy: 0.48,
        functionalPosture: 0.60, sharedServices: 0.62, governanceSpeed: 0.55, cultureCongruence: 0.68,
      },
      future: {
        strategicClarity: 0.80, accountability: 0.80, designOrientation: 0.82,
        capabilityLocation: 0.68, decisionGeography: 0.58, layerEconomy: 0.68,
        functionalPosture: 0.68, sharedServices: 0.80, governanceSpeed: 0.65, cultureCongruence: 0.70,
      },
      market: MEDIAN_RETAIL,
      peer: {
        name: "RH (peer)",
        positions: {
          strategicClarity: 0.72, accountability: 0.68, designOrientation: 0.78,
          capabilityLocation: 0.55, decisionGeography: 0.52, layerEconomy: 0.70,
          functionalPosture: 0.62, sharedServices: 0.55, governanceSpeed: 0.68, cultureCongruence: 0.75,
        },
      },
    },
    archetypeRanking: {
      functional: "poor", regionalHolding: "poor", frontBack: "strong",
      matrix: "partial", productDivisional: "current", ambidextrous: "partial",
      platform: "partial", networked: "poor",
    },
    chosenArchetype: "frontBack",
    pullQuote: {
      text: "When scale advantages live in the back and brand advantages live in the front, fight for both — don't pick.",
      attr: "— Jay Galbraith, Designing the Customer-Centric Organization",
    },
    designRationaleHeadline: "One platform, four brands, clear owners.",
    designRationaleBody: "Consolidating Pottery Barn and West Elm under a single home-brands leader cuts duplicated merchandising while a dedicated B2B president captures the contract-hospitality adjacency the brand model has understructured.",
  },

  target: {
    key: "target",
    company: "Target",
    ticker: "TGT",
    industry: "Retail",
    cap: "large",
    headcount: 35000,
    strategicContext: {
      revenue: "~$107B",
      regions: "US · ~1,950 stores",
      segments: "Stores · Digital · Same-Day Services",
      horizon: "36 months",
      ceoMandate: "Rebuild consumer trust, tighten inventory, and use owned-brands + same-day as the differentiation that big-box can't copy.",
      transformationFrom: "Functional big-box",
      transformationTo: "Customer-back with same-day capability",
    },
    current: {
      archetype: "Functional big-box",
      rootTitle: "Chair & CEO",
      rootSub: "Trust & discipline era",
      n1: [
        { title: "Chief Operating Officer",           fn: "ops",        sub: "Stores · Supply · Svcs", span: 10, om: "core", warn: true },
        { title: "Chief Growth Officer",              fn: "commercial", sub: "Digital · Marketing",    span: 7, om: "core", warn: true },
        { title: "Chief Merchandising Officer",       fn: "commercial", sub: "Owned + Nat'l brands",   span: 8, om: "core" },
        { title: "Chief Financial Officer",           fn: "finance",    sub: "Finance · IR",           span: 7, om: "enable" },
        { title: "Chief Information Officer",         fn: "engineering", sub: "Technology",            span: 6, om: "shared" },
        { title: "Chief Human Resources Officer",     fn: "hr",         sub: "People",                 span: 5, om: "enable" },
        { title: "Chief Legal Officer",               fn: "legal",      sub: "Legal · Compliance",     span: 5, om: "shared" },
        { title: "Chief Strategy Officer",            fn: "exec",       sub: "Strategy · Corp Dev",    span: 3, om: "enable" },
        { title: "Chief External Engagement Officer", fn: "marketing",  sub: "Comms · Gov Affairs",    span: 4, om: "enable" },
      ],
      diagnostics: { avgSpan: 6.1, layers: 8, duplicated: 10, mgrToIC: 12.5, gaAsPctRev: 16.8 },
    },
    future: {
      archetype: "Front-Back (Customer + Platform)",
      rootTitle: "Chair & CEO",
      rootSub: "Strategic Intent: Customer-back retail",
      n1: [
        { title: "President, Guest Experience (Front)", fn: "commercial", sub: "Stores · Digital · Svcs", span: 9, om: "core", status: "new", note: "Omnichannel under one leader" },
        { title: "President, Merchandising & Owned Brands", fn: "commercial", sub: "Buying · Product", span: 8, om: "core", status: "moved", note: "Owned brands elevated" },
        { title: "President, Supply Chain & Same-Day", fn: "ops",        sub: "DC · Last Mile · Shipt", span: 7, om: "core", status: "new", note: "Same-day as a named capability" },
        { title: "Chief Financial Officer",           fn: "finance",    sub: "Finance · IR",           span: 7, om: "enable" },
        { title: "Chief Technology Officer",          fn: "engineering", sub: "Platform · AI",         span: 6, om: "shared", status: "moved", note: "CIO reframed as CTO" },
        { title: "Chief Human Resources Officer",     fn: "hr",         sub: "People",                 span: 5, om: "enable" },
        { title: "Chief Legal & Compliance Officer",  fn: "legal",      sub: "Legal · Compliance",     span: 5, om: "shared", status: "moved" },
        { title: "Chief Trust Officer",               fn: "marketing",  sub: "Comms · Brand Trust",    span: 4, om: "enable", status: "new", note: "Reputation as named function" },
      ],
      diagnostics: { avgSpan: 6.4, layers: 7, duplicated: 4, mgrToIC: 13.2, gaAsPctRev: 14.2 },
    },
    positions: {
      current: {
        strategicClarity: 0.58, accountability: 0.65, designOrientation: 0.62,
        capabilityLocation: 0.55, decisionGeography: 0.58, layerEconomy: 0.40,
        functionalPosture: 0.58, sharedServices: 0.68, governanceSpeed: 0.52, cultureCongruence: 0.55,
      },
      future: {
        strategicClarity: 0.82, accountability: 0.82, designOrientation: 0.85,
        capabilityLocation: 0.70, decisionGeography: 0.58, layerEconomy: 0.58,
        functionalPosture: 0.68, sharedServices: 0.78, governanceSpeed: 0.68, cultureCongruence: 0.68,
      },
      market: MEDIAN_RETAIL,
      peer: {
        name: "Walmart (peer)",
        positions: {
          strategicClarity: 0.78, accountability: 0.80, designOrientation: 0.78,
          capabilityLocation: 0.72, decisionGeography: 0.62, layerEconomy: 0.55,
          functionalPosture: 0.70, sharedServices: 0.80, governanceSpeed: 0.62, cultureCongruence: 0.62,
        },
      },
    },
    archetypeRanking: {
      functional: "current", regionalHolding: "poor", frontBack: "strong",
      matrix: "partial", productDivisional: "partial", ambidextrous: "partial",
      platform: "partial", networked: "poor",
    },
    chosenArchetype: "frontBack",
    pullQuote: {
      text: "The question isn't whether to be customer-back. The question is whether you're willing to give up functional thrones to do it.",
      attr: "— Amy Kates & Greg Kesler",
    },
    designRationaleHeadline: "The guest is the front. The platform is the back.",
    designRationaleBody: "Unifying stores, digital, and same-day services under one Guest Experience president ends the channel wars. Elevating same-day to its own platform president makes the Shipt-enabled moat explicit.",
  },

  // ────────────────────────────────────────────────────────────────────
  // MANUFACTURING
  // ────────────────────────────────────────────────────────────────────

  axon: {
    key: "axon",
    company: "Axon Enterprise",
    ticker: "AXON",
    industry: "Manufacturing",
    cap: "small",
    headcount: 4000,
    strategicContext: {
      revenue: "~$2B",
      regions: "US-led · intl expansion",
      segments: "TASER · Body Cameras · Axon Cloud & Software",
      horizon: "24 months",
      ceoMandate: "Become the software-led operating system for public safety without losing the hardware moat.",
      transformationFrom: "Hardware-led with software attach",
      transformationTo: "Software-led platform with hardware capture",
    },
    current: {
      archetype: "Product Divisional (Hardware-led)",
      rootTitle: "Founder & CEO",
      rootSub: "Mission-led",
      n1: [
        { title: "Chief Operating Officer",           fn: "ops",         sub: "Mfg · Ops",             span: 7, om: "core" },
        { title: "President, Software & Sensors",     fn: "product",     sub: "Cloud · Body Cam SW",   span: 8, om: "core", warn: true },
        { title: "Chief Revenue Officer",             fn: "commercial",  sub: "Gov Sales",             span: 7, om: "core" },
        { title: "Chief Product Officer",             fn: "product",     sub: "Product Mgmt",          span: 5, om: "core" },
        { title: "Chief Technology Officer",          fn: "engineering", sub: "Eng · AI",              span: 6, om: "core" },
        { title: "Chief Financial Officer",           fn: "finance",     sub: "Finance · IR",          span: 5, om: "enable" },
        { title: "General Counsel",                   fn: "legal",       sub: "Legal · Ethics",        span: 4, om: "shared" },
        { title: "Chief People Officer",              fn: "hr",          sub: "People",                span: 3, om: "enable" },
      ],
      diagnostics: { avgSpan: 5.6, layers: 5, duplicated: 4, mgrToIC: 6.4, gaAsPctRev: 21.8 },
    },
    future: {
      archetype: "Front-Back (Software front + Hardware back)",
      rootTitle: "Founder & CEO",
      rootSub: "Strategic Intent: Software-led public-safety OS",
      n1: [
        { title: "President, Axon Cloud (Front)",     fn: "product",     sub: "Software P&L",          span: 7, om: "core", status: "new", note: "Software becomes the named P&L" },
        { title: "President, Devices (Back)",         fn: "ops",         sub: "Hardware P&L",          span: 6, om: "core", status: "moved", note: "Hardware reframed as engine, not lead" },
        { title: "Chief Revenue Officer",             fn: "commercial",  sub: "Gov · Intl Sales",      span: 7, om: "core" },
        { title: "Chief Technology Officer",          fn: "engineering", sub: "Eng · AI · Platform",   span: 7, om: "core", status: "moved" },
        { title: "Chief Financial Officer",           fn: "finance",     sub: "Finance · IR",          span: 5, om: "enable" },
        { title: "Chief Ethics & Policy Officer",     fn: "legal",       sub: "Ethics · Civil Rights", span: 3, om: "shared", status: "new", note: "Public-safety tech needs ethics at the C-suite" },
        { title: "Chief People Officer",              fn: "hr",          sub: "People",                span: 3, om: "enable" },
        { title: "Chief Marketing Officer",           fn: "marketing",   sub: "Brand · Public Sector", span: 3, om: "enable", status: "new" },
      ],
      diagnostics: { avgSpan: 5.1, layers: 5, duplicated: 2, mgrToIC: 6.8, gaAsPctRev: 18.6 },
    },
    positions: {
      current: {
        strategicClarity: 0.62, accountability: 0.68, designOrientation: 0.65,
        capabilityLocation: 0.55, decisionGeography: 0.45, layerEconomy: 0.72,
        functionalPosture: 0.62, sharedServices: 0.58, governanceSpeed: 0.70, cultureCongruence: 0.72,
      },
      future: {
        strategicClarity: 0.85, accountability: 0.82, designOrientation: 0.82,
        capabilityLocation: 0.72, decisionGeography: 0.52, layerEconomy: 0.75,
        functionalPosture: 0.72, sharedServices: 0.68, governanceSpeed: 0.75, cultureCongruence: 0.78,
      },
      market: MEDIAN_MFG,
      peer: {
        name: "Motorola Solutions (peer)",
        positions: {
          strategicClarity: 0.68, accountability: 0.75, designOrientation: 0.62,
          capabilityLocation: 0.65, decisionGeography: 0.58, layerEconomy: 0.48,
          functionalPosture: 0.65, sharedServices: 0.70, governanceSpeed: 0.58, cultureCongruence: 0.65,
        },
      },
    },
    archetypeRanking: {
      functional: "poor", regionalHolding: "poor", frontBack: "strong",
      matrix: "partial", productDivisional: "current", ambidextrous: "partial",
      platform: "partial", networked: "poor",
    },
    chosenArchetype: "frontBack",
    pullQuote: {
      text: "Software eats hardware when the organization lets it — and reinforces hardware moats when the organization insists.",
      attr: "— Geoffrey Moore, Zone to Win",
    },
    designRationaleHeadline: "Software in front, devices in back, ethics at the table.",
    designRationaleBody: "Moving software ahead of hardware in the P&L hierarchy signals the real business model. A Chief Ethics & Policy Officer isn't cosmetic in public safety — it's the seat that keeps the platform deployable in contested jurisdictions.",
  },

  parkerhannifin: {
    key: "parkerhannifin",
    company: "Parker Hannifin",
    ticker: "PH",
    industry: "Manufacturing",
    cap: "mid",
    headcount: 13000,
    strategicContext: {
      revenue: "~$20B",
      regions: "Global · 47 countries",
      segments: "Diversified Industrial · Aerospace Systems",
      horizon: "36 months",
      ceoMandate: "Integrate Meggitt, lift Aerospace margins, and run The Win Strategy across every division.",
      transformationFrom: "Decentralized divisional",
      transformationTo: "Win-Strategy-led with segment P&Ls",
    },
    current: {
      archetype: "Decentralized Divisional",
      rootTitle: "Chair & CEO",
      rootSub: "Win Strategy era",
      n1: [
        { title: "President, Diversified Industrial N. America", fn: "commercial", sub: "NA Industrial", span: 9, om: "core" },
        { title: "President, Diversified Industrial Intl",       fn: "commercial", sub: "Intl Industrial", span: 9, om: "core" },
        { title: "President, Aerospace Systems",                  fn: "commercial", sub: "Aero P&L",       span: 8, om: "core", warn: true },
        { title: "Chief Operating Officer",                       fn: "ops",        sub: "Ops · Lean",     span: 6, om: "core" },
        { title: "Chief Financial Officer",                       fn: "finance",    sub: "Finance · IR",   span: 6, om: "enable" },
        { title: "Chief Human Resources Officer",                 fn: "hr",         sub: "People",         span: 4, om: "enable" },
        { title: "General Counsel",                               fn: "legal",      sub: "Legal",          span: 4, om: "shared" },
        { title: "Chief Technology Officer",                      fn: "engineering", sub: "Engineering",   span: 4, om: "shared" },
        { title: "Chief Digital Officer",                         fn: "digital",    sub: "Digital · IoT",  span: 3, om: "enable" },
      ],
      diagnostics: { avgSpan: 5.9, layers: 7, duplicated: 12, mgrToIC: 9.2, gaAsPctRev: 11.4 },
    },
    future: {
      archetype: "Segment Divisional (tightened)",
      rootTitle: "Chair & CEO",
      rootSub: "Strategic Intent: Win Strategy at scale",
      n1: [
        { title: "President, Industrial",              fn: "commercial", sub: "Global Industrial P&L",  span: 10, om: "core", status: "moved", note: "NA and Intl Industrial combined" },
        { title: "President, Aerospace Systems",       fn: "commercial", sub: "Aero P&L (post-Meggitt)", span: 8, om: "core" },
        { title: "Chief Operating Officer",            fn: "ops",        sub: "Ops · Lean · Integration", span: 6, om: "core" },
        { title: "Chief Financial Officer",            fn: "finance",    sub: "Finance · IR",           span: 6, om: "enable" },
        { title: "Chief Technology & Digital Officer", fn: "engineering", sub: "Engineering · IoT · AI", span: 5, om: "shared", status: "moved", note: "CTO + CDO merged" },
        { title: "Chief Human Resources Officer",      fn: "hr",         sub: "People",                 span: 4, om: "enable" },
        { title: "Chief Legal & Compliance Officer",   fn: "legal",      sub: "Legal · Compliance",     span: 4, om: "shared", status: "moved" },
        { title: "Chief Strategy & Corp Dev Officer",  fn: "exec",       sub: "Strategy · M&A",         span: 3, om: "enable", status: "new", note: "M&A playbook needs a named owner" },
      ],
      diagnostics: { avgSpan: 5.8, layers: 6, duplicated: 4, mgrToIC: 9.8, gaAsPctRev: 9.8 },
    },
    positions: {
      current: {
        strategicClarity: 0.68, accountability: 0.78, designOrientation: 0.55,
        capabilityLocation: 0.62, decisionGeography: 0.72, layerEconomy: 0.42,
        functionalPosture: 0.62, sharedServices: 0.58, governanceSpeed: 0.52, cultureCongruence: 0.72,
      },
      future: {
        strategicClarity: 0.82, accountability: 0.82, designOrientation: 0.72,
        capabilityLocation: 0.75, decisionGeography: 0.65, layerEconomy: 0.62,
        functionalPosture: 0.70, sharedServices: 0.75, governanceSpeed: 0.65, cultureCongruence: 0.75,
      },
      market: MEDIAN_MFG,
      peer: {
        name: "Eaton (peer)",
        positions: {
          strategicClarity: 0.72, accountability: 0.80, designOrientation: 0.62,
          capabilityLocation: 0.70, decisionGeography: 0.65, layerEconomy: 0.50,
          functionalPosture: 0.68, sharedServices: 0.72, governanceSpeed: 0.58, cultureCongruence: 0.70,
        },
      },
    },
    archetypeRanking: {
      functional: "poor", regionalHolding: "partial", frontBack: "partial",
      matrix: "partial", productDivisional: "current", ambidextrous: "partial",
      platform: "poor", networked: "poor",
    },
    chosenArchetype: "productDivisional",
    pullQuote: {
      text: "The Win Strategy only wins if every division runs the same playbook with the same scoreboard.",
      attr: "— Parker Hannifin annual report language",
    },
    designRationaleHeadline: "Two segments, one playbook, one scoreboard.",
    designRationaleBody: "Consolidating NA and Intl Industrial under a single global Industrial president unifies the Win Strategy rollout. Merging CTO and CDO reflects the reality that digital and engineering are one capability, not two.",
  },

  honeywell: {
    key: "honeywell",
    company: "Honeywell",
    ticker: "HON",
    industry: "Manufacturing",
    cap: "large",
    headcount: 28000,
    strategicContext: {
      revenue: "~$37B",
      regions: "Global · ~60 countries",
      segments: "Aerospace · Industrial Automation · Building Automation · Energy & Sustainability",
      horizon: "36 months",
      ceoMandate: "Execute the planned separation into three independent public companies while maintaining operational excellence through split.",
      transformationFrom: "Four-segment industrial conglomerate",
      transformationTo: "Three independent public companies",
    },
    current: {
      archetype: "Segment Divisional",
      rootTitle: "Chair & CEO",
      rootSub: "Pre-separation",
      n1: [
        { title: "President, Aerospace",               fn: "commercial", sub: "Aero P&L",              span: 8, om: "core", warn: true },
        { title: "President, Industrial Automation",   fn: "commercial", sub: "Industrial P&L",        span: 7, om: "core" },
        { title: "President, Building Automation",     fn: "commercial", sub: "Building P&L",          span: 6, om: "core" },
        { title: "President, Energy & Sustainability", fn: "commercial", sub: "Energy P&L",            span: 6, om: "core" },
        { title: "Chief Operating Officer",            fn: "ops",        sub: "HOS · Ops",             span: 7, om: "shared" },
        { title: "Chief Financial Officer",            fn: "finance",    sub: "Finance · IR",          span: 7, om: "enable" },
        { title: "Chief Commercial Officer",           fn: "commercial", sub: "Enterprise Sales",      span: 5, om: "enable" },
        { title: "Chief Human Resources Officer",      fn: "hr",         sub: "People",                span: 5, om: "enable" },
        { title: "Chief Legal Officer",                fn: "legal",      sub: "Legal · Compliance",    span: 5, om: "shared" },
        { title: "Chief Technology Officer",           fn: "engineering", sub: "Technology",           span: 5, om: "shared" },
      ],
      diagnostics: { avgSpan: 6.1, layers: 8, duplicated: 18, mgrToIC: 5.6, gaAsPctRev: 13.8 },
    },
    future: {
      archetype: "Transition Holdco (pre-separation)",
      rootTitle: "Chair & CEO",
      rootSub: "Strategic Intent: Separation-ready",
      n1: [
        { title: "President & CEO, Aerospace NewCo",   fn: "exec",       sub: "Spin-ready P&L",        span: 9, om: "core", status: "new", note: "Full standalone leadership team preparing" },
        { title: "President & CEO, Automation NewCo",  fn: "exec",       sub: "Spin-ready P&L",        span: 9, om: "core", status: "new", note: "Industrial + Building combined spin" },
        { title: "President, Energy & Sustainability",  fn: "commercial", sub: "Remaining ParentCo",   span: 6, om: "core", status: "moved", note: "Remaining entity core" },
        { title: "Chief Separation Officer",           fn: "exec",       sub: "Separation Program",    span: 4, om: "enable", status: "new", note: "Named separation executive" },
        { title: "Chief Financial Officer",            fn: "finance",    sub: "Finance · IR",          span: 7, om: "enable" },
        { title: "Chief Operating Officer",            fn: "ops",        sub: "HOS · Ops",             span: 6, om: "shared" },
        { title: "Chief Human Resources Officer",      fn: "hr",         sub: "People · Separation",   span: 5, om: "enable" },
        { title: "Chief Legal Officer",                fn: "legal",      sub: "Legal · Separation",    span: 5, om: "shared" },
      ],
      diagnostics: { avgSpan: 6.4, layers: 7, duplicated: 8, mgrToIC: 5.8, gaAsPctRev: 11.2 },
    },
    positions: {
      current: {
        strategicClarity: 0.55, accountability: 0.72, designOrientation: 0.52,
        capabilityLocation: 0.62, decisionGeography: 0.58, layerEconomy: 0.38,
        functionalPosture: 0.62, sharedServices: 0.75, governanceSpeed: 0.48, cultureCongruence: 0.58,
      },
      future: {
        strategicClarity: 0.82, accountability: 0.85, designOrientation: 0.72,
        capabilityLocation: 0.78, decisionGeography: 0.58, layerEconomy: 0.62,
        functionalPosture: 0.72, sharedServices: 0.58, governanceSpeed: 0.65, cultureCongruence: 0.65,
      },
      market: MEDIAN_MFG,
      peer: {
        name: "GE post-split (peer)",
        positions: {
          strategicClarity: 0.82, accountability: 0.85, designOrientation: 0.78,
          capabilityLocation: 0.80, decisionGeography: 0.58, layerEconomy: 0.62,
          functionalPosture: 0.72, sharedServices: 0.42, governanceSpeed: 0.72, cultureCongruence: 0.70,
        },
      },
    },
    archetypeRanking: {
      functional: "poor", regionalHolding: "poor", frontBack: "partial",
      matrix: "poor", productDivisional: "current", ambidextrous: "partial",
      platform: "poor", networked: "partial",
    },
    chosenArchetype: "productDivisional",
    pullQuote: {
      text: "Conglomerate discount isn't a financial problem. It's a clarity problem. Separation is the cleanest answer.",
      attr: "— Jim Collins, Good to Great",
    },
    designRationaleHeadline: "Three companies, three scoreboards.",
    designRationaleBody: "The separation thesis requires standing up full CEO-ready teams for Aerospace and Automation NewCos now, while a dedicated Chief Separation Officer owns the transition program. Shared services unwind by design.",
  },

  // ────────────────────────────────────────────────────────────────────
  // CONSULTING / PROFESSIONAL SERVICES
  // ────────────────────────────────────────────────────────────────────

  huron: {
    key: "huron",
    company: "Huron Consulting Group",
    ticker: "HURN",
    industry: "Consulting",
    cap: "small",
    headcount: 2500,
    strategicContext: {
      revenue: "~$1.5B",
      regions: "US-led · select intl",
      segments: "Healthcare · Education · Commercial · Digital",
      horizon: "24 months",
      ceoMandate: "Lean into specialty depth (Healthcare + Higher Ed) while scaling Digital as the cross-cut accelerator.",
      transformationFrom: "Industry-segment firm",
      transformationTo: "Specialty + capability matrix",
    },
    current: {
      archetype: "Industry Divisional",
      rootTitle: "Chief Executive Officer",
      rootSub: "Industry-led",
      n1: [
        { title: "Managing Director, Healthcare",     fn: "commercial", sub: "Healthcare P&L",        span: 8, om: "core", warn: true },
        { title: "Managing Director, Education",      fn: "commercial", sub: "Higher Ed P&L",         span: 7, om: "core" },
        { title: "Managing Director, Commercial",     fn: "commercial", sub: "Commercial P&L",        span: 6, om: "core" },
        { title: "Managing Director, Digital",        fn: "digital",    sub: "Digital P&L",           span: 7, om: "core" },
        { title: "Chief Financial Officer",           fn: "finance",    sub: "Finance · IR",          span: 5, om: "enable" },
        { title: "Chief Human Resources Officer",     fn: "hr",         sub: "People",                span: 4, om: "enable" },
        { title: "General Counsel",                   fn: "legal",      sub: "Legal · Ethics",        span: 3, om: "shared" },
        { title: "Chief Marketing Officer",           fn: "marketing",  sub: "Brand · Demand",        span: 3, om: "enable" },
      ],
      diagnostics: { avgSpan: 5.4, layers: 6, duplicated: 8, mgrToIC: 4.2, gaAsPctRev: 18.2 },
    },
    future: {
      archetype: "Matrix (Industry × Capability)",
      rootTitle: "Chief Executive Officer",
      rootSub: "Strategic Intent: Specialty + capability matrix",
      n1: [
        { title: "Managing Director, Healthcare",     fn: "commercial", sub: "Healthcare P&L",        span: 7, om: "core" },
        { title: "Managing Director, Education",      fn: "commercial", sub: "Higher Ed P&L",         span: 6, om: "core" },
        { title: "Managing Director, Commercial",     fn: "commercial", sub: "Commercial P&L",        span: 5, om: "core" },
        { title: "Chief Digital Officer",             fn: "digital",    sub: "Digital Capability",    span: 6, om: "core", status: "moved", note: "Digital cross-cuts all industries" },
        { title: "Chief Strategy & Growth Officer",   fn: "exec",       sub: "Strategy · Matrix Ops", span: 3, om: "enable", status: "new", note: "Manages industry-capability interlock" },
        { title: "Chief Financial Officer",           fn: "finance",    sub: "Finance · IR",          span: 5, om: "enable" },
        { title: "Chief People Officer",              fn: "hr",         sub: "People · Practice Dev",  span: 4, om: "enable", status: "moved" },
        { title: "Chief Legal & Compliance Officer",  fn: "legal",      sub: "Legal · Ethics",        span: 3, om: "shared", status: "moved" },
        { title: "Chief Marketing Officer",           fn: "marketing",  sub: "Brand · Demand",        span: 3, om: "enable" },
      ],
      diagnostics: { avgSpan: 4.8, layers: 5, duplicated: 3, mgrToIC: 4.8, gaAsPctRev: 15.6 },
    },
    positions: {
      current: {
        strategicClarity: 0.68, accountability: 0.72, designOrientation: 0.68,
        capabilityLocation: 0.45, decisionGeography: 0.55, layerEconomy: 0.58,
        functionalPosture: 0.62, sharedServices: 0.48, governanceSpeed: 0.72, cultureCongruence: 0.78,
      },
      future: {
        strategicClarity: 0.82, accountability: 0.78, designOrientation: 0.82,
        capabilityLocation: 0.72, decisionGeography: 0.58, layerEconomy: 0.68,
        functionalPosture: 0.75, sharedServices: 0.62, governanceSpeed: 0.75, cultureCongruence: 0.80,
      },
      market: MEDIAN_CONSULTING,
      peer: {
        name: "ICF International (peer)",
        positions: {
          strategicClarity: 0.65, accountability: 0.70, designOrientation: 0.62,
          capabilityLocation: 0.55, decisionGeography: 0.62, layerEconomy: 0.55,
          functionalPosture: 0.65, sharedServices: 0.55, governanceSpeed: 0.60, cultureCongruence: 0.68,
        },
      },
    },
    archetypeRanking: {
      functional: "poor", regionalHolding: "poor", frontBack: "partial",
      matrix: "strong", productDivisional: "current", ambidextrous: "partial",
      platform: "partial", networked: "partial",
    },
    chosenArchetype: "matrix",
    pullQuote: {
      text: "In professional services, the scarcest asset is senior time. Structure should route it to the highest-value problems, whatever industry they're in.",
      attr: "— David Maister, Managing the Professional Service Firm",
    },
    designRationaleHeadline: "Industry depth, capability breadth.",
    designRationaleBody: "Matrix works in consulting when capabilities (Digital) can credibly sell into every industry P&L. Elevating Digital out of its own P&L into a cross-cutting capability fixes the Balkanization and deepens industry relationships.",
  },

  boozallen: {
    key: "boozallen",
    company: "Booz Allen Hamilton",
    ticker: "BAH",
    industry: "Consulting",
    cap: "mid",
    headcount: 15000,
    strategicContext: {
      revenue: "~$10.7B",
      regions: "US federal-led",
      segments: "Defense · Intelligence · Civil · Commercial",
      horizon: "36 months",
      ceoMandate: "Accelerate VoLT (Velocity · Leadership · Technology) — push AI-enabled delivery and commercial adjacencies while holding federal dominance.",
      transformationFrom: "Federal billable-hours model",
      transformationTo: "Capability-led delivery firm",
    },
    current: {
      archetype: "Account-led Federal",
      rootTitle: "Chief Executive Officer",
      rootSub: "VoLT transformation",
      n1: [
        { title: "President, Defense",                fn: "commercial", sub: "DoD Accounts",           span: 10, om: "core", warn: true },
        { title: "President, Intelligence",           fn: "commercial", sub: "IC Accounts",            span: 7, om: "core" },
        { title: "President, Civil",                  fn: "commercial", sub: "Federal Civilian",       span: 8, om: "core" },
        { title: "President, Commercial & Intl",      fn: "commercial", sub: "Non-federal",            span: 5, om: "core" },
        { title: "Chief Technology Officer",          fn: "engineering", sub: "AI · Platform",         span: 6, om: "core" },
        { title: "Chief Financial Officer",           fn: "finance",    sub: "Finance · IR",          span: 6, om: "enable" },
        { title: "Chief People Officer",              fn: "hr",         sub: "People · Clearance",    span: 5, om: "enable" },
        { title: "Chief Legal Officer",               fn: "legal",      sub: "Legal · Compliance",    span: 5, om: "shared" },
        { title: "Chief Operating Officer",           fn: "ops",        sub: "Ops · Delivery",        span: 6, om: "shared" },
      ],
      diagnostics: { avgSpan: 6.4, layers: 7, duplicated: 10, mgrToIC: 4.8, gaAsPctRev: 14.2 },
    },
    future: {
      archetype: "Front-Back (Accounts + Capability)",
      rootTitle: "Chief Executive Officer",
      rootSub: "Strategic Intent: Capability-led delivery",
      n1: [
        { title: "President, Defense",                fn: "commercial", sub: "DoD Accounts",           span: 8, om: "core" },
        { title: "President, Intelligence",           fn: "commercial", sub: "IC Accounts",            span: 6, om: "core" },
        { title: "President, Civil",                  fn: "commercial", sub: "Federal Civilian",       span: 7, om: "core" },
        { title: "President, Commercial & Intl",      fn: "commercial", sub: "Non-federal",            span: 5, om: "core" },
        { title: "Chief Capability Officer",          fn: "engineering", sub: "Capabilities P&L",      span: 7, om: "core", status: "new", note: "AI, Cyber, Data, Eng as a dedicated capability P&L" },
        { title: "Chief Technology Officer",          fn: "engineering", sub: "Platform · Research",   span: 5, om: "core" },
        { title: "Chief Financial Officer",           fn: "finance",    sub: "Finance · IR",          span: 6, om: "enable" },
        { title: "Chief People Officer",              fn: "hr",         sub: "People · Clearance",    span: 5, om: "enable" },
        { title: "Chief Legal & Compliance Officer",  fn: "legal",      sub: "Legal · Ethics",        span: 5, om: "shared", status: "moved" },
      ],
      diagnostics: { avgSpan: 6.0, layers: 6, duplicated: 4, mgrToIC: 5.4, gaAsPctRev: 12.4 },
    },
    positions: {
      current: {
        strategicClarity: 0.65, accountability: 0.78, designOrientation: 0.62,
        capabilityLocation: 0.48, decisionGeography: 0.52, layerEconomy: 0.48,
        functionalPosture: 0.65, sharedServices: 0.55, governanceSpeed: 0.55, cultureCongruence: 0.72,
      },
      future: {
        strategicClarity: 0.82, accountability: 0.82, designOrientation: 0.78,
        capabilityLocation: 0.72, decisionGeography: 0.55, layerEconomy: 0.62,
        functionalPosture: 0.72, sharedServices: 0.65, governanceSpeed: 0.65, cultureCongruence: 0.75,
      },
      market: MEDIAN_CONSULTING,
      peer: {
        name: "Leidos (peer)",
        positions: {
          strategicClarity: 0.65, accountability: 0.75, designOrientation: 0.58,
          capabilityLocation: 0.62, decisionGeography: 0.58, layerEconomy: 0.45,
          functionalPosture: 0.65, sharedServices: 0.62, governanceSpeed: 0.52, cultureCongruence: 0.65,
        },
      },
    },
    archetypeRanking: {
      functional: "poor", regionalHolding: "poor", frontBack: "strong",
      matrix: "partial", productDivisional: "current", ambidextrous: "partial",
      platform: "partial", networked: "partial",
    },
    chosenArchetype: "frontBack",
    pullQuote: {
      text: "Capability-led delivery is how professional-services firms escape the tyranny of billable hours.",
      attr: "— Booz Allen VoLT messaging (paraphrase)",
    },
    designRationaleHeadline: "Accounts in front, capabilities in back.",
    designRationaleBody: "A dedicated Capability P&L (AI, Cyber, Data, Engineering) sells across all account teams and protects the margin accretion VoLT promises. Account presidents stay close to clients; the capability engine scales horizontally.",
  },

  accenture: {
    key: "accenture",
    company: "Accenture",
    ticker: "ACN",
    industry: "Consulting",
    cap: "large",
    headcount: 35000,
    strategicContext: {
      revenue: "~$65B",
      regions: "Global · 120 countries",
      segments: "Strategy & Consulting · Technology · Operations · Industry X · Song",
      horizon: "36 months",
      ceoMandate: "Reinvent the firm around Gen-AI reinvention services while rebalancing pyramid economics amid softening demand.",
      transformationFrom: "Market × Service matrix",
      transformationTo: "Industry × Gen-AI capability matrix",
    },
    current: {
      archetype: "Matrix (Market × Service)",
      rootTitle: "Chair & CEO",
      rootSub: "Reinvention era",
      n1: [
        { title: "Group CEO, Americas",               fn: "commercial", sub: "Geo P&L",                span: 12, om: "core", warn: true },
        { title: "Group CEO, EMEA",                   fn: "commercial", sub: "Geo P&L",                span: 12, om: "core", warn: true },
        { title: "Group CEO, Asia Pacific",           fn: "commercial", sub: "Geo P&L",                span: 10, om: "core" },
        { title: "Group CEO, Strategy & Consulting",  fn: "commercial", sub: "Service P&L",            span: 8, om: "core" },
        { title: "Group CEO, Technology",             fn: "engineering", sub: "Service P&L",           span: 10, om: "core" },
        { title: "Group CEO, Operations",             fn: "ops",        sub: "Service P&L",            span: 7, om: "core" },
        { title: "Group CEO, Industry X",             fn: "engineering", sub: "Engineering Svcs",      span: 6, om: "core" },
        { title: "Group CEO, Song",                   fn: "marketing",  sub: "Experience Svcs",        span: 5, om: "core" },
        { title: "Chief Financial Officer",           fn: "finance",    sub: "Finance · IR",          span: 7, om: "enable" },
        { title: "Chief People Officer",              fn: "hr",         sub: "People · Talent",       span: 6, om: "enable" },
        { title: "Chief Legal Officer",               fn: "legal",      sub: "Legal · Compliance",    span: 5, om: "shared" },
      ],
      diagnostics: { avgSpan: 8.0, layers: 9, duplicated: 22, mgrToIC: 4.2, gaAsPctRev: 15.8 },
    },
    future: {
      archetype: "Matrix (Industry × Gen-AI capability)",
      rootTitle: "Chair & CEO",
      rootSub: "Strategic Intent: Gen-AI reinvention firm",
      n1: [
        { title: "CEO, Markets (Geo)",                fn: "commercial", sub: "Americas · EMEA · APAC", span: 9, om: "core", status: "new", note: "Three geo CEOs consolidated under one" },
        { title: "CEO, Industry Solutions",           fn: "commercial", sub: "Industry P&Ls",          span: 8, om: "core", status: "new", note: "Vertical industries elevated" },
        { title: "CEO, Gen-AI & Reinvention",         fn: "engineering", sub: "AI capability P&L",     span: 7, om: "core", status: "new", note: "Named AI service line" },
        { title: "CEO, Technology",                   fn: "engineering", sub: "Platform engineering",  span: 8, om: "core", status: "moved" },
        { title: "CEO, Operations",                   fn: "ops",        sub: "Managed services",      span: 7, om: "core", status: "moved" },
        { title: "CEO, Song",                         fn: "marketing",  sub: "Experience services",   span: 5, om: "core" },
        { title: "Chief Financial Officer",           fn: "finance",    sub: "Finance · IR",          span: 7, om: "enable" },
        { title: "Chief People Officer",              fn: "hr",         sub: "People · Talent",       span: 6, om: "enable" },
        { title: "Chief Legal & Compliance Officer",  fn: "legal",      sub: "Legal · Ethics · AI",   span: 5, om: "shared", status: "moved" },
      ],
      diagnostics: { avgSpan: 6.9, layers: 8, duplicated: 10, mgrToIC: 5.0, gaAsPctRev: 13.2 },
    },
    positions: {
      current: {
        strategicClarity: 0.55, accountability: 0.65, designOrientation: 0.62,
        capabilityLocation: 0.52, decisionGeography: 0.72, layerEconomy: 0.32,
        functionalPosture: 0.58, sharedServices: 0.55, governanceSpeed: 0.45, cultureCongruence: 0.62,
      },
      future: {
        strategicClarity: 0.80, accountability: 0.78, designOrientation: 0.82,
        capabilityLocation: 0.75, decisionGeography: 0.62, layerEconomy: 0.52,
        functionalPosture: 0.72, sharedServices: 0.70, governanceSpeed: 0.62, cultureCongruence: 0.68,
      },
      market: MEDIAN_CONSULTING,
      peer: {
        name: "Deloitte (peer)",
        positions: {
          strategicClarity: 0.65, accountability: 0.72, designOrientation: 0.68,
          capabilityLocation: 0.60, decisionGeography: 0.65, layerEconomy: 0.42,
          functionalPosture: 0.65, sharedServices: 0.62, governanceSpeed: 0.55, cultureCongruence: 0.70,
        },
      },
    },
    archetypeRanking: {
      functional: "poor", regionalHolding: "partial", frontBack: "partial",
      matrix: "current", productDivisional: "partial", ambidextrous: "partial",
      platform: "partial", networked: "partial",
    },
    chosenArchetype: "matrix",
    pullQuote: {
      text: "Matrix isn't wrong. It's just unforgiving — it punishes unclear decision rights more brutally than any other structure.",
      attr: "— Bartlett & Ghoshal, The Individualized Corporation",
    },
    designRationaleHeadline: "Collapse the geo triad, elevate industries and AI.",
    designRationaleBody: "Three geo CEOs created redundant layers. Consolidating Markets into one role and elevating Industry Solutions and a dedicated Gen-AI CEO puts the firm's reinvention narrative directly into the top-team structure.",
  },

  // ────────────────────────────────────────────────────────────────────
  // ENERGY
  // ────────────────────────────────────────────────────────────────────

  shoals: {
    key: "shoals",
    company: "Shoals Technologies",
    ticker: "SHLS",
    industry: "Energy",
    cap: "small",
    headcount: 1800,
    strategicContext: {
      revenue: "~$490M",
      regions: "US-led · Europe · LATAM",
      segments: "Utility Solar BOS · Commercial · EV Charging",
      horizon: "24 months",
      ceoMandate: "Defend utility-scale solar BOS market share while scaling EV-charging infrastructure as the second growth leg.",
      transformationFrom: "Single-product manufacturer",
      transformationTo: "Multi-line electrical infrastructure platform",
    },
    current: {
      archetype: "Functional product co",
      rootTitle: "Chief Executive Officer",
      rootSub: "Post-founder",
      n1: [
        { title: "Chief Operating Officer",           fn: "ops",        sub: "Mfg · Supply Chain",    span: 7, om: "core", warn: true },
        { title: "Chief Commercial Officer",          fn: "commercial", sub: "Sales · Solar",         span: 6, om: "core" },
        { title: "Chief Financial Officer",           fn: "finance",    sub: "Finance · IR",          span: 5, om: "enable" },
        { title: "Chief Technology Officer",          fn: "engineering", sub: "R&D · Product",        span: 4, om: "core" },
        { title: "General Counsel",                   fn: "legal",      sub: "Legal",                 span: 3, om: "shared" },
        { title: "Chief Human Resources Officer",     fn: "hr",         sub: "People",                span: 3, om: "enable" },
      ],
      diagnostics: { avgSpan: 4.7, layers: 5, duplicated: 2, mgrToIC: 8.2, gaAsPctRev: 17.8 },
    },
    future: {
      archetype: "Product Divisional",
      rootTitle: "Chief Executive Officer",
      rootSub: "Strategic Intent: Electrical infrastructure platform",
      n1: [
        { title: "President, Solar BOS",              fn: "commercial", sub: "Solar P&L",             span: 6, om: "core", status: "new" },
        { title: "President, EV Charging Infra",      fn: "commercial", sub: "EV P&L",                span: 5, om: "core", status: "new", note: "Second product line gets dedicated P&L" },
        { title: "Chief Operating Officer",           fn: "ops",        sub: "Shared Mfg Platform",   span: 6, om: "shared", status: "moved" },
        { title: "Chief Technology Officer",          fn: "engineering", sub: "R&D · Platform",       span: 5, om: "core" },
        { title: "Chief Financial Officer",           fn: "finance",    sub: "Finance · IR",          span: 5, om: "enable" },
        { title: "Chief Legal & Compliance Officer",  fn: "legal",      sub: "Legal · Trade",         span: 3, om: "shared", status: "moved" },
        { title: "Chief People Officer",              fn: "hr",         sub: "People",                span: 3, om: "enable" },
      ],
      diagnostics: { avgSpan: 4.7, layers: 5, duplicated: 1, mgrToIC: 8.8, gaAsPctRev: 15.2 },
    },
    positions: {
      current: {
        strategicClarity: 0.58, accountability: 0.58, designOrientation: 0.62,
        capabilityLocation: 0.50, decisionGeography: 0.45, layerEconomy: 0.70,
        functionalPosture: 0.60, sharedServices: 0.55, governanceSpeed: 0.68, cultureCongruence: 0.65,
      },
      future: {
        strategicClarity: 0.80, accountability: 0.80, designOrientation: 0.75,
        capabilityLocation: 0.72, decisionGeography: 0.55, layerEconomy: 0.72,
        functionalPosture: 0.68, sharedServices: 0.75, governanceSpeed: 0.72, cultureCongruence: 0.70,
      },
      market: MEDIAN_ENERGY,
      peer: {
        name: "Array Technologies (peer)",
        positions: {
          strategicClarity: 0.55, accountability: 0.62, designOrientation: 0.58,
          capabilityLocation: 0.55, decisionGeography: 0.52, layerEconomy: 0.58,
          functionalPosture: 0.60, sharedServices: 0.62, governanceSpeed: 0.55, cultureCongruence: 0.58,
        },
      },
    },
    archetypeRanking: {
      functional: "current", regionalHolding: "poor", frontBack: "partial",
      matrix: "poor", productDivisional: "strong", ambidextrous: "partial",
      platform: "partial", networked: "poor",
    },
    chosenArchetype: "productDivisional",
    pullQuote: {
      text: "Second product lines die in product-led companies when they can't get out from under the first product's gravitational pull.",
      attr: "— Geoffrey Moore, Crossing the Chasm",
    },
    designRationaleHeadline: "Two products, two owners, shared plant.",
    designRationaleBody: "Dedicated presidents for Solar BOS and EV Charging force clear investment and GTM bets per product line, while the shared manufacturing platform protects scale economics.",
  },

  chesapeake: {
    key: "chesapeake",
    company: "Chesapeake Energy (Expand Energy)",
    ticker: "EXE",
    industry: "Energy",
    cap: "mid",
    headcount: 8000,
    strategicContext: {
      revenue: "~$6.5B",
      regions: "US shale · Marcellus · Haynesville",
      segments: "Natural Gas E&P · LNG-exposed",
      horizon: "24 months",
      ceoMandate: "Integrate Southwestern into Expand Energy, run as the premier US natural gas pure-play, and stay disciplined on capital.",
      transformationFrom: "Post-bankruptcy E&P",
      transformationTo: "Integrated LNG-aligned gas leader",
    },
    current: {
      archetype: "Basin Divisional",
      rootTitle: "President & CEO",
      rootSub: "Post-merger integration",
      n1: [
        { title: "Chief Operating Officer",           fn: "ops",        sub: "Ops · Basins",          span: 9, om: "core", warn: true },
        { title: "Chief Financial Officer",           fn: "finance",    sub: "Finance · IR",          span: 6, om: "enable" },
        { title: "Chief Commercial Officer",          fn: "commercial", sub: "Marketing · Midstream", span: 5, om: "core" },
        { title: "Chief Strategy Officer",            fn: "exec",       sub: "Strategy · Corp Dev",   span: 3, om: "enable" },
        { title: "General Counsel",                   fn: "legal",      sub: "Legal · Regulatory",    span: 4, om: "shared" },
        { title: "Chief Human Resources Officer",     fn: "hr",         sub: "People · Integration",  span: 4, om: "enable" },
        { title: "Chief Information Officer",         fn: "engineering", sub: "IT · Digital",         span: 3, om: "shared" },
        { title: "Chief Sustainability Officer",      fn: "legal",      sub: "ESG · Methane",         span: 2, om: "shared" },
      ],
      diagnostics: { avgSpan: 4.5, layers: 6, duplicated: 9, mgrToIC: 8.8, gaAsPctRev: 11.4 },
    },
    future: {
      archetype: "Basin Divisional (integrated)",
      rootTitle: "President & CEO",
      rootSub: "Strategic Intent: LNG-aligned gas leader",
      n1: [
        { title: "President, Appalachia Basin",       fn: "ops",        sub: "Marcellus P&L",         span: 5, om: "core", status: "new", note: "Basin-level P&L accountability" },
        { title: "President, Haynesville Basin",      fn: "ops",        sub: "Haynesville P&L · LNG", span: 5, om: "core", status: "new" },
        { title: "Chief Commercial Officer",          fn: "commercial", sub: "Mktg · Midstream · LNG", span: 5, om: "core", status: "moved" },
        { title: "Chief Financial Officer",           fn: "finance",    sub: "Finance · IR",          span: 6, om: "enable" },
        { title: "Chief Technology & Digital Officer", fn: "engineering", sub: "Digital ops · AI",    span: 4, om: "shared", status: "moved" },
        { title: "Chief Sustainability Officer",      fn: "legal",      sub: "ESG · Methane · Carbon", span: 3, om: "shared", status: "moved", note: "Mandatory for LNG export approval" },
        { title: "Chief Legal & Compliance Officer",  fn: "legal",      sub: "Legal · Regulatory",    span: 4, om: "shared", status: "moved" },
        { title: "Chief People Officer",              fn: "hr",         sub: "People",                span: 4, om: "enable" },
      ],
      diagnostics: { avgSpan: 4.5, layers: 5, duplicated: 3, mgrToIC: 9.2, gaAsPctRev: 9.8 },
    },
    positions: {
      current: {
        strategicClarity: 0.55, accountability: 0.62, designOrientation: 0.42,
        capabilityLocation: 0.55, decisionGeography: 0.65, layerEconomy: 0.42,
        functionalPosture: 0.58, sharedServices: 0.55, governanceSpeed: 0.48, cultureCongruence: 0.52,
      },
      future: {
        strategicClarity: 0.80, accountability: 0.80, designOrientation: 0.62,
        capabilityLocation: 0.72, decisionGeography: 0.72, layerEconomy: 0.58,
        functionalPosture: 0.68, sharedServices: 0.72, governanceSpeed: 0.62, cultureCongruence: 0.65,
      },
      market: MEDIAN_ENERGY,
      peer: {
        name: "EQT (peer)",
        positions: {
          strategicClarity: 0.65, accountability: 0.72, designOrientation: 0.48,
          capabilityLocation: 0.65, decisionGeography: 0.65, layerEconomy: 0.48,
          functionalPosture: 0.62, sharedServices: 0.65, governanceSpeed: 0.52, cultureCongruence: 0.60,
        },
      },
    },
    archetypeRanking: {
      functional: "partial", regionalHolding: "partial", frontBack: "poor",
      matrix: "poor", productDivisional: "current", ambidextrous: "poor",
      platform: "poor", networked: "poor",
    },
    chosenArchetype: "productDivisional",
    pullQuote: {
      text: "In commodity businesses, organization design is cost structure — every layer has to earn its keep in $/bbl.",
      attr: "— Naomi Stanford, Guide to Organization Design",
    },
    designRationaleHeadline: "Basin P&Ls, central capital allocator.",
    designRationaleBody: "Basin-level P&L ownership forces operational accountability for the Expand Energy thesis. A strengthened Chief Sustainability Officer isn't ESG cosmetic — it's the seat that protects LNG export permit pathways.",
  },

  bakerhughes: {
    key: "bakerhughes",
    company: "Baker Hughes",
    ticker: "BKR",
    industry: "Energy",
    cap: "large",
    headcount: 25000,
    strategicContext: {
      revenue: "~$27B",
      regions: "Global · 120 countries",
      segments: "Oilfield Services & Equipment · Industrial & Energy Tech",
      horizon: "36 months",
      ceoMandate: "Run the two-segment firm like two real businesses — IET as growth, OFSE as cash — and lead the energy transition technology stack.",
      transformationFrom: "Integrated oilfield firm",
      transformationTo: "Two-segment: cash-generative OFSE + growth IET",
    },
    current: {
      archetype: "Two-Segment Divisional",
      rootTitle: "Chair & CEO",
      rootSub: "Post-GE",
      n1: [
        { title: "Executive Vice President, OFSE",    fn: "commercial", sub: "Oilfield Svcs & Equip", span: 9, om: "core", warn: true },
        { title: "Executive Vice President, IET",     fn: "commercial", sub: "Industrial & Energy Tech", span: 8, om: "core" },
        { title: "Chief Financial Officer",           fn: "finance",    sub: "Finance · IR",          span: 7, om: "enable" },
        { title: "Chief Operating Officer",           fn: "ops",        sub: "Ops · Lean",            span: 6, om: "shared" },
        { title: "Chief Technology Officer",          fn: "engineering", sub: "Technology · Digital", span: 5, om: "shared" },
        { title: "Chief Commercial Officer",          fn: "commercial", sub: "Enterprise GTM",        span: 5, om: "enable" },
        { title: "Chief Human Resources Officer",     fn: "hr",         sub: "People",                span: 5, om: "enable" },
        { title: "Chief Legal Officer",               fn: "legal",      sub: "Legal · Compliance",    span: 5, om: "shared" },
        { title: "Chief Sustainability Officer",      fn: "legal",      sub: "ESG · Transition",      span: 3, om: "shared" },
      ],
      diagnostics: { avgSpan: 5.9, layers: 7, duplicated: 14, mgrToIC: 6.8, gaAsPctRev: 13.8 },
    },
    future: {
      archetype: "Ambidextrous (OFSE + IET with separate cadences)",
      rootTitle: "Chair & CEO",
      rootSub: "Strategic Intent: Two real businesses",
      n1: [
        { title: "CEO, OFSE",                         fn: "exec",       sub: "Cash-engine P&L",       span: 7, om: "core", status: "moved", note: "OFSE runs as a managed-for-cash business" },
        { title: "CEO, IET",                          fn: "exec",       sub: "Growth P&L",            span: 7, om: "core", status: "moved", note: "IET runs as a growth-oriented tech business" },
        { title: "Chief Financial Officer",           fn: "finance",    sub: "Finance · IR",          span: 7, om: "enable" },
        { title: "Chief Technology Officer",          fn: "engineering", sub: "Digital · AI · Transition", span: 5, om: "core", status: "moved", note: "CTO elevated; digital cross-cuts both segments" },
        { title: "Chief Sustainability Officer",      fn: "legal",      sub: "Energy Transition",     span: 4, om: "shared", status: "moved" },
        { title: "Chief Human Resources Officer",     fn: "hr",         sub: "People",                span: 5, om: "enable" },
        { title: "Chief Legal & Compliance Officer",  fn: "legal",      sub: "Legal · Trade · Compliance", span: 5, om: "shared", status: "moved" },
      ],
      diagnostics: { avgSpan: 5.7, layers: 6, duplicated: 6, mgrToIC: 7.4, gaAsPctRev: 11.2 },
    },
    positions: {
      current: {
        strategicClarity: 0.55, accountability: 0.68, designOrientation: 0.45,
        capabilityLocation: 0.62, decisionGeography: 0.58, layerEconomy: 0.42,
        functionalPosture: 0.60, sharedServices: 0.65, governanceSpeed: 0.45, cultureCongruence: 0.55,
      },
      future: {
        strategicClarity: 0.82, accountability: 0.82, designOrientation: 0.68,
        capabilityLocation: 0.78, decisionGeography: 0.62, layerEconomy: 0.58,
        functionalPosture: 0.70, sharedServices: 0.72, governanceSpeed: 0.62, cultureCongruence: 0.65,
      },
      market: MEDIAN_ENERGY,
      peer: {
        name: "SLB (peer)",
        positions: {
          strategicClarity: 0.68, accountability: 0.75, designOrientation: 0.55,
          capabilityLocation: 0.70, decisionGeography: 0.62, layerEconomy: 0.48,
          functionalPosture: 0.65, sharedServices: 0.70, governanceSpeed: 0.55, cultureCongruence: 0.62,
        },
      },
    },
    archetypeRanking: {
      functional: "poor", regionalHolding: "partial", frontBack: "partial",
      matrix: "partial", productDivisional: "current", ambidextrous: "strong",
      platform: "partial", networked: "poor",
    },
    chosenArchetype: "ambidextrous",
    pullQuote: {
      text: "Different clockspeeds need different leaders, different metrics, and honestly, different board conversations.",
      attr: "— Charles A. O'Reilly, Lead and Disrupt",
    },
    designRationaleHeadline: "Cash engine and growth engine, each on their own clock.",
    designRationaleBody: "Naming OFSE and IET each with their own CEO — not EVP — signals the board and the market that these are two businesses under one roof, with matching leadership tenure, KPIs, and capital allocation rhythms.",
  },

  // ────────────────────────────────────────────────────────────────────
  // AEROSPACE / DEFENSE
  // ────────────────────────────────────────────────────────────────────

  kratos: {
    key: "kratos",
    company: "Kratos Defense & Security",
    ticker: "KTOS",
    industry: "Aerospace & Defense",
    cap: "small",
    headcount: 4000,
    strategicContext: {
      revenue: "~$1.1B",
      regions: "US-led · select allies",
      segments: "Unmanned Systems · Space · Training · Missile Defense",
      horizon: "24 months",
      ceoMandate: "Scale Valkyrie and tactical UAS production into real program-of-record revenue while defending margin in Space and Training.",
      transformationFrom: "Diversified small-cap defense",
      transformationTo: "Unmanned-systems-led defense tech firm",
    },
    current: {
      archetype: "Divisional (4 small businesses)",
      rootTitle: "President & CEO",
      rootSub: "Founder-era",
      n1: [
        { title: "President, Unmanned Systems",       fn: "commercial", sub: "UAS · Valkyrie",        span: 6, om: "core", warn: true },
        { title: "President, Space & Satellite",      fn: "commercial", sub: "Space · C4",            span: 5, om: "core" },
        { title: "President, Training Solutions",     fn: "commercial", sub: "Training · Sim",        span: 5, om: "core" },
        { title: "President, Kratos Defense Rocket",  fn: "commercial", sub: "Missile · Propulsion",  span: 4, om: "core" },
        { title: "Chief Financial Officer",           fn: "finance",    sub: "Finance · IR",          span: 5, om: "enable" },
        { title: "General Counsel",                   fn: "legal",      sub: "Legal · Contracts",     span: 3, om: "shared" },
        { title: "Chief Human Resources Officer",     fn: "hr",         sub: "People · Clearance",    span: 3, om: "enable" },
      ],
      diagnostics: { avgSpan: 4.4, layers: 6, duplicated: 7, mgrToIC: 6.8, gaAsPctRev: 16.8 },
    },
    future: {
      archetype: "Focused Divisional (UAS-led)",
      rootTitle: "President & CEO",
      rootSub: "Strategic Intent: Unmanned-systems-led",
      n1: [
        { title: "President, Unmanned Systems",       fn: "commercial", sub: "UAS P&L · Production scale", span: 7, om: "core", status: "moved", note: "UAS is the headline; production capacity is the scarce capability" },
        { title: "President, Space & Missile Systems", fn: "commercial", sub: "Space + Missile consolidated", span: 6, om: "core", status: "new", note: "Space and Rocket combined" },
        { title: "President, Training Solutions",     fn: "commercial", sub: "Training · Sim",        span: 5, om: "core" },
        { title: "Chief Technology Officer",          fn: "engineering", sub: "AI · Autonomy · Platform", span: 4, om: "core", status: "new", note: "Autonomy as cross-cut capability" },
        { title: "Chief Financial Officer",           fn: "finance",    sub: "Finance · IR",          span: 5, om: "enable" },
        { title: "Chief Legal & Compliance Officer",  fn: "legal",      sub: "Legal · Contracts · Export", span: 4, om: "shared", status: "moved" },
        { title: "Chief People Officer",              fn: "hr",         sub: "People · Clearance",    span: 3, om: "enable" },
      ],
      diagnostics: { avgSpan: 4.9, layers: 5, duplicated: 3, mgrToIC: 7.2, gaAsPctRev: 13.8 },
    },
    positions: {
      current: {
        strategicClarity: 0.58, accountability: 0.72, designOrientation: 0.48,
        capabilityLocation: 0.55, decisionGeography: 0.45, layerEconomy: 0.55,
        functionalPosture: 0.62, sharedServices: 0.55, governanceSpeed: 0.62, cultureCongruence: 0.65,
      },
      future: {
        strategicClarity: 0.82, accountability: 0.82, designOrientation: 0.65,
        capabilityLocation: 0.72, decisionGeography: 0.48, layerEconomy: 0.72,
        functionalPosture: 0.70, sharedServices: 0.62, governanceSpeed: 0.75, cultureCongruence: 0.72,
      },
      market: MEDIAN_AERO,
      peer: {
        name: "AeroVironment (peer)",
        positions: {
          strategicClarity: 0.72, accountability: 0.75, designOrientation: 0.58,
          capabilityLocation: 0.60, decisionGeography: 0.48, layerEconomy: 0.72,
          functionalPosture: 0.65, sharedServices: 0.55, governanceSpeed: 0.68, cultureCongruence: 0.70,
        },
      },
    },
    archetypeRanking: {
      functional: "poor", regionalHolding: "poor", frontBack: "partial",
      matrix: "partial", productDivisional: "current", ambidextrous: "partial",
      platform: "poor", networked: "partial",
    },
    chosenArchetype: "productDivisional",
    pullQuote: {
      text: "Portfolio logic wins at peace. Focus wins at war — or anywhere the market is shifting faster than the org chart.",
      attr: "— Geoffrey Moore, Zone to Win",
    },
    designRationaleHeadline: "Bet the firm on unmanned.",
    designRationaleBody: "Consolidating Space and Missile into one division, elevating a dedicated CTO for autonomy, and protecting UAS with named production capacity forces the firm's most credible growth vector into the center of the operating rhythm.",
  },

  l3harris: {
    key: "l3harris",
    company: "L3Harris Technologies",
    ticker: "LHX",
    industry: "Aerospace & Defense",
    cap: "mid",
    headcount: 17000,
    strategicContext: {
      revenue: "~$21B",
      regions: "Global · US-led",
      segments: "Space & Airborne · Integrated Mission · Communication · Aerojet Rocketdyne",
      horizon: "36 months",
      ceoMandate: "Integrate Aerojet Rocketdyne, deliver on Trusted Disruptor thesis, and capture the space and tactical communications cycle.",
      transformationFrom: "Merger-assembled defense firm",
      transformationTo: "Trusted Disruptor: speed + mission focus",
    },
    current: {
      archetype: "Four-Segment Divisional",
      rootTitle: "Chair & CEO",
      rootSub: "Post-Aerojet integration",
      n1: [
        { title: "President, Space & Airborne Systems", fn: "commercial", sub: "Space · Air",         span: 7, om: "core", warn: true },
        { title: "President, Integrated Mission Systems", fn: "commercial", sub: "IMS",                span: 7, om: "core" },
        { title: "President, Communication Systems",  fn: "commercial", sub: "Comms",                 span: 6, om: "core" },
        { title: "President, Aerojet Rocketdyne",     fn: "commercial", sub: "Propulsion · Missiles", span: 6, om: "core" },
        { title: "Chief Operating Officer",           fn: "ops",        sub: "Ops · Integration",     span: 6, om: "shared" },
        { title: "Chief Financial Officer",           fn: "finance",    sub: "Finance · IR",          span: 6, om: "enable" },
        { title: "Chief Technology Officer",          fn: "engineering", sub: "Technology · R&D",     span: 5, om: "shared" },
        { title: "Chief Human Resources Officer",     fn: "hr",         sub: "People · Clearance",    span: 5, om: "enable" },
        { title: "Chief Legal Officer",               fn: "legal",      sub: "Legal · Contracts",     span: 5, om: "shared" },
      ],
      diagnostics: { avgSpan: 5.9, layers: 7, duplicated: 13, mgrToIC: 5.8, gaAsPctRev: 12.4 },
    },
    future: {
      archetype: "Mission-Centered Divisional",
      rootTitle: "Chair & CEO",
      rootSub: "Strategic Intent: Trusted Disruptor at scale",
      n1: [
        { title: "President, Space Systems",          fn: "commercial", sub: "Space P&L",             span: 6, om: "core", status: "new", note: "Space elevated out of combined S&A" },
        { title: "President, Airborne & Mission Systems", fn: "commercial", sub: "Air + IMS combined", span: 7, om: "core", status: "new" },
        { title: "President, Communication Systems",  fn: "commercial", sub: "Tactical Comms",        span: 6, om: "core" },
        { title: "President, Aerojet Rocketdyne",     fn: "commercial", sub: "Propulsion",            span: 6, om: "core" },
        { title: "Chief Growth Officer",              fn: "commercial", sub: "Enterprise GTM · Intl", span: 4, om: "enable", status: "new", note: "Cross-segment growth and intl" },
        { title: "Chief Financial Officer",           fn: "finance",    sub: "Finance · IR",          span: 6, om: "enable" },
        { title: "Chief Technology Officer",          fn: "engineering", sub: "R&D · AI · Autonomy",  span: 5, om: "shared", status: "moved" },
        { title: "Chief Operating Officer",           fn: "ops",        sub: "Ops · Integration",     span: 6, om: "shared" },
        { title: "Chief Legal & Compliance Officer",  fn: "legal",      sub: "Legal · Export",        span: 5, om: "shared", status: "moved" },
        { title: "Chief People Officer",              fn: "hr",         sub: "People · Clearance",    span: 5, om: "enable" },
      ],
      diagnostics: { avgSpan: 5.6, layers: 7, duplicated: 6, mgrToIC: 6.2, gaAsPctRev: 10.8 },
    },
    positions: {
      current: {
        strategicClarity: 0.58, accountability: 0.78, designOrientation: 0.52,
        capabilityLocation: 0.65, decisionGeography: 0.48, layerEconomy: 0.42,
        functionalPosture: 0.68, sharedServices: 0.65, governanceSpeed: 0.48, cultureCongruence: 0.62,
      },
      future: {
        strategicClarity: 0.80, accountability: 0.82, designOrientation: 0.72,
        capabilityLocation: 0.78, decisionGeography: 0.55, layerEconomy: 0.58,
        functionalPosture: 0.75, sharedServices: 0.75, governanceSpeed: 0.68, cultureCongruence: 0.72,
      },
      market: MEDIAN_AERO,
      peer: {
        name: "Leidos (peer)",
        positions: {
          strategicClarity: 0.68, accountability: 0.78, designOrientation: 0.58,
          capabilityLocation: 0.68, decisionGeography: 0.58, layerEconomy: 0.48,
          functionalPosture: 0.68, sharedServices: 0.68, governanceSpeed: 0.52, cultureCongruence: 0.65,
        },
      },
    },
    archetypeRanking: {
      functional: "poor", regionalHolding: "poor", frontBack: "partial",
      matrix: "partial", productDivisional: "current", ambidextrous: "partial",
      platform: "partial", networked: "poor",
    },
    chosenArchetype: "productDivisional",
    pullQuote: {
      text: "Trusted Disruptor is a thesis — it shows up in speed of decisions, not speed of slogans.",
      attr: "— L3Harris investor day language (paraphrase)",
    },
    designRationaleHeadline: "Elevate Space, unify Air+Mission, add a growth engine.",
    designRationaleBody: "Space deserves a dedicated president as the market's highest-growth defense vertical. A Chief Growth Officer gives the firm a single seat accountable for Trusted Disruptor velocity across segments and international expansion.",
  },

  northrop: {
    key: "northrop",
    company: "Northrop Grumman",
    ticker: "NOC",
    industry: "Aerospace & Defense",
    cap: "large",
    headcount: 33000,
    strategicContext: {
      revenue: "~$41B",
      regions: "Global · US-led",
      segments: "Aeronautics · Defense Systems · Mission Systems · Space Systems",
      horizon: "36 months",
      ceoMandate: "Execute B-21 to program maturity, scale Sentinel and next-gen space architectures, and tighten cost discipline across the portfolio.",
      transformationFrom: "Four-sector defense prime",
      transformationTo: "Program-of-record focused prime",
    },
    current: {
      archetype: "Four-Sector Divisional",
      rootTitle: "Chair & CEO",
      rootSub: "Program-execution era",
      n1: [
        { title: "President, Aeronautics Systems",    fn: "commercial", sub: "B-21 · NGAD · E-7",     span: 8, om: "core", warn: true },
        { title: "President, Defense Systems",        fn: "commercial", sub: "Sentinel · Missile",    span: 7, om: "core", warn: true },
        { title: "President, Mission Systems",        fn: "commercial", sub: "C4ISR · Cyber · Radar", span: 8, om: "core" },
        { title: "President, Space Systems",          fn: "commercial", sub: "Space Arch · SDA",      span: 7, om: "core" },
        { title: "Chief Operating Officer",           fn: "ops",        sub: "Ops · Programs",        span: 7, om: "shared" },
        { title: "Chief Financial Officer",           fn: "finance",    sub: "Finance · IR",          span: 7, om: "enable" },
        { title: "Chief Technology Officer",          fn: "engineering", sub: "Technology · R&D",     span: 6, om: "shared" },
        { title: "Chief Information Officer",         fn: "engineering", sub: "IT · Digital",         span: 5, om: "shared" },
        { title: "Chief Human Resources Officer",     fn: "hr",         sub: "People · Clearance",    span: 6, om: "enable" },
        { title: "Chief Legal Officer",               fn: "legal",      sub: "Legal · Compliance",    span: 5, om: "shared" },
        { title: "Chief Strategy Officer",            fn: "exec",       sub: "Strategy · Corp Dev",   span: 3, om: "enable" },
      ],
      diagnostics: { avgSpan: 6.3, layers: 9, duplicated: 20, mgrToIC: 4.6, gaAsPctRev: 11.8 },
    },
    future: {
      archetype: "Program-Centered Divisional",
      rootTitle: "Chair & CEO",
      rootSub: "Strategic Intent: Program excellence at scale",
      n1: [
        { title: "President, Aeronautics Systems",    fn: "commercial", sub: "B-21 · NGAD",           span: 7, om: "core" },
        { title: "President, Defense Systems",        fn: "commercial", sub: "Sentinel · Missile",    span: 6, om: "core" },
        { title: "President, Mission Systems",        fn: "commercial", sub: "C4ISR · Cyber",         span: 7, om: "core" },
        { title: "President, Space Systems",          fn: "commercial", sub: "Space Arch · SDA",      span: 7, om: "core" },
        { title: "Chief Program Excellence Officer",  fn: "ops",        sub: "Program delivery",      span: 5, om: "enable", status: "new", note: "Single seat accountable for cross-sector program EAC discipline" },
        { title: "Chief Financial Officer",           fn: "finance",    sub: "Finance · IR",          span: 7, om: "enable" },
        { title: "Chief Technology & Digital Officer", fn: "engineering", sub: "R&D · AI · Digital",  span: 6, om: "shared", status: "moved", note: "CTO + CIO merged" },
        { title: "Chief Human Resources Officer",     fn: "hr",         sub: "People · Clearance",    span: 6, om: "enable" },
        { title: "Chief Legal & Compliance Officer",  fn: "legal",      sub: "Legal · Export",        span: 5, om: "shared", status: "moved" },
        { title: "Chief Strategy Officer",            fn: "exec",       sub: "Strategy · Corp Dev",   span: 3, om: "enable" },
      ],
      diagnostics: { avgSpan: 5.9, layers: 8, duplicated: 8, mgrToIC: 5.2, gaAsPctRev: 10.2 },
    },
    positions: {
      current: {
        strategicClarity: 0.62, accountability: 0.82, designOrientation: 0.48,
        capabilityLocation: 0.72, decisionGeography: 0.45, layerEconomy: 0.35,
        functionalPosture: 0.68, sharedServices: 0.68, governanceSpeed: 0.42, cultureCongruence: 0.58,
      },
      future: {
        strategicClarity: 0.82, accountability: 0.88, designOrientation: 0.65,
        capabilityLocation: 0.80, decisionGeography: 0.48, layerEconomy: 0.52,
        functionalPosture: 0.75, sharedServices: 0.78, governanceSpeed: 0.58, cultureCongruence: 0.65,
      },
      market: MEDIAN_AERO,
      peer: {
        name: "Lockheed Martin (peer)",
        positions: {
          strategicClarity: 0.75, accountability: 0.85, designOrientation: 0.58,
          capabilityLocation: 0.78, decisionGeography: 0.52, layerEconomy: 0.42,
          functionalPosture: 0.72, sharedServices: 0.75, governanceSpeed: 0.48, cultureCongruence: 0.62,
        },
      },
    },
    archetypeRanking: {
      functional: "poor", regionalHolding: "poor", frontBack: "partial",
      matrix: "partial", productDivisional: "current", ambidextrous: "poor",
      platform: "partial", networked: "poor",
    },
    chosenArchetype: "productDivisional",
    pullQuote: {
      text: "In program-of-record businesses, the EAC discipline is the culture. The organization either enables it or hides from it.",
      attr: "— Clayton Christensen, The Innovator's Dilemma",
    },
    designRationaleHeadline: "Four sectors, one program engine.",
    designRationaleBody: "A Chief Program Excellence Officer cross-cuts all four sectors to own EAC discipline, a known weakness on B-21 and Sentinel. Merging CTO and CIO recognizes digital engineering as one capability, not two org charts.",
  },

};  // End SANDBOX_PROFILES

// ────────────────────────────────────────────────────────────────────────
// Helper: get profile by key
// ────────────────────────────────────────────────────────────────────────

export function getProfile(key: string): SandboxProfile | null {
  return SANDBOX_PROFILES[key.toLowerCase()] ?? null;
}

export function getAllProfiles(): SandboxProfile[] {
  return Object.values(SANDBOX_PROFILES);
}

export function getProfilesByIndustry(industry: string): SandboxProfile[] {
  return getAllProfiles().filter(p => p.industry === industry);
}
