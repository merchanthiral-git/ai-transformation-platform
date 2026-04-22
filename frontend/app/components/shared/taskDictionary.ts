/**
 * Task Dictionary — shared data used by both WorkDesignLab and StageDeconstruction.
 * Extracted to a neutral file to break the circular dependency:
 *   WorkDesignLab → WorkflowCanvas → StageDeconstruction → WorkDesignLab
 */

export const TASK_DICTIONARY: Record<string, { industry: string; tasks: { name: string; workstream: string; pct: number; type: string; logic: string; interaction: string; impact: string; skill1: string; skill2: string }[] }[]> = {
  "Financial Analyst": [
    { industry: "Financial Services", tasks: [
      {name:"Monthly financial close & reporting",workstream:"Close",pct:20,type:"Repetitive",logic:"Deterministic",interaction:"Independent",impact:"High",skill1:"Financial Reporting",skill2:"ERP Systems"},
      {name:"Budget variance analysis",workstream:"FP&A",pct:15,type:"Variable",logic:"Probabilistic",interaction:"Interactive",impact:"Moderate",skill1:"Financial Analysis",skill2:"Excel"},
      {name:"Revenue forecasting models",workstream:"FP&A",pct:15,type:"Variable",logic:"Probabilistic",interaction:"Independent",impact:"Moderate",skill1:"Forecasting",skill2:"Statistical Analysis"},
      {name:"Board deck preparation",workstream:"Reporting",pct:10,type:"Repetitive",logic:"Deterministic",interaction:"Collaborative",impact:"High",skill1:"PowerPoint",skill2:"Communication"},
      {name:"Regulatory filing support",workstream:"Compliance",pct:10,type:"Repetitive",logic:"Deterministic",interaction:"Independent",impact:"High",skill1:"Regulatory Knowledge",skill2:"Compliance"},
      {name:"Ad-hoc analysis for leadership",workstream:"Analysis",pct:15,type:"Variable",logic:"Judgment-heavy",interaction:"Collaborative",impact:"Low",skill1:"Critical Thinking",skill2:"Stakeholder Mgmt"},
      {name:"Data reconciliation & validation",workstream:"Close",pct:10,type:"Repetitive",logic:"Deterministic",interaction:"Independent",impact:"High",skill1:"Data Quality",skill2:"SQL"},
      {name:"Process improvement initiatives",workstream:"Operations",pct:5,type:"Variable",logic:"Judgment-heavy",interaction:"Collaborative",impact:"Low",skill1:"Process Design",skill2:"Change Mgmt"},
    ]},
    { industry: "Technology", tasks: [
      {name:"Revenue recognition & ASC 606",workstream:"Close",pct:15,type:"Repetitive",logic:"Deterministic",interaction:"Independent",impact:"High",skill1:"Revenue Recognition",skill2:"ERP Systems"},
      {name:"SaaS metrics dashboard (ARR, churn)",workstream:"FP&A",pct:15,type:"Variable",logic:"Probabilistic",interaction:"Independent",impact:"Moderate",skill1:"SaaS Metrics",skill2:"BI Tools"},
      {name:"Headcount planning & burn rate",workstream:"FP&A",pct:15,type:"Variable",logic:"Probabilistic",interaction:"Collaborative",impact:"Moderate",skill1:"Workforce Planning",skill2:"Financial Modeling"},
      {name:"Investor relations support",workstream:"Reporting",pct:10,type:"Variable",logic:"Judgment-heavy",interaction:"Collaborative",impact:"Low",skill1:"Investor Relations",skill2:"Communication"},
      {name:"Expense management & approvals",workstream:"Operations",pct:10,type:"Repetitive",logic:"Deterministic",interaction:"Independent",impact:"High",skill1:"Expense Management",skill2:"Policy"},
      {name:"Scenario modeling (fundraise, M&A)",workstream:"Analysis",pct:15,type:"Variable",logic:"Probabilistic",interaction:"Interactive",impact:"Low",skill1:"Financial Modeling",skill2:"Valuation"},
      {name:"Month-end accruals & journal entries",workstream:"Close",pct:10,type:"Repetitive",logic:"Deterministic",interaction:"Independent",impact:"High",skill1:"Accounting",skill2:"ERP Systems"},
      {name:"Cross-functional business reviews",workstream:"Reporting",pct:10,type:"Variable",logic:"Judgment-heavy",interaction:"Collaborative",impact:"Low",skill1:"Business Partnering",skill2:"Presentation"},
    ]},
    { industry: "Manufacturing", tasks: [
      {name:"Cost accounting & COGS analysis",workstream:"Close",pct:20,type:"Repetitive",logic:"Deterministic",interaction:"Independent",impact:"High",skill1:"Cost Accounting",skill2:"ERP Systems"},
      {name:"Plant P&L variance reporting",workstream:"FP&A",pct:15,type:"Variable",logic:"Probabilistic",interaction:"Interactive",impact:"Moderate",skill1:"Variance Analysis",skill2:"Manufacturing Finance"},
      {name:"CapEx tracking & ROI analysis",workstream:"Analysis",pct:10,type:"Variable",logic:"Probabilistic",interaction:"Collaborative",impact:"Moderate",skill1:"Capital Planning",skill2:"ROI Analysis"},
      {name:"Inventory valuation & reserves",workstream:"Close",pct:15,type:"Repetitive",logic:"Deterministic",interaction:"Independent",impact:"High",skill1:"Inventory Accounting",skill2:"GAAP"},
      {name:"Transfer pricing calculations",workstream:"Tax",pct:10,type:"Repetitive",logic:"Deterministic",interaction:"Independent",impact:"High",skill1:"Transfer Pricing",skill2:"Tax"},
      {name:"Standard cost updates",workstream:"Close",pct:10,type:"Repetitive",logic:"Deterministic",interaction:"Independent",impact:"High",skill1:"Standard Costing",skill2:"BOM Analysis"},
      {name:"Budget preparation (bottom-up)",workstream:"FP&A",pct:10,type:"Variable",logic:"Probabilistic",interaction:"Collaborative",impact:"Moderate",skill1:"Budgeting",skill2:"Excel"},
      {name:"Management reporting & KPIs",workstream:"Reporting",pct:10,type:"Repetitive",logic:"Deterministic",interaction:"Independent",impact:"High",skill1:"KPI Design",skill2:"Visualization"},
    ]},
  ],
  "HR Business Partner": [
    { industry: "General", tasks: [
      {name:"Workforce planning & headcount mgmt",workstream:"Planning",pct:15,type:"Variable",logic:"Probabilistic",interaction:"Collaborative",impact:"Moderate",skill1:"Workforce Planning",skill2:"Analytics"},
      {name:"Employee relations case management",workstream:"ER",pct:15,type:"Variable",logic:"Judgment-heavy",interaction:"Interactive",impact:"Low",skill1:"Employee Relations",skill2:"Employment Law"},
      {name:"Performance management coaching",workstream:"Talent",pct:15,type:"Variable",logic:"Judgment-heavy",interaction:"Collaborative",impact:"Low",skill1:"Coaching",skill2:"Performance Mgmt"},
      {name:"Compensation review & benchmarking",workstream:"Rewards",pct:10,type:"Variable",logic:"Probabilistic",interaction:"Interactive",impact:"Moderate",skill1:"Compensation",skill2:"Market Data"},
      {name:"Talent review & succession planning",workstream:"Talent",pct:10,type:"Variable",logic:"Judgment-heavy",interaction:"Collaborative",impact:"Low",skill1:"Talent Management",skill2:"Succession Planning"},
      {name:"Organizational design support",workstream:"OD",pct:10,type:"Variable",logic:"Judgment-heavy",interaction:"Collaborative",impact:"Low",skill1:"Org Design",skill2:"Change Mgmt"},
      {name:"HR data & people analytics reporting",workstream:"Analytics",pct:10,type:"Repetitive",logic:"Deterministic",interaction:"Independent",impact:"High",skill1:"People Analytics",skill2:"HRIS"},
      {name:"Policy interpretation & guidance",workstream:"Operations",pct:10,type:"Variable",logic:"Judgment-heavy",interaction:"Interactive",impact:"Moderate",skill1:"HR Policy",skill2:"Communication"},
      {name:"Onboarding & integration support",workstream:"Talent",pct:5,type:"Repetitive",logic:"Deterministic",interaction:"Collaborative",impact:"High",skill1:"Onboarding",skill2:"Process Design"},
    ]},
  ],
  "Software Engineer": [
    { industry: "Technology", tasks: [
      {name:"Feature development & coding",workstream:"Engineering",pct:30,type:"Variable",logic:"Probabilistic",interaction:"Interactive",impact:"Moderate",skill1:"Programming",skill2:"System Design"},
      {name:"Code review & PR management",workstream:"Quality",pct:15,type:"Variable",logic:"Judgment-heavy",interaction:"Collaborative",impact:"Low",skill1:"Code Review",skill2:"Communication"},
      {name:"Testing & QA automation",workstream:"Quality",pct:10,type:"Repetitive",logic:"Deterministic",interaction:"Independent",impact:"High",skill1:"Testing",skill2:"Automation"},
      {name:"Technical documentation",workstream:"Documentation",pct:10,type:"Repetitive",logic:"Deterministic",interaction:"Independent",impact:"High",skill1:"Technical Writing",skill2:"Documentation"},
      {name:"Sprint planning & ceremonies",workstream:"Agile",pct:10,type:"Variable",logic:"Judgment-heavy",interaction:"Collaborative",impact:"Low",skill1:"Agile/Scrum",skill2:"Estimation"},
      {name:"Incident response & on-call",workstream:"Operations",pct:10,type:"Variable",logic:"Probabilistic",interaction:"Interactive",impact:"Moderate",skill1:"Debugging",skill2:"Monitoring"},
      {name:"Architecture & design reviews",workstream:"Engineering",pct:10,type:"Variable",logic:"Judgment-heavy",interaction:"Collaborative",impact:"Low",skill1:"System Design",skill2:"Architecture"},
      {name:"CI/CD pipeline maintenance",workstream:"DevOps",pct:5,type:"Repetitive",logic:"Deterministic",interaction:"Independent",impact:"High",skill1:"DevOps",skill2:"Cloud"},
    ]},
  ],
  "Nurse Manager": [
    { industry: "Healthcare", tasks: [
      {name:"Staff scheduling & shift management",workstream:"Operations",pct:20,type:"Repetitive",logic:"Deterministic",interaction:"Independent",impact:"High",skill1:"Scheduling",skill2:"Workforce Planning"},
      {name:"Patient care quality oversight",workstream:"Clinical",pct:15,type:"Variable",logic:"Judgment-heavy",interaction:"Collaborative",impact:"Low",skill1:"Clinical Leadership",skill2:"Quality Improvement"},
      {name:"Staff performance & development",workstream:"People",pct:15,type:"Variable",logic:"Judgment-heavy",interaction:"Collaborative",impact:"Low",skill1:"Leadership",skill2:"Coaching"},
      {name:"Compliance & regulatory reporting",workstream:"Compliance",pct:10,type:"Repetitive",logic:"Deterministic",interaction:"Independent",impact:"High",skill1:"Regulatory Knowledge",skill2:"Documentation"},
      {name:"Budget management & supply orders",workstream:"Finance",pct:10,type:"Repetitive",logic:"Deterministic",interaction:"Independent",impact:"High",skill1:"Budget Management",skill2:"Procurement"},
      {name:"Interdisciplinary care coordination",workstream:"Clinical",pct:10,type:"Variable",logic:"Judgment-heavy",interaction:"Collaborative",impact:"Low",skill1:"Care Coordination",skill2:"Communication"},
      {name:"Incident & safety reporting",workstream:"Safety",pct:10,type:"Repetitive",logic:"Deterministic",interaction:"Independent",impact:"High",skill1:"Incident Management",skill2:"Patient Safety"},
      {name:"Patient & family communication",workstream:"Clinical",pct:10,type:"Variable",logic:"Judgment-heavy",interaction:"Collaborative",impact:"Low",skill1:"Communication",skill2:"Empathy"},
    ]},
  ],
  "Data Analyst": [
    { industry: "General", tasks: [
      {name:"Data extraction & SQL querying",workstream:"Data",pct:20,type:"Repetitive",logic:"Deterministic",interaction:"Independent",impact:"High",skill1:"SQL",skill2:"Data Modeling"},
      {name:"Dashboard creation & maintenance",workstream:"Visualization",pct:15,type:"Repetitive",logic:"Deterministic",interaction:"Independent",impact:"High",skill1:"BI Tools",skill2:"Data Visualization"},
      {name:"Ad-hoc analysis & insights",workstream:"Analysis",pct:20,type:"Variable",logic:"Probabilistic",interaction:"Interactive",impact:"Moderate",skill1:"Statistical Analysis",skill2:"Critical Thinking"},
      {name:"Data quality auditing",workstream:"Data",pct:10,type:"Repetitive",logic:"Deterministic",interaction:"Independent",impact:"High",skill1:"Data Quality",skill2:"ETL"},
      {name:"Stakeholder presentations",workstream:"Communication",pct:10,type:"Variable",logic:"Judgment-heavy",interaction:"Collaborative",impact:"Low",skill1:"Communication",skill2:"Storytelling"},
      {name:"Report automation & scheduling",workstream:"Automation",pct:10,type:"Repetitive",logic:"Deterministic",interaction:"Independent",impact:"High",skill1:"Python/R",skill2:"Automation"},
      {name:"Requirements gathering",workstream:"Analysis",pct:10,type:"Variable",logic:"Judgment-heavy",interaction:"Collaborative",impact:"Low",skill1:"Business Analysis",skill2:"Requirements"},
      {name:"Documentation & knowledge mgmt",workstream:"Documentation",pct:5,type:"Repetitive",logic:"Deterministic",interaction:"Independent",impact:"High",skill1:"Documentation",skill2:"Knowledge Mgmt"},
    ]},
  ],
};

/** Get matching dictionary entries for a job title (fuzzy match) */
export function findTaskDictEntries(jobTitle: string): { industry: string; tasks: typeof TASK_DICTIONARY[string][0]["tasks"] }[] {
  const lower = jobTitle.toLowerCase();
  for (const [role, entries] of Object.entries(TASK_DICTIONARY)) {
    if (lower.includes(role.toLowerCase()) || role.toLowerCase().includes(lower)) return entries;
  }
  const words = lower.split(/\s+/);
  for (const [role, entries] of Object.entries(TASK_DICTIONARY)) {
    const roleWords = role.toLowerCase().split(/\s+/);
    if (words.some(w => roleWords.some(rw => rw.includes(w) || w.includes(rw)))) return entries;
  }
  return [];
}
