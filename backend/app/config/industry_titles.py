"""Industry-specific title mappings for each career level.

Level CODES (S1, P3, M4, E2) are universal across all industries.
Only the DISPLAY TITLES change per industry.
"""

# Generic fallback (used when industry not found)
GENERIC_TITLES = {
    "S1": "Support Associate", "S2": "Senior Support Associate", "S3": "Support Specialist",
    "S4": "Senior Support Specialist", "S5": "Lead Support Specialist", "S6": "Support Operations Lead",
    "P1": "Analyst/Associate", "P2": "Senior Analyst", "P3": "Specialist/Consultant",
    "P4": "Senior Specialist", "P5": "Principal/Lead", "P6": "Distinguished",
    "P7": "Senior Distinguished", "P8": "Fellow/Chief Scientist",
    "T1": "Engineer I", "T2": "Engineer II", "T3": "Senior Engineer",
    "T4": "Staff Engineer", "T5": "Principal Engineer", "T6": "Distinguished Engineer",
    "T7": "Senior Distinguished Engineer", "T8": "Fellow/Chief Architect",
    "M1": "Support Manager", "M2": "Junior Manager", "M3": "Manager",
    "M4": "Senior Manager", "M5": "Director", "M6": "Senior Director",
    "E1": "Vice President", "E2": "Senior Vice President", "E3": "Executive Vice President",
    "E4": "C-Suite/CEO", "E5": "CEO/President",
}

INDUSTRY_TITLES = {
    # ═══════════════════════════════════════════════════════════
    # FINANCIAL SERVICES
    # ═══════════════════════════════════════════════════════════
    "financial_services": {
        "S1": "Operations Associate", "S2": "Senior Operations Associate",
        "S3": "Operations Specialist", "S4": "Senior Operations Specialist",
        "S5": "Operations Team Lead", "S6": "Operations Manager",
        "P1": "Analyst", "P2": "Senior Analyst", "P3": "Associate",
        "P4": "Vice President", "P5": "Executive Director",
        "P6": "Managing Director", "P7": "Senior Managing Director", "P8": "Partner",
        "T1": "Technology Analyst", "T2": "Senior Technology Analyst",
        "T3": "Associate VP Technology", "T4": "VP Technology",
        "T5": "Director Technology", "T6": "Managing Director Technology",
        "T7": "Senior Managing Director Technology", "T8": "Chief Architect",
        "M1": "Team Lead", "M2": "Associate Vice President",
        "M3": "Vice President", "M4": "Director",
        "M5": "Executive Director", "M6": "Managing Director",
        "E1": "Group Head", "E2": "Senior Group Head",
        "E3": "C-Suite", "E4": "President", "E5": "CEO",
    },

    # ═══════════════════════════════════════════════════════════
    # TECHNOLOGY
    # ═══════════════════════════════════════════════════════════
    "technology": {
        "S1": "Coordinator", "S2": "Senior Coordinator",
        "S3": "Program Specialist", "S4": "Senior Program Specialist",
        "S5": "Lead Program Specialist", "S6": "Program Operations Manager",
        "P1": "Associate", "P2": "Analyst", "P3": "Senior Analyst",
        "P4": "Staff Analyst", "P5": "Principal",
        "P6": "Distinguished", "P7": "Senior Distinguished", "P8": "Fellow",
        "T1": "Software Engineer I", "T2": "Software Engineer II",
        "T3": "Senior Software Engineer", "T4": "Staff Engineer",
        "T5": "Principal Engineer", "T6": "Distinguished Engineer",
        "T7": "Senior Distinguished Engineer", "T8": "Fellow",
        "M1": "Team Lead", "M2": "Engineering Manager",
        "M3": "Senior Manager", "M4": "Director",
        "M5": "Senior Director", "M6": "Vice President",
        "E1": "Senior Vice President", "E2": "Executive Vice President",
        "E3": "C-Suite", "E4": "President", "E5": "CEO",
    },

    # ═══════════════════════════════════════════════════════════
    # HEALTHCARE
    # ═══════════════════════════════════════════════════════════
    "healthcare": {
        "S1": "Patient Services Rep", "S2": "Senior Patient Services Rep",
        "S3": "Clinical Support Specialist", "S4": "Senior Clinical Support Specialist",
        "S5": "Lead Clinical Support", "S6": "Clinical Operations Lead",
        "P1": "Healthcare Analyst", "P2": "Senior Healthcare Analyst",
        "P3": "Healthcare Consultant", "P4": "Senior Clinical Specialist",
        "P5": "Principal Clinical Advisor", "P6": "Distinguished Clinical Expert",
        "P7": "Senior Distinguished Expert", "P8": "Chief Medical Advisor",
        "T1": "Health IT Analyst I", "T2": "Health IT Analyst II",
        "T3": "Senior Health IT Engineer", "T4": "Staff Health IT Engineer",
        "T5": "Principal Health IT Engineer", "T6": "Distinguished Health IT Architect",
        "T7": "Senior Distinguished Health IT Architect", "T8": "Chief Health Informatics Scientist",
        "M1": "Supervisor", "M2": "Manager",
        "M3": "Senior Manager", "M4": "Director",
        "M5": "Senior Director", "M6": "Vice President",
        "E1": "Senior Vice President", "E2": "Executive Vice President",
        "E3": "C-Suite", "E4": "President", "E5": "CEO",
    },

    # ═══════════════════════════════════════════════════════════
    # RETAIL & CONSUMER
    # ═══════════════════════════════════════════════════════════
    "retail": {
        "S1": "Sales Associate", "S2": "Senior Sales Associate",
        "S3": "Department Specialist", "S4": "Senior Department Specialist",
        "S5": "Department Lead", "S6": "Operations Lead",
        "P1": "Merchandising Analyst", "P2": "Senior Analyst",
        "P3": "Category Specialist", "P4": "Senior Planner",
        "P5": "Principal Planner", "P6": "Distinguished Expert",
        "P7": "Senior Distinguished Expert", "P8": "Fellow",
        "T1": "IT Associate", "T2": "IT Analyst",
        "T3": "Senior IT Engineer", "T4": "Staff Engineer",
        "T5": "Principal Engineer", "T6": "Distinguished Engineer",
        "T7": "Senior Distinguished Engineer", "T8": "Chief Architect",
        "M1": "Shift Supervisor", "M2": "Assistant Store Manager",
        "M3": "Store Manager", "M4": "District Manager",
        "M5": "Regional Director", "M6": "Vice President",
        "E1": "Senior Vice President", "E2": "Division President",
        "E3": "C-Suite", "E4": "President", "E5": "CEO",
    },

    # ═══════════════════════════════════════════════════════════
    # DEFENSE & AEROSPACE
    # ═══════════════════════════════════════════════════════════
    "aerospace": {
        "S1": "Administrative Associate", "S2": "Senior Administrative Associate",
        "S3": "Program Support Specialist", "S4": "Senior Program Support Specialist",
        "S5": "Lead Program Support", "S6": "Program Support Manager",
        "P1": "Associate Analyst", "P2": "Analyst",
        "P3": "Senior Analyst", "P4": "Lead Analyst",
        "P5": "Principal Analyst", "P6": "Senior Fellow",
        "P7": "Senior Distinguished Fellow", "P8": "Chief Scientist",
        "T1": "Engineer I", "T2": "Engineer II",
        "T3": "Senior Engineer", "T4": "Staff Engineer",
        "T5": "Principal Engineer", "T6": "Technical Fellow",
        "T7": "Senior Technical Fellow", "T8": "Chief Engineer",
        "M1": "Supervisor", "M2": "Section Manager",
        "M3": "Department Manager", "M4": "Program Director",
        "M5": "Senior Director", "M6": "Vice President",
        "E1": "Sector Vice President", "E2": "Sector President",
        "E3": "C-Suite", "E4": "President", "E5": "CEO",
    },

    # ═══════════════════════════════════════════════════════════
    # MANUFACTURING & INDUSTRIALS
    # ═══════════════════════════════════════════════════════════
    "manufacturing": {
        "S1": "Production Associate", "S2": "Senior Operator",
        "S3": "Production Specialist", "S4": "Senior Technician",
        "S5": "Master Technician", "S6": "Shift Superintendent",
        "P1": "Process Analyst", "P2": "Senior Analyst",
        "P3": "Specialist", "P4": "Senior Specialist",
        "P5": "Principal Engineer", "P6": "Distinguished Expert",
        "P7": "Senior Distinguished Fellow", "P8": "Chief Scientist",
        "T1": "Engineer I", "T2": "Engineer II",
        "T3": "Senior Engineer", "T4": "Staff Engineer",
        "T5": "Principal Engineer", "T6": "Technical Fellow",
        "T7": "Senior Technical Fellow", "T8": "Chief Engineer",
        "M1": "Shift Supervisor", "M2": "Production Manager",
        "M3": "Plant Manager", "M4": "Director",
        "M5": "Regional Operations Director", "M6": "Vice President Operations",
        "E1": "Division Vice President", "E2": "Group President",
        "E3": "C-Suite", "E4": "President", "E5": "CEO",
    },

    # ═══════════════════════════════════════════════════════════
    # PROFESSIONAL SERVICES / CONSULTING
    # ═══════════════════════════════════════════════════════════
    "consulting": {
        "S1": "Administrative Associate", "S2": "Senior Administrative Associate",
        "S3": "Executive Assistant", "S4": "Senior Office Specialist",
        "S5": "Office Lead", "S6": "Operations Manager",
        "P1": "Analyst", "P2": "Consultant",
        "P3": "Senior Consultant", "P4": "Manager",
        "P5": "Senior Manager", "P6": "Director",
        "P7": "Senior Director", "P8": "Fellow",
        "T1": "Technology Analyst", "T2": "Technology Consultant",
        "T3": "Senior Technology Consultant", "T4": "Solutions Architect",
        "T5": "Principal Technology Architect", "T6": "Distinguished Architect",
        "T7": "Senior Distinguished Architect", "T8": "Chief Technology Fellow",
        "M1": "Engagement Lead", "M2": "Manager",
        "M3": "Senior Manager", "M4": "Engagement Director",
        "M5": "Practice Lead", "M6": "Managing Director",
        "E1": "Partner", "E2": "Senior Partner",
        "E3": "C-Suite", "E4": "President", "E5": "CEO",
    },

    # ═══════════════════════════════════════════════════════════
    # ENERGY
    # ═══════════════════════════════════════════════════════════
    "energy": {
        "S1": "Field Associate", "S2": "Senior Field Associate",
        "S3": "Field Specialist", "S4": "Senior Field Specialist",
        "S5": "Lead Field Specialist", "S6": "Field Operations Lead",
        "P1": "Energy Analyst", "P2": "Senior Analyst",
        "P3": "Specialist", "P4": "Senior Specialist",
        "P5": "Principal Advisor", "P6": "Distinguished Expert",
        "P7": "Senior Distinguished Expert", "P8": "Chief Scientist",
        "T1": "Field Engineer I", "T2": "Field Engineer II",
        "T3": "Senior Engineer", "T4": "Staff Engineer",
        "T5": "Principal Engineer", "T6": "Distinguished Engineer",
        "T7": "Senior Distinguished Engineer", "T8": "Chief Engineer",
        "M1": "Crew Lead", "M2": "Field Manager",
        "M3": "Senior Manager", "M4": "Asset Director",
        "M5": "Regional Director", "M6": "Vice President",
        "E1": "Senior Vice President", "E2": "Executive Vice President",
        "E3": "C-Suite", "E4": "President", "E5": "CEO",
    },
}

# Aliases — map backend industry keys to title map keys
INDUSTRY_ALIASES = {
    "financial_services": "financial_services",
    "technology": "technology",
    "healthcare": "healthcare",
    "retail": "retail",
    "manufacturing": "manufacturing",
    "consulting": "consulting",
    "energy": "energy",
    "aerospace": "aerospace",
    "legal": "consulting",          # legal firms use consulting titles
    "education": "healthcare",      # education uses similar hierarchy to healthcare
    "professional_services": "consulting",
}


def get_title_for_level(level: str, industry: str, size_tier: str = "mid") -> str:
    """Get the industry-specific display title for a career level.

    Args:
        level: Career level code (e.g., "P4", "M3", "E2")
        industry: Industry key (e.g., "financial_services", "technology")
        size_tier: Company size ("small", "mid", "large")

    Returns:
        Industry-appropriate display title
    """
    mapped_industry = INDUSTRY_ALIASES.get(industry, industry)
    titles = INDUSTRY_TITLES.get(mapped_industry, GENERIC_TITLES)
    title = titles.get(level, GENERIC_TITLES.get(level, level))

    # Special handling for CEO level — always singular
    if level == "E4" and size_tier == "large":
        # For large-cap, E4 is C-Suite (not CEO)
        if mapped_industry == "financial_services":
            return "President"
        return "C-Suite"
    if level == "E5":
        if mapped_industry == "financial_services":
            return "CEO"
        return "CEO"

    return title


def get_all_titles_for_industry(industry: str) -> dict:
    """Get the complete title map for an industry."""
    mapped_industry = INDUSTRY_ALIASES.get(industry, industry)
    return INDUSTRY_TITLES.get(mapped_industry, GENERIC_TITLES)


# Function → C-Suite title mapping
CSUITE_BY_FUNCTION = {
    "Finance": "CFO", "Treasury": "CFO",
    "Engineering": "CTO", "Technology": "CTO", "IT & Infrastructure": "CIO",
    "IT & Digital": "CIO", "IT & Cyber": "CIO", "IT Services": "CIO",
    "HR & People": "CHRO", "HR": "CHRO", "Human Resources": "CHRO",
    "Legal": "General Counsel", "Legal & Regulatory": "General Counsel",
    "Legal & Compliance": "CLO",
    "Sales & Marketing": "CRO", "Marketing": "CMO",
    "Wealth Management": "Head of Wealth Management",
    "Product": "CPO", "Merchandising": "Chief Merchant",
    "Data & Analytics": "CDO", "Risk Management": "CRO",
    "Security": "CISO", "Cybersecurity": "CISO",
    "Operations": "COO", "Supply Chain": "COO",
    "Clinical Operations": "CNO", "Patient Services": "Chief Patient Officer",
    "Health Informatics": "CMIO",
    "Production": "COO", "Quality Control": "CQO",
    "Compliance": "CCO", "Quality & Safety": "Chief Quality Officer",
    "EHS": "Chief Safety Officer", "HSE": "Chief Safety Officer",
    "Store Operations": "COO",
    "Strategy & Consulting": "Chief Strategy Officer",
    "Mission Systems": "CTO", "Engineering Systems": "CTO",
    "E-Commerce Tech": "CTO", "Reservoir Engineering": "CTO",
    "Loss Prevention": "VP Loss Prevention",
    "Revenue Cycle": "CRO", "Land & Commercial": "Chief Commercial Officer",
    "Business Development": "Chief Growth Officer",
}


def get_csuite_title(function: str, level: str, industry: str, size_tier: str = "mid") -> str:
    """Get function-specific C-suite title for E3/E4 levels.

    E3 should always return a function-specific executive title (CFO, CTO, etc.)
    E4 in large-cap returns function-specific C-suite titles too.
    """
    if level not in ("E3", "E4"):
        return get_title_for_level(level, industry, size_tier)

    # For E4 in small/mid, it's always CEO (single person)
    if level == "E4" and size_tier in ("small", "mid"):
        return "CEO"

    # For E5, always CEO
    if level == "E5":
        return "CEO"

    # Look up function-specific title
    csuite_title = CSUITE_BY_FUNCTION.get(function)
    if csuite_title:
        return csuite_title

    # Fallback: "Chief {Function} Officer" or generic
    if function:
        # Clean up function name for title
        clean = function.replace("&", "and").replace("  ", " ").strip()
        return f"Chief {clean} Officer"

    return get_title_for_level(level, industry, size_tier)
