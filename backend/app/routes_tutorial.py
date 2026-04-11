"""Tutorial and sandbox routes."""

import random
import numpy as np
import pandas as pd
from fastapi import APIRouter, Query

from app.store import store, sync_work_design, enrich_work_design_defaults
from app.helpers import get_series, safe_value_counts, empty_bundle
from app.shared import _safe, _j, _f

router = APIRouter(prefix="/api", tags=["tutorial"])

@router.get("/tutorial/check/{project_id}")
async def check_tutorial(project_id: str):
    """Check if this is a tutorial project."""
    return {"is_tutorial": project_id == "tutorial_project"}


# ═══════════════════════════════════════════════════
# TUTORIAL SANDBOX — Auto-seeds rich dataset
# ═══════════════════════════════════════════════════

def _generate_sandbox_dataset(industry: str, size: str):
    """Generate a complete, internally consistent dataset for any industry × size combination."""
    import pandas as pd
    import numpy as np
    import random
    
    seed_val = hash(f"{industry}_{size}") % 2**31
    random.seed(seed_val)
    np.random.seed(seed_val % 2**31)
    
    # ═══ SIZE CONFIG ═══
    size_config = {
        "small":  {"employees": 50,    "functions": 4, "levels": 4, "comp_mult": 0.85, "label": "Small (50)"},
        "medium": {"employees": 200,   "functions": 6, "levels": 5, "comp_mult": 1.0,  "label": "Medium (200)"},
        "large":  {"employees": 1000,  "functions": 8, "levels": 6, "comp_mult": 1.15, "label": "Large (1,000)"},
        "mega":   {"employees": 5000,  "functions": 10, "levels": 7, "comp_mult": 1.35, "label": "Mega (5,000)"},
    }
    sc = size_config.get(size, size_config["medium"])
    num_emp = sc["employees"]
    
    # ═══ INDUSTRY CONFIG ═══
    industry_configs = {
        "financial_services": {
            "label": "Financial Services",
            "company": "Atlas Capital Group",
            "functions": {
                "Trading & Markets": {"roles": ["Quantitative Analyst", "Trader", "Risk Analyst", "Market Data Specialist", "Derivatives Analyst"], "comp_base": 140000},
                "Investment Banking": {"roles": ["Investment Analyst", "Associate", "VP Banking", "Deal Originator", "Pitch Book Specialist"], "comp_base": 130000},
                "Risk & Compliance": {"roles": ["Compliance Officer", "Regulatory Analyst", "AML Analyst", "Audit Manager", "Risk Modeler"], "comp_base": 110000},
                "Wealth Management": {"roles": ["Financial Advisor", "Portfolio Manager", "Client Associate", "Wealth Planner", "Trust Officer"], "comp_base": 120000},
                "Technology": {"roles": ["Software Engineer", "Data Engineer", "Cloud Architect", "InfoSec Analyst", "Platform Engineer"], "comp_base": 135000},
                "Operations": {"roles": ["Operations Analyst", "Settlement Specialist", "Reconciliation Analyst", "Trade Support", "Middle Office Analyst"], "comp_base": 85000},
                "Finance": {"roles": ["Financial Controller", "FP&A Analyst", "Treasury Analyst", "Tax Specialist", "Accountant"], "comp_base": 100000},
                "HR": {"roles": ["HR Business Partner", "Talent Acquisition", "Compensation Analyst", "L&D Specialist", "HRIS Analyst"], "comp_base": 90000},
                "Legal": {"roles": ["General Counsel", "Regulatory Attorney", "Contracts Manager", "Legal Analyst", "Paralegal"], "comp_base": 115000},
                "Marketing": {"roles": ["Brand Manager", "Digital Marketing Lead", "Content Strategist", "Product Marketing", "Events Manager"], "comp_base": 95000},
            },
            "tasks_by_role": {
                "Quantitative Analyst": [("Model development & backtesting", 30, "Variable", "Probabilistic", "Interactive", "Moderate", "Quantitative Analysis", "Python/R"),
                    ("Data pipeline management", 20, "Repetitive", "Deterministic", "Independent", "High", "Data Engineering", "Python/SQL"),
                    ("Research & signal generation", 20, "Variable", "Judgment-heavy", "Independent", "Low", "Financial Markets", "Critical Thinking"),
                    ("Strategy performance reporting", 15, "Repetitive", "Deterministic", "Independent", "High", "Data Analysis", "Communication"),
                    ("Stakeholder presentation", 15, "Variable", "Judgment-heavy", "Collaborative", "Low", "Communication", "Stakeholder Mgmt")],
                "Compliance Officer": [("Regulatory monitoring & updates", 25, "Variable", "Probabilistic", "Interactive", "Moderate", "Regulatory Knowledge", "Research"),
                    ("Policy documentation", 20, "Repetitive", "Deterministic", "Independent", "High", "Technical Writing", "Compliance"),
                    ("Surveillance & monitoring", 20, "Repetitive", "Deterministic", "Independent", "High", "Data Analysis", "Risk Assessment"),
                    ("Training & advisory", 20, "Variable", "Judgment-heavy", "Collaborative", "Low", "Communication", "Leadership"),
                    ("Audit preparation", 15, "Variable", "Probabilistic", "Interactive", "Moderate", "Documentation", "Process Management")],
            },
            "skills": ["Quantitative Analysis", "Python/R", "Financial Markets", "Risk Assessment", "Regulatory Knowledge", "Data Analysis", "SQL/Databases", "Communication", "Stakeholder Mgmt", "Leadership", "AI/ML Tools", "Cloud Platforms", "Process Automation", "Critical Thinking", "Change Agility"],
        },
        "technology": {
            "label": "Technology",
            "company": "Nexus Technologies Inc",
            "functions": {
                "Engineering": {"roles": ["Software Engineer", "Senior Engineer", "Staff Engineer", "Frontend Developer", "Backend Developer"], "comp_base": 145000},
                "Product": {"roles": ["Product Manager", "Senior PM", "Product Analyst", "UX Researcher", "Technical Writer"], "comp_base": 130000},
                "Design": {"roles": ["UX Designer", "UI Designer", "Design Lead", "Design Systems Engineer", "UX Writer"], "comp_base": 120000},
                "Data Science": {"roles": ["Data Scientist", "ML Engineer", "Data Analyst", "Analytics Engineer", "AI Researcher"], "comp_base": 150000},
                "DevOps / SRE": {"roles": ["SRE Engineer", "DevOps Engineer", "Platform Engineer", "Cloud Architect", "Security Engineer"], "comp_base": 155000},
                "Sales": {"roles": ["Account Executive", "Sales Engineer", "SDR", "Enterprise Sales", "Solutions Architect"], "comp_base": 120000},
                "Marketing": {"roles": ["Growth Manager", "Content Marketer", "Product Marketing", "Demand Gen", "Brand Manager"], "comp_base": 110000},
                "People Ops": {"roles": ["People Partner", "Recruiter", "People Analyst", "DEI Lead", "Total Rewards"], "comp_base": 100000},
                "Finance": {"roles": ["FP&A Analyst", "Controller", "Revenue Operations", "Billing Specialist", "Tax Analyst"], "comp_base": 105000},
                "Legal": {"roles": ["Legal Counsel", "Privacy Counsel", "IP Attorney", "Contracts Manager", "Legal Ops"], "comp_base": 130000},
            },
            "tasks_by_role": {
                "Software Engineer": [("Feature development & coding", 35, "Variable", "Probabilistic", "Interactive", "Moderate", "Software Engineering", "Programming"),
                    ("Code review & PR management", 15, "Variable", "Judgment-heavy", "Collaborative", "Low", "Code Quality", "Communication"),
                    ("Testing & QA", 15, "Repetitive", "Deterministic", "Independent", "High", "Testing", "Automation"),
                    ("Documentation", 10, "Repetitive", "Deterministic", "Independent", "High", "Technical Writing", "Communication"),
                    ("Sprint planning & standups", 10, "Variable", "Judgment-heavy", "Collaborative", "Low", "Project Management", "Communication"),
                    ("Incident response & debugging", 15, "Variable", "Probabilistic", "Interactive", "Moderate", "Debugging", "System Design")],
                "Data Scientist": [("Model training & experimentation", 30, "Variable", "Probabilistic", "Independent", "Moderate", "ML/AI", "Python"),
                    ("Data wrangling & feature engineering", 25, "Repetitive", "Deterministic", "Independent", "High", "Data Engineering", "SQL"),
                    ("Stakeholder consultation", 15, "Variable", "Judgment-heavy", "Collaborative", "Low", "Communication", "Business Acumen"),
                    ("Model deployment & monitoring", 15, "Variable", "Probabilistic", "Interactive", "Moderate", "MLOps", "Cloud Platforms"),
                    ("Research & prototyping", 15, "Variable", "Judgment-heavy", "Independent", "Low", "Research", "Innovation")],
            },
            "skills": ["Software Engineering", "Python", "JavaScript/TypeScript", "Cloud Platforms", "ML/AI", "Data Engineering", "System Design", "Product Thinking", "Communication", "Leadership", "Agile/Scrum", "DevOps", "Security", "Critical Thinking", "Innovation"],
        },
        "healthcare": {
            "label": "Healthcare",
            "company": "Meridian Health Systems",
            "functions": {
                "Clinical Operations": {"roles": ["Nurse Manager", "Clinical Coordinator", "Patient Care Specialist", "Medical Technologist", "Pharmacy Tech"], "comp_base": 80000},
                "Medical Staff": {"roles": ["Physician", "Specialist", "Resident", "Physician Assistant", "Nurse Practitioner"], "comp_base": 200000},
                "Administration": {"roles": ["Hospital Administrator", "Department Director", "Operations Manager", "Quality Manager", "Credentialing Specialist"], "comp_base": 95000},
                "Health IT": {"roles": ["EHR Analyst", "Clinical Informaticist", "Health Data Analyst", "Integration Engineer", "Cybersecurity Analyst"], "comp_base": 100000},
                "Revenue Cycle": {"roles": ["Medical Coder", "Billing Specialist", "Claims Analyst", "Authorization Coordinator", "Revenue Integrity Analyst"], "comp_base": 65000},
                "Quality & Compliance": {"roles": ["Compliance Officer", "Quality Improvement Specialist", "Risk Manager", "Accreditation Coordinator", "Patient Safety Officer"], "comp_base": 90000},
                "Finance": {"roles": ["Controller", "Financial Analyst", "Budget Manager", "Reimbursement Analyst", "Payroll Manager"], "comp_base": 85000},
                "HR": {"roles": ["HR Director", "Recruiter", "Benefits Coordinator", "Workforce Planner", "Employee Relations"], "comp_base": 80000},
                "Supply Chain": {"roles": ["Supply Chain Manager", "Procurement Specialist", "Inventory Analyst", "Logistics Coordinator", "Vendor Manager"], "comp_base": 75000},
                "Facilities": {"roles": ["Facilities Director", "Maintenance Supervisor", "Biomedical Engineer", "Safety Officer", "Environmental Services"], "comp_base": 70000},
            },
            "tasks_by_role": {},
            "skills": ["Clinical Knowledge", "EHR Systems", "Patient Care", "Regulatory Compliance", "Data Analysis", "Quality Improvement", "Communication", "Leadership", "Process Automation", "AI/ML Tools", "Change Management", "Critical Thinking", "Project Management", "Stakeholder Mgmt", "Digital Health"],
        },
        "manufacturing": {
            "label": "Manufacturing",
            "company": "Pinnacle Industrial Corp",
            "functions": {
                "Production": {"roles": ["Production Manager", "Line Supervisor", "Quality Inspector", "Process Engineer", "Production Planner"], "comp_base": 75000},
                "Engineering": {"roles": ["Design Engineer", "Manufacturing Engineer", "Industrial Engineer", "Automation Engineer", "R&D Engineer"], "comp_base": 95000},
                "Supply Chain": {"roles": ["Supply Chain Manager", "Procurement Specialist", "Logistics Coordinator", "Inventory Analyst", "Demand Planner"], "comp_base": 80000},
                "Quality": {"roles": ["Quality Manager", "QA Engineer", "Six Sigma Lead", "Metrology Technician", "Compliance Specialist"], "comp_base": 85000},
                "Maintenance": {"roles": ["Maintenance Manager", "Reliability Engineer", "Maintenance Technician", "Predictive Maintenance Analyst", "Facilities Coordinator"], "comp_base": 70000},
                "EHS": {"roles": ["EHS Manager", "Safety Engineer", "Environmental Specialist", "Industrial Hygienist", "Sustainability Lead"], "comp_base": 80000},
                "IT / OT": {"roles": ["IT Manager", "OT Engineer", "SCADA Specialist", "MES Administrator", "Data Analyst"], "comp_base": 90000},
                "Finance": {"roles": ["Plant Controller", "Cost Accountant", "FP&A Analyst", "Payroll Specialist", "AP/AR Clerk"], "comp_base": 75000},
                "HR": {"roles": ["HR Manager", "Recruiter", "Training Coordinator", "Labor Relations", "Benefits Administrator"], "comp_base": 72000},
                "Sales": {"roles": ["Sales Manager", "Account Manager", "Technical Sales", "Customer Service Rep", "Pricing Analyst"], "comp_base": 85000},
            },
            "tasks_by_role": {},
            "skills": ["Lean Manufacturing", "Six Sigma", "Process Optimization", "Quality Systems", "ERP/MES", "Data Analysis", "Automation", "PLC Programming", "Supply Chain Mgmt", "Communication", "Leadership", "Project Management", "Safety Compliance", "CAD/CAM", "AI/ML Tools"],
        },
        "retail": {
            "label": "Retail & Consumer",
            "company": "Crest Commerce Group",
            "functions": {
                "Merchandising": {"roles": ["Buyer", "Merchandiser", "Category Manager", "Assortment Planner", "Pricing Analyst"], "comp_base": 85000},
                "Store Operations": {"roles": ["District Manager", "Store Manager", "Assistant Manager", "Department Lead", "Visual Merchandiser"], "comp_base": 65000},
                "E-Commerce": {"roles": ["E-Commerce Manager", "Digital Product Manager", "UX Designer", "Web Developer", "SEO Specialist"], "comp_base": 100000},
                "Supply Chain": {"roles": ["Supply Chain Director", "Distribution Manager", "Inventory Planner", "Logistics Analyst", "Warehouse Manager"], "comp_base": 80000},
                "Marketing": {"roles": ["CMO", "Brand Manager", "Social Media Manager", "CRM Manager", "Content Creator"], "comp_base": 90000},
                "Customer Experience": {"roles": ["CX Director", "Customer Service Manager", "Contact Center Lead", "Voice of Customer Analyst", "CX Designer"], "comp_base": 75000},
                "Finance": {"roles": ["Controller", "Financial Analyst", "Revenue Analyst", "Lease Accountant", "Treasury Analyst"], "comp_base": 85000},
                "HR": {"roles": ["CHRO", "HR Business Partner", "Talent Acquisition", "L&D Manager", "Compensation Analyst"], "comp_base": 80000},
                "Technology": {"roles": ["CTO", "Software Engineer", "Data Engineer", "POS Systems Admin", "IT Support Lead"], "comp_base": 110000},
                "Real Estate": {"roles": ["Real Estate Director", "Site Selector", "Lease Manager", "Construction Manager", "Facilities Coordinator"], "comp_base": 90000},
            },
            "tasks_by_role": {},
            "skills": ["Merchandising", "Demand Planning", "Customer Analytics", "E-Commerce", "Supply Chain", "POS Systems", "Data Analysis", "Communication", "Leadership", "Negotiation", "Digital Marketing", "AI/ML Tools", "Process Automation", "Visual Merchandising", "CRM"],
        },
        "professional_services": {
            "label": "Professional Services",
            "company": "Apex Advisory Partners",
            "functions": {
                "Consulting": {"roles": ["Managing Director", "Principal", "Senior Consultant", "Consultant", "Analyst"], "comp_base": 130000},
                "Advisory": {"roles": ["Partner", "Director", "Manager", "Senior Associate", "Associate"], "comp_base": 125000},
                "Delivery": {"roles": ["Engagement Manager", "Project Lead", "Delivery Lead", "Technical Architect", "Solutions Designer"], "comp_base": 120000},
                "Research": {"roles": ["Research Director", "Senior Researcher", "Industry Analyst", "Knowledge Manager", "Insights Lead"], "comp_base": 110000},
                "Business Development": {"roles": ["BD Director", "Proposal Manager", "Client Partner", "Account Director", "Pursuit Lead"], "comp_base": 115000},
                "People & Talent": {"roles": ["HR Director", "Recruiter", "L&D Lead", "Performance Manager", "Alumni Relations"], "comp_base": 95000},
                "Finance": {"roles": ["CFO", "Controller", "Billing Manager", "Revenue Analyst", "FP&A Analyst"], "comp_base": 100000},
                "Marketing": {"roles": ["CMO", "Content Director", "Events Manager", "Digital Marketing", "Brand Strategist"], "comp_base": 100000},
                "Technology": {"roles": ["CTO", "Solutions Architect", "Data Engineer", "Platform Lead", "Innovation Lead"], "comp_base": 130000},
                "Operations": {"roles": ["COO", "Office Manager", "Procurement Lead", "Facilities Manager", "Travel Coordinator"], "comp_base": 80000},
            },
            "tasks_by_role": {},
            "skills": ["Strategy", "Client Management", "Data Analysis", "Financial Modeling", "Project Management", "Communication", "Leadership", "Problem Solving", "Industry Expertise", "AI/ML Tools", "Presentation", "Research", "Change Management", "Stakeholder Mgmt", "Digital Transformation"],
        },
    }
    
    cfg = industry_configs.get(industry, industry_configs["technology"])
    
    # ═══ GENERATE EMPLOYEES ═══
    first_names = ["Sarah","James","Maria","David","Lisa","Michael","Emma","Robert","Jennifer","William","Amanda","Christopher","Nicole","Daniel","Rachel","Thomas","Catherine","Steven","Laura","Andrew","Olivia","Ethan","Sophia","Liam","Isabella","Noah","Mia","Lucas","Charlotte","Mason","Amelia","Logan","Harper","Alexander","Evelyn","Jacob","Abigail","Benjamin","Emily","Henry","Ella","Sebastian","Avery","Jack","Scarlett","Owen","Grace","Samuel","Chloe"]
    last_names = ["Chen","Rodriguez","Thompson","Kim","Patel","Brown","Wilson","Taylor","Garcia","Davis","Martinez","Lee","Johnson","White","Anderson","Harris","Clark","Wright","King","Scott","Adams","Baker","Mitchell","Rivera","Campbell","Phillips","Evans","Turner","Torres","Collins","Stewart","Morris","Murphy","Cook","Rogers","Morgan","Reed","Bell","Cooper","Bailey"]
    
    employees = []
    functions_list = list(cfg["functions"].keys())[:sc["functions"]]
    emp_id = 1
    managers = {}

    # Build sub-family mapping: for each function, distribute its roles across 2-4 sub-families
    _sub_family_suffixes = ["Strategy & Planning", "Operations & Delivery", "Analytics & Reporting", "Client & Stakeholder", "Governance & Risk"]
    def _role_sub_family(func, role, idx):
        """Generate a distinct sub-family based on the role's position within the function."""
        sfx = _sub_family_suffixes[idx % len(_sub_family_suffixes)]
        return f"{func} {sfx}"

    # Create org structure: C-suite → VPs → Directors → Managers → ICs
    levels = ["L1","L2","L3","L4","L5","L6","L7"][:sc["levels"]]

    # CEO
    ceo_id = f"EMP{str(emp_id).zfill(4)}"
    employees.append({"Employee ID": ceo_id, "Name": f"{random.choice(first_names)} {random.choice(last_names)}", "Job Title": "CEO", "Function": "Executive", "Sub-Function": "C-Suite", "Career Level": "E4", "Career Track": "E", "Manager ID": "", "Compensation": int(cfg["functions"][functions_list[0]]["comp_base"] * 3.5 * sc["comp_mult"]), "Tenure": random.randint(5, 15), "Location": random.choice(["New York", "San Francisco", "Chicago", "London"])})
    emp_id += 1

    # VPs per function
    for func in functions_list:
        vp_id = f"EMP{str(emp_id).zfill(4)}"
        vp_level = levels[-2] if len(levels) >= 2 else levels[-1]
        comp_base = cfg["functions"][func]["comp_base"]
        employees.append({"Employee ID": vp_id, "Name": f"{random.choice(first_names)} {random.choice(last_names)}", "Job Title": f"VP {func}", "Function": func, "Sub-Function": f"{func} Leadership", "Career Level": "E1", "Career Track": "E", "Manager ID": ceo_id, "Compensation": int(comp_base * 2.0 * sc["comp_mult"]), "Tenure": random.randint(4, 12), "Location": random.choice(["New York", "San Francisco", "Chicago", "London", "Austin"])})
        managers[func] = vp_id
        emp_id += 1

    # Fill remaining employees across functions
    remaining = num_emp - len(employees)
    per_func = remaining // len(functions_list)

    for func in functions_list:
        roles = cfg["functions"][func]["roles"]
        comp_base = cfg["functions"][func]["comp_base"]
        mgr_id = managers.get(func, ceo_id)

        # Directors (if large enough)
        num_directors = max(1, per_func // 15) if sc["employees"] >= 200 else 0
        director_ids = []
        for _ in range(num_directors):
            d_id = f"EMP{str(emp_id).zfill(4)}"
            d_level = levels[-3] if len(levels) >= 3 else levels[-2]
            employees.append({"Employee ID": d_id, "Name": f"{random.choice(first_names)} {random.choice(last_names)}", "Job Title": f"Director, {func}", "Function": func, "Sub-Function": f"{func} Management", "Career Level": "M4", "Career Track": "M", "Manager ID": mgr_id, "Compensation": int(comp_base * 1.5 * sc["comp_mult"]), "Tenure": random.randint(3, 10), "Location": random.choice(["New York", "San Francisco", "Chicago", "London", "Austin", "Seattle"])})
            director_ids.append(d_id)
            emp_id += 1

        # ICs — assign distinct sub-families based on role index
        num_ics = per_func - num_directors
        for i in range(num_ics):
            if emp_id > num_emp:
                break
            role_idx = i % len(roles)
            role = roles[role_idx]
            ic_level_idx = random.choices(range(min(3, len(levels))), weights=[30, 50, 20][:min(3, len(levels))])[0]
            report_to = random.choice(director_ids) if director_ids else mgr_id
            comp = int(comp_base * (0.7 + ic_level_idx * 0.25) * sc["comp_mult"] * random.uniform(0.85, 1.15))
            sub_fam = _role_sub_family(func, role, role_idx)
            employees.append({"Employee ID": f"EMP{str(emp_id).zfill(4)}", "Name": f"{random.choice(first_names)} {random.choice(last_names)}", "Job Title": role, "Function": func, "Sub-Function": sub_fam, "Career Level": levels[ic_level_idx], "Career Track": random.choice(["IC", "IC", "IC", "Manager"]), "Manager ID": report_to, "Compensation": comp, "Tenure": random.randint(0, 8), "Location": random.choice(["New York", "San Francisco", "Chicago", "London", "Austin", "Seattle", "Denver", "Boston"])})
            emp_id += 1
    
    # ═══ GENERATE WORK DESIGN TASKS ═══
    task_types = ["Repetitive", "Variable"]
    logics = ["Deterministic", "Probabilistic", "Judgment-heavy"]
    interactions = ["Independent", "Interactive", "Collaborative"]
    impacts = ["High", "Moderate", "Low"]
    
    work_design_rows = []
    # Generate tasks for top 2 roles per function
    for func in functions_list[:4]:
        roles = cfg["functions"][func]["roles"][:2]
        for role in roles:
            # Check if we have predefined tasks
            if role in cfg.get("tasks_by_role", {}):
                for t_name, t_pct, t_type, t_logic, t_inter, t_impact, t_pskill, t_sskill in cfg["tasks_by_role"][role]:
                    work_design_rows.append({"Job Title": role, "Task Name": t_name, "Est Hours/Week": round(40 * t_pct / 100, 1), "Current Time Spent %": t_pct, "Task Type": t_type, "Logic": t_logic, "Interaction": t_inter, "AI Impact": t_impact, "Primary Skill": t_pskill, "Secondary Skill": t_sskill})
            else:
                # Generate generic tasks
                task_templates = [
                    (f"Data analysis & reporting for {func}", 20, "Repetitive", "Deterministic", "Independent", "High"),
                    (f"Stakeholder communication in {func}", 15, "Variable", "Judgment-heavy", "Collaborative", "Low"),
                    (f"Process documentation & compliance", 15, "Repetitive", "Deterministic", "Independent", "High"),
                    (f"Strategic planning & decision support", 20, "Variable", "Probabilistic", "Interactive", "Moderate"),
                    (f"Team coordination & project management", 15, "Variable", "Judgment-heavy", "Collaborative", "Low"),
                    (f"Quality review & validation", 15, "Repetitive", "Probabilistic", "Interactive", "Moderate"),
                ]
                for t_name, t_pct, t_type, t_logic, t_inter, t_impact in task_templates:
                    skills = cfg["skills"]
                    work_design_rows.append({"Job Title": role, "Task Name": t_name, "Est Hours/Week": round(40 * t_pct / 100, 1), "Current Time Spent %": t_pct, "Task Type": t_type, "Logic": t_logic, "Interaction": t_inter, "AI Impact": t_impact, "Primary Skill": random.choice(skills[:5]), "Secondary Skill": random.choice(skills[5:10])})
    
    # ═══ GENERATE SKILLS DATA ═══
    skills_rows = []
    for emp in employees[:min(num_emp, 200)]:  # Cap at 200 for performance
        for skill in cfg["skills"]:
            if random.random() > 0.2:
                base = 3 if skill in cfg["skills"][:3] and emp["Career Level"] in levels[-3:] else 2
                prof = max(1, min(4, base + random.choices([-1, 0, 0, 1], weights=[10, 35, 35, 20])[0]))
                skills_rows.append({"Employee ID": emp["Employee ID"], "Name": emp["Name"], "Skill": skill, "Proficiency": prof})
    
    # ═══ BUILD DATAFRAMES ═══
    wf_df = pd.DataFrame(employees)
    wd_df = pd.DataFrame(work_design_rows) if work_design_rows else pd.DataFrame()
    sk_df = pd.DataFrame(skills_rows) if skills_rows else pd.DataFrame()
    
    # Operating model
    op_rows = []
    for func in functions_list[:6]:
        for cap in ["Strategy & Planning", "Execution & Delivery", "Analytics & Reporting", "Governance & Compliance", "Innovation & Transformation"]:
            op_rows.append({"Function": func, "Capability": f"{func} {cap}", "Maturity": random.randint(1, 4), "Service Model": random.choice(["Shared", "Embedded", "CoE"])})
    op_df = pd.DataFrame(op_rows)
    
    # Change management
    ch_rows = []
    for emp in employees[:min(num_emp, 100)]:
        ch_rows.append({"Employee ID": emp["Employee ID"], "Name": emp["Name"], "Function": emp["Function"], "Change Readiness": round(random.uniform(1.5, 4.5), 1), "Impact Level": random.choice(["High", "Moderate", "Low"]), "Support Needed": random.choice(["Intensive", "Moderate", "Light"])})
    ch_df = pd.DataFrame(ch_rows)
    
    model_id = f"Tutorial_{industry}_{size}"
    
    return {
        "model_id": model_id,
        "company": cfg["company"],
        "industry": cfg["label"],
        "size_label": sc["label"],
        "datasets": {
            "workforce": wf_df,
            "work_design": wd_df,
            "skills": sk_df,
            "org_design": wf_df[["Employee ID", "Name", "Job Title", "Function", "Career Level", "Manager ID"]].copy(),
            "operating_model": op_df,
            "change_management": ch_df,
        }
    }


def _seed_tutorial_store(industry="technology", size_tier="mid"):
    """Create full-scale org dataset. size_tier: small, mid, large."""
    import pandas as pd
    import numpy as np
    import random
    
    model_id = f"Tutorial_{size_tier.title()}_{industry.title().replace(' ', '_')}"
    
    # Always regenerate — don't cache, to ensure schema changes are picked up
    random.seed(hash(f"{industry}_{size_tier}") % 2**31)

    # ═══════════════════════════════════════════════════
    # CAREER TRACK SYSTEM
    # S=Support, P=Professional, T=Technical, ST=Scientific, M=Management, E=Executive
    # ═══════════════════════════════════════════════════
    CAREER_TRACKS = {
        "S": {"name": "Support", "levels": {"S1": "Support Associate", "S2": "Senior Support Associate", "S3": "Support Specialist", "S4": "Senior Support Specialist"}},
        "P": {"name": "Professional", "levels": {"P1": "Analyst/Associate", "P2": "Senior Analyst", "P3": "Specialist/Consultant", "P4": "Senior Specialist", "P5": "Principal/Lead", "P6": "Distinguished"}},
        "T": {"name": "Technical", "levels": {"T1": "Engineer I", "T2": "Engineer II", "T3": "Senior Engineer", "T4": "Staff Engineer", "T5": "Principal Engineer", "T6": "Distinguished Engineer"}},
        "M": {"name": "Management", "levels": {"M1": "Team Lead", "M2": "Manager", "M3": "Senior Manager", "M4": "Director", "M5": "Senior Director/VP"}},
        "E": {"name": "Executive", "levels": {"E1": "Vice President", "E2": "Senior Vice President", "E3": "EVP/C-Suite", "E4": "CEO/President"}},
    }

    # Map old L-levels to new track+level based on role track
    LEVEL_MAP_IC = {"L2": "P1", "L3": "P2", "L4": "P3", "L5": "P5", "L6": "P6"}
    LEVEL_MAP_TECH = {"L2": "T1", "L3": "T2", "L4": "T3", "L5": "T4", "L6": "T6"}
    LEVEL_MAP_MGR = {"L2": "M1", "L3": "M1", "L4": "M2", "L5": "M4", "L6": "M5"}
    LEVEL_MAP_EXEC = {"L6": "E1"}
    LEVEL_MAP_SUPPORT = {"L2": "S1", "L3": "S2"}

    # Which industries get T-track and/or ST-track
    TECH_INDUSTRIES = {"technology", "aerospace", "manufacturing", "energy"}

    # Roles that should be T-track (technical) vs P-track (professional)
    TECH_ROLE_KEYWORDS = {"engineer", "developer", "devops", "sre", "architect", "data scientist", "ml ", "security engineer", "pen tester", "analyst"}
    SUPPORT_ROLE_KEYWORDS = {"coordinator", "associate", "specialist", "support", "clerk", "assistant", "ap/ar"}
    EXEC_ROLE_KEYWORDS = {"vp ", "cfo", "cto", "ciso", "general counsel", "chro", "ceo", "chief"}

    def assign_career_track(title: str, old_level: str, old_track: str, ind: str) -> tuple:
        """Returns (career_track, career_level, career_level_name)"""
        title_lower = title.lower()

        # Executive track
        if any(kw in title_lower for kw in EXEC_ROLE_KEYWORDS) or old_level == "L6":
            if old_track == "Manager" or old_level in ("L5", "L6"):
                level = LEVEL_MAP_EXEC.get(old_level, "E1")
                return ("E", level, CAREER_TRACKS["E"]["levels"].get(level, "Executive"))

        # Management track
        if old_track == "Manager" and old_level != "L6":
            level = LEVEL_MAP_MGR.get(old_level, "M2")
            return ("M", level, CAREER_TRACKS["M"]["levels"].get(level, "Manager"))

        # Support track
        if any(kw in title_lower for kw in SUPPORT_ROLE_KEYWORDS) and old_level in ("L2", "L3"):
            level = LEVEL_MAP_SUPPORT.get(old_level, "S1")
            return ("S", level, CAREER_TRACKS["S"]["levels"].get(level, "Support"))

        # Technical track (only for tech-heavy industries)
        if ind in TECH_INDUSTRIES and any(kw in title_lower for kw in TECH_ROLE_KEYWORDS):
            level = LEVEL_MAP_TECH.get(old_level, "T2")
            return ("T", level, CAREER_TRACKS["T"]["levels"].get(level, "Engineer"))

        # Default: Professional track
        level = LEVEL_MAP_IC.get(old_level, "P2")
        return ("P", level, CAREER_TRACKS["P"]["levels"].get(level, "Professional"))

    # ═══════════════════════════════════════════════════
    # 24 COMPANIES — 8 industries × 3 sizes
    # ═══════════════════════════════════════════════════
    
    COMPANY_DB = {
        "technology": {
            "small":  {"name": "Palantir Technologies", "employees": 3800, "revenue": "$2.2B", "hq": "Denver", "ticker": "PLTR"},
            "mid":    {"name": "ServiceNow", "employees": 8000, "revenue": "$8.9B", "hq": "Santa Clara", "ticker": "NOW"},
            "large":  {"name": "Adobe", "employees": 25000, "revenue": "$19.4B", "hq": "San Jose", "ticker": "ADBE"},
        },
        "financial_services": {
            "small":  {"name": "Evercore", "employees": 2200, "revenue": "$2.4B", "hq": "New York", "ticker": "EVR"},
            "mid":    {"name": "Raymond James", "employees": 8000, "revenue": "$12.8B", "hq": "St. Petersburg", "ticker": "RJF"},
            "large":  {"name": "Goldman Sachs", "employees": 25000, "revenue": "$46.3B", "hq": "New York", "ticker": "GS"},
        },
        "healthcare": {
            "small":  {"name": "Hims & Hers Health", "employees": 1500, "revenue": "$1.2B", "hq": "San Francisco", "ticker": "HIMS"},
            "mid":    {"name": "Molina Healthcare", "employees": 8000, "revenue": "$33.7B", "hq": "Long Beach", "ticker": "MOH"},
            "large":  {"name": "Elevance Health", "employees": 25000, "revenue": "$171B", "hq": "Indianapolis", "ticker": "ELV"},
        },
        "retail": {
            "small":  {"name": "Five Below", "employees": 3000, "revenue": "$3.1B", "hq": "Philadelphia", "ticker": "FIVE"},
            "mid":    {"name": "Williams-Sonoma", "employees": 8000, "revenue": "$7.7B", "hq": "San Francisco", "ticker": "WSM"},
            "large":  {"name": "Target", "employees": 25000, "revenue": "$107B", "hq": "Minneapolis", "ticker": "TGT"},
        },
        "manufacturing": {
            "small":  {"name": "Axon Enterprise", "employees": 4000, "revenue": "$1.9B", "hq": "Scottsdale", "ticker": "AXON"},
            "mid":    {"name": "Parker Hannifin", "employees": 8000, "revenue": "$19.1B", "hq": "Cleveland", "ticker": "PH"},
            "large":  {"name": "Honeywell", "employees": 25000, "revenue": "$36.7B", "hq": "Charlotte", "ticker": "HON"},
        },
        "consulting": {
            "small":  {"name": "Huron Consulting", "employees": 2500, "revenue": "$1.4B", "hq": "Chicago", "ticker": "HURN"},
            "mid":    {"name": "Booz Allen Hamilton", "employees": 8000, "revenue": "$9.1B", "hq": "McLean", "ticker": "BAH"},
            "large":  {"name": "Accenture", "employees": 25000, "revenue": "$64.1B", "hq": "Dublin", "ticker": "ACN"},
        },
        "energy": {
            "small":  {"name": "Shoals Technologies", "employees": 1800, "revenue": "$0.5B", "hq": "Portland TN", "ticker": "SHLS"},
            "mid":    {"name": "Chesapeake Energy", "employees": 3000, "revenue": "$4.8B", "hq": "Oklahoma City", "ticker": "CHK"},
            "large":  {"name": "Baker Hughes", "employees": 25000, "revenue": "$25.5B", "hq": "Houston", "ticker": "BKR"},
        },
        "aerospace": {
            "small":  {"name": "Kratos Defense", "employees": 4000, "revenue": "$1.1B", "hq": "San Diego", "ticker": "KTOS"},
            "mid":    {"name": "L3Harris Technologies", "employees": 8000, "revenue": "$19.4B", "hq": "Melbourne FL", "ticker": "LHX"},
            "large":  {"name": "Northrop Grumman", "employees": 25000, "revenue": "$39.3B", "hq": "Falls Church", "ticker": "NOC"},
        },
    }

    company = COMPANY_DB.get(industry, COMPANY_DB["technology"]).get(size_tier, COMPANY_DB["technology"]["mid"])
    target_size = company["employees"]
    
    # Generate exact target size — card count must match actual record count
    gen_size = target_size
    
    # ═══════════════════════════════════════════════════
    # ORGANIZATIONAL BLUEPRINT — 9 functions per industry
    # ═══════════════════════════════════════════════════
    
    FUNC_BLUEPRINTS = {
        "technology": [
            ("Engineering", 0.30, [("Junior Software Engineer","L2","IC",85000,105000,0.30), ("Software Engineer","L3","IC",110000,140000,0.25), ("Senior Software Engineer","L4","IC",140000,180000,0.20), ("Staff Engineer","L5","IC",180000,220000,0.08), ("Engineering Manager","L4","Manager",150000,190000,0.10), ("Sr Engineering Manager","L5","Manager",190000,230000,0.05), ("VP Engineering","L6","Manager",230000,300000,0.02)]),
            ("Product", 0.12, [("Associate PM","L2","IC",90000,110000,0.25), ("Product Manager","L3","IC",120000,150000,0.30), ("Senior PM","L4","IC",150000,190000,0.20), ("UX Designer","L3","IC",95000,125000,0.15), ("Director of Product","L5","Manager",190000,240000,0.08), ("VP Product","L6","Manager",240000,300000,0.02)]),
            ("Data & Analytics", 0.15, [("Data Analyst","L3","IC",80000,100000,0.30), ("Senior Data Analyst","L4","IC",100000,130000,0.20), ("Data Engineer","L3","IC",110000,140000,0.20), ("Data Scientist","L4","IC",130000,170000,0.12), ("ML Engineer","L4","IC",140000,180000,0.08), ("Analytics Manager","L4","Manager",130000,160000,0.07), ("VP Data","L6","Manager",220000,280000,0.03)]),
            ("IT & Infrastructure", 0.10, [("IT Support","L2","IC",55000,72000,0.30), ("Sys Admin","L3","IC",75000,95000,0.25), ("DevOps Engineer","L3","IC",110000,140000,0.20), ("SRE","L4","IC",130000,165000,0.12), ("IT Manager","L4","Manager",120000,150000,0.08), ("Director IT","L5","Manager",160000,200000,0.05)]),
            ("Security", 0.06, [("Security Analyst","L3","IC",90000,115000,0.35), ("Security Engineer","L4","IC",120000,155000,0.30), ("Pen Tester","L3","IC",100000,130000,0.15), ("Security Manager","L4","Manager",140000,175000,0.12), ("CISO","L6","Manager",210000,280000,0.08)]),
            ("Sales & Marketing", 0.12, [("SDR","L2","IC",55000,70000,0.25), ("Account Executive","L3","IC",80000,120000,0.25), ("Marketing Specialist","L3","IC",70000,90000,0.20), ("Content Strategist","L3","IC",75000,95000,0.10), ("Sales Manager","L4","Manager",120000,160000,0.10), ("VP Marketing","L6","Manager",200000,260000,0.05), ("VP Sales","L6","Manager",210000,280000,0.05)]),
            ("Finance", 0.06, [("Financial Analyst","L3","IC",75000,95000,0.30), ("Accountant","L3","IC",65000,85000,0.25), ("FP&A Manager","L4","Manager",110000,140000,0.15), ("Controller","L5","Manager",150000,190000,0.10), ("AP/AR Specialist","L2","IC",48000,62000,0.15), ("CFO","L6","Manager",240000,320000,0.05)]),
            ("HR & People", 0.05, [("HR Coordinator","L2","IC",50000,65000,0.25), ("HRBP","L3","IC",80000,100000,0.25), ("Recruiter","L3","IC",70000,90000,0.20), ("L&D Specialist","L3","IC",72000,92000,0.10), ("HR Manager","L4","Manager",100000,130000,0.10), ("VP People","L6","Manager",200000,260000,0.05), ("Comp Analyst","L3","IC",72000,92000,0.05)]),
            ("Legal", 0.04, [("Paralegal","L2","IC",55000,72000,0.30), ("Corporate Counsel","L4","IC",140000,180000,0.25), ("Compliance Analyst","L3","IC",80000,100000,0.20), ("Privacy Officer","L4","IC",120000,155000,0.10), ("General Counsel","L6","Manager",230000,300000,0.05), ("Contract Manager","L3","IC",85000,110000,0.10)]),
        ],
    }
    
    # Industry-specific function & role overrides
    RENAMES = {
        "financial_services": {"Engineering":"Technology","Product":"Investment Banking","Data & Analytics":"Risk Management","IT Operations":"Operations","Security":"Compliance","Sales & Marketing":"Wealth Management","Finance":"Treasury","HR & People":"HR","Legal":"Legal & Regulatory",
            "Junior Software Engineer":"Junior Analyst","Software Engineer":"Quantitative Analyst","Senior Software Engineer":"Senior Quant","Staff Engineer":"VP Quant Research","Engineering Manager":"Tech Lead","Associate PM":"Investment Analyst","Product Manager":"Associate","Senior PM":"VP Investments","UX Designer":"Trading Analyst","SDR":"Client Associate","Account Executive":"Relationship Manager","Data Analyst":"Risk Analyst","Accountant":"Fund Accountant","Compliance Analyst":"Regulatory Analyst","IT Support":"Operations Associate","Recruiter":"TA Specialist","Paralegal":"Legal Analyst"},
        "healthcare": {"Engineering":"Health Informatics","Product":"Clinical Operations","Data & Analytics":"Revenue Cycle","IT Operations":"IT Services","Security":"Quality & Safety","Sales & Marketing":"Patient Services","Legal":"Compliance",
            "Junior Software Engineer":"Clinical Systems Analyst","Software Engineer":"EHR Developer","Data Analyst":"Clinical Data Analyst","Product Manager":"Care Coordinator","SDR":"Patient Access Rep","Account Executive":"Provider Relations","UX Designer":"Medical Coder","IT Support":"Help Desk","Security Analyst":"Quality Auditor","Compliance Analyst":"HIPAA Analyst","Recruiter":"Nurse Recruiter","Accountant":"Revenue Cycle Specialist"},
        "manufacturing": {"Product":"Production","Data & Analytics":"Quality Control","IT Operations":"Maintenance","Security":"EHS","Sales & Marketing":"Supply Chain","Legal":"Regulatory",
            "Software Engineer":"Process Engineer","Data Analyst":"Quality Analyst","Product Manager":"Production Planner","SDR":"Procurement Specialist","Account Executive":"Supply Chain Analyst","UX Designer":"Industrial Engineer","IT Support":"Maintenance Technician","Security Analyst":"EHS Coordinator","DevOps Engineer":"Automation Engineer"},
        "retail": {"Engineering":"E-Commerce Tech","Product":"Merchandising","Data & Analytics":"Analytics","IT Operations":"Store Operations","Security":"Loss Prevention","Sales & Marketing":"Marketing",
            "Software Engineer":"E-Commerce Developer","Data Analyst":"Demand Planner","Product Manager":"Category Manager","SDR":"Store Associate","Account Executive":"District Manager","UX Designer":"Visual Merchandiser","IT Support":"Store Tech","Security Analyst":"LP Analyst"},
        "consulting": {"Engineering":"Technology","Product":"Strategy & Consulting","Data & Analytics":"Analytics","IT Operations":"Operations","Security":"Risk & Compliance","Sales & Marketing":"Business Development","Legal":"Legal & Contracts",
            "Junior Software Engineer":"Junior Consultant","Software Engineer":"Consultant","Senior Software Engineer":"Senior Consultant","Staff Engineer":"Principal","Engineering Manager":"Managing Director","Sr Engineering Manager":"Senior MD","VP Engineering":"Partner","Associate PM":"Analyst","Product Manager":"Senior Analyst","Senior PM":"Manager","UX Designer":"Specialist","SDR":"BD Analyst","Account Executive":"Account Manager","Data Analyst":"Data Consultant","Recruiter":"TA Partner"},
        "energy": {"Product":"Operations","Data & Analytics":"Reservoir Engineering","IT Operations":"SCADA/OT","Security":"HSE","Sales & Marketing":"Land & Commercial",
            "Software Engineer":"Controls Engineer","Data Analyst":"Reservoir Analyst","Product Manager":"Operations Superintendent","SDR":"Landman","Account Executive":"Commercial Manager","UX Designer":"Renewables Analyst","DevOps Engineer":"SCADA Engineer","Security Analyst":"HSE Coordinator"},
        "aerospace": {"Engineering":"Engineering Systems","Product":"Mission Systems","Data & Analytics":"Systems Integration","IT Operations":"IT & Cyber","Security":"Security & Classification","Sales & Marketing":"Business Development","Finance":"Program Finance","Legal":"Contracts",
            "Junior Software Engineer":"Associate Engineer","Software Engineer":"Systems Engineer","Senior Software Engineer":"Senior Systems Engineer","Staff Engineer":"Principal Engineer","Engineering Manager":"Engineering Lead","Sr Engineering Manager":"Program Manager","VP Engineering":"VP Engineering","Associate PM":"Program Analyst","Product Manager":"Systems Analyst","Senior PM":"Deputy Program Manager","SDR":"BD Analyst","Account Executive":"Capture Manager","Data Analyst":"Test Engineer","Recruiter":"Cleared Recruiter","Security Analyst":"Security Specialist","Compliance Analyst":"Classification Specialist"},
    }
    
    INDUSTRY_SKILLS = {
        "technology": ["Data Analysis","Python/SQL","Cloud Platforms","AI/ML Tools","Process Automation","Communication","Leadership","Stakeholder Mgmt","Critical Thinking","Digital Fluency","AI Literacy","Change Agility","Cybersecurity","DevOps","UX Design"],
        "financial_services": ["Data Analysis","Financial Modeling","Risk Assessment","Regulatory Knowledge","Process Automation","Communication","Leadership","Stakeholder Mgmt","Critical Thinking","AI/ML Tools","Python/SQL","Compliance","Negotiation","Digital Fluency","AI Literacy"],
        "healthcare": ["Clinical Data Analysis","Medical Coding","EHR Systems","Regulatory Knowledge","Process Automation","Communication","Leadership","Stakeholder Mgmt","Critical Thinking","AI/ML Tools","Patient Experience","Quality Improvement","HIPAA Compliance","Digital Fluency","AI Literacy"],
        "manufacturing": ["Data Analysis","Process Engineering","Quality Control","Lean/Six Sigma","Supply Chain Mgmt","Communication","Leadership","Stakeholder Mgmt","Critical Thinking","AI/ML Tools","ERP Systems","Predictive Maintenance","Safety Compliance","Digital Fluency","AI Literacy"],
        "retail": ["Data Analysis","Demand Forecasting","Inventory Mgmt","Customer Experience","Process Automation","Communication","Leadership","Stakeholder Mgmt","Critical Thinking","AI/ML Tools","E-Commerce","Digital Marketing","Negotiation","Digital Fluency","AI Literacy"],
        "consulting": ["Data Analysis","Strategy Frameworks","Client Management","Process Design","Process Automation","Communication","Leadership","Stakeholder Mgmt","Critical Thinking","AI/ML Tools","Change Management","Financial Modeling","Industry Knowledge","Digital Fluency","AI Literacy"],
        "energy": ["Data Analysis","Process Engineering","Asset Mgmt","HSE Knowledge","Process Automation","Communication","Leadership","Stakeholder Mgmt","Critical Thinking","AI/ML Tools","SCADA Systems","Predictive Analytics","Regulatory Knowledge","Digital Fluency","AI Literacy"],
        "aerospace": ["Systems Engineering","Requirements Analysis","Program Management","Security Clearance Protocols","Process Automation","Communication","Leadership","Stakeholder Mgmt","Critical Thinking","AI/ML Tools","Model-Based Engineering","Test & Evaluation","DoD Acquisition","Digital Fluency","AI Literacy"],
    }

    # ═══ INDUSTRY-SPECIFIC JOB FAMILY / SUB-FAMILY MAPPING ═══
    # Maps base_role_title → (job_family, sub_family, allowed_levels)
    # Each industry has distinct, realistic sub-families under each job family.
    # allowed_levels constrains which career levels appear in that sub-family.

    # ═══ HIERARCHY: Function → Job Family → Sub-Family → Job Title → Career Level ═══
    # FUNCTION: Broadest grouping (4-8 per company). Set by FUNC_BLUEPRINTS.
    # JOB FAMILY: Cluster of related roles within a function (2-4 per function, 8-15 total).
    # SUB-FAMILY: Specialization within a family (2-5 per family).
    # JOB TITLE: The actual role name.
    # Mapping format: "base_title": ("job_family", "sub_family", [allowed_levels])
    _TECH_HIERARCHY = {
        # Function: Engineering → Family: Software Engineering (sub: Frontend, Backend, Platform, Management)
        "Junior Software Engineer": ("Software Engineering", "Frontend Development", ["L2"]),
        "Software Engineer":        ("Software Engineering", "Backend Development", ["L2","L3"]),
        "Senior Software Engineer": ("Software Engineering", "Full Stack Development", ["L3","L4"]),
        "Staff Engineer":           ("Software Engineering", "Platform & Architecture", ["L4","L5"]),
        "Engineering Manager":      ("Software Engineering", "Engineering Management", ["L4"]),
        "Sr Engineering Manager":   ("Software Engineering", "Engineering Management", ["L5"]),
        "VP Engineering":           ("Software Engineering", "Engineering Leadership", ["L6"]),
        "Frontend Developer":       ("Software Engineering", "Frontend Development", ["L2","L3"]),
        "Backend Developer":        ("Software Engineering", "Backend Development", ["L3","L4"]),
        # Function: Product → Family: Product & Design (sub: Product Strategy, UX, Analytics)
        "Associate PM":        ("Product & Design", "Product Discovery", ["L2"]),
        "Product Manager":     ("Product & Design", "Product Strategy", ["L3","L4"]),
        "Senior PM":           ("Product & Design", "Product Strategy", ["L4","L5"]),
        "UX Designer":         ("Product & Design", "UX & Interaction Design", ["L3"]),
        "Director of Product": ("Product & Design", "Product Leadership", ["L5"]),
        "VP Product":          ("Product & Design", "Product Leadership", ["L6"]),
        "UX Researcher":       ("Product & Design", "User Research", ["L3","L4"]),
        "Product Analyst":     ("Product & Design", "Product Analytics", ["L2","L3"]),
        # Function: Data & Analytics → Family: Data & Analytics (sub: BI, Data Engineering, Data Science, ML)
        "Data Analyst":        ("Data & Analytics", "Business Intelligence", ["L3"]),
        "Senior Data Analyst": ("Data & Analytics", "Analytics & Reporting", ["L4"]),
        "Data Engineer":       ("Data & Analytics", "Data Engineering", ["L3","L4"]),
        "Data Scientist":      ("Data & Analytics", "Data Science", ["L4"]),
        "ML Engineer":         ("Data & Analytics", "ML Engineering", ["L4"]),
        "Analytics Engineer":  ("Data & Analytics", "Analytics Engineering", ["L3","L4"]),
        "Analytics Manager":   ("Data & Analytics", "BI Management", ["L4"]),
        "VP Data":             ("Data & Analytics", "Data Leadership", ["L6"]),
        # Function: IT Operations → Family: IT & Infrastructure (sub: Service Desk, Infra, DevOps, SRE)
        "IT Support":    ("IT & Infrastructure", "Service Desk", ["L2"]),
        "Sys Admin":     ("IT & Infrastructure", "Infrastructure & Networking", ["L3"]),
        "DevOps Engineer": ("IT & Infrastructure", "DevOps & CI/CD", ["L3"]),
        "SRE":           ("IT & Infrastructure", "Site Reliability", ["L4"]),
        "IT Manager":    ("IT & Infrastructure", "IT Management", ["L4"]),
        "Director IT":   ("IT & Infrastructure", "IT Leadership", ["L5"]),
        # Function: Security → Family: Cybersecurity (sub: SecOps, Engineering, Offensive, Management)
        "Security Analyst":  ("Cybersecurity", "Security Operations", ["L3"]),
        "Security Engineer": ("Cybersecurity", "Security Engineering", ["L4"]),
        "Pen Tester":        ("Cybersecurity", "Offensive Security", ["L3"]),
        "Security Manager":  ("Cybersecurity", "Security Management", ["L4"]),
        "CISO":              ("Cybersecurity", "Security Leadership", ["L6"]),
        # Function: Sales & Marketing → Family: Sales & Marketing (sub: Sales, Marketing, BD)
        "SDR":                  ("Sales & Marketing", "Business Development", ["L2"]),
        "Account Executive":    ("Sales & Marketing", "Enterprise Sales", ["L3"]),
        "Marketing Specialist": ("Sales & Marketing", "Demand Generation", ["L3"]),
        "Content Strategist":   ("Sales & Marketing", "Content & Brand", ["L3"]),
        "Sales Manager":        ("Sales & Marketing", "Sales Management", ["L4"]),
        "VP Marketing":         ("Sales & Marketing", "Marketing Leadership", ["L6"]),
        "VP Sales":             ("Sales & Marketing", "Sales Leadership", ["L6"]),
        # Function: Finance → Family: Finance (sub: FP&A, Accounting, Tax, Treasury)
        "Financial Analyst": ("Finance", "FP&A", ["L3"]),
        "Accountant":        ("Finance", "Accounting", ["L3"]),
        "FP&A Manager":      ("Finance", "FP&A", ["L4"]),
        "Controller":        ("Finance", "Controllership", ["L5"]),
        "AP/AR Specialist":  ("Finance", "Accounts Payable & Receivable", ["L2"]),
        "CFO":               ("Finance", "Finance Leadership", ["L6"]),
        "Tax Specialist":    ("Finance", "Tax", ["L3"]),
        # Function: HR → Family: Human Resources (sub: HR Ops, HRBP, TA, L&D, Comp)
        "HR Coordinator":  ("Human Resources", "HR Operations", ["L2"]),
        "HRBP":            ("Human Resources", "Business Partnering", ["L3"]),
        "Recruiter":       ("Human Resources", "Talent Acquisition", ["L3"]),
        "L&D Specialist":  ("Human Resources", "Learning & Development", ["L3"]),
        "HR Manager":      ("Human Resources", "HR Management", ["L4"]),
        "VP People":       ("Human Resources", "HR Leadership", ["L6"]),
        "Comp Analyst":    ("Human Resources", "Compensation & Benefits", ["L3"]),
        # Function: Legal → Family: Legal & Compliance (sub: Legal Ops, Advisory, Compliance, Privacy)
        "Paralegal":          ("Legal & Compliance", "Legal Operations", ["L2"]),
        "Corporate Counsel":  ("Legal & Compliance", "Corporate Law", ["L4"]),
        "Compliance Analyst": ("Legal & Compliance", "Regulatory Compliance", ["L3"]),
        "Privacy Officer":    ("Legal & Compliance", "Data Privacy", ["L4"]),
        "General Counsel":    ("Legal & Compliance", "Legal Leadership", ["L6"]),
        "Contract Manager":   ("Legal & Compliance", "Contract Management", ["L3"]),
    }

    _FINSERV_HIERARCHY = {
        # Technology (renamed from Engineering)
        "Junior Software Engineer": ("Systems Engineering", "Application Development", ["L2"]),
        "Software Engineer":        ("Systems Engineering", "Trading Systems", ["L2","L3"]),
        "Senior Software Engineer": ("Systems Engineering", "Risk Platforms", ["L3","L4"]),
        "Staff Engineer":           ("Systems Engineering", "Architecture & Quant Infrastructure", ["L4","L5"]),
        "Engineering Manager":      ("Systems Engineering", "Tech Management", ["L4"]),
        "Sr Engineering Manager":   ("Systems Engineering", "Tech Management", ["L5"]),
        "VP Engineering":           ("Systems Engineering", "Leadership", ["L6"]),
        # Investment Banking (renamed from Product)
        "Associate PM":        ("Deal Execution", "M&A Advisory", ["L2"]),
        "Product Manager":     ("Deal Execution", "Capital Markets", ["L3","L4"]),
        "Senior PM":           ("Deal Execution", "Structured Finance", ["L4","L5"]),
        "UX Designer":         ("Wealth Management", "Trading Analytics", ["L3"]),
        "Director of Product": ("Deal Execution", "Deal Leadership", ["L5"]),
        "VP Product":          ("Deal Execution", "Leadership", ["L6"]),
        # Risk Management (renamed from Data & Analytics)
        "Data Analyst":        ("Quantitative Risk", "Market Risk Analytics", ["L3"]),
        "Senior Data Analyst": ("Quantitative Risk", "Credit Risk Analytics", ["L4"]),
        "Data Engineer":       ("Quantitative Risk", "Risk Data Engineering", ["L3","L4"]),
        "Data Scientist":      ("Quantitative Risk", "Model Development", ["L4"]),
        "ML Engineer":         ("Quantitative Risk", "Quantitative Strategies", ["L4"]),
        "Analytics Manager":   ("Quantitative Risk", "Risk Management", ["L4"]),
        "VP Data":             ("Quantitative Risk", "Leadership", ["L6"]),
        # Operations (renamed from IT Operations)
        "IT Support":    ("Operations", "Settlement & Clearing", ["L2"]),
        "Sys Admin":     ("Operations", "Reconciliation & Control", ["L3"]),
        "DevOps Engineer": ("Operations", "Trade Support Systems", ["L3"]),
        "SRE":           ("Operations", "Operations Technology", ["L4"]),
        "IT Manager":    ("Operations", "Middle Office Management", ["L4"]),
        "Director IT":   ("Operations", "Operations Leadership", ["L5"]),
        # Compliance (renamed from Security)
        "Security Analyst":  ("Legal & Compliance", "Banking Regulation", ["L3"]),
        "Security Engineer": ("Legal & Compliance", "Securities Compliance", ["L4"]),
        "Pen Tester":        ("Legal & Compliance", "Trade Surveillance & AML", ["L3"]),
        "Security Manager":  ("Legal & Compliance", "Compliance Management", ["L4"]),
        "CISO":              ("Legal & Compliance", "Leadership", ["L6"]),
        # Wealth Management (renamed from Sales & Marketing)
        "SDR":                  ("Wealth Management", "Client Onboarding", ["L2"]),
        "Account Executive":    ("Wealth Management", "Client Advisory", ["L3"]),
        "Marketing Specialist": ("Wealth Management", "Wealth Strategy", ["L3"]),
        "Content Strategist":   ("Wealth Management", "Portfolio Management", ["L3"]),
        "Sales Manager":        ("Wealth Management", "Relationship Management", ["L4"]),
        "VP Marketing":         ("Wealth Management", "Leadership", ["L6"]),
        "VP Sales":             ("Wealth Management", "Leadership", ["L6"]),
        # Treasury (renamed from Finance)
        "Financial Analyst": ("Finance", "Liquidity Management", ["L3"]),
        "Accountant":        ("Finance", "NAV & Valuations", ["L3"]),
        "FP&A Manager":      ("Finance", "Capital Planning", ["L4"]),
        "Controller":        ("Finance", "Financial Control", ["L5"]),
        "AP/AR Specialist":  ("Finance", "Settlements & Payments", ["L2"]),
        "CFO":               ("Finance", "Finance Leadership", ["L6"]),
        "Tax Specialist":    ("Finance", "Tax & Regulatory Reporting", ["L3"]),
        # HR
        "HR Coordinator":  ("Human Resources", "HRIS & Shared Services", ["L2"]),
        "HRBP":            ("Human Resources", "Front Office Partnering", ["L3"]),
        "Recruiter":       ("Human Resources", "Campus & Experienced Hire", ["L3"]),
        "L&D Specialist":  ("Human Resources", "Professional Development", ["L3"]),
        "HR Manager":      ("Human Resources", "HR Management", ["L4"]),
        "VP People":       ("Human Resources", "HR Leadership", ["L6"]),
        "Comp Analyst":    ("Human Resources", "Compensation Design", ["L3"]),
        # Legal & Regulatory (renamed from Legal)
        "Paralegal":          ("Legal & Compliance", "Transactional Support", ["L2"]),
        "Corporate Counsel":  ("Legal & Compliance", "Securities & Transactional Law", ["L4"]),
        "Compliance Analyst": ("Legal & Compliance", "SEC & FINRA Compliance", ["L3"]),
        "Privacy Officer":    ("Legal & Compliance", "Data Governance", ["L4"]),
        "General Counsel":    ("Legal & Compliance", "Legal Leadership", ["L6"]),
        "Contract Manager":   ("Legal & Compliance", "ISDA & Documentation", ["L3"]),
    }

    _HEALTHCARE_HIERARCHY = {
        # Health Informatics (renamed from Engineering)
        "Junior Software Engineer": ("Clinical Services", "EHR Administration", ["L2"]),
        "Software Engineer":        ("Clinical Services", "Clinical Applications", ["L2","L3"]),
        "Senior Software Engineer": ("Clinical Services", "Integration & Interoperability", ["L3","L4"]),
        "Staff Engineer":           ("Clinical Services", "Health IT Architecture", ["L4","L5"]),
        "Engineering Manager":      ("Clinical Services", "Health IT Management", ["L4"]),
        "Sr Engineering Manager":   ("Clinical Services", "Health IT Management", ["L5"]),
        "VP Engineering":           ("Health Informatics", "Leadership", ["L6"]),
        # Clinical Operations (renamed from Product)
        "Associate PM":        ("Nursing Operations", "Care Coordination", ["L2"]),
        "Product Manager":     ("Nursing Operations", "Clinical Workflow", ["L3","L4"]),
        "Senior PM":           ("Clinical Support", "Pharmacy Operations", ["L4","L5"]),
        "UX Designer":         ("Clinical Support", "Medical Coding", ["L3"]),
        "Director of Product": ("Clinical Services", "Leadership", ["L5"]),
        "VP Product":          ("Clinical Services", "Leadership", ["L6"]),
        # Revenue Cycle (renamed from Data & Analytics)
        "Data Analyst":        ("Coding & Billing", "Medical Coding", ["L3"]),
        "Senior Data Analyst": ("Coding & Billing", "Claims Processing", ["L4"]),
        "Data Engineer":       ("Patient Financial Services", "Revenue Data Engineering", ["L3","L4"]),
        "Data Scientist":      ("Patient Financial Services", "Revenue Analytics", ["L4"]),
        "ML Engineer":         ("Population Health", "Clinical Analytics", ["L4"]),
        "Analytics Manager":   ("Patient Financial Services", "Revenue Cycle Management", ["L4"]),
        "VP Data":             ("Finance", "Leadership", ["L6"]),
        # IT Services (renamed from IT Operations)
        "IT Support":    ("IT & Infrastructure", "Help Desk & Desktop Support", ["L2"]),
        "Sys Admin":     ("IT & Infrastructure", "Network & Infrastructure", ["L3"]),
        "DevOps Engineer": ("IT & Infrastructure", "Clinical Systems Support", ["L3"]),
        "SRE":           ("IT & Infrastructure", "Infrastructure Reliability", ["L4"]),
        "IT Manager":    ("IT & Infrastructure", "IT Operations Management", ["L4"]),
        "Director IT":   ("IT & Infrastructure", "IT Leadership", ["L5"]),
        # Quality & Safety (renamed from Security)
        "Security Analyst":  ("Clinical Services", "Performance Metrics & Accreditation", ["L3"]),
        "Security Engineer": ("Clinical Services", "Process Improvement", ["L4"]),
        "Pen Tester":        ("Patient Safety", "Risk Management & Reporting", ["L3"]),
        "Security Manager":  ("Patient Safety", "Infection Control", ["L4"]),
        "CISO":              ("Quality & Safety", "Leadership", ["L6"]),
        # Patient Services (renamed from Sales & Marketing)
        "SDR":                  ("Access Services", "Registration & Scheduling", ["L2"]),
        "Account Executive":    ("Access Services", "Patient Access & Authorization", ["L3"]),
        "Marketing Specialist": ("Patient Experience", "Patient Relations", ["L3"]),
        "Content Strategist":   ("Patient Experience", "Case Management", ["L3"]),
        "Sales Manager":        ("Access Services", "Access Management", ["L4"]),
        "VP Marketing":         ("Clinical Services", "Leadership", ["L6"]),
        "VP Sales":             ("Clinical Services", "Leadership", ["L6"]),
        # Finance
        "Financial Analyst": ("Finance", "Budgeting & Forecasting", ["L3"]),
        "Accountant":        ("Finance", "General Accounting", ["L3"]),
        "FP&A Manager":      ("Finance", "Financial Reporting", ["L4"]),
        "Controller":        ("Finance", "Reimbursement & Payer Relations", ["L5"]),
        "AP/AR Specialist":  ("Finance", "Accounts Payable", ["L2"]),
        "CFO":               ("Finance", "Finance Leadership", ["L6"]),
        "Tax Specialist":    ("Finance", "Tax & Regulatory Reporting", ["L3"]),
        # HR
        "HR Coordinator":  ("Human Resources", "Employee Services", ["L2"]),
        "HRBP":            ("Human Resources", "Clinical Partnering", ["L3"]),
        "Recruiter":       ("Human Resources", "Clinical Recruiting", ["L3"]),
        "L&D Specialist":  ("Human Resources", "Clinical Education & Training", ["L3"]),
        "HR Manager":      ("Human Resources", "Workforce Planning & Scheduling", ["L4"]),
        "VP People":       ("Human Resources", "HR Leadership", ["L6"]),
        "Comp Analyst":    ("Human Resources", "Benefits & Compensation", ["L3"]),
        # Compliance (renamed from Legal)
        "Paralegal":          ("Legal & Compliance", "HIPAA & Privacy", ["L2"]),
        "Corporate Counsel":  ("Legal & Compliance", "Healthcare Law", ["L4"]),
        "Compliance Analyst": ("Legal & Compliance", "Joint Commission & CMS", ["L3"]),
        "Privacy Officer":    ("Legal & Compliance", "Health Information Management", ["L4"]),
        "General Counsel":    ("Legal & Compliance", "Legal Leadership", ["L6"]),
        "Contract Manager":   ("Legal & Compliance", "Payer Contracts & Agreements", ["L3"]),
    }

    _MANUFACTURING_HIERARCHY = {
        # Engineering
        "Junior Software Engineer": ("Manufacturing Engineering", "Process Engineering", ["L2"]),
        "Software Engineer":        ("Manufacturing Engineering", "Automation & Controls", ["L2","L3"]),
        "Senior Software Engineer": ("Manufacturing Engineering", "Industrial Engineering", ["L3","L4"]),
        "Staff Engineer":           ("Manufacturing Engineering", "R&D & New Product Development", ["L4","L5"]),
        "Engineering Manager":      ("Manufacturing Engineering", "Engineering Management", ["L4"]),
        "Sr Engineering Manager":   ("Manufacturing Engineering", "Engineering Management", ["L5"]),
        "VP Engineering":           ("Software Engineering", "Engineering Leadership", ["L6"]),
        # Production (renamed from Product)
        "Associate PM":        ("Production Operations", "Production Scheduling", ["L2"]),
        "Product Manager":     ("Production Operations", "Production Planning", ["L3","L4"]),
        "Senior PM":           ("Production Operations", "Continuous Improvement", ["L4","L5"]),
        "UX Designer":         ("Production Operations", "Methods Engineering", ["L3"]),
        "Director of Product": ("Production Operations", "Plant Management", ["L5"]),
        "VP Product":          ("Manufacturing & Operations", "Leadership", ["L6"]),
        # Quality Control (renamed from Data & Analytics)
        "Data Analyst":        ("Quality Assurance", "Inspection & Testing", ["L3"]),
        "Senior Data Analyst": ("Quality Assurance", "Six Sigma & Lean", ["L4"]),
        "Data Engineer":       ("Quality Assurance", "Quality Systems & Data", ["L3","L4"]),
        "Data Scientist":      ("Quality Assurance", "Statistical Process Control", ["L4"]),
        "ML Engineer":         ("Quality Assurance", "Predictive Quality", ["L4"]),
        "Analytics Manager":   ("Quality Assurance", "Quality Management", ["L4"]),
        "VP Data":             ("Quality", "Leadership", ["L6"]),
        # Maintenance (renamed from IT Operations)
        "IT Support":    ("Maintenance & Reliability", "Preventive Maintenance", ["L2"]),
        "Sys Admin":     ("Maintenance & Reliability", "Predictive Maintenance", ["L3"]),
        "DevOps Engineer": ("Maintenance & Reliability", "Automation Systems (PLC/SCADA)", ["L3"]),
        "SRE":           ("Maintenance & Reliability", "Reliability Engineering", ["L4"]),
        "IT Manager":    ("Maintenance & Reliability", "Maintenance Management", ["L4"]),
        "Director IT":   ("Maintenance & Reliability", "Maintenance Leadership", ["L5"]),
        # EHS (renamed from Security)
        "Security Analyst":  ("Manufacturing & Operations", "Workplace Safety", ["L3"]),
        "Security Engineer": ("Manufacturing & Operations", "Environmental Compliance", ["L4"]),
        "Pen Tester":        ("Manufacturing & Operations", "Industrial Hygiene", ["L3"]),
        "Security Manager":  ("Manufacturing & Operations", "EHS Management", ["L4"]),
        "CISO":              ("Manufacturing & Operations", "Leadership", ["L6"]),
        # Supply Chain (renamed from Sales & Marketing)
        "SDR":                  ("Manufacturing & Operations", "Procurement & Sourcing", ["L2"]),
        "Account Executive":    ("Manufacturing & Operations", "Supplier Management", ["L3"]),
        "Marketing Specialist": ("Manufacturing & Operations", "Demand Planning", ["L3"]),
        "Content Strategist":   ("Manufacturing & Operations", "Logistics & Distribution", ["L3"]),
        "Sales Manager":        ("Manufacturing & Operations", "Supply Chain Management", ["L4"]),
        "VP Marketing":         ("Manufacturing & Operations", "Leadership", ["L6"]),
        "VP Sales":             ("Commercial", "Leadership", ["L6"]),
        # Finance
        "Financial Analyst": ("Finance", "Cost Accounting & Analysis", ["L3"]),
        "Accountant":        ("Finance", "Plant Accounting", ["L3"]),
        "FP&A Manager":      ("Finance", "Budgeting & Variance Analysis", ["L4"]),
        "Controller":        ("Finance", "Plant Controllership", ["L5"]),
        "AP/AR Specialist":  ("Finance", "Accounts Payable", ["L2"]),
        "CFO":               ("Finance", "Finance Leadership", ["L6"]),
        "Tax Specialist":    ("Finance", "Tax & Payroll", ["L3"]),
        # HR
        "HR Coordinator":  ("Human Resources", "HR Administration", ["L2"]),
        "HRBP":            ("Human Resources", "Plant HR Partnering", ["L3"]),
        "Recruiter":       ("Human Resources", "Skilled Trades Recruiting", ["L3"]),
        "L&D Specialist":  ("Human Resources", "Safety & Technical Training", ["L3"]),
        "HR Manager":      ("Human Resources", "Labor Relations & Compliance", ["L4"]),
        "VP People":       ("Human Resources", "HR Leadership", ["L6"]),
        "Comp Analyst":    ("Human Resources", "Benefits Administration", ["L3"]),
        # Regulatory (renamed from Legal)
        "Paralegal":          ("Legal & Compliance", "Regulatory Documentation", ["L2"]),
        "Corporate Counsel":  ("Legal & Compliance", "Product Liability & IP", ["L4"]),
        "Compliance Analyst": ("Legal & Compliance", "Environmental & Safety Compliance", ["L3"]),
        "Privacy Officer":    ("Legal & Compliance", "Export Controls & Trade Compliance", ["L4"]),
        "General Counsel":    ("Legal & Compliance", "Legal Leadership", ["L6"]),
        "Contract Manager":   ("Legal & Compliance", "Supplier Contracts & Procurement Law", ["L3"]),
    }

    _RETAIL_HIERARCHY = {
        # E-Commerce Tech (renamed from Engineering)
        "Junior Software Engineer": ("E-Commerce Engineering", "Storefront Development", ["L2"]),
        "Software Engineer":        ("E-Commerce Engineering", "Platform & Checkout", ["L2","L3"]),
        "Senior Software Engineer": ("E-Commerce Engineering", "Search & Personalization", ["L3","L4"]),
        "Staff Engineer":           ("E-Commerce Engineering", "Commerce Architecture", ["L4","L5"]),
        "Engineering Manager":      ("E-Commerce Engineering", "E-Commerce Tech Management", ["L4"]),
        "Sr Engineering Manager":   ("E-Commerce Engineering", "E-Commerce Tech Management", ["L5"]),
        "VP Engineering":           ("Systems Engineering", "Leadership", ["L6"]),
        # Merchandising (renamed from Product)
        "Associate PM":        ("Buying & Planning", "Assortment Planning", ["L2"]),
        "Product Manager":     ("Buying & Planning", "Category Management", ["L3","L4"]),
        "Senior PM":           ("Buying & Planning", "Merchandise Strategy", ["L4","L5"]),
        "UX Designer":         ("Visual Merchandising", "In-Store Design & Layout", ["L3"]),
        "Director of Product": ("Buying & Planning", "Merchandising Leadership", ["L5"]),
        "VP Product":          ("Merchandising", "Leadership", ["L6"]),
        # Analytics (renamed from Data & Analytics)
        "Data Analyst":        ("Customer Analytics", "Customer Insights", ["L3"]),
        "Senior Data Analyst": ("Customer Analytics", "Demand Forecasting", ["L4"]),
        "Data Engineer":       ("Customer Analytics", "Data Engineering & Pipelines", ["L3","L4"]),
        "Data Scientist":      ("Customer Analytics", "Pricing & Promotion Analytics", ["L4"]),
        "ML Engineer":         ("Customer Analytics", "Personalization & Recommendation", ["L4"]),
        "Analytics Manager":   ("Customer Analytics", "Analytics Management", ["L4"]),
        "VP Data":             ("Data & Analytics", "Leadership", ["L6"]),
        # Store Operations (renamed from IT Operations)
        "IT Support":    ("Store Operations", "Store Technology Support", ["L2"]),
        "Sys Admin":     ("Store Operations", "POS & In-Store Systems", ["L3"]),
        "DevOps Engineer": ("Store Operations", "Inventory Systems", ["L3"]),
        "SRE":           ("Store Operations", "Store Operations Analytics", ["L4"]),
        "IT Manager":    ("Store Operations", "District Management", ["L4"]),
        "Director IT":   ("Store Operations", "Regional Operations Leadership", ["L5"]),
        # Loss Prevention (renamed from Security)
        "Security Analyst":  ("Loss Prevention", "Shrink Analytics", ["L3"]),
        "Security Engineer": ("Loss Prevention", "Physical Security & Surveillance", ["L4"]),
        "Pen Tester":        ("Loss Prevention", "Fraud Investigation", ["L3"]),
        "Security Manager":  ("Loss Prevention", "LP Management", ["L4"]),
        "CISO":              ("Loss Prevention", "Leadership", ["L6"]),
        # Marketing (renamed from Sales & Marketing)
        "SDR":                  ("Sales & Marketing", "Loyalty & CRM", ["L2"]),
        "Account Executive":    ("Sales & Marketing", "Brand Partnerships", ["L3"]),
        "Marketing Specialist": ("Sales & Marketing", "Digital Marketing & Social", ["L3"]),
        "Content Strategist":   ("Sales & Marketing", "Content & Creative", ["L3"]),
        "Sales Manager":        ("Sales & Marketing", "Marketing Management", ["L4"]),
        "VP Marketing":         ("Sales & Marketing", "Leadership", ["L6"]),
        "VP Sales":             ("Commercial", "Leadership", ["L6"]),
        # Finance
        "Financial Analyst": ("Finance", "Revenue Analysis & Forecasting", ["L3"]),
        "Accountant":        ("Finance", "Lease & Store Accounting", ["L3"]),
        "FP&A Manager":      ("Finance", "Financial Planning", ["L4"]),
        "Controller":        ("Finance", "Controllership", ["L5"]),
        "AP/AR Specialist":  ("Finance", "Vendor Payments & AP", ["L2"]),
        "CFO":               ("Finance", "Finance Leadership", ["L6"]),
        "Tax Specialist":    ("Finance", "Sales Tax & Multi-State", ["L3"]),
        # HR
        "HR Coordinator":  ("Human Resources", "Hourly Workforce Services", ["L2"]),
        "HRBP":            ("Human Resources", "Field HR Partnering", ["L3"]),
        "Recruiter":       ("Human Resources", "High-Volume & Seasonal Recruiting", ["L3"]),
        "L&D Specialist":  ("Human Resources", "Retail Training & Onboarding", ["L3"]),
        "HR Manager":      ("Human Resources", "HR Management", ["L4"]),
        "VP People":       ("Human Resources", "HR Leadership", ["L6"]),
        "Comp Analyst":    ("Human Resources", "Compensation & Benefits", ["L3"]),
        # Legal
        "Paralegal":          ("Legal & Compliance", "Lease & Real Estate Support", ["L2"]),
        "Corporate Counsel":  ("Legal & Compliance", "Commercial & Consumer Law", ["L4"]),
        "Compliance Analyst": ("Legal & Compliance", "Consumer Protection & Labeling", ["L3"]),
        "Privacy Officer":    ("Legal & Compliance", "Data Privacy & PCI", ["L4"]),
        "General Counsel":    ("Legal & Compliance", "Legal Leadership", ["L6"]),
        "Contract Manager":   ("Legal & Compliance", "Vendor & Franchise Contracts", ["L3"]),
    }

    _LEGAL_HIERARCHY = {
        # Legal Technology (renamed from Engineering)
        "Junior Software Engineer": ("Legal Technology", "Document Automation", ["L2"]),
        "Software Engineer":        ("Legal Technology", "Case Management Systems", ["L2","L3"]),
        "Senior Software Engineer": ("Legal Technology", "eDiscovery Platforms", ["L3","L4"]),
        "Staff Engineer":           ("Legal Technology", "Legal Tech Architecture", ["L4","L5"]),
        "Engineering Manager":      ("Legal Technology", "Legal Tech Management", ["L4"]),
        "Sr Engineering Manager":   ("Legal Technology", "Legal Tech Management", ["L5"]),
        "VP Engineering":           ("Legal Technology", "Leadership", ["L6"]),
        # Litigation (renamed from Product)
        "Associate PM":        ("Litigation", "Case Preparation", ["L2"]),
        "Product Manager":     ("Litigation", "Trial Management", ["L3","L4"]),
        "Senior PM":           ("Litigation", "Complex Litigation", ["L4","L5"]),
        "UX Designer":         ("Knowledge Management", "Research & Precedent", ["L3"]),
        "Director of Product": ("Litigation", "Practice Group Leadership", ["L5"]),
        "VP Product":          ("Litigation", "Leadership", ["L6"]),
        # Knowledge Management (renamed from Data & Analytics)
        "Data Analyst":        ("Knowledge Management", "Legal Research & Analytics", ["L3"]),
        "Senior Data Analyst": ("Knowledge Management", "Competitive Intelligence", ["L4"]),
        "Data Engineer":       ("Knowledge Management", "Knowledge Systems & Taxonomy", ["L3","L4"]),
        "Data Scientist":      ("Knowledge Management", "Predictive Case Analytics", ["L4"]),
        "ML Engineer":         ("Knowledge Management", "AI-Assisted Research", ["L4"]),
        "Analytics Manager":   ("Knowledge Management", "KM Management", ["L4"]),
        "VP Data":             ("Knowledge Management", "Leadership", ["L6"]),
        # Legal Ops (renamed from IT Operations)
        "IT Support":    ("Legal & Compliance", "Practice Support", ["L2"]),
        "Sys Admin":     ("Legal & Compliance", "Document Management", ["L3"]),
        "DevOps Engineer": ("Legal & Compliance", "Billing & Time Systems", ["L3"]),
        "SRE":           ("Legal & Compliance", "Legal Project Management", ["L4"]),
        "IT Manager":    ("Legal & Compliance", "Operations Management", ["L4"]),
        "Director IT":   ("Legal & Compliance", "Operations Leadership", ["L5"]),
        # Risk & Compliance (renamed from Security)
        "Security Analyst":  ("Risk & Ethics", "Conflicts & Ethics Screening", ["L3"]),
        "Security Engineer": ("Risk & Ethics", "Client Risk Assessment", ["L4"]),
        "Pen Tester":        ("Risk & Ethics", "Regulatory Compliance Review", ["L3"]),
        "Security Manager":  ("Risk & Ethics", "Risk Management", ["L4"]),
        "CISO":              ("Risk & Ethics", "Leadership", ["L6"]),
        # Business Development (renamed from Sales & Marketing)
        "SDR":                  ("Sales & Marketing", "Client Intake & Proposals", ["L2"]),
        "Account Executive":    ("Sales & Marketing", "Client Relationship Management", ["L3"]),
        "Marketing Specialist": ("Sales & Marketing", "Events & Thought Leadership", ["L3"]),
        "Content Strategist":   ("Sales & Marketing", "Publications & Marketing", ["L3"]),
        "Sales Manager":        ("Sales & Marketing", "BD Management", ["L4"]),
        "VP Marketing":         ("Sales & Marketing", "Leadership", ["L6"]),
        "VP Sales":             ("Sales & Marketing", "Leadership", ["L6"]),
        # Finance
        "Financial Analyst": ("Finance", "Practice Profitability Analysis", ["L3"]),
        "Accountant":        ("Finance", "Trust Accounting", ["L3"]),
        "FP&A Manager":      ("Finance", "Billing & Collections Management", ["L4"]),
        "Controller":        ("Finance", "Financial Control", ["L5"]),
        "AP/AR Specialist":  ("Finance", "Client Billing & Invoicing", ["L2"]),
        "CFO":               ("Finance", "Finance Leadership", ["L6"]),
        "Tax Specialist":    ("Finance", "Partner Tax & Distribution", ["L3"]),
        # HR
        "HR Coordinator":  ("Human Resources", "Onboarding & Administration", ["L2"]),
        "HRBP":            ("Human Resources", "Attorney & Staff Partnering", ["L3"]),
        "Recruiter":       ("Human Resources", "Lateral & Associate Recruiting", ["L3"]),
        "L&D Specialist":  ("Human Resources", "Associate Development & CLE", ["L3"]),
        "HR Manager":      ("Human Resources", "HR Management", ["L4"]),
        "VP People":       ("Human Resources", "HR Leadership", ["L6"]),
        "Comp Analyst":    ("Human Resources", "Partner Compensation & Benefits", ["L3"]),
        # Legal (own industry — administrative legal)
        "Paralegal":          ("Practice Support", "Paralegal Services", ["L2"]),
        "Corporate Counsel":  ("General Counsel Office", "Firm Governance", ["L4"]),
        "Compliance Analyst": ("General Counsel Office", "Professional Responsibility", ["L3"]),
        "Privacy Officer":    ("General Counsel Office", "Information Governance", ["L4"]),
        "General Counsel":    ("General Counsel", "Leadership", ["L6"]),
        "Contract Manager":   ("Practice Support", "Vendor & Engagement Letters", ["L3"]),
    }

    _ENERGY_HIERARCHY = {
        # Engineering
        "Junior Software Engineer": ("Engineering", "Control Systems Engineering", ["L2"]),
        "Software Engineer":        ("Engineering", "SCADA & DCS Development", ["L2","L3"]),
        "Senior Software Engineer": ("Engineering", "Process & Chemical Engineering", ["L3","L4"]),
        "Staff Engineer":           ("Engineering", "Reservoir & Subsurface Engineering", ["L4","L5"]),
        "Engineering Manager":      ("Engineering", "Engineering Management", ["L4"]),
        "Sr Engineering Manager":   ("Engineering", "Engineering Management", ["L5"]),
        "VP Engineering":           ("Software Engineering", "Engineering Leadership", ["L6"]),
        # Operations (renamed from Product)
        "Associate PM":        ("Field Operations", "Well Operations", ["L2"]),
        "Product Manager":     ("Field Operations", "Production Optimization", ["L3","L4"]),
        "Senior PM":           ("Field Operations", "Turnaround & Outage Planning", ["L4","L5"]),
        "UX Designer":         ("Renewables", "Renewables Analytics", ["L3"]),
        "Director of Product": ("Field Operations", "Operations Leadership", ["L5"]),
        "VP Product":          ("Operations", "Leadership", ["L6"]),
        # Asset Management (renamed from Data & Analytics)
        "Data Analyst":        ("Asset Integrity", "Inspection & Monitoring", ["L3"]),
        "Senior Data Analyst": ("Asset Integrity", "Corrosion & Materials", ["L4"]),
        "Data Engineer":       ("Asset Integrity", "Asset Data & IoT", ["L3","L4"]),
        "Data Scientist":      ("Asset Integrity", "Predictive Maintenance", ["L4"]),
        "ML Engineer":         ("Asset Integrity", "Digital Twin & Modeling", ["L4"]),
        "Analytics Manager":   ("Asset Integrity", "Asset Management", ["L4"]),
        "VP Data":             ("Asset Management", "Leadership", ["L6"]),
        # SCADA/OT (renamed from IT Operations)
        "IT Support":    ("OT & SCADA", "Field Technology Support", ["L2"]),
        "Sys Admin":     ("OT & SCADA", "Control Network Administration", ["L3"]),
        "DevOps Engineer": ("OT & SCADA", "SCADA Engineering", ["L3"]),
        "SRE":           ("OT & SCADA", "OT Cybersecurity", ["L4"]),
        "IT Manager":    ("OT & SCADA", "OT Management", ["L4"]),
        "Director IT":   ("OT & SCADA", "OT Leadership", ["L5"]),
        # HSE (renamed from Security)
        "Security Analyst":  ("HSE", "Occupational Health & Safety", ["L3"]),
        "Security Engineer": ("HSE", "Environmental Management", ["L4"]),
        "Pen Tester":        ("HSE", "Emergency Response & Crisis", ["L3"]),
        "Security Manager":  ("HSE", "HSE Management", ["L4"]),
        "CISO":              ("HSE", "Leadership", ["L6"]),
        # Trading & Commercial (renamed from Sales & Marketing)
        "SDR":                  ("Commercial", "Energy Trading & Scheduling", ["L2"]),
        "Account Executive":    ("Commercial", "Origination & Structuring", ["L3"]),
        "Marketing Specialist": ("Commercial", "Market Analysis & Forecasting", ["L3"]),
        "Content Strategist":   ("Commercial", "Regulatory & Government Affairs", ["L3"]),
        "Sales Manager":        ("Commercial", "Commercial Management", ["L4"]),
        "VP Marketing":         ("Commercial", "Leadership", ["L6"]),
        "VP Sales":             ("Commercial", "Leadership", ["L6"]),
        # Finance
        "Financial Analyst": ("Finance", "Capital Project Analysis", ["L3"]),
        "Accountant":        ("Finance", "Joint Venture Accounting", ["L3"]),
        "FP&A Manager":      ("Finance", "Reserves & Valuation", ["L4"]),
        "Controller":        ("Finance", "Controllership", ["L5"]),
        "AP/AR Specialist":  ("Finance", "Revenue Distribution & AP", ["L2"]),
        "CFO":               ("Finance", "Finance Leadership", ["L6"]),
        "Tax Specialist":    ("Finance", "Severance & Property Tax", ["L3"]),
        # HR
        "HR Coordinator":  ("Human Resources", "Field HR Services", ["L2"]),
        "HRBP":            ("Human Resources", "Operations HR Partnering", ["L3"]),
        "Recruiter":       ("Human Resources", "Technical & Field Recruiting", ["L3"]),
        "L&D Specialist":  ("Human Resources", "Safety & Competency Training", ["L3"]),
        "HR Manager":      ("Human Resources", "HR Management", ["L4"]),
        "VP People":       ("Human Resources", "HR Leadership", ["L6"]),
        "Comp Analyst":    ("Human Resources", "Compensation & Expat Programs", ["L3"]),
        # Legal
        "Paralegal":          ("Legal & Compliance", "Land & Mineral Rights", ["L2"]),
        "Corporate Counsel":  ("Legal & Compliance", "Energy Regulatory & Environmental Law", ["L4"]),
        "Compliance Analyst": ("Legal & Compliance", "Pipeline & Facility Compliance", ["L3"]),
        "Privacy Officer":    ("Legal & Compliance", "NERC & FERC Compliance", ["L4"]),
        "General Counsel":    ("Legal & Compliance", "Legal Leadership", ["L6"]),
        "Contract Manager":   ("Legal & Compliance", "Joint Venture & Offtake Agreements", ["L3"]),
    }

    _EDUCATION_HIERARCHY = {
        # IT Services (renamed from Engineering)
        "Junior Software Engineer": ("Academic Technology", "LMS & EdTech Administration", ["L2"]),
        "Software Engineer":        ("Academic Technology", "Student Information Systems", ["L2","L3"]),
        "Senior Software Engineer": ("Academic Technology", "Integration & Data Platforms", ["L3","L4"]),
        "Staff Engineer":           ("Academic Technology", "Enterprise Architecture", ["L4","L5"]),
        "Engineering Manager":      ("Academic Technology", "Technology Management", ["L4"]),
        "Sr Engineering Manager":   ("Academic Technology", "Technology Management", ["L5"]),
        "VP Engineering":           ("IT", "Leadership", ["L6"]),
        # Academic Affairs (renamed from Product)
        "Associate PM":        ("Academic Programs", "Curriculum Development", ["L2"]),
        "Product Manager":     ("Academic Programs", "Program Coordination", ["L3","L4"]),
        "Senior PM":           ("Academic Programs", "Academic Assessment & Accreditation", ["L4","L5"]),
        "UX Designer":         ("Academic Programs", "Instructional Design", ["L3"]),
        "Director of Product": ("Academic Programs", "Academic Leadership", ["L5"]),
        "VP Product":          ("Academic Affairs", "Leadership", ["L6"]),
        # Institutional Research (renamed from Data & Analytics)
        "Data Analyst":        ("Data & Analytics", "Enrollment Analytics", ["L3"]),
        "Senior Data Analyst": ("Data & Analytics", "Outcomes & Assessment Research", ["L4"]),
        "Data Engineer":       ("Data & Analytics", "Data Warehouse & Reporting", ["L3","L4"]),
        "Data Scientist":      ("Data & Analytics", "Predictive Enrollment Modeling", ["L4"]),
        "ML Engineer":         ("Data & Analytics", "Student Success Analytics", ["L4"]),
        "Analytics Manager":   ("Data & Analytics", "IR Management", ["L4"]),
        "VP Data":             ("Data & Analytics", "Leadership", ["L6"]),
        # IT Operations
        "IT Support":    ("IT & Infrastructure", "Help Desk & Desktop Support", ["L2"]),
        "Sys Admin":     ("IT & Infrastructure", "Network & Classroom Technology", ["L3"]),
        "DevOps Engineer": ("IT & Infrastructure", "Cloud & Infrastructure", ["L3"]),
        "SRE":           ("IT & Infrastructure", "Systems Reliability", ["L4"]),
        "IT Manager":    ("IT & Infrastructure", "IT Operations Management", ["L4"]),
        "Director IT":   ("IT & Infrastructure", "IT Leadership", ["L5"]),
        # Student Services (renamed from Security)
        "Security Analyst":  ("Student Affairs", "Academic Advising", ["L3"]),
        "Security Engineer": ("Student Affairs", "Career Services", ["L4"]),
        "Pen Tester":        ("Student Affairs", "Student Conduct & Wellness", ["L3"]),
        "Security Manager":  ("Student Affairs", "Student Affairs Management", ["L4"]),
        "CISO":              ("Student Affairs", "Leadership", ["L6"]),
        # Enrollment (renamed from Sales & Marketing)
        "SDR":                  ("Enrollment Management", "Admissions & Outreach", ["L2"]),
        "Account Executive":    ("Enrollment Management", "Recruitment & Yield", ["L3"]),
        "Marketing Specialist": ("Enrollment Management", "Marketing & Communications", ["L3"]),
        "Content Strategist":   ("Enrollment Management", "Alumni Relations & Advancement", ["L3"]),
        "Sales Manager":        ("Enrollment Management", "Enrollment Management", ["L4"]),
        "VP Marketing":         ("Enrollment", "Leadership", ["L6"]),
        "VP Sales":             ("Advancement", "Leadership", ["L6"]),
        # Finance
        "Financial Analyst": ("Finance", "Budget & Grant Accounting", ["L3"]),
        "Accountant":        ("Finance", "General & Fund Accounting", ["L3"]),
        "FP&A Manager":      ("Finance", "Financial Planning & Reporting", ["L4"]),
        "Controller":        ("Finance", "Controllership", ["L5"]),
        "AP/AR Specialist":  ("Finance", "Student Accounts & Billing", ["L2"]),
        "CFO":               ("Finance", "Finance Leadership", ["L6"]),
        "Tax Specialist":    ("Finance", "Tax-Exempt & Endowment Accounting", ["L3"]),
        # HR
        "HR Coordinator":  ("Human Resources", "Benefits & Employee Services", ["L2"]),
        "HRBP":            ("Human Resources", "Faculty & Staff Partnering", ["L3"]),
        "Recruiter":       ("Human Resources", "Faculty Search & Staff Recruiting", ["L3"]),
        "L&D Specialist":  ("Human Resources", "Professional Development & Workshops", ["L3"]),
        "HR Manager":      ("Human Resources", "HR Management", ["L4"]),
        "VP People":       ("Human Resources", "HR Leadership", ["L6"]),
        "Comp Analyst":    ("Human Resources", "Compensation & Classification", ["L3"]),
        # Legal
        "Paralegal":          ("Legal & Compliance", "Compliance Documentation", ["L2"]),
        "Corporate Counsel":  ("Legal & Compliance", "Higher Education Law", ["L4"]),
        "Compliance Analyst": ("Legal & Compliance", "Title IX & FERPA Compliance", ["L3"]),
        "Privacy Officer":    ("Legal & Compliance", "Student Records & Data Privacy", ["L4"]),
        "General Counsel":    ("Legal & Compliance", "Legal Leadership", ["L6"]),
        "Contract Manager":   ("Legal & Compliance", "Grants & Sponsored Research Contracts", ["L3"]),
    }

    _PROFSERV_HIERARCHY = {
        # Technology
        "Junior Software Engineer": ("Solutions Engineering", "Platform Development", ["L2"]),
        "Software Engineer":        ("Solutions Engineering", "Client Solutions", ["L2","L3"]),
        "Senior Software Engineer": ("Solutions Engineering", "Architecture & Integration", ["L3","L4"]),
        "Staff Engineer":           ("Solutions Engineering", "Technology Strategy", ["L4","L5"]),
        "Engineering Manager":      ("Solutions Engineering", "Tech Delivery Management", ["L4"]),
        "Sr Engineering Manager":   ("Solutions Engineering", "Tech Delivery Management", ["L5"]),
        "VP Engineering":           ("Systems Engineering", "Leadership", ["L6"]),
        # Consulting / Advisory (renamed from Product — treated as main delivery)
        "Associate PM":        ("Consulting", "Strategy Consulting", ["L2"]),
        "Product Manager":     ("Consulting", "Operations Consulting", ["L3","L4"]),
        "Senior PM":           ("Consulting", "Digital Transformation", ["L4","L5"]),
        "UX Designer":         ("Consulting", "Change Management", ["L3"]),
        "Director of Product": ("Consulting", "Engagement Leadership", ["L5"]),
        "VP Product":          ("Consulting", "Leadership", ["L6"]),
        # Data & Analytics → Research & Insights
        "Data Analyst":        ("Research & Insights", "Industry Research", ["L3"]),
        "Senior Data Analyst": ("Research & Insights", "Benchmarking & Analytics", ["L4"]),
        "Data Engineer":       ("Research & Insights", "Knowledge Engineering", ["L3","L4"]),
        "Data Scientist":      ("Research & Insights", "Advanced Analytics", ["L4"]),
        "ML Engineer":         ("Research & Insights", "AI & Automation", ["L4"]),
        "Analytics Manager":   ("Research & Insights", "Research Management", ["L4"]),
        "VP Data":             ("Research", "Leadership", ["L6"]),
        # IT Operations → Delivery Operations
        "IT Support":    ("Delivery Operations", "Project Coordination", ["L2"]),
        "Sys Admin":     ("Delivery Operations", "Quality Assurance", ["L3"]),
        "DevOps Engineer": ("Delivery Operations", "Tools & Automation", ["L3"]),
        "SRE":           ("Delivery Operations", "Delivery Excellence", ["L4"]),
        "IT Manager":    ("Delivery Operations", "PMO Management", ["L4"]),
        "Director IT":   ("Delivery Operations", "Delivery Leadership", ["L5"]),
        # Security → Risk & Compliance
        "Security Analyst":  ("Risk Advisory", "Risk Assessment", ["L3"]),
        "Security Engineer": ("Risk Advisory", "Internal Audit", ["L4"]),
        "Pen Tester":        ("Risk Advisory", "Forensics & Investigation", ["L3"]),
        "Security Manager":  ("Risk Advisory", "Risk Management", ["L4"]),
        "CISO":              ("Risk Advisory", "Leadership", ["L6"]),
        # Sales & Marketing → Business Development
        "SDR":                  ("Sales & Marketing", "Proposals & Pursuits", ["L2"]),
        "Account Executive":    ("Sales & Marketing", "Client Partnerships", ["L3"]),
        "Marketing Specialist": ("Sales & Marketing", "Thought Leadership & Events", ["L3"]),
        "Content Strategist":   ("Sales & Marketing", "Content & Brand Strategy", ["L3"]),
        "Sales Manager":        ("Sales & Marketing", "BD Management", ["L4"]),
        "VP Marketing":         ("Sales & Marketing", "Leadership", ["L6"]),
        "VP Sales":             ("Sales & Marketing", "Leadership", ["L6"]),
        # Finance
        "Financial Analyst": ("Finance", "Practice Profitability", ["L3"]),
        "Accountant":        ("Finance", "Engagement Accounting", ["L3"]),
        "FP&A Manager":      ("Finance", "Revenue Forecasting", ["L4"]),
        "Controller":        ("Finance", "Controllership", ["L5"]),
        "AP/AR Specialist":  ("Finance", "Client Billing & WIP", ["L2"]),
        "CFO":               ("Finance", "Finance Leadership", ["L6"]),
        "Tax Specialist":    ("Finance", "Partner Tax & Distributions", ["L3"]),
        # HR
        "HR Coordinator":  ("Human Resources", "HR Shared Services", ["L2"]),
        "HRBP":            ("Human Resources", "Practice HR Partnering", ["L3"]),
        "Recruiter":       ("Human Resources", "Campus & Experienced Hire", ["L3"]),
        "L&D Specialist":  ("Human Resources", "Consultant Development & Training", ["L3"]),
        "HR Manager":      ("Human Resources", "HR Management", ["L4"]),
        "VP People":       ("Human Resources", "HR Leadership", ["L6"]),
        "Comp Analyst":    ("Human Resources", "Partner Compensation", ["L3"]),
        # Legal
        "Paralegal":          ("Legal & Compliance", "Contract Administration", ["L2"]),
        "Corporate Counsel":  ("Legal & Compliance", "Professional Liability", ["L4"]),
        "Compliance Analyst": ("Legal & Compliance", "Independence & Ethics", ["L3"]),
        "Privacy Officer":    ("Legal & Compliance", "Data Protection & Privacy", ["L4"]),
        "General Counsel":    ("Legal & Compliance", "Legal Leadership", ["L6"]),
        "Contract Manager":   ("Legal & Compliance", "Client Engagement Agreements", ["L3"]),
    }

    INDUSTRY_HIERARCHIES = {
        "technology":           _TECH_HIERARCHY,
        "financial_services":   _FINSERV_HIERARCHY,
        "healthcare":           _HEALTHCARE_HIERARCHY,
        "manufacturing":        _MANUFACTURING_HIERARCHY,
        "retail":               _RETAIL_HIERARCHY,
        "consulting":           _LEGAL_HIERARCHY,  # reuse legal hierarchy as base, renames handle titles
        "energy":               _ENERGY_HIERARCHY,
        "aerospace":            _EDUCATION_HIERARCHY,  # reuse education hierarchy as base, renames handle titles
        "legal":                _LEGAL_HIERARCHY,
        "education":            _EDUCATION_HIERARCHY,
        "professional_services": _PROFSERV_HIERARCHY,
    }

    def _get_hierarchy(base_title, real_func):
        h = INDUSTRY_HIERARCHIES.get(industry, _TECH_HIERARCHY)
        if base_title in h:
            return h[base_title][:2]  # (job_family, sub_family)
        # Heuristic fallback — still produce distinct sub-families
        if "Manager" in base_title or "Director" in base_title:
            return (real_func + " Management", "Management & Oversight")
        if "VP" in base_title:
            return (real_func + " Leadership", "Executive")
        return (real_func, "Core Operations")

    def _get_level_for_role(base_title):
        """Return the allowed career levels for a role from the industry hierarchy."""
        h = INDUSTRY_HIERARCHIES.get(industry, _TECH_HIERARCHY)
        if base_title in h:
            return h[base_title][2]  # allowed_levels list
        return None  # use default from blueprint

    FIRST_NAMES = ["Sarah","James","Maria","David","Lisa","Michael","Emma","Robert","Jennifer","William","Amanda","Christopher","Nicole","Daniel","Rachel","Thomas","Catherine","Steven","Laura","Andrew","Jessica","Kevin","Michelle","Brandon","Stephanie","Tyler","Ashley","Nathan","Brittany","Ryan","Megan","Justin","Emily","Aaron","Heather","Patrick","Rebecca","Sean","Samantha","Jacob","Amber","Eric","Kayla","Brian","Lauren","Gregory","Kelly","Mark","Tiffany","Jason","Olivia","Ethan","Hannah","Dylan","Sophia","Logan","Ava","Mason","Isabella","Lucas","Mia","Noah","Abigail","Liam","Charlotte","Aiden","Ella"]
    LAST_NAMES = ["Chen","Rodriguez","Thompson","Kim","Patel","Brown","Wilson","Taylor","Garcia","Davis","Martinez","Lee","Johnson","White","Anderson","Harris","Clark","Wright","King","Scott","Moore","Jackson","Martin","Lewis","Allen","Walker","Young","Hall","Hernandez","Lopez","Hill","Green","Adams","Baker","Gonzalez","Nelson","Mitchell","Perez","Roberts","Turner","Phillips","Campbell","Parker","Evans","Edwards","Collins","Stewart","Sanchez","Morris"]
    LOCATIONS = ["New York","Chicago","San Francisco","Boston","Austin","London","Toronto","Seattle","Denver","Atlanta","Houston","Miami","Los Angeles","Dallas","Phoenix"]

    renames = RENAMES.get(industry, {})
    skills = INDUSTRY_SKILLS.get(industry, INDUSTRY_SKILLS["technology"])
    blueprints = FUNC_BLUEPRINTS["technology"]  # Use tech as base

    emp_id = 1
    employees = []
    mgr_map = {}

    for base_func, pct, roles in blueprints:
        real_func = renames.get(base_func, base_func)
        func_count = max(2, round(gen_size * pct))
        func_mgrs = []
        
        for title, level, track, comp_lo, comp_hi, role_pct in roles:
            real_title = renames.get(title, title)
            role_count = max(1, round(func_count * role_pct))
            
            for _ in range(role_count):
                name = f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"
                comp = random.randint(comp_lo, comp_hi)
                eid = f"EMP{str(emp_id).zfill(5)}"

                jf, sf = _get_hierarchy(title, real_func)
                # Use hierarchy-specified level if available, else blueprint default
                allowed = _get_level_for_role(title)
                actual_level = random.choice(allowed) if allowed else level
                # Apply career track system
                ct, cl, cl_name = assign_career_track(real_title, actual_level, track, industry)
                employees.append({
                    "Employee ID": eid, "Name": name, "Job Title": real_title,
                    "Function": real_func, "Job Family": jf, "Sub-Function": sf,
                    "Career Level": cl, "Career Track": ct,
                    "Manager ID": "", "Compensation": comp,
                    "Tenure": random.randint(0, 20),
                    "Location": random.choice(LOCATIONS),
                })
                if ct in ("M", "E"): func_mgrs.append(eid)
                emp_id += 1
        
        mgr_map[real_func] = func_mgrs

    # Assign managers
    for emp in employees:
        if emp["Career Level"] in ["L5","L6"]: continue
        mgrs = mgr_map.get(emp["Function"], [])
        if mgrs: emp["Manager ID"] = random.choice(mgrs)

    # TASK LIBRARY — comprehensive per-industry
    tasks = []
    task_templates = [
        ("Data Analyst|Risk Analyst|Clinical Data|Quality Analyst|Demand Planner|eDiscovery|Asset Integrity|IR Analyst", [
            ("Data extraction & pipeline maintenance", 25, "Repetitive", "Deterministic", "Independent", "High"),
            ("Report generation & formatting", 20, "Repetitive", "Deterministic", "Independent", "High"),
            ("Ad-hoc stakeholder analysis", 15, "Variable", "Probabilistic", "Interactive", "Moderate"),
            ("Dashboard creation & maintenance", 10, "Repetitive", "Deterministic", "Independent", "High"),
            ("Executive presentations", 10, "Variable", "Judgment-heavy", "Collaborative", "Low"),
            ("Data quality monitoring", 8, "Repetitive", "Deterministic", "Independent", "High"),
            ("Cross-team consulting", 7, "Variable", "Judgment-heavy", "Collaborative", "Low"),
            ("Tool evaluation", 5, "Variable", "Probabilistic", "Interactive", "Moderate"),
        ]),
        ("Software Engineer|Developer|Process Engineer|Controls Engineer|Systems Developer|EHR Developer|Legal Tech", [
            ("Feature development & coding", 30, "Variable", "Judgment-heavy", "Collaborative", "Low"),
            ("Code review & PR management", 15, "Variable", "Judgment-heavy", "Collaborative", "Moderate"),
            ("Writing automated tests", 15, "Repetitive", "Deterministic", "Independent", "High"),
            ("Bug triage & debugging", 15, "Variable", "Probabilistic", "Independent", "Moderate"),
            ("Documentation writing", 10, "Repetitive", "Deterministic", "Independent", "High"),
            ("Sprint planning & estimation", 10, "Variable", "Judgment-heavy", "Collaborative", "Low"),
            ("Incident response", 5, "Variable", "Probabilistic", "Interactive", "Moderate"),
        ]),
        ("Financial Analyst|Accountant|Fund Accountant|Revenue Cycle|Billing|AP/AR", [
            ("Monthly close & reconciliation", 25, "Repetitive", "Deterministic", "Independent", "High"),
            ("Variance analysis & reporting", 20, "Variable", "Probabilistic", "Interactive", "Moderate"),
            ("Invoice/payment processing", 15, "Repetitive", "Deterministic", "Independent", "High"),
            ("Budget forecasting", 15, "Variable", "Probabilistic", "Interactive", "Moderate"),
            ("Audit preparation", 10, "Variable", "Judgment-heavy", "Collaborative", "Low"),
            ("Expense report review", 10, "Repetitive", "Deterministic", "Independent", "High"),
            ("Stakeholder presentations", 5, "Variable", "Judgment-heavy", "Collaborative", "Low"),
        ]),
        ("Recruiter|HR Coordinator|TA Specialist|Nurse Recruiter|Faculty Recruiter", [
            ("Resume screening & shortlisting", 25, "Repetitive", "Deterministic", "Independent", "High"),
            ("Interview scheduling", 20, "Repetitive", "Deterministic", "Interactive", "High"),
            ("Candidate sourcing & outreach", 20, "Variable", "Judgment-heavy", "Interactive", "Moderate"),
            ("Offer preparation", 15, "Variable", "Judgment-heavy", "Collaborative", "Low"),
            ("Onboarding management", 10, "Repetitive", "Deterministic", "Interactive", "High"),
            ("Recruitment metrics", 10, "Repetitive", "Deterministic", "Independent", "High"),
        ]),
        ("SDR|Account Executive|Relationship Manager|Client|Store Associate|BD Coordinator|Admissions|Patient Access", [
            ("Prospecting & lead qualification", 25, "Variable", "Probabilistic", "Interactive", "Moderate"),
            ("CRM data entry & pipeline mgmt", 20, "Repetitive", "Deterministic", "Independent", "High"),
            ("Demo & presentation delivery", 20, "Variable", "Judgment-heavy", "Collaborative", "Low"),
            ("Proposal & contract prep", 15, "Repetitive", "Deterministic", "Independent", "High"),
            ("Competitive research", 10, "Variable", "Probabilistic", "Independent", "High"),
            ("Pipeline forecasting", 10, "Repetitive", "Deterministic", "Interactive", "High"),
        ]),
        ("Compliance|Regulatory|HIPAA|Quality Auditor|EHS Coordinator", [
            ("Regulatory monitoring & updates", 20, "Repetitive", "Deterministic", "Independent", "High"),
            ("Audit preparation & documentation", 20, "Repetitive", "Deterministic", "Independent", "High"),
            ("Policy review & updates", 15, "Variable", "Judgment-heavy", "Collaborative", "Low"),
            ("Investigation & case management", 15, "Variable", "Probabilistic", "Interactive", "Moderate"),
            ("Training & awareness programs", 15, "Variable", "Judgment-heavy", "Collaborative", "Low"),
            ("Reporting to regulators", 10, "Repetitive", "Deterministic", "Independent", "High"),
            ("Risk assessment", 5, "Variable", "Judgment-heavy", "Interactive", "Moderate"),
        ]),
        ("IT Support|Help Desk|Store Tech|Maintenance Tech|Sys Admin", [
            ("Ticket resolution & troubleshooting", 30, "Repetitive", "Deterministic", "Interactive", "High"),
            ("System monitoring & alerting", 20, "Repetitive", "Deterministic", "Independent", "High"),
            ("Software installation & updates", 15, "Repetitive", "Deterministic", "Independent", "High"),
            ("User onboarding & access mgmt", 15, "Repetitive", "Deterministic", "Interactive", "High"),
            ("Documentation & knowledge base", 10, "Repetitive", "Deterministic", "Independent", "High"),
            ("Escalation & vendor coordination", 10, "Variable", "Judgment-heavy", "Collaborative", "Low"),
        ]),
    ]

    import re
    matched_roles = set()
    for pattern, task_list in task_templates:
        for emp in employees:
            if re.search(pattern, emp["Job Title"], re.IGNORECASE):
                if emp["Job Title"] not in matched_roles:
                    matched_roles.add(emp["Job Title"])
                    for t_name, t_pct, t_type, t_logic, t_inter, t_impact in task_list:
                        tasks.append({
                            "Job Title": emp["Job Title"], "Task Name": t_name,
                            "Est Hours/Week": round(40 * t_pct / 100, 1),
                            "Current Time Spent %": t_pct,
                            "Task Type": t_type, "Logic": t_logic,
                            "Interaction": t_inter, "AI Impact": t_impact,
                            "Primary Skill": skills[0], "Secondary Skill": skills[4],
                        })

    # Generate generic tasks for unmatched roles — ensures larger orgs have broader WDL coverage
    all_titles = set(e["Job Title"] for e in employees)
    unmatched = all_titles - matched_roles
    generic_tasks = [
        ("Administrative coordination & scheduling", 15, "Repetitive", "Deterministic", "Interactive", "High"),
        ("Email & communication management", 15, "Repetitive", "Deterministic", "Independent", "High"),
        ("Data entry & record keeping", 15, "Repetitive", "Deterministic", "Independent", "High"),
        ("Reporting & presentation prep", 15, "Variable", "Probabilistic", "Interactive", "Moderate"),
        ("Cross-functional meetings & collaboration", 15, "Variable", "Judgment-heavy", "Collaborative", "Low"),
        ("Strategic planning & analysis", 15, "Variable", "Judgment-heavy", "Collaborative", "Low"),
        ("Process improvement & documentation", 10, "Variable", "Probabilistic", "Interactive", "Moderate"),
    ]
    # For larger orgs, cover more unmatched roles
    unmatched_limit = min(len(unmatched), 10 if gen_size < 500 else 25 if gen_size < 3000 else 50)
    for title in list(unmatched)[:unmatched_limit]:
        for t_name, t_pct, t_type, t_logic, t_inter, t_impact in generic_tasks:
            tasks.append({
                "Job Title": title, "Task Name": t_name,
                "Est Hours/Week": round(40 * t_pct / 100, 1),
                "Current Time Spent %": t_pct,
                "Task Type": t_type, "Logic": t_logic,
                "Interaction": t_inter, "AI Impact": t_impact,
                "Primary Skill": random.choice(skills[:5]), "Secondary Skill": random.choice(skills[5:10]),
            })

    # Generate skills — scale cap with company size
    # Small: all employees, Mid: up to 1000, Large: up to 2000
    skill_cap = min(len(employees), max(500, gen_size // 4))
    skill_emps = employees[:skill_cap]
    skills_records = []
    for emp in skill_emps:
        for skill in skills:
            if random.random() > 0.12:
                base_prof = 2
                if emp["Career Level"] in ["L4","L5","L6"]: base_prof = 3
                prof = max(1, min(4, base_prof + random.choices([-1,0,0,1], weights=[10,30,40,20])[0]))
                skills_records.append({"Employee ID": emp["Employee ID"], "Name": emp["Name"], "Skill": skill, "Proficiency": prof})

    # Operating model — more capabilities for larger orgs
    op_data = []
    funcs_used = list(set(e["Function"] for e in employees))
    op_caps_per_func = 5 if gen_size < 500 else 7 if gen_size < 3000 else 9
    base_caps = ["Strategy & Planning","Service Delivery","Analytics & Reporting","Governance & Risk","Innovation & Transformation","Talent Development","Process Excellence","Technology Enablement","Customer Experience"]
    for func in funcs_used[:min(len(funcs_used), 9)]:
        for cap in base_caps[:op_caps_per_func]:
            op_data.append({"Function": func, "Capability": f"{func} {cap}", "Maturity": random.randint(1,4), "Service Model": random.choice(["Shared","Embedded","CoE","Platform"])})

    # Change management — scale with org size
    change_cap = min(len(employees), max(100, gen_size // 3))
    change_emps = random.sample(employees, change_cap)
    change_data = [{"Employee ID": e["Employee ID"], "Name": e["Name"], "Function": e["Function"],
        "Change Readiness": round(random.uniform(1.5,4.5),1), "Impact Level": random.choice(["High","Moderate","Low"]),
        "Support Needed": random.choice(["Intensive","Moderate","Light"])} for e in change_emps]

    wf_df = pd.DataFrame(employees)
    wd_df = pd.DataFrame(tasks)
    sk_df = pd.DataFrame(skills_records)
    op_df = pd.DataFrame(op_data)
    ch_df = pd.DataFrame(change_data)

    # Add Model ID to all DataFrames (required by schemas)
    for df in [wf_df, wd_df, sk_df, op_df, ch_df]:
        if not df.empty:
            df["Model ID"] = model_id

    # Standardize all DataFrames through the schema pipeline so column names
    # match what API endpoints expect (e.g. "Name" → "Employee Name", 
    # "Function" → "Function ID", "Compensation" → "Base Pay")
    from app.store import standardize_to_schema
    wf_std = standardize_to_schema(wf_df, "workforce") if not wf_df.empty else pd.DataFrame()
    wd_std = standardize_to_schema(wd_df, "work_design") if not wd_df.empty else pd.DataFrame()
    
    # org_design uses workforce schema columns
    org_src = wf_df.copy()
    org_src["Model ID"] = model_id
    org_std = standardize_to_schema(org_src, "workforce") if not org_src.empty else pd.DataFrame()

    store.datasets[model_id] = {
        **empty_bundle(),
        "workforce": wf_std,
        "work_design": wd_std,
        "skills": sk_df,
        "org_design": org_std,
        "operating_model": op_df,
        "change_management": ch_df,
    }
    store.last_loaded_model_id = model_id
    
    print(f"Seeded: {model_id} — {company['name']} ({company['employees']:,} employees) → {len(employees)} generated, {len(tasks)} tasks, {len(skills_records)} skill records")
    return model_id

# Tutorial auto-seeds on /api/tutorial/seed call from frontend


@router.get("/tutorial/seed")
async def seed_tutorial(industry: str = "technology", size: str = "small"):
    """Seed tutorial sandbox with configurable industry and size."""
    try:
        size_map = {"small": "small", "mid": "mid", "medium": "mid", "large": "large", "mega": "large"}
        normalized_size = size_map.get(size, "mid")
        
        model_id = _seed_tutorial_store(industry, normalized_size)
        ds = store.datasets.get(model_id, {})
        emp_count = len(ds.get("workforce", [])) if isinstance(ds.get("workforce"), pd.DataFrame) else 0
        task_count = len(ds.get("work_design", [])) if isinstance(ds.get("work_design"), pd.DataFrame) and not ds["work_design"].empty else 0
        
        return _safe({"status": "ok", "model": model_id, "employees": emp_count, "tasks": task_count, "industry": industry, "size": normalized_size})
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(500, detail=str(e))

@router.get("/sandbox/company")
async def seed_company_sandbox(company: str = "toyota"):
    """Seed sandbox data for a named company — maps to industry/size and calls _seed_tutorial_store."""
    COMPANY_MAP = {
        "toyota":    {"industry": "manufacturing",      "size": "large"},
        "tesla":     {"industry": "manufacturing",      "size": "mid"},
        "netflix":   {"industry": "technology",         "size": "mid"},
        "amazon":    {"industry": "retail",             "size": "large"},
        "jpmorgan":  {"industry": "financial_services", "size": "large"},
        "spotify":   {"industry": "technology",         "size": "mid"},
        "microsoft": {"industry": "technology",         "size": "large"},
        "google":    {"industry": "technology",         "size": "large"},
        "apple":     {"industry": "technology",         "size": "large"},
        "meta":      {"industry": "technology",         "size": "large"},
        "goldman":   {"industry": "financial_services", "size": "large"},
        "deloitte":  {"industry": "legal",              "size": "large"},
        "mckinsey":  {"industry": "legal",              "size": "mid"},
        "kaiser":    {"industry": "healthcare",         "size": "large"},
        "walmart":   {"industry": "retail",             "size": "large"},
        "nike":      {"industry": "retail",             "size": "mid"},
        "boeing":    {"industry": "manufacturing",      "size": "large"},
        "pfizer":    {"industry": "healthcare",         "size": "large"},
        "shell":     {"industry": "energy",             "size": "large"},
        "exxon":     {"industry": "energy",             "size": "large"},
    }
    key = company.lower().strip().replace(" ", "")
    cfg = COMPANY_MAP.get(key, {"industry": "technology", "size": "mid"})
    try:
        model_id = _seed_tutorial_store(cfg["industry"], cfg["size"])
        ds = store.datasets.get(model_id, {})
        emp_count = len(ds.get("workforce", [])) if isinstance(ds.get("workforce"), pd.DataFrame) else 0
        task_count = len(ds.get("work_design", [])) if isinstance(ds.get("work_design"), pd.DataFrame) and not ds["work_design"].empty else 0
        return _safe({
            "status": "ok",
            "model": model_id,
            "company": company,
            "industry": cfg["industry"],
            "size": cfg["size"],
            "employees": emp_count,
            "tasks": task_count,
            "models": store.get_model_ids(),
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(500, detail=str(e))


@router.get("/tutorial/industries")
async def list_industries():
    """List available industry × size combinations."""
    return {
        "industries": [
            {"id": "financial_services", "label": "Financial Services", "icon": "🏦", "example": "JP Morgan, Goldman Sachs"},
            {"id": "technology", "label": "Technology", "icon": "💻", "example": "Google, Salesforce"},
            {"id": "healthcare", "label": "Healthcare", "icon": "🏥", "example": "UnitedHealth, Kaiser"},
            {"id": "manufacturing", "label": "Manufacturing", "icon": "🏭", "example": "Toyota, Boeing"},
            {"id": "retail", "label": "Retail & Consumer", "icon": "🛍️", "example": "Walmart, Nike"},
            {"id": "professional_services", "label": "Professional Services", "icon": "💼", "example": "McKinsey, Deloitte"},
        ],
        "sizes": [
            {"id": "small", "label": "Small", "employees": "~50", "icon": "🏠"},
            {"id": "medium", "label": "Medium", "employees": "~200", "icon": "🏢"},
            {"id": "large", "label": "Large", "employees": "~1,000", "icon": "🏙️"},
            {"id": "mega", "label": "Mega", "employees": "~5,000", "icon": "🌍"},
        ],
    }

