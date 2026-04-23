export type FeatureStatus = 'live' | 'beta' | 'stub' | 'planned';

export interface Feature {
  id: string;
  name: string;
  status: FeatureStatus;
  description: string;
  note?: string;
  inUse?: boolean;
  inUseContext?: string;
}

export interface Territory {
  id: string;
  num: string;
  title: string;
  titleEmphasis: string;
  description: string;
  accentColor: string;
  features: Feature[];
}

export const TERRITORIES: Territory[] = [
  {
    id: 'strategy',
    num: '01',
    title: 'Strategic Foundation',
    titleEmphasis: 'Strategic',
    description: 'Define the organizing logic, constraints, and success measures that anchor every structural decision.',
    accentColor: '#D6611A',
    features: [
      { id: 'strategicIntentCanvas', name: 'Strategic Intent Canvas', status: 'stub', description: 'Visual workspace for articulating and stress-testing the organizing logic.' },
      { id: 'valueStreamMapping', name: 'Value Stream Mapping', status: 'planned', description: 'Trace value creation from customer need to delivered outcome.' },
      { id: 'capabilityHeatMap', name: 'Capability Heat Map', status: 'planned', description: 'Maturity assessment across strategic capabilities.' },
      { id: 'designConstraintsLog', name: 'Design Constraints Log', status: 'planned', description: 'Track non-negotiable constraints: regulatory, union, board mandates.', note: 'Practitioner note: flag co-determination and union-represented roles before proposing structural changes.' },
      { id: 'successMetrics', name: 'Success Metrics', status: 'planned', description: 'Define measurable outcomes for the design transformation.' },
      { id: 'strategicContextCard', name: 'Strategic Context Card', status: 'live', description: 'Revenue, headcount, regions, brands, horizon, and cap context at a glance.', inUse: true, inUseContext: 'Active \u00b7 Strategy tab' },
      { id: 'ceoMandateBlock', name: 'CEO Mandate Block', status: 'live', description: 'The one-sentence organizing directive from the CEO.', inUse: true, inUseContext: 'Active \u00b7 Strategy tab' },
      { id: 'strategyToStructureTrace', name: 'Strategy-to-Structure Trace', status: 'planned', description: 'Link any structural decision back to the strategic intent that justifies it.', note: "Methodology link: 'Why did we put it there?' \u2014 trace from any design decision back to the strategic intent." },
    ],
  },
  {
    id: 'opmodel',
    num: '02',
    title: 'Operating Model',
    titleEmphasis: 'Operating',
    description: 'Map the enterprise operating model: core, enabling, and shared capabilities across geographies.',
    accentColor: '#AA8A46',
    features: [
      { id: 'coreEnableSharedMap', name: 'Core / Enable / Shared Map', status: 'beta', description: 'Classify every capability as core (differentiating), enabling, or shared.' },
      { id: 'serviceCatalog', name: 'Service Catalog', status: 'planned', description: 'Catalogue enterprise services with owners, SLAs, and consumers.' },
      { id: 'globalRegionalLocal', name: 'Global / Regional / Local Cut', status: 'planned', description: 'Decide which capabilities are global, regional, or local.' },
      { id: 'buildBuyPartnerBot', name: 'Build / Buy / Partner / Bot', status: 'planned', description: 'Four-way sourcing decision for each capability.', note: 'Practitioner note: show which capabilities are automation candidates and the headcount implications.' },
      { id: 'archetypeLibrary', name: 'Archetype Library', status: 'live', description: 'Select and compare organizational archetypes against the strategic context.', inUse: true, inUseContext: 'Active \u00b7 Regional Holding selected' },
      { id: 'omVisualizer', name: 'OM Visualizer', status: 'planned', description: 'Interactive operating model canvas with drag-and-drop capability placement.' },
      { id: 'processFunctionMap', name: 'Process \u2192 Function Map', status: 'planned', description: 'Map end-to-end processes to the functions that own them.' },
      { id: 'coeLayer', name: 'Center of Excellence Layer', status: 'planned', description: 'Define CoE scope, staffing model, and governance.' },
      { id: 'omScenarioCompare', name: 'OM Scenario Compare', status: 'planned', description: 'Side-by-side comparison of operating model alternatives.' },
    ],
  },
  {
    id: 'structure',
    num: '03',
    title: 'Structural Design',
    titleEmphasis: 'Structural',
    description: 'Build and stress-test reporting structures from N\u22121 through N\u2212x with scenario modeling.',
    accentColor: '#051530',
    features: [
      { id: 'nMinusDrilldown', name: 'N-minus Drill-Down', status: 'live', description: 'Navigate the org tree from CEO to individual contributor, level by level.', inUse: true, inUseContext: 'Active \u00b7 currently at N\u22122' },
      { id: 'currentFutureDiff', name: 'Current / Future / Diff', status: 'live', description: 'Three-state toggle showing current structure, future state, or the overlay diff.', inUse: true, inUseContext: 'Active \u00b7 future state primary' },
      { id: 'focusedView', name: 'Focused View', status: 'live', description: 'Full-screen popout of the org tree with URL-param state persistence.' },
      { id: 'spanOfControlOverlay', name: 'Span of Control Overlay', status: 'live', description: 'Color-coded warnings when span exceeds target thresholds.' },
      { id: 'incumbentLayer', name: 'Incumbent Layer', status: 'stub', description: 'People data layered onto the org chart: who sits in each seat today.', note: "Methodology gap: 'Who sits in these seats?' \u2014 demo'd in Engagement-Ready Features below." },
      { id: 'scenarioBuilder', name: 'Scenario Builder', status: 'stub', description: 'Create and compare structural scenarios with different assumptions.' },
      { id: 'multiEntitySupport', name: 'Multi-Entity Support', status: 'planned', description: 'Nested entity views for conglomerate clients.', note: 'Edge case: conglomerate clients with 5+ operating companies need nested entity views.' },
      { id: 'orgDataUpload', name: 'Org Data Upload', status: 'planned', description: 'Import organizational data from HRIS exports or spreadsheets.' },
      { id: 'dottedLineReporting', name: 'Dotted-Line Reporting', status: 'planned', description: 'Represent matrix and dotted-line reporting relationships.' },
      { id: 'regulatoryFlags', name: 'Regulatory Flags', status: 'planned', description: 'Flag regulatory and union-affected structural changes.', note: 'Practitioner note: flag regulatory and union-affected changes (Germany, France co-determination).' },
    ],
  },
  {
    id: 'accountability',
    num: '04',
    title: 'Accountability & Governance',
    titleEmphasis: 'Accountability',
    description: 'Define who decides what, how escalation works, and where governance forums sit.',
    accentColor: '#6B3E99',
    features: [
      { id: 'decisionRightsMatrix', name: 'Decision Rights Matrix', status: 'beta', description: 'RACI-style matrix mapping decisions to roles.' },
      { id: 'governanceForums', name: 'Governance Forums', status: 'planned', description: 'Define standing governance bodies with membership, cadence, and scope.' },
      { id: 'escalationPaths', name: 'Escalation Paths', status: 'planned', description: 'Visual escalation chains for different decision types.' },
      { id: 'roleMandateCards', name: 'Role Mandate Cards', status: 'planned', description: 'One-page mandate for each N\u22121 and N\u22122 role.' },
      { id: 'decisionVelocity', name: 'Decision Velocity', status: 'planned', description: 'Measure and benchmark time-to-decision for key decisions.' },
      { id: 'accountabilityDiagnostic', name: 'Accountability Diagnostic', status: 'planned', description: 'Survey-driven assessment of accountability clarity.' },
      { id: 'governanceExport', name: 'Governance Export', status: 'planned', description: 'Export governance charters and RACI matrices to PowerPoint and Word.' },
    ],
  },
  {
    id: 'worktalent',
    num: '05',
    title: 'Work & Talent',
    titleEmphasis: 'Work',
    description: 'Design the work first, then fit the talent: job architecture, leveling, skills, and flows.',
    accentColor: '#2A7A78',
    features: [
      { id: 'jobArchitectureBrowser', name: 'Job Architecture Browser', status: 'live', description: 'Browse and search the full job architecture with families, sub-families, and levels.', inUse: true, inUseContext: 'Active \u00b7 Work & Talent tab' },
      { id: 'roleProfileBuilder', name: 'Role Profile Builder', status: 'beta', description: 'Build structured role profiles with accountabilities, skills, and success measures.' },
      { id: 'levelingFramework', name: 'Leveling Framework', status: 'live', description: 'Apply and calibrate a leveling framework across the job architecture.', inUse: true, inUseContext: 'Active \u00b7 mid-cap applied' },
      { id: 'skillsMapEngine', name: 'Skills Map Engine', status: 'beta', description: 'Map skills to roles and identify capability gaps.' },
      { id: 'incumbentProfiles', name: 'Incumbent Profiles', status: 'planned', description: 'People data for each role: tenure, performance, readiness, retention risk.', note: 'Methodology gap: incumbent data is a prerequisite for presenting future-state roles to the exec team.' },
      { id: 'pivotRoles', name: 'Pivot Roles', status: 'planned', description: 'Identify roles that require significant changes in scope or capability.' },
      { id: 'workDeconstruction', name: 'Work Deconstruction', status: 'planned', description: 'Decompose work into tasks and match to the best combination of human, AI, and automated execution.', note: 'Methodology note: treats work as fluid (Jesuthasan, Work Without Jobs) rather than locked to job boxes.' },
      { id: 'successionDepth', name: 'Succession Depth', status: 'planned', description: 'Assess succession bench strength for critical roles.' },
      { id: 'talentFlowSimulator', name: 'Talent Flow Simulator', status: 'planned', description: 'Model talent movement under different organizational scenarios.' },
      { id: 'compGradingImpact', name: 'Comp & Grading Impact', status: 'planned', description: 'Estimate compensation and grading implications of structural changes.' },
      { id: 'hireBuyBorrowBot', name: 'Hire / Buy / Borrow / Bot', status: 'planned', description: 'Four-way sourcing decisions for talent.', note: 'Edge case: four-way sourcing decisions \u2014 spectrum metaphor breaks, needs quadrant or composition visual.' },
    ],
  },
  {
    id: 'execution',
    num: '06',
    title: 'Transformation Execution',
    titleEmphasis: 'Transformation',
    description: 'From design to reality: cost models, change impact, risk, and wave planning.',
    accentColor: '#0E47B8',
    features: [
      { id: 'transformationRoadmap', name: 'Transformation Roadmap', status: 'planned', description: 'Sequenced execution plan with milestones, owners, and dependencies.', note: "Methodology gap: the studio shows where, but not how to get there \u2014 execution sequencing needed." },
      { id: 'costModel', name: 'Cost Model', status: 'planned', description: 'Full cost model with headcount, compensation, and transition costs.', note: "Methodology gap: 'what does this cost?' \u2014 a required answer before finance stakeholders will sign off." },
      { id: 'changeImpactHeat', name: 'Change Impact Heat', status: 'planned', description: 'Heat map of change intensity across functions, levels, and geographies.' },
      { id: 'riskRegister', name: 'Risk Register', status: 'planned', description: 'Categorized risk register with mitigation plans and owners.' },
      { id: 'readinessPulse', name: 'Readiness Pulse', status: 'planned', description: 'Pulse survey tool for measuring organizational readiness.' },
      { id: 'milestoneTracker', name: 'Milestone Tracker', status: 'planned', description: 'Track transformation milestones against plan with status indicators.' },
      { id: 'commsLibrary', name: 'Comms Library', status: 'planned', description: 'Template library for transformation communications by audience and stage.' },
      { id: 'postGoLiveDiagnostics', name: 'Post-Go-Live Diagnostics', status: 'planned', description: 'Post-implementation assessment against design intent.' },
      { id: 'wavePlanning', name: 'Wave Planning', status: 'planned', description: 'Plan phased rollout across functions, geographies, or business units.' },
    ],
  },
];

export function getCapabilityStats() {
  const allFeatures = TERRITORIES.flatMap(t => t.features);
  const total = allFeatures.length;
  const live = allFeatures.filter(f => f.status === 'live' || f.status === 'beta').length;
  const inUse = allFeatures.filter(f => f.inUse).length;
  const planned = allFeatures.filter(f => f.status === 'planned' || f.status === 'stub').length;
  return { territories: TERRITORIES.length, total, live, inUse, planned };
}
