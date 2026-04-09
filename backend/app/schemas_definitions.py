"""Canonical schemas, aliases, hints, and filter mappings."""

SCHEMAS = {
    "workforce": {
        "required": ["Model ID", "Employee ID", "Employee Name"],
        "all": [
            "Model ID", "Employee ID", "Employee Name", "Manager ID", "Manager Name",
            "Function ID", "Job Family", "Sub-Family", "Geography",
            "Career Track", "Career Level", "Job Title", "Job Description",
            "Department", "Org Unit", "FTE", "Base Pay", "Total Cash",
            "Hire Date", "Performance Rating", "Critical Role"
        ]
    },
    "job_catalog": {
        "required": ["Model ID", "Job Title"],
        "all": [
            "Model ID", "Job Code", "Job Title", "Standard Title",
            "Function ID", "Job Family", "Sub-Family", "Geography",
            "Career Track", "Career Level", "Manager or IC",
            "Job Description", "Skills", "Role Purpose"
        ]
    },
    "market_data": {
        "required": ["Model ID", "Source", "Job Match Key"],
        "all": [
            "Model ID", "Source", "Effective Date", "Currency",
            "Job Match Key", "Survey Job Title", "Function ID",
            "Job Family", "Sub-Family", "Geography", "Career Track",
            "Career Level", "Base 25th", "Base 50th", "Base 75th",
            "TCC 25th", "TCC 50th", "TCC 75th",
            "LTIP 25th", "LTIP 50th", "LTIP 75th"
        ]
    },
    "operating_model": {
        "required": ["Model ID", "Scope", "Layer"],
        "all": [
            "Model ID", "Scope", "Layer",
            "Level 1", "Level 2", "Level 3", "Level 4",
            "Description", "Owner",
            "Function ID", "Job Family", "Sub-Family",
            "Geography", "Career Track", "Career Level"
        ]
    },
    "work_design": {
        "required": ["Model ID", "Job Title", "Task Name"],
        "all": [
            "Model ID", "Function ID", "Job Family", "Sub-Family", "Geography",
            "Career Track", "Career Level", "Job Title", "Job Description",
            "Workstream", "Task ID", "Task Name", "Description",
            "AI Impact", "Est Hours/Week", "Current Time Spent %", "Time Saved %", "Time %",
            "Task Type", "Interaction", "Logic",
            "Primary Skill", "Secondary Skill"
        ]
    },
    "change_management": {
        "required": ["Model ID"],
        "all": [
            "Model ID", "Function ID", "Job Family", "Sub-Family",
            "Geography", "Career Track", "Career Level", "Job Title",
            "Task Name", "Responsible", "Accountable", "Consulted", "Informed",
            "Initiative", "Owner", "Priority", "Status", "Wave", "Start", "End",
            "Milestone", "Date", "Risk", "Dependency", "Notes"
        ]
    },
    "org_design": {
        "required": ["Model ID", "Employee ID", "Employee Name"],
        "all": [
            "Model ID", "Employee ID", "Employee Name",
            "Manager ID", "Manager Name",
            "Function ID", "Job Family", "Sub-Family",
            "Geography", "Career Track", "Career Level",
            "Job Title", "Job Description", "Department", "Org Unit"
        ]
    }
}

DATASET_HINTS = {
    "org_design": {"Employee ID", "Employee Name", "Manager ID"},
    "workforce": {"Employee ID", "Employee Name", "Job Title", "FTE", "Base Pay"},
    "job_catalog": {"Job Code", "Standard Title", "Manager or IC", "Role Purpose", "Skills"},
    "market_data": {"Source", "Job Match Key", "Base 50th", "TCC 50th"},
    "operating_model": {"Scope", "Layer"},
    "work_design": {"Task Name", "Task ID", "Workstream", "AI Impact", "Time %",
                    "Est Hours/Week", "Task Type", "Interaction", "Logic"},
    "change_management": {"Responsible", "Accountable", "Initiative", "Milestone"}
}

COMMON_ALIASES = {
    "Employee_ID": "Employee ID", "Employee Number": "Employee ID",
    "Employee_Number": "Employee ID", "Worker ID": "Employee ID",
    "Worker": "Employee Name", "Employee": "Employee Name",
    "Employee Name Full": "Employee Name",
    "Name": "Employee Name",
    "Supervisor_ID": "Manager ID", "Manager_ID": "Manager ID",
    "Manager Name Full": "Manager Name", "Manager": "Manager Name",
    "Function": "Function ID", "Family": "Job Family",
    "Sub Function": "Sub-Family", "Sub Function ID": "Sub-Family",
    "Sub-Function": "Sub-Family", "Sub-Function ID": "Sub-Family",
    "Compensation": "Base Pay", "Salary": "Base Pay", "Annual Salary": "Base Pay",
    "Track": "Career Track", "Track Type": "Career Track",
    "Level": "Career Level", "Grade": "Career Level",
    "Region": "Geography", "Location": "Geography", "Country": "Geography",
    "JD": "Job Description", "Job Description Summary": "Job Description",
    "Median Base": "Base 50th", "P50 Base": "Base 50th",
    "25th Base": "Base 25th", "75th Base": "Base 75th",
    "Survey Title": "Survey Job Title",
    "Current Time %": "Current Time Spent %",
    "Current Time Allocation %": "Current Time Spent %",
    "Current Time Allocation": "Current Time Spent %",
    "Time Allocation %": "Current Time Spent %",
    "Time Saved": "Time Saved %", "Time Saved Percent": "Time Saved %",
    "Automation %": "Time Saved %", "Automation Opportunity %": "Time Saved %",
}

GLOBAL_FILTER_MAP = {
    "Function": "Function ID",
    "Job Family": "Job Family",
    "Sub-Family": "Sub-Family",
    "Career Level": "Career Level"
}

MODEL_ID_CANDIDATES = [
    "Model ID", "Model_ID", "Model", "Scenario", "Scenario ID",
    "Org Name", "Organization", "Company"
]
