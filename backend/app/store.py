"""Centralized data store and transformation services."""

import pandas as pd
import uuid
from io import BytesIO, StringIO
from collections import defaultdict

from app.schemas_definitions import SCHEMAS, DATASET_HINTS, COMMON_ALIASES
from app.helpers import (normalize_column_names, dedupe_columns, apply_aliases,
                           get_series, ensure_model_id, apply_filters, empty_bundle,
                           safe_value_counts, build_filter_dimension_source)


class DataStore:
    def __init__(self):
        self.datasets = {}
        self.raw_uploads = []
        self.job_matches = {}
        self.last_loaded_model_id = None
        self.load_summary = None
        self._seed_demo()

    # ---- DEMO DATA ----
    def _seed_demo(self):
        import random as _rng
        _rng.seed(42)
        m = "Demo_Model"
        self.datasets[m] = empty_bundle()

        # ── WORKFORCE: ~500 employees across 5 functions (Tech Company) ──
        _FIRST = ["Ava","Brian","Chris","Dana","Eric","Fiona","Greg","Hana","Isaac","Julia","Kevin","Laura","Marco","Nina","Oscar","Priya","Quinn","Raj","Sara","Tina","Uma","Victor","Wendy","Xander","Yuki","Zara","Alex","Blake","Casey","Devon","Ellis","Faye","Gabe","Holly","Ivan","Jade","Kai","Luna","Miles","Nora","Owen","Piper","Reed","Sky","Teo","Uri","Val","Wes","Xia","Zoe"]
        _LAST = ["Patel","Chen","Miller","Lee","Wong","Reyes","Tanaka","Kim","Novak","Santos","Park","Zhang","Silva","Okafor","Herrera","Sharma","Murphy","Brown","Davis","Garcia","Wilson","Moore","Taylor","White","Martin","Clark","Hill","Young","Allen","King","Wright","Green","Adams","Nelson","Carter","Roberts","Turner","Collins","Morgan","Bell"]
        _GEO = ["US","US","US","US","UK","India","Germany","Singapore"]
        _eid = [0]
        def _next_eid():
            _eid[0] += 1; return f"E{_eid[0]:04d}"

        # Org blueprint: (func, job_family, sub_families_with_roles)
        _ORG = [
            ("Technology", "Engineering", [
                ("Software Dev", [("VP Engineering","Executive","L9"),("Engineering Manager","Manager","L6"),("Senior Software Engineer","IC","L4"),("Software Engineer","IC","L3"),("Junior Engineer","IC","L2")]),
                ("Data", [("Director, Data","Manager","L8"),("Data Engineering Manager","Manager","L6"),("Senior Data Analyst","IC","L4"),("Data Analyst","IC","L3"),("Data Engineer","IC","L3")]),
                ("DevOps & Cloud", [("DevOps Manager","Manager","L6"),("Senior DevOps Engineer","IC","L4"),("DevOps Engineer","IC","L3"),("Cloud Engineer","IC","L3")]),
                ("QA", [("QA Manager","Manager","L6"),("Senior QA Engineer","IC","L4"),("QA Engineer","IC","L3")]),
            ]),
            ("Product", "Product & Design", [
                ("Product Management", [("VP Product","Executive","L9"),("Senior Product Manager","Manager","L6"),("Product Manager","IC","L4"),("Associate PM","IC","L3")]),
                ("UX Design", [("Design Director","Manager","L8"),("Senior UX Designer","IC","L4"),("UX Designer","IC","L3"),("UI Designer","IC","L2")]),
                ("Research", [("Research Manager","Manager","L6"),("UX Researcher","IC","L3")]),
            ]),
            ("Finance", "Corporate Functions", [
                ("FP&A", [("CFO","Executive","L10"),("Director, FP&A","Manager","L8"),("Finance Manager","Manager","L5"),("Senior Financial Analyst","IC","L4"),("Financial Analyst","IC","L2")]),
                ("Accounting", [("Controller","Manager","L7"),("Senior Accountant","IC","L3"),("Staff Accountant","IC","L2")]),
                ("Treasury", [("Treasury Manager","Manager","L6"),("Treasury Analyst","IC","L3")]),
            ]),
            ("HR", "People", [
                ("Talent Acquisition", [("Head of Talent","Manager","L7"),("Senior Recruiter","IC","L4"),("Recruiter","IC","L3")]),
                ("HR Ops", [("HR Director","Manager","L8"),("HR Business Partner","Manager","L5"),("HR Coordinator","IC","L3"),("HR Analyst","IC","L2")]),
                ("L&D", [("L&D Manager","Manager","L6"),("L&D Specialist","IC","L3")]),
            ]),
            ("Sales & Marketing", "Commercial", [
                ("Sales", [("VP Sales","Executive","L9"),("Sales Director","Manager","L7"),("Senior Account Exec","IC","L4"),("Account Executive","IC","L3"),("SDR","IC","L2")]),
                ("Marketing", [("Marketing Director","Manager","L8"),("Senior Marketing Manager","Manager","L6"),("Marketing Specialist","IC","L3"),("Content Specialist","IC","L2")]),
                ("Customer Success", [("CS Manager","Manager","L6"),("Customer Success Mgr","IC","L4"),("CS Associate","IC","L2")]),
            ]),
        ]
        # Target headcount per function
        _TARGETS = {"Technology": 200, "Product": 60, "Finance": 60, "HR": 50, "Sales & Marketing": 130}

        employees = []
        for func, jf, subfams in _ORG:
            target = _TARGETS[func]
            # Build leaders first, then fill ICs
            func_emps = []
            for sf, roles in subfams:
                sf_share = target // len(subfams)
                for title, track, level in roles:
                    if track == "Executive":
                        count = 1
                    elif track == "Manager":
                        count = max(1, sf_share // 8)
                    else:
                        # ICs get remaining headcount proportionally
                        ic_roles = [r for r in roles if r[1] == "IC"]
                        count = max(2, sf_share // len(ic_roles)) if ic_roles else 2
                    for _ in range(count):
                        eid = _next_eid()
                        name = f"{_rng.choice(_FIRST)} {_rng.choice(_LAST)}"
                        geo = _rng.choice(_GEO)
                        func_emps.append({"Model ID": m, "Employee ID": eid, "Employee Name": name,
                            "Manager ID": "", "Manager Name": "", "Function ID": func,
                            "Job Family": jf, "Sub-Family": sf, "Geography": geo,
                            "Career Track": track, "Career Level": level, "Job Title": title,
                            "Department": func, "Org Unit": func, "FTE": 1})
            # Wire up manager relationships within function
            execs = [e for e in func_emps if e["Career Track"] == "Executive"]
            mgrs = [e for e in func_emps if e["Career Track"] == "Manager"]
            ics = [e for e in func_emps if e["Career Track"] == "IC"]
            # Managers report to executives
            for i, mg in enumerate(mgrs):
                if execs:
                    boss = execs[i % len(execs)]
                    mg["Manager ID"] = boss["Employee ID"]; mg["Manager Name"] = boss["Employee Name"]
            # ICs report to managers
            for i, ic in enumerate(ics):
                if mgrs:
                    boss = mgrs[i % len(mgrs)]
                    ic["Manager ID"] = boss["Employee ID"]; ic["Manager Name"] = boss["Employee Name"]
            employees.extend(func_emps)

        wf = pd.DataFrame(employees)

        # ── WORK DESIGN: 5 jobs × 10 tasks each ──
        wd_rows = []
        # Helper to add a job's tasks
        def add_job_tasks(func, jfam, sfam, geo, track, level, title, tasks):
            for ws, tid, tn, ai, hrs, pct, tt, inter, logic, ps, ss in tasks:
                wd_rows.append({"Model ID": m, "Function ID": func, "Job Family": jfam,
                    "Sub-Family": sfam, "Geography": geo, "Career Track": track, "Career Level": level,
                    "Job Title": title, "Workstream": ws, "Task ID": tid, "Task Name": tn,
                    "AI Impact": ai, "Est Hours/Week": hrs, "Time %": pct,
                    "Task Type": tt, "Interaction": inter, "Logic": logic,
                    "Primary Skill": ps, "Secondary Skill": ss})

        # 1. Financial Analyst
        add_job_tasks("Finance", "Corporate Functions", "FP&A", "US", "Analyst", "L2", "Financial Analyst", [
            ("Data Management", "FA-T1", "Collect Actuals from Source Systems", "High", 4.0, 10, "Repetitive", "Independent", "Deterministic", "Data Analysis", "Excel"),
            ("Reporting", "FA-T2", "Refresh Management Reporting Pack", "High", 4.0, 10, "Repetitive", "Independent", "Deterministic", "Reporting", "PowerPoint"),
            ("Analysis", "FA-T3", "Variance Analysis", "Moderate", 5.0, 12, "Variable", "Interactive", "Probabilistic", "Financial Analysis", "Business Writing"),
            ("Planning", "FA-T4", "Forecast Model Maintenance", "Moderate", 5.0, 13, "Repetitive", "Interactive", "Deterministic", "Financial Modeling", "Excel"),
            ("Stakeholder Support", "FA-T5", "Business Partner Q&A", "Low", 4.0, 10, "Variable", "Collaborative", "Judgment-heavy", "Stakeholder Mgmt", "Communication"),
            ("Controls", "FA-T6", "Reporting Control Checks", "Moderate", 3.0, 8, "Repetitive", "Independent", "Deterministic", "Controls", "Attention to Detail"),
            ("Analysis", "FA-T7", "Scenario Modelling", "Moderate", 3.0, 7, "Variable", "Interactive", "Probabilistic", "Scenario Planning", "Financial Modeling"),
            ("Executive Support", "FA-T8", "Draft Executive Commentary", "Moderate", 4.0, 10, "Variable", "Collaborative", "Judgment-heavy", "Exec Communication", "Business Writing"),
            ("Enablement", "FA-T9", "Template Improvement Backlog", "Low", 2.0, 5, "Variable", "Collaborative", "Judgment-heavy", "Continuous Improvement", "Project Mgmt"),
            ("Governance", "FA-T10", "Data Definition Governance", "Low", 2.0, 5, "Variable", "Collaborative", "Judgment-heavy", "Governance", "Communication"),
        ])

        # 2. Software Engineer
        add_job_tasks("Technology", "Engineering", "Software Dev", "US", "IC", "L3", "Software Engineer", [
            ("Development", "SE-T1", "Feature Implementation", "Moderate", 8.0, 20, "Variable", "Interactive", "Probabilistic", "Software Development", "System Design"),
            ("Code Review", "SE-T2", "Pull Request Reviews", "High", 4.0, 10, "Variable", "Collaborative", "Judgment-heavy", "Code Quality", "Communication"),
            ("Testing", "SE-T3", "Write Unit & Integration Tests", "High", 5.0, 12, "Repetitive", "Independent", "Deterministic", "Testing", "Automation"),
            ("DevOps", "SE-T4", "CI/CD Pipeline Maintenance", "High", 3.0, 8, "Repetitive", "Independent", "Deterministic", "DevOps", "Cloud"),
            ("Documentation", "SE-T5", "Technical Documentation", "High", 3.0, 8, "Repetitive", "Independent", "Deterministic", "Technical Writing", "Documentation"),
            ("Planning", "SE-T6", "Sprint Planning & Estimation", "Low", 3.0, 8, "Variable", "Collaborative", "Judgment-heavy", "Project Mgmt", "Communication"),
            ("Debugging", "SE-T7", "Bug Investigation & Resolution", "Moderate", 5.0, 12, "Variable", "Interactive", "Probabilistic", "Debugging", "Problem Solving"),
            ("Architecture", "SE-T8", "System Design & Architecture", "Low", 4.0, 10, "Variable", "Collaborative", "Judgment-heavy", "Architecture", "Strategic Thinking"),
            ("Meetings", "SE-T9", "Standup & Cross-team Sync", "Low", 3.0, 7, "Variable", "Collaborative", "Judgment-heavy", "Communication", "Collaboration"),
            ("Learning", "SE-T10", "Tech Exploration & Upskilling", "Low", 2.0, 5, "Variable", "Independent", "Probabilistic", "Learning", "Innovation"),
        ])

        # 3. Recruiter
        add_job_tasks("HR", "People", "Talent Acquisition", "US", "IC", "L3", "Recruiter", [
            ("Sourcing", "RC-T1", "Candidate Sourcing & Outreach", "High", 6.0, 15, "Repetitive", "Independent", "Deterministic", "Sourcing", "LinkedIn"),
            ("Screening", "RC-T2", "Resume Screening & Shortlisting", "High", 5.0, 13, "Repetitive", "Independent", "Probabilistic", "Screening", "Assessment"),
            ("Coordination", "RC-T3", "Interview Scheduling", "High", 4.0, 10, "Repetitive", "Interactive", "Deterministic", "Coordination", "Communication"),
            ("Interviewing", "RC-T4", "Conduct Phone Screens", "Moderate", 5.0, 13, "Variable", "Interactive", "Probabilistic", "Interviewing", "Assessment"),
            ("Stakeholder", "RC-T5", "Hiring Manager Alignment", "Low", 4.0, 10, "Variable", "Collaborative", "Judgment-heavy", "Stakeholder Mgmt", "Consulting"),
            ("Offer", "RC-T6", "Offer Preparation & Negotiation", "Moderate", 3.0, 8, "Variable", "Interactive", "Judgment-heavy", "Negotiation", "Compensation"),
            ("Pipeline", "RC-T7", "ATS Data Entry & Pipeline Mgmt", "High", 3.0, 8, "Repetitive", "Independent", "Deterministic", "Data Entry", "ATS"),
            ("Analytics", "RC-T8", "Recruiting Metrics & Reporting", "High", 3.0, 8, "Repetitive", "Independent", "Deterministic", "Analytics", "Excel"),
            ("Branding", "RC-T9", "Employer Brand Content", "Moderate", 3.0, 8, "Variable", "Collaborative", "Probabilistic", "Content", "Marketing"),
            ("Compliance", "RC-T10", "EEO & Compliance Documentation", "Moderate", 2.0, 5, "Repetitive", "Independent", "Deterministic", "Compliance", "Documentation"),
        ])

        # 4. Staff Accountant
        add_job_tasks("Finance", "Corporate Functions", "Accounting", "US", "Analyst", "L2", "Staff Accountant", [
            ("Close", "SA-T1", "Month-End Journal Entries", "High", 5.0, 13, "Repetitive", "Independent", "Deterministic", "Accounting", "ERP"),
            ("Reconciliation", "SA-T2", "Account Reconciliations", "High", 5.0, 13, "Repetitive", "Independent", "Deterministic", "Reconciliation", "Excel"),
            ("AP/AR", "SA-T3", "Accounts Payable Processing", "High", 4.0, 10, "Repetitive", "Independent", "Deterministic", "AP/AR", "ERP"),
            ("Reporting", "SA-T4", "Financial Statement Prep", "Moderate", 4.0, 10, "Variable", "Interactive", "Probabilistic", "Reporting", "GAAP"),
            ("Audit", "SA-T5", "Audit Support & Evidence Prep", "Moderate", 3.0, 8, "Variable", "Interactive", "Probabilistic", "Audit Support", "Documentation"),
            ("Analysis", "SA-T6", "Variance Investigation", "Moderate", 3.0, 8, "Variable", "Interactive", "Probabilistic", "Analysis", "Problem Solving"),
            ("Tax", "SA-T7", "Tax Filing Support", "Low", 3.0, 8, "Variable", "Interactive", "Deterministic", "Tax", "Compliance"),
            ("Controls", "SA-T8", "Internal Controls Testing", "Moderate", 3.0, 8, "Repetitive", "Independent", "Deterministic", "Controls", "SOX"),
            ("Admin", "SA-T9", "Expense Report Review", "High", 3.0, 8, "Repetitive", "Independent", "Deterministic", "Expense Mgmt", "Policy"),
            ("Process", "SA-T10", "Process Documentation Updates", "Moderate", 3.0, 8, "Variable", "Collaborative", "Judgment-heavy", "Documentation", "Process Improvement"),
        ])

        # 5. Data Analyst
        add_job_tasks("Technology", "Engineering", "Data", "US", "IC", "L4", "Data Analyst", [
            ("Collection", "DA-T1", "Data Extraction & ETL", "High", 5.0, 13, "Repetitive", "Independent", "Deterministic", "SQL", "Python"),
            ("Cleaning", "DA-T2", "Data Cleaning & Validation", "High", 4.0, 10, "Repetitive", "Independent", "Deterministic", "Data Quality", "Python"),
            ("Analysis", "DA-T3", "Exploratory Data Analysis", "Moderate", 5.0, 13, "Variable", "Interactive", "Probabilistic", "Statistics", "Visualization"),
            ("Dashboards", "DA-T4", "Dashboard Development", "Moderate", 4.0, 10, "Variable", "Interactive", "Probabilistic", "BI Tools", "Design"),
            ("Modeling", "DA-T5", "Predictive Model Building", "Low", 4.0, 10, "Variable", "Interactive", "Probabilistic", "Machine Learning", "Statistics"),
            ("Reporting", "DA-T6", "Automated Report Generation", "High", 3.0, 8, "Repetitive", "Independent", "Deterministic", "Reporting", "Automation"),
            ("Stakeholder", "DA-T7", "Stakeholder Presentations", "Low", 3.0, 8, "Variable", "Collaborative", "Judgment-heavy", "Presentation", "Storytelling"),
            ("Documentation", "DA-T8", "Methodology Documentation", "High", 3.0, 8, "Repetitive", "Independent", "Deterministic", "Documentation", "Technical Writing"),
            ("QA", "DA-T9", "Data Quality Monitoring", "High", 3.0, 8, "Repetitive", "Independent", "Deterministic", "Data Quality", "Monitoring"),
            ("Ad-hoc", "DA-T10", "Ad-hoc Analysis Requests", "Moderate", 4.0, 10, "Variable", "Collaborative", "Probabilistic", "Analysis", "Communication"),
        ])

        # 6. Product Manager
        add_job_tasks("Product", "Product & Design", "Product Management", "US", "IC", "L4", "Product Manager", [
            ("Strategy", "PM-T1", "Market Research & Analysis", "Moderate", 4.0, 10, "Variable", "Interactive", "Probabilistic", "Market Analysis", "Research"),
            ("Roadmap", "PM-T2", "Feature Prioritization & Roadmap", "Low", 5.0, 13, "Variable", "Collaborative", "Judgment-heavy", "Product Strategy", "Stakeholder Mgmt"),
            ("Requirements", "PM-T3", "Write PRDs & User Stories", "High", 5.0, 13, "Variable", "Interactive", "Probabilistic", "Product Writing", "Requirements"),
            ("Analytics", "PM-T4", "Product Metrics Analysis", "High", 4.0, 10, "Repetitive", "Independent", "Deterministic", "Analytics", "SQL"),
            ("Stakeholder", "PM-T5", "Cross-Functional Alignment", "Low", 4.0, 10, "Variable", "Collaborative", "Judgment-heavy", "Communication", "Leadership"),
            ("Discovery", "PM-T6", "User Interviews & Feedback", "Low", 3.0, 8, "Variable", "Collaborative", "Judgment-heavy", "User Research", "Empathy"),
            ("Sprint", "PM-T7", "Sprint Ceremonies & Grooming", "Low", 3.0, 8, "Variable", "Collaborative", "Judgment-heavy", "Agile", "Facilitation"),
            ("Competitive", "PM-T8", "Competitive Intelligence", "High", 3.0, 8, "Repetitive", "Independent", "Probabilistic", "Research", "Analysis"),
            ("Launch", "PM-T9", "Go-to-Market Planning", "Moderate", 3.0, 8, "Variable", "Collaborative", "Probabilistic", "GTM", "Marketing"),
            ("Reporting", "PM-T10", "Exec Status Reporting", "High", 3.0, 8, "Repetitive", "Independent", "Deterministic", "Reporting", "Presentation"),
        ])

        # 7. UX Designer
        add_job_tasks("Product", "Product & Design", "UX Design", "US", "IC", "L3", "UX Designer", [
            ("Research", "UX-T1", "User Research & Testing", "Low", 5.0, 13, "Variable", "Collaborative", "Judgment-heavy", "User Research", "Empathy"),
            ("Wireframes", "UX-T2", "Wireframing & Prototyping", "Moderate", 6.0, 15, "Variable", "Interactive", "Probabilistic", "Figma", "Design Thinking"),
            ("Design Systems", "UX-T3", "Component Library Maintenance", "High", 4.0, 10, "Repetitive", "Independent", "Deterministic", "Design Systems", "Figma"),
            ("Visual Design", "UX-T4", "High-Fidelity Mockups", "Moderate", 5.0, 13, "Variable", "Independent", "Probabilistic", "Visual Design", "Figma"),
            ("Handoff", "UX-T5", "Developer Handoff & Specs", "High", 3.0, 8, "Repetitive", "Interactive", "Deterministic", "Documentation", "Communication"),
            ("Review", "UX-T6", "Design Review & Critique", "Low", 3.0, 8, "Variable", "Collaborative", "Judgment-heavy", "Design Critique", "Feedback"),
            ("Accessibility", "UX-T7", "Accessibility Audit", "High", 3.0, 8, "Repetitive", "Independent", "Deterministic", "Accessibility", "WCAG"),
            ("Analytics", "UX-T8", "Usage Analytics Review", "High", 3.0, 8, "Repetitive", "Independent", "Deterministic", "Analytics", "Data Analysis"),
            ("Content", "UX-T9", "UX Copy & Microcopy", "Moderate", 3.0, 8, "Variable", "Interactive", "Probabilistic", "UX Writing", "Content Strategy"),
            ("Planning", "UX-T10", "Design Sprint Planning", "Low", 2.0, 5, "Variable", "Collaborative", "Judgment-heavy", "Facilitation", "Planning"),
        ])

        # 8. Account Executive
        add_job_tasks("Sales & Marketing", "Commercial", "Sales", "US", "IC", "L3", "Account Executive", [
            ("Prospecting", "AE-T1", "Lead Research & Qualification", "High", 5.0, 13, "Repetitive", "Independent", "Probabilistic", "Research", "CRM"),
            ("Outreach", "AE-T2", "Cold Outreach & Follow-up", "High", 4.0, 10, "Repetitive", "Independent", "Deterministic", "Communication", "Persistence"),
            ("Discovery", "AE-T3", "Discovery Calls & Needs Analysis", "Low", 5.0, 13, "Variable", "Collaborative", "Judgment-heavy", "Consultative Selling", "Listening"),
            ("Demo", "AE-T4", "Product Demonstrations", "Moderate", 4.0, 10, "Variable", "Interactive", "Probabilistic", "Presentation", "Product Knowledge"),
            ("Proposal", "AE-T5", "Proposal & SOW Creation", "High", 4.0, 10, "Repetitive", "Interactive", "Deterministic", "Writing", "Pricing"),
            ("Negotiation", "AE-T6", "Contract Negotiation", "Low", 3.0, 8, "Variable", "Collaborative", "Judgment-heavy", "Negotiation", "Legal"),
            ("Pipeline", "AE-T7", "CRM & Pipeline Management", "High", 3.0, 8, "Repetitive", "Independent", "Deterministic", "CRM", "Data Entry"),
            ("Forecasting", "AE-T8", "Revenue Forecasting", "Moderate", 3.0, 8, "Variable", "Interactive", "Probabilistic", "Analytics", "Forecasting"),
            ("Relationship", "AE-T9", "Account Relationship Building", "Low", 4.0, 10, "Variable", "Collaborative", "Judgment-heavy", "Relationship Mgmt", "Trust"),
            ("Admin", "AE-T10", "Deal Desk & Admin", "High", 3.0, 8, "Repetitive", "Independent", "Deterministic", "Process", "Documentation"),
        ])

        # 9. Marketing Specialist
        add_job_tasks("Sales & Marketing", "Commercial", "Marketing", "US", "IC", "L3", "Marketing Specialist", [
            ("Content", "MK-T1", "Blog & Content Creation", "High", 5.0, 13, "Variable", "Independent", "Probabilistic", "Content Writing", "SEO"),
            ("Social", "MK-T2", "Social Media Management", "High", 4.0, 10, "Repetitive", "Independent", "Deterministic", "Social Media", "Scheduling"),
            ("Email", "MK-T3", "Email Campaign Execution", "High", 4.0, 10, "Repetitive", "Independent", "Deterministic", "Email Marketing", "Automation"),
            ("Analytics", "MK-T4", "Campaign Performance Analytics", "High", 4.0, 10, "Repetitive", "Independent", "Deterministic", "Analytics", "Google Analytics"),
            ("Events", "MK-T5", "Event Planning & Coordination", "Low", 3.0, 8, "Variable", "Collaborative", "Judgment-heavy", "Event Management", "Logistics"),
            ("SEO", "MK-T6", "SEO Optimization", "Moderate", 3.0, 8, "Variable", "Independent", "Probabilistic", "SEO", "Technical SEO"),
            ("Design", "MK-T7", "Creative Asset Production", "Moderate", 3.0, 8, "Variable", "Independent", "Probabilistic", "Graphic Design", "Canva"),
            ("PR", "MK-T8", "PR & Media Outreach", "Low", 3.0, 8, "Variable", "Collaborative", "Judgment-heavy", "PR", "Communication"),
            ("Website", "MK-T9", "Website Content Updates", "High", 3.0, 8, "Repetitive", "Independent", "Deterministic", "CMS", "HTML"),
            ("Reporting", "MK-T10", "Monthly Marketing Report", "High", 3.0, 8, "Repetitive", "Independent", "Deterministic", "Reporting", "Visualization"),
        ])

        # 10. HR Business Partner
        add_job_tasks("HR", "People", "HR Ops", "US", "Manager", "L5", "HR Business Partner", [
            ("Advisory", "HB-T1", "Manager Coaching & Advisory", "Low", 5.0, 13, "Variable", "Collaborative", "Judgment-heavy", "Coaching", "Leadership"),
            ("ER", "HB-T2", "Employee Relations Cases", "Low", 5.0, 13, "Variable", "Collaborative", "Judgment-heavy", "Employee Relations", "Conflict Resolution"),
            ("Planning", "HB-T3", "Workforce Planning Reviews", "Moderate", 4.0, 10, "Variable", "Interactive", "Probabilistic", "Workforce Planning", "Analytics"),
            ("Performance", "HB-T4", "Performance Cycle Management", "Moderate", 4.0, 10, "Variable", "Interactive", "Probabilistic", "Performance Mgmt", "Calibration"),
            ("Data", "HB-T5", "People Analytics & Reporting", "High", 3.0, 8, "Repetitive", "Independent", "Deterministic", "Analytics", "HRIS"),
            ("Policy", "HB-T6", "Policy Interpretation & Guidance", "Moderate", 3.0, 8, "Variable", "Interactive", "Probabilistic", "Policy", "Compliance"),
            ("Compensation", "HB-T7", "Comp Review Support", "Moderate", 3.0, 8, "Variable", "Interactive", "Deterministic", "Compensation", "Market Data"),
            ("Onboarding", "HB-T8", "New Hire Integration", "Moderate", 3.0, 8, "Repetitive", "Interactive", "Deterministic", "Onboarding", "Culture"),
            ("Change", "HB-T9", "Change Management Support", "Low", 3.0, 8, "Variable", "Collaborative", "Judgment-heavy", "Change Mgmt", "Communication"),
            ("Admin", "HB-T10", "HRIS Updates & Compliance", "High", 3.0, 8, "Repetitive", "Independent", "Deterministic", "HRIS", "Data Entry"),
        ])

        wd = pd.DataFrame(wd_rows)

        # Build job catalog from unique roles in workforce
        jc_rows = []
        _skill_map = {
            "Software Engineer": "Python;JavaScript;Cloud;CI/CD", "Senior Software Engineer": "Python;System Design;Cloud;Architecture",
            "Financial Analyst": "Excel;Analysis;Reporting;Financial Modeling", "Staff Accountant": "GAAP;Reconciliation;ERP;Excel",
            "Data Analyst": "SQL;Python;Statistics;Visualization", "Data Engineer": "SQL;Python;Spark;ETL",
            "Recruiter": "Sourcing;Screening;ATS;Interviewing", "Product Manager": "Strategy;Analytics;Roadmapping;Stakeholder Mgmt",
            "UX Designer": "Figma;Prototyping;User Research;Design Systems", "Account Executive": "CRM;Negotiation;Pipeline;Presentation",
            "Marketing Specialist": "Analytics;Content;SEO;Campaigns", "HR Coordinator": "HRIS;Compliance;Onboarding;Benefits",
            "DevOps Engineer": "AWS;Docker;Kubernetes;Terraform", "QA Engineer": "Selenium;Testing;Automation;CI/CD",
            "Customer Success Mgr": "CRM;Retention;Onboarding;Analytics", "HR Business Partner": "Employee Relations;Coaching;Workforce Planning",
        }
        _purpose_map = {
            "Software Engineer": "Design and build software applications.", "Financial Analyst": "Provide financial insight and reporting.",
            "Data Analyst": "Deliver data-driven insights.", "Recruiter": "Attract and hire talent.", "Staff Accountant": "Execute accounting operations.",
            "Product Manager": "Drive product strategy and roadmap.", "UX Designer": "Design intuitive user experiences.",
            "Account Executive": "Drive revenue through enterprise sales.", "DevOps Engineer": "Build and maintain CI/CD infrastructure.",
        }
        seen_titles = set()
        for e in employees:
            t = e["Job Title"]
            if t in seen_titles: continue
            seen_titles.add(t)
            code = f"{e['Function ID'][:3].upper()}-{t[:3].upper()}-{e['Career Level']}"
            jc_rows.append({"Model ID": m, "Job Code": code, "Job Title": t, "Standard Title": t,
                "Function ID": e["Function ID"], "Job Family": e["Job Family"], "Sub-Family": e["Sub-Family"],
                "Geography": "US", "Career Track": e["Career Track"], "Career Level": e["Career Level"],
                "Manager or IC": "IC" if e["Career Track"] == "IC" else "Manager",
                "Skills": _skill_map.get(t, "Communication;Analysis;Problem Solving;Collaboration"),
                "Role Purpose": _purpose_map.get(t, f"Drive {e['Sub-Family']} outcomes for the organization.")})
        jc = pd.DataFrame(jc_rows)

        op = pd.DataFrame([
            {"Model ID": m, "Scope": "Enterprise", "Layer": "Governance", "Level 1": "Executive Leadership", "Level 2": "Investment Committee", "Level 3": "Risk Oversight", "Level 4": "", "Function ID": "Enterprise", "Job Family": "Corporate", "Geography": "Global"},
            {"Model ID": m, "Scope": "Finance", "Layer": "Core Components", "Level 1": "Planning", "Level 2": "Forecasting", "Level 3": "Reporting", "Level 4": "", "Function ID": "Finance", "Job Family": "Corporate Functions", "Sub-Family": "FP&A", "Geography": "US"},
            {"Model ID": m, "Scope": "Technology", "Layer": "Core Components", "Level 1": "Development", "Level 2": "DevOps", "Level 3": "Data Platform", "Level 4": "", "Function ID": "Technology", "Job Family": "Engineering", "Geography": "US"},
            {"Model ID": m, "Scope": "Product", "Layer": "Core Components", "Level 1": "Product Strategy", "Level 2": "Design", "Level 3": "Research", "Level 4": "", "Function ID": "Product", "Job Family": "Product & Design", "Geography": "US"},
            {"Model ID": m, "Scope": "Sales", "Layer": "Core Components", "Level 1": "Revenue", "Level 2": "Marketing", "Level 3": "Customer Success", "Level 4": "", "Function ID": "Sales & Marketing", "Job Family": "Commercial", "Geography": "US"},
            {"Model ID": m, "Scope": "HR", "Layer": "Shared Services", "Level 1": "Talent", "Level 2": "HR Operations", "Level 3": "L&D", "Level 4": "", "Function ID": "HR", "Job Family": "People", "Geography": "US"},
        ])

        ch = pd.DataFrame([
            {"Model ID": m, "Function ID": "Finance", "Job Family": "Corporate Functions", "Sub-Family": "FP&A", "Job Title": "Financial Analyst", "Task Name": "Reporting Automation", "Responsible": "Analyst", "Accountable": "Director", "Consulted": "Finance Lead", "Informed": "CFO", "Initiative": "Reporting Automation", "Owner": "CFO", "Priority": "High", "Status": "Planned", "Wave": "Wave 1", "Start": "2026-01-01", "End": "2026-03-31", "Milestone": "Kickoff", "Date": "2026-01-01"},
            {"Model ID": m, "Function ID": "Technology", "Job Family": "Engineering", "Sub-Family": "Software Dev", "Job Title": "Software Engineer", "Task Name": "Test Automation", "Responsible": "Engineer", "Accountable": "Eng Manager", "Consulted": "QA Lead", "Informed": "VP Eng", "Initiative": "CI/CD Optimization", "Owner": "VP Eng", "Priority": "High", "Status": "In Progress", "Wave": "Wave 1", "Start": "2026-02-01", "End": "2026-05-31", "Milestone": "Pipeline v2", "Date": "2026-03-15"},
            {"Model ID": m, "Function ID": "HR", "Job Family": "People", "Sub-Family": "Talent Acquisition", "Job Title": "Recruiter", "Task Name": "ATS Automation", "Responsible": "Recruiter", "Accountable": "TA Head", "Consulted": "IT", "Informed": "CHRO", "Initiative": "Recruiting Automation", "Owner": "Head of TA", "Priority": "Medium", "Status": "Planned", "Wave": "Wave 2", "Start": "2026-04-01", "End": "2026-06-30", "Milestone": "Phase 1", "Date": "2026-04-01"},
            {"Model ID": m, "Function ID": "Finance", "Job Family": "Corporate Functions", "Sub-Family": "Accounting", "Job Title": "Staff Accountant", "Task Name": "Close Automation", "Responsible": "Accountant", "Accountable": "Controller", "Consulted": "IT", "Informed": "CFO", "Initiative": "Month-End Acceleration", "Owner": "Controller", "Priority": "High", "Status": "Planned", "Wave": "Wave 1", "Start": "2026-01-15", "End": "2026-04-15", "Milestone": "Pilot", "Date": "2026-02-01"},
            {"Model ID": m, "Function ID": "Technology", "Job Family": "Engineering", "Sub-Family": "Data", "Job Title": "Data Analyst", "Task Name": "ETL Automation", "Responsible": "Analyst", "Accountable": "VP Eng", "Consulted": "Data Lead", "Informed": "CTO", "Initiative": "Data Pipeline Modernization", "Owner": "VP Eng", "Priority": "Medium", "Status": "Planned", "Wave": "Wave 2", "Start": "2026-04-01", "End": "2026-07-31", "Milestone": "New Pipeline", "Date": "2026-04-15"},
            {"Model ID": m, "Function ID": "Product", "Job Family": "Product & Design", "Sub-Family": "Product Management", "Job Title": "Product Manager", "Task Name": "PRD Automation", "Responsible": "PM", "Accountable": "VP Product", "Consulted": "Engineering", "Informed": "CEO", "Initiative": "AI-Assisted Product Discovery", "Owner": "VP Product", "Priority": "Medium", "Status": "Planned", "Wave": "Wave 2", "Start": "2026-05-01", "End": "2026-08-31", "Milestone": "AI PRD Tool", "Date": "2026-05-15"},
            {"Model ID": m, "Function ID": "Sales & Marketing", "Job Family": "Commercial", "Sub-Family": "Sales", "Job Title": "Account Executive", "Task Name": "Lead Scoring Automation", "Responsible": "AE", "Accountable": "Sales Director", "Consulted": "Marketing", "Informed": "VP Sales", "Initiative": "AI Sales Enablement", "Owner": "VP Sales", "Priority": "High", "Status": "Planned", "Wave": "Wave 1", "Start": "2026-02-01", "End": "2026-05-31", "Milestone": "AI Lead Score", "Date": "2026-03-01"},
            {"Model ID": m, "Function ID": "Sales & Marketing", "Job Family": "Commercial", "Sub-Family": "Marketing", "Job Title": "Marketing Specialist", "Task Name": "Content Generation AI", "Responsible": "Specialist", "Accountable": "Marketing Dir", "Consulted": "Brand", "Informed": "CMO", "Initiative": "AI Content Pipeline", "Owner": "Marketing Director", "Priority": "Medium", "Status": "Planned", "Wave": "Wave 2", "Start": "2026-04-01", "End": "2026-07-31", "Milestone": "AI Content v1", "Date": "2026-04-15"},
            {"Model ID": m, "Function ID": "Product", "Job Family": "Product & Design", "Sub-Family": "UX Design", "Job Title": "UX Designer", "Task Name": "Design System AI", "Responsible": "Designer", "Accountable": "Design Dir", "Consulted": "Engineering", "Informed": "VP Product", "Initiative": "AI Design Tools", "Owner": "Design Director", "Priority": "Low", "Status": "Planned", "Wave": "Wave 3", "Start": "2026-07-01", "End": "2026-10-31", "Milestone": "AI Prototyping", "Date": "2026-07-15"},
            {"Model ID": m, "Function ID": "HR", "Job Family": "People", "Sub-Family": "HR Ops", "Job Title": "HR Business Partner", "Task Name": "People Analytics AI", "Responsible": "HRBP", "Accountable": "HR Director", "Consulted": "IT", "Informed": "CHRO", "Initiative": "AI People Insights", "Owner": "HR Director", "Priority": "Medium", "Status": "Planned", "Wave": "Wave 2", "Start": "2026-04-01", "End": "2026-07-31", "Milestone": "Dashboard v1", "Date": "2026-04-30"},
        ])

        # Build market data from job catalog
        _comp_by_level = {
            "L2": (55000,68000,82000), "L3": (72000,88000,105000), "L4": (95000,115000,138000),
            "L5": (110000,135000,160000), "L6": (130000,160000,195000), "L7": (155000,190000,230000),
            "L8": (185000,230000,280000), "L9": (250000,310000,380000), "L10": (350000,420000,520000),
        }
        mk_rows = []
        for jc_row in jc_rows:
            b25, b50, b75 = _comp_by_level.get(jc_row["Career Level"], (70000,85000,100000))
            mk_rows.append({"Model ID": m, "Source": "Demo Survey", "Currency": "USD",
                "Job Match Key": jc_row["Job Title"], "Survey Job Title": jc_row["Job Title"],
                "Function ID": jc_row["Function ID"], "Job Family": jc_row["Job Family"],
                "Sub-Family": jc_row["Sub-Family"], "Geography": "US",
                "Career Track": jc_row["Career Track"], "Career Level": jc_row["Career Level"],
                "Base 25th": b25, "Base 50th": b50, "Base 75th": b75,
                "TCC 25th": int(b25*1.08), "TCC 50th": int(b50*1.1), "TCC 75th": int(b75*1.12)})
        mk = pd.DataFrame(mk_rows)

        for dtype, df in [("workforce", wf), ("org_design", wf), ("work_design", wd),
                          ("job_catalog", jc), ("operating_model", op),
                          ("change_management", ch), ("market_data", mk)]:
            self.datasets[m][dtype] = standardize_to_schema(df, dtype)

        self.job_matches[m] = pd.DataFrame(columns=[
            "Model ID", "Internal Job Title", "Internal Family", "Internal Level",
            "Source", "Survey Job Title", "Job Match Key", "Match Method",
            "Match Confidence", "Approved Match"])

        # Set last_loaded so /api/models returns it on first load
        self.last_loaded_model_id = m

    # ---- MODEL MANAGEMENT ----
    def ensure_model_bundle(self, model_id):
        mid = (str(model_id).strip() if model_id else "") or "Uploaded_Model"
        if mid not in self.datasets:
            self.datasets[mid] = empty_bundle()
        if mid not in self.job_matches:
            self.job_matches[mid] = pd.DataFrame()

    def get_model_ids(self):
        self.datasets = {k: v for k, v in self.datasets.items() if k and str(k).strip()}
        return sorted(self.datasets.keys())

    def reset(self):
        self.__init__()

    # ---- INGESTION ----
    def process_uploads(self, file_list):
        summary = []
        for fname, content_bytes in file_list:
            sheets = _load_excel_or_csv(content_bytes, fname)
            for sname, raw_df in sheets.items():
                if raw_df is None or raw_df.empty:
                    summary.append({"File": fname, "Sheet": sname, "Type": "unknown", "Model ID": "", "Rows": 0, "Status": "Skipped"})
                    continue
                dtype = classify_dataframe(raw_df, sname)
                fallback = fname.rsplit(".", 1)[0]
                raw_df = ensure_model_id(raw_df, fallback)
                mids = [x for x in get_series(raw_df, "Model ID").dropna().astype(str).str.strip().unique() if x]
                if not mids:
                    mids = [fallback]
                    raw_df["Model ID"] = fallback
                for mid in mids:
                    mid = str(mid).strip() or fallback
                    sub = raw_df[get_series(raw_df, "Model ID").astype(str).str.strip() == mid].copy()
                    self.raw_uploads.append({"id": str(uuid.uuid4())[:8], "file": fname, "sheet": sname,
                                             "type": dtype, "model_id": mid, "rows": len(sub)})
                    if dtype in SCHEMAS:
                        self.ensure_model_bundle(mid)
                        self.datasets[mid][dtype] = dedupe_columns(standardize_to_schema(sub, dtype))
                        self.last_loaded_model_id = mid
                        status = "Registered"
                    else:
                        status = "Unknown type"
                    summary.append({"File": fname, "Sheet": sname, "Type": dtype, "Model ID": mid,
                                    "Rows": len(sub), "Status": status})
        # Derive a few lightweight supporting datasets so a single upload still flows through the app.
        for mid in list(self.datasets.keys()):
            if not mid or mid == "Demo_Model":
                continue
            self._ensure_derived_datasets(mid)

        # Remove demo if real data uploaded
        if "Demo_Model" in self.datasets:
            real = [m for m in self.datasets if m != "Demo_Model"]
            if real:
                del self.datasets["Demo_Model"]
                self.job_matches.pop("Demo_Model", None)
        self.load_summary = pd.DataFrame(summary)
        return self.load_summary


    def _ensure_derived_datasets(self, model_id):
        bundle = self.get_bundle(model_id)

        if bundle.get("org_design", pd.DataFrame()).empty and not bundle.get("workforce", pd.DataFrame()).empty:
            bundle["org_design"] = standardize_to_schema(bundle["workforce"].copy(), "org_design")

        internal_catalog = self.build_internal_job_catalog(model_id)
        if bundle.get("job_catalog", pd.DataFrame()).empty and not internal_catalog.empty:
            bundle["job_catalog"] = standardize_to_schema(internal_catalog.copy(), "job_catalog")

        if bundle.get("work_design", pd.DataFrame()).empty:
            fallback_wd = _build_fallback_work_design(model_id, bundle.get("workforce", pd.DataFrame()).copy(), internal_catalog.copy())
            if not fallback_wd.empty:
                bundle["work_design"] = standardize_to_schema(fallback_wd, "work_design")

    # ---- DERIVED VIEWS ----
    def get_bundle(self, model_id):
        self.ensure_model_bundle(model_id)
        return self.datasets[model_id]

    def build_internal_job_catalog(self, model_id):
        bundle = self.get_bundle(model_id)
        frames = []
        for dt in ["job_catalog", "workforce", "org_design", "work_design"]:
            df = bundle.get(dt, pd.DataFrame())
            if not df.empty:
                temp = df.copy()
                for c in SCHEMAS["job_catalog"]["all"]:
                    if c not in temp.columns:
                        temp[c] = ""
                frames.append(temp[SCHEMAS["job_catalog"]["all"]].copy())
        if not frames:
            return pd.DataFrame(columns=SCHEMAS["job_catalog"]["all"])
        cat = pd.concat(frames, ignore_index=True)
        pick = lambda s: next((str(x).strip() for x in s if str(x).strip()), "")
        grp = cat.groupby(["Model ID", "Job Title", "Function ID", "Job Family", "Sub-Family",
                           "Geography", "Career Track", "Career Level"], dropna=False, as_index=False).agg(
            {c: pick for c in ["Job Code", "Standard Title", "Manager or IC", "Job Description", "Skills", "Role Purpose"]})
        for c in SCHEMAS["job_catalog"]["all"]:
            if c not in grp.columns:
                grp[c] = ""
        return grp[SCHEMAS["job_catalog"]["all"]]

    def build_org_source(self, model_id):
        bundle = self.get_bundle(model_id)
        org = bundle.get("org_design", pd.DataFrame())
        return org if not org.empty else bundle.get("workforce", pd.DataFrame()).copy()

    def get_filtered_data(self, model_id, filters):
        if not model_id or model_id not in self.datasets:
            return {k: pd.DataFrame() for k in SCHEMAS}
        bundle = self.get_bundle(model_id)
        wf_raw = bundle["workforce"].copy()
        jc_raw = self.build_internal_job_catalog(model_id)
        mk_raw = bundle["market_data"].copy()
        op_raw = bundle["operating_model"].copy()
        wd_raw = bundle["work_design"].copy()
        ch_raw = bundle["change_management"].copy()
        org_raw = self.build_org_source(model_id).copy()

        if wd_raw.empty:
            wd_raw = _build_fallback_work_design(model_id, wf_raw, jc_raw)
        wd_raw = enrich_work_design_defaults(wd_raw)

        return {
            "workforce": apply_filters(wf_raw, filters),
            "job_catalog": apply_filters(jc_raw, filters),
            "market_data": apply_filters(mk_raw, filters),
            "operating_model": apply_filters(op_raw, filters),
            "work_design": apply_filters(wd_raw, filters),
            "change_management": apply_filters(ch_raw, filters),
            "org_design": apply_filters(org_raw, filters),
        }

    def readiness_summary(self, model_id):
        bundle = self.get_bundle(model_id)
        rows = []
        labels = {"workforce": "Workforce", "job_catalog": "Job Catalog", "market_data": "Market Data",
                  "operating_model": "Operating Model", "work_design": "Work Design",
                  "change_management": "Change Mgmt", "org_design": "Org Design"}
        for dt, label in labels.items():
            df = bundle.get(dt, pd.DataFrame())
            if dt == "org_design":
                df = self.build_org_source(model_id)
            n = len(df)
            status = "Ready" if n > 0 else "Missing"
            issues = _validate_schema(df, dt) if n > 0 else []
            req = SCHEMAS[dt]["required"]
            present = [c for c in req if c in df.columns] if n > 0 else []
            completeness = int(len(present) / len(req) * 100) if req else 0
            rows.append({"Dataset": label, "Status": status, "Rows": n,
                         "Issues": len(issues), "Completeness": completeness,
                         "Required": ", ".join(req)})
        return pd.DataFrame(rows)

    def upload_log(self):
        if not self.raw_uploads:
            return pd.DataFrame(columns=["id", "file", "sheet", "type", "model_id", "rows"])
        return pd.DataFrame(self.raw_uploads)

    def model_registry(self):
        rows = []
        for mid, bundle in self.datasets.items():
            row = {"Model ID": mid}
            for dt in SCHEMAS:
                row[f"{dt}"] = len(bundle.get(dt, pd.DataFrame()))
            rows.append(row)
        return pd.DataFrame(rows)


# ---- MODULE-LEVEL HELPERS ----

def _load_excel_or_csv(content_bytes, fname):
    if fname.lower().endswith(".csv"):
        text = content_bytes.decode("utf-8", errors="replace")
        df = pd.read_csv(StringIO(text))
        df = apply_aliases(normalize_column_names(df))
        return {"Sheet1": dedupe_columns(df)}
    sheets = pd.read_excel(BytesIO(content_bytes), sheet_name=None)
    return {s: dedupe_columns(apply_aliases(normalize_column_names(d))) for s, d in sheets.items()}


def classify_dataframe(df, sheet_name=""):
    cols = set(df.columns)
    sl = str(sheet_name).strip().lower()

    # Name-based matching — ORDER MATTERS: work_design must be checked before
    # job_catalog because work_design sheets often contain job_catalog columns.
    name_map_ordered = [
        ("work_design", ["work_design", "work design", "task_inventory", "task inventory",
                         "tasks", "task", "deconstruction", "reconstruction"]),
        ("org_design", ["org_design", "org design", "org", "reporting", "hierarchy"]),
        ("workforce", ["workforce", "census", "employee", "roster"]),
        ("job_catalog", ["job_catalog", "job catalog", "job architecture", "role architecture",
                         "job profile", "job profiles", "jobs"]),
        ("market_data", ["market_data", "market data", "market", "survey", "benchmark", "comp"]),
        ("operating_model", ["operating_model", "operating model", "operating", "op model", "tom"]),
        ("change_management", ["change_management", "change management", "change", "raci",
                               "milestone", "project", "raid"]),
    ]
    for dt, kws in name_map_ordered:
        if any(k in sl for k in kws):
            return dt

    # Column-based fallback: check for distinguishing columns first
    # Work design has these columns that job_catalog never does:
    work_design_markers = {"Task Name", "Workstream", "Task ID", "AI Impact",
                           "Est Hours/Week", "Time %", "Current Time Spent %",
                           "Task Type", "Interaction", "Logic"}
    if len(cols.intersection(work_design_markers)) >= 2:
        return "work_design"

    # General hint scoring
    best, best_score = "unknown", 0
    for dt, hints in DATASET_HINTS.items():
        s = len(cols.intersection(hints))
        if s > best_score:
            best_score, best = s, dt
    return best if best_score >= 2 else "unknown"


def standardize_to_schema(df, dtype):
    df = apply_aliases(normalize_column_names(df))
    fields = SCHEMAS[dtype]["all"]
    out = df.copy()
    for c in fields:
        if c not in out.columns:
            out[c] = ""
    out = out[fields].copy()
    numerics = ["FTE", "Base Pay", "Total Cash", "Base 25th", "Base 50th", "Base 75th",
                "TCC 25th", "TCC 50th", "TCC 75th", "LTIP 25th", "LTIP 50th", "LTIP 75th",
                "Est Hours/Week", "Current Time Spent %", "Time Saved %", "Time %"]
    for c in numerics:
        if c in out.columns:
            out[c] = pd.to_numeric(out[c], errors="coerce")
    return dedupe_columns(out)


def _validate_schema(df, dtype):
    issues = []
    for c in SCHEMAS[dtype]["required"]:
        if c not in df.columns:
            issues.append(f"Missing: {c}")
        else:
            blanks = get_series(df, c).fillna("").astype(str).str.strip().eq("").sum()
            if blanks > 0:
                issues.append(f"{c}: {blanks} blank")
    return issues


# ---- WORK DESIGN SERVICES ----

def sync_work_design(df):
    if df is None or df.empty:
        return df.copy() if isinstance(df, pd.DataFrame) else pd.DataFrame(columns=SCHEMAS["work_design"]["all"])
    t = df.copy()
    if "Current Time Spent %" not in t.columns:
        t["Current Time Spent %"] = pd.to_numeric(get_series(t, "Time %"), errors="coerce")
    if "Time %" not in t.columns:
        t["Time %"] = pd.to_numeric(get_series(t, "Current Time Spent %"), errors="coerce")
    ct = pd.to_numeric(get_series(t, "Current Time Spent %"), errors="coerce")
    lt = pd.to_numeric(get_series(t, "Time %"), errors="coerce")
    t["Current Time Spent %"] = ct.fillna(lt).fillna(0)
    t["Time %"] = t["Current Time Spent %"]
    if "Time Saved %" not in t.columns:
        t["Time Saved %"] = 0.0
    t["Time Saved %"] = pd.to_numeric(get_series(t, "Time Saved %"), errors="coerce").fillna(0).clip(lower=0)
    t["Time Saved %"] = t[["Time Saved %", "Current Time Spent %"]].min(axis=1)
    if "Est Hours/Week" in t.columns:
        t["Est Hours/Week"] = pd.to_numeric(get_series(t, "Est Hours/Week"), errors="coerce").fillna(0)
    return t


def enrich_work_design_defaults(df, scenario="Balanced"):
    t = sync_work_design(df)
    if t.empty:
        return t
    scenario_map = {"Conservative": {"High": 30, "Moderate": 15, "Low": 5},
                    "Balanced": {"High": 45, "Moderate": 25, "Low": 10},
                    "Transformative": {"High": 60, "Moderate": 40, "Low": 20}}
    rmap = scenario_map.get(scenario, scenario_map["Balanced"])
    zero = pd.to_numeric(get_series(t, "Time Saved %"), errors="coerce").fillna(0).eq(0)
    if zero.any():
        t.loc[zero, "Time Saved %"] = t.loc[zero, "AI Impact"].apply(lambda x: float(rmap.get(str(x).strip(), 10)))
        t["Time Saved %"] = t[["Time Saved %", "Current Time Spent %"]].min(axis=1)
    return t


def build_reconstruction(job_df, scenario="Balanced"):
    if job_df.empty:
        return pd.DataFrame()
    t = sync_work_design(enrich_work_design_defaults(job_df, scenario))
    for c in ["Est Hours/Week", "Current Time Spent %", "Time Saved %"]:
        t[c] = pd.to_numeric(get_series(t, c), errors="coerce").fillna(0)
    t["Time Saved %"] = t[["Time Saved %", "Current Time Spent %"]].min(axis=1)
    t["Future Time %"] = (t["Current Time Spent %"] - t["Time Saved %"]).clip(lower=0).round(1)
    total = t["Current Time Spent %"].sum()
    t["Current Hrs"] = (t["Est Hours/Week"] * t["Current Time Spent %"] / total).round(2) if total else 0
    t["Released %"] = t["Time Saved %"].round(1)
    t["Released Hrs"] = (t["Current Hrs"] * t["Time Saved %"] / t["Current Time Spent %"].replace(0, pd.NA)).fillna(0).round(2)
    t["Future Hrs"] = (t["Current Hrs"] - t["Released Hrs"]).clip(lower=0).round(2)

    def fstate(r):
        saved = float(r.get("Time Saved %", 0) or 0)
        logic = str(r.get("Logic", ""))
        inter = str(r.get("Interaction", ""))
        impact = str(r.get("AI Impact", ""))
        if saved >= max(8, float(r.get("Current Time Spent %", 0) or 0) * 0.6) and logic == "Deterministic" and inter == "Independent":
            return "Automated"
        if saved > 0 and impact in ["High", "Moderate"] and inter in ["Interactive", "Collaborative"]:
            return "AI-Assisted"
        if logic == "Judgment-heavy":
            return "Human-Led"
        return "Retained"

    t["Future State"] = t.apply(fstate, axis=1)

    def action(r):
        impact = str(r.get("AI Impact", ""))
        logic = str(r.get("Logic", ""))
        inter = str(r.get("Interaction", ""))
        released = float(r.get("Released %", 0) or 0)
        if impact == "High" and logic == "Deterministic" and inter == "Independent":
            return "Automate"
        if released >= 8:
            return "Redesign"
        if impact in ["High", "Moderate"]:
            return "Augment"
        return "Retain"

    t["Action"] = t.apply(action, axis=1)
    return t


def build_ai_priority_scores(work_design_df):
    """Score each task for AI prioritization."""
    if work_design_df.empty:
        return pd.DataFrame()
    t = sync_work_design(work_design_df).copy()
    # Automation Potential
    auto_map = {"Repetitive": 3, "Variable": 1.5}
    logic_map = {"Deterministic": 3, "Probabilistic": 2, "Judgment-heavy": 0.5}
    inter_map = {"Independent": 3, "Interactive": 2, "Collaborative": 1}
    t["Auto Score"] = (t["Task Type"].map(auto_map).fillna(1) +
                       t["Logic"].map(logic_map).fillna(1) +
                       t["Interaction"].map(inter_map).fillna(1))
    # Time Impact
    t["Time Impact"] = (pd.to_numeric(get_series(t, "Est Hours/Week"), errors="coerce").fillna(0) *
                        pd.to_numeric(get_series(t, "Time Saved %"), errors="coerce").fillna(0) / 100)
    # Complexity (inverse feasibility)
    t["Complexity"] = (t["Interaction"].map({"Collaborative": 3, "Interactive": 2, "Independent": 1}).fillna(1.5) +
                       t["Logic"].map({"Judgment-heavy": 3, "Probabilistic": 2, "Deterministic": 1}).fillna(1.5))
    # Risk
    t["Risk Score"] = (t["Logic"].map({"Judgment-heavy": 3, "Probabilistic": 2, "Deterministic": 1}).fillna(1) +
                       t["Interaction"].map({"Collaborative": 2, "Interactive": 1.5, "Independent": 0.5}).fillna(1))
    # Feasibility = inverse complexity
    t["Feasibility"] = (6 - t["Complexity"]).clip(lower=0.5)
    # Composite
    t["AI Priority"] = ((t["Auto Score"] * 0.3 + t["Time Impact"] * 0.4 + t["Feasibility"] * 0.3) * 10).round(1)
    return t


def build_skill_analysis(work_design_df, reconstruction_df=None):
    """Analyze current and future skill demand."""
    if work_design_df.empty:
        return pd.DataFrame(), pd.DataFrame()
    t = sync_work_design(work_design_df)
    rows_curr = []
    for _, r in t.iterrows():
        pct = float(r.get("Current Time Spent %", 0) or 0)
        ps = str(r.get("Primary Skill", "")).strip()
        ss = str(r.get("Secondary Skill", "")).strip()
        if ps:
            rows_curr.append({"Skill": ps, "Weight": pct * 0.7, "Type": "Primary"})
        if ss:
            rows_curr.append({"Skill": ss, "Weight": pct * 0.3, "Type": "Secondary"})
    if not rows_curr:
        return pd.DataFrame(), pd.DataFrame()
    current = pd.DataFrame(rows_curr).groupby("Skill", as_index=False)["Weight"].sum()
    current["Weight"] = current["Weight"].round(1)
    current = current.sort_values("Weight", ascending=False)

    # Future skill demand (post-transformation)
    if reconstruction_df is not None and not reconstruction_df.empty:
        rows_fut = []
        for _, r in reconstruction_df.iterrows():
            fut_pct = float(r.get("Future Time %", 0) or 0)
            ps = str(r.get("Primary Skill", "")).strip()
            ss = str(r.get("Secondary Skill", "")).strip()
            if ps:
                rows_fut.append({"Skill": ps, "Weight": fut_pct * 0.7})
            if ss:
                rows_fut.append({"Skill": ss, "Weight": fut_pct * 0.3})
        if rows_fut:
            future = pd.DataFrame(rows_fut).groupby("Skill", as_index=False)["Weight"].sum()
            future["Weight"] = future["Weight"].round(1)
            return current, future.sort_values("Weight", ascending=False)
    return current, pd.DataFrame()


def compute_readiness_score(data):
    """Compute AI readiness score 0-100."""
    scores = {}
    wd = data.get("work_design", pd.DataFrame())
    wf = data.get("workforce", pd.DataFrame())
    org = data.get("org_design", pd.DataFrame())
    op = data.get("operating_model", pd.DataFrame())
    ch = data.get("change_management", pd.DataFrame())

    # Data readiness (0-20)
    loaded = sum(1 for v in data.values() if not v.empty)
    scores["Data Readiness"] = min(20, loaded * 3)

    # Process standardization (0-20)
    if not wd.empty:
        t = sync_work_design(wd)
        rep = (get_series(t, "Task Type") == "Repetitive").mean() * 100
        det = (get_series(t, "Logic") == "Deterministic").mean() * 100
        scores["Process Standardization"] = min(20, int((rep + det) / 10))
    else:
        scores["Process Standardization"] = 0

    # Technology enablement (0-20)
    if not wd.empty:
        t = sync_work_design(wd)
        high = (get_series(t, "AI Impact") == "High").mean() * 100
        scores["Technology Enablement"] = min(20, int(high / 5))
    else:
        scores["Technology Enablement"] = 5

    # Talent readiness (0-20)
    scores["Talent Readiness"] = min(20, len(wf) + 5 if not wf.empty else 3)

    # Leadership alignment (0-20)
    scores["Leadership Alignment"] = min(20, 8 + (5 if not op.empty else 0) + (5 if not ch.empty else 0))

    total = sum(scores.values())
    return total, scores


def _build_fallback_work_design(model_id, wf, jc):
    source = jc if not jc.empty else wf
    if source.empty or "Job Title" not in source.columns:
        return pd.DataFrame(columns=SCHEMAS["work_design"]["all"])
    seed_cols = ["Model ID", "Function ID", "Job Family", "Sub-Family", "Geography",
                 "Career Track", "Career Level", "Job Title", "Job Description"]
    for c in seed_cols:
        if c not in source.columns:
            source[c] = ""
    jobs = source[seed_cols].dropna(subset=["Job Title"]).copy()
    jobs["Job Title"] = jobs["Job Title"].astype(str).str.strip()
    jobs = jobs[jobs["Job Title"] != ""].drop_duplicates()
    if jobs.empty:
        return pd.DataFrame(columns=SCHEMAS["work_design"]["all"])
    templates = [
        ("Planning", "WD-T1", "Plan and prioritize work", "Moderate", 2, 8, "Variable", "Collaborative", "Judgment-heavy", "Planning", "Communication"),
        ("Data Collection", "WD-T2", "Gather inputs and source data", "High", 4, 16, "Repetitive", "Independent", "Deterministic", "Data Analysis", "Excel"),
        ("Analysis", "WD-T3", "Analyze information", "Moderate", 5, 20, "Variable", "Interactive", "Probabilistic", "Analysis", "Problem Solving"),
        ("Documentation", "WD-T4", "Prepare documentation", "High", 4, 16, "Repetitive", "Independent", "Deterministic", "Documentation", "PowerPoint"),
        ("Review", "WD-T5", "Review with stakeholders", "Low", 3, 12, "Variable", "Collaborative", "Judgment-heavy", "Stakeholder Mgmt", "Communication"),
        ("Execution", "WD-T6", "Execute final updates", "Moderate", 4, 16, "Variable", "Interactive", "Deterministic", "Execution", "Project Mgmt"),
        ("Improvement", "WD-T7", "Improve process", "Moderate", 3, 12, "Variable", "Collaborative", "Judgment-heavy", "Improvement", "Digital Tools"),
    ]
    rows = []
    for _, base in jobs.iterrows():
        for ws, tid, tn, ai, hrs, pct, tt, inter, logic, ps, ss in templates:
            row = {c: base.get(c, "") for c in seed_cols}
            row.update({"Workstream": ws, "Task ID": tid, "Task Name": tn, "AI Impact": ai,
                        "Est Hours/Week": hrs, "Time %": pct, "Task Type": tt, "Interaction": inter,
                        "Logic": logic, "Primary Skill": ps, "Secondary Skill": ss,
                        "Model ID": str(base.get("Model ID", model_id)).strip() or model_id})
            rows.append(row)
    return standardize_to_schema(pd.DataFrame(rows), "work_design")


def get_manager_candidates(org_df):
    if org_df.empty:
        return pd.DataFrame()
    t = org_df.copy()
    t["Employee ID"] = get_series(t, "Employee ID").fillna("").astype(str).str.strip()
    t["Manager ID"] = get_series(t, "Manager ID").fillna("").astype(str).str.strip()
    mids = set(t.loc[t["Manager ID"] != "", "Manager ID"].unique())
    if not mids:
        return pd.DataFrame()
    mgr = t[t["Employee ID"].isin(mids)].copy()
    dr_counts = (t[t["Manager ID"] != ""].groupby("Manager ID").size()
                 .reset_index(name="Direct Reports").rename(columns={"Manager ID": "Employee ID"}))
    mgr = mgr.merge(dr_counts, on="Employee ID", how="left")
    mgr["Direct Reports"] = mgr["Direct Reports"].fillna(0).astype(int)
    return mgr.drop_duplicates(subset=["Employee ID"])


def build_auto_change_plan(wd, org, op):
    rows = []
    if not wd.empty:
        t = sync_work_design(wd)
        agg = t.groupby("Job Title", as_index=False)[["Current Time Spent %", "Time Saved %", "Est Hours/Week"]].sum()
        agg["Priority"] = pd.cut(agg["Time Saved %"], bins=[-0.1, 5, 15, 100], labels=["Low", "Medium", "High"]).astype(str)
        agg = agg.sort_values("Time Saved %", ascending=False).head(12)
        for _, r in agg.iterrows():
            rows.append({
                "Wave": "Wave 1" if r["Time Saved %"] >= 15 else ("Wave 2" if r["Time Saved %"] >= 8 else "Wave 3"),
                "Initiative": f"Redesign {r['Job Title']} workflow",
                "Stakeholder": r["Job Title"], "Impact": "Work redesign",
                "Priority": r["Priority"], "Risk": "Adoption" if r["Time Saved %"] >= 8 else "Role clarity"})
    return pd.DataFrame(rows) if rows else pd.DataFrame(columns=["Wave", "Initiative", "Stakeholder", "Impact", "Priority", "Risk"])


# -------------------------------------------------------------------
# DECONSTRUCTION / RECONSTRUCTION / REDEPLOYMENT SERVICES
# -------------------------------------------------------------------

def build_deconstruction_summary(job_df):
    """High-level deconstruction metrics for a single job."""
    if job_df.empty:
        return pd.DataFrame()
    t = sync_work_design(job_df)
    high_share = pd.to_numeric(t.loc[get_series(t, "AI Impact").astype(str) == "High", "Current Time Spent %"],
                               errors="coerce").fillna(0).sum()
    rep_share = pd.to_numeric(t.loc[get_series(t, "Task Type").astype(str) == "Repetitive", "Current Time Spent %"],
                              errors="coerce").fillna(0).sum()
    ind_share = pd.to_numeric(t.loc[get_series(t, "Interaction").astype(str) == "Independent", "Current Time Spent %"],
                              errors="coerce").fillna(0).sum()
    total_saved = pd.to_numeric(get_series(t, "Time Saved %"), errors="coerce").fillna(0).sum()
    total_hrs = pd.to_numeric(get_series(t, "Est Hours/Week"), errors="coerce").fillna(0).sum()
    total_pct = pd.to_numeric(get_series(t, "Current Time Spent %"), errors="coerce").fillna(0).sum()
    return pd.DataFrame([
        {"Metric": "Tasks in Role", "Value": int(len(t)), "Note": "Total task rows in scope"},
        {"Metric": "Current Hours / Week", "Value": round(total_hrs, 1), "Note": "Weekly capacity baseline"},
        {"Metric": "Time Allocation %", "Value": round(total_pct, 1), "Note": "Should total 100% per role"},
        {"Metric": "Time Saved %", "Value": round(total_saved, 1), "Note": "Capacity expected to be released"},
        {"Metric": "High AI Impact %", "Value": round(high_share, 1), "Note": "Time on High AI-impact tasks"},
        {"Metric": "Repetitive Work %", "Value": round(rep_share, 1), "Note": "Suitable for standardization"},
        {"Metric": "Independent Work %", "Value": round(ind_share, 1), "Note": "Least collaboration-dependent"},
    ])


def build_workstream_breakdown(job_df):
    """Aggregate task metrics by workstream."""
    if job_df.empty:
        return pd.DataFrame()
    t = sync_work_design(job_df)
    impact_score = {"High": 3, "Moderate": 2, "Low": 1}
    t["Impact Score"] = get_series(t, "AI Impact").astype(str).map(impact_score).fillna(1)
    grp = t.groupby("Workstream", dropna=False, as_index=False).agg({
        "Task Name": "count",
        "Current Time Spent %": "sum",
        "Time Saved %": "sum",
        "Est Hours/Week": "sum",
        "Impact Score": "mean"
    }).rename(columns={"Task Name": "Tasks"})
    grp["Avg AI Score"] = grp["Impact Score"].round(2)
    grp = grp.drop(columns=["Impact Score"])
    for c in ["Current Time Spent %", "Time Saved %", "Est Hours/Week"]:
        grp[c] = grp[c].round(1)
    return grp.sort_values("Current Time Spent %", ascending=False)


def build_task_portfolio(job_df):
    """Breakdown by Task Type × Interaction × Logic."""
    if job_df.empty:
        return pd.DataFrame()
    t = sync_work_design(job_df)
    grp = t.groupby(["Task Type", "Interaction", "Logic"], dropna=False, as_index=False)[
        ["Current Time Spent %", "Time Saved %", "Est Hours/Week"]].sum()
    for c in ["Current Time Spent %", "Time Saved %", "Est Hours/Week"]:
        grp[c] = grp[c].round(1)
    return grp.sort_values("Current Time Spent %", ascending=False)


def build_reconstruction_rollup(reconstruction_df):
    """Rollup reconstruction metrics by workstream."""
    if reconstruction_df.empty:
        return pd.DataFrame()
    cols = ["Current Time Spent %", "Time Saved %", "Future Time %", "Released %",
            "Est Hours/Week", "Future Hrs", "Released Hrs"]
    t = reconstruction_df.copy()
    for c in cols:
        if c not in t.columns:
            t[c] = 0.0
        t[c] = pd.to_numeric(get_series(t, c), errors="coerce").fillna(0)
    if "Workstream" not in t.columns:
        return pd.DataFrame()
    grp = t.groupby("Workstream", as_index=False)[cols].sum()
    for c in cols:
        grp[c] = grp[c].round(1)
    return grp.sort_values("Released %", ascending=False)


def build_redeployment_detail(reconstruction_df):
    """Build redeployment focus and capacity destination per task."""
    if reconstruction_df.empty or "Action" not in reconstruction_df.columns:
        return pd.DataFrame()
    t = reconstruction_df.copy()
    focus_map = {
        "Automate": "Shift capacity to controls, exceptions, and business partnering",
        "Redesign": "Bundle adjacent tasks into new end-to-end analyst pods",
        "Augment": "Use copilots for faster analysis and interpretation",
        "Retain": "Keep human-led execution and targeted enablement",
    }
    dest_map = {
        "Automate": "Exception handling, controls, and review queues",
        "Redesign": "Cross-functional planning, scenario analysis, problem solving",
        "Augment": "Stakeholder support, decision support, narrative synthesis",
        "Retain": "Execution depth and quality assurance",
    }
    t["Redeployment Focus"] = t["Action"].map(focus_map).fillna("")
    t["Capacity Destination"] = t["Action"].map(dest_map).fillna("")
    keep = ["Workstream", "Task Name", "AI Impact", "Action", "Future State",
            "Released %", "Released Hrs", "Redeployment Focus", "Capacity Destination",
            "Primary Skill", "Secondary Skill"]
    return t[[c for c in keep if c in t.columns]].copy()


def build_skill_shift_matrix(redeployment_df):
    """Aggregate skills being released or retained by action type."""
    if redeployment_df.empty:
        return pd.DataFrame()
    rows = []
    for _, r in redeployment_df.iterrows():
        hrs = float(r.get("Released Hrs", 0) or 0)
        action = str(r.get("Action", "")).strip()
        ps = str(r.get("Primary Skill", "")).strip()
        ss = str(r.get("Secondary Skill", "")).strip()
        if ps:
            rows.append({"Skill": ps, "Action": action, "Hours": round(hrs * 0.7, 1)})
        if ss:
            rows.append({"Skill": ss, "Action": action, "Hours": round(hrs * 0.3, 1)})
    if not rows:
        return pd.DataFrame()
    df = pd.DataFrame(rows)
    return df.groupby(["Action", "Skill"], as_index=False)["Hours"].sum().sort_values(
        ["Action", "Hours"], ascending=[True, False])


def build_transformation_insights(job_df, reconstruction_df, redeployment_df):
    """Quantitative transformation summary table."""
    if job_df.empty or reconstruction_df.empty:
        return pd.DataFrame()
    total_curr = pd.to_numeric(get_series(job_df, "Est Hours/Week"), errors="coerce").fillna(0).sum()
    total_fut = pd.to_numeric(get_series(reconstruction_df, "Future Hrs"), errors="coerce").fillna(0).sum()
    released = total_curr - total_fut
    auto_tasks = int((get_series(redeployment_df, "Action").astype(str) == "Automate").sum()) if not redeployment_df.empty else 0
    rede_tasks = int((get_series(redeployment_df, "Action").astype(str) == "Redesign").sum()) if not redeployment_df.empty else 0
    augm_tasks = int((get_series(redeployment_df, "Action").astype(str) == "Augment").sum()) if not redeployment_df.empty else 0
    retn_tasks = int((get_series(redeployment_df, "Action").astype(str) == "Retain").sum()) if not redeployment_df.empty else 0
    return pd.DataFrame([
        {"Category": "Capacity", "Metric": "Current Hours / Week", "Value": round(total_curr, 1),
         "Interpretation": "Baseline weekly capacity represented by the role"},
        {"Category": "Capacity", "Metric": "Future Hours / Week", "Value": round(total_fut, 1),
         "Interpretation": "Projected effort after redesign"},
        {"Category": "Capacity", "Metric": "Hours Released", "Value": round(released, 1),
         "Interpretation": "Capacity available for higher-value work"},
        {"Category": "Automation", "Metric": "Automation Opportunity %",
         "Value": round(released / total_curr * 100, 1) if total_curr else 0,
         "Interpretation": "Share of role capacity that can be shifted"},
        {"Category": "Portfolio", "Metric": "Tasks to Automate", "Value": auto_tasks,
         "Interpretation": "Straight-through or exception-based handling"},
        {"Category": "Portfolio", "Metric": "Tasks to Augment", "Value": augm_tasks,
         "Interpretation": "AI-assisted human workflow"},
        {"Category": "Portfolio", "Metric": "Tasks to Redesign", "Value": rede_tasks,
         "Interpretation": "Bundled into new operating rhythms"},
        {"Category": "Portfolio", "Metric": "Tasks to Retain", "Value": retn_tasks,
         "Interpretation": "Human-led execution maintained"},
    ])


def build_transformation_recommendations(job_df, reconstruction_df, redeployment_df):
    """Generate consulting-grade text recommendations."""
    if job_df.empty or reconstruction_df.empty:
        return []
    recs = []
    total_curr = pd.to_numeric(get_series(job_df, "Est Hours/Week"), errors="coerce").fillna(0).sum()
    total_fut = pd.to_numeric(get_series(reconstruction_df, "Future Hrs"), errors="coerce").fillna(0).sum()
    released_pct = ((total_curr - total_fut) / total_curr * 100) if total_curr else 0

    # Workstream priority
    rollup = build_reconstruction_rollup(reconstruction_df)
    if not rollup.empty:
        top = rollup.iloc[0]
        recs.append(f"Prioritize the {top['Workstream']} workstream first — it releases the most capacity at {top['Released %']}%.")

    # Transformation intensity
    if released_pct >= 25:
        recs.append("This role is a strong candidate for meaningful capacity redeployment into business partnering, controls, and higher-judgment analysis.")
    elif released_pct >= 15:
        recs.append("This role supports targeted redesign rather than full restructuring. Start with AI-assisted workflows and manager enablement.")
    else:
        recs.append("Transformation upside is moderate. Focus on selective copilots and process standardization.")

    # Action recommendations
    if not redeployment_df.empty:
        ac = safe_value_counts(get_series(redeployment_df, "Action"))
        if "Automate" in ac.index:
            recs.append(f"{int(ac['Automate'])} tasks are good automation candidates — define exception queues, control points, and KPIs before deployment.")
        if "Redesign" in ac.index:
            recs.append(f"{int(ac['Redesign'])} tasks warrant workflow redesign — bundle them into end-to-end operating rhythms rather than one-off point solutions.")

    # Skill protection
    curr_skills, _ = build_skill_analysis(job_df)
    if not curr_skills.empty:
        top_skill = curr_skills.iloc[0]["Skill"]
        recs.append(f"Protect and deepen {top_skill} as a core capability while shifting lower-value effort out of the role.")

    return recs


def build_work_dimensions(job_df):
    """Score each task on work-design dimensions derived from existing fields."""
    if job_df.empty:
        return pd.DataFrame()
    t = sync_work_design(job_df).copy()

    # Map existing fields to consulting dimensions
    t["Cognitive vs Manual"] = t["Logic"].map(
        {"Judgment-heavy": "Cognitive", "Probabilistic": "Mixed", "Deterministic": "Procedural"}).fillna("Mixed")
    t["Repetitive vs Variable"] = t["Task Type"].map(
        {"Repetitive": "Repetitive", "Variable": "Variable"}).fillna("Variable")
    t["Rules vs Judgment"] = t["Logic"].map(
        {"Deterministic": "Rules-based", "Probabilistic": "Mixed", "Judgment-heavy": "Judgment"}).fillna("Mixed")
    t["Independent vs Collaborative"] = t["Interaction"].map(
        {"Independent": "Independent", "Interactive": "Interactive", "Collaborative": "Collaborative"}).fillna("Interactive")
    t["Data Intensity"] = t["Task Type"].map(
        {"Repetitive": "High", "Variable": "Medium"}).fillna("Medium")
    t["Stakeholder Level"] = t["Interaction"].map(
        {"Collaborative": "High", "Interactive": "Medium", "Independent": "Low"}).fillna("Medium")

    # Automation type inference
    def infer_auto_type(r):
        logic = str(r.get("Logic", ""))
        impact = str(r.get("AI Impact", ""))
        inter = str(r.get("Interaction", ""))
        if logic == "Deterministic" and inter == "Independent":
            return "RPA"
        if impact == "High" and logic in ["Probabilistic", "Judgment-heavy"]:
            return "GenAI"
        if impact == "Moderate":
            return "ML / Analytics"
        return "None"
    t["Automation Type"] = t.apply(infer_auto_type, axis=1)

    # Criticality proxy
    t["Criticality"] = t["Logic"].map(
        {"Judgment-heavy": "High", "Probabilistic": "Medium", "Deterministic": "Low"}).fillna("Medium")

    # Value contribution proxy
    t["Value Contribution"] = t.apply(
        lambda r: "High" if str(r.get("Logic", "")) == "Judgment-heavy" and str(r.get("Interaction", "")) == "Collaborative"
        else ("Medium" if str(r.get("AI Impact", "")) in ["High", "Moderate"] else "Low"), axis=1)

    keep = ["Task Name", "Workstream", "AI Impact", "Est Hours/Week", "Current Time Spent %",
            "Cognitive vs Manual", "Repetitive vs Variable", "Rules vs Judgment",
            "Independent vs Collaborative", "Data Intensity", "Stakeholder Level",
            "Automation Type", "Criticality", "Value Contribution"]
    return t[[c for c in keep if c in t.columns]].copy()


def build_value_model(job_df, reconstruction_df, salary_assumption=95000):
    """Calculate hours saved, cost saved, productivity, and ROI."""
    if job_df.empty or reconstruction_df.empty:
        return {}
    total_curr = pd.to_numeric(get_series(job_df, "Est Hours/Week"), errors="coerce").fillna(0).sum()
    total_fut = pd.to_numeric(get_series(reconstruction_df, "Future Hrs"), errors="coerce").fillna(0).sum()
    released_hrs = total_curr - total_fut
    released_pct = (released_hrs / total_curr * 100) if total_curr else 0
    weekly_hrs = 40
    annual_hrs = weekly_hrs * 48
    hourly_rate = salary_assumption / annual_hrs
    annual_saved = released_hrs * 48
    cost_saved = round(annual_saved * hourly_rate, 0)
    productivity_gain = round(released_pct, 1)
    # Simple ROI: cost saved vs assumed implementation cost
    impl_cost = salary_assumption * 0.3  # ~30% of salary as implementation proxy
    roi = round((cost_saved - impl_cost) / impl_cost * 100, 0) if impl_cost else 0
    payback_months = round(impl_cost / (cost_saved / 12), 1) if cost_saved > 0 else 0
    return {
        "Hours Saved / Week": round(released_hrs, 1),
        "Hours Saved / Year": round(annual_saved, 0),
        "Cost Saved / Year": f"${cost_saved:,.0f}",
        "Productivity Gain %": f"{productivity_gain}%",
        "Est. Implementation Cost": f"${impl_cost:,.0f}",
        "ROI %": f"{roi}%",
        "Payback (months)": payback_months,
        "Hourly Rate Assumed": f"${hourly_rate:,.0f}",
    }


def build_role_evolution(job_df, reconstruction_df, redeployment_df):
    """Classify how the role evolves post-transformation."""
    if job_df.empty or reconstruction_df.empty:
        return "Unknown", []

    total_curr = pd.to_numeric(get_series(job_df, "Est Hours/Week"), errors="coerce").fillna(0).sum()
    total_fut = pd.to_numeric(get_series(reconstruction_df, "Future Hrs"), errors="coerce").fillna(0).sum()
    released_pct = ((total_curr - total_fut) / total_curr * 100) if total_curr else 0

    auto_count = 0
    retain_count = 0
    if not redeployment_df.empty and "Action" in redeployment_df.columns:
        auto_count = int((redeployment_df["Action"] == "Automate").sum())
        retain_count = int((redeployment_df["Action"] == "Retain").sum())
    total_tasks = len(reconstruction_df)

    if released_pct >= 50 and auto_count > total_tasks * 0.5:
        evolution = "Role Eliminated / Merged"
        details = [
            "Over 50% of role capacity is automatable.",
            "Consider merging residual tasks into adjacent roles.",
            "Reskilling pathways should be identified for impacted employees.",
        ]
    elif released_pct >= 30:
        evolution = "Role Split / Restructured"
        details = [
            "Significant capacity release suggests the role should split.",
            "Automated tasks form one workflow; human-judgment tasks form another.",
            "New role archetypes: AI Operations Analyst + Business Partner.",
        ]
    elif released_pct >= 15:
        evolution = "Same Role, Upgraded"
        details = [
            "The role retains its identity but shifts toward higher-value activities.",
            "AI copilots augment daily workflows without restructuring.",
            "Invest in upskilling: data interpretation, stakeholder communication, exception management.",
        ]
    else:
        evolution = "Minimal Change"
        details = [
            "Limited automation opportunity at current task definitions.",
            "Focus on process standardization before pursuing automation.",
            "Consider whether task granularity is sufficient for deeper analysis.",
        ]

    return evolution, details


def build_capacity_waterfall_data(reconstruction_df):
    """Compute waterfall segments for the capacity chart."""
    if reconstruction_df.empty or "Action" not in reconstruction_df.columns:
        return 0, 0, 0, 0, 0

    curr = pd.to_numeric(get_series(reconstruction_df, "Current Hrs"), errors="coerce").fillna(0).sum()
    by_action = reconstruction_df.groupby("Action", as_index=False)["Released Hrs"].sum()
    saved_auto = float(by_action.loc[by_action["Action"] == "Automate", "Released Hrs"].sum())
    saved_augment = float(by_action.loc[by_action["Action"].isin(["Augment", "Redesign"]), "Released Hrs"].sum())
    saved_other = float(by_action.loc[by_action["Action"] == "Retain", "Released Hrs"].sum())
    # Assume 80% of released capacity is redeployed to higher-value work
    total_released = saved_auto + saved_augment + saved_other
    redeployed = round(total_released * 0.8, 2)
    return round(curr, 2), round(saved_auto, 2), round(saved_augment, 2), round(saved_other, 2), redeployed


# ═══════════════════════════════════════════════════════════════════════
# OPERATING MODEL ANALYSIS
# ═══════════════════════════════════════════════════════════════════════

PILLAR_ORDER = ["People", "Process", "Technology", "Data", "Governance", "Culture"]


def _clean_text(series, default="Unspecified"):
    s = series.fillna("").astype(str).str.strip()
    return s.replace({"": default, "nan": default, "None": default})


def _normalize_scope(series):
    s = _clean_text(series, "Local")
    def _map(v):
        x = str(v).lower()
        if any(k in x for k in ["global", "enterprise", "firm", "all"]):
            return "Global"
        if any(k in x for k in ["regional", "region", "emea", "apac", "americas"]):
            return "Regional"
        return "Local"
    return s.map(_map)


def _normalize_service_model(op_df):
    if op_df.empty:
        return pd.Series(dtype="object")
    base = _clean_text(get_series(op_df, "Description"), "") + " " + _clean_text(get_series(op_df, "Owner"), "")
    layer = _clean_text(get_series(op_df, "Layer"), "")
    func = _clean_text(get_series(op_df, "Function ID"), "")
    def _label(i):
        txt = f"{base.iloc[i]} {layer.iloc[i]} {func.iloc[i]}".lower()
        if any(k in txt for k in ["shared", "centre of excellence", "center of excellence", "coe", "platform", "enterprise service"]):
            return "Shared Service"
        if any(k in txt for k in ["embedded", "front office", "business partner", "deal team", "portfolio team"]):
            return "Embedded"
        l = layer.iloc[i].lower()
        f_ = func.iloc[i].lower()
        if any(k in l for k in ["enterprise", "platform", "shared"]) or any(k in f_ for k in ["finance", "hr", "people", "legal", "technology", "data", "it", "operations", "risk", "compliance"]):
            return "Shared Service"
        return "Embedded"
    return pd.Series([_label(i) for i in range(len(op_df))], index=op_df.index)


def build_operating_model_analysis(data):
    """Build all operating model analysis frames from the data bundle."""
    op_df = data.get("operating_model", pd.DataFrame()).copy()
    wd_df = data.get("work_design", pd.DataFrame()).copy()
    ch_df = data.get("change_management", pd.DataFrame()).copy()
    org_df = data.get("org_design", pd.DataFrame()).copy()

    # ── Structure ──
    structure_rows = []
    if not op_df.empty:
        t = op_df.copy()
        t["Layer"] = _clean_text(get_series(t, "Layer"), "Unspecified")
        t["Function"] = _clean_text(get_series(t, "Function ID"), "Unspecified")
        cap_cols = [c for c in ["Level 4", "Level 3", "Level 2", "Level 1", "Description", "Sub-Family", "Job Family"] if c in t.columns]
        if cap_cols:
            cap = _clean_text(get_series(t, cap_cols[0]), "Capability")
            for c in cap_cols[1:]:
                nxt = _clean_text(get_series(t, c), "")
                cap = cap.where(cap != "Capability", nxt)
            t["Capability"] = cap.replace("", "Capability")
        else:
            t["Capability"] = "Capability"
        t["Service Model"] = _normalize_service_model(t)
        t["Scope"] = _normalize_scope(get_series(t, "Scope"))
        t["HC"] = 1
        if not org_df.empty and "Function ID" in org_df.columns:
            hc_map = org_df.groupby(_clean_text(get_series(org_df, "Function ID"), "Unspecified")).size().to_dict()
            t["HC"] = t["Function"].map(hc_map).fillna(1).astype(int)
        t["Centralization"] = t["Service Model"].map({"Shared Service": "More Centralized", "Embedded": "More Decentralized"}).fillna("Balanced")
        t["Implication"] = t["Service Model"].map({"Shared Service": "Scale, consistency, lower duplication", "Embedded": "Closer business intimacy, faster local response"}).fillna("Mixed model")
        structure_df = t.groupby(["Layer", "Function", "Capability", "Service Model", "Scope", "Centralization", "Implication"], as_index=False)["HC"].sum()
    else:
        structure_df = pd.DataFrame(columns=["Layer", "Function", "Capability", "Service Model", "Scope", "HC", "Centralization", "Implication"])

    # ── Workflow ──
    workflow_edges = []
    if not wd_df.empty:
        w = sync_work_design(wd_df.copy())
        if "Workstream" not in w.columns:
            w["Workstream"] = "General Workflow"
        ws_order = w.groupby("Workstream", as_index=False)["Current Time Spent %"].sum().sort_values("Current Time Spent %", ascending=False)
        ordered = ws_order["Workstream"].astype(str).tolist()
        for i in range(len(ordered) - 1):
            vol = float(pd.to_numeric(w.loc[_clean_text(get_series(w, "Workstream")) == ordered[i], "Current Time Spent %"], errors="coerce").fillna(0).sum())
            workflow_edges.append({"Source": ordered[i], "Target": ordered[i + 1], "Volume": max(round(vol, 1), 1)})
    workflow_df = pd.DataFrame(workflow_edges) if workflow_edges else pd.DataFrame(columns=["Source", "Target", "Volume"])

    # ── Decision Rights ──
    decision_rows = []
    if not op_df.empty:
        owner = _clean_text(get_series(op_df, "Owner"), "Unassigned")
        cap_cols = [c for c in ["Level 4", "Level 3", "Description"] if c in op_df.columns]
        cap = _clean_text(get_series(op_df, cap_cols[0]), "Decision") if cap_cols else pd.Series(["Decision"] * len(op_df), index=op_df.index)
        decision_df = pd.DataFrame({
            "Decision": cap, "Owner": owner,
            "Service Model": _normalize_service_model(op_df),
            "Scope": _normalize_scope(get_series(op_df, "Scope")),
        }).drop_duplicates()
        decision_df["Centralization"] = decision_df["Service Model"].map({"Shared Service": "Centralized", "Embedded": "Decentralized"}).fillna("Balanced")
    else:
        decision_df = pd.DataFrame(columns=["Decision", "Owner", "Service Model", "Scope", "Centralization"])

    # ── Maturity ──
    wd_sync = sync_work_design(wd_df.copy()) if not wd_df.empty else pd.DataFrame()
    total_loaded = sum(1 for x in [op_df, wd_df, ch_df, org_df] if not x.empty)
    shared_share = float(structure_df.loc[structure_df["Service Model"] == "Shared Service", "HC"].sum() / max(structure_df["HC"].sum(), 1)) if not structure_df.empty else 0
    high_ai_pct = float(pd.to_numeric(wd_sync.loc[_clean_text(get_series(wd_sync, "AI Impact"), "") == "High", "Current Time Spent %"], errors="coerce").fillna(0).sum()) if not wd_sync.empty else 0
    repetitive_pct = float(pd.to_numeric(wd_sync.loc[_clean_text(get_series(wd_sync, "Task Type"), "") == "Repetitive", "Current Time Spent %"], errors="coerce").fillna(0).sum()) if not wd_sync.empty else 0
    deterministic_pct = float(pd.to_numeric(wd_sync.loc[_clean_text(get_series(wd_sync, "Logic"), "") == "Deterministic", "Current Time Spent %"], errors="coerce").fillna(0).sum()) if not wd_sync.empty else 0
    change_count = len(ch_df)
    global_share = float(structure_df.loc[structure_df["Scope"] == "Global", "HC"].sum() / max(structure_df["HC"].sum(), 1)) if not structure_df.empty else 0

    maturity_rows = [
        {"Pillar": "People", "Current": min(5, max(1, 1 + (1 if not org_df.empty else 0) + (1 if not wd_df.empty else 0) + (1 if change_count >= 5 else 0)))},
        {"Pillar": "Process", "Current": min(5, max(1, 1 + round(repetitive_pct / 25) + round(deterministic_pct / 35)))},
        {"Pillar": "Technology", "Current": min(5, max(1, 1 + (1 if not wd_df.empty else 0) + round(high_ai_pct / 20)))},
        {"Pillar": "Data", "Current": min(5, max(1, 1 + total_loaded + (1 if len(wd_df) >= 20 else 0)))},
        {"Pillar": "Governance", "Current": min(5, max(1, 1 + (1 if not op_df.empty else 0) + (1 if change_count > 0 else 0) + (1 if shared_share >= 0.4 else 0)))},
        {"Pillar": "Culture", "Current": min(5, max(1, 1 + (1 if change_count > 0 else 0) + (1 if high_ai_pct >= 15 else 0)))},
    ]
    for row in maturity_rows:
        c = row["Current"]
        p = row["Pillar"]
        lift = 0
        if p in ["Process", "Technology", "Data"] and high_ai_pct >= 10:
            lift += 1
        if p in ["Governance", "Culture"] and change_count >= 3:
            lift += 1
        if p == "People" and not org_df.empty and len(org_df) >= 10:
            lift += 1
        if p in ["Governance", "Data"] and global_share >= 0.4:
            lift += 1
        row["Future"] = min(5, c + lift)
        row["Lift"] = row["Future"] - row["Current"]

    # ── Insights ──
    insights = []
    if maturity_rows:
        top_lift = max(maturity_rows, key=lambda r: r["Lift"])
        if top_lift["Lift"] > 0:
            insights.append(f"{top_lift['Pillar']} has the largest future-state lift at +{top_lift['Lift']} maturity points.")
    if not structure_df.empty:
        shared = int(structure_df.loc[structure_df["Service Model"] == "Shared Service", "HC"].sum())
        embedded = int(structure_df.loc[structure_df["Service Model"] == "Embedded", "HC"].sum())
        dominant = "shared services" if shared >= embedded else "embedded teams"
        insights.append(f"Current structure leans toward {dominant} ({shared} shared vs {embedded} embedded HC).")
        scopes = structure_df.groupby("Scope", as_index=False)["HC"].sum().sort_values("HC", ascending=False)
        if not scopes.empty:
            insights.append(f"{scopes.iloc[0]['Scope']} scope has the greatest footprint.")
    lagging = [r["Pillar"] for r in maturity_rows if r["Current"] <= 2]
    if lagging:
        insights.append(f"Foundational work needed in: {', '.join(lagging)}.")

    # ── KPIs ──
    kpis = {
        "capabilities": int(len(structure_df)),
        "layers": int(structure_df["Layer"].nunique()) if not structure_df.empty else 0,
        "shared_pct": round(shared_share * 100, 1),
        "avg_maturity": round(sum(r["Current"] for r in maturity_rows) / len(maturity_rows), 1) if maturity_rows else 0,
        "avg_future": round(sum(r["Future"] for r in maturity_rows) / len(maturity_rows), 1) if maturity_rows else 0,
        "avg_lift": round(sum(r["Lift"] for r in maturity_rows) / len(maturity_rows), 1) if maturity_rows else 0,
        "decisions": int(len(decision_df)),
        "workflow_stages": int(len(set(workflow_df["Source"].tolist() + workflow_df["Target"].tolist()))) if not workflow_df.empty else 0,
    }

    # ── Layer breakdown for chart ──
    layer_agg = []
    if not structure_df.empty:
        la = structure_df.groupby("Layer", as_index=False)["HC"].sum().sort_values("HC", ascending=False)
        layer_agg = [{"Layer": str(r["Layer"]), "HC": int(r["HC"])} for _, r in la.iterrows()]

    # ── Service model split ──
    service_split = []
    if not structure_df.empty:
        ss = structure_df.groupby(["Function", "Service Model"], as_index=False)["HC"].sum()
        service_split = [{"Function": str(r["Function"]), "Service Model": str(r["Service Model"]), "HC": int(r["HC"])} for _, r in ss.iterrows()]

    # ── Scope distribution ──
    scope_dist = []
    if not structure_df.empty:
        sd = structure_df.groupby("Scope", as_index=False)["HC"].sum()
        scope_dist = [{"Scope": str(r["Scope"]), "HC": int(r["HC"])} for _, r in sd.iterrows()]

    # ── Decision owner load ──
    decision_load = []
    if not decision_df.empty:
        dl = decision_df.groupby("Owner", as_index=False).size().rename(columns={"size": "Decisions"}).sort_values("Decisions", ascending=False)
        decision_load = [{"Owner": str(r["Owner"]), "Decisions": int(r["Decisions"])} for _, r in dl.iterrows()]

    # ── Workflow stage throughput ──
    stage_throughput = []
    if not workflow_df.empty:
        st = workflow_df.groupby("Source", as_index=False)["Volume"].sum().sort_values("Volume", ascending=False)
        stage_throughput = [{"Stage": str(r["Source"]), "Volume": round(float(r["Volume"]), 1)} for _, r in st.iterrows()]

    return {
        "kpis": kpis,
        "maturity": maturity_rows,
        "structure": [r.to_dict() for _, r in structure_df.iterrows()] if not structure_df.empty else [],
        "workflow": [r.to_dict() for _, r in workflow_df.iterrows()] if not workflow_df.empty else [],
        "decisions": [r.to_dict() for _, r in decision_df.iterrows()] if not decision_df.empty else [],
        "insights": insights,
        "layer_agg": layer_agg,
        "service_split": service_split,
        "scope_dist": scope_dist,
        "decision_load": decision_load,
        "stage_throughput": stage_throughput,
    }


# ═══════════════════════════════════════════════════════════════════════
# COMPENSATION ANALYSIS
# ═══════════════════════════════════════════════════════════════════════

def build_compensation_analysis(data):
    """Analyze compensation positioning against market benchmarks."""
    wf = data.get("workforce", pd.DataFrame())
    mk = data.get("market_data", pd.DataFrame())
    jc = data.get("job_catalog", pd.DataFrame())

    if wf.empty and mk.empty:
        return {"kpis": {}, "positioning": [], "by_function": [], "by_level": [], "pay_ranges": [], "insights": []}

    # Match workforce to market data by Job Title
    matched = []
    if not wf.empty and not mk.empty and "Base Pay" in wf.columns:
        wf_agg = wf.copy()
        wf_agg["Base Pay"] = pd.to_numeric(get_series(wf_agg, "Base Pay"), errors="coerce").fillna(0)
        wf_agg["Total Cash"] = pd.to_numeric(get_series(wf_agg, "Total Cash"), errors="coerce").fillna(0)

        # Build match on Job Title → Survey Job Title
        for _, emp in wf_agg.iterrows():
            title = str(emp.get("Job Title", "")).strip()
            func = str(emp.get("Function ID", "")).strip()
            level = str(emp.get("Career Level", "")).strip()
            base = float(emp.get("Base Pay", 0))
            tcc = float(emp.get("Total Cash", 0))
            if base <= 0:
                continue

            # Find market match
            mk_match = mk[get_series(mk, "Survey Job Title").astype(str).str.strip() == title]
            if mk_match.empty:
                mk_match = mk[get_series(mk, "Job Match Key").astype(str).str.contains(title, case=False, na=False)]
            if mk_match.empty:
                continue

            row = mk_match.iloc[0]
            b25 = float(pd.to_numeric(row.get("Base 25th", 0), errors="coerce") or 0)
            b50 = float(pd.to_numeric(row.get("Base 50th", 0), errors="coerce") or 0)
            b75 = float(pd.to_numeric(row.get("Base 75th", 0), errors="coerce") or 0)

            if b50 <= 0:
                continue

            comp_ratio = round(base / b50 * 100, 1)
            if base <= b25:
                position = "Below P25"
            elif base <= b50:
                position = "P25-P50"
            elif base <= b75:
                position = "P50-P75"
            else:
                position = "Above P75"

            matched.append({
                "Employee": str(emp.get("Employee Name", "")),
                "Job Title": title,
                "Function": func,
                "Career Level": level,
                "Base Pay": int(base),
                "Market P25": int(b25),
                "Market P50": int(b50),
                "Market P75": int(b75),
                "Comp Ratio": comp_ratio,
                "Position": position,
            })

    matched_df = pd.DataFrame(matched) if matched else pd.DataFrame()

    # KPIs
    kpis = {
        "matched_employees": int(len(matched_df)),
        "total_employees": int(len(wf)),
        "market_benchmarks": int(len(mk)),
        "avg_comp_ratio": round(float(matched_df["Comp Ratio"].mean()), 1) if not matched_df.empty else 0,
        "below_market": int((matched_df["Comp Ratio"] < 90).sum()) if not matched_df.empty else 0,
        "above_market": int((matched_df["Comp Ratio"] > 110).sum()) if not matched_df.empty else 0,
    }

    # Positioning distribution
    positioning = []
    if not matched_df.empty:
        pc = matched_df["Position"].value_counts()
        positioning = [{"Position": str(k), "Count": int(v)} for k, v in pc.items()]

    # By function
    by_function = []
    if not matched_df.empty and "Function" in matched_df.columns:
        fg = matched_df.groupby("Function", as_index=False).agg({"Comp Ratio": "mean", "Base Pay": "mean", "Employee": "count"})
        fg = fg.rename(columns={"Employee": "Employees", "Base Pay": "Avg Base Pay"})
        fg["Comp Ratio"] = fg["Comp Ratio"].round(1)
        fg["Avg Base Pay"] = fg["Avg Base Pay"].round(0).astype(int)
        by_function = [r.to_dict() for _, r in fg.sort_values("Comp Ratio", ascending=False).iterrows()]

    # By level
    by_level = []
    if not matched_df.empty and "Career Level" in matched_df.columns:
        lg = matched_df.groupby("Career Level", as_index=False).agg({"Comp Ratio": "mean", "Base Pay": "mean", "Employee": "count"})
        lg = lg.rename(columns={"Employee": "Employees", "Base Pay": "Avg Base Pay"})
        lg["Comp Ratio"] = lg["Comp Ratio"].round(1)
        lg["Avg Base Pay"] = lg["Avg Base Pay"].round(0).astype(int)
        by_level = [r.to_dict() for _, r in lg.sort_values("Career Level").iterrows()]

    # Pay ranges (market data summary by function)
    pay_ranges = []
    if not mk.empty:
        for col in ["Base 25th", "Base 50th", "Base 75th"]:
            if col in mk.columns:
                mk[col] = pd.to_numeric(mk[col], errors="coerce").fillna(0)
        pr = mk.groupby("Function ID", as_index=False).agg({"Base 25th": "mean", "Base 50th": "mean", "Base 75th": "mean", "Survey Job Title": "count"})
        pr = pr.rename(columns={"Function ID": "Function", "Survey Job Title": "Roles"})
        for c in ["Base 25th", "Base 50th", "Base 75th"]:
            pr[c] = pr[c].round(0).astype(int)
        pay_ranges = [r.to_dict() for _, r in pr.sort_values("Base 50th", ascending=False).iterrows()]

    # Insights
    insights = []
    if kpis["avg_comp_ratio"] > 0:
        if kpis["avg_comp_ratio"] < 95:
            insights.append(f"Average comp ratio is {kpis['avg_comp_ratio']}% — the organization pays below market median. Retention risk is elevated.")
        elif kpis["avg_comp_ratio"] > 105:
            insights.append(f"Average comp ratio is {kpis['avg_comp_ratio']}% — the organization pays above market. Cost optimization opportunity exists.")
        else:
            insights.append(f"Average comp ratio is {kpis['avg_comp_ratio']}% — competitive with market median.")
    if kpis["below_market"] > 0:
        insights.append(f"{kpis['below_market']} employees are below 90% comp ratio — flagged for retention risk review.")
    if kpis["above_market"] > 0:
        insights.append(f"{kpis['above_market']} employees are above 110% comp ratio — review for role scope alignment.")
    if by_function:
        lowest = min(by_function, key=lambda x: x.get("Comp Ratio", 100))
        insights.append(f"{lowest['Function']} has the lowest avg comp ratio at {lowest['Comp Ratio']}% — prioritize for market adjustment.")

    # Detail table (top mismatches)
    detail = []
    if not matched_df.empty:
        detail = [r.to_dict() for _, r in matched_df.sort_values("Comp Ratio").head(100).iterrows()]

    return {
        "kpis": kpis,
        "positioning": positioning,
        "by_function": by_function,
        "by_level": by_level,
        "pay_ranges": pay_ranges,
        "insights": insights,
        "detail": detail,
    }


# Singleton
store = DataStore()
