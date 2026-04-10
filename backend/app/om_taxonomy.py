"""Operating Model Taxonomy Registry — universal + industry-specific functions.

Covers every major industry. Three layers:
1. UNIVERSAL_FUNCTIONS — 10 corporate functions every company has
2. INDUSTRY_MODULES — 14 industry overlays that add/modify functions
3. build_taxonomy() — merges layers + user customizations
"""

import difflib
from typing import Optional

# ═══════════════════════════════════════════════════════════════
# LAYER 1: UNIVERSAL FUNCTIONS (every company)
# ═══════════════════════════════════════════════════════════════

UNIVERSAL_FUNCTIONS = {
    "finance": {
        "label": "Finance & Accounting", "icon": "💰",
        "units": [
            {"id": "fin_001", "name": "Treasury Operations", "layer": "Core"},
            {"id": "fin_002", "name": "FP&A CoE", "layer": "Core"},
            {"id": "fin_003", "name": "Shared Services (AP/AR/GL)", "layer": "Shared Services"},
            {"id": "fin_004", "name": "Tax Operations", "layer": "Core"},
            {"id": "fin_005", "name": "Controllership", "layer": "Governance"},
            {"id": "fin_006", "name": "Internal Audit", "layer": "Governance"},
            {"id": "fin_007", "name": "Investor Relations", "layer": "Interface"},
            {"id": "fin_008", "name": "Financial Reporting", "layer": "Core"},
        ],
    },
    "hr": {
        "label": "HR / People", "icon": "👥",
        "units": [
            {"id": "hr_001", "name": "HR Shared Services (Tier 1/2/3)", "layer": "Shared Services"},
            {"id": "hr_002", "name": "Talent Acquisition CoE", "layer": "Core"},
            {"id": "hr_003", "name": "Total Rewards CoE", "layer": "Core"},
            {"id": "hr_004", "name": "HR Business Partners", "layer": "Interface"},
            {"id": "hr_005", "name": "People Analytics", "layer": "Enabling"},
            {"id": "hr_006", "name": "Learning & Development", "layer": "Enabling"},
            {"id": "hr_007", "name": "Employee Relations", "layer": "Core"},
            {"id": "hr_008", "name": "HRIS / Workforce Technology", "layer": "Enabling"},
            {"id": "hr_009", "name": "DEI", "layer": "Governance"},
            {"id": "hr_010", "name": "Workforce Planning", "layer": "Core"},
        ],
    },
    "technology": {
        "label": "IT / Technology", "icon": "💻",
        "units": [
            {"id": "it_001", "name": "IT Operations Center (ITOC)", "layer": "Core"},
            {"id": "it_002", "name": "Infrastructure & Cloud Ops", "layer": "Core"},
            {"id": "it_003", "name": "Application Development", "layer": "Core"},
            {"id": "it_004", "name": "Enterprise Architecture", "layer": "Governance"},
            {"id": "it_005", "name": "SOC / Cybersecurity", "layer": "Core"},
            {"id": "it_006", "name": "Service Desk", "layer": "Shared Services"},
            {"id": "it_007", "name": "Data Engineering / Platform", "layer": "Enabling"},
            {"id": "it_008", "name": "IT Governance / PMO", "layer": "Governance"},
            {"id": "it_009", "name": "AI/ML Engineering", "layer": "Enabling"},
            {"id": "it_010", "name": "DevOps / SRE", "layer": "Core"},
        ],
    },
    "legal": {
        "label": "Legal", "icon": "⚖️",
        "units": [
            {"id": "leg_001", "name": "Corporate Secretary", "layer": "Governance"},
            {"id": "leg_002", "name": "Litigation", "layer": "Core"},
            {"id": "leg_003", "name": "Contracts & Commercial", "layer": "Core"},
            {"id": "leg_004", "name": "Regulatory & Compliance", "layer": "Governance"},
            {"id": "leg_005", "name": "Intellectual Property", "layer": "Core"},
            {"id": "leg_006", "name": "Employment Law", "layer": "Core"},
            {"id": "leg_007", "name": "Privacy / Data Protection", "layer": "Governance"},
            {"id": "leg_008", "name": "Outside Counsel Management", "layer": "Enabling"},
            {"id": "leg_009", "name": "Government Affairs", "layer": "Interface"},
        ],
    },
    "operations": {
        "label": "Operations", "icon": "⚙️",
        "units": [
            {"id": "ops_001", "name": "Procurement / Strategic Sourcing", "layer": "Core"},
            {"id": "ops_002", "name": "Quality Management", "layer": "Core"},
            {"id": "ops_003", "name": "Facilities / Real Estate", "layer": "Shared Services"},
            {"id": "ops_004", "name": "Business Continuity", "layer": "Governance"},
            {"id": "ops_005", "name": "Process Excellence", "layer": "Enabling"},
            {"id": "ops_006", "name": "Vendor Management", "layer": "Core"},
            {"id": "ops_007", "name": "EHS (Environment Health Safety)", "layer": "Governance"},
        ],
    },
    "sales": {
        "label": "Sales / Commercial", "icon": "📈",
        "units": [
            {"id": "sal_001", "name": "Revenue Operations", "layer": "Enabling"},
            {"id": "sal_002", "name": "Sales Enablement", "layer": "Enabling"},
            {"id": "sal_003", "name": "Channel Management", "layer": "Core"},
            {"id": "sal_004", "name": "Customer Success", "layer": "Core"},
            {"id": "sal_005", "name": "Pricing & Deal Desk", "layer": "Core"},
            {"id": "sal_006", "name": "Sales Analytics", "layer": "Enabling"},
            {"id": "sal_007", "name": "Territory Planning", "layer": "Core"},
            {"id": "sal_008", "name": "Key Account Management", "layer": "Interface"},
        ],
    },
    "marketing": {
        "label": "Marketing", "icon": "📣",
        "units": [
            {"id": "mkt_001", "name": "Brand & Creative", "layer": "Core"},
            {"id": "mkt_002", "name": "Demand Generation", "layer": "Core"},
            {"id": "mkt_003", "name": "Product Marketing", "layer": "Core"},
            {"id": "mkt_004", "name": "Marketing Operations", "layer": "Enabling"},
            {"id": "mkt_005", "name": "Digital / Performance Marketing", "layer": "Core"},
            {"id": "mkt_006", "name": "Content Strategy", "layer": "Core"},
            {"id": "mkt_007", "name": "Customer Insights", "layer": "Enabling"},
            {"id": "mkt_008", "name": "Public Relations", "layer": "Interface"},
            {"id": "mkt_009", "name": "Analyst Relations", "layer": "Interface"},
        ],
    },
    "risk": {
        "label": "Risk & Compliance", "icon": "🛡️",
        "units": [
            {"id": "rsk_001", "name": "Enterprise Risk Management", "layer": "Governance"},
            {"id": "rsk_002", "name": "Operational Risk", "layer": "Governance"},
            {"id": "rsk_003", "name": "Regulatory Compliance", "layer": "Governance"},
            {"id": "rsk_004", "name": "Internal Controls", "layer": "Governance"},
            {"id": "rsk_005", "name": "Business Ethics", "layer": "Governance"},
            {"id": "rsk_006", "name": "Anti-Money Laundering", "layer": "Governance"},
            {"id": "rsk_007", "name": "Sanctions Compliance", "layer": "Governance"},
        ],
    },
    "strategy": {
        "label": "Corporate Strategy", "icon": "🧭",
        "units": [
            {"id": "str_001", "name": "Strategic Planning", "layer": "Governance"},
            {"id": "str_002", "name": "Corporate Development / M&A", "layer": "Core"},
            {"id": "str_003", "name": "Business Intelligence", "layer": "Enabling"},
            {"id": "str_004", "name": "Competitive Intelligence", "layer": "Enabling"},
            {"id": "str_005", "name": "Innovation Lab", "layer": "Enabling"},
        ],
    },
    "communications": {
        "label": "Communications", "icon": "📢",
        "units": [
            {"id": "com_001", "name": "Internal Communications", "layer": "Core"},
            {"id": "com_002", "name": "External / Corporate Communications", "layer": "Interface"},
            {"id": "com_003", "name": "Executive Communications", "layer": "Core"},
            {"id": "com_004", "name": "Crisis Communications", "layer": "Governance"},
            {"id": "com_005", "name": "Employer Branding", "layer": "Interface"},
        ],
    },
}


# ═══════════════════════════════════════════════════════════════
# LAYER 2: INDUSTRY-SPECIFIC MODULES
# ═══════════════════════════════════════════════════════════════

INDUSTRY_MODULES = {
    "cpg": {
        "label": "Consumer Products / CPG", "icon": "🧴", "examples": "P&G, Unilever, Nestlé",
        "functions": {
            "rd_cpg": {"label": "R&D / Product Development", "icon": "🔬", "units": [
                {"id": "cpg_rd_001", "name": "Product Innovation", "layer": "Core"},
                {"id": "cpg_rd_002", "name": "Formulation", "layer": "Core"},
                {"id": "cpg_rd_003", "name": "Packaging Development", "layer": "Core"},
                {"id": "cpg_rd_004", "name": "Clinical / Safety Testing", "layer": "Governance"},
                {"id": "cpg_rd_005", "name": "Consumer Research", "layer": "Enabling"},
            ]},
            "supply_chain_cpg": {"label": "Supply Chain", "icon": "🚛", "units": [
                {"id": "cpg_sc_001", "name": "Demand Planning", "layer": "Core"},
                {"id": "cpg_sc_002", "name": "Manufacturing Operations", "layer": "Core"},
                {"id": "cpg_sc_003", "name": "Distribution / Logistics", "layer": "Core"},
                {"id": "cpg_sc_004", "name": "Inventory Management", "layer": "Core"},
                {"id": "cpg_sc_005", "name": "Contract Manufacturing", "layer": "Enabling"},
            ]},
            "brand_mgmt": {"label": "Brand Management", "icon": "✨", "units": [
                {"id": "cpg_br_001", "name": "Brand Strategy", "layer": "Core"},
                {"id": "cpg_br_002", "name": "Category Management", "layer": "Core"},
                {"id": "cpg_br_003", "name": "Trade Marketing", "layer": "Core"},
                {"id": "cpg_br_004", "name": "Shopper Insights", "layer": "Enabling"},
            ]},
            "retail_channel": {"label": "Retail / Channel", "icon": "🏪", "units": [
                {"id": "cpg_rt_001", "name": "Retail Operations", "layer": "Core"},
                {"id": "cpg_rt_002", "name": "E-commerce / DTC", "layer": "Core"},
                {"id": "cpg_rt_003", "name": "Channel Strategy", "layer": "Core"},
                {"id": "cpg_rt_004", "name": "Key Account / Retail Partnerships", "layer": "Interface"},
            ]},
        },
    },
    "finserv_am": {
        "label": "Financial Services — Asset Management", "icon": "🏦", "examples": "Sixth Street, Blackstone, Apollo",
        "functions": {
            "investment_mgmt": {"label": "Investment Management", "icon": "📊", "units": [
                {"id": "am_im_001", "name": "Direct Lending", "layer": "Core"},
                {"id": "am_im_002", "name": "Opportunistic Credit", "layer": "Core"},
                {"id": "am_im_003", "name": "Growth Equity", "layer": "Core"},
                {"id": "am_im_004", "name": "Infrastructure Investing", "layer": "Core"},
                {"id": "am_im_005", "name": "Real Estate Investing", "layer": "Core"},
                {"id": "am_im_006", "name": "Special Situations", "layer": "Core"},
                {"id": "am_im_007", "name": "Structured Credit", "layer": "Core"},
            ]},
            "portfolio_ops": {"label": "Portfolio Operations", "icon": "📋", "units": [
                {"id": "am_po_001", "name": "Portfolio Monitoring", "layer": "Core"},
                {"id": "am_po_002", "name": "Valuation (ASC 820)", "layer": "Core"},
                {"id": "am_po_003", "name": "Portfolio Construction", "layer": "Core"},
                {"id": "am_po_004", "name": "Risk Analytics", "layer": "Enabling"},
            ]},
            "fund_ops": {"label": "Fund Operations", "icon": "🏛️", "units": [
                {"id": "am_fo_001", "name": "Fund Accounting", "layer": "Core"},
                {"id": "am_fo_002", "name": "Fund Administration", "layer": "Core"},
                {"id": "am_fo_003", "name": "Capital Calls / Distributions", "layer": "Core"},
                {"id": "am_fo_004", "name": "Investor Reporting", "layer": "Interface"},
            ]},
            "cap_markets": {"label": "Capital Markets", "icon": "📈", "units": [
                {"id": "am_cm_001", "name": "Syndication", "layer": "Core"},
                {"id": "am_cm_002", "name": "Origination", "layer": "Core"},
                {"id": "am_cm_003", "name": "Capital Formation", "layer": "Core"},
                {"id": "am_cm_004", "name": "CLO Management", "layer": "Core"},
            ]},
            "compliance_am": {"label": "Compliance & Regulatory", "icon": "📜", "units": [
                {"id": "am_cr_001", "name": "SEC / Regulatory Reporting", "layer": "Governance"},
                {"id": "am_cr_002", "name": "Investment Compliance", "layer": "Governance"},
                {"id": "am_cr_003", "name": "Trade Surveillance", "layer": "Governance"},
                {"id": "am_cr_004", "name": "ESG / Responsible Investment", "layer": "Governance"},
            ]},
            "ir_am": {"label": "Investor Relations", "icon": "🤝", "units": [
                {"id": "am_ir_001", "name": "LP Relations", "layer": "Interface"},
                {"id": "am_ir_002", "name": "Fundraising", "layer": "Core"},
                {"id": "am_ir_003", "name": "Consultant Relations", "layer": "Interface"},
                {"id": "am_ir_004", "name": "RFP Management", "layer": "Core"},
            ]},
        },
    },
    "finserv_banking": {
        "label": "Financial Services — Banking", "icon": "🏧", "examples": "JPMorgan, Goldman Sachs",
        "functions": {
            "ib": {"label": "Investment Banking", "icon": "💎", "units": [
                {"id": "bk_ib_001", "name": "M&A Advisory", "layer": "Core"},
                {"id": "bk_ib_002", "name": "Equity Capital Markets", "layer": "Core"},
                {"id": "bk_ib_003", "name": "Debt Capital Markets", "layer": "Core"},
                {"id": "bk_ib_004", "name": "Restructuring", "layer": "Core"},
            ]},
            "trading": {"label": "Trading", "icon": "📉", "units": [
                {"id": "bk_tr_001", "name": "Equities", "layer": "Core"},
                {"id": "bk_tr_002", "name": "Fixed Income", "layer": "Core"},
                {"id": "bk_tr_003", "name": "Commodities", "layer": "Core"},
                {"id": "bk_tr_004", "name": "Derivatives", "layer": "Core"},
                {"id": "bk_tr_005", "name": "Electronic Trading", "layer": "Enabling"},
            ]},
            "wealth": {"label": "Wealth Management", "icon": "💼", "units": [
                {"id": "bk_wm_001", "name": "Private Banking", "layer": "Core"},
                {"id": "bk_wm_002", "name": "Financial Advisory", "layer": "Core"},
                {"id": "bk_wm_003", "name": "Trust & Estate", "layer": "Core"},
            ]},
            "commercial_bk": {"label": "Commercial Banking", "icon": "🏢", "units": [
                {"id": "bk_cb_001", "name": "Commercial Lending", "layer": "Core"},
                {"id": "bk_cb_002", "name": "Cash Management", "layer": "Core"},
                {"id": "bk_cb_003", "name": "Trade Finance", "layer": "Core"},
            ]},
            "consumer_bk": {"label": "Consumer Banking", "icon": "🏠", "units": [
                {"id": "bk_cn_001", "name": "Retail Banking", "layer": "Core"},
                {"id": "bk_cn_002", "name": "Mortgage", "layer": "Core"},
                {"id": "bk_cn_003", "name": "Credit Card", "layer": "Core"},
                {"id": "bk_cn_004", "name": "Digital Banking", "layer": "Enabling"},
            ]},
            "treasury_svc": {"label": "Treasury Services", "icon": "🔐", "units": [
                {"id": "bk_ts_001", "name": "Payments", "layer": "Core"},
                {"id": "bk_ts_002", "name": "Clearing", "layer": "Core"},
                {"id": "bk_ts_003", "name": "Securities Services", "layer": "Core"},
            ]},
        },
    },
    "finserv_insurance": {
        "label": "Financial Services — Insurance", "icon": "🛡️", "examples": "MetLife, AIG",
        "functions": {
            "underwriting": {"label": "Underwriting", "icon": "📝", "units": [
                {"id": "ins_uw_001", "name": "Personal Lines", "layer": "Core"},
                {"id": "ins_uw_002", "name": "Commercial Lines", "layer": "Core"},
                {"id": "ins_uw_003", "name": "Specialty", "layer": "Core"},
                {"id": "ins_uw_004", "name": "Reinsurance", "layer": "Core"},
            ]},
            "claims": {"label": "Claims", "icon": "📋", "units": [
                {"id": "ins_cl_001", "name": "Claims Processing", "layer": "Core"},
                {"id": "ins_cl_002", "name": "Claims Investigation", "layer": "Core"},
                {"id": "ins_cl_003", "name": "Subrogation", "layer": "Core"},
                {"id": "ins_cl_004", "name": "Litigation Management", "layer": "Core"},
            ]},
            "actuarial": {"label": "Actuarial", "icon": "📐", "units": [
                {"id": "ins_ac_001", "name": "Pricing", "layer": "Core"},
                {"id": "ins_ac_002", "name": "Reserving", "layer": "Core"},
                {"id": "ins_ac_003", "name": "Capital Modeling", "layer": "Core"},
                {"id": "ins_ac_004", "name": "Predictive Analytics", "layer": "Enabling"},
            ]},
            "distribution_ins": {"label": "Distribution", "icon": "🌐", "units": [
                {"id": "ins_di_001", "name": "Agency Management", "layer": "Core"},
                {"id": "ins_di_002", "name": "Broker Relations", "layer": "Interface"},
                {"id": "ins_di_003", "name": "Direct / Digital", "layer": "Core"},
                {"id": "ins_di_004", "name": "Bancassurance", "layer": "Core"},
            ]},
            "policy_admin": {"label": "Policy Administration", "icon": "📄", "units": [
                {"id": "ins_pa_001", "name": "New Business", "layer": "Core"},
                {"id": "ins_pa_002", "name": "Policy Servicing", "layer": "Core"},
                {"id": "ins_pa_003", "name": "Billing", "layer": "Shared Services"},
                {"id": "ins_pa_004", "name": "Document Management", "layer": "Shared Services"},
            ]},
        },
    },
    "retail": {
        "label": "Retail / E-commerce", "icon": "🛒", "examples": "Walmart, Amazon, Nordstrom",
        "functions": {
            "store_ops": {"label": "Store Operations", "icon": "🏬", "units": [
                {"id": "ret_so_001", "name": "Store Management", "layer": "Core"},
                {"id": "ret_so_002", "name": "Visual Merchandising", "layer": "Core"},
                {"id": "ret_so_003", "name": "Loss Prevention", "layer": "Governance"},
                {"id": "ret_so_004", "name": "Store Planning", "layer": "Core"},
            ]},
            "merchandising": {"label": "Merchandising", "icon": "🏷️", "units": [
                {"id": "ret_md_001", "name": "Buying", "layer": "Core"},
                {"id": "ret_md_002", "name": "Assortment Planning", "layer": "Core"},
                {"id": "ret_md_003", "name": "Pricing & Promotions", "layer": "Core"},
                {"id": "ret_md_004", "name": "Private Label", "layer": "Core"},
            ]},
            "supply_chain_ret": {"label": "Supply Chain / Fulfillment", "icon": "📦", "units": [
                {"id": "ret_sc_001", "name": "Distribution Centers", "layer": "Core"},
                {"id": "ret_sc_002", "name": "Last Mile Delivery", "layer": "Core"},
                {"id": "ret_sc_003", "name": "Inventory Management", "layer": "Core"},
                {"id": "ret_sc_004", "name": "Returns / Reverse Logistics", "layer": "Core"},
                {"id": "ret_sc_005", "name": "Warehouse Automation", "layer": "Enabling"},
            ]},
            "ecommerce": {"label": "E-commerce / Digital", "icon": "🖥️", "units": [
                {"id": "ret_ec_001", "name": "Online Marketplace", "layer": "Core"},
                {"id": "ret_ec_002", "name": "Mobile Commerce", "layer": "Core"},
                {"id": "ret_ec_003", "name": "Digital Experience", "layer": "Core"},
                {"id": "ret_ec_004", "name": "Personalization", "layer": "Enabling"},
                {"id": "ret_ec_005", "name": "Search / Discovery", "layer": "Enabling"},
            ]},
            "cx_ret": {"label": "Customer Experience", "icon": "💬", "units": [
                {"id": "ret_cx_001", "name": "Customer Service", "layer": "Core"},
                {"id": "ret_cx_002", "name": "Loyalty Programs", "layer": "Core"},
                {"id": "ret_cx_003", "name": "CRM", "layer": "Enabling"},
                {"id": "ret_cx_004", "name": "Voice of Customer", "layer": "Enabling"},
            ]},
        },
    },
    "tech": {
        "label": "Technology", "icon": "🚀", "examples": "Amazon AWS, Google, Microsoft",
        "functions": {
            "prod_eng": {"label": "Product / Engineering", "icon": "⚡", "units": [
                {"id": "tech_pe_001", "name": "Product Management", "layer": "Core"},
                {"id": "tech_pe_002", "name": "Software Engineering", "layer": "Core"},
                {"id": "tech_pe_003", "name": "Platform Engineering", "layer": "Core"},
                {"id": "tech_pe_004", "name": "Site Reliability", "layer": "Core"},
                {"id": "tech_pe_005", "name": "QA / Testing", "layer": "Core"},
            ]},
            "cloud_infra": {"label": "Cloud / Infrastructure", "icon": "☁️", "units": [
                {"id": "tech_ci_001", "name": "Cloud Services", "layer": "Core"},
                {"id": "tech_ci_002", "name": "Data Centers", "layer": "Core"},
                {"id": "tech_ci_003", "name": "Network Operations", "layer": "Core"},
                {"id": "tech_ci_004", "name": "Edge Computing", "layer": "Core"},
            ]},
            "ai_ml": {"label": "AI / ML", "icon": "🤖", "units": [
                {"id": "tech_ai_001", "name": "AI Research", "layer": "Core"},
                {"id": "tech_ai_002", "name": "Applied ML", "layer": "Core"},
                {"id": "tech_ai_003", "name": "ML Platform", "layer": "Enabling"},
                {"id": "tech_ai_004", "name": "Data Science", "layer": "Core"},
                {"id": "tech_ai_005", "name": "AI Safety / Ethics", "layer": "Governance"},
            ]},
            "marketplace": {"label": "Marketplace / Platform", "icon": "🌐", "units": [
                {"id": "tech_mp_001", "name": "Seller / Partner Operations", "layer": "Core"},
                {"id": "tech_mp_002", "name": "Trust & Safety", "layer": "Governance"},
                {"id": "tech_mp_003", "name": "Platform Governance", "layer": "Governance"},
                {"id": "tech_mp_004", "name": "Developer Relations", "layer": "Interface"},
            ]},
            "ads": {"label": "Advertising / Monetization", "icon": "📺", "units": [
                {"id": "tech_ad_001", "name": "Ad Tech", "layer": "Enabling"},
                {"id": "tech_ad_002", "name": "Ad Operations", "layer": "Core"},
                {"id": "tech_ad_003", "name": "Advertiser Solutions", "layer": "Core"},
                {"id": "tech_ad_004", "name": "Measurement", "layer": "Enabling"},
            ]},
        },
    },
    "healthcare": {
        "label": "Healthcare / Life Sciences", "icon": "🏥", "examples": "Pfizer, UnitedHealth, HCA",
        "functions": {
            "clinical": {"label": "Clinical", "icon": "🩺", "units": [
                {"id": "hc_cl_001", "name": "Clinical Operations", "layer": "Core"},
                {"id": "hc_cl_002", "name": "Medical Affairs", "layer": "Core"},
                {"id": "hc_cl_003", "name": "Pharmacovigilance", "layer": "Governance"},
                {"id": "hc_cl_004", "name": "Clinical Development", "layer": "Core"},
                {"id": "hc_cl_005", "name": "Regulatory Affairs", "layer": "Governance"},
            ]},
            "rd_hc": {"label": "R&D", "icon": "🧬", "units": [
                {"id": "hc_rd_001", "name": "Drug Discovery", "layer": "Core"},
                {"id": "hc_rd_002", "name": "Preclinical", "layer": "Core"},
                {"id": "hc_rd_003", "name": "Biostatistics", "layer": "Enabling"},
                {"id": "hc_rd_004", "name": "Chemistry Manufacturing Controls", "layer": "Core"},
            ]},
            "commercial_hc": {"label": "Commercial / Market Access", "icon": "💊", "units": [
                {"id": "hc_cm_001", "name": "Payer Relations", "layer": "Interface"},
                {"id": "hc_cm_002", "name": "Health Economics", "layer": "Enabling"},
                {"id": "hc_cm_003", "name": "Field Medical", "layer": "Core"},
                {"id": "hc_cm_004", "name": "KOL Management", "layer": "Interface"},
            ]},
            "patient_svc": {"label": "Patient Services", "icon": "❤️", "units": [
                {"id": "hc_ps_001", "name": "Patient Access", "layer": "Core"},
                {"id": "hc_ps_002", "name": "Hub Services", "layer": "Core"},
                {"id": "hc_ps_003", "name": "Copay / Reimbursement", "layer": "Core"},
                {"id": "hc_ps_004", "name": "Nurse Support", "layer": "Core"},
            ]},
            "health_plan": {"label": "Health Plan Operations", "icon": "📋", "units": [
                {"id": "hc_hp_001", "name": "Claims Administration", "layer": "Core"},
                {"id": "hc_hp_002", "name": "Provider Network", "layer": "Core"},
                {"id": "hc_hp_003", "name": "Utilization Management", "layer": "Core"},
                {"id": "hc_hp_004", "name": "Care Management", "layer": "Core"},
                {"id": "hc_hp_005", "name": "Member Services", "layer": "Shared Services"},
            ]},
        },
    },
    "manufacturing": {
        "label": "Manufacturing / Industrial", "icon": "🏭", "examples": "Ford, GE, Caterpillar",
        "functions": {
            "mfg_ops": {"label": "Manufacturing", "icon": "🔧", "units": [
                {"id": "mfg_mo_001", "name": "Plant Operations", "layer": "Core"},
                {"id": "mfg_mo_002", "name": "Production Planning", "layer": "Core"},
                {"id": "mfg_mo_003", "name": "Lean Manufacturing", "layer": "Enabling"},
                {"id": "mfg_mo_004", "name": "Tooling", "layer": "Core"},
                {"id": "mfg_mo_005", "name": "Maintenance", "layer": "Core"},
            ]},
            "eng_mfg": {"label": "Engineering", "icon": "📐", "units": [
                {"id": "mfg_en_001", "name": "Product Engineering", "layer": "Core"},
                {"id": "mfg_en_002", "name": "Process Engineering", "layer": "Core"},
                {"id": "mfg_en_003", "name": "Industrial Engineering", "layer": "Core"},
                {"id": "mfg_en_004", "name": "Test Engineering", "layer": "Core"},
                {"id": "mfg_en_005", "name": "CAD/CAM", "layer": "Enabling"},
            ]},
            "sc_mfg": {"label": "Supply Chain", "icon": "🚛", "units": [
                {"id": "mfg_sc_001", "name": "Materials Management", "layer": "Core"},
                {"id": "mfg_sc_002", "name": "Supplier Quality", "layer": "Core"},
                {"id": "mfg_sc_003", "name": "Logistics", "layer": "Core"},
                {"id": "mfg_sc_004", "name": "Demand Forecasting", "layer": "Enabling"},
            ]},
            "quality_mfg": {"label": "Quality", "icon": "✅", "units": [
                {"id": "mfg_qa_001", "name": "Quality Assurance", "layer": "Governance"},
                {"id": "mfg_qa_002", "name": "Quality Control", "layer": "Core"},
                {"id": "mfg_qa_003", "name": "Metrology", "layer": "Core"},
                {"id": "mfg_qa_004", "name": "Regulatory / Certification (ISO, AS9100)", "layer": "Governance"},
            ]},
            "aftermarket": {"label": "Aftermarket", "icon": "🔩", "units": [
                {"id": "mfg_am_001", "name": "Parts", "layer": "Core"},
                {"id": "mfg_am_002", "name": "Service", "layer": "Core"},
                {"id": "mfg_am_003", "name": "Warranty", "layer": "Core"},
                {"id": "mfg_am_004", "name": "Field Service", "layer": "Core"},
                {"id": "mfg_am_005", "name": "Dealer Network", "layer": "Interface"},
            ]},
        },
    },
    "aerospace_defense": {
        "label": "Aerospace & Defense", "icon": "✈️", "examples": "Raytheon, Lockheed, Boeing",
        "functions": {
            "defense_prog": {"label": "Defense Programs", "icon": "🎯", "units": [
                {"id": "ad_dp_001", "name": "Program Management", "layer": "Core"},
                {"id": "ad_dp_002", "name": "Systems Engineering", "layer": "Core"},
                {"id": "ad_dp_003", "name": "Mission Systems", "layer": "Core"},
                {"id": "ad_dp_004", "name": "Classified Programs", "layer": "Core"},
            ]},
            "eng_ad": {"label": "Engineering", "icon": "🛩️", "units": [
                {"id": "ad_en_001", "name": "Aerospace Engineering", "layer": "Core"},
                {"id": "ad_en_002", "name": "Avionics", "layer": "Core"},
                {"id": "ad_en_003", "name": "Propulsion", "layer": "Core"},
                {"id": "ad_en_004", "name": "Structural Analysis", "layer": "Core"},
                {"id": "ad_en_005", "name": "Flight Test", "layer": "Core"},
            ]},
            "mfg_ad": {"label": "Manufacturing", "icon": "🏭", "units": [
                {"id": "ad_mf_001", "name": "Advanced Manufacturing", "layer": "Core"},
                {"id": "ad_mf_002", "name": "Composites", "layer": "Core"},
                {"id": "ad_mf_003", "name": "Integration & Assembly", "layer": "Core"},
                {"id": "ad_mf_004", "name": "Additive Manufacturing", "layer": "Enabling"},
            ]},
            "gov_rel": {"label": "Government Relations", "icon": "🏛️", "units": [
                {"id": "ad_gr_001", "name": "Contracts / Capture", "layer": "Core"},
                {"id": "ad_gr_002", "name": "DCMA Compliance", "layer": "Governance"},
                {"id": "ad_gr_003", "name": "Export Control (ITAR/EAR)", "layer": "Governance"},
                {"id": "ad_gr_004", "name": "Security (NISPOM)", "layer": "Governance"},
            ]},
            "mission_support": {"label": "Mission Support", "icon": "🛠️", "units": [
                {"id": "ad_ms_001", "name": "Sustainment", "layer": "Core"},
                {"id": "ad_ms_002", "name": "Depot Maintenance", "layer": "Core"},
                {"id": "ad_ms_003", "name": "Training & Simulation", "layer": "Core"},
                {"id": "ad_ms_004", "name": "Cybersecurity / C5ISR", "layer": "Core"},
            ]},
        },
    },
    "energy": {
        "label": "Energy / Utilities", "icon": "⚡", "examples": "ExxonMobil, NextEra, Duke Energy",
        "functions": {
            "upstream": {"label": "Upstream / Exploration", "icon": "🛢️", "units": [
                {"id": "eng_up_001", "name": "Geology", "layer": "Core"},
                {"id": "eng_up_002", "name": "Reservoir Engineering", "layer": "Core"},
                {"id": "eng_up_003", "name": "Drilling", "layer": "Core"},
                {"id": "eng_up_004", "name": "Production", "layer": "Core"},
            ]},
            "downstream": {"label": "Downstream / Refining", "icon": "🏗️", "units": [
                {"id": "eng_dn_001", "name": "Refinery Operations", "layer": "Core"},
                {"id": "eng_dn_002", "name": "Petrochemicals", "layer": "Core"},
                {"id": "eng_dn_003", "name": "Trading", "layer": "Core"},
                {"id": "eng_dn_004", "name": "Distribution", "layer": "Core"},
            ]},
            "renewables": {"label": "Renewables", "icon": "🌱", "units": [
                {"id": "eng_rn_001", "name": "Solar Operations", "layer": "Core"},
                {"id": "eng_rn_002", "name": "Wind Operations", "layer": "Core"},
                {"id": "eng_rn_003", "name": "Battery Storage", "layer": "Core"},
                {"id": "eng_rn_004", "name": "Grid Integration", "layer": "Core"},
            ]},
            "utility_ops": {"label": "Utilities Operations", "icon": "⚡", "units": [
                {"id": "eng_uo_001", "name": "Generation", "layer": "Core"},
                {"id": "eng_uo_002", "name": "Transmission", "layer": "Core"},
                {"id": "eng_uo_003", "name": "Distribution", "layer": "Core"},
                {"id": "eng_uo_004", "name": "Grid Operations", "layer": "Core"},
                {"id": "eng_uo_005", "name": "Smart Grid", "layer": "Enabling"},
            ]},
            "reg_env": {"label": "Regulatory / Environmental", "icon": "🌍", "units": [
                {"id": "eng_re_001", "name": "Environmental Compliance", "layer": "Governance"},
                {"id": "eng_re_002", "name": "Rate Cases", "layer": "Core"},
                {"id": "eng_re_003", "name": "Government Affairs", "layer": "Interface"},
                {"id": "eng_re_004", "name": "Carbon Management", "layer": "Governance"},
            ]},
        },
    },
    "consulting": {
        "label": "Consulting / Professional Services", "icon": "💼", "examples": "McKinsey, Deloitte, Mercer",
        "functions": {
            "delivery": {"label": "Client Delivery", "icon": "🎯", "units": [
                {"id": "con_cd_001", "name": "Engagement Management", "layer": "Core"},
                {"id": "con_cd_002", "name": "Solution Architecture", "layer": "Core"},
                {"id": "con_cd_003", "name": "Subject Matter Experts", "layer": "Core"},
                {"id": "con_cd_004", "name": "Delivery Teams", "layer": "Core"},
            ]},
            "practice": {"label": "Practice Development", "icon": "📚", "units": [
                {"id": "con_pd_001", "name": "Thought Leadership", "layer": "Enabling"},
                {"id": "con_pd_002", "name": "Methodology / IP Development", "layer": "Enabling"},
                {"id": "con_pd_003", "name": "Benchmarking", "layer": "Enabling"},
                {"id": "con_pd_004", "name": "Research", "layer": "Enabling"},
            ]},
            "bizdev": {"label": "Business Development", "icon": "🤝", "units": [
                {"id": "con_bd_001", "name": "Proposal Management", "layer": "Core"},
                {"id": "con_bd_002", "name": "Client Relationships", "layer": "Interface"},
                {"id": "con_bd_003", "name": "Cross-Selling", "layer": "Core"},
                {"id": "con_bd_004", "name": "Alliance Partnerships", "layer": "Interface"},
            ]},
            "km": {"label": "Knowledge Management", "icon": "🧠", "units": [
                {"id": "con_km_001", "name": "Knowledge Bases", "layer": "Shared Services"},
                {"id": "con_km_002", "name": "Templates / Frameworks", "layer": "Shared Services"},
                {"id": "con_km_003", "name": "Training", "layer": "Enabling"},
                {"id": "con_km_004", "name": "Communities of Practice", "layer": "Interface"},
            ]},
        },
    },
    "telecom": {
        "label": "Telecommunications", "icon": "📡", "examples": "Verizon, AT&T",
        "functions": {
            "network": {"label": "Network", "icon": "🌐", "units": [
                {"id": "tel_nw_001", "name": "Network Engineering", "layer": "Core"},
                {"id": "tel_nw_002", "name": "Network Operations Center", "layer": "Core"},
                {"id": "tel_nw_003", "name": "RF Engineering", "layer": "Core"},
                {"id": "tel_nw_004", "name": "Fiber / Infrastructure", "layer": "Core"},
            ]},
            "product_tel": {"label": "Product", "icon": "📱", "units": [
                {"id": "tel_pr_001", "name": "Consumer Products", "layer": "Core"},
                {"id": "tel_pr_002", "name": "Enterprise Products", "layer": "Core"},
                {"id": "tel_pr_003", "name": "IoT / Connected Devices", "layer": "Core"},
                {"id": "tel_pr_004", "name": "5G Services", "layer": "Core"},
            ]},
            "custops_tel": {"label": "Customer Operations", "icon": "📞", "units": [
                {"id": "tel_co_001", "name": "Retail / Stores", "layer": "Core"},
                {"id": "tel_co_002", "name": "Contact Center", "layer": "Core"},
                {"id": "tel_co_003", "name": "Field Technicians", "layer": "Core"},
                {"id": "tel_co_004", "name": "Billing", "layer": "Shared Services"},
            ]},
            "wholesale_tel": {"label": "Wholesale", "icon": "🔗", "units": [
                {"id": "tel_wh_001", "name": "Carrier Relations", "layer": "Interface"},
                {"id": "tel_wh_002", "name": "Interconnection", "layer": "Core"},
                {"id": "tel_wh_003", "name": "Roaming", "layer": "Core"},
                {"id": "tel_wh_004", "name": "Tower Operations", "layer": "Core"},
            ]},
        },
    },
    "media": {
        "label": "Media & Entertainment", "icon": "🎬", "examples": "Disney, Netflix, Warner Bros",
        "functions": {
            "content": {"label": "Content", "icon": "🎥", "units": [
                {"id": "med_ct_001", "name": "Content Development", "layer": "Core"},
                {"id": "med_ct_002", "name": "Production", "layer": "Core"},
                {"id": "med_ct_003", "name": "Post-Production", "layer": "Core"},
                {"id": "med_ct_004", "name": "Content Acquisition", "layer": "Core"},
                {"id": "med_ct_005", "name": "Licensing", "layer": "Core"},
            ]},
            "distribution_med": {"label": "Distribution", "icon": "📺", "units": [
                {"id": "med_di_001", "name": "Theatrical", "layer": "Core"},
                {"id": "med_di_002", "name": "Streaming / OTT", "layer": "Core"},
                {"id": "med_di_003", "name": "Linear TV", "layer": "Core"},
                {"id": "med_di_004", "name": "International Distribution", "layer": "Core"},
            ]},
            "creative": {"label": "Creative", "icon": "🎨", "units": [
                {"id": "med_cr_001", "name": "Creative Development", "layer": "Core"},
                {"id": "med_cr_002", "name": "Writers", "layer": "Core"},
                {"id": "med_cr_003", "name": "Talent Management", "layer": "Core"},
                {"id": "med_cr_004", "name": "Music", "layer": "Core"},
            ]},
            "parks": {"label": "Parks / Experiences", "icon": "🎢", "units": [
                {"id": "med_pk_001", "name": "Park Operations", "layer": "Core"},
                {"id": "med_pk_002", "name": "Attractions", "layer": "Core"},
                {"id": "med_pk_003", "name": "Hospitality", "layer": "Core"},
                {"id": "med_pk_004", "name": "Merchandise", "layer": "Core"},
                {"id": "med_pk_005", "name": "Live Events", "layer": "Core"},
            ]},
            "adsales_med": {"label": "Advertising Sales", "icon": "💰", "units": [
                {"id": "med_as_001", "name": "Ad Sales", "layer": "Core"},
                {"id": "med_as_002", "name": "Sponsorship", "layer": "Core"},
                {"id": "med_as_003", "name": "Programmatic", "layer": "Enabling"},
                {"id": "med_as_004", "name": "Measurement", "layer": "Enabling"},
            ]},
        },
    },
    "real_estate": {
        "label": "Real Estate", "icon": "🏗️", "examples": "CBRE, Prologis, Simon Property",
        "functions": {
            "asset_mgmt_re": {"label": "Asset Management", "icon": "🏢", "units": [
                {"id": "re_am_001", "name": "Portfolio Strategy", "layer": "Core"},
                {"id": "re_am_002", "name": "Property Management", "layer": "Core"},
                {"id": "re_am_003", "name": "Leasing", "layer": "Core"},
                {"id": "re_am_004", "name": "Capital Improvements", "layer": "Core"},
            ]},
            "development_re": {"label": "Development", "icon": "🏗️", "units": [
                {"id": "re_dv_001", "name": "Project Development", "layer": "Core"},
                {"id": "re_dv_002", "name": "Construction Management", "layer": "Core"},
                {"id": "re_dv_003", "name": "Design", "layer": "Core"},
                {"id": "re_dv_004", "name": "Entitlements / Permitting", "layer": "Governance"},
            ]},
            "investment_re": {"label": "Investment", "icon": "💎", "units": [
                {"id": "re_iv_001", "name": "Acquisitions", "layer": "Core"},
                {"id": "re_iv_002", "name": "Dispositions", "layer": "Core"},
                {"id": "re_iv_003", "name": "Joint Ventures", "layer": "Core"},
                {"id": "re_iv_004", "name": "Fund Management", "layer": "Core"},
            ]},
            "brokerage_re": {"label": "Brokerage", "icon": "🤝", "units": [
                {"id": "re_bk_001", "name": "Tenant Representation", "layer": "Core"},
                {"id": "re_bk_002", "name": "Landlord Representation", "layer": "Core"},
                {"id": "re_bk_003", "name": "Capital Markets Advisory", "layer": "Core"},
            ]},
        },
    },
}


# ═══════════════════════════════════════════════════════════════
# LAYER 3: BUILD & MERGE FUNCTIONS
# ═══════════════════════════════════════════════════════════════

# Industry → sandbox industry mapping (for pre-configuring sandbox companies)
SANDBOX_INDUSTRY_MAP = {
    "technology": ["tech"],
    "financial_services": ["finserv_am", "finserv_banking"],
    "healthcare": ["healthcare"],
    "manufacturing": ["manufacturing"],
    "retail": ["retail"],
    "legal": ["consulting"],
    "energy": ["energy"],
    "education": ["consulting"],
}


def build_taxonomy(industries: Optional[list[str]] = None, customizations: Optional[dict] = None) -> dict:
    """Merge universal functions + industry modules + customizations into a resolved tree.

    Returns: {
        "functions": { func_id: { "label", "icon", "units": [...], "source": "universal"|"industry" } },
        "industries_applied": [...]
    }
    """
    result: dict[str, dict] = {}

    # Layer 1: Universal
    for fid, fdata in UNIVERSAL_FUNCTIONS.items():
        result[fid] = {
            "label": fdata["label"],
            "icon": fdata["icon"],
            "source": "universal",
            "units": [dict(u, source="universal") for u in fdata["units"]],
        }

    # Layer 2: Industry overlays
    applied = []
    for ind_id in (industries or []):
        mod = INDUSTRY_MODULES.get(ind_id)
        if not mod:
            continue
        applied.append({"id": ind_id, "label": mod["label"], "icon": mod["icon"]})
        for func_id, func_data in mod["functions"].items():
            if func_id not in result:
                result[func_id] = {
                    "label": func_data["label"],
                    "icon": func_data["icon"],
                    "source": f"industry:{ind_id}",
                    "units": [],
                }
            # Add units
            existing_ids = {u["id"] for u in result[func_id]["units"]}
            for u in func_data["units"]:
                if u["id"] not in existing_ids:
                    result[func_id]["units"].append(dict(u, source=f"industry:{ind_id}"))

    # Layer 3: Custom units
    if customizations:
        for cu in customizations.get("custom_units", []):
            fid = cu.get("func", "custom")
            if fid not in result:
                result[fid] = {"label": cu.get("func_label", fid), "icon": "🔧", "source": "custom", "units": []}
            result[fid]["units"].append({
                "id": cu.get("id", f"cust_{len(result[fid]['units'])}"),
                "name": cu["name"],
                "layer": cu.get("layer", "Core"),
                "source": "custom",
            })
        # Apply renames
        for old_name, new_name in customizations.get("renames", {}).items():
            for func in result.values():
                for u in func["units"]:
                    if u["name"] == old_name:
                        u["name"] = new_name
                        u["renamed_from"] = old_name

    return {"functions": result, "industries_applied": applied}


def get_all_units(taxonomy: Optional[dict] = None) -> list[dict]:
    """Flatten all units across all functions."""
    if taxonomy is None:
        taxonomy = build_taxonomy()
    units = []
    for fid, fdata in taxonomy["functions"].items():
        for u in fdata["units"]:
            units.append({**u, "function": fid, "function_label": fdata["label"]})
    return units


def fuzzy_match_units(query: str, industries: Optional[list[str]] = None, threshold: float = 0.4) -> list[dict]:
    """Fuzzy search across all taxonomy units. Returns top 15 matches above threshold."""
    taxonomy = build_taxonomy(industries)
    all_units = get_all_units(taxonomy)
    query_lower = query.lower().strip()
    scored = []
    for u in all_units:
        name_lower = u["name"].lower()
        # Exact substring match gets high score
        if query_lower in name_lower:
            score = 0.9 + (len(query_lower) / len(name_lower)) * 0.1
        else:
            score = difflib.SequenceMatcher(None, query_lower, name_lower).ratio()
        if score >= threshold:
            scored.append({**u, "score": round(score, 3)})
    scored.sort(key=lambda x: -x["score"])
    return scored[:15]


def get_industry_list() -> list[dict]:
    """Return list of available industries with metadata."""
    return [
        {"id": k, "label": v["label"], "icon": v["icon"], "examples": v.get("examples", ""),
         "function_count": len(v["functions"]), "unit_count": sum(len(f["units"]) for f in v["functions"].values())}
        for k, v in INDUSTRY_MODULES.items()
    ]


def get_taxonomy_stats() -> dict:
    """Summary stats for the full taxonomy."""
    universal_units = sum(len(f["units"]) for f in UNIVERSAL_FUNCTIONS.values())
    industry_units = sum(
        sum(len(f["units"]) for f in m["functions"].values())
        for m in INDUSTRY_MODULES.values()
    )
    return {
        "universal_functions": len(UNIVERSAL_FUNCTIONS),
        "universal_units": universal_units,
        "industries": len(INDUSTRY_MODULES),
        "industry_functions": sum(len(m["functions"]) for m in INDUSTRY_MODULES.values()),
        "industry_units": industry_units,
        "total_units": universal_units + industry_units,
    }
