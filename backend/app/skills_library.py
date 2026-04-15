"""Centralized Skills Library — master taxonomy of 500+ skills."""
import uuid
from datetime import datetime


def _id():
    return f"skl_{uuid.uuid4().hex[:8]}"


def _now():
    return datetime.utcnow().isoformat()


# ═══════════════════════════════════════
# SKILL DOMAINS (top level)
# ═══════════════════════════════════════
DOMAINS = [
    {"id": "dom_data", "name": "Data & Analytics", "icon": "📊"},
    {"id": "dom_tech", "name": "Technology & Engineering", "icon": "💻"},
    {"id": "dom_finance", "name": "Finance & Accounting", "icon": "💰"},
    {"id": "dom_hr", "name": "Human Resources & People", "icon": "👥"},
    {"id": "dom_ops", "name": "Operations & Supply Chain", "icon": "⚙️"},
    {"id": "dom_sales", "name": "Sales & Revenue", "icon": "💼"},
    {"id": "dom_mktg", "name": "Marketing & Communications", "icon": "📣"},
    {"id": "dom_legal", "name": "Legal & Compliance", "icon": "⚖️"},
    {"id": "dom_strategy", "name": "Strategy & Consulting", "icon": "🎯"},
    {"id": "dom_leadership", "name": "Leadership & Management", "icon": "👔"},
    {"id": "dom_digital", "name": "Digital & AI", "icon": "🤖"},
    {"id": "dom_industry", "name": "Industry-Specific", "icon": "🏭"},
    {"id": "dom_universal", "name": "Universal / Core", "icon": "🌐"},
]


# ═══════════════════════════════════════
# SKILL GENERATOR
# ═══════════════════════════════════════

def _default_scale(name, typ):
    if typ == "technical":
        return {
            "1": f"Understands {name} concepts and terminology",
            "2": f"Can apply {name} with guidance on standard tasks",
            "3": f"Independently applies {name} to complex problems",
            "4": f"Expert in {name}; teaches, innovates, and sets standards",
        }
    elif typ == "leadership":
        return {
            "1": f"Demonstrates awareness of {name} principles",
            "2": f"Applies {name} within own team",
            "3": f"Drives {name} across functions",
            "4": f"Shapes organizational {name} strategy",
        }
    else:
        return {
            "1": f"Basic awareness of {name}",
            "2": f"Can apply {name} in routine situations",
            "3": f"Applies {name} independently and effectively",
            "4": f"Expert practitioner of {name}; coaches others",
        }


def _generate_skills():
    """Generate the master skills library."""
    skills = []

    def add(name, domain_id, domain, category, typ, desc, ai_impact, trend, roles, levels,
            prof_scale=None, industries=None):
        skills.append({
            "skill_id": _id(),
            "name": name,
            "domain_id": domain_id,
            "domain": domain,
            "category": category,
            "type": typ,
            "description": desc,
            "proficiency_scale": prof_scale or _default_scale(name, typ),
            "ai_impact": ai_impact,
            "ai_impact_description": "",
            "demand_trend": trend,
            "typical_roles": roles,
            "typical_levels": levels,
            "learning_time_hours": {"1_to_2": 20, "2_to_3": 60, "3_to_4": 120},
            "source": "system",
            "industries": industries or [],
            "created_at": _now(),
        })

    # Helper for batch creation within a category
    def batch(names, domain_id, domain, category, typ, ai_impact, trend, roles, levels, industries=None):
        for name in names:
            add(name, domain_id, domain, category, typ,
                f"Proficiency in {name} for {category.lower()} work.",
                ai_impact, trend, roles, levels, industries=industries)

    # ══════════════════════════════════════════════════════════
    # DATA & ANALYTICS  (dom_data) — 55 skills
    # ══════════════════════════════════════════════════════════
    d, dn = "dom_data", "Data & Analytics"

    # Data Analysis
    add("SQL", d, dn, "Data Analysis", "technical",
        "Writing and optimizing SQL queries for data retrieval, manipulation, and analysis across relational database systems.",
        "medium", "stable", ["Data Analyst", "Data Engineer", "Business Analyst", "Backend Developer"],
        ["P1", "P2", "P3", "P4", "T1", "T2", "T3"],
        prof_scale={
            "1": "Can write basic SELECT queries with simple WHERE clauses",
            "2": "Can write JOINs, subqueries, and GROUP BY aggregations",
            "3": "Can optimize queries, design schemas, write stored procedures",
            "4": "Can architect data models, tune query plans, mentor others on SQL patterns",
        })
    add("Python for Data Analysis", d, dn, "Data Analysis", "technical",
        "Using Python libraries (pandas, numpy) for data manipulation and analysis.",
        "medium", "growing", ["Data Analyst", "Data Scientist"], ["P2", "P3", "P4", "T2", "T3", "T4"])
    add("R Programming", d, dn, "Data Analysis", "technical",
        "Statistical computing and graphics using R for data analysis and visualization.",
        "medium", "stable", ["Data Scientist", "Statistician", "Biostatistician"], ["P2", "P3", "P4"])
    add("Excel Advanced", d, dn, "Data Analysis", "technical",
        "Advanced Excel including pivot tables, VLOOKUP/INDEX-MATCH, macros, and data modeling.",
        "high", "declining", ["Financial Analyst", "Business Analyst"], ["P1", "P2", "P3", "S1", "S2", "S3"])
    add("Data Cleaning & Preparation", d, dn, "Data Analysis", "technical",
        "Identifying and correcting errors, handling missing values, transforming data for analysis.",
        "high", "stable", ["Data Analyst", "Data Engineer"], ["P1", "P2", "P3", "T1", "T2"])
    add("Exploratory Data Analysis", d, dn, "Data Analysis", "technical",
        "Investigating datasets to discover patterns, anomalies, and relationships.",
        "medium", "stable", ["Data Analyst", "Data Scientist"], ["P2", "P3", "P4"])
    add("A/B Testing", d, dn, "Data Analysis", "technical",
        "Designing, running, and analyzing controlled experiments to compare variants.",
        "medium", "growing", ["Data Scientist", "Product Manager", "Growth Analyst"], ["P2", "P3", "P4"])
    add("SAS Programming", d, dn, "Data Analysis", "technical",
        "Using SAS for statistical analysis, data management, and reporting.",
        "medium", "declining", ["Statistician", "Data Analyst"], ["P2", "P3", "P4"])

    # Data Engineering
    batch(["ETL Pipeline Design", "Data Warehousing", "Apache Spark", "Apache Kafka",
           "Data Lake Architecture", "Airflow / Workflow Orchestration", "dbt (Data Build Tool)",
           "Data Quality Management", "Real-Time Data Processing", "Database Administration"],
          d, dn, "Data Engineering", "technical", "low", "growing",
          ["Data Engineer", "Platform Engineer", "Analytics Engineer"], ["T2", "T3", "T4", "T5"])

    # Data Visualization
    batch(["Tableau", "Power BI", "Looker / LookML", "D3.js", "Data Storytelling",
           "Dashboard Design", "Matplotlib / Seaborn"],
          d, dn, "Data Visualization", "technical", "medium", "stable",
          ["Data Analyst", "BI Developer", "Analytics Manager"], ["P1", "P2", "P3", "P4"])

    # Statistical Modeling
    batch(["Regression Analysis", "Hypothesis Testing", "Bayesian Statistics",
           "Time Series Analysis", "Experimental Design", "Survival Analysis",
           "Causal Inference", "Multivariate Analysis"],
          d, dn, "Statistical Modeling", "technical", "medium", "stable",
          ["Data Scientist", "Statistician", "Quantitative Analyst"], ["P3", "P4", "T3", "T4"])

    # Machine Learning
    batch(["Supervised Learning", "Unsupervised Learning", "Deep Learning / Neural Networks",
           "Natural Language Processing", "Computer Vision", "Reinforcement Learning",
           "Feature Engineering", "Model Evaluation & Validation", "MLOps / ML Pipelines",
           "Recommendation Systems"],
          d, dn, "Machine Learning", "technical", "low", "growing",
          ["ML Engineer", "Data Scientist", "AI Researcher"], ["T3", "T4", "T5", "T6"])

    # Business Intelligence
    batch(["KPI Design & Measurement", "Business Reporting", "Self-Service Analytics",
           "Data Catalog Management"],
          d, dn, "Business Intelligence", "technical", "high", "stable",
          ["BI Analyst", "Analytics Manager", "Business Analyst"], ["P2", "P3", "P4"])

    # Data Governance
    batch(["Data Privacy (GDPR/CCPA)", "Master Data Management", "Data Lineage",
           "Metadata Management"],
          d, dn, "Data Governance", "technical", "medium", "growing",
          ["Data Governance Lead", "Data Steward", "Chief Data Officer"], ["P3", "P4", "T3", "T4"])

    # ══════════════════════════════════════════════════════════
    # TECHNOLOGY & ENGINEERING  (dom_tech) — 75 skills
    # ══════════════════════════════════════════════════════════
    d, dn = "dom_tech", "Technology & Engineering"

    # Software Development
    batch(["Java", "Python", "JavaScript / TypeScript", "C# / .NET", "Go",
           "Rust", "C / C++", "Ruby", "Swift", "Kotlin"],
          d, dn, "Software Development", "technical", "medium", "stable",
          ["Software Engineer", "Senior Engineer", "Staff Engineer"], ["T1", "T2", "T3", "T4", "T5"])
    batch(["Object-Oriented Design", "Functional Programming", "Design Patterns",
           "Code Review", "Technical Documentation", "Test-Driven Development",
           "Agile Software Development", "Version Control (Git)"],
          d, dn, "Software Development", "technical", "medium", "stable",
          ["Software Engineer", "Senior Engineer", "Tech Lead"], ["T1", "T2", "T3", "T4"])

    # Architecture & Design
    batch(["System Design", "Distributed Systems", "Event-Driven Architecture",
           "Domain-Driven Design", "API Design (REST/GraphQL)", "Database Design",
           "Scalability & Performance Engineering"],
          d, dn, "Architecture & Design", "technical", "low", "growing",
          ["Software Architect", "Staff Engineer", "Principal Engineer"], ["T3", "T4", "T5", "T6"])

    # Cloud & Infrastructure
    batch(["AWS", "Azure", "Google Cloud Platform", "Serverless Architecture",
           "Containerization (Docker)", "Cloud Networking", "Cloud Cost Optimization",
           "Cloud Security"],
          d, dn, "Cloud & Infrastructure", "technical", "medium", "growing",
          ["Cloud Engineer", "DevOps Engineer", "SRE", "Platform Engineer"], ["T2", "T3", "T4", "T5"])

    # DevOps & SRE
    batch(["CI/CD Pipeline Design", "Infrastructure as Code (Terraform)",
           "Monitoring & Observability", "Incident Management", "Chaos Engineering",
           "Configuration Management", "Release Engineering"],
          d, dn, "DevOps & SRE", "technical", "medium", "growing",
          ["DevOps Engineer", "SRE", "Platform Engineer"], ["T2", "T3", "T4"])

    # Security Engineering
    batch(["Application Security (OWASP)", "Network Security", "Identity & Access Management",
           "Penetration Testing", "Security Architecture", "Threat Modeling",
           "Cryptography", "Security Compliance (SOC2/ISO 27001)"],
          d, dn, "Security Engineering", "technical", "low", "growing",
          ["Security Engineer", "AppSec Engineer", "CISO"], ["T2", "T3", "T4", "T5"])

    # Frontend Development
    batch(["React", "Angular", "Vue.js", "HTML / CSS", "Responsive Design",
           "Accessibility (WCAG)", "Web Performance Optimization"],
          d, dn, "Frontend Development", "technical", "medium", "stable",
          ["Frontend Engineer", "UI Developer", "Full-Stack Developer"], ["T1", "T2", "T3", "T4"])

    # Backend Development
    batch(["Node.js", "Spring Boot", "Django / FastAPI", "Microservices Architecture",
           "Message Queues (RabbitMQ/SQS)", "Caching (Redis/Memcached)"],
          d, dn, "Backend Development", "technical", "medium", "stable",
          ["Backend Engineer", "Full-Stack Developer", "Senior Engineer"], ["T2", "T3", "T4"])

    # Mobile Development
    batch(["iOS Development (Swift/SwiftUI)", "Android Development (Kotlin)",
           "React Native / Flutter", "Mobile UX Design"],
          d, dn, "Mobile Development", "technical", "medium", "stable",
          ["Mobile Developer", "iOS Engineer", "Android Engineer"], ["T2", "T3", "T4"])

    # Quality Assurance
    batch(["Test Automation", "Performance Testing", "API Testing",
           "Manual / Exploratory Testing", "Quality Strategy & Planning"],
          d, dn, "Quality Assurance", "technical", "high", "stable",
          ["QA Engineer", "SDET", "QA Lead"], ["T1", "T2", "T3", "T4"])

    # ══════════════════════════════════════════════════════════
    # FINANCE & ACCOUNTING  (dom_finance) — 42 skills
    # ══════════════════════════════════════════════════════════
    d, dn = "dom_finance", "Finance & Accounting"

    # Financial Analysis
    batch(["Financial Modeling", "Valuation (DCF/Comparables)", "Financial Statement Analysis",
           "Variance Analysis", "Scenario & Sensitivity Analysis", "Capital Budgeting",
           "Cost-Benefit Analysis"],
          d, dn, "Financial Analysis", "technical", "medium", "stable",
          ["Financial Analyst", "FP&A Analyst", "Investment Analyst"], ["P2", "P3", "P4"])

    # Accounting
    batch(["GAAP / IFRS Accounting", "General Ledger Management", "Accounts Payable / Receivable",
           "Revenue Recognition", "Fixed Asset Accounting", "Intercompany Accounting",
           "Month-End / Year-End Close"],
          d, dn, "Accounting", "technical", "high", "stable",
          ["Accountant", "Controller", "Accounting Manager"], ["P1", "P2", "P3", "P4"])

    # FP&A
    batch(["Budgeting & Forecasting", "Rolling Forecasts", "Management Reporting",
           "Driver-Based Planning", "Long-Range Planning"],
          d, dn, "FP&A", "technical", "medium", "stable",
          ["FP&A Analyst", "FP&A Manager", "Finance Director"], ["P2", "P3", "P4", "S3", "S4"])

    # Treasury
    batch(["Cash Management", "Liquidity Forecasting", "Foreign Exchange Management",
           "Debt Management", "Bank Relationship Management"],
          d, dn, "Treasury", "technical", "medium", "stable",
          ["Treasury Analyst", "Treasurer", "Treasury Manager"], ["P2", "P3", "P4"])

    # Tax
    batch(["Corporate Tax Compliance", "Transfer Pricing", "Tax Planning & Strategy",
           "Indirect Tax (VAT/GST)", "International Tax"],
          d, dn, "Tax", "technical", "medium", "stable",
          ["Tax Analyst", "Tax Manager", "Tax Director"], ["P2", "P3", "P4", "S3"])

    # Audit
    batch(["Internal Audit", "External Audit Support", "SOX Compliance",
           "Fraud Detection & Prevention", "Risk-Based Auditing"],
          d, dn, "Audit", "technical", "medium", "stable",
          ["Internal Auditor", "Audit Manager", "Chief Audit Executive"], ["P2", "P3", "P4"])

    # Investment Analysis
    batch(["Equity Research", "Portfolio Analysis", "Risk-Return Analysis"],
          d, dn, "Investment Analysis", "technical", "medium", "stable",
          ["Investment Analyst", "Portfolio Manager", "Research Analyst"], ["P3", "P4"])

    # Financial Technology
    batch(["ERP Systems (SAP/Oracle)", "Financial Data Analytics",
           "Treasury Management Systems", "Robotic Process Automation (Finance)",
           "Financial Risk Modeling"],
          d, dn, "Financial Technology", "technical", "medium", "growing",
          ["Finance Systems Analyst", "Financial Analyst", "FP&A Manager"], ["P2", "P3", "P4"])

    # ══════════════════════════════════════════════════════════
    # HUMAN RESOURCES & PEOPLE  (dom_hr) — 38 skills
    # ══════════════════════════════════════════════════════════
    d, dn = "dom_hr", "Human Resources & People"

    # Talent Acquisition
    batch(["Full-Cycle Recruiting", "Sourcing Strategy", "Employer Branding",
           "Candidate Assessment", "Interview Design", "Recruitment Analytics",
           "ATS Administration", "Diversity Recruiting"],
          d, dn, "Talent Acquisition", "technical", "high", "stable",
          ["Recruiter", "Talent Acquisition Manager", "Sourcer"], ["P1", "P2", "P3", "P4"])

    # People Analytics
    batch(["HR Data Analysis", "Workforce Planning", "Employee Engagement Analytics",
           "Attrition Modeling", "Compensation Analytics", "People Dashboard Design"],
          d, dn, "People Analytics", "technical", "medium", "growing",
          ["People Analyst", "HR Data Scientist", "HRBP"], ["P2", "P3", "P4"])

    # Compensation & Benefits
    batch(["Job Evaluation & Grading", "Salary Benchmarking", "Incentive Plan Design",
           "Benefits Administration", "Executive Compensation", "Pay Equity Analysis"],
          d, dn, "Compensation & Benefits", "technical", "medium", "stable",
          ["Compensation Analyst", "Total Rewards Manager", "Benefits Manager"], ["P2", "P3", "P4"])

    # Learning & Development
    batch(["Training Needs Analysis", "Instructional Design", "E-Learning Development",
           "Leadership Development Programs", "Learning Management Systems (LMS)",
           "Coaching & Mentoring"],
          d, dn, "Learning & Development", "technical", "medium", "growing",
          ["L&D Specialist", "Learning Designer", "L&D Manager"], ["P2", "P3", "P4"])

    # HR Operations
    batch(["HRIS Management (Workday/SAP)", "Employee Relations", "HR Policy Development",
           "Performance Management Systems", "Onboarding Program Design",
           "Employee Experience Design"],
          d, dn, "HR Operations", "technical", "high", "stable",
          ["HR Generalist", "HRBP", "HR Operations Manager"], ["P1", "P2", "P3", "P4"])

    # Organization Design
    batch(["Org Structure Design", "Job Architecture", "Competency Framework Design",
           "Change Management", "Culture Assessment", "Succession Planning"],
          d, dn, "Organization Design", "behavioral", "low", "growing",
          ["OD Consultant", "HRBP", "Chief People Officer"], ["P3", "P4", "S3", "S4"])

    # ══════════════════════════════════════════════════════════
    # OPERATIONS & SUPPLY CHAIN  (dom_ops) — 42 skills
    # ══════════════════════════════════════════════════════════
    d, dn = "dom_ops", "Operations & Supply Chain"

    # Supply Chain Management
    batch(["Demand Forecasting", "Supply Planning", "Procurement & Sourcing",
           "Supplier Relationship Management", "Category Management",
           "Contract Negotiation", "Supply Chain Risk Management",
           "Global Trade Compliance"],
          d, dn, "Supply Chain Management", "technical", "medium", "stable",
          ["Supply Chain Analyst", "Procurement Manager", "Supply Chain Director"], ["P2", "P3", "P4"])

    # Logistics
    batch(["Transportation Management", "Warehouse Operations", "Last-Mile Delivery",
           "Freight Management", "Inventory Optimization", "Distribution Network Design",
           "3PL Management"],
          d, dn, "Logistics", "technical", "medium", "stable",
          ["Logistics Coordinator", "Logistics Manager", "Warehouse Manager"], ["P1", "P2", "P3", "P4"])

    # Operations Management
    batch(["Process Improvement", "Lean Management", "Six Sigma (Green/Black Belt)",
           "Total Quality Management", "Capacity Planning", "Operations Strategy",
           "Standard Operating Procedures"],
          d, dn, "Operations Management", "technical", "medium", "stable",
          ["Operations Manager", "Process Engineer", "COO"], ["P2", "P3", "P4", "S3", "S4"])

    # Project Management
    batch(["Agile / Scrum", "Waterfall Project Management", "Program Management",
           "Resource Planning", "Risk Management", "Stakeholder Management",
           "Project Budgeting", "PMO Management"],
          d, dn, "Project Management", "technical", "medium", "stable",
          ["Project Manager", "Program Manager", "Scrum Master"], ["P2", "P3", "P4", "S3"])

    # Facilities & Real Estate
    batch(["Facilities Management", "Space Planning", "Workplace Strategy",
           "Vendor Management", "Business Continuity Planning",
           "Health & Safety Management"],
          d, dn, "Facilities & Real Estate", "technical", "medium", "stable",
          ["Facilities Manager", "Real Estate Manager", "Workplace Strategist"], ["P2", "P3", "P4"])

    # Procurement & Strategic Sourcing
    batch(["Strategic Sourcing", "Spend Analysis", "E-Procurement Systems",
           "Supplier Auditing"],
          d, dn, "Procurement & Strategic Sourcing", "technical", "medium", "stable",
          ["Procurement Specialist", "Strategic Sourcing Manager", "CPO"], ["P2", "P3", "P4"])

    # ══════════════════════════════════════════════════════════
    # SALES & REVENUE  (dom_sales) — 32 skills
    # ══════════════════════════════════════════════════════════
    d, dn = "dom_sales", "Sales & Revenue"

    # Sales Skills
    batch(["Consultative Selling", "Solution Selling", "Account Management",
           "Pipeline Management", "Sales Forecasting", "Negotiation",
           "Objection Handling", "Prospecting & Lead Generation"],
          d, dn, "Sales Skills", "behavioral", "medium", "stable",
          ["Account Executive", "Sales Manager", "Business Development Rep"], ["P1", "P2", "P3", "P4"])

    # Sales Operations
    batch(["CRM Administration (Salesforce)", "Sales Analytics & Reporting",
           "Territory Planning", "Quota Setting & Management",
           "Sales Enablement", "Revenue Operations"],
          d, dn, "Sales Operations", "technical", "high", "stable",
          ["Sales Ops Analyst", "Revenue Ops Manager", "Sales Enablement Manager"], ["P2", "P3", "P4"])

    # Customer Success
    batch(["Customer Onboarding", "Churn Prevention", "Customer Health Scoring",
           "Renewal Management", "Upselling / Cross-Selling",
           "Customer Journey Mapping", "NPS / CSAT Management"],
          d, dn, "Customer Success", "behavioral", "medium", "growing",
          ["Customer Success Manager", "CSM Lead", "VP Customer Success"], ["P1", "P2", "P3", "P4"])

    # Business Development
    batch(["Partnership Development", "Market Entry Strategy",
           "Proposal & RFP Writing", "Competitive Intelligence",
           "Pricing Strategy"],
          d, dn, "Business Development", "behavioral", "medium", "stable",
          ["Business Development Manager", "Partnerships Manager", "Strategy Lead"], ["P2", "P3", "P4"])

    # Pre-Sales & Solutions
    batch(["Technical Pre-Sales", "Solution Architecture", "Demo & POC Delivery",
           "Value Engineering", "ROI Analysis", "Technical Proposal Writing"],
          d, dn, "Pre-Sales & Solutions", "technical", "medium", "stable",
          ["Solutions Engineer", "Pre-Sales Consultant", "Solutions Architect"], ["P2", "P3", "P4", "T3"])

    # ══════════════════════════════════════════════════════════
    # MARKETING & COMMUNICATIONS  (dom_mktg) — 33 skills
    # ══════════════════════════════════════════════════════════
    d, dn = "dom_mktg", "Marketing & Communications"

    # Digital Marketing
    batch(["SEO / SEM", "Paid Advertising (Google/Meta Ads)", "Email Marketing",
           "Social Media Marketing", "Content Marketing", "Marketing Automation (HubSpot/Marketo)",
           "Conversion Rate Optimization"],
          d, dn, "Digital Marketing", "technical", "high", "stable",
          ["Digital Marketer", "Growth Marketer", "Marketing Manager"], ["P1", "P2", "P3", "P4"])

    # Brand & Creative
    batch(["Brand Strategy", "Graphic Design", "Copywriting", "Video Production",
           "UX Writing", "Creative Direction"],
          d, dn, "Brand & Creative", "behavioral", "medium", "stable",
          ["Brand Manager", "Creative Director", "Copywriter", "Designer"], ["P2", "P3", "P4"])

    # Product Marketing
    batch(["Go-to-Market Strategy", "Product Positioning & Messaging",
           "Competitive Analysis", "Market Research", "Customer Segmentation",
           "Analyst Relations"],
          d, dn, "Product Marketing", "behavioral", "medium", "stable",
          ["Product Marketing Manager", "PMM Lead", "VP Marketing"], ["P2", "P3", "P4"])

    # Communications
    batch(["Public Relations", "Internal Communications", "Crisis Communications",
           "Executive Communications", "Corporate Social Responsibility",
           "Event Planning & Management"],
          d, dn, "Communications", "behavioral", "medium", "stable",
          ["Communications Manager", "PR Manager", "Internal Comms Lead"], ["P2", "P3", "P4"])

    # Marketing Analytics
    batch(["Marketing Attribution", "Campaign Performance Analysis",
           "Customer Lifetime Value Modeling", "Marketing Mix Modeling",
           "Web Analytics (Google Analytics)", "Marketing ROI Measurement",
           "Audience Analytics", "Brand Tracking"],
          d, dn, "Marketing Analytics", "technical", "high", "growing",
          ["Marketing Analyst", "Growth Analyst", "Data-Driven Marketer"], ["P2", "P3", "P4"])

    # ══════════════════════════════════════════════════════════
    # LEGAL & COMPLIANCE  (dom_legal) — 27 skills
    # ══════════════════════════════════════════════════════════
    d, dn = "dom_legal", "Legal & Compliance"

    # Corporate Law
    batch(["Contract Drafting & Review", "Corporate Governance", "M&A Legal Due Diligence",
           "Securities Law", "Commercial Agreements", "Entity Management"],
          d, dn, "Corporate Law", "technical", "medium", "stable",
          ["Corporate Counsel", "General Counsel", "M&A Lawyer"], ["P2", "P3", "P4"])

    # Regulatory Compliance
    batch(["Regulatory Compliance Management", "Anti-Money Laundering (AML)",
           "Data Protection (GDPR/CCPA)", "Export Controls", "ESG Compliance",
           "Industry-Specific Regulation"],
          d, dn, "Regulatory Compliance", "technical", "low", "growing",
          ["Compliance Officer", "Compliance Manager", "Chief Compliance Officer"], ["P2", "P3", "P4"])

    # Intellectual Property
    batch(["Patent Law", "Trademark Management", "IP Portfolio Strategy",
           "Licensing & Royalties"],
          d, dn, "Intellectual Property", "technical", "low", "stable",
          ["IP Counsel", "Patent Attorney", "IP Manager"], ["P3", "P4"])

    # Employment Law
    batch(["Employment Law", "Labor Relations", "Workplace Investigations",
           "Immigration Law"],
          d, dn, "Employment Law", "technical", "low", "stable",
          ["Employment Lawyer", "HR Counsel", "Labor Attorney"], ["P3", "P4"])

    # Risk & Ethics
    batch(["Enterprise Risk Management", "Ethics Program Management",
           "Whistleblower Programs", "Third-Party Risk Management",
           "Policy Development", "Legal Operations", "E-Discovery"],
          d, dn, "Risk & Ethics", "technical", "medium", "growing",
          ["Risk Manager", "Ethics Officer", "Legal Ops Manager"], ["P2", "P3", "P4"])

    # ══════════════════════════════════════════════════════════
    # STRATEGY & CONSULTING  (dom_strategy) — 27 skills
    # ══════════════════════════════════════════════════════════
    d, dn = "dom_strategy", "Strategy & Consulting"

    # Strategy Development
    batch(["Strategic Planning", "Business Case Development", "Market Analysis",
           "Competitive Strategy", "Corporate Strategy", "Growth Strategy",
           "Portfolio Strategy", "Strategic Partnerships"],
          d, dn, "Strategy Development", "behavioral", "low", "stable",
          ["Strategy Consultant", "Strategy Director", "Chief Strategy Officer"], ["P3", "P4", "S3", "S4"])

    # Management Consulting
    batch(["Hypothesis-Driven Problem Solving", "Stakeholder Interviewing",
           "Workshop Facilitation", "Executive Presentation",
           "Business Process Reengineering", "Operating Model Design",
           "Due Diligence (Commercial)"],
          d, dn, "Management Consulting", "behavioral", "medium", "stable",
          ["Management Consultant", "Principal", "Partner"], ["P2", "P3", "P4"])

    # Innovation
    batch(["Design Thinking", "Innovation Management", "Venture Building",
           "Technology Scouting", "Business Model Innovation",
           "Rapid Prototyping"],
          d, dn, "Innovation", "behavioral", "low", "growing",
          ["Innovation Manager", "Design Strategist", "Venture Lead"], ["P2", "P3", "P4"])

    # Analytics Consulting
    batch(["Data Strategy", "Analytics Maturity Assessment",
           "Data Monetization", "Advanced Analytics Advisory",
           "Digital Transformation Strategy", "AI Strategy & Roadmap"],
          d, dn, "Analytics Consulting", "behavioral", "low", "growing",
          ["Analytics Consultant", "Data Strategy Lead", "CDO"], ["P3", "P4", "S3", "S4"])

    # ══════════════════════════════════════════════════════════
    # LEADERSHIP & MANAGEMENT  (dom_leadership) — 32 skills
    # ══════════════════════════════════════════════════════════
    d, dn = "dom_leadership", "Leadership & Management"

    # People Leadership
    batch(["Team Building", "Performance Coaching", "Talent Development",
           "Delegation & Empowerment", "Conflict Resolution",
           "Diversity & Inclusion Leadership", "Remote Team Management",
           "Employee Motivation"],
          d, dn, "People Leadership", "leadership", "low", "stable",
          ["Manager", "Director", "VP", "C-Suite"], ["P3", "P4", "S2", "S3", "S4"])

    # Organizational Leadership
    batch(["Vision & Mission Setting", "Organizational Change Leadership",
           "Culture Building", "Cross-Functional Collaboration",
           "Executive Decision Making", "Board Communication",
           "Crisis Leadership", "Transformational Leadership"],
          d, dn, "Organizational Leadership", "leadership", "low", "stable",
          ["VP", "SVP", "C-Suite", "Managing Director"], ["S3", "S4", "S5"])

    # Management Skills
    batch(["Goal Setting (OKRs/KPIs)", "Meeting Facilitation",
           "Budget Management", "Vendor & Partner Management",
           "Time Management & Prioritization", "Process Documentation",
           "Team Communication", "Feedback & Recognition"],
          d, dn, "Management Skills", "leadership", "medium", "stable",
          ["Team Lead", "Manager", "Senior Manager", "Director"], ["P3", "P4", "S1", "S2", "S3"])

    # Executive Skills
    batch(["Strategic Thinking", "Executive Presence",
           "Investor Relations", "P&L Management",
           "Enterprise Sales Leadership", "M&A Integration",
           "Regulatory Engagement", "Industry Thought Leadership"],
          d, dn, "Executive Skills", "leadership", "low", "stable",
          ["VP", "SVP", "C-Suite", "Managing Director", "Partner"], ["S3", "S4", "S5"])

    # ══════════════════════════════════════════════════════════
    # DIGITAL & AI  (dom_digital) — 38 skills
    # ══════════════════════════════════════════════════════════
    d, dn = "dom_digital", "Digital & AI"

    # AI & Machine Learning
    batch(["Prompt Engineering", "Large Language Model (LLM) Applications",
           "AI Ethics & Responsible AI", "AI Product Management",
           "Conversational AI Design", "Computer Vision Applications",
           "AI Model Fine-Tuning", "AI Safety & Alignment"],
          d, dn, "AI & Machine Learning", "digital", "low", "growing",
          ["AI Engineer", "ML Engineer", "AI Product Manager", "AI Researcher"], ["T3", "T4", "T5"])

    # Data Science & Advanced Analytics
    batch(["Predictive Analytics", "Prescriptive Analytics",
           "Graph Analytics", "Text Mining & NLP",
           "Anomaly Detection", "Optimization Algorithms"],
          d, dn, "Data Science & Advanced Analytics", "digital", "low", "growing",
          ["Data Scientist", "ML Engineer", "Analytics Lead"], ["T3", "T4", "T5"])

    # Digital Transformation
    batch(["Digital Strategy", "Customer Experience (CX) Design",
           "Digital Product Development", "Agile at Scale (SAFe/LeSS)",
           "Digital Operating Model", "Platform Business Models",
           "API Economy & Ecosystems", "Digital Twins"],
          d, dn, "Digital Transformation", "digital", "low", "growing",
          ["Digital Transformation Lead", "Product Manager", "CTO", "CDO"], ["P3", "P4", "S3", "S4"])

    # Automation & RPA
    batch(["Robotic Process Automation (RPA)", "Intelligent Document Processing",
           "Workflow Automation", "Process Mining",
           "Low-Code / No-Code Platforms", "Hyperautomation Strategy"],
          d, dn, "Automation & RPA", "digital", "medium", "growing",
          ["Automation Engineer", "RPA Developer", "Process Analyst"], ["P2", "P3", "P4", "T2", "T3"])

    # Emerging Technologies
    batch(["Blockchain / Web3", "IoT Applications", "AR/VR / Metaverse",
           "Quantum Computing Fundamentals", "Edge Computing",
           "5G & Connectivity", "Synthetic Data Generation",
           "Generative AI Applications", "AI Agents & Agentic Systems",
           "Retrieval-Augmented Generation (RAG)"],
          d, dn, "Emerging Technologies", "digital", "low", "growing",
          ["Innovation Engineer", "Emerging Tech Lead", "R&D Engineer"], ["T3", "T4", "T5"])

    # ══════════════════════════════════════════════════════════
    # INDUSTRY-SPECIFIC  (dom_industry) — 40 skills
    # ══════════════════════════════════════════════════════════
    d, dn = "dom_industry", "Industry-Specific"

    # Financial Services
    batch(["Credit Risk Analysis", "DCF Modeling", "Bloomberg Terminal",
           "Regulatory Compliance (SEC/FINRA)", "Portfolio Construction",
           "Fixed Income Analysis", "Derivatives Pricing", "AML/KYC",
           "Capital Markets", "Basel III/IV"],
          d, dn, "Financial Services", "industry", "medium", "stable",
          ["Investment Banker", "Risk Analyst", "Portfolio Manager", "Compliance Officer"],
          ["P2", "P3", "P4"], industries=["financial_services"])

    # Technology Industry
    batch(["Kubernetes", "CI/CD Pipeline Design (Advanced)", "API Design (Advanced)",
           "Microservices (Advanced)", "React / Angular / Vue (Advanced)",
           "Mobile Development (Advanced)", "Cloud Architecture (AWS)",
           "Cloud Architecture (GCP)", "Cloud Architecture (Azure)",
           "Infrastructure as Code (Advanced)"],
          d, dn, "Technology", "industry", "low", "growing",
          ["Software Engineer", "Platform Engineer", "Cloud Architect", "DevOps Lead"],
          ["T3", "T4", "T5"], industries=["technology"])

    # Healthcare
    batch(["Clinical Documentation", "HIPAA Compliance", "EHR Systems (Epic/Cerner)",
           "Medical Coding (ICD-10)", "Revenue Cycle Management",
           "Patient Safety", "Care Coordination", "Telehealth",
           "Clinical Trials", "Pharmaceutical Knowledge"],
          d, dn, "Healthcare", "industry", "medium", "growing",
          ["Clinical Analyst", "Health IT Specialist", "Revenue Cycle Manager", "Clinical Coordinator"],
          ["P2", "P3", "P4"], industries=["healthcare"])

    # Manufacturing
    batch(["Lean / Six Sigma", "Quality Management Systems (ISO 9001)",
           "Supply Chain Optimization", "Production Planning",
           "Predictive Maintenance", "Industrial IoT",
           "Safety Management (OSHA)", "CAD/CAM",
           "Process Engineering", "Inventory Management"],
          d, dn, "Manufacturing", "industry", "medium", "stable",
          ["Manufacturing Engineer", "Quality Manager", "Plant Manager", "Supply Chain Manager"],
          ["P2", "P3", "P4"], industries=["manufacturing"])

    # ══════════════════════════════════════════════════════════
    # UNIVERSAL / CORE  (dom_universal) — 32 skills
    # ══════════════════════════════════════════════════════════
    d, dn = "dom_universal", "Universal / Core"

    # Communication
    batch(["Written Communication", "Verbal Communication",
           "Presentation Skills", "Active Listening",
           "Storytelling", "Cross-Cultural Communication",
           "Technical Writing"],
          d, dn, "Communication", "behavioral", "medium", "stable",
          ["All Roles"], ["P1", "P2", "P3", "P4", "S1", "S2", "S3", "S4"])

    # Analytical Thinking
    batch(["Critical Thinking", "Problem Solving", "Decision Making",
           "Systems Thinking", "Root Cause Analysis",
           "Data-Driven Decision Making", "Logical Reasoning"],
          d, dn, "Analytical Thinking", "behavioral", "low", "stable",
          ["All Roles"], ["P1", "P2", "P3", "P4", "S1", "S2", "S3", "S4"])

    # Collaboration & Interpersonal
    batch(["Teamwork & Collaboration", "Influence Without Authority",
           "Relationship Building", "Emotional Intelligence",
           "Networking", "Empathy"],
          d, dn, "Collaboration & Interpersonal", "behavioral", "low", "stable",
          ["All Roles"], ["P2", "P3", "P4", "S1", "S2", "S3"])

    # Self-Management
    batch(["Adaptability & Resilience", "Growth Mindset",
           "Self-Awareness", "Accountability",
           "Continuous Learning", "Work-Life Balance Management"],
          d, dn, "Self-Management", "behavioral", "low", "stable",
          ["All Roles"], ["P1", "P2", "P3", "P4", "S1", "S2", "S3", "S4"])

    # Digital Literacy
    batch(["AI Literacy", "Digital Collaboration Tools",
           "Information Security Awareness", "Data Literacy",
           "Digital Communication", "Basic Coding / Scripting"],
          d, dn, "Digital Literacy", "digital", "high", "growing",
          ["All Roles"], ["P1", "P2", "P3", "P4", "S1", "S2", "S3"])

    return skills


# ═══════════════════════════════════════
# SKILLS LIBRARY CLASS
# ═══════════════════════════════════════

class SkillsLibrary:
    """Master skills library — single source of truth for all skills across the platform."""

    def __init__(self):
        self.skills: dict[str, dict] = {}  # skill_id -> skill
        self.domains = DOMAINS
        self.categories: dict[str, list[str]] = {}  # domain_id -> [category names]
        self._seed()

    def _seed(self):
        all_skills = _generate_skills()
        for s in all_skills:
            self.skills[s["skill_id"]] = s
        # Build category index
        cat_sets: dict[str, set] = {}
        for s in all_skills:
            cat_sets.setdefault(s["domain_id"], set()).add(s["category"])
        self.categories = {k: sorted(v) for k, v in cat_sets.items()}
        print(f"[SkillsLibrary] Seeded {len(self.skills)} skills across {len(self.domains)} domains")

    # ── Search & Query ──

    def search(self, query="", domain=None, category=None, skill_type=None,
               ai_impact=None, trend=None, page=1, limit=50):
        results = list(self.skills.values())
        if query:
            q = query.lower()
            results = [s for s in results if q in s["name"].lower()
                       or q in s.get("description", "").lower()
                       or q in s.get("category", "").lower()]
        if domain and domain != "All":
            results = [s for s in results if s.get("domain_id") == domain or s.get("domain") == domain]
        if category and category != "All":
            results = [s for s in results if s.get("category") == category]
        if skill_type and skill_type != "All":
            results = [s for s in results if s.get("type") == skill_type]
        if ai_impact and ai_impact != "All":
            results = [s for s in results if s.get("ai_impact") == ai_impact]
        if trend and trend != "All":
            results = [s for s in results if s.get("demand_trend") == trend]
        total = len(results)
        start = (page - 1) * limit
        return {
            "skills": results[start:start + limit],
            "total": total,
            "page": page,
            "pages": (total + limit - 1) // limit,
        }

    def get(self, skill_id):
        return self.skills.get(skill_id)

    def add(self, data):
        sid = data.get("skill_id", _id())
        data["skill_id"] = sid
        data.setdefault("created_at", _now())
        data.setdefault("source", "manual")
        self.skills[sid] = data
        # Update category index
        dom = data.get("domain_id", "")
        cat = data.get("category", "")
        if dom and cat:
            if dom not in self.categories:
                self.categories[dom] = []
            if cat not in self.categories[dom]:
                self.categories[dom] = sorted(set(self.categories[dom]) | {cat})
        return data

    def update(self, skill_id, data):
        if skill_id not in self.skills:
            return None
        self.skills[skill_id].update(data)
        self.skills[skill_id]["updated_at"] = _now()
        return self.skills[skill_id]

    def delete(self, skill_id):
        return self.skills.pop(skill_id, None)

    # ── Domain Tree ──

    def get_domains_tree(self):
        tree = []
        for dom in self.domains:
            cats = self.categories.get(dom["id"], [])
            cat_nodes = []
            for cat in cats:
                count = len([s for s in self.skills.values()
                             if s.get("domain_id") == dom["id"] and s.get("category") == cat])
                cat_nodes.append({"name": cat, "count": count})
            tree.append({
                **dom,
                "categories": cat_nodes,
                "total_skills": sum(c["count"] for c in cat_nodes),
            })
        return tree

    # ── Adjacency / Related Skills ──

    def get_adjacencies(self, skill_id):
        skill = self.skills.get(skill_id)
        if not skill:
            return []
        # Skills in the same category
        same_cat = [s for s in self.skills.values()
                    if s.get("category") == skill.get("category") and s["skill_id"] != skill_id]
        # Skills that share typical_roles but different category
        my_roles = set(skill.get("typical_roles", []))
        related = [s for s in self.skills.values()
                   if s["skill_id"] != skill_id
                   and set(s.get("typical_roles", [])) & my_roles
                   and s.get("category") != skill.get("category")]
        return same_cat[:10] + related[:5]

    # ── Role Matching ──

    def match_to_role(self, role_title, level="P2", function="", industry=None):
        """Suggest skills for a role based on title, level, and function."""
        results = []
        q = role_title.lower()
        for s in self.skills.values():
            score = 0
            # Check typical_roles
            for r in s.get("typical_roles", []):
                if any(w in r.lower() for w in q.split() if len(w) > 2):
                    score += 3
            # Check if level matches
            if level in s.get("typical_levels", []):
                score += 1
            # Industry match
            if industry and industry.lower() in str(s.get("industries", [])).lower():
                score += 2
            if score > 0:
                target = min(4, int(level[1]) if len(level) > 1 and level[1].isdigit() else 2)
                results.append({**s, "_match_score": score, "_target_proficiency": target})
        results.sort(key=lambda x: -x["_match_score"])
        return results[:15]

    # ── Industry Filter ──

    def get_for_industry(self, industry):
        """Get skills tagged for a specific industry."""
        ind_lower = industry.lower().replace("_", " ")
        return [s for s in self.skills.values()
                if ind_lower in str(s.get("industries", [])).lower()
                or s.get("domain_id") == "dom_universal"]

    # ── Stats ──

    def get_stats(self):
        """Summary statistics about the library."""
        by_domain = {}
        by_type = {}
        by_impact = {}
        by_trend = {}
        for s in self.skills.values():
            by_domain[s.get("domain", "Unknown")] = by_domain.get(s.get("domain", "Unknown"), 0) + 1
            by_type[s.get("type", "unknown")] = by_type.get(s.get("type", "unknown"), 0) + 1
            by_impact[s.get("ai_impact", "unknown")] = by_impact.get(s.get("ai_impact", "unknown"), 0) + 1
            by_trend[s.get("demand_trend", "unknown")] = by_trend.get(s.get("demand_trend", "unknown"), 0) + 1
        return {
            "total_skills": len(self.skills),
            "total_domains": len(self.domains),
            "total_categories": sum(len(v) for v in self.categories.values()),
            "by_domain": by_domain,
            "by_type": by_type,
            "by_ai_impact": by_impact,
            "by_trend": by_trend,
        }


# ── Singleton ──
skills_library = SkillsLibrary()
