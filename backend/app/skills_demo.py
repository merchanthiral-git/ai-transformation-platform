"""Demo seed data for the Skills Engine."""

# ─────────────────────────────────────────────────────────────────────────────
# Skill IDs (deterministic for cross-referencing)
# ─────────────────────────────────────────────────────────────────────────────

# Technical (15)
_PYTHON        = "sk-py001"
_SQL           = "sk-sq002"
_DATAVIZ       = "sk-dv003"
_ML            = "sk-ml004"
_CLOUD         = "sk-cl005"
_API           = "sk-ap006"
_STATS         = "sk-st007"
_CYBER         = "sk-cy008"
_DEVOPS        = "sk-do009"
_DATAENG       = "sk-de010"
_MLOPS         = "sk-mo011"
_RPA           = "sk-rp012"
_NLP           = "sk-nl013"
_EXCEL         = "sk-ex014"
_BITOOLS       = "sk-bi015"

# Functional (12)
_FINAN         = "sk-fa016"
_PROJMGMT      = "sk-pm017"
_PROCDES       = "sk-pd018"
_VENDMGMT      = "sk-vm019"
_REGCOMP       = "sk-rc020"
_RISKASS       = "sk-ra021"
_MKTRES        = "sk-mr022"
_CONTRACT      = "sk-cn023"
_BUDGET        = "sk-bp024"
_QA            = "sk-qa025"
_SUPPLY        = "sk-sc026"
_CRM           = "sk-cr027"

# Leadership (8)
_STRATPLAN     = "sk-sp028"
_TEAMDEV       = "sk-td029"
_CHANGEMGMT    = "sk-cm030"
_EXECCOMM      = "sk-ec031"
_STAKEHOLDER   = "sk-sh032"
_DECISION      = "sk-du033"
_CROSSFUNC     = "sk-cf034"
_TALENTDEV     = "sk-tl035"

# Adaptive (8)
_CRITTHINK     = "sk-ct036"
_LEARNAGIL     = "sk-la037"
_EMOINTELL     = "sk-ei038"
_AMBIGTOL      = "sk-at039"
_DIGFLU        = "sk-df040"
_SYSTHINK      = "sk-sy041"
_CREATIVE      = "sk-cp042"
_ETHICAL       = "sk-er043"


# ─────────────────────────────────────────────────────────────────────────────
# Job IDs
# ─────────────────────────────────────────────────────────────────────────────
_JOB_SWE       = "job-swe01"
_JOB_DS        = "job-ds002"
_JOB_FA        = "job-fa003"
_JOB_HRBP      = "job-hr004"
_JOB_PM        = "job-pm005"
_JOB_MKT       = "job-mk006"
_JOB_OPS       = "job-op007"
_JOB_SEC       = "job-sc008"
_JOB_SCM       = "job-sm009"
_JOB_PROJ      = "job-pj010"


# ─────────────────────────────────────────────────────────────────────────────
# DEMO_SKILLS  (43 total)
# ─────────────────────────────────────────────────────────────────────────────
DEMO_SKILLS = [
    # ── Technical (15) ──
    {
        "id": _PYTHON,
        "name": "Python",
        "description": "Proficiency in the Python programming language including core libraries, data structures, and software design patterns. Encompasses scripting, automation, and building production-grade applications.",
        "category": "technical",
        "subcategory": "Programming Languages",
        "proficiency_scale": {
            "1": "Can write basic scripts and use standard libraries with guidance.",
            "2": "Builds standalone modules, writes unit tests, and uses virtual environments independently.",
            "3": "Designs complex systems, optimises performance, and mentors others on best practices.",
            "4": "Architects enterprise-grade frameworks, contributes to open-source, and sets organisational standards.",
        },
        "metadata": {
            "transferability": 0.85,
            "automation_susceptibility": 0.35,
            "strategic_importance": "critical",
            "trend": "rising",
            "half_life_months": 36,
        },
        "adjacencies": [_ML, _API, _DATAENG, _STATS],
        "created_at": "2025-01-15T08:00:00",
        "updated_at": "2025-01-15T08:00:00",
    },
    {
        "id": _SQL,
        "name": "SQL",
        "description": "Ability to write structured query language for relational databases including complex joins, window functions, and query optimisation. Covers both analytical and transactional use cases.",
        "category": "technical",
        "subcategory": "Data & Analytics",
        "proficiency_scale": {
            "1": "Writes basic SELECT queries with simple WHERE clauses.",
            "2": "Uses joins, subqueries, and aggregation functions confidently.",
            "3": "Optimises query plans, designs schemas, and implements stored procedures.",
            "4": "Architects data warehouse models, tunes database engines, and establishes data governance standards.",
        },
        "metadata": {
            "transferability": 0.90,
            "automation_susceptibility": 0.45,
            "strategic_importance": "critical",
            "trend": "stable",
            "half_life_months": 60,
        },
        "adjacencies": [_DATAENG, _BITOOLS, _DATAVIZ],
        "created_at": "2025-01-15T08:00:00",
        "updated_at": "2025-01-15T08:00:00",
    },
    {
        "id": _DATAVIZ,
        "name": "Data Visualization",
        "description": "Creating clear, accurate, and compelling visual representations of data using charts, dashboards, and interactive graphics. Includes storytelling with data and audience-appropriate design.",
        "category": "technical",
        "subcategory": "Data & Analytics",
        "proficiency_scale": {
            "1": "Creates basic charts and tables using standard templates.",
            "2": "Builds interactive dashboards and selects appropriate chart types for different audiences.",
            "3": "Designs data narratives, implements custom visualisations, and integrates real-time data feeds.",
            "4": "Establishes enterprise visualisation standards and builds reusable component libraries.",
        },
        "metadata": {
            "transferability": 0.80,
            "automation_susceptibility": 0.30,
            "strategic_importance": "important",
            "trend": "rising",
            "half_life_months": 30,
        },
        "adjacencies": [_STATS, _BITOOLS, _SQL],
        "created_at": "2025-01-15T08:00:00",
        "updated_at": "2025-01-15T08:00:00",
    },
    {
        "id": _ML,
        "name": "Machine Learning",
        "description": "Designing, training, and deploying machine learning models including supervised, unsupervised, and reinforcement learning approaches. Encompasses feature engineering, model evaluation, and production deployment.",
        "category": "technical",
        "subcategory": "AI & Machine Learning",
        "proficiency_scale": {
            "1": "Understands core ML concepts and can apply pre-built models to standard datasets.",
            "2": "Trains and evaluates models independently, performs feature engineering and hyperparameter tuning.",
            "3": "Designs end-to-end ML pipelines, selects architectures, and handles edge cases in production.",
            "4": "Publishes novel approaches, leads ML strategy, and mentors teams on advanced techniques.",
        },
        "metadata": {
            "transferability": 0.70,
            "automation_susceptibility": 0.20,
            "strategic_importance": "critical",
            "trend": "rising",
            "half_life_months": 24,
        },
        "adjacencies": [_PYTHON, _STATS, _NLP, _MLOPS],
        "created_at": "2025-01-15T08:00:00",
        "updated_at": "2025-01-15T08:00:00",
    },
    {
        "id": _CLOUD,
        "name": "Cloud Architecture",
        "description": "Designing and managing cloud infrastructure across major providers (AWS, Azure, GCP). Covers networking, security, cost optimisation, and multi-cloud strategies.",
        "category": "technical",
        "subcategory": "Infrastructure",
        "proficiency_scale": {
            "1": "Deploys basic services using console or guided templates.",
            "2": "Designs multi-service architectures with appropriate security and networking.",
            "3": "Implements infrastructure-as-code, optimises cost, and designs for high availability.",
            "4": "Leads cloud strategy, architects multi-cloud solutions, and drives organisational cloud maturity.",
        },
        "metadata": {
            "transferability": 0.75,
            "automation_susceptibility": 0.25,
            "strategic_importance": "critical",
            "trend": "rising",
            "half_life_months": 24,
        },
        "adjacencies": [_DEVOPS, _CYBER, _API],
        "created_at": "2025-01-15T08:00:00",
        "updated_at": "2025-01-15T08:00:00",
    },
    {
        "id": _API,
        "name": "API Development",
        "description": "Designing, building, and maintaining RESTful and GraphQL APIs. Includes authentication, rate limiting, versioning, and documentation best practices.",
        "category": "technical",
        "subcategory": "Software Engineering",
        "proficiency_scale": {
            "1": "Consumes existing APIs and understands request/response patterns.",
            "2": "Builds RESTful endpoints with proper error handling and validation.",
            "3": "Designs API ecosystems, implements OAuth flows, and creates developer documentation.",
            "4": "Defines API governance frameworks and designs platform-level integration strategies.",
        },
        "metadata": {
            "transferability": 0.80,
            "automation_susceptibility": 0.40,
            "strategic_importance": "important",
            "trend": "stable",
            "half_life_months": 36,
        },
        "adjacencies": [_PYTHON, _CLOUD, _DEVOPS],
        "created_at": "2025-01-15T08:00:00",
        "updated_at": "2025-01-15T08:00:00",
    },
    {
        "id": _STATS,
        "name": "Statistical Analysis",
        "description": "Applying statistical methods to draw conclusions from data including hypothesis testing, regression analysis, and experimental design. Bridges raw data and actionable business insights.",
        "category": "technical",
        "subcategory": "Data & Analytics",
        "proficiency_scale": {
            "1": "Calculates descriptive statistics and interprets basic charts.",
            "2": "Runs hypothesis tests, builds regression models, and identifies statistical significance.",
            "3": "Designs experiments, applies multivariate methods, and communicates uncertainty effectively.",
            "4": "Develops novel analytical frameworks and advises on organisation-wide measurement strategies.",
        },
        "metadata": {
            "transferability": 0.90,
            "automation_susceptibility": 0.30,
            "strategic_importance": "important",
            "trend": "stable",
            "half_life_months": 72,
        },
        "adjacencies": [_ML, _DATAVIZ, _PYTHON],
        "created_at": "2025-01-15T08:00:00",
        "updated_at": "2025-01-15T08:00:00",
    },
    {
        "id": _CYBER,
        "name": "Cybersecurity",
        "description": "Protecting systems, networks, and data from digital threats. Encompasses threat modelling, vulnerability assessment, incident response, and compliance with security standards.",
        "category": "technical",
        "subcategory": "Security",
        "proficiency_scale": {
            "1": "Follows security policies and recognises common threats.",
            "2": "Conducts vulnerability scans, configures firewalls, and responds to standard incidents.",
            "3": "Designs security architectures, leads penetration testing, and builds incident response plans.",
            "4": "Sets enterprise security strategy, manages threat intelligence programs, and drives security culture.",
        },
        "metadata": {
            "transferability": 0.65,
            "automation_susceptibility": 0.20,
            "strategic_importance": "critical",
            "trend": "rising",
            "half_life_months": 18,
        },
        "adjacencies": [_CLOUD, _DEVOPS, _REGCOMP],
        "created_at": "2025-01-15T08:00:00",
        "updated_at": "2025-01-15T08:00:00",
    },
    {
        "id": _DEVOPS,
        "name": "DevOps",
        "description": "Integrating development and operations through CI/CD pipelines, containerisation, monitoring, and infrastructure automation. Aims to increase deployment frequency and reliability.",
        "category": "technical",
        "subcategory": "Infrastructure",
        "proficiency_scale": {
            "1": "Uses basic CI/CD tools and understands containerisation concepts.",
            "2": "Builds pipelines, manages container orchestration, and configures monitoring.",
            "3": "Designs platform engineering solutions, implements GitOps, and optimises release processes.",
            "4": "Leads DevOps transformation, establishes SRE practices, and drives organisational platform strategy.",
        },
        "metadata": {
            "transferability": 0.70,
            "automation_susceptibility": 0.35,
            "strategic_importance": "important",
            "trend": "stable",
            "half_life_months": 24,
        },
        "adjacencies": [_CLOUD, _API, _PYTHON],
        "created_at": "2025-01-15T08:00:00",
        "updated_at": "2025-01-15T08:00:00",
    },
    {
        "id": _DATAENG,
        "name": "Data Engineering",
        "description": "Building and maintaining data pipelines, warehouses, and lakes that enable analytics and machine learning. Covers ETL/ELT, data quality, and scalable storage architectures.",
        "category": "technical",
        "subcategory": "Data & Analytics",
        "proficiency_scale": {
            "1": "Runs basic ETL scripts and understands data flow concepts.",
            "2": "Builds data pipelines with scheduling, error handling, and basic quality checks.",
            "3": "Architects data platforms, implements streaming pipelines, and designs data governance.",
            "4": "Leads enterprise data strategy, evaluates emerging technologies, and defines data mesh architectures.",
        },
        "metadata": {
            "transferability": 0.75,
            "automation_susceptibility": 0.30,
            "strategic_importance": "critical",
            "trend": "rising",
            "half_life_months": 24,
        },
        "adjacencies": [_SQL, _PYTHON, _CLOUD, _ML],
        "created_at": "2025-01-15T08:00:00",
        "updated_at": "2025-01-15T08:00:00",
    },
    {
        "id": _MLOPS,
        "name": "AI/ML Operations",
        "description": "Operationalising machine learning models through versioning, monitoring, retraining pipelines, and model governance. Ensures ML systems remain reliable and performant in production.",
        "category": "technical",
        "subcategory": "AI & Machine Learning",
        "proficiency_scale": {
            "1": "Understands model deployment concepts and basic monitoring.",
            "2": "Deploys models to production, sets up drift detection, and manages model registries.",
            "3": "Designs MLOps platforms, implements A/B testing frameworks, and automates retraining.",
            "4": "Defines enterprise ML governance, leads responsible AI initiatives, and architects multi-model serving.",
        },
        "metadata": {
            "transferability": 0.60,
            "automation_susceptibility": 0.25,
            "strategic_importance": "critical",
            "trend": "rising",
            "half_life_months": 18,
        },
        "adjacencies": [_ML, _DEVOPS, _CLOUD],
        "created_at": "2025-01-15T08:00:00",
        "updated_at": "2025-01-15T08:00:00",
    },
    {
        "id": _RPA,
        "name": "Robotic Process Automation",
        "description": "Designing and implementing software robots to automate repetitive business processes. Covers tool selection, process analysis, bot development, and maintenance.",
        "category": "technical",
        "subcategory": "Automation",
        "proficiency_scale": {
            "1": "Records and runs basic automated workflows using RPA tools.",
            "2": "Develops attended and unattended bots with exception handling.",
            "3": "Designs automation centres of excellence and complex multi-system workflows.",
            "4": "Leads enterprise intelligent automation strategy combining RPA with AI and process mining.",
        },
        "metadata": {
            "transferability": 0.55,
            "automation_susceptibility": 0.60,
            "strategic_importance": "important",
            "trend": "stable",
            "half_life_months": 30,
        },
        "adjacencies": [_PROCDES, _PYTHON, _EXCEL],
        "created_at": "2025-01-15T08:00:00",
        "updated_at": "2025-01-15T08:00:00",
    },
    {
        "id": _NLP,
        "name": "Natural Language Processing",
        "description": "Building systems that understand, interpret, and generate human language. Covers text classification, sentiment analysis, named entity recognition, and large language model integration.",
        "category": "technical",
        "subcategory": "AI & Machine Learning",
        "proficiency_scale": {
            "1": "Uses pre-trained NLP models and APIs for basic text tasks.",
            "2": "Fine-tunes models, builds text pipelines, and evaluates NLP system performance.",
            "3": "Designs multi-modal NLP systems, implements RAG architectures, and handles multilingual challenges.",
            "4": "Leads NLP research initiatives, develops novel architectures, and sets responsible AI guidelines for language models.",
        },
        "metadata": {
            "transferability": 0.65,
            "automation_susceptibility": 0.15,
            "strategic_importance": "critical",
            "trend": "rising",
            "half_life_months": 18,
        },
        "adjacencies": [_ML, _PYTHON, _MLOPS],
        "created_at": "2025-01-15T08:00:00",
        "updated_at": "2025-01-15T08:00:00",
    },
    {
        "id": _EXCEL,
        "name": "Excel / Advanced Spreadsheets",
        "description": "Advanced use of spreadsheet tools for data analysis, financial modelling, and reporting. Includes formulas, pivot tables, VBA macros, and Power Query.",
        "category": "technical",
        "subcategory": "Productivity Tools",
        "proficiency_scale": {
            "1": "Uses basic formulas, sorting, and filtering.",
            "2": "Builds pivot tables, uses VLOOKUP/INDEX-MATCH, and creates charts.",
            "3": "Writes VBA macros, uses Power Query, and builds complex financial models.",
            "4": "Designs enterprise reporting templates, integrates with external data sources, and trains others.",
        },
        "metadata": {
            "transferability": 0.95,
            "automation_susceptibility": 0.70,
            "strategic_importance": "supporting",
            "trend": "declining",
            "half_life_months": 48,
        },
        "adjacencies": [_FINAN, _BITOOLS, _DATAVIZ],
        "created_at": "2025-01-15T08:00:00",
        "updated_at": "2025-01-15T08:00:00",
    },
    {
        "id": _BITOOLS,
        "name": "Business Intelligence Tools",
        "description": "Using BI platforms (Tableau, Power BI, Looker) to create dashboards, reports, and self-service analytics. Covers data modelling within BI tools and stakeholder-driven design.",
        "category": "technical",
        "subcategory": "Data & Analytics",
        "proficiency_scale": {
            "1": "Navigates existing dashboards and applies basic filters.",
            "2": "Creates dashboards, builds calculated fields, and connects data sources.",
            "3": "Designs enterprise BI solutions, implements row-level security, and optimises data models.",
            "4": "Defines BI strategy, evaluates platforms, and drives data democratisation across the organisation.",
        },
        "metadata": {
            "transferability": 0.75,
            "automation_susceptibility": 0.40,
            "strategic_importance": "important",
            "trend": "stable",
            "half_life_months": 30,
        },
        "adjacencies": [_SQL, _DATAVIZ, _EXCEL],
        "created_at": "2025-01-15T08:00:00",
        "updated_at": "2025-01-15T08:00:00",
    },

    # ── Functional (12) ──
    {
        "id": _FINAN,
        "name": "Financial Analysis",
        "description": "Evaluating financial data to support business decisions including forecasting, variance analysis, and financial modelling. Bridges accounting data and strategic recommendations.",
        "category": "functional",
        "subcategory": "Finance",
        "proficiency_scale": {
            "1": "Reads financial statements and performs basic ratio analysis.",
            "2": "Builds financial models, conducts variance analysis, and prepares management reports.",
            "3": "Leads budgeting cycles, performs scenario analysis, and advises on capital allocation.",
            "4": "Drives enterprise financial strategy, M&A due diligence, and investor communications.",
        },
        "metadata": {
            "transferability": 0.80,
            "automation_susceptibility": 0.45,
            "strategic_importance": "critical",
            "trend": "stable",
            "half_life_months": 48,
        },
        "adjacencies": [_EXCEL, _BUDGET, _RISKASS],
        "created_at": "2025-01-15T08:00:00",
        "updated_at": "2025-01-15T08:00:00",
    },
    {
        "id": _PROJMGMT,
        "name": "Project Management",
        "description": "Planning, executing, and closing projects using established methodologies (Agile, Waterfall, hybrid). Covers scope, schedule, budget, risk, and stakeholder management.",
        "category": "functional",
        "subcategory": "Operations",
        "proficiency_scale": {
            "1": "Assists with project tasks and follows established plans.",
            "2": "Manages small to medium projects with defined scope and stakeholders.",
            "3": "Leads complex, cross-functional programs and manages project portfolios.",
            "4": "Defines PMO strategy, implements enterprise project governance, and mentors project leaders.",
        },
        "metadata": {
            "transferability": 0.90,
            "automation_susceptibility": 0.25,
            "strategic_importance": "important",
            "trend": "stable",
            "half_life_months": 60,
        },
        "adjacencies": [_STAKEHOLDER, _BUDGET, _RISKASS],
        "created_at": "2025-01-15T08:00:00",
        "updated_at": "2025-01-15T08:00:00",
    },
    {
        "id": _PROCDES,
        "name": "Process Design",
        "description": "Analysing, mapping, and redesigning business processes to improve efficiency and quality. Includes process mining, lean methodology, and continuous improvement frameworks.",
        "category": "functional",
        "subcategory": "Operations",
        "proficiency_scale": {
            "1": "Documents existing processes using standard notation.",
            "2": "Identifies bottlenecks, proposes improvements, and measures process KPIs.",
            "3": "Redesigns end-to-end processes, implements automation, and leads lean transformations.",
            "4": "Establishes enterprise process excellence frameworks and drives organisational operating model design.",
        },
        "metadata": {
            "transferability": 0.85,
            "automation_susceptibility": 0.35,
            "strategic_importance": "important",
            "trend": "rising",
            "half_life_months": 48,
        },
        "adjacencies": [_RPA, _QA, _SUPPLY],
        "created_at": "2025-01-15T08:00:00",
        "updated_at": "2025-01-15T08:00:00",
    },
    {
        "id": _VENDMGMT,
        "name": "Vendor Management",
        "description": "Selecting, onboarding, and managing third-party vendors and service providers. Covers SLA management, performance evaluation, and relationship governance.",
        "category": "functional",
        "subcategory": "Procurement",
        "proficiency_scale": {
            "1": "Participates in vendor meetings and tracks basic SLAs.",
            "2": "Manages vendor relationships, conducts performance reviews, and handles escalations.",
            "3": "Leads vendor selection processes, negotiates contracts, and implements vendor governance.",
            "4": "Defines enterprise vendor strategy, manages strategic partnerships, and drives supplier innovation.",
        },
        "metadata": {
            "transferability": 0.75,
            "automation_susceptibility": 0.30,
            "strategic_importance": "supporting",
            "trend": "stable",
            "half_life_months": 48,
        },
        "adjacencies": [_CONTRACT, _SUPPLY, _RISKASS],
        "created_at": "2025-01-15T08:00:00",
        "updated_at": "2025-01-15T08:00:00",
    },
    {
        "id": _REGCOMP,
        "name": "Regulatory Compliance",
        "description": "Ensuring organisational activities comply with applicable laws, regulations, and standards. Covers policy development, auditing, and regulatory change management.",
        "category": "functional",
        "subcategory": "Risk & Compliance",
        "proficiency_scale": {
            "1": "Follows compliance procedures and escalates potential issues.",
            "2": "Monitors regulatory changes, conducts compliance checks, and prepares documentation.",
            "3": "Designs compliance programs, leads audits, and manages regulatory relationships.",
            "4": "Sets enterprise compliance strategy, manages complex regulatory landscapes, and advises executive leadership.",
        },
        "metadata": {
            "transferability": 0.60,
            "automation_susceptibility": 0.35,
            "strategic_importance": "critical",
            "trend": "rising",
            "half_life_months": 36,
        },
        "adjacencies": [_RISKASS, _CYBER, _ETHICAL],
        "created_at": "2025-01-15T08:00:00",
        "updated_at": "2025-01-15T08:00:00",
    },
    {
        "id": _RISKASS,
        "name": "Risk Assessment",
        "description": "Identifying, analysing, and prioritising risks to organisational objectives. Covers qualitative and quantitative risk methods, mitigation planning, and risk appetite frameworks.",
        "category": "functional",
        "subcategory": "Risk & Compliance",
        "proficiency_scale": {
            "1": "Identifies obvious risks and follows risk registers.",
            "2": "Conducts risk assessments, quantifies impact, and proposes mitigations.",
            "3": "Designs risk frameworks, leads scenario analyses, and integrates risk into decision-making.",
            "4": "Sets enterprise risk appetite, manages complex risk portfolios, and advises boards.",
        },
        "metadata": {
            "transferability": 0.80,
            "automation_susceptibility": 0.25,
            "strategic_importance": "important",
            "trend": "rising",
            "half_life_months": 48,
        },
        "adjacencies": [_REGCOMP, _FINAN, _DECISION],
        "created_at": "2025-01-15T08:00:00",
        "updated_at": "2025-01-15T08:00:00",
    },
    {
        "id": _MKTRES,
        "name": "Market Research",
        "description": "Gathering, analysing, and interpreting market data to inform business strategy. Covers competitive analysis, customer segmentation, and trend identification.",
        "category": "functional",
        "subcategory": "Marketing",
        "proficiency_scale": {
            "1": "Collects secondary research data and summarises findings.",
            "2": "Designs surveys, conducts competitive analysis, and creates market reports.",
            "3": "Leads primary research programs, applies advanced segmentation, and drives insight-to-action processes.",
            "4": "Defines market intelligence strategy, integrates diverse data sources, and advises on market entry decisions.",
        },
        "metadata": {
            "transferability": 0.75,
            "automation_susceptibility": 0.40,
            "strategic_importance": "important",
            "trend": "stable",
            "half_life_months": 36,
        },
        "adjacencies": [_STATS, _CRM, _DATAVIZ],
        "created_at": "2025-01-15T08:00:00",
        "updated_at": "2025-01-15T08:00:00",
    },
    {
        "id": _CONTRACT,
        "name": "Contract Negotiation",
        "description": "Negotiating terms, conditions, and pricing for business agreements. Includes drafting, reviewing, and managing the contract lifecycle from initiation to renewal.",
        "category": "functional",
        "subcategory": "Procurement",
        "proficiency_scale": {
            "1": "Reviews standard contracts and identifies key terms.",
            "2": "Negotiates routine contracts, manages redlines, and tracks obligations.",
            "3": "Leads complex multi-party negotiations and designs contract templates.",
            "4": "Manages strategic partnerships, designs enterprise contract governance, and mentors negotiators.",
        },
        "metadata": {
            "transferability": 0.70,
            "automation_susceptibility": 0.20,
            "strategic_importance": "supporting",
            "trend": "stable",
            "half_life_months": 60,
        },
        "adjacencies": [_VENDMGMT, _REGCOMP, _STAKEHOLDER],
        "created_at": "2025-01-15T08:00:00",
        "updated_at": "2025-01-15T08:00:00",
    },
    {
        "id": _BUDGET,
        "name": "Budget Planning",
        "description": "Developing, monitoring, and managing organisational budgets including forecasting, allocation, and variance tracking. Bridges financial targets and operational execution.",
        "category": "functional",
        "subcategory": "Finance",
        "proficiency_scale": {
            "1": "Tracks expenses against budget and flags variances.",
            "2": "Prepares departmental budgets, creates forecasts, and analyses spending patterns.",
            "3": "Leads enterprise budgeting cycles, models scenarios, and advises on resource allocation.",
            "4": "Defines budgeting strategy, implements zero-based budgeting, and drives financial transformation.",
        },
        "metadata": {
            "transferability": 0.80,
            "automation_susceptibility": 0.50,
            "strategic_importance": "important",
            "trend": "stable",
            "half_life_months": 48,
        },
        "adjacencies": [_FINAN, _PROJMGMT, _EXCEL],
        "created_at": "2025-01-15T08:00:00",
        "updated_at": "2025-01-15T08:00:00",
    },
    {
        "id": _QA,
        "name": "Quality Assurance",
        "description": "Ensuring products and processes meet defined quality standards through testing, auditing, and continuous improvement. Covers both software QA and operational quality management.",
        "category": "functional",
        "subcategory": "Operations",
        "proficiency_scale": {
            "1": "Executes test cases and reports defects following standard procedures.",
            "2": "Designs test plans, performs regression testing, and tracks quality metrics.",
            "3": "Builds QA automation frameworks, leads quality audits, and drives root cause analysis.",
            "4": "Defines enterprise quality strategy, implements TQM programs, and sets organisational quality culture.",
        },
        "metadata": {
            "transferability": 0.75,
            "automation_susceptibility": 0.55,
            "strategic_importance": "supporting",
            "trend": "stable",
            "half_life_months": 36,
        },
        "adjacencies": [_PROCDES, _DEVOPS, _RISKASS],
        "created_at": "2025-01-15T08:00:00",
        "updated_at": "2025-01-15T08:00:00",
    },
    {
        "id": _SUPPLY,
        "name": "Supply Chain Management",
        "description": "Managing the end-to-end flow of goods, information, and finances from supplier to customer. Covers demand planning, logistics, inventory optimisation, and supplier relationships.",
        "category": "functional",
        "subcategory": "Operations",
        "proficiency_scale": {
            "1": "Tracks orders and inventory using standard systems.",
            "2": "Manages supplier relationships, optimises inventory levels, and coordinates logistics.",
            "3": "Designs supply chain strategies, implements S&OP processes, and manages disruption responses.",
            "4": "Leads global supply chain transformation, implements digital supply chain, and drives sustainability initiatives.",
        },
        "metadata": {
            "transferability": 0.65,
            "automation_susceptibility": 0.40,
            "strategic_importance": "important",
            "trend": "stable",
            "half_life_months": 48,
        },
        "adjacencies": [_VENDMGMT, _PROCDES, _RISKASS],
        "created_at": "2025-01-15T08:00:00",
        "updated_at": "2025-01-15T08:00:00",
    },
    {
        "id": _CRM,
        "name": "Client Relationship Management",
        "description": "Building and maintaining productive client relationships to drive retention and growth. Covers account planning, needs analysis, and using CRM systems to manage the client lifecycle.",
        "category": "functional",
        "subcategory": "Sales & Marketing",
        "proficiency_scale": {
            "1": "Updates CRM records and follows up on client requests.",
            "2": "Manages client portfolios, identifies cross-sell opportunities, and resolves issues proactively.",
            "3": "Develops strategic account plans, leads client reviews, and drives client satisfaction programs.",
            "4": "Defines CRM strategy, manages key accounts, and drives enterprise client experience transformation.",
        },
        "metadata": {
            "transferability": 0.70,
            "automation_susceptibility": 0.30,
            "strategic_importance": "important",
            "trend": "stable",
            "half_life_months": 48,
        },
        "adjacencies": [_MKTRES, _STAKEHOLDER, _CONTRACT],
        "created_at": "2025-01-15T08:00:00",
        "updated_at": "2025-01-15T08:00:00",
    },

    # ── Leadership (8) ──
    {
        "id": _STRATPLAN,
        "name": "Strategic Planning",
        "description": "Formulating long-term organisational direction by analysing market dynamics, competitive position, and internal capabilities. Translates vision into actionable strategic roadmaps.",
        "category": "leadership",
        "subcategory": "Strategy",
        "proficiency_scale": {
            "1": "Contributes to strategic discussions and understands organisational goals.",
            "2": "Develops departmental strategies aligned with organisational objectives.",
            "3": "Leads enterprise strategic planning, conducts portfolio analysis, and drives strategic pivots.",
            "4": "Shapes industry-level strategy, advises boards, and leads transformation at scale.",
        },
        "metadata": {
            "transferability": 0.85,
            "automation_susceptibility": 0.10,
            "strategic_importance": "critical",
            "trend": "stable",
            "half_life_months": 72,
        },
        "adjacencies": [_DECISION, _STAKEHOLDER, _SYSTHINK],
        "created_at": "2025-01-15T08:00:00",
        "updated_at": "2025-01-15T08:00:00",
    },
    {
        "id": _TEAMDEV,
        "name": "Team Development",
        "description": "Building high-performing teams through coaching, feedback, skill development, and fostering psychological safety. Covers team dynamics, motivation, and performance management.",
        "category": "leadership",
        "subcategory": "People Leadership",
        "proficiency_scale": {
            "1": "Provides regular feedback and supports team members' development goals.",
            "2": "Builds development plans, coaches team members, and manages performance cycles.",
            "3": "Develops high-performing teams, creates succession plans, and builds team culture.",
            "4": "Drives organisational talent philosophy, designs leadership development programs, and mentors leaders.",
        },
        "metadata": {
            "transferability": 0.85,
            "automation_susceptibility": 0.05,
            "strategic_importance": "critical",
            "trend": "stable",
            "half_life_months": 72,
        },
        "adjacencies": [_TALENTDEV, _EMOINTELL, _EXECCOMM],
        "created_at": "2025-01-15T08:00:00",
        "updated_at": "2025-01-15T08:00:00",
    },
    {
        "id": _CHANGEMGMT,
        "name": "Change Management",
        "description": "Leading organisational change through structured approaches to transition individuals, teams, and organisations. Covers stakeholder engagement, communication, resistance management, and adoption measurement.",
        "category": "leadership",
        "subcategory": "Transformation",
        "proficiency_scale": {
            "1": "Supports change initiatives and communicates changes to team members.",
            "2": "Develops change plans, manages stakeholder communications, and tracks adoption.",
            "3": "Leads enterprise change programs, designs change networks, and manages complex resistance.",
            "4": "Defines organisational change capability, integrates change into strategy, and builds change-ready culture.",
        },
        "metadata": {
            "transferability": 0.80,
            "automation_susceptibility": 0.05,
            "strategic_importance": "critical",
            "trend": "rising",
            "half_life_months": 60,
        },
        "adjacencies": [_STAKEHOLDER, _EXECCOMM, _CROSSFUNC],
        "created_at": "2025-01-15T08:00:00",
        "updated_at": "2025-01-15T08:00:00",
    },
    {
        "id": _EXECCOMM,
        "name": "Executive Communication",
        "description": "Communicating complex ideas clearly and persuasively to senior stakeholders and boards. Covers presentation skills, written communication, and narrative construction.",
        "category": "leadership",
        "subcategory": "Communication",
        "proficiency_scale": {
            "1": "Prepares clear written summaries and presents to small groups.",
            "2": "Delivers executive presentations, writes board papers, and handles Q&A confidently.",
            "3": "Crafts compelling strategic narratives, manages crisis communications, and influences senior leaders.",
            "4": "Represents the organisation externally, shapes public discourse, and coaches leaders on communication.",
        },
        "metadata": {
            "transferability": 0.90,
            "automation_susceptibility": 0.10,
            "strategic_importance": "important",
            "trend": "stable",
            "half_life_months": 72,
        },
        "adjacencies": [_STAKEHOLDER, _CHANGEMGMT, _TEAMDEV],
        "created_at": "2025-01-15T08:00:00",
        "updated_at": "2025-01-15T08:00:00",
    },
    {
        "id": _STAKEHOLDER,
        "name": "Stakeholder Management",
        "description": "Identifying, analysing, and engaging stakeholders to build support for initiatives. Covers influence mapping, expectation management, and alignment across diverse groups.",
        "category": "leadership",
        "subcategory": "Communication",
        "proficiency_scale": {
            "1": "Identifies key stakeholders and maintains regular communication.",
            "2": "Maps stakeholder influence, manages expectations, and resolves conflicts.",
            "3": "Builds cross-organisational coalitions, navigates political dynamics, and drives consensus.",
            "4": "Manages complex multi-stakeholder ecosystems at industry or government level.",
        },
        "metadata": {
            "transferability": 0.85,
            "automation_susceptibility": 0.05,
            "strategic_importance": "important",
            "trend": "stable",
            "half_life_months": 72,
        },
        "adjacencies": [_EXECCOMM, _CHANGEMGMT, _CRM],
        "created_at": "2025-01-15T08:00:00",
        "updated_at": "2025-01-15T08:00:00",
    },
    {
        "id": _DECISION,
        "name": "Decision Making Under Uncertainty",
        "description": "Making sound decisions when information is incomplete, ambiguous, or rapidly changing. Covers decision frameworks, probabilistic thinking, and balancing speed with rigour.",
        "category": "leadership",
        "subcategory": "Strategy",
        "proficiency_scale": {
            "1": "Makes routine decisions using available data and escalates when uncertain.",
            "2": "Applies decision frameworks, considers trade-offs, and communicates rationale.",
            "3": "Makes high-stakes decisions under ambiguity, uses scenario planning, and manages decision fatigue.",
            "4": "Develops organisational decision-making frameworks, advises on bet-the-company decisions, and builds decision culture.",
        },
        "metadata": {
            "transferability": 0.90,
            "automation_susceptibility": 0.10,
            "strategic_importance": "critical",
            "trend": "rising",
            "half_life_months": 72,
        },
        "adjacencies": [_STRATPLAN, _RISKASS, _CRITTHINK],
        "created_at": "2025-01-15T08:00:00",
        "updated_at": "2025-01-15T08:00:00",
    },
    {
        "id": _CROSSFUNC,
        "name": "Cross-Functional Collaboration",
        "description": "Working effectively across departmental boundaries to achieve shared goals. Covers building shared understanding, managing dependencies, and fostering collaborative culture.",
        "category": "leadership",
        "subcategory": "Collaboration",
        "proficiency_scale": {
            "1": "Participates constructively in cross-functional meetings and shares information.",
            "2": "Coordinates work across teams, manages dependencies, and resolves cross-team conflicts.",
            "3": "Leads cross-functional programs, builds collaborative frameworks, and drives shared accountability.",
            "4": "Designs organisational structures for collaboration, breaks down silos, and drives enterprise integration.",
        },
        "metadata": {
            "transferability": 0.90,
            "automation_susceptibility": 0.05,
            "strategic_importance": "important",
            "trend": "rising",
            "half_life_months": 60,
        },
        "adjacencies": [_CHANGEMGMT, _STAKEHOLDER, _EMOINTELL],
        "created_at": "2025-01-15T08:00:00",
        "updated_at": "2025-01-15T08:00:00",
    },
    {
        "id": _TALENTDEV,
        "name": "Talent Development",
        "description": "Designing and implementing talent strategies including succession planning, career pathing, and capability building. Connects individual growth with organisational workforce needs.",
        "category": "leadership",
        "subcategory": "People Leadership",
        "proficiency_scale": {
            "1": "Supports onboarding and helps team members identify learning resources.",
            "2": "Creates development plans, manages talent reviews, and identifies high-potential individuals.",
            "3": "Designs talent programs, leads succession planning, and builds organisational capability frameworks.",
            "4": "Defines enterprise talent strategy, builds leadership pipelines, and drives workforce transformation.",
        },
        "metadata": {
            "transferability": 0.80,
            "automation_susceptibility": 0.10,
            "strategic_importance": "critical",
            "trend": "rising",
            "half_life_months": 60,
        },
        "adjacencies": [_TEAMDEV, _CHANGEMGMT, _STRATPLAN],
        "created_at": "2025-01-15T08:00:00",
        "updated_at": "2025-01-15T08:00:00",
    },

    # ── Adaptive (8) ──
    {
        "id": _CRITTHINK,
        "name": "Critical Thinking",
        "description": "Analysing information objectively, evaluating arguments, and forming well-reasoned judgements. Encompasses logical reasoning, evidence evaluation, and cognitive bias awareness.",
        "category": "adaptive",
        "subcategory": "Cognitive",
        "proficiency_scale": {
            "1": "Asks clarifying questions and identifies basic logical inconsistencies.",
            "2": "Evaluates evidence quality, identifies assumptions, and constructs logical arguments.",
            "3": "Synthesises complex information, challenges established thinking, and drives evidence-based decisions.",
            "4": "Establishes critical thinking culture, designs analytical frameworks, and mentors advanced reasoning.",
        },
        "metadata": {
            "transferability": 0.95,
            "automation_susceptibility": 0.10,
            "strategic_importance": "critical",
            "trend": "rising",
            "half_life_months": 120,
        },
        "adjacencies": [_DECISION, _SYSTHINK, _ETHICAL],
        "created_at": "2025-01-15T08:00:00",
        "updated_at": "2025-01-15T08:00:00",
    },
    {
        "id": _LEARNAGIL,
        "name": "Learning Agility",
        "description": "Rapidly acquiring new knowledge and skills to adapt to changing demands. Covers self-directed learning, knowledge transfer, and applying lessons from diverse contexts.",
        "category": "adaptive",
        "subcategory": "Growth Mindset",
        "proficiency_scale": {
            "1": "Engages in assigned learning and applies new knowledge to familiar tasks.",
            "2": "Seeks out learning opportunities, adapts quickly to new tools, and shares knowledge.",
            "3": "Learns across domains, transfers insights between contexts, and accelerates team learning.",
            "4": "Builds learning organisations, designs adaptive learning systems, and drives knowledge management.",
        },
        "metadata": {
            "transferability": 0.95,
            "automation_susceptibility": 0.05,
            "strategic_importance": "critical",
            "trend": "rising",
            "half_life_months": 120,
        },
        "adjacencies": [_DIGFLU, _CRITTHINK, _CREATIVE],
        "created_at": "2025-01-15T08:00:00",
        "updated_at": "2025-01-15T08:00:00",
    },
    {
        "id": _EMOINTELL,
        "name": "Emotional Intelligence",
        "description": "Recognising, understanding, and managing emotions in oneself and others. Covers self-awareness, empathy, social skills, and emotional regulation in professional settings.",
        "category": "adaptive",
        "subcategory": "Interpersonal",
        "proficiency_scale": {
            "1": "Demonstrates self-awareness and responds appropriately to others' emotions.",
            "2": "Manages own emotional responses, shows empathy, and navigates interpersonal dynamics.",
            "3": "Reads group dynamics, mediates conflicts, and creates psychologically safe environments.",
            "4": "Builds emotionally intelligent culture, coaches leaders on EQ, and navigates highly sensitive situations.",
        },
        "metadata": {
            "transferability": 0.95,
            "automation_susceptibility": 0.02,
            "strategic_importance": "important",
            "trend": "rising",
            "half_life_months": 120,
        },
        "adjacencies": [_TEAMDEV, _CROSSFUNC, _AMBIGTOL],
        "created_at": "2025-01-15T08:00:00",
        "updated_at": "2025-01-15T08:00:00",
    },
    {
        "id": _AMBIGTOL,
        "name": "Ambiguity Tolerance",
        "description": "Functioning effectively in situations where information is incomplete, contradictory, or rapidly evolving. Covers comfort with uncertainty, provisional decision-making, and iterative exploration.",
        "category": "adaptive",
        "subcategory": "Resilience",
        "proficiency_scale": {
            "1": "Works through discomfort with ambiguity and seeks clarification.",
            "2": "Makes progress despite incomplete information and adjusts plans as clarity emerges.",
            "3": "Thrives in ambiguous environments, guides teams through uncertainty, and reframes problems.",
            "4": "Leads organisations through prolonged uncertainty, builds adaptive capacity, and turns ambiguity into advantage.",
        },
        "metadata": {
            "transferability": 0.95,
            "automation_susceptibility": 0.02,
            "strategic_importance": "important",
            "trend": "rising",
            "half_life_months": 120,
        },
        "adjacencies": [_DECISION, _EMOINTELL, _CREATIVE],
        "created_at": "2025-01-15T08:00:00",
        "updated_at": "2025-01-15T08:00:00",
    },
    {
        "id": _DIGFLU,
        "name": "Digital Fluency",
        "description": "Navigating, evaluating, and leveraging digital tools and technologies effectively. Goes beyond basic digital literacy to encompass strategic use of emerging technology for work transformation.",
        "category": "adaptive",
        "subcategory": "Digital",
        "proficiency_scale": {
            "1": "Uses standard digital tools and adapts to new software with guidance.",
            "2": "Evaluates and adopts new digital tools, automates personal workflows, and helps others.",
            "3": "Drives digital adoption across teams, evaluates emerging tech, and integrates digital solutions.",
            "4": "Shapes digital strategy, champions digital transformation, and builds digitally fluent organisations.",
        },
        "metadata": {
            "transferability": 0.85,
            "automation_susceptibility": 0.10,
            "strategic_importance": "critical",
            "trend": "rising",
            "half_life_months": 36,
        },
        "adjacencies": [_LEARNAGIL, _PYTHON, _CLOUD],
        "created_at": "2025-01-15T08:00:00",
        "updated_at": "2025-01-15T08:00:00",
    },
    {
        "id": _SYSTHINK,
        "name": "Systems Thinking",
        "description": "Understanding complex systems by examining the relationships and interactions between components rather than individual parts. Covers feedback loops, emergent behaviour, and unintended consequences.",
        "category": "adaptive",
        "subcategory": "Cognitive",
        "proficiency_scale": {
            "1": "Recognises that actions have downstream effects and considers broader context.",
            "2": "Maps system components and relationships, identifies feedback loops, and anticipates second-order effects.",
            "3": "Models complex systems, identifies leverage points, and designs interventions accounting for system dynamics.",
            "4": "Applies systems thinking to organisational design, ecosystem strategy, and societal-level challenges.",
        },
        "metadata": {
            "transferability": 0.90,
            "automation_susceptibility": 0.05,
            "strategic_importance": "critical",
            "trend": "rising",
            "half_life_months": 120,
        },
        "adjacencies": [_CRITTHINK, _STRATPLAN, _PROCDES],
        "created_at": "2025-01-15T08:00:00",
        "updated_at": "2025-01-15T08:00:00",
    },
    {
        "id": _CREATIVE,
        "name": "Creative Problem Solving",
        "description": "Generating novel solutions to complex problems by combining divergent and convergent thinking. Encompasses ideation techniques, design thinking, and reframing challenges.",
        "category": "adaptive",
        "subcategory": "Cognitive",
        "proficiency_scale": {
            "1": "Generates ideas beyond obvious solutions and considers alternative approaches.",
            "2": "Applies structured creativity techniques, reframes problems, and evaluates novel solutions.",
            "3": "Leads innovation workshops, designs creative processes, and drives breakthrough solutions.",
            "4": "Builds organisational innovation culture, designs creative problem-solving frameworks, and mentors innovators.",
        },
        "metadata": {
            "transferability": 0.90,
            "automation_susceptibility": 0.08,
            "strategic_importance": "important",
            "trend": "rising",
            "half_life_months": 120,
        },
        "adjacencies": [_CRITTHINK, _LEARNAGIL, _AMBIGTOL],
        "created_at": "2025-01-15T08:00:00",
        "updated_at": "2025-01-15T08:00:00",
    },
    {
        "id": _ETHICAL,
        "name": "Ethical Reasoning",
        "description": "Applying ethical frameworks to evaluate decisions, policies, and actions in professional contexts. Covers AI ethics, data privacy, corporate responsibility, and stakeholder impact assessment.",
        "category": "adaptive",
        "subcategory": "Values",
        "proficiency_scale": {
            "1": "Recognises ethical dilemmas and follows organisational codes of conduct.",
            "2": "Analyses ethical trade-offs, applies ethical frameworks, and raises concerns appropriately.",
            "3": "Designs ethical guidelines, leads ethics reviews, and navigates complex moral dilemmas.",
            "4": "Sets organisational ethics strategy, engages with regulators on ethics policy, and drives responsible innovation.",
        },
        "metadata": {
            "transferability": 0.90,
            "automation_susceptibility": 0.05,
            "strategic_importance": "critical",
            "trend": "rising",
            "half_life_months": 120,
        },
        "adjacencies": [_CRITTHINK, _REGCOMP, _DECISION],
        "created_at": "2025-01-15T08:00:00",
        "updated_at": "2025-01-15T08:00:00",
    },
]


# ─────────────────────────────────────────────────────────────────────────────
# DEMO_MAPPINGS  (job → skill mappings, 15 mappings across 10 jobs)
# ─────────────────────────────────────────────────────────────────────────────
DEMO_MAPPINGS = [
    # Software Engineer
    {
        "id": "map-001",
        "source_type": "job",
        "source_id": _JOB_SWE,
        "source_label": "Software Engineer",
        "skill_id": _PYTHON,
        "required_proficiency": 3,
        "current_proficiency": 2,
        "weight": 0.9,
        "confidence": "assessed",
    },
    {
        "id": "map-002",
        "source_type": "job",
        "source_id": _JOB_SWE,
        "source_label": "Software Engineer",
        "skill_id": _API,
        "required_proficiency": 3,
        "current_proficiency": 3,
        "weight": 0.85,
        "confidence": "assessed",
    },
    # Data Scientist
    {
        "id": "map-003",
        "source_type": "job",
        "source_id": _JOB_DS,
        "source_label": "Data Scientist",
        "skill_id": _ML,
        "required_proficiency": 4,
        "current_proficiency": 2,
        "weight": 0.95,
        "confidence": "assessed",
    },
    {
        "id": "map-004",
        "source_type": "job",
        "source_id": _JOB_DS,
        "source_label": "Data Scientist",
        "skill_id": _STATS,
        "required_proficiency": 3,
        "current_proficiency": 3,
        "weight": 0.85,
        "confidence": "assessed",
    },
    # Financial Analyst
    {
        "id": "map-005",
        "source_type": "job",
        "source_id": _JOB_FA,
        "source_label": "Financial Analyst",
        "skill_id": _FINAN,
        "required_proficiency": 3,
        "current_proficiency": 2,
        "weight": 0.95,
        "confidence": "assessed",
    },
    {
        "id": "map-006",
        "source_type": "job",
        "source_id": _JOB_FA,
        "source_label": "Financial Analyst",
        "skill_id": _EXCEL,
        "required_proficiency": 3,
        "current_proficiency": 3,
        "weight": 0.80,
        "confidence": "assessed",
    },
    # HR Business Partner
    {
        "id": "map-007",
        "source_type": "job",
        "source_id": _JOB_HRBP,
        "source_label": "HR Business Partner",
        "skill_id": _TALENTDEV,
        "required_proficiency": 3,
        "current_proficiency": 2,
        "weight": 0.90,
        "confidence": "assessed",
    },
    # Product Manager
    {
        "id": "map-008",
        "source_type": "job",
        "source_id": _JOB_PM,
        "source_label": "Product Manager",
        "skill_id": _STAKEHOLDER,
        "required_proficiency": 3,
        "current_proficiency": 2,
        "weight": 0.85,
        "confidence": "inferred",
    },
    {
        "id": "map-009",
        "source_type": "job",
        "source_id": _JOB_PM,
        "source_label": "Product Manager",
        "skill_id": _CRITTHINK,
        "required_proficiency": 3,
        "current_proficiency": 3,
        "weight": 0.80,
        "confidence": "assessed",
    },
    # Marketing Manager
    {
        "id": "map-010",
        "source_type": "job",
        "source_id": _JOB_MKT,
        "source_label": "Marketing Manager",
        "skill_id": _MKTRES,
        "required_proficiency": 3,
        "current_proficiency": 2,
        "weight": 0.90,
        "confidence": "assessed",
    },
    # Operations Director
    {
        "id": "map-011",
        "source_type": "job",
        "source_id": _JOB_OPS,
        "source_label": "Operations Director",
        "skill_id": _PROCDES,
        "required_proficiency": 3,
        "current_proficiency": 3,
        "weight": 0.85,
        "confidence": "assessed",
    },
    # IT Security Analyst
    {
        "id": "map-012",
        "source_type": "job",
        "source_id": _JOB_SEC,
        "source_label": "IT Security Analyst",
        "skill_id": _CYBER,
        "required_proficiency": 3,
        "current_proficiency": 1,
        "weight": 0.95,
        "confidence": "assessed",
    },
    # Supply Chain Manager
    {
        "id": "map-013",
        "source_type": "job",
        "source_id": _JOB_SCM,
        "source_label": "Supply Chain Manager",
        "skill_id": _SUPPLY,
        "required_proficiency": 3,
        "current_proficiency": 2,
        "weight": 0.90,
        "confidence": "assessed",
    },
    # Project Manager
    {
        "id": "map-014",
        "source_type": "job",
        "source_id": _JOB_PROJ,
        "source_label": "Project Manager",
        "skill_id": _PROJMGMT,
        "required_proficiency": 4,
        "current_proficiency": 3,
        "weight": 0.95,
        "confidence": "assessed",
    },
    {
        "id": "map-015",
        "source_type": "job",
        "source_id": _JOB_PROJ,
        "source_label": "Project Manager",
        "skill_id": _BUDGET,
        "required_proficiency": 2,
        "current_proficiency": 2,
        "weight": 0.70,
        "confidence": "inferred",
    },
]


# ─────────────────────────────────────────────────────────────────────────────
# DEMO_TAXONOMY  (4 top-level nodes + subcategory children)
# ─────────────────────────────────────────────────────────────────────────────
DEMO_TAXONOMY = [
    # Top-level
    {"id": "tax-tech", "name": "Technical Skills", "category": "technical", "parent_id": None, "level": 0, "description": "Skills related to technology, engineering, and data."},
    {"id": "tax-func", "name": "Functional Skills", "category": "functional", "parent_id": None, "level": 0, "description": "Skills related to business operations, finance, and domain expertise."},
    {"id": "tax-lead", "name": "Leadership Skills", "category": "leadership", "parent_id": None, "level": 0, "description": "Skills related to leading people, strategy, and organisational influence."},
    {"id": "tax-adap", "name": "Adaptive Skills", "category": "adaptive", "parent_id": None, "level": 0, "description": "Meta-skills that enable learning, resilience, and navigating change."},

    # Technical subcategories
    {"id": "tax-t-prog", "name": "Programming Languages", "category": "technical", "parent_id": "tax-tech", "level": 1, "description": "Core programming and scripting languages."},
    {"id": "tax-t-data", "name": "Data & Analytics", "category": "technical", "parent_id": "tax-tech", "level": 1, "description": "Data management, analysis, and visualisation."},
    {"id": "tax-t-aiml", "name": "AI & Machine Learning", "category": "technical", "parent_id": "tax-tech", "level": 1, "description": "Artificial intelligence and machine learning capabilities."},

    # Functional subcategories
    {"id": "tax-f-fin", "name": "Finance", "category": "functional", "parent_id": "tax-func", "level": 1, "description": "Financial planning, analysis, and management."},
    {"id": "tax-f-ops", "name": "Operations", "category": "functional", "parent_id": "tax-func", "level": 1, "description": "Operational excellence and process management."},
    {"id": "tax-f-risk", "name": "Risk & Compliance", "category": "functional", "parent_id": "tax-func", "level": 1, "description": "Risk management and regulatory compliance."},

    # Leadership subcategories
    {"id": "tax-l-str", "name": "Strategy", "category": "leadership", "parent_id": "tax-lead", "level": 1, "description": "Strategic thinking and planning capabilities."},
    {"id": "tax-l-ppl", "name": "People Leadership", "category": "leadership", "parent_id": "tax-lead", "level": 1, "description": "Leading, developing, and inspiring people."},

    # Adaptive subcategories
    {"id": "tax-a-cog", "name": "Cognitive", "category": "adaptive", "parent_id": "tax-adap", "level": 1, "description": "Thinking, reasoning, and analytical meta-skills."},
    {"id": "tax-a-int", "name": "Interpersonal", "category": "adaptive", "parent_id": "tax-adap", "level": 1, "description": "Emotional and social capabilities."},
]


# ─────────────────────────────────────────────────────────────────────────────
# DEMO_EDGES  (adjacency / relationship edges between skills)
# ─────────────────────────────────────────────────────────────────────────────
DEMO_EDGES = [
    # Technical adjacencies
    {"source_id": _PYTHON, "target_id": _ML, "relationship": "adjacent_to", "weight": 0.9},
    {"source_id": _PYTHON, "target_id": _DATAENG, "relationship": "adjacent_to", "weight": 0.85},
    {"source_id": _PYTHON, "target_id": _API, "relationship": "adjacent_to", "weight": 0.80},
    {"source_id": _SQL, "target_id": _DATAENG, "relationship": "adjacent_to", "weight": 0.90},
    {"source_id": _SQL, "target_id": _BITOOLS, "relationship": "adjacent_to", "weight": 0.75},
    {"source_id": _STATS, "target_id": _DATAVIZ, "relationship": "adjacent_to", "weight": 0.80},
    {"source_id": _STATS, "target_id": _ML, "relationship": "adjacent_to", "weight": 0.85},
    {"source_id": _ML, "target_id": _NLP, "relationship": "adjacent_to", "weight": 0.80},
    {"source_id": _ML, "target_id": _MLOPS, "relationship": "evolves_into", "weight": 0.75},
    {"source_id": _CLOUD, "target_id": _DEVOPS, "relationship": "adjacent_to", "weight": 0.85},
    {"source_id": _CLOUD, "target_id": _CYBER, "relationship": "adjacent_to", "weight": 0.70},
    {"source_id": _DATAVIZ, "target_id": _BITOOLS, "relationship": "adjacent_to", "weight": 0.80},
    {"source_id": _RPA, "target_id": _PROCDES, "relationship": "adjacent_to", "weight": 0.75},
    {"source_id": _EXCEL, "target_id": _BITOOLS, "relationship": "evolves_into", "weight": 0.70},

    # Cross-category adjacencies
    {"source_id": _FINAN, "target_id": _EXCEL, "relationship": "adjacent_to", "weight": 0.85},
    {"source_id": _FINAN, "target_id": _BUDGET, "relationship": "adjacent_to", "weight": 0.80},
    {"source_id": _RISKASS, "target_id": _REGCOMP, "relationship": "adjacent_to", "weight": 0.80},
    {"source_id": _PROJMGMT, "target_id": _STAKEHOLDER, "relationship": "adjacent_to", "weight": 0.75},
    {"source_id": _DECISION, "target_id": _CRITTHINK, "relationship": "adjacent_to", "weight": 0.85},
    {"source_id": _SYSTHINK, "target_id": _STRATPLAN, "relationship": "adjacent_to", "weight": 0.80},
    {"source_id": _TEAMDEV, "target_id": _EMOINTELL, "relationship": "adjacent_to", "weight": 0.80},
    {"source_id": _CHANGEMGMT, "target_id": _STAKEHOLDER, "relationship": "adjacent_to", "weight": 0.85},
    {"source_id": _ETHICAL, "target_id": _REGCOMP, "relationship": "clusters_with", "weight": 0.70},
    {"source_id": _LEARNAGIL, "target_id": _DIGFLU, "relationship": "adjacent_to", "weight": 0.75},
    {"source_id": _CREATIVE, "target_id": _CRITTHINK, "relationship": "clusters_with", "weight": 0.80},
]
