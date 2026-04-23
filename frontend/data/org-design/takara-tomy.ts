export interface OrgRole {
  id: string;
  title: string;
  sub: string;
  span: number;
  fn: string;
  om: 'core' | 'enable' | 'shared';
  status: 'new' | 'moved' | 'eliminated' | null;
  note?: string;
  warn?: boolean;
  children?: OrgRole[];
}

export interface OrgState {
  root: OrgRole;
  n1: OrgRole[];
}

export const takaraTomy = {
  client: "Takara Tomy International",
  strategicContext: {
    revenue: "$2.1B",
    headcount: "1,840",
    regions: "3 → 4",
    brands: "7 → 1",
    horizon: "18 months",
    cap: "Mid-cap",
    ceoMandate: "Compete as an enterprise, not a portfolio of brands.",
  },
  states: {
    current: {
      root: {
        id: 'c-root',
        title: 'Chairman & President',
        sub: 'Office of the Chairman',
        span: 10,
        fn: 'exec',
        om: 'core' as const,
        status: null,
      },
      n1: [
        { id: 'c-coo', title: 'Chief Operating Officer', sub: 'Operations & Supply Chain', span: 6, fn: 'ops', om: 'core' as const, status: null,
          children: [
            { id: 'c-coo-1', title: 'VP Supply Chain', sub: 'Global Logistics', span: 4, fn: 'ops', om: 'core' as const, status: null },
            { id: 'c-coo-2', title: 'Director Manufacturing', sub: 'APAC Plants', span: 3, fn: 'ops', om: 'core' as const, status: null },
            { id: 'c-coo-3', title: 'Director Quality', sub: 'QA & Compliance', span: 2, fn: 'ops', om: 'enable' as const, status: null },
          ],
        },
        { id: 'c-svpbit', title: 'Senior VP Business IT Solutions', sub: 'Technology & Digital', span: 5, fn: 'digital', om: 'enable' as const, status: null,
          children: [
            { id: 'c-svpbit-1', title: 'Director Enterprise Systems', sub: 'ERP & Infrastructure', span: 4, fn: 'digital', om: 'enable' as const, status: null },
            { id: 'c-svpbit-2', title: 'Director Digital Products', sub: 'E-commerce & Apps', span: 3, fn: 'digital', om: 'core' as const, status: null },
          ],
        },
        { id: 'c-controller', title: 'Corporate Controller', sub: 'Finance & Accounting', span: 4, fn: 'finance', om: 'enable' as const, status: null,
          children: [
            { id: 'c-ctrl-1', title: 'Director FP&A', sub: 'Financial Planning', span: 3, fn: 'finance', om: 'enable' as const, status: null },
            { id: 'c-ctrl-2', title: 'Director Accounting', sub: 'GL & Reporting', span: 4, fn: 'finance', om: 'shared' as const, status: null },
          ],
        },
        { id: 'c-vpsales', title: 'VP Sales (TRU)', sub: 'Toys R Us Channel', span: 3, fn: 'commercial', om: 'core' as const, status: null },
        { id: 'c-svpmit', title: 'Senior VP MIT Brands', sub: 'Brand Portfolio Management', span: 7, fn: 'brand', om: 'core' as const, status: null, warn: true,
          children: [
            { id: 'c-svpmit-1', title: 'Director Transformers', sub: 'Brand P&L', span: 5, fn: 'brand', om: 'core' as const, status: null },
            { id: 'c-svpmit-2', title: 'Director Nerf', sub: 'Brand P&L', span: 4, fn: 'brand', om: 'core' as const, status: null },
            { id: 'c-svpmit-3', title: 'Director Play-Doh', sub: 'Brand P&L', span: 3, fn: 'brand', om: 'core' as const, status: null },
          ],
        },
        { id: 'c-vptoys', title: 'VP Toys', sub: 'Toy Category Management', span: 4, fn: 'brand', om: 'core' as const, status: null },
        { id: 'c-legal', title: 'Officer Legal & Corporate Governance', sub: 'Legal, IP & Compliance', span: 3, fn: 'legal', om: 'enable' as const, status: null },
        { id: 'c-vpdesign', title: 'VP Global Toy Design', sub: 'Product Design & Innovation', span: 5, fn: 'brand', om: 'core' as const, status: null },
        { id: 'c-mdlicensing', title: 'Managing Director Licensing & Global Dev', sub: 'Licensing & Partnerships', span: 4, fn: 'commercial', om: 'core' as const, status: null },
        { id: 'c-evpfb', title: 'EVP Fat Brain Toys', sub: 'Specialty Toy Division', span: 3, fn: 'brand', om: 'core' as const, status: null },
      ],
    },
    future: {
      root: {
        id: 'f-root',
        title: 'President & CEO',
        sub: 'Enterprise Leadership',
        span: 10,
        fn: 'exec',
        om: 'core' as const,
        status: null,
      },
      n1: [
        { id: 'f-cos', title: 'Chief of Staff', sub: 'Strategy & PMO', span: 3, fn: 'exec', om: 'enable' as const, status: 'new' as const, note: 'New role to coordinate enterprise transformation',
          children: [
            { id: 'f-cos-1', title: 'Director Strategy', sub: 'Corporate Strategy', span: 2, fn: 'exec', om: 'enable' as const, status: 'new' as const },
            { id: 'f-cos-2', title: 'Director PMO', sub: 'Program Management', span: 3, fn: 'exec', om: 'enable' as const, status: 'new' as const },
          ],
        },
        { id: 'f-cfo', title: 'Chief Financial Officer', sub: 'Finance, Treasury & IR', span: 5, fn: 'finance', om: 'enable' as const, status: 'new' as const, note: 'Elevated from Corporate Controller — expanded scope includes treasury and IR',
          children: [
            { id: 'f-cfo-1', title: 'VP FP&A', sub: 'Financial Planning & Analysis', span: 4, fn: 'finance', om: 'enable' as const, status: 'moved' as const },
            { id: 'f-cfo-2', title: 'VP Treasury & IR', sub: 'Investor Relations', span: 2, fn: 'finance', om: 'enable' as const, status: 'new' as const },
            { id: 'f-cfo-3', title: 'Director Accounting', sub: 'GL & Reporting', span: 4, fn: 'finance', om: 'shared' as const, status: null },
          ],
        },
        { id: 'f-cmo', title: 'Chief Marketing Officer', sub: 'Enterprise Brand & Marketing', span: 4, fn: 'marketing', om: 'core' as const, status: 'new' as const, note: 'Enterprise marketing function — replaces brand-by-brand model',
          children: [
            { id: 'f-cmo-1', title: 'VP Brand Strategy', sub: 'Unified Brand Architecture', span: 3, fn: 'marketing', om: 'core' as const, status: 'new' as const },
            { id: 'f-cmo-2', title: 'VP Digital Marketing', sub: 'Performance & Content', span: 4, fn: 'marketing', om: 'core' as const, status: 'moved' as const },
          ],
        },
        { id: 'f-coo', title: 'Chief Operations Officer', sub: 'Supply Chain, Mfg & Quality', span: 5, fn: 'ops', om: 'core' as const, status: 'moved' as const, note: 'Refocused scope: pure operations without brand P&L',
          children: [
            { id: 'f-coo-1', title: 'VP Global Supply Chain', sub: 'Logistics & Distribution', span: 5, fn: 'ops', om: 'core' as const, status: null },
            { id: 'f-coo-2', title: 'VP Manufacturing', sub: 'Global Plants', span: 4, fn: 'ops', om: 'core' as const, status: null },
          ],
        },
        { id: 'f-clco', title: 'Chief Legal & Compliance Officer', sub: 'Legal, IP, Ethics & Compliance', span: 4, fn: 'legal', om: 'enable' as const, status: 'moved' as const, note: 'Elevated to C-suite with expanded compliance mandate' },
        { id: 'f-chro', title: 'Chief Human Resources Officer', sub: 'People, Culture & Talent', span: 4, fn: 'hr', om: 'enable' as const, status: 'new' as const, note: 'New C-suite HR function — previously distributed across brands',
          children: [
            { id: 'f-chro-1', title: 'VP Talent & OD', sub: 'Org Development', span: 3, fn: 'hr', om: 'enable' as const, status: 'new' as const },
            { id: 'f-chro-2', title: 'VP Total Rewards', sub: 'Compensation & Benefits', span: 3, fn: 'hr', om: 'shared' as const, status: 'new' as const },
          ],
        },
        { id: 'f-mdamericas', title: 'Managing Director Americas', sub: 'Regional P&L — US, CA, LATAM', span: 6, fn: 'commercial', om: 'core' as const, status: 'new' as const, note: 'New regional structure — replaces brand-by-brand P&L', warn: true },
        { id: 'f-mdeurope', title: 'Managing Director Europe', sub: 'Regional P&L — UK, EU, Nordics', span: 5, fn: 'commercial', om: 'core' as const, status: 'new' as const, note: 'New regional structure' },
        { id: 'f-mdanz', title: 'Managing Director Australia & NZ', sub: 'Regional P&L — AU, NZ', span: 3, fn: 'commercial', om: 'core' as const, status: 'new' as const, note: 'New regional structure' },
        { id: 'f-pdoc', title: 'President Digital & Owned Commerce', sub: 'DTC, E-commerce, Digital Products', span: 5, fn: 'digital', om: 'core' as const, status: 'new' as const, note: 'Consolidates digital capabilities into enterprise-level function' },
      ],
    },
  },
  diagnostics: {
    avgSpan:    { current: 3.1, future: 4.2 },
    layers:     { current: 8,   future: 6 },
    duplicated: { current: 14,  future: 2 },
    mgrToIC:    { current: 4.2, future: 6.8 },
    gaAsPctRev: { current: 11.4, future: 8.6 },
  },
  archetypes: [
    { id: 'functional', name: 'Functional', fit: 'Partial' as const },
    { id: 'regional-holding', name: 'Regional Holding', fit: 'Strong' as const, selected: true },
    { id: 'front-back', name: 'Front-Back', fit: 'Partial' as const },
    { id: 'matrix', name: 'Matrix', fit: 'Poor' as const },
    { id: 'product-divisional', name: 'Product Divisional', fit: 'Poor' as const },
    { id: 'ambidextrous', name: 'Ambidextrous', fit: 'Partial' as const },
    { id: 'platform', name: 'Platform', fit: 'Partial' as const },
  ],
};
