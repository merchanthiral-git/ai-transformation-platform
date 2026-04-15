"""O*NET Database — data model and loader.
Supports loading from O*NET flat files (when available) or uses synthetic data.
O*NET v30.2 schema: 923 occupations, 35 skills, 33 knowledge areas, 52 abilities.
"""

import random
import hashlib
from datetime import datetime

# ═══════════════════════════════════════════════════════════════════════
# O*NET SKILL DEFINITIONS — all 35 skills
# ═══════════════════════════════════════════════════════════════════════

ONET_SKILLS = [
    # Basic Skills
    {"element_id": "2.A.1.a", "name": "Reading Comprehension", "category": "Basic Skills",
     "description": "Understanding written sentences and paragraphs in work-related documents."},
    {"element_id": "2.A.1.b", "name": "Active Listening", "category": "Basic Skills",
     "description": "Giving full attention to what other people are saying, taking time to understand the points being made, asking questions as appropriate, and not interrupting at inappropriate times."},
    {"element_id": "2.A.1.c", "name": "Writing", "category": "Basic Skills",
     "description": "Communicating effectively in writing as appropriate for the needs of the audience."},
    {"element_id": "2.A.1.d", "name": "Speaking", "category": "Basic Skills",
     "description": "Talking to others to convey information effectively."},
    {"element_id": "2.A.1.e", "name": "Mathematics", "category": "Basic Skills",
     "description": "Using mathematics to solve problems."},
    {"element_id": "2.A.1.f", "name": "Science", "category": "Basic Skills",
     "description": "Using scientific rules and methods to solve problems."},
    # Process Skills
    {"element_id": "2.A.2.a", "name": "Critical Thinking", "category": "Process Skills",
     "description": "Using logic and reasoning to identify the strengths and weaknesses of alternative solutions, conclusions, or approaches to problems."},
    {"element_id": "2.A.2.b", "name": "Active Learning", "category": "Process Skills",
     "description": "Understanding the implications of new information for both current and future problem-solving and decision-making."},
    {"element_id": "2.A.2.c", "name": "Learning Strategies", "category": "Process Skills",
     "description": "Selecting and using training/instructional methods and procedures appropriate for the situation when learning or teaching new things."},
    {"element_id": "2.A.2.d", "name": "Monitoring", "category": "Process Skills",
     "description": "Monitoring/assessing performance of yourself, other individuals, or organizations to make improvements or take corrective action."},
    # Social Skills
    {"element_id": "2.B.1.a", "name": "Social Perceptiveness", "category": "Social Skills",
     "description": "Being aware of others' reactions and understanding why they react as they do."},
    {"element_id": "2.B.1.b", "name": "Coordination", "category": "Social Skills",
     "description": "Adjusting actions in relation to others' actions."},
    {"element_id": "2.B.1.c", "name": "Persuasion", "category": "Social Skills",
     "description": "Persuading others to change their minds or behavior."},
    {"element_id": "2.B.1.d", "name": "Negotiation", "category": "Social Skills",
     "description": "Bringing others together and trying to reconcile differences."},
    {"element_id": "2.B.1.e", "name": "Instructing", "category": "Social Skills",
     "description": "Teaching others how to do something."},
    {"element_id": "2.B.1.f", "name": "Service Orientation", "category": "Social Skills",
     "description": "Actively looking for ways to help people."},
    # Complex Problem Solving
    {"element_id": "2.B.2.i", "name": "Complex Problem Solving", "category": "Complex Problem Solving",
     "description": "Identifying complex problems and reviewing related information to develop and evaluate options and implement solutions."},
    # Technical Skills
    {"element_id": "2.B.3.a", "name": "Operations Analysis", "category": "Technical Skills",
     "description": "Analyzing needs and product requirements to create a design."},
    {"element_id": "2.B.3.b", "name": "Technology Design", "category": "Technical Skills",
     "description": "Generating or adapting equipment and technology to serve user needs."},
    {"element_id": "2.B.3.c", "name": "Equipment Selection", "category": "Technical Skills",
     "description": "Determining the kind of tools and equipment needed to do a job."},
    {"element_id": "2.B.3.d", "name": "Installation", "category": "Technical Skills",
     "description": "Installing equipment, machines, wiring, or programs to meet specifications."},
    {"element_id": "2.B.3.e", "name": "Programming", "category": "Technical Skills",
     "description": "Writing computer programs for various purposes."},
    {"element_id": "2.B.3.g", "name": "Operation and Control", "category": "Technical Skills",
     "description": "Controlling operations of equipment or systems."},
    {"element_id": "2.B.3.h", "name": "Operation Monitoring", "category": "Technical Skills",
     "description": "Watching gauges, dials, or other indicators to make sure a machine is working properly."},
    {"element_id": "2.B.3.j", "name": "Quality Control Analysis", "category": "Technical Skills",
     "description": "Conducting tests and inspections of products, services, or processes to evaluate quality or performance."},
    {"element_id": "2.B.3.k", "name": "Troubleshooting", "category": "Technical Skills",
     "description": "Determining causes of operating errors and deciding what to do about it."},
    {"element_id": "2.B.3.l", "name": "Repairing", "category": "Technical Skills",
     "description": "Repairing machines or systems using the needed tools."},
    {"element_id": "2.B.3.m", "name": "Equipment Maintenance", "category": "Technical Skills",
     "description": "Performing routine maintenance on equipment and determining when and what kind of maintenance is needed."},
    # Systems Skills
    {"element_id": "2.B.4.e", "name": "Judgment and Decision Making", "category": "Systems Skills",
     "description": "Considering the relative costs and benefits of potential actions to choose the most appropriate one."},
    {"element_id": "2.B.4.g", "name": "Systems Analysis", "category": "Systems Skills",
     "description": "Determining how a system should work and how changes in conditions, operations, and the environment will affect outcomes."},
    {"element_id": "2.B.4.h", "name": "Systems Evaluation", "category": "Systems Skills",
     "description": "Identifying measures or indicators of system performance and the actions needed to improve or correct performance, relative to the goals of the system."},
    # Resource Management Skills
    {"element_id": "2.B.5.a", "name": "Time Management", "category": "Resource Management Skills",
     "description": "Managing one's own time and the time of others."},
    {"element_id": "2.B.5.b", "name": "Management of Financial Resources", "category": "Resource Management Skills",
     "description": "Determining how money will be spent to get the work done, and accounting for these expenditures."},
    {"element_id": "2.B.5.c", "name": "Management of Material Resources", "category": "Resource Management Skills",
     "description": "Obtaining and seeing to the appropriate use of equipment, facilities, and materials needed to do certain work."},
    {"element_id": "2.B.5.d", "name": "Management of Personnel Resources", "category": "Resource Management Skills",
     "description": "Motivating, developing, and directing people as they work, identifying the best people for the job."},
]

SKILL_NAME_TO_ID = {s["name"]: s["element_id"] for s in ONET_SKILLS}
SKILL_ID_TO_NAME = {s["element_id"]: s["name"] for s in ONET_SKILLS}
ALL_SKILL_NAMES = [s["name"] for s in ONET_SKILLS]

# ═══════════════════════════════════════════════════════════════════════
# SYNTHETIC OCCUPATIONS — ~150 representative occupations
# ═══════════════════════════════════════════════════════════════════════

SYNTHETIC_OCCUPATIONS = [
    # ── 11-0000: Management Occupations ──
    {"onet_soc_code": "11-1011.00", "title": "Chief Executives", "description": "Determine and formulate policies and provide overall direction of companies or private and public sector organizations within guidelines set up by a board of directors or similar governing body.", "job_zone": 5, "major_group": "11-0000", "major_group_name": "Management Occupations", "alternate_titles": ["CEO", "Chief Executive Officer", "President", "Managing Director", "Executive Director"]},
    {"onet_soc_code": "11-1021.00", "title": "General and Operations Managers", "description": "Plan, direct, or coordinate the operations of public or private sector organizations, overseeing multiple departments or locations.", "job_zone": 4, "major_group": "11-0000", "major_group_name": "Management Occupations", "alternate_titles": ["Operations Manager", "General Manager", "Branch Manager", "Division Manager"]},
    {"onet_soc_code": "11-1031.00", "title": "Legislators", "description": "Develop, introduce, or enact laws and statutes at the local, tribal, state, or federal level.", "job_zone": 5, "major_group": "11-0000", "major_group_name": "Management Occupations", "alternate_titles": ["Senator", "Representative", "Council Member", "Legislator"]},
    {"onet_soc_code": "11-2021.00", "title": "Marketing Managers", "description": "Plan, direct, or coordinate marketing policies and programs, such as determining the demand for products and services offered by a firm and its competitors.", "job_zone": 4, "major_group": "11-0000", "major_group_name": "Management Occupations", "alternate_titles": ["Marketing Director", "Brand Manager", "VP of Marketing", "Growth Manager"]},
    {"onet_soc_code": "11-2022.00", "title": "Sales Managers", "description": "Plan, direct, or coordinate the actual distribution or movement of a product or service to the customer.", "job_zone": 4, "major_group": "11-0000", "major_group_name": "Management Occupations", "alternate_titles": ["Regional Sales Manager", "Sales Director", "VP of Sales", "Head of Sales"]},
    {"onet_soc_code": "11-3011.00", "title": "Administrative Services Managers", "description": "Plan, direct, or coordinate one or more administrative services of an organization, such as records management, mail distribution, and other office support services.", "job_zone": 4, "major_group": "11-0000", "major_group_name": "Management Occupations", "alternate_titles": ["Office Manager", "Administrative Director", "Facilities Manager"]},
    {"onet_soc_code": "11-3021.00", "title": "Computer and Information Systems Managers", "description": "Plan, direct, or coordinate activities in such fields as electronic data processing, information systems, systems analysis, and computer programming.", "job_zone": 5, "major_group": "11-0000", "major_group_name": "Management Occupations", "alternate_titles": ["IT Manager", "CTO", "IT Director", "VP of Engineering", "Head of Technology"]},
    {"onet_soc_code": "11-3031.00", "title": "Financial Managers", "description": "Plan, direct, or coordinate accounting, investing, banking, insurance, securities, and other financial activities of a branch, office, or department of an establishment.", "job_zone": 4, "major_group": "11-0000", "major_group_name": "Management Occupations", "alternate_titles": ["Finance Director", "CFO", "Controller", "Treasury Manager"]},
    {"onet_soc_code": "11-3051.00", "title": "Industrial Production Managers", "description": "Plan, direct, or coordinate the work activities and resources necessary for manufacturing products in accordance with cost, quality, and quantity specifications.", "job_zone": 4, "major_group": "11-0000", "major_group_name": "Management Occupations", "alternate_titles": ["Plant Manager", "Production Manager", "Manufacturing Manager"]},
    {"onet_soc_code": "11-3061.00", "title": "Purchasing Managers", "description": "Plan, direct, or coordinate the activities of buyers, purchasing officers, and related workers involved in purchasing materials, products, and services.", "job_zone": 4, "major_group": "11-0000", "major_group_name": "Management Occupations", "alternate_titles": ["Procurement Manager", "Supply Chain Manager", "Sourcing Manager"]},
    {"onet_soc_code": "11-3071.00", "title": "Transportation, Storage, and Distribution Managers", "description": "Plan, direct, or coordinate transportation, storage, or distribution activities in accordance with organizational policies and applicable government laws or regulations.", "job_zone": 4, "major_group": "11-0000", "major_group_name": "Management Occupations", "alternate_titles": ["Logistics Manager", "Distribution Manager", "Warehouse Manager"]},
    {"onet_soc_code": "11-3111.00", "title": "Compensation and Benefits Managers", "description": "Plan, direct, or coordinate compensation and benefits activities of an organization.", "job_zone": 4, "major_group": "11-0000", "major_group_name": "Management Occupations", "alternate_titles": ["Total Rewards Manager", "Benefits Director", "Compensation Director"]},
    {"onet_soc_code": "11-3121.00", "title": "Human Resources Managers", "description": "Plan, direct, or coordinate human resources activities and staff of an organization.", "job_zone": 4, "major_group": "11-0000", "major_group_name": "Management Occupations", "alternate_titles": ["HR Manager", "HR Director", "VP of People", "Chief People Officer", "Head of HR"]},
    {"onet_soc_code": "11-3131.00", "title": "Training and Development Managers", "description": "Plan, direct, or coordinate the training and development activities and staff of an organization.", "job_zone": 4, "major_group": "11-0000", "major_group_name": "Management Occupations", "alternate_titles": ["Learning and Development Manager", "L&D Director", "Training Director"]},
    {"onet_soc_code": "11-9013.00", "title": "Farmers, Ranchers, and Other Agricultural Managers", "description": "Plan, direct, or coordinate the management or operation of farms, ranches, greenhouses, aquacultural operations, nurseries, timber tracts, or other agricultural establishments.", "job_zone": 3, "major_group": "11-0000", "major_group_name": "Management Occupations", "alternate_titles": ["Farm Manager", "Ranch Manager", "Agricultural Operations Manager"]},
    {"onet_soc_code": "11-9021.00", "title": "Construction Managers", "description": "Plan, direct, or coordinate, usually through subordinate supervisory personnel, activities concerned with the construction and maintenance of structures, facilities, and systems.", "job_zone": 4, "major_group": "11-0000", "major_group_name": "Management Occupations", "alternate_titles": ["Project Manager", "Construction Superintendent", "Site Manager"]},

    # ── 13-0000: Business and Financial Operations ──
    {"onet_soc_code": "13-1011.00", "title": "Agents and Business Managers of Artists, Performers, and Athletes", "description": "Represent and promote artists, performers, and athletes in dealings with current or prospective employers.", "job_zone": 4, "major_group": "13-0000", "major_group_name": "Business and Financial Operations Occupations", "alternate_titles": ["Talent Agent", "Business Manager", "Artist Representative"]},
    {"onet_soc_code": "13-1041.00", "title": "Compliance Officers", "description": "Examine, evaluate, and investigate eligibility for or conformity with laws and regulations governing contract compliance.", "job_zone": 4, "major_group": "13-0000", "major_group_name": "Business and Financial Operations Occupations", "alternate_titles": ["Compliance Analyst", "Regulatory Compliance Specialist", "Compliance Manager"]},
    {"onet_soc_code": "13-1051.00", "title": "Cost Estimators", "description": "Prepare cost estimates for product manufacturing, construction projects, or services to aid management in bidding on or determining price of products or services.", "job_zone": 4, "major_group": "13-0000", "major_group_name": "Business and Financial Operations Occupations", "alternate_titles": ["Estimator", "Pricing Analyst", "Cost Analyst"]},
    {"onet_soc_code": "13-1071.00", "title": "Human Resources Specialists", "description": "Recruit, screen, interview, or place individuals within an organization. May perform other activities in multiple human resources areas.", "job_zone": 4, "major_group": "13-0000", "major_group_name": "Business and Financial Operations Occupations", "alternate_titles": ["HR Specialist", "Recruiter", "Talent Acquisition Specialist", "HR Generalist", "People Operations Specialist"]},
    {"onet_soc_code": "13-1081.00", "title": "Logisticians", "description": "Analyze and coordinate the ongoing logistical functions of a firm or organization. Responsible for the entire life cycle of a product, including acquisition, distribution, internal allocation, delivery, and final disposal of resources.", "job_zone": 4, "major_group": "13-0000", "major_group_name": "Business and Financial Operations Occupations", "alternate_titles": ["Supply Chain Analyst", "Logistics Coordinator", "Logistics Analyst"]},
    {"onet_soc_code": "13-1111.00", "title": "Management Analysts", "description": "Conduct organizational studies and evaluations, design systems and procedures, conduct work simplification and measurement studies, and prepare operations and procedures manuals.", "job_zone": 4, "major_group": "13-0000", "major_group_name": "Business and Financial Operations Occupations", "alternate_titles": ["Management Consultant", "Business Analyst", "Strategy Consultant", "Operations Analyst"]},
    {"onet_soc_code": "13-1141.00", "title": "Compensation, Benefits, and Job Analysis Specialists", "description": "Conduct programs of compensation and benefits and job analysis for employer. May specialize in specific areas, such as position classification and pension programs.", "job_zone": 4, "major_group": "13-0000", "major_group_name": "Business and Financial Operations Occupations", "alternate_titles": ["Compensation Analyst", "Benefits Analyst", "Job Analyst", "Total Rewards Analyst"]},
    {"onet_soc_code": "13-1151.00", "title": "Training and Development Specialists", "description": "Design or conduct work-related training and development programs to improve individual skills or organizational performance.", "job_zone": 4, "major_group": "13-0000", "major_group_name": "Business and Financial Operations Occupations", "alternate_titles": ["Training Specialist", "L&D Specialist", "Instructional Designer", "Corporate Trainer"]},
    {"onet_soc_code": "13-1161.00", "title": "Market Research Analysts and Marketing Specialists", "description": "Research conditions in local, regional, national, or online markets. Gather information to determine potential sales of a product or service.", "job_zone": 4, "major_group": "13-0000", "major_group_name": "Business and Financial Operations Occupations", "alternate_titles": ["Market Research Analyst", "Marketing Analyst", "Consumer Insights Analyst"]},
    {"onet_soc_code": "13-1199.00", "title": "Business Operations Specialists, All Other", "description": "All business operations specialists not listed separately.", "job_zone": 4, "major_group": "13-0000", "major_group_name": "Business and Financial Operations Occupations", "alternate_titles": ["Business Operations Analyst", "Project Coordinator", "Operations Specialist"]},
    {"onet_soc_code": "13-2011.00", "title": "Accountants and Auditors", "description": "Examine, analyze, and interpret accounting records to prepare financial statements, give advice, or audit and evaluate statements prepared by others.", "job_zone": 4, "major_group": "13-0000", "major_group_name": "Business and Financial Operations Occupations", "alternate_titles": ["Accountant", "Auditor", "CPA", "Staff Accountant", "Senior Accountant"]},
    {"onet_soc_code": "13-2041.00", "title": "Credit Analysts", "description": "Analyze credit data and financial statements of individuals or firms to determine the degree of risk involved in extending credit or lending money.", "job_zone": 4, "major_group": "13-0000", "major_group_name": "Business and Financial Operations Occupations", "alternate_titles": ["Credit Analyst", "Credit Risk Analyst", "Underwriter"]},
    {"onet_soc_code": "13-2051.00", "title": "Financial and Investment Analysts", "description": "Conduct quantitative analyses of information involving investment programs or financial data of public or private institutions.", "job_zone": 4, "major_group": "13-0000", "major_group_name": "Business and Financial Operations Occupations", "alternate_titles": ["Financial Analyst", "Investment Analyst", "Equity Research Analyst", "Portfolio Analyst"]},
    {"onet_soc_code": "13-2052.00", "title": "Personal Financial Advisors", "description": "Advise clients on financial plans using knowledge of tax and investment strategies, securities, insurance, pension plans, and real estate.", "job_zone": 4, "major_group": "13-0000", "major_group_name": "Business and Financial Operations Occupations", "alternate_titles": ["Financial Advisor", "Wealth Manager", "Financial Planner", "Investment Advisor"]},
    {"onet_soc_code": "13-2061.00", "title": "Financial Examiners", "description": "Enforce or ensure compliance with laws and regulations governing financial and securities institutions and transactions.", "job_zone": 4, "major_group": "13-0000", "major_group_name": "Business and Financial Operations Occupations", "alternate_titles": ["Bank Examiner", "Financial Examiner", "Regulatory Analyst"]},

    # ── 15-0000: Computer and Mathematical ──
    {"onet_soc_code": "15-1211.00", "title": "Computer Systems Analysts", "description": "Analyze science, engineering, business, and other data processing problems to develop and implement solutions to complex applications problems, system administration issues, or network concerns.", "job_zone": 4, "major_group": "15-0000", "major_group_name": "Computer and Mathematical Occupations", "alternate_titles": ["Systems Analyst", "IT Analyst", "Business Systems Analyst", "Technical Analyst"]},
    {"onet_soc_code": "15-1212.00", "title": "Information Security Analysts", "description": "Plan, implement, upgrade, or monitor security measures for the protection of computer networks and information.", "job_zone": 4, "major_group": "15-0000", "major_group_name": "Computer and Mathematical Occupations", "alternate_titles": ["Cybersecurity Analyst", "Security Engineer", "InfoSec Analyst", "SOC Analyst"]},
    {"onet_soc_code": "15-1221.00", "title": "Computer and Information Research Scientists", "description": "Conduct research into fundamental computer and information science as theorists, designers, or inventors.", "job_zone": 5, "major_group": "15-0000", "major_group_name": "Computer and Mathematical Occupations", "alternate_titles": ["Research Scientist", "Computer Scientist", "AI Research Scientist"]},
    {"onet_soc_code": "15-1231.00", "title": "Computer Network Support Specialists", "description": "Analyze, test, troubleshoot, and evaluate existing network systems, such as local area networks, wide area networks, cloud networks, and Internet systems.", "job_zone": 3, "major_group": "15-0000", "major_group_name": "Computer and Mathematical Occupations", "alternate_titles": ["Network Support Specialist", "Network Technician", "Network Administrator"]},
    {"onet_soc_code": "15-1232.00", "title": "Computer User Support Specialists", "description": "Provide technical assistance to computer users. Answer questions or resolve computer problems for clients in person, via telephone, or electronically.", "job_zone": 3, "major_group": "15-0000", "major_group_name": "Computer and Mathematical Occupations", "alternate_titles": ["Help Desk Technician", "IT Support Specialist", "Desktop Support Analyst", "Technical Support Specialist"]},
    {"onet_soc_code": "15-1241.00", "title": "Computer Network Architects", "description": "Design and implement computer and information networks, such as local area networks, wide area networks, intranets, extranets, and other data communications networks.", "job_zone": 4, "major_group": "15-0000", "major_group_name": "Computer and Mathematical Occupations", "alternate_titles": ["Network Architect", "Network Engineer", "Cloud Architect", "Solutions Architect"]},
    {"onet_soc_code": "15-1242.00", "title": "Database Administrators", "description": "Administer, test, and implement computer databases, applying knowledge of database management systems.", "job_zone": 4, "major_group": "15-0000", "major_group_name": "Computer and Mathematical Occupations", "alternate_titles": ["DBA", "Database Administrator", "Database Engineer", "Data Engineer"]},
    {"onet_soc_code": "15-1243.00", "title": "Database Architects", "description": "Design strategies for enterprise databases, data warehouse systems, and multidimensional networks.", "job_zone": 4, "major_group": "15-0000", "major_group_name": "Computer and Mathematical Occupations", "alternate_titles": ["Data Architect", "Database Designer", "Enterprise Data Architect"]},
    {"onet_soc_code": "15-1244.00", "title": "Network and Computer Systems Administrators", "description": "Install, configure, and maintain an organization's local area network, wide area network, data communications network, operating systems, and physical and virtual servers.", "job_zone": 4, "major_group": "15-0000", "major_group_name": "Computer and Mathematical Occupations", "alternate_titles": ["System Administrator", "Sysadmin", "Network Administrator", "IT Administrator"]},
    {"onet_soc_code": "15-1251.00", "title": "Computer Programmers", "description": "Create, modify, and test the code and scripts that allow computer software applications to function properly.", "job_zone": 4, "major_group": "15-0000", "major_group_name": "Computer and Mathematical Occupations", "alternate_titles": ["Programmer", "Coder", "Application Programmer", "Software Programmer"]},
    {"onet_soc_code": "15-1252.00", "title": "Software Developers", "description": "Research, design, and develop computer and network software or specialized utility programs. Analyze user needs and develop software solutions, applying principles and techniques of computer science, engineering, and mathematical analysis.", "job_zone": 4, "major_group": "15-0000", "major_group_name": "Computer and Mathematical Occupations", "alternate_titles": ["Software Engineer", "Application Developer", "Systems Developer", "Backend Developer", "Full Stack Developer"]},
    {"onet_soc_code": "15-1253.00", "title": "Software Quality Assurance Analysts and Testers", "description": "Develop and execute software tests to identify software problems and their causes.", "job_zone": 4, "major_group": "15-0000", "major_group_name": "Computer and Mathematical Occupations", "alternate_titles": ["QA Analyst", "QA Engineer", "Test Engineer", "SDET", "Software Tester"]},
    {"onet_soc_code": "15-1254.00", "title": "Web Developers", "description": "Develop and implement websites, web applications, application databases, and interactive web interfaces.", "job_zone": 3, "major_group": "15-0000", "major_group_name": "Computer and Mathematical Occupations", "alternate_titles": ["Web Developer", "Frontend Developer", "Web Designer", "UI Developer"]},
    {"onet_soc_code": "15-1255.00", "title": "Web and Digital Interface Designers", "description": "Design digital user interfaces or websites. Develop and test layouts, interfaces, functionality, and navigation for usability.", "job_zone": 4, "major_group": "15-0000", "major_group_name": "Computer and Mathematical Occupations", "alternate_titles": ["UX Designer", "UI/UX Designer", "Product Designer", "Interaction Designer"]},
    {"onet_soc_code": "15-2011.00", "title": "Actuaries", "description": "Analyze statistical data, such as mortality, accident, sickness, disability, and retirement rates and construct probability tables to forecast risk and liability for payment of future benefits.", "job_zone": 5, "major_group": "15-0000", "major_group_name": "Computer and Mathematical Occupations", "alternate_titles": ["Actuary", "Actuarial Analyst", "Pricing Actuary"]},
    {"onet_soc_code": "15-2031.00", "title": "Operations Research Analysts", "description": "Formulate and apply mathematical modeling and other optimizing methods to develop and interpret information that assists management with decision making.", "job_zone": 5, "major_group": "15-0000", "major_group_name": "Computer and Mathematical Occupations", "alternate_titles": ["Operations Research Analyst", "Data Scientist", "Quantitative Analyst"]},
    {"onet_soc_code": "15-2041.00", "title": "Statisticians", "description": "Develop or apply mathematical or statistical theory and methods to collect, organize, interpret, and summarize numerical data to provide usable information.", "job_zone": 5, "major_group": "15-0000", "major_group_name": "Computer and Mathematical Occupations", "alternate_titles": ["Statistician", "Biostatistician", "Statistical Analyst"]},
    {"onet_soc_code": "15-2051.00", "title": "Data Scientists", "description": "Develop and implement a set of techniques or analytics applications to transform raw data into meaningful information using data-oriented programming languages and visualization software.", "job_zone": 5, "major_group": "15-0000", "major_group_name": "Computer and Mathematical Occupations", "alternate_titles": ["Data Scientist", "Machine Learning Engineer", "AI Engineer", "ML Scientist"]},

    # ── 17-0000: Architecture and Engineering ──
    {"onet_soc_code": "17-1011.00", "title": "Architects, Except Landscape and Naval", "description": "Plan and design structures, such as private residences, office buildings, theaters, factories, and other structural property.", "job_zone": 5, "major_group": "17-0000", "major_group_name": "Architecture and Engineering Occupations", "alternate_titles": ["Architect", "Building Architect", "Design Architect", "Project Architect"]},
    {"onet_soc_code": "17-2011.00", "title": "Aerospace Engineers", "description": "Perform engineering duties in designing, constructing, and testing aircraft, missiles, and spacecraft.", "job_zone": 5, "major_group": "17-0000", "major_group_name": "Architecture and Engineering Occupations", "alternate_titles": ["Aerospace Engineer", "Flight Systems Engineer", "Propulsion Engineer"]},
    {"onet_soc_code": "17-2051.00", "title": "Civil Engineers", "description": "Perform engineering duties in planning, designing, and overseeing construction and maintenance of building structures and facilities.", "job_zone": 4, "major_group": "17-0000", "major_group_name": "Architecture and Engineering Occupations", "alternate_titles": ["Civil Engineer", "Structural Engineer", "Transportation Engineer"]},
    {"onet_soc_code": "17-2071.00", "title": "Electrical Engineers", "description": "Research, design, develop, test, or supervise the manufacturing and installation of electrical equipment, components, or systems.", "job_zone": 4, "major_group": "17-0000", "major_group_name": "Architecture and Engineering Occupations", "alternate_titles": ["Electrical Engineer", "Power Systems Engineer", "Controls Engineer"]},
    {"onet_soc_code": "17-2112.00", "title": "Industrial Engineers", "description": "Design, develop, test, and evaluate integrated systems for managing industrial production processes.", "job_zone": 4, "major_group": "17-0000", "major_group_name": "Architecture and Engineering Occupations", "alternate_titles": ["Industrial Engineer", "Process Engineer", "Manufacturing Engineer", "Lean Engineer"]},
    {"onet_soc_code": "17-2141.00", "title": "Mechanical Engineers", "description": "Perform engineering duties in planning and designing tools, engines, machines, and other mechanically functioning equipment.", "job_zone": 4, "major_group": "17-0000", "major_group_name": "Architecture and Engineering Occupations", "alternate_titles": ["Mechanical Engineer", "Design Engineer", "Product Engineer"]},
    {"onet_soc_code": "17-2199.00", "title": "Engineers, All Other", "description": "All engineers not listed separately.", "job_zone": 4, "major_group": "17-0000", "major_group_name": "Architecture and Engineering Occupations", "alternate_titles": ["Engineer", "Systems Engineer", "R&D Engineer"]},
    {"onet_soc_code": "17-3011.00", "title": "Architectural and Civil Drafters", "description": "Prepare detailed drawings of architectural and structural features of buildings or drawings and topographical relief maps.", "job_zone": 3, "major_group": "17-0000", "major_group_name": "Architecture and Engineering Occupations", "alternate_titles": ["Drafter", "CAD Technician", "Architectural Drafter"]},
    {"onet_soc_code": "17-2061.00", "title": "Computer Hardware Engineers", "description": "Research, design, develop, or test computer or computer-related equipment for commercial, industrial, military, or scientific use.", "job_zone": 4, "major_group": "17-0000", "major_group_name": "Architecture and Engineering Occupations", "alternate_titles": ["Hardware Engineer", "Embedded Systems Engineer", "ASIC Engineer"]},
    {"onet_soc_code": "17-2081.00", "title": "Environmental Engineers", "description": "Research, design, plan, or perform engineering duties in the prevention, control, and remediation of environmental hazards.", "job_zone": 4, "major_group": "17-0000", "major_group_name": "Architecture and Engineering Occupations", "alternate_titles": ["Environmental Engineer", "Sustainability Engineer", "Water Resources Engineer"]},

    # ── 19-0000: Life, Physical, and Social Science ──
    {"onet_soc_code": "19-1042.00", "title": "Medical Scientists, Except Epidemiologists", "description": "Conduct research dealing with the understanding of human diseases and the improvement of human health.", "job_zone": 5, "major_group": "19-0000", "major_group_name": "Life, Physical, and Social Science Occupations", "alternate_titles": ["Medical Researcher", "Research Scientist", "Clinical Researcher"]},
    {"onet_soc_code": "19-2012.00", "title": "Physicists", "description": "Conduct research into physical phenomena, develop theories on the basis of observation and experiments, and devise methods to apply physical laws and theories.", "job_zone": 5, "major_group": "19-0000", "major_group_name": "Life, Physical, and Social Science Occupations", "alternate_titles": ["Physicist", "Research Physicist", "Applied Physicist"]},
    {"onet_soc_code": "19-2031.00", "title": "Chemists", "description": "Conduct qualitative and quantitative chemical analyses or experiments in laboratories for quality or process control or to develop new products or knowledge.", "job_zone": 4, "major_group": "19-0000", "major_group_name": "Life, Physical, and Social Science Occupations", "alternate_titles": ["Chemist", "Analytical Chemist", "Research Chemist"]},
    {"onet_soc_code": "19-3011.00", "title": "Economists", "description": "Conduct research, prepare reports, or formulate plans to address economic problems related to the production and distribution of goods and services.", "job_zone": 5, "major_group": "19-0000", "major_group_name": "Life, Physical, and Social Science Occupations", "alternate_titles": ["Economist", "Economic Analyst", "Research Economist"]},
    {"onet_soc_code": "19-3032.00", "title": "Industrial-Organizational Psychologists", "description": "Apply principles of psychology to human resources, administration, management, sales, and marketing problems.", "job_zone": 5, "major_group": "19-0000", "major_group_name": "Life, Physical, and Social Science Occupations", "alternate_titles": ["I/O Psychologist", "Organizational Psychologist", "People Scientist"]},

    # ── 21-0000: Community and Social Service ──
    {"onet_soc_code": "21-1012.00", "title": "Educational, Guidance, and Career Counselors and Advisors", "description": "Advise and assist students and provide educational and vocational guidance services.", "job_zone": 5, "major_group": "21-0000", "major_group_name": "Community and Social Service Occupations", "alternate_titles": ["Career Counselor", "Academic Advisor", "Guidance Counselor"]},
    {"onet_soc_code": "21-1014.00", "title": "Mental Health Counselors", "description": "Counsel individuals, groups, or families to help them understand problems, deal with crisis situations, define goals, and develop realistic action plans.", "job_zone": 5, "major_group": "21-0000", "major_group_name": "Community and Social Service Occupations", "alternate_titles": ["Mental Health Counselor", "Therapist", "Licensed Counselor"]},
    {"onet_soc_code": "21-1021.00", "title": "Child, Family, and School Social Workers", "description": "Provide social services and assistance to improve the social and psychological functioning of children and their families.", "job_zone": 4, "major_group": "21-0000", "major_group_name": "Community and Social Service Occupations", "alternate_titles": ["Social Worker", "Case Manager", "Family Services Specialist"]},
    {"onet_soc_code": "21-1093.00", "title": "Social and Human Service Assistants", "description": "Assist in providing client services in a wide variety of fields, such as psychology, rehabilitation, or social work.", "job_zone": 3, "major_group": "21-0000", "major_group_name": "Community and Social Service Occupations", "alternate_titles": ["Case Management Aide", "Human Services Assistant", "Social Services Assistant"]},
    {"onet_soc_code": "21-1091.00", "title": "Health Education Specialists", "description": "Provide and manage health education programs that help individuals, families, and their communities maximize and maintain healthy lifestyles.", "job_zone": 4, "major_group": "21-0000", "major_group_name": "Community and Social Service Occupations", "alternate_titles": ["Health Educator", "Community Health Worker", "Wellness Coordinator"]},

    # ── 23-0000: Legal ──
    {"onet_soc_code": "23-1011.00", "title": "Lawyers", "description": "Represent clients in criminal and civil litigation and other legal proceedings, draw up legal documents, or manage or advise clients on legal transactions.", "job_zone": 5, "major_group": "23-0000", "major_group_name": "Legal Occupations", "alternate_titles": ["Attorney", "Lawyer", "Legal Counsel", "Litigator", "Corporate Attorney"]},
    {"onet_soc_code": "23-1012.00", "title": "Judicial Law Clerks", "description": "Assist judges in court by researching legal questions and drafting memoranda, opinions, or orders.", "job_zone": 5, "major_group": "23-0000", "major_group_name": "Legal Occupations", "alternate_titles": ["Law Clerk", "Judicial Clerk"]},
    {"onet_soc_code": "23-2011.00", "title": "Paralegals and Legal Assistants", "description": "Assist lawyers by investigating facts, preparing legal documents, or researching legal precedent.", "job_zone": 3, "major_group": "23-0000", "major_group_name": "Legal Occupations", "alternate_titles": ["Paralegal", "Legal Assistant", "Legal Secretary"]},
    {"onet_soc_code": "23-1021.00", "title": "Administrative Law Judges, Adjudicators, and Hearing Officers", "description": "Conduct hearings to recommend or make decisions on claims concerning government programs or other government-related matters.", "job_zone": 5, "major_group": "23-0000", "major_group_name": "Legal Occupations", "alternate_titles": ["Administrative Law Judge", "Hearing Officer", "Adjudicator"]},
    {"onet_soc_code": "23-1022.00", "title": "Arbitrators, Mediators, and Conciliators", "description": "Facilitate negotiation and conflict resolution through dialogue.", "job_zone": 5, "major_group": "23-0000", "major_group_name": "Legal Occupations", "alternate_titles": ["Mediator", "Arbitrator", "Dispute Resolution Specialist"]},

    # ── 25-0000: Educational Instruction and Library ──
    {"onet_soc_code": "25-1011.00", "title": "Business Teachers, Postsecondary", "description": "Teach courses in business administration and management, such as accounting, finance, human resources, and marketing.", "job_zone": 5, "major_group": "25-0000", "major_group_name": "Educational Instruction and Library Occupations", "alternate_titles": ["Business Professor", "Accounting Professor", "Finance Professor"]},
    {"onet_soc_code": "25-2021.00", "title": "Elementary School Teachers, Except Special Education", "description": "Teach students basic academic, social, and other formative skills in public or private schools at the elementary level.", "job_zone": 4, "major_group": "25-0000", "major_group_name": "Educational Instruction and Library Occupations", "alternate_titles": ["Elementary Teacher", "Primary School Teacher", "Grade School Teacher"]},
    {"onet_soc_code": "25-2031.00", "title": "Secondary School Teachers, Except Special and Career/Technical Education", "description": "Teach one or more subjects to students at the secondary school level.", "job_zone": 4, "major_group": "25-0000", "major_group_name": "Educational Instruction and Library Occupations", "alternate_titles": ["High School Teacher", "Secondary Teacher"]},
    {"onet_soc_code": "25-3021.00", "title": "Self-Enrichment Teachers", "description": "Teach or instruct individuals or groups for the primary purpose of self-enrichment or recreation.", "job_zone": 3, "major_group": "25-0000", "major_group_name": "Educational Instruction and Library Occupations", "alternate_titles": ["Workshop Instructor", "Training Facilitator", "Adult Education Teacher"]},
    {"onet_soc_code": "25-4022.00", "title": "Librarians and Media Collections Specialists", "description": "Administer and maintain libraries or collections of information, for public access or for organizational use.", "job_zone": 5, "major_group": "25-0000", "major_group_name": "Educational Instruction and Library Occupations", "alternate_titles": ["Librarian", "Media Specialist", "Information Specialist"]},

    # ── 27-0000: Arts, Design, Entertainment, Sports, Media ──
    {"onet_soc_code": "27-1011.00", "title": "Art Directors", "description": "Formulate design concepts and presentation approaches for visual communications media, such as print, broadcasting, and advertising.", "job_zone": 4, "major_group": "27-0000", "major_group_name": "Arts, Design, Entertainment, Sports, and Media Occupations", "alternate_titles": ["Art Director", "Creative Director", "Design Director"]},
    {"onet_soc_code": "27-1024.00", "title": "Graphic Designers", "description": "Design or create graphics to meet specific commercial or promotional needs, such as packaging, displays, or logos.", "job_zone": 4, "major_group": "27-0000", "major_group_name": "Arts, Design, Entertainment, Sports, and Media Occupations", "alternate_titles": ["Graphic Designer", "Visual Designer", "Brand Designer"]},
    {"onet_soc_code": "27-2012.00", "title": "Producers and Directors", "description": "Produce or direct stage, television, radio, video, or film productions for entertainment, information, or instruction.", "job_zone": 4, "major_group": "27-0000", "major_group_name": "Arts, Design, Entertainment, Sports, and Media Occupations", "alternate_titles": ["Producer", "Director", "Content Producer"]},
    {"onet_soc_code": "27-3031.00", "title": "Public Relations Specialists", "description": "Promote or create an intended public image for individuals, groups, or organizations.", "job_zone": 4, "major_group": "27-0000", "major_group_name": "Arts, Design, Entertainment, Sports, and Media Occupations", "alternate_titles": ["PR Specialist", "Communications Specialist", "Media Relations Specialist"]},
    {"onet_soc_code": "27-3041.00", "title": "Editors", "description": "Plan, coordinate, revise, or edit written material. May review proposals and drafts for possible publication.", "job_zone": 4, "major_group": "27-0000", "major_group_name": "Arts, Design, Entertainment, Sports, and Media Occupations", "alternate_titles": ["Editor", "Managing Editor", "Content Editor", "Copy Editor"]},

    # ── 29-0000: Healthcare Practitioners and Technical ──
    {"onet_soc_code": "29-1141.00", "title": "Registered Nurses", "description": "Assess patient health problems and needs, develop and implement nursing care plans, and maintain medical records.", "job_zone": 4, "major_group": "29-0000", "major_group_name": "Healthcare Practitioners and Technical Occupations", "alternate_titles": ["Registered Nurse", "RN", "Staff Nurse", "Clinical Nurse"]},
    {"onet_soc_code": "29-1171.00", "title": "Nurse Practitioners", "description": "Diagnose and treat acute, episodic, or chronic illness, independently or as part of a healthcare team.", "job_zone": 5, "major_group": "29-0000", "major_group_name": "Healthcare Practitioners and Technical Occupations", "alternate_titles": ["Nurse Practitioner", "NP", "Advanced Practice Nurse", "APRN"]},
    {"onet_soc_code": "29-1215.00", "title": "Family Medicine Physicians", "description": "Diagnose, treat, and help prevent diseases and injuries that commonly occur in the general population.", "job_zone": 5, "major_group": "29-0000", "major_group_name": "Healthcare Practitioners and Technical Occupations", "alternate_titles": ["Family Doctor", "Primary Care Physician", "Family Medicine Doctor"]},
    {"onet_soc_code": "29-1228.00", "title": "Physicians, All Other; and Ophthalmologists, Except Pediatric", "description": "Diagnose and treat diseases and injuries, prescribe medications, and direct patient care.", "job_zone": 5, "major_group": "29-0000", "major_group_name": "Healthcare Practitioners and Technical Occupations", "alternate_titles": ["Physician", "Doctor", "Medical Doctor", "Specialist Physician"]},
    {"onet_soc_code": "29-1051.00", "title": "Pharmacists", "description": "Dispense drugs prescribed by physicians and other health practitioners and provide information to patients about medications and their use.", "job_zone": 5, "major_group": "29-0000", "major_group_name": "Healthcare Practitioners and Technical Occupations", "alternate_titles": ["Pharmacist", "Clinical Pharmacist", "Staff Pharmacist"]},
    {"onet_soc_code": "29-1021.00", "title": "Dentists, General", "description": "Examine, diagnose, and treat diseases, injuries, and malformations of teeth and gums.", "job_zone": 5, "major_group": "29-0000", "major_group_name": "Healthcare Practitioners and Technical Occupations", "alternate_titles": ["Dentist", "General Dentist", "DDS"]},
    {"onet_soc_code": "29-1123.00", "title": "Physical Therapists", "description": "Assess, plan, organize, and participate in rehabilitative programs that improve mobility, relieve pain, increase strength, and improve or correct disabling conditions.", "job_zone": 5, "major_group": "29-0000", "major_group_name": "Healthcare Practitioners and Technical Occupations", "alternate_titles": ["Physical Therapist", "PT", "Physiotherapist"]},
    {"onet_soc_code": "29-2010.00", "title": "Clinical Laboratory Technologists and Technicians", "description": "Perform complex medical laboratory tests for diagnosis, treatment, and prevention of disease.", "job_zone": 4, "major_group": "29-0000", "major_group_name": "Healthcare Practitioners and Technical Occupations", "alternate_titles": ["Lab Technologist", "Medical Lab Technician", "Clinical Lab Scientist"]},
    {"onet_soc_code": "29-2034.00", "title": "Radiologic Technologists and Technicians", "description": "Take x-rays and CAT scans or administer nonradioactive materials into patient's bloodstream for diagnostic or therapeutic purposes.", "job_zone": 3, "major_group": "29-0000", "major_group_name": "Healthcare Practitioners and Technical Occupations", "alternate_titles": ["Radiologic Technologist", "X-Ray Technician", "CT Technologist"]},
    {"onet_soc_code": "29-1071.00", "title": "Physician Assistants", "description": "Provide healthcare services typically performed by a physician, under the supervision of a physician.", "job_zone": 5, "major_group": "29-0000", "major_group_name": "Healthcare Practitioners and Technical Occupations", "alternate_titles": ["Physician Assistant", "PA", "PA-C"]},

    # ── 31-0000: Healthcare Support ──
    {"onet_soc_code": "31-1120.00", "title": "Home Health and Personal Care Aides", "description": "Assist patients in their homes or in residential care facilities with personal care and related tasks.", "job_zone": 2, "major_group": "31-0000", "major_group_name": "Healthcare Support Occupations", "alternate_titles": ["Home Health Aide", "Personal Care Aide", "Caregiver"]},
    {"onet_soc_code": "31-1131.00", "title": "Nursing Assistants", "description": "Provide or assist with basic care or support under the direction of onsite licensed nursing staff.", "job_zone": 2, "major_group": "31-0000", "major_group_name": "Healthcare Support Occupations", "alternate_titles": ["CNA", "Certified Nursing Assistant", "Nurse Aide"]},
    {"onet_soc_code": "31-9091.00", "title": "Dental Assistants", "description": "Assist dentist, set up equipment, prepare patient for treatment, and keep records.", "job_zone": 3, "major_group": "31-0000", "major_group_name": "Healthcare Support Occupations", "alternate_titles": ["Dental Assistant", "Chair-side Assistant"]},
    {"onet_soc_code": "31-9092.00", "title": "Medical Assistants", "description": "Perform administrative and certain clinical duties under the direction of a physician.", "job_zone": 3, "major_group": "31-0000", "major_group_name": "Healthcare Support Occupations", "alternate_titles": ["Medical Assistant", "Clinical Assistant", "MA"]},
    {"onet_soc_code": "31-9097.00", "title": "Phlebotomists", "description": "Draw blood for tests, transfusions, donations, or research.", "job_zone": 3, "major_group": "31-0000", "major_group_name": "Healthcare Support Occupations", "alternate_titles": ["Phlebotomist", "Phlebotomy Technician"]},

    # ── 33-0000: Protective Service ──
    {"onet_soc_code": "33-1012.00", "title": "First-Line Supervisors of Police and Detectives", "description": "Directly supervise and coordinate activities of members of police force.", "job_zone": 4, "major_group": "33-0000", "major_group_name": "Protective Service Occupations", "alternate_titles": ["Police Sergeant", "Police Lieutenant", "Watch Commander"]},
    {"onet_soc_code": "33-3051.00", "title": "Police and Sheriff's Patrol Officers", "description": "Maintain order and protect life and property by enforcing local, tribal, state, or federal laws and ordinances.", "job_zone": 3, "major_group": "33-0000", "major_group_name": "Protective Service Occupations", "alternate_titles": ["Police Officer", "Patrol Officer", "Law Enforcement Officer"]},
    {"onet_soc_code": "33-9032.00", "title": "Security Guards", "description": "Guard, patrol, or monitor premises to prevent theft, violence, or infractions of rules.", "job_zone": 2, "major_group": "33-0000", "major_group_name": "Protective Service Occupations", "alternate_titles": ["Security Guard", "Security Officer", "Loss Prevention Officer"]},

    # ── 35-0000: Food Preparation and Serving ──
    {"onet_soc_code": "35-1012.00", "title": "First-Line Supervisors of Food Preparation and Serving Workers", "description": "Directly supervise and coordinate activities of workers engaged in preparing and serving food.", "job_zone": 2, "major_group": "35-0000", "major_group_name": "Food Preparation and Serving Related Occupations", "alternate_titles": ["Restaurant Manager", "Kitchen Manager", "Food Service Supervisor"]},
    {"onet_soc_code": "35-2014.00", "title": "Cooks, Restaurant", "description": "Prepare, season, and cook dishes such as soups, meats, vegetables, or desserts in restaurants.", "job_zone": 2, "major_group": "35-0000", "major_group_name": "Food Preparation and Serving Related Occupations", "alternate_titles": ["Cook", "Line Cook", "Chef"]},
    {"onet_soc_code": "35-3031.00", "title": "Waiters and Waitresses", "description": "Take orders and serve food and beverages to patrons at tables in dining establishment.", "job_zone": 1, "major_group": "35-0000", "major_group_name": "Food Preparation and Serving Related Occupations", "alternate_titles": ["Server", "Waiter", "Waitress"]},

    # ── 37-0000: Building and Grounds Cleaning and Maintenance ──
    {"onet_soc_code": "37-1011.00", "title": "First-Line Supervisors of Housekeeping and Janitorial Workers", "description": "Directly supervise and coordinate work activities of cleaning personnel in hotels, hospitals, offices, and other establishments.", "job_zone": 2, "major_group": "37-0000", "major_group_name": "Building and Grounds Cleaning and Maintenance Occupations", "alternate_titles": ["Housekeeping Supervisor", "Janitorial Supervisor", "Custodial Manager"]},
    {"onet_soc_code": "37-2011.00", "title": "Janitors and Cleaners, Except Maids and Housekeeping Cleaners", "description": "Keep buildings in clean and orderly condition.", "job_zone": 1, "major_group": "37-0000", "major_group_name": "Building and Grounds Cleaning and Maintenance Occupations", "alternate_titles": ["Janitor", "Custodian", "Building Cleaner"]},
    {"onet_soc_code": "37-3011.00", "title": "Landscaping and Groundskeeping Workers", "description": "Landscape or maintain grounds of property using hand or power tools or equipment.", "job_zone": 1, "major_group": "37-0000", "major_group_name": "Building and Grounds Cleaning and Maintenance Occupations", "alternate_titles": ["Groundskeeper", "Landscaper", "Lawn Care Worker"]},

    # ── 41-0000: Sales and Related ──
    {"onet_soc_code": "41-1011.00", "title": "First-Line Supervisors of Retail Sales Workers", "description": "Directly supervise and coordinate activities of retail sales workers in an establishment or department.", "job_zone": 3, "major_group": "41-0000", "major_group_name": "Sales and Related Occupations", "alternate_titles": ["Retail Manager", "Store Manager", "Department Manager"]},
    {"onet_soc_code": "41-1012.00", "title": "First-Line Supervisors of Non-Retail Sales Workers", "description": "Directly supervise and coordinate activities of sales workers other than retail sales workers.", "job_zone": 3, "major_group": "41-0000", "major_group_name": "Sales and Related Occupations", "alternate_titles": ["Sales Supervisor", "Sales Team Lead", "District Sales Manager"]},
    {"onet_soc_code": "41-2031.00", "title": "Retail Salespersons", "description": "Sell merchandise, such as furniture, motor vehicles, appliances, or apparel to consumers.", "job_zone": 2, "major_group": "41-0000", "major_group_name": "Sales and Related Occupations", "alternate_titles": ["Retail Sales Associate", "Sales Associate", "Sales Representative"]},
    {"onet_soc_code": "41-3011.00", "title": "Advertising Sales Agents", "description": "Sell or solicit advertising space, time, or media in publications, signage, TV, radio, or on the Internet.", "job_zone": 3, "major_group": "41-0000", "major_group_name": "Sales and Related Occupations", "alternate_titles": ["Ad Sales Representative", "Media Sales Agent", "Account Executive"]},
    {"onet_soc_code": "41-3021.00", "title": "Insurance Sales Agents", "description": "Sell life, property, casualty, health, automotive, or other types of insurance.", "job_zone": 3, "major_group": "41-0000", "major_group_name": "Sales and Related Occupations", "alternate_titles": ["Insurance Agent", "Insurance Broker", "Insurance Sales Representative"]},
    {"onet_soc_code": "41-3031.00", "title": "Securities, Commodities, and Financial Services Sales Agents", "description": "Buy and sell securities or commodities in investment and trading firms, or provide financial services to businesses and individuals.", "job_zone": 4, "major_group": "41-0000", "major_group_name": "Sales and Related Occupations", "alternate_titles": ["Financial Services Representative", "Stockbroker", "Trader", "Investment Banker"]},
    {"onet_soc_code": "41-4012.00", "title": "Sales Representatives, Wholesale and Manufacturing, Except Technical and Scientific Products", "description": "Sell goods for wholesalers or manufacturers to businesses or groups of individuals.", "job_zone": 3, "major_group": "41-0000", "major_group_name": "Sales and Related Occupations", "alternate_titles": ["Sales Representative", "Account Manager", "Territory Manager"]},
    {"onet_soc_code": "41-9031.00", "title": "Sales Engineers", "description": "Sell business goods or services, the selling of which requires a technical background equivalent to a baccalaureate degree in engineering.", "job_zone": 4, "major_group": "41-0000", "major_group_name": "Sales and Related Occupations", "alternate_titles": ["Sales Engineer", "Solutions Engineer", "Pre-Sales Engineer", "Technical Account Manager"]},
    {"onet_soc_code": "41-9011.00", "title": "Demonstrators and Product Promoters", "description": "Demonstrate merchandise and answer questions for the purpose of creating public interest in buying the product.", "job_zone": 2, "major_group": "41-0000", "major_group_name": "Sales and Related Occupations", "alternate_titles": ["Product Demonstrator", "Brand Ambassador", "Promoter"]},
    {"onet_soc_code": "41-3091.00", "title": "Sales Representatives of Services, Except Advertising, Insurance, Financial Services, and Travel", "description": "Sell services to individuals or businesses. May describe options or resolve client problems.", "job_zone": 3, "major_group": "41-0000", "major_group_name": "Sales and Related Occupations", "alternate_titles": ["Account Executive", "Business Development Representative", "BDR", "SDR"]},

    # ── 43-0000: Office and Administrative Support ──
    {"onet_soc_code": "43-1011.00", "title": "First-Line Supervisors of Office and Administrative Support Workers", "description": "Directly supervise and coordinate the activities of clerical and administrative support workers.", "job_zone": 3, "major_group": "43-0000", "major_group_name": "Office and Administrative Support Occupations", "alternate_titles": ["Office Supervisor", "Administrative Supervisor", "Team Lead"]},
    {"onet_soc_code": "43-3031.00", "title": "Bookkeeping, Accounting, and Auditing Clerks", "description": "Compute, classify, and record numerical data to keep financial records complete.", "job_zone": 3, "major_group": "43-0000", "major_group_name": "Office and Administrative Support Occupations", "alternate_titles": ["Bookkeeper", "Accounting Clerk", "Accounts Payable Clerk"]},
    {"onet_soc_code": "43-4051.00", "title": "Customer Service Representatives", "description": "Interact with customers to provide basic or scripted information in response to routine inquiries about products and services.", "job_zone": 2, "major_group": "43-0000", "major_group_name": "Office and Administrative Support Occupations", "alternate_titles": ["Customer Service Rep", "CSR", "Client Services Representative", "Support Agent"]},
    {"onet_soc_code": "43-4171.00", "title": "Receptionists and Information Clerks", "description": "Answer inquiries and provide information to the general public, customers, visitors, and other interested parties.", "job_zone": 2, "major_group": "43-0000", "major_group_name": "Office and Administrative Support Occupations", "alternate_titles": ["Receptionist", "Front Desk Clerk", "Information Clerk"]},
    {"onet_soc_code": "43-5061.00", "title": "Production, Planning, and Expediting Clerks", "description": "Coordinate and expedite the flow of work and materials within or between departments according to production schedules.", "job_zone": 3, "major_group": "43-0000", "major_group_name": "Office and Administrative Support Occupations", "alternate_titles": ["Production Planner", "Material Coordinator", "Scheduler"]},
    {"onet_soc_code": "43-6011.00", "title": "Executive Secretaries and Executive Administrative Assistants", "description": "Provide high-level administrative support by conducting research, preparing statistical reports, and handling information requests.", "job_zone": 3, "major_group": "43-0000", "major_group_name": "Office and Administrative Support Occupations", "alternate_titles": ["Executive Assistant", "Executive Secretary", "Administrative Assistant", "EA"]},
    {"onet_soc_code": "43-6014.00", "title": "Secretaries and Administrative Assistants, Except Legal, Medical, and Executive", "description": "Perform routine administrative functions such as drafting correspondence, scheduling appointments, organizing files, or providing information to callers.", "job_zone": 2, "major_group": "43-0000", "major_group_name": "Office and Administrative Support Occupations", "alternate_titles": ["Administrative Assistant", "Secretary", "Office Assistant", "Admin"]},
    {"onet_soc_code": "43-9061.00", "title": "Office Clerks, General", "description": "Perform duties too varied and diverse to be classified in any specific office clerical occupation.", "job_zone": 2, "major_group": "43-0000", "major_group_name": "Office and Administrative Support Occupations", "alternate_titles": ["Office Clerk", "General Clerk", "Clerical Worker"]},
    {"onet_soc_code": "43-3011.00", "title": "Bill and Account Collectors", "description": "Locate and notify customers of delinquent accounts by mail, telephone, or personal visit to solicit payment.", "job_zone": 2, "major_group": "43-0000", "major_group_name": "Office and Administrative Support Occupations", "alternate_titles": ["Collections Agent", "Debt Collector", "Account Collector"]},
    {"onet_soc_code": "43-4111.00", "title": "Interviewers, Except Eligibility and Loan", "description": "Interview persons by telephone, by mail, or in person for the purpose of completing forms, applications, or questionnaires.", "job_zone": 2, "major_group": "43-0000", "major_group_name": "Office and Administrative Support Occupations", "alternate_titles": ["Interviewer", "Survey Interviewer", "Research Interviewer"]},

    # ── 47-0000: Construction and Extraction ──
    {"onet_soc_code": "47-1011.00", "title": "First-Line Supervisors of Construction Trades and Extraction Workers", "description": "Directly supervise and coordinate activities of construction or extraction workers.", "job_zone": 3, "major_group": "47-0000", "major_group_name": "Construction and Extraction Occupations", "alternate_titles": ["Construction Foreman", "Site Supervisor", "Crew Leader"]},
    {"onet_soc_code": "47-2031.00", "title": "Carpenters", "description": "Construct, erect, install, or repair structures and fixtures made of wood and comparable materials.", "job_zone": 3, "major_group": "47-0000", "major_group_name": "Construction and Extraction Occupations", "alternate_titles": ["Carpenter", "Finish Carpenter", "Framer"]},
    {"onet_soc_code": "47-2111.00", "title": "Electricians", "description": "Install, maintain, and repair electrical wiring, equipment, and fixtures.", "job_zone": 3, "major_group": "47-0000", "major_group_name": "Construction and Extraction Occupations", "alternate_titles": ["Electrician", "Journeyman Electrician", "Master Electrician"]},
    {"onet_soc_code": "47-2152.00", "title": "Plumbers, Pipefitters, and Steamfitters", "description": "Assemble, install, alter, and repair pipelines or pipe systems that carry water, steam, air, or other liquids or gases.", "job_zone": 3, "major_group": "47-0000", "major_group_name": "Construction and Extraction Occupations", "alternate_titles": ["Plumber", "Pipefitter", "Steamfitter"]},
    {"onet_soc_code": "47-2061.00", "title": "Construction Laborers", "description": "Perform tasks involving physical labor at construction sites.", "job_zone": 1, "major_group": "47-0000", "major_group_name": "Construction and Extraction Occupations", "alternate_titles": ["Construction Worker", "Laborer", "General Laborer"]},

    # ── 49-0000: Installation, Maintenance, and Repair ──
    {"onet_soc_code": "49-1011.00", "title": "First-Line Supervisors of Mechanics, Installers, and Repairers", "description": "Directly supervise and coordinate the activities of mechanics, installers, and repairers.", "job_zone": 3, "major_group": "49-0000", "major_group_name": "Installation, Maintenance, and Repair Occupations", "alternate_titles": ["Maintenance Supervisor", "Shop Foreman", "Service Manager"]},
    {"onet_soc_code": "49-3023.00", "title": "Automotive Service Technicians and Mechanics", "description": "Diagnose, adjust, repair, or overhaul automotive vehicles.", "job_zone": 3, "major_group": "49-0000", "major_group_name": "Installation, Maintenance, and Repair Occupations", "alternate_titles": ["Auto Mechanic", "Automotive Technician", "Service Technician"]},
    {"onet_soc_code": "49-9021.00", "title": "Heating, Air Conditioning, and Refrigeration Mechanics and Installers", "description": "Install or repair heating, central air conditioning, HVAC, or refrigeration systems.", "job_zone": 3, "major_group": "49-0000", "major_group_name": "Installation, Maintenance, and Repair Occupations", "alternate_titles": ["HVAC Technician", "HVAC Mechanic", "Refrigeration Technician"]},
    {"onet_soc_code": "49-9041.00", "title": "Industrial Machinery Mechanics", "description": "Repair, install, adjust, or maintain industrial production and processing machinery or refinery and pipeline distribution systems.", "job_zone": 3, "major_group": "49-0000", "major_group_name": "Installation, Maintenance, and Repair Occupations", "alternate_titles": ["Industrial Mechanic", "Maintenance Mechanic", "Millwright"]},
    {"onet_soc_code": "49-9071.00", "title": "Maintenance and Repair Workers, General", "description": "Perform work involving the skills of two or more maintenance or craft occupations to keep machines, mechanical equipment, or the structure of a building in repair.", "job_zone": 2, "major_group": "49-0000", "major_group_name": "Installation, Maintenance, and Repair Occupations", "alternate_titles": ["Maintenance Worker", "Facilities Technician", "Handyman"]},

    # ── 51-0000: Production ──
    {"onet_soc_code": "51-1011.00", "title": "First-Line Supervisors of Production and Operating Workers", "description": "Directly supervise and coordinate the activities of production and operating workers.", "job_zone": 3, "major_group": "51-0000", "major_group_name": "Production Occupations", "alternate_titles": ["Production Supervisor", "Shift Supervisor", "Line Supervisor"]},
    {"onet_soc_code": "51-2098.00", "title": "Assemblers and Fabricators, All Other", "description": "All assemblers and fabricators not listed separately.", "job_zone": 2, "major_group": "51-0000", "major_group_name": "Production Occupations", "alternate_titles": ["Assembler", "Fabricator", "Production Assembler"]},
    {"onet_soc_code": "51-4041.00", "title": "Machinists", "description": "Set up and operate a variety of machine tools to produce precision parts and instruments out of metal.", "job_zone": 3, "major_group": "51-0000", "major_group_name": "Production Occupations", "alternate_titles": ["Machinist", "CNC Machinist", "Tool Maker"]},
    {"onet_soc_code": "51-4121.00", "title": "Welders, Cutters, Solderers, and Brazers", "description": "Use hand-welding, flame-cutting, hand-soldering, or brazing equipment to weld or join metal components or to fill holes, indentations, or seams of fabricated metal products.", "job_zone": 2, "major_group": "51-0000", "major_group_name": "Production Occupations", "alternate_titles": ["Welder", "Fabrication Welder", "Pipe Welder"]},
    {"onet_soc_code": "51-9061.00", "title": "Inspectors, Testers, Sorters, Samplers, and Weighers", "description": "Inspect, test, sort, sample, or weigh nonagricultural raw materials or processed, machined, fabricated, or assembled parts or products.", "job_zone": 2, "major_group": "51-0000", "major_group_name": "Production Occupations", "alternate_titles": ["Quality Inspector", "Quality Control Inspector", "QC Inspector"]},

    # ── 53-0000: Transportation and Material Moving ──
    {"onet_soc_code": "53-1042.00", "title": "First-Line Supervisors of Helpers, Laborers, and Material Movers, Hand", "description": "Directly supervise and coordinate the activities of helpers, laborers, or material movers.", "job_zone": 2, "major_group": "53-0000", "major_group_name": "Transportation and Material Moving Occupations", "alternate_titles": ["Warehouse Supervisor", "Shipping Supervisor", "Material Handling Supervisor"]},
    {"onet_soc_code": "53-3032.00", "title": "Heavy and Tractor-Trailer Truck Drivers", "description": "Drive a tractor-trailer combination or a truck with a capacity of at least 26,001 pounds Gross Vehicle Weight.", "job_zone": 2, "major_group": "53-0000", "major_group_name": "Transportation and Material Moving Occupations", "alternate_titles": ["Truck Driver", "CDL Driver", "Long Haul Driver", "OTR Driver"]},
    {"onet_soc_code": "53-3033.00", "title": "Light Truck Drivers", "description": "Drive a light vehicle, such as a truck or van, with a capacity of less than 26,001 pounds Gross Vehicle Weight, primarily to pick up merchandise or packages from a distribution center and deliver.", "job_zone": 2, "major_group": "53-0000", "major_group_name": "Transportation and Material Moving Occupations", "alternate_titles": ["Delivery Driver", "Route Driver", "Van Driver"]},
    {"onet_soc_code": "53-7062.00", "title": "Laborers and Freight, Stock, and Material Movers, Hand", "description": "Manually move freight, stock, luggage, or materials, or perform other general labor.", "job_zone": 1, "major_group": "53-0000", "major_group_name": "Transportation and Material Moving Occupations", "alternate_titles": ["Warehouse Worker", "Material Handler", "Stock Clerk"]},
    {"onet_soc_code": "53-7051.00", "title": "Industrial Truck and Tractor Operators", "description": "Operate industrial trucks or tractors equipped to move materials around a warehouse, storage yard, factory, construction site, or similar location.", "job_zone": 1, "major_group": "53-0000", "major_group_name": "Transportation and Material Moving Occupations", "alternate_titles": ["Forklift Operator", "Forklift Driver", "Material Mover"]},
]


# ═══════════════════════════════════════════════════════════════════════
# OCCUPATION PROFILES — skill emphasis per occupation
# ═══════════════════════════════════════════════════════════════════════

OCCUPATION_PROFILES = {
    # ── Management ──
    "11-1011.00": {"high_skills": ["Judgment and Decision Making", "Critical Thinking", "Management of Personnel Resources", "Speaking", "Complex Problem Solving", "Negotiation"], "medium_skills": ["Active Listening", "Reading Comprehension", "Coordination", "Persuasion", "Time Management", "Management of Financial Resources", "Systems Analysis", "Monitoring"], "low_skills": ["Programming", "Equipment Maintenance", "Repairing", "Installation", "Operation and Control"]},
    "11-1021.00": {"high_skills": ["Judgment and Decision Making", "Management of Personnel Resources", "Coordination", "Critical Thinking", "Speaking", "Time Management"], "medium_skills": ["Active Listening", "Monitoring", "Negotiation", "Complex Problem Solving", "Management of Financial Resources", "Systems Evaluation"], "low_skills": ["Programming", "Equipment Maintenance", "Repairing", "Installation", "Science"]},
    "11-1031.00": {"high_skills": ["Speaking", "Persuasion", "Negotiation", "Critical Thinking", "Judgment and Decision Making", "Reading Comprehension"], "medium_skills": ["Active Listening", "Writing", "Social Perceptiveness", "Complex Problem Solving", "Monitoring"], "low_skills": ["Programming", "Equipment Maintenance", "Repairing", "Installation", "Mathematics"]},
    "11-2021.00": {"high_skills": ["Critical Thinking", "Judgment and Decision Making", "Persuasion", "Speaking", "Writing", "Active Learning"], "medium_skills": ["Coordination", "Time Management", "Social Perceptiveness", "Complex Problem Solving", "Monitoring", "Systems Analysis"], "low_skills": ["Programming", "Equipment Maintenance", "Repairing", "Installation", "Science", "Equipment Selection"]},
    "11-2022.00": {"high_skills": ["Persuasion", "Negotiation", "Speaking", "Judgment and Decision Making", "Coordination", "Management of Personnel Resources"], "medium_skills": ["Active Listening", "Monitoring", "Time Management", "Social Perceptiveness", "Critical Thinking", "Management of Financial Resources"], "low_skills": ["Programming", "Equipment Maintenance", "Repairing", "Installation", "Science"]},
    "11-3011.00": {"high_skills": ["Coordination", "Time Management", "Management of Personnel Resources", "Judgment and Decision Making", "Speaking"], "medium_skills": ["Active Listening", "Monitoring", "Writing", "Critical Thinking", "Management of Material Resources"], "low_skills": ["Programming", "Science", "Repairing", "Installation", "Equipment Maintenance"]},
    "11-3021.00": {"high_skills": ["Critical Thinking", "Complex Problem Solving", "Systems Analysis", "Judgment and Decision Making", "Management of Personnel Resources", "Technology Design"], "medium_skills": ["Programming", "Active Learning", "Coordination", "Speaking", "Time Management", "Monitoring", "Reading Comprehension"], "low_skills": ["Repairing", "Equipment Maintenance", "Service Orientation", "Persuasion"]},
    "11-3031.00": {"high_skills": ["Mathematics", "Critical Thinking", "Judgment and Decision Making", "Management of Financial Resources", "Reading Comprehension"], "medium_skills": ["Active Listening", "Speaking", "Monitoring", "Complex Problem Solving", "Systems Evaluation", "Management of Personnel Resources"], "low_skills": ["Programming", "Equipment Maintenance", "Repairing", "Installation", "Science"]},
    "11-3051.00": {"high_skills": ["Coordination", "Management of Personnel Resources", "Monitoring", "Judgment and Decision Making", "Time Management", "Management of Material Resources"], "medium_skills": ["Critical Thinking", "Quality Control Analysis", "Operation Monitoring", "Speaking", "Complex Problem Solving"], "low_skills": ["Programming", "Science", "Writing", "Persuasion"]},
    "11-3061.00": {"high_skills": ["Negotiation", "Judgment and Decision Making", "Management of Financial Resources", "Management of Material Resources", "Critical Thinking"], "medium_skills": ["Speaking", "Active Listening", "Coordination", "Monitoring", "Time Management", "Complex Problem Solving"], "low_skills": ["Programming", "Science", "Repairing", "Installation", "Equipment Maintenance"]},
    "11-3071.00": {"high_skills": ["Coordination", "Time Management", "Judgment and Decision Making", "Management of Material Resources", "Management of Personnel Resources", "Monitoring"], "medium_skills": ["Critical Thinking", "Speaking", "Complex Problem Solving", "Systems Analysis", "Active Listening"], "low_skills": ["Programming", "Science", "Repairing", "Technology Design"]},
    "11-3111.00": {"high_skills": ["Critical Thinking", "Reading Comprehension", "Mathematics", "Judgment and Decision Making", "Management of Financial Resources"], "medium_skills": ["Speaking", "Active Listening", "Writing", "Monitoring", "Social Perceptiveness", "Negotiation"], "low_skills": ["Programming", "Equipment Maintenance", "Repairing", "Installation", "Science", "Equipment Selection"]},
    "11-3121.00": {"high_skills": ["Social Perceptiveness", "Judgment and Decision Making", "Speaking", "Active Listening", "Management of Personnel Resources", "Negotiation"], "medium_skills": ["Critical Thinking", "Writing", "Coordination", "Monitoring", "Persuasion", "Time Management"], "low_skills": ["Programming", "Equipment Maintenance", "Repairing", "Installation", "Science", "Mathematics"]},
    "11-3131.00": {"high_skills": ["Instructing", "Learning Strategies", "Speaking", "Active Listening", "Coordination", "Management of Personnel Resources"], "medium_skills": ["Writing", "Critical Thinking", "Social Perceptiveness", "Monitoring", "Time Management", "Judgment and Decision Making"], "low_skills": ["Programming", "Equipment Maintenance", "Repairing", "Installation", "Science", "Mathematics"]},
    "11-9013.00": {"high_skills": ["Management of Material Resources", "Judgment and Decision Making", "Management of Financial Resources", "Monitoring", "Critical Thinking"], "medium_skills": ["Coordination", "Time Management", "Management of Personnel Resources", "Equipment Selection", "Operation and Control"], "low_skills": ["Programming", "Writing", "Persuasion", "Technology Design"]},
    "11-9021.00": {"high_skills": ["Coordination", "Time Management", "Judgment and Decision Making", "Management of Personnel Resources", "Management of Material Resources", "Management of Financial Resources"], "medium_skills": ["Critical Thinking", "Speaking", "Monitoring", "Complex Problem Solving", "Quality Control Analysis"], "low_skills": ["Programming", "Science", "Persuasion", "Technology Design"]},

    # ── Business and Financial ──
    "13-1011.00": {"high_skills": ["Negotiation", "Persuasion", "Speaking", "Active Listening", "Social Perceptiveness"], "medium_skills": ["Judgment and Decision Making", "Critical Thinking", "Time Management", "Coordination", "Writing", "Management of Financial Resources"], "low_skills": ["Programming", "Equipment Maintenance", "Repairing", "Installation", "Science", "Equipment Selection"]},
    "13-1041.00": {"high_skills": ["Reading Comprehension", "Critical Thinking", "Judgment and Decision Making", "Monitoring", "Writing"], "medium_skills": ["Active Listening", "Speaking", "Complex Problem Solving", "Systems Evaluation", "Active Learning"], "low_skills": ["Programming", "Equipment Maintenance", "Repairing", "Installation", "Equipment Selection"]},
    "13-1051.00": {"high_skills": ["Mathematics", "Critical Thinking", "Reading Comprehension", "Judgment and Decision Making"], "medium_skills": ["Active Listening", "Speaking", "Writing", "Complex Problem Solving", "Time Management", "Management of Financial Resources"], "low_skills": ["Programming", "Equipment Maintenance", "Repairing", "Persuasion", "Instructing"]},
    "13-1071.00": {"high_skills": ["Social Perceptiveness", "Active Listening", "Speaking", "Judgment and Decision Making", "Negotiation"], "medium_skills": ["Writing", "Critical Thinking", "Time Management", "Coordination", "Persuasion", "Reading Comprehension", "Service Orientation"], "low_skills": ["Programming", "Equipment Maintenance", "Repairing", "Installation", "Science", "Mathematics"]},
    "13-1081.00": {"high_skills": ["Critical Thinking", "Coordination", "Complex Problem Solving", "Systems Analysis", "Time Management"], "medium_skills": ["Mathematics", "Judgment and Decision Making", "Speaking", "Active Listening", "Monitoring", "Management of Material Resources"], "low_skills": ["Programming", "Repairing", "Installation", "Persuasion", "Instructing"]},
    "13-1111.00": {"high_skills": ["Critical Thinking", "Complex Problem Solving", "Systems Analysis", "Writing", "Judgment and Decision Making", "Active Learning"], "medium_skills": ["Reading Comprehension", "Speaking", "Active Listening", "Coordination", "Monitoring", "Time Management", "Systems Evaluation"], "low_skills": ["Programming", "Equipment Maintenance", "Repairing", "Installation", "Equipment Selection"]},
    "13-1141.00": {"high_skills": ["Reading Comprehension", "Critical Thinking", "Mathematics", "Judgment and Decision Making"], "medium_skills": ["Writing", "Active Listening", "Speaking", "Systems Analysis", "Monitoring", "Complex Problem Solving"], "low_skills": ["Programming", "Equipment Maintenance", "Repairing", "Installation", "Science", "Persuasion"]},
    "13-1151.00": {"high_skills": ["Instructing", "Learning Strategies", "Speaking", "Active Listening", "Writing"], "medium_skills": ["Critical Thinking", "Social Perceptiveness", "Monitoring", "Coordination", "Time Management", "Active Learning"], "low_skills": ["Programming", "Equipment Maintenance", "Repairing", "Installation", "Science", "Mathematics"]},
    "13-1161.00": {"high_skills": ["Critical Thinking", "Reading Comprehension", "Writing", "Active Learning", "Mathematics"], "medium_skills": ["Speaking", "Active Listening", "Complex Problem Solving", "Judgment and Decision Making", "Systems Analysis"], "low_skills": ["Programming", "Equipment Maintenance", "Repairing", "Installation", "Equipment Selection"]},
    "13-1199.00": {"high_skills": ["Critical Thinking", "Coordination", "Time Management", "Judgment and Decision Making"], "medium_skills": ["Speaking", "Active Listening", "Writing", "Monitoring", "Complex Problem Solving", "Reading Comprehension"], "low_skills": ["Programming", "Equipment Maintenance", "Repairing", "Installation", "Science"]},
    "13-2011.00": {"high_skills": ["Mathematics", "Reading Comprehension", "Critical Thinking", "Monitoring", "Judgment and Decision Making"], "medium_skills": ["Active Listening", "Writing", "Speaking", "Complex Problem Solving", "Time Management", "Systems Evaluation"], "low_skills": ["Programming", "Equipment Maintenance", "Repairing", "Installation", "Science", "Persuasion"]},
    "13-2041.00": {"high_skills": ["Mathematics", "Critical Thinking", "Reading Comprehension", "Judgment and Decision Making", "Complex Problem Solving"], "medium_skills": ["Writing", "Active Listening", "Speaking", "Monitoring", "Systems Analysis", "Active Learning"], "low_skills": ["Programming", "Equipment Maintenance", "Repairing", "Installation", "Persuasion"]},
    "13-2051.00": {"high_skills": ["Mathematics", "Critical Thinking", "Reading Comprehension", "Judgment and Decision Making", "Complex Problem Solving", "Active Learning"], "medium_skills": ["Writing", "Speaking", "Systems Analysis", "Monitoring", "Time Management"], "low_skills": ["Programming", "Equipment Maintenance", "Repairing", "Installation", "Persuasion"]},
    "13-2052.00": {"high_skills": ["Speaking", "Active Listening", "Persuasion", "Mathematics", "Critical Thinking", "Judgment and Decision Making"], "medium_skills": ["Reading Comprehension", "Social Perceptiveness", "Service Orientation", "Time Management", "Complex Problem Solving", "Negotiation"], "low_skills": ["Programming", "Equipment Maintenance", "Repairing", "Installation", "Science"]},
    "13-2061.00": {"high_skills": ["Reading Comprehension", "Critical Thinking", "Monitoring", "Judgment and Decision Making", "Writing"], "medium_skills": ["Mathematics", "Active Listening", "Speaking", "Complex Problem Solving", "Systems Evaluation"], "low_skills": ["Programming", "Equipment Maintenance", "Repairing", "Installation", "Persuasion"]},

    # ── Computer and Mathematical ──
    "15-1211.00": {"high_skills": ["Critical Thinking", "Complex Problem Solving", "Systems Analysis", "Active Learning", "Reading Comprehension"], "medium_skills": ["Programming", "Writing", "Speaking", "Judgment and Decision Making", "Technology Design", "Systems Evaluation", "Time Management"], "low_skills": ["Equipment Maintenance", "Repairing", "Persuasion", "Negotiation", "Service Orientation"]},
    "15-1212.00": {"high_skills": ["Critical Thinking", "Complex Problem Solving", "Systems Analysis", "Reading Comprehension", "Active Learning", "Monitoring"], "medium_skills": ["Programming", "Technology Design", "Judgment and Decision Making", "Writing", "Speaking", "Troubleshooting", "Systems Evaluation"], "low_skills": ["Equipment Maintenance", "Repairing", "Persuasion", "Negotiation", "Service Orientation"]},
    "15-1221.00": {"high_skills": ["Critical Thinking", "Complex Problem Solving", "Programming", "Mathematics", "Active Learning", "Science"], "medium_skills": ["Reading Comprehension", "Writing", "Systems Analysis", "Technology Design", "Judgment and Decision Making"], "low_skills": ["Equipment Maintenance", "Repairing", "Persuasion", "Negotiation", "Service Orientation", "Management of Personnel Resources"]},
    "15-1231.00": {"high_skills": ["Troubleshooting", "Complex Problem Solving", "Critical Thinking", "Active Learning"], "medium_skills": ["Reading Comprehension", "Systems Analysis", "Operation Monitoring", "Speaking", "Active Listening", "Time Management"], "low_skills": ["Persuasion", "Negotiation", "Management of Financial Resources", "Management of Personnel Resources", "Writing"]},
    "15-1232.00": {"high_skills": ["Service Orientation", "Active Listening", "Troubleshooting", "Complex Problem Solving", "Speaking"], "medium_skills": ["Critical Thinking", "Reading Comprehension", "Active Learning", "Time Management", "Instructing"], "low_skills": ["Programming", "Mathematics", "Science", "Management of Financial Resources", "Negotiation"]},
    "15-1241.00": {"high_skills": ["Complex Problem Solving", "Critical Thinking", "Systems Analysis", "Technology Design", "Active Learning"], "medium_skills": ["Programming", "Reading Comprehension", "Judgment and Decision Making", "Systems Evaluation", "Coordination", "Speaking"], "low_skills": ["Repairing", "Equipment Maintenance", "Persuasion", "Negotiation", "Service Orientation"]},
    "15-1242.00": {"high_skills": ["Programming", "Critical Thinking", "Complex Problem Solving", "Systems Analysis", "Active Learning"], "medium_skills": ["Reading Comprehension", "Technology Design", "Troubleshooting", "Monitoring", "Time Management", "Judgment and Decision Making"], "low_skills": ["Persuasion", "Negotiation", "Service Orientation", "Management of Personnel Resources", "Repairing"]},
    "15-1243.00": {"high_skills": ["Systems Analysis", "Technology Design", "Critical Thinking", "Complex Problem Solving", "Active Learning"], "medium_skills": ["Programming", "Reading Comprehension", "Writing", "Judgment and Decision Making", "Systems Evaluation", "Mathematics"], "low_skills": ["Repairing", "Equipment Maintenance", "Persuasion", "Negotiation", "Service Orientation"]},
    "15-1244.00": {"high_skills": ["Troubleshooting", "Complex Problem Solving", "Critical Thinking", "Systems Analysis", "Operation Monitoring"], "medium_skills": ["Active Learning", "Reading Comprehension", "Technology Design", "Time Management", "Judgment and Decision Making", "Installation"], "low_skills": ["Persuasion", "Negotiation", "Management of Financial Resources", "Writing"]},
    "15-1251.00": {"high_skills": ["Programming", "Critical Thinking", "Complex Problem Solving", "Active Learning", "Mathematics"], "medium_skills": ["Reading Comprehension", "Technology Design", "Troubleshooting", "Systems Analysis", "Time Management", "Judgment and Decision Making"], "low_skills": ["Repairing", "Equipment Maintenance", "Persuasion", "Negotiation", "Service Orientation"]},
    "15-1252.00": {"high_skills": ["Programming", "Complex Problem Solving", "Critical Thinking", "Systems Analysis", "Active Learning", "Technology Design"], "medium_skills": ["Reading Comprehension", "Mathematics", "Judgment and Decision Making", "Writing", "Coordination", "Time Management", "Troubleshooting"], "low_skills": ["Equipment Maintenance", "Repairing", "Service Orientation", "Persuasion", "Negotiation"]},
    "15-1253.00": {"high_skills": ["Quality Control Analysis", "Critical Thinking", "Complex Problem Solving", "Active Learning", "Troubleshooting"], "medium_skills": ["Programming", "Reading Comprehension", "Writing", "Systems Analysis", "Monitoring", "Time Management", "Judgment and Decision Making"], "low_skills": ["Repairing", "Equipment Maintenance", "Persuasion", "Negotiation", "Management of Personnel Resources"]},
    "15-1254.00": {"high_skills": ["Programming", "Active Learning", "Critical Thinking", "Complex Problem Solving", "Technology Design"], "medium_skills": ["Reading Comprehension", "Time Management", "Judgment and Decision Making", "Coordination", "Quality Control Analysis"], "low_skills": ["Repairing", "Equipment Maintenance", "Persuasion", "Negotiation", "Management of Personnel Resources", "Science"]},
    "15-1255.00": {"high_skills": ["Critical Thinking", "Active Learning", "Complex Problem Solving", "Social Perceptiveness", "Technology Design"], "medium_skills": ["Reading Comprehension", "Writing", "Coordination", "Judgment and Decision Making", "Time Management", "Programming"], "low_skills": ["Repairing", "Equipment Maintenance", "Mathematics", "Science", "Management of Financial Resources"]},
    "15-2011.00": {"high_skills": ["Mathematics", "Critical Thinking", "Complex Problem Solving", "Reading Comprehension", "Active Learning"], "medium_skills": ["Writing", "Speaking", "Judgment and Decision Making", "Systems Analysis", "Monitoring", "Programming"], "low_skills": ["Repairing", "Equipment Maintenance", "Persuasion", "Negotiation", "Service Orientation", "Installation"]},
    "15-2031.00": {"high_skills": ["Mathematics", "Critical Thinking", "Complex Problem Solving", "Systems Analysis", "Active Learning", "Programming"], "medium_skills": ["Reading Comprehension", "Writing", "Judgment and Decision Making", "Speaking", "Systems Evaluation"], "low_skills": ["Repairing", "Equipment Maintenance", "Persuasion", "Negotiation", "Service Orientation"]},
    "15-2041.00": {"high_skills": ["Mathematics", "Critical Thinking", "Reading Comprehension", "Active Learning", "Complex Problem Solving"], "medium_skills": ["Writing", "Programming", "Judgment and Decision Making", "Speaking", "Systems Analysis"], "low_skills": ["Repairing", "Equipment Maintenance", "Persuasion", "Negotiation", "Service Orientation", "Installation"]},
    "15-2051.00": {"high_skills": ["Programming", "Mathematics", "Critical Thinking", "Complex Problem Solving", "Active Learning", "Systems Analysis"], "medium_skills": ["Reading Comprehension", "Writing", "Technology Design", "Judgment and Decision Making", "Speaking", "Science"], "low_skills": ["Repairing", "Equipment Maintenance", "Persuasion", "Negotiation", "Service Orientation"]},

    # ── Architecture and Engineering ──
    "17-1011.00": {"high_skills": ["Critical Thinking", "Complex Problem Solving", "Operations Analysis", "Technology Design", "Judgment and Decision Making"], "medium_skills": ["Mathematics", "Reading Comprehension", "Speaking", "Writing", "Coordination", "Active Learning", "Time Management"], "low_skills": ["Programming", "Equipment Maintenance", "Repairing", "Persuasion"]},
    "17-2011.00": {"high_skills": ["Mathematics", "Science", "Critical Thinking", "Complex Problem Solving", "Technology Design"], "medium_skills": ["Reading Comprehension", "Active Learning", "Systems Analysis", "Operations Analysis", "Judgment and Decision Making", "Writing"], "low_skills": ["Repairing", "Persuasion", "Negotiation", "Service Orientation", "Management of Personnel Resources"]},
    "17-2051.00": {"high_skills": ["Mathematics", "Critical Thinking", "Complex Problem Solving", "Reading Comprehension", "Judgment and Decision Making"], "medium_skills": ["Active Learning", "Writing", "Speaking", "Systems Analysis", "Operations Analysis", "Coordination", "Time Management"], "low_skills": ["Programming", "Persuasion", "Negotiation", "Service Orientation"]},
    "17-2071.00": {"high_skills": ["Mathematics", "Critical Thinking", "Complex Problem Solving", "Technology Design", "Science"], "medium_skills": ["Reading Comprehension", "Active Learning", "Systems Analysis", "Operations Analysis", "Troubleshooting", "Judgment and Decision Making"], "low_skills": ["Persuasion", "Negotiation", "Service Orientation", "Management of Personnel Resources"]},
    "17-2112.00": {"high_skills": ["Critical Thinking", "Complex Problem Solving", "Systems Analysis", "Mathematics", "Operations Analysis", "Systems Evaluation"], "medium_skills": ["Reading Comprehension", "Active Learning", "Judgment and Decision Making", "Time Management", "Monitoring", "Writing"], "low_skills": ["Persuasion", "Negotiation", "Service Orientation", "Repairing"]},
    "17-2141.00": {"high_skills": ["Mathematics", "Critical Thinking", "Complex Problem Solving", "Technology Design", "Science"], "medium_skills": ["Reading Comprehension", "Active Learning", "Operations Analysis", "Systems Analysis", "Judgment and Decision Making", "Writing"], "low_skills": ["Persuasion", "Negotiation", "Service Orientation", "Management of Personnel Resources"]},
    "17-2199.00": {"high_skills": ["Critical Thinking", "Complex Problem Solving", "Mathematics", "Active Learning", "Judgment and Decision Making"], "medium_skills": ["Reading Comprehension", "Technology Design", "Systems Analysis", "Writing", "Speaking", "Time Management"], "low_skills": ["Persuasion", "Negotiation", "Service Orientation", "Management of Personnel Resources"]},
    "17-3011.00": {"high_skills": ["Reading Comprehension", "Critical Thinking", "Technology Design", "Mathematics"], "medium_skills": ["Active Learning", "Complex Problem Solving", "Time Management", "Operations Analysis", "Coordination"], "low_skills": ["Persuasion", "Negotiation", "Management of Personnel Resources", "Management of Financial Resources", "Speaking"]},
    "17-2061.00": {"high_skills": ["Programming", "Critical Thinking", "Complex Problem Solving", "Technology Design", "Mathematics", "Science"], "medium_skills": ["Reading Comprehension", "Active Learning", "Systems Analysis", "Operations Analysis", "Troubleshooting", "Judgment and Decision Making"], "low_skills": ["Persuasion", "Negotiation", "Service Orientation"]},
    "17-2081.00": {"high_skills": ["Science", "Critical Thinking", "Complex Problem Solving", "Mathematics", "Reading Comprehension"], "medium_skills": ["Writing", "Active Learning", "Judgment and Decision Making", "Systems Analysis", "Monitoring", "Speaking"], "low_skills": ["Programming", "Persuasion", "Negotiation", "Service Orientation", "Management of Personnel Resources"]},

    # ── Life, Physical, Social Science ──
    "19-1042.00": {"high_skills": ["Science", "Critical Thinking", "Reading Comprehension", "Active Learning", "Complex Problem Solving", "Writing"], "medium_skills": ["Mathematics", "Judgment and Decision Making", "Speaking", "Monitoring", "Quality Control Analysis"], "low_skills": ["Programming", "Persuasion", "Negotiation", "Management of Personnel Resources", "Equipment Maintenance"]},
    "19-2012.00": {"high_skills": ["Science", "Mathematics", "Critical Thinking", "Complex Problem Solving", "Active Learning", "Reading Comprehension"], "medium_skills": ["Writing", "Speaking", "Judgment and Decision Making", "Programming"], "low_skills": ["Persuasion", "Negotiation", "Service Orientation", "Management of Personnel Resources", "Equipment Maintenance"]},
    "19-2031.00": {"high_skills": ["Science", "Critical Thinking", "Reading Comprehension", "Active Learning", "Quality Control Analysis", "Mathematics"], "medium_skills": ["Writing", "Complex Problem Solving", "Monitoring", "Judgment and Decision Making", "Speaking"], "low_skills": ["Programming", "Persuasion", "Negotiation", "Management of Personnel Resources"]},
    "19-3011.00": {"high_skills": ["Mathematics", "Critical Thinking", "Reading Comprehension", "Writing", "Active Learning", "Complex Problem Solving"], "medium_skills": ["Speaking", "Judgment and Decision Making", "Systems Analysis", "Programming"], "low_skills": ["Persuasion", "Equipment Maintenance", "Repairing", "Service Orientation"]},
    "19-3032.00": {"high_skills": ["Critical Thinking", "Reading Comprehension", "Active Learning", "Writing", "Social Perceptiveness", "Complex Problem Solving"], "medium_skills": ["Speaking", "Active Listening", "Science", "Judgment and Decision Making", "Systems Analysis", "Mathematics"], "low_skills": ["Programming", "Equipment Maintenance", "Repairing", "Installation"]},

    # ── Community and Social Service ──
    "21-1012.00": {"high_skills": ["Active Listening", "Social Perceptiveness", "Speaking", "Service Orientation", "Critical Thinking"], "medium_skills": ["Writing", "Reading Comprehension", "Coordination", "Monitoring", "Judgment and Decision Making", "Instructing"], "low_skills": ["Programming", "Equipment Maintenance", "Repairing", "Mathematics", "Science"]},
    "21-1014.00": {"high_skills": ["Active Listening", "Social Perceptiveness", "Speaking", "Service Orientation", "Critical Thinking"], "medium_skills": ["Writing", "Reading Comprehension", "Monitoring", "Judgment and Decision Making", "Learning Strategies"], "low_skills": ["Programming", "Equipment Maintenance", "Repairing", "Mathematics", "Science"]},
    "21-1021.00": {"high_skills": ["Active Listening", "Social Perceptiveness", "Speaking", "Service Orientation", "Critical Thinking", "Coordination"], "medium_skills": ["Writing", "Reading Comprehension", "Judgment and Decision Making", "Monitoring", "Negotiation", "Time Management"], "low_skills": ["Programming", "Equipment Maintenance", "Repairing", "Mathematics", "Science"]},
    "21-1093.00": {"high_skills": ["Active Listening", "Service Orientation", "Social Perceptiveness", "Speaking"], "medium_skills": ["Reading Comprehension", "Writing", "Critical Thinking", "Coordination", "Time Management", "Monitoring"], "low_skills": ["Programming", "Equipment Maintenance", "Repairing", "Mathematics", "Science", "Management of Financial Resources"]},
    "21-1091.00": {"high_skills": ["Speaking", "Instructing", "Active Listening", "Service Orientation", "Social Perceptiveness"], "medium_skills": ["Writing", "Reading Comprehension", "Critical Thinking", "Coordination", "Learning Strategies", "Monitoring"], "low_skills": ["Programming", "Equipment Maintenance", "Repairing", "Mathematics", "Science"]},

    # ── Legal ──
    "23-1011.00": {"high_skills": ["Reading Comprehension", "Critical Thinking", "Speaking", "Writing", "Persuasion", "Judgment and Decision Making", "Active Listening", "Negotiation"], "medium_skills": ["Complex Problem Solving", "Active Learning", "Social Perceptiveness", "Time Management", "Monitoring"], "low_skills": ["Programming", "Equipment Maintenance", "Repairing", "Mathematics", "Science"]},
    "23-1012.00": {"high_skills": ["Reading Comprehension", "Writing", "Critical Thinking", "Active Learning", "Judgment and Decision Making"], "medium_skills": ["Speaking", "Active Listening", "Complex Problem Solving", "Research", "Time Management"], "low_skills": ["Programming", "Equipment Maintenance", "Repairing", "Mathematics", "Science", "Persuasion"]},
    "23-2011.00": {"high_skills": ["Reading Comprehension", "Writing", "Critical Thinking", "Active Listening"], "medium_skills": ["Speaking", "Time Management", "Coordination", "Judgment and Decision Making", "Active Learning"], "low_skills": ["Programming", "Equipment Maintenance", "Repairing", "Mathematics", "Science", "Persuasion"]},
    "23-1021.00": {"high_skills": ["Critical Thinking", "Reading Comprehension", "Judgment and Decision Making", "Active Listening", "Speaking", "Writing"], "medium_skills": ["Complex Problem Solving", "Monitoring", "Social Perceptiveness", "Time Management"], "low_skills": ["Programming", "Equipment Maintenance", "Repairing", "Mathematics", "Science"]},
    "23-1022.00": {"high_skills": ["Negotiation", "Active Listening", "Social Perceptiveness", "Speaking", "Critical Thinking", "Judgment and Decision Making"], "medium_skills": ["Reading Comprehension", "Writing", "Persuasion", "Complex Problem Solving", "Monitoring"], "low_skills": ["Programming", "Equipment Maintenance", "Repairing", "Mathematics", "Science"]},

    # ── Educational Instruction ──
    "25-1011.00": {"high_skills": ["Instructing", "Speaking", "Learning Strategies", "Active Listening", "Reading Comprehension", "Writing", "Critical Thinking"], "medium_skills": ["Active Learning", "Social Perceptiveness", "Monitoring", "Judgment and Decision Making", "Time Management"], "low_skills": ["Programming", "Equipment Maintenance", "Repairing", "Installation"]},
    "25-2021.00": {"high_skills": ["Instructing", "Learning Strategies", "Speaking", "Active Listening", "Social Perceptiveness", "Monitoring"], "medium_skills": ["Reading Comprehension", "Writing", "Critical Thinking", "Coordination", "Time Management", "Judgment and Decision Making"], "low_skills": ["Programming", "Equipment Maintenance", "Repairing", "Mathematics", "Science"]},
    "25-2031.00": {"high_skills": ["Instructing", "Learning Strategies", "Speaking", "Active Listening", "Social Perceptiveness", "Monitoring"], "medium_skills": ["Reading Comprehension", "Writing", "Critical Thinking", "Time Management", "Judgment and Decision Making"], "low_skills": ["Programming", "Equipment Maintenance", "Repairing", "Installation"]},
    "25-3021.00": {"high_skills": ["Instructing", "Speaking", "Active Listening", "Learning Strategies"], "medium_skills": ["Social Perceptiveness", "Monitoring", "Time Management", "Coordination", "Service Orientation"], "low_skills": ["Programming", "Equipment Maintenance", "Repairing", "Mathematics", "Science", "Management of Financial Resources"]},
    "25-4022.00": {"high_skills": ["Reading Comprehension", "Service Orientation", "Active Listening", "Speaking", "Writing"], "medium_skills": ["Critical Thinking", "Instructing", "Time Management", "Coordination", "Active Learning", "Social Perceptiveness"], "low_skills": ["Programming", "Equipment Maintenance", "Repairing", "Mathematics", "Science"]},

    # ── Arts, Design, Entertainment ──
    "27-1011.00": {"high_skills": ["Critical Thinking", "Coordination", "Judgment and Decision Making", "Time Management", "Active Learning"], "medium_skills": ["Speaking", "Social Perceptiveness", "Writing", "Complex Problem Solving", "Management of Personnel Resources", "Monitoring"], "low_skills": ["Programming", "Equipment Maintenance", "Repairing", "Mathematics", "Science"]},
    "27-1024.00": {"high_skills": ["Active Learning", "Critical Thinking", "Time Management", "Complex Problem Solving"], "medium_skills": ["Reading Comprehension", "Coordination", "Judgment and Decision Making", "Technology Design", "Speaking", "Social Perceptiveness"], "low_skills": ["Programming", "Equipment Maintenance", "Repairing", "Mathematics", "Science", "Negotiation"]},
    "27-2012.00": {"high_skills": ["Coordination", "Judgment and Decision Making", "Time Management", "Speaking", "Management of Personnel Resources", "Critical Thinking"], "medium_skills": ["Active Listening", "Social Perceptiveness", "Negotiation", "Complex Problem Solving", "Management of Financial Resources", "Writing"], "low_skills": ["Programming", "Equipment Maintenance", "Repairing", "Mathematics", "Science"]},
    "27-3031.00": {"high_skills": ["Writing", "Speaking", "Persuasion", "Social Perceptiveness", "Active Listening", "Critical Thinking"], "medium_skills": ["Reading Comprehension", "Coordination", "Time Management", "Judgment and Decision Making", "Negotiation", "Active Learning"], "low_skills": ["Programming", "Equipment Maintenance", "Repairing", "Mathematics", "Science"]},
    "27-3041.00": {"high_skills": ["Reading Comprehension", "Writing", "Critical Thinking", "Active Listening", "Time Management"], "medium_skills": ["Speaking", "Judgment and Decision Making", "Social Perceptiveness", "Coordination", "Active Learning"], "low_skills": ["Programming", "Equipment Maintenance", "Repairing", "Mathematics", "Science", "Negotiation"]},

    # ── Healthcare Practitioners ──
    "29-1141.00": {"high_skills": ["Active Listening", "Service Orientation", "Social Perceptiveness", "Critical Thinking", "Monitoring", "Speaking", "Coordination"], "medium_skills": ["Reading Comprehension", "Judgment and Decision Making", "Time Management", "Complex Problem Solving", "Science", "Active Learning", "Writing"], "low_skills": ["Programming", "Equipment Maintenance", "Repairing", "Mathematics", "Negotiation"]},
    "29-1171.00": {"high_skills": ["Critical Thinking", "Active Listening", "Service Orientation", "Social Perceptiveness", "Monitoring", "Judgment and Decision Making", "Science"], "medium_skills": ["Reading Comprehension", "Speaking", "Complex Problem Solving", "Active Learning", "Writing", "Time Management", "Coordination"], "low_skills": ["Programming", "Equipment Maintenance", "Repairing", "Mathematics"]},
    "29-1215.00": {"high_skills": ["Critical Thinking", "Active Listening", "Service Orientation", "Social Perceptiveness", "Science", "Judgment and Decision Making", "Complex Problem Solving"], "medium_skills": ["Reading Comprehension", "Speaking", "Monitoring", "Active Learning", "Writing", "Time Management"], "low_skills": ["Programming", "Equipment Maintenance", "Repairing", "Mathematics"]},
    "29-1228.00": {"high_skills": ["Critical Thinking", "Science", "Complex Problem Solving", "Judgment and Decision Making", "Active Listening", "Service Orientation"], "medium_skills": ["Reading Comprehension", "Speaking", "Monitoring", "Social Perceptiveness", "Active Learning", "Writing"], "low_skills": ["Programming", "Equipment Maintenance", "Repairing", "Mathematics"]},
    "29-1051.00": {"high_skills": ["Reading Comprehension", "Science", "Critical Thinking", "Active Listening", "Service Orientation"], "medium_skills": ["Speaking", "Monitoring", "Judgment and Decision Making", "Complex Problem Solving", "Active Learning", "Social Perceptiveness"], "low_skills": ["Programming", "Equipment Maintenance", "Repairing", "Mathematics", "Negotiation"]},
    "29-1021.00": {"high_skills": ["Critical Thinking", "Science", "Judgment and Decision Making", "Active Listening", "Service Orientation", "Complex Problem Solving"], "medium_skills": ["Reading Comprehension", "Speaking", "Monitoring", "Social Perceptiveness", "Time Management", "Coordination"], "low_skills": ["Programming", "Equipment Maintenance", "Mathematics", "Negotiation"]},
    "29-1123.00": {"high_skills": ["Service Orientation", "Active Listening", "Social Perceptiveness", "Critical Thinking", "Monitoring", "Instructing", "Science"], "medium_skills": ["Speaking", "Reading Comprehension", "Judgment and Decision Making", "Complex Problem Solving", "Coordination", "Time Management"], "low_skills": ["Programming", "Equipment Maintenance", "Mathematics", "Negotiation"]},
    "29-2010.00": {"high_skills": ["Science", "Quality Control Analysis", "Critical Thinking", "Monitoring", "Reading Comprehension"], "medium_skills": ["Active Learning", "Judgment and Decision Making", "Time Management", "Operation Monitoring", "Complex Problem Solving"], "low_skills": ["Programming", "Persuasion", "Negotiation", "Management of Personnel Resources", "Speaking"]},
    "29-2034.00": {"high_skills": ["Service Orientation", "Active Listening", "Operation and Control", "Monitoring", "Critical Thinking"], "medium_skills": ["Reading Comprehension", "Speaking", "Social Perceptiveness", "Time Management", "Coordination", "Science"], "low_skills": ["Programming", "Mathematics", "Persuasion", "Negotiation", "Management of Personnel Resources"]},
    "29-1071.00": {"high_skills": ["Critical Thinking", "Active Listening", "Service Orientation", "Social Perceptiveness", "Science", "Judgment and Decision Making"], "medium_skills": ["Reading Comprehension", "Speaking", "Monitoring", "Complex Problem Solving", "Active Learning", "Writing"], "low_skills": ["Programming", "Equipment Maintenance", "Repairing", "Mathematics"]},

    # ── Healthcare Support ──
    "31-1120.00": {"high_skills": ["Service Orientation", "Active Listening", "Social Perceptiveness", "Monitoring"], "medium_skills": ["Speaking", "Coordination", "Time Management", "Critical Thinking"], "low_skills": ["Programming", "Equipment Maintenance", "Mathematics", "Science", "Writing", "Management of Financial Resources", "Negotiation"]},
    "31-1131.00": {"high_skills": ["Service Orientation", "Active Listening", "Social Perceptiveness", "Monitoring", "Coordination"], "medium_skills": ["Speaking", "Time Management", "Critical Thinking", "Reading Comprehension"], "low_skills": ["Programming", "Equipment Maintenance", "Mathematics", "Science", "Writing", "Management of Financial Resources"]},
    "31-9091.00": {"high_skills": ["Service Orientation", "Active Listening", "Coordination", "Monitoring"], "medium_skills": ["Speaking", "Social Perceptiveness", "Time Management", "Reading Comprehension", "Critical Thinking"], "low_skills": ["Programming", "Mathematics", "Science", "Writing", "Negotiation", "Management of Financial Resources"]},
    "31-9092.00": {"high_skills": ["Service Orientation", "Active Listening", "Social Perceptiveness", "Speaking", "Coordination"], "medium_skills": ["Time Management", "Reading Comprehension", "Critical Thinking", "Monitoring"], "low_skills": ["Programming", "Equipment Maintenance", "Mathematics", "Science", "Negotiation", "Management of Financial Resources"]},
    "31-9097.00": {"high_skills": ["Service Orientation", "Active Listening", "Social Perceptiveness", "Monitoring"], "medium_skills": ["Speaking", "Coordination", "Time Management", "Critical Thinking", "Quality Control Analysis"], "low_skills": ["Programming", "Equipment Maintenance", "Mathematics", "Writing", "Negotiation", "Management of Financial Resources"]},

    # ── Protective Service ──
    "33-1012.00": {"high_skills": ["Judgment and Decision Making", "Critical Thinking", "Coordination", "Management of Personnel Resources", "Speaking", "Social Perceptiveness"], "medium_skills": ["Active Listening", "Monitoring", "Time Management", "Writing", "Complex Problem Solving"], "low_skills": ["Programming", "Equipment Maintenance", "Mathematics", "Science"]},
    "33-3051.00": {"high_skills": ["Active Listening", "Social Perceptiveness", "Speaking", "Critical Thinking", "Judgment and Decision Making"], "medium_skills": ["Monitoring", "Coordination", "Writing", "Time Management", "Negotiation", "Service Orientation"], "low_skills": ["Programming", "Equipment Maintenance", "Mathematics", "Science", "Technology Design"]},
    "33-9032.00": {"high_skills": ["Monitoring", "Active Listening", "Speaking", "Social Perceptiveness"], "medium_skills": ["Critical Thinking", "Judgment and Decision Making", "Coordination", "Time Management", "Service Orientation"], "low_skills": ["Programming", "Equipment Maintenance", "Mathematics", "Science", "Writing", "Management of Financial Resources"]},

    # ── Food Preparation ──
    "35-1012.00": {"high_skills": ["Coordination", "Time Management", "Management of Personnel Resources", "Monitoring", "Speaking"], "medium_skills": ["Critical Thinking", "Judgment and Decision Making", "Service Orientation", "Active Listening", "Management of Material Resources"], "low_skills": ["Programming", "Science", "Writing", "Mathematics", "Technology Design"]},
    "35-2014.00": {"high_skills": ["Monitoring", "Time Management", "Coordination", "Quality Control Analysis"], "medium_skills": ["Active Listening", "Speaking", "Critical Thinking", "Service Orientation", "Equipment Selection"], "low_skills": ["Programming", "Science", "Writing", "Mathematics", "Technology Design", "Management of Financial Resources"]},
    "35-3031.00": {"high_skills": ["Service Orientation", "Active Listening", "Speaking", "Social Perceptiveness"], "medium_skills": ["Coordination", "Time Management", "Monitoring", "Critical Thinking"], "low_skills": ["Programming", "Science", "Writing", "Mathematics", "Technology Design", "Management of Financial Resources", "Complex Problem Solving"]},

    # ── Building/Grounds Maintenance ──
    "37-1011.00": {"high_skills": ["Coordination", "Time Management", "Management of Personnel Resources", "Monitoring", "Speaking"], "medium_skills": ["Judgment and Decision Making", "Critical Thinking", "Management of Material Resources", "Active Listening"], "low_skills": ["Programming", "Science", "Writing", "Mathematics", "Technology Design"]},
    "37-2011.00": {"high_skills": ["Time Management", "Monitoring", "Operation and Control"], "medium_skills": ["Coordination", "Equipment Selection", "Active Listening", "Critical Thinking"], "low_skills": ["Programming", "Science", "Writing", "Mathematics", "Technology Design", "Management of Financial Resources", "Negotiation", "Persuasion"]},
    "37-3011.00": {"high_skills": ["Operation and Control", "Time Management", "Coordination", "Equipment Selection"], "medium_skills": ["Monitoring", "Active Listening", "Critical Thinking", "Troubleshooting"], "low_skills": ["Programming", "Science", "Writing", "Mathematics", "Technology Design", "Management of Financial Resources", "Negotiation"]},

    # ── Sales ──
    "41-1011.00": {"high_skills": ["Management of Personnel Resources", "Coordination", "Monitoring", "Speaking", "Persuasion", "Time Management"], "medium_skills": ["Critical Thinking", "Judgment and Decision Making", "Active Listening", "Service Orientation", "Social Perceptiveness", "Negotiation"], "low_skills": ["Programming", "Equipment Maintenance", "Repairing", "Science", "Mathematics"]},
    "41-1012.00": {"high_skills": ["Management of Personnel Resources", "Persuasion", "Speaking", "Coordination", "Negotiation", "Monitoring"], "medium_skills": ["Critical Thinking", "Judgment and Decision Making", "Active Listening", "Time Management", "Management of Financial Resources"], "low_skills": ["Programming", "Equipment Maintenance", "Repairing", "Science", "Mathematics"]},
    "41-2031.00": {"high_skills": ["Service Orientation", "Persuasion", "Speaking", "Active Listening", "Social Perceptiveness"], "medium_skills": ["Negotiation", "Critical Thinking", "Time Management", "Coordination", "Monitoring"], "low_skills": ["Programming", "Equipment Maintenance", "Repairing", "Science", "Mathematics", "Writing"]},
    "41-3011.00": {"high_skills": ["Persuasion", "Speaking", "Negotiation", "Active Listening", "Service Orientation"], "medium_skills": ["Critical Thinking", "Social Perceptiveness", "Time Management", "Writing", "Coordination", "Judgment and Decision Making"], "low_skills": ["Programming", "Equipment Maintenance", "Repairing", "Science", "Mathematics"]},
    "41-3021.00": {"high_skills": ["Persuasion", "Speaking", "Active Listening", "Service Orientation", "Social Perceptiveness", "Negotiation"], "medium_skills": ["Critical Thinking", "Reading Comprehension", "Judgment and Decision Making", "Time Management", "Writing", "Mathematics"], "low_skills": ["Programming", "Equipment Maintenance", "Repairing", "Science", "Technology Design"]},
    "41-3031.00": {"high_skills": ["Persuasion", "Speaking", "Mathematics", "Critical Thinking", "Judgment and Decision Making", "Active Listening"], "medium_skills": ["Reading Comprehension", "Negotiation", "Social Perceptiveness", "Time Management", "Complex Problem Solving", "Active Learning"], "low_skills": ["Programming", "Equipment Maintenance", "Repairing", "Science", "Technology Design"]},
    "41-4012.00": {"high_skills": ["Persuasion", "Speaking", "Active Listening", "Negotiation", "Service Orientation"], "medium_skills": ["Critical Thinking", "Social Perceptiveness", "Time Management", "Coordination", "Judgment and Decision Making"], "low_skills": ["Programming", "Equipment Maintenance", "Repairing", "Science", "Mathematics", "Writing"]},
    "41-9031.00": {"high_skills": ["Persuasion", "Speaking", "Complex Problem Solving", "Critical Thinking", "Technology Design", "Active Learning"], "medium_skills": ["Active Listening", "Negotiation", "Systems Analysis", "Reading Comprehension", "Judgment and Decision Making", "Time Management", "Mathematics"], "low_skills": ["Equipment Maintenance", "Repairing", "Service Orientation", "Management of Personnel Resources"]},
    "41-9011.00": {"high_skills": ["Persuasion", "Speaking", "Service Orientation", "Active Listening", "Social Perceptiveness"], "medium_skills": ["Coordination", "Time Management", "Critical Thinking", "Monitoring"], "low_skills": ["Programming", "Equipment Maintenance", "Repairing", "Science", "Mathematics", "Writing", "Management of Financial Resources"]},
    "41-3091.00": {"high_skills": ["Persuasion", "Speaking", "Active Listening", "Service Orientation", "Negotiation"], "medium_skills": ["Critical Thinking", "Social Perceptiveness", "Time Management", "Writing", "Coordination", "Judgment and Decision Making"], "low_skills": ["Programming", "Equipment Maintenance", "Repairing", "Science", "Mathematics"]},

    # ── Office and Administrative Support ──
    "43-1011.00": {"high_skills": ["Coordination", "Time Management", "Management of Personnel Resources", "Monitoring", "Speaking"], "medium_skills": ["Active Listening", "Critical Thinking", "Judgment and Decision Making", "Writing", "Reading Comprehension"], "low_skills": ["Programming", "Equipment Maintenance", "Repairing", "Science", "Mathematics"]},
    "43-3031.00": {"high_skills": ["Mathematics", "Reading Comprehension", "Critical Thinking", "Time Management", "Monitoring"], "medium_skills": ["Active Listening", "Writing", "Judgment and Decision Making", "Speaking"], "low_skills": ["Programming", "Equipment Maintenance", "Repairing", "Science", "Persuasion", "Negotiation", "Management of Personnel Resources"]},
    "43-4051.00": {"high_skills": ["Active Listening", "Service Orientation", "Speaking", "Social Perceptiveness"], "medium_skills": ["Critical Thinking", "Reading Comprehension", "Time Management", "Coordination", "Monitoring", "Judgment and Decision Making"], "low_skills": ["Programming", "Equipment Maintenance", "Repairing", "Science", "Mathematics", "Management of Financial Resources"]},
    "43-4171.00": {"high_skills": ["Active Listening", "Speaking", "Service Orientation", "Social Perceptiveness"], "medium_skills": ["Reading Comprehension", "Time Management", "Coordination", "Critical Thinking"], "low_skills": ["Programming", "Equipment Maintenance", "Repairing", "Science", "Mathematics", "Writing", "Management of Financial Resources"]},
    "43-5061.00": {"high_skills": ["Coordination", "Time Management", "Monitoring", "Critical Thinking"], "medium_skills": ["Active Listening", "Speaking", "Reading Comprehension", "Judgment and Decision Making", "Writing", "Mathematics"], "low_skills": ["Programming", "Equipment Maintenance", "Repairing", "Science", "Persuasion"]},
    "43-6011.00": {"high_skills": ["Active Listening", "Time Management", "Writing", "Reading Comprehension", "Coordination", "Speaking"], "medium_skills": ["Critical Thinking", "Judgment and Decision Making", "Monitoring", "Service Orientation", "Social Perceptiveness"], "low_skills": ["Programming", "Equipment Maintenance", "Repairing", "Science", "Mathematics"]},
    "43-6014.00": {"high_skills": ["Active Listening", "Time Management", "Speaking", "Writing", "Reading Comprehension"], "medium_skills": ["Coordination", "Service Orientation", "Critical Thinking", "Monitoring"], "low_skills": ["Programming", "Equipment Maintenance", "Repairing", "Science", "Mathematics", "Negotiation", "Management of Financial Resources"]},
    "43-9061.00": {"high_skills": ["Time Management", "Active Listening", "Reading Comprehension", "Speaking"], "medium_skills": ["Writing", "Coordination", "Service Orientation", "Critical Thinking", "Monitoring"], "low_skills": ["Programming", "Equipment Maintenance", "Repairing", "Science", "Mathematics", "Negotiation"]},
    "43-3011.00": {"high_skills": ["Active Listening", "Speaking", "Persuasion", "Negotiation", "Social Perceptiveness"], "medium_skills": ["Critical Thinking", "Reading Comprehension", "Time Management", "Judgment and Decision Making", "Monitoring"], "low_skills": ["Programming", "Equipment Maintenance", "Repairing", "Science", "Mathematics"]},
    "43-4111.00": {"high_skills": ["Active Listening", "Speaking", "Social Perceptiveness", "Reading Comprehension"], "medium_skills": ["Writing", "Critical Thinking", "Time Management", "Service Orientation", "Coordination"], "low_skills": ["Programming", "Equipment Maintenance", "Repairing", "Science", "Mathematics", "Negotiation", "Management of Financial Resources"]},

    # ── Construction ──
    "47-1011.00": {"high_skills": ["Coordination", "Management of Personnel Resources", "Time Management", "Monitoring", "Speaking"], "medium_skills": ["Judgment and Decision Making", "Critical Thinking", "Management of Material Resources", "Active Listening", "Quality Control Analysis"], "low_skills": ["Programming", "Science", "Writing", "Technology Design"]},
    "47-2031.00": {"high_skills": ["Equipment Selection", "Operation and Control", "Quality Control Analysis", "Troubleshooting", "Mathematics"], "medium_skills": ["Critical Thinking", "Coordination", "Time Management", "Monitoring", "Complex Problem Solving", "Active Learning"], "low_skills": ["Programming", "Science", "Writing", "Persuasion", "Negotiation"]},
    "47-2111.00": {"high_skills": ["Troubleshooting", "Equipment Selection", "Installation", "Operation and Control", "Repairing", "Quality Control Analysis"], "medium_skills": ["Critical Thinking", "Complex Problem Solving", "Mathematics", "Reading Comprehension", "Monitoring", "Active Learning"], "low_skills": ["Programming", "Science", "Writing", "Persuasion", "Negotiation"]},
    "47-2152.00": {"high_skills": ["Troubleshooting", "Equipment Selection", "Installation", "Repairing", "Operation and Control", "Quality Control Analysis"], "medium_skills": ["Critical Thinking", "Complex Problem Solving", "Mathematics", "Reading Comprehension", "Monitoring"], "low_skills": ["Programming", "Science", "Writing", "Persuasion", "Negotiation"]},
    "47-2061.00": {"high_skills": ["Operation and Control", "Coordination", "Time Management"], "medium_skills": ["Active Listening", "Monitoring", "Equipment Selection", "Critical Thinking"], "low_skills": ["Programming", "Science", "Writing", "Mathematics", "Technology Design", "Persuasion", "Negotiation", "Management of Financial Resources"]},

    # ── Installation, Maintenance, Repair ──
    "49-1011.00": {"high_skills": ["Coordination", "Management of Personnel Resources", "Troubleshooting", "Monitoring", "Time Management", "Judgment and Decision Making"], "medium_skills": ["Critical Thinking", "Speaking", "Active Listening", "Complex Problem Solving", "Equipment Selection", "Quality Control Analysis"], "low_skills": ["Programming", "Science", "Writing", "Persuasion"]},
    "49-3023.00": {"high_skills": ["Troubleshooting", "Repairing", "Equipment Maintenance", "Operation Monitoring", "Critical Thinking", "Complex Problem Solving"], "medium_skills": ["Equipment Selection", "Active Learning", "Quality Control Analysis", "Reading Comprehension", "Monitoring", "Time Management"], "low_skills": ["Programming", "Science", "Writing", "Persuasion", "Negotiation"]},
    "49-9021.00": {"high_skills": ["Troubleshooting", "Repairing", "Installation", "Equipment Maintenance", "Operation and Control", "Equipment Selection"], "medium_skills": ["Critical Thinking", "Complex Problem Solving", "Reading Comprehension", "Monitoring", "Quality Control Analysis", "Active Learning"], "low_skills": ["Programming", "Science", "Writing", "Persuasion", "Negotiation"]},
    "49-9041.00": {"high_skills": ["Repairing", "Equipment Maintenance", "Troubleshooting", "Operation Monitoring", "Equipment Selection"], "medium_skills": ["Critical Thinking", "Complex Problem Solving", "Reading Comprehension", "Quality Control Analysis", "Installation", "Active Learning"], "low_skills": ["Programming", "Science", "Writing", "Persuasion", "Negotiation"]},
    "49-9071.00": {"high_skills": ["Repairing", "Equipment Maintenance", "Troubleshooting", "Equipment Selection", "Operation and Control"], "medium_skills": ["Critical Thinking", "Complex Problem Solving", "Reading Comprehension", "Time Management", "Monitoring"], "low_skills": ["Programming", "Science", "Writing", "Persuasion", "Negotiation", "Management of Financial Resources"]},

    # ── Production ──
    "51-1011.00": {"high_skills": ["Coordination", "Management of Personnel Resources", "Monitoring", "Time Management", "Judgment and Decision Making"], "medium_skills": ["Critical Thinking", "Speaking", "Active Listening", "Quality Control Analysis", "Management of Material Resources", "Complex Problem Solving"], "low_skills": ["Programming", "Science", "Writing", "Technology Design"]},
    "51-2098.00": {"high_skills": ["Operation and Control", "Quality Control Analysis", "Monitoring", "Coordination"], "medium_skills": ["Time Management", "Active Listening", "Critical Thinking", "Equipment Selection"], "low_skills": ["Programming", "Science", "Writing", "Mathematics", "Persuasion", "Negotiation", "Management of Financial Resources"]},
    "51-4041.00": {"high_skills": ["Operation and Control", "Quality Control Analysis", "Mathematics", "Monitoring", "Equipment Selection"], "medium_skills": ["Critical Thinking", "Complex Problem Solving", "Reading Comprehension", "Troubleshooting", "Active Learning", "Time Management"], "low_skills": ["Programming", "Persuasion", "Negotiation", "Writing", "Service Orientation"]},
    "51-4121.00": {"high_skills": ["Operation and Control", "Quality Control Analysis", "Equipment Selection", "Monitoring"], "medium_skills": ["Critical Thinking", "Troubleshooting", "Mathematics", "Active Learning", "Time Management", "Reading Comprehension"], "low_skills": ["Programming", "Persuasion", "Negotiation", "Writing", "Science", "Service Orientation"]},
    "51-9061.00": {"high_skills": ["Quality Control Analysis", "Monitoring", "Critical Thinking", "Operation Monitoring"], "medium_skills": ["Reading Comprehension", "Active Learning", "Judgment and Decision Making", "Time Management", "Mathematics"], "low_skills": ["Programming", "Persuasion", "Negotiation", "Writing", "Service Orientation", "Management of Financial Resources"]},

    # ── Transportation ──
    "53-1042.00": {"high_skills": ["Coordination", "Management of Personnel Resources", "Time Management", "Monitoring", "Speaking"], "medium_skills": ["Judgment and Decision Making", "Critical Thinking", "Active Listening", "Management of Material Resources"], "low_skills": ["Programming", "Science", "Writing", "Mathematics", "Technology Design"]},
    "53-3032.00": {"high_skills": ["Operation and Control", "Monitoring", "Time Management"], "medium_skills": ["Critical Thinking", "Coordination", "Active Listening", "Judgment and Decision Making", "Troubleshooting"], "low_skills": ["Programming", "Science", "Writing", "Mathematics", "Persuasion", "Negotiation", "Management of Financial Resources"]},
    "53-3033.00": {"high_skills": ["Operation and Control", "Time Management", "Service Orientation", "Monitoring"], "medium_skills": ["Critical Thinking", "Coordination", "Active Listening", "Judgment and Decision Making"], "low_skills": ["Programming", "Science", "Writing", "Mathematics", "Persuasion", "Negotiation", "Management of Financial Resources"]},
    "53-7062.00": {"high_skills": ["Coordination", "Time Management", "Operation and Control", "Monitoring"], "medium_skills": ["Active Listening", "Critical Thinking", "Equipment Selection"], "low_skills": ["Programming", "Science", "Writing", "Mathematics", "Persuasion", "Negotiation", "Management of Financial Resources", "Speaking"]},
    "53-7051.00": {"high_skills": ["Operation and Control", "Monitoring", "Coordination"], "medium_skills": ["Time Management", "Active Listening", "Critical Thinking", "Equipment Selection"], "low_skills": ["Programming", "Science", "Writing", "Mathematics", "Persuasion", "Negotiation", "Management of Financial Resources"]},
}


# ═══════════════════════════════════════════════════════════════════════
# TECHNOLOGY SKILLS — synthetic technology associations
# ═══════════════════════════════════════════════════════════════════════

TECHNOLOGY_BY_MAJOR_GROUP = {
    "11-0000": [
        {"commodity_title": "Microsoft Office", "hot_technology": True},
        {"commodity_title": "SAP", "hot_technology": True},
        {"commodity_title": "Oracle", "hot_technology": False},
        {"commodity_title": "Salesforce", "hot_technology": True},
        {"commodity_title": "Microsoft Teams", "hot_technology": True},
    ],
    "13-0000": [
        {"commodity_title": "Microsoft Excel", "hot_technology": True},
        {"commodity_title": "SAP", "hot_technology": True},
        {"commodity_title": "QuickBooks", "hot_technology": False},
        {"commodity_title": "Tableau", "hot_technology": True},
        {"commodity_title": "Power BI", "hot_technology": True},
    ],
    "15-0000": [
        {"commodity_title": "Python", "hot_technology": True},
        {"commodity_title": "JavaScript", "hot_technology": True},
        {"commodity_title": "SQL", "hot_technology": True},
        {"commodity_title": "Amazon Web Services", "hot_technology": True},
        {"commodity_title": "Git", "hot_technology": True},
        {"commodity_title": "Docker", "hot_technology": True},
        {"commodity_title": "Kubernetes", "hot_technology": True},
        {"commodity_title": "Linux", "hot_technology": True},
    ],
    "17-0000": [
        {"commodity_title": "AutoCAD", "hot_technology": True},
        {"commodity_title": "MATLAB", "hot_technology": True},
        {"commodity_title": "SolidWorks", "hot_technology": True},
        {"commodity_title": "Microsoft Office", "hot_technology": True},
        {"commodity_title": "SAP", "hot_technology": False},
    ],
    "19-0000": [
        {"commodity_title": "SPSS", "hot_technology": False},
        {"commodity_title": "R", "hot_technology": True},
        {"commodity_title": "Python", "hot_technology": True},
        {"commodity_title": "SAS", "hot_technology": False},
        {"commodity_title": "Microsoft Excel", "hot_technology": True},
    ],
    "21-0000": [
        {"commodity_title": "Microsoft Office", "hot_technology": True},
        {"commodity_title": "Electronic Health Records", "hot_technology": True},
        {"commodity_title": "Case Management Software", "hot_technology": False},
    ],
    "23-0000": [
        {"commodity_title": "Westlaw", "hot_technology": True},
        {"commodity_title": "LexisNexis", "hot_technology": True},
        {"commodity_title": "Microsoft Office", "hot_technology": True},
        {"commodity_title": "Document Management Systems", "hot_technology": False},
    ],
    "25-0000": [
        {"commodity_title": "Learning Management Systems", "hot_technology": True},
        {"commodity_title": "Microsoft Office", "hot_technology": True},
        {"commodity_title": "Google Workspace", "hot_technology": True},
        {"commodity_title": "Zoom", "hot_technology": True},
    ],
    "27-0000": [
        {"commodity_title": "Adobe Creative Suite", "hot_technology": True},
        {"commodity_title": "Figma", "hot_technology": True},
        {"commodity_title": "Adobe Photoshop", "hot_technology": True},
        {"commodity_title": "Adobe Illustrator", "hot_technology": True},
    ],
    "29-0000": [
        {"commodity_title": "Electronic Health Records", "hot_technology": True},
        {"commodity_title": "Epic Systems", "hot_technology": True},
        {"commodity_title": "MEDITECH", "hot_technology": False},
        {"commodity_title": "Microsoft Office", "hot_technology": True},
    ],
    "31-0000": [
        {"commodity_title": "Electronic Health Records", "hot_technology": True},
        {"commodity_title": "Medical Devices", "hot_technology": False},
    ],
    "33-0000": [
        {"commodity_title": "Law Enforcement Records Management", "hot_technology": False},
        {"commodity_title": "Computer-Aided Dispatch", "hot_technology": False},
    ],
    "35-0000": [
        {"commodity_title": "Point of Sale Systems", "hot_technology": True},
        {"commodity_title": "Inventory Management Software", "hot_technology": False},
    ],
    "37-0000": [
        {"commodity_title": "Building Management Systems", "hot_technology": False},
    ],
    "41-0000": [
        {"commodity_title": "Salesforce", "hot_technology": True},
        {"commodity_title": "HubSpot", "hot_technology": True},
        {"commodity_title": "Microsoft Office", "hot_technology": True},
        {"commodity_title": "LinkedIn Sales Navigator", "hot_technology": True},
    ],
    "43-0000": [
        {"commodity_title": "Microsoft Office", "hot_technology": True},
        {"commodity_title": "SAP", "hot_technology": False},
        {"commodity_title": "QuickBooks", "hot_technology": False},
    ],
    "47-0000": [
        {"commodity_title": "AutoCAD", "hot_technology": False},
        {"commodity_title": "Project Management Software", "hot_technology": True},
    ],
    "49-0000": [
        {"commodity_title": "Diagnostic Software", "hot_technology": False},
        {"commodity_title": "Computerized Maintenance Management Systems", "hot_technology": False},
    ],
    "51-0000": [
        {"commodity_title": "CNC Programming Software", "hot_technology": False},
        {"commodity_title": "Manufacturing Execution Systems", "hot_technology": False},
        {"commodity_title": "ERP Systems", "hot_technology": True},
    ],
    "53-0000": [
        {"commodity_title": "GPS Navigation Systems", "hot_technology": True},
        {"commodity_title": "Fleet Management Software", "hot_technology": False},
    ],
}


# ═══════════════════════════════════════════════════════════════════════
# SAMPLE TASKS — a few representative tasks per major group
# ═══════════════════════════════════════════════════════════════════════

TASKS_BY_MAJOR_GROUP = {
    "11-0000": [
        {"task_id": 1, "task": "Direct and coordinate activities of businesses or departments concerned with production, pricing, sales, or distribution of products.", "task_type": "Core"},
        {"task_id": 2, "task": "Review financial statements, sales or activity reports, or other performance data to measure productivity or goal achievement.", "task_type": "Core"},
        {"task_id": 3, "task": "Establish and implement departmental policies, goals, objectives, or procedures.", "task_type": "Core"},
    ],
    "13-0000": [
        {"task_id": 4, "task": "Analyze data to inform operational decisions or activities.", "task_type": "Core"},
        {"task_id": 5, "task": "Prepare reports or presentations for internal or external use.", "task_type": "Core"},
        {"task_id": 6, "task": "Advise others on business or operational matters.", "task_type": "Core"},
    ],
    "15-0000": [
        {"task_id": 7, "task": "Develop, create, or modify general computer applications software or specialized utility programs.", "task_type": "Core"},
        {"task_id": 8, "task": "Analyze information to determine, recommend, and plan installation of a new system or modification of an existing system.", "task_type": "Core"},
        {"task_id": 9, "task": "Test, maintain, and monitor computer programs and systems, including coordinating the installation of computer programs and systems.", "task_type": "Core"},
    ],
    "17-0000": [
        {"task_id": 10, "task": "Design or direct engineering systems, structures, or processes using engineering principles and technology.", "task_type": "Core"},
        {"task_id": 11, "task": "Analyze project requirements and develop engineering specifications.", "task_type": "Core"},
    ],
    "19-0000": [
        {"task_id": 12, "task": "Plan and conduct research to develop theories, methods, instrumentation, or new materials.", "task_type": "Core"},
        {"task_id": 13, "task": "Analyze data to identify trends and draw conclusions.", "task_type": "Core"},
    ],
    "21-0000": [
        {"task_id": 14, "task": "Counsel individuals, groups, or families to help them understand problems, deal with crisis situations.", "task_type": "Core"},
        {"task_id": 15, "task": "Assess client needs and develop treatment or service plans.", "task_type": "Core"},
    ],
    "23-0000": [
        {"task_id": 16, "task": "Analyze the probable outcomes of cases, using knowledge of legal precedents.", "task_type": "Core"},
        {"task_id": 17, "task": "Prepare legal documents such as briefs, pleadings, appeals, or contracts.", "task_type": "Core"},
    ],
    "25-0000": [
        {"task_id": 18, "task": "Prepare and deliver lectures and instructional materials.", "task_type": "Core"},
        {"task_id": 19, "task": "Evaluate and grade students' classwork, assignments, and papers.", "task_type": "Core"},
    ],
    "27-0000": [
        {"task_id": 20, "task": "Create designs, concepts, and sample layouts based on knowledge of layout principles and esthetic design concepts.", "task_type": "Core"},
    ],
    "29-0000": [
        {"task_id": 21, "task": "Diagnose and treat medical conditions and diseases.", "task_type": "Core"},
        {"task_id": 22, "task": "Monitor patients' conditions and progress and reevaluate treatments as necessary.", "task_type": "Core"},
    ],
    "31-0000": [
        {"task_id": 23, "task": "Provide basic patient care or assistance under the direction of medical staff.", "task_type": "Core"},
    ],
    "33-0000": [
        {"task_id": 24, "task": "Patrol assigned areas to enforce laws and ordinances, regulate traffic, control crowds, prevent crime, and arrest violators.", "task_type": "Core"},
    ],
    "35-0000": [
        {"task_id": 25, "task": "Prepare and cook foods according to recipes and customer requests.", "task_type": "Core"},
    ],
    "37-0000": [
        {"task_id": 26, "task": "Clean and maintain buildings, grounds, and related areas.", "task_type": "Core"},
    ],
    "41-0000": [
        {"task_id": 27, "task": "Explain products or services and prices and demonstrate use of products.", "task_type": "Core"},
        {"task_id": 28, "task": "Contact customers to persuade them to purchase merchandise or services.", "task_type": "Core"},
    ],
    "43-0000": [
        {"task_id": 29, "task": "Perform general office duties such as ordering supplies, maintaining records management database systems, and performing basic bookkeeping work.", "task_type": "Core"},
    ],
    "47-0000": [
        {"task_id": 30, "task": "Read blueprints, drawings, or specifications to determine construction requirements.", "task_type": "Core"},
    ],
    "49-0000": [
        {"task_id": 31, "task": "Inspect, test, and repair equipment, machinery, and structures.", "task_type": "Core"},
    ],
    "51-0000": [
        {"task_id": 32, "task": "Set up, operate, or tend machines to produce or manufacture products.", "task_type": "Core"},
    ],
    "53-0000": [
        {"task_id": 33, "task": "Drive vehicles to transport materials, merchandise, or people.", "task_type": "Core"},
    ],
}


# ═══════════════════════════════════════════════════════════════════════
# SCORE GENERATION — deterministic, seeded by SOC code
# ═══════════════════════════════════════════════════════════════════════

def _seed_for(soc_code: str) -> int:
    """Deterministic seed from SOC code for reproducible scores."""
    return int(hashlib.md5(soc_code.encode()).hexdigest()[:8], 16)


def _generate_skill_scores(soc_code: str, profile: dict) -> list:
    """Generate importance/level scores for all 35 skills based on profile."""
    rng = random.Random(_seed_for(soc_code))
    high = set(profile.get("high_skills", []))
    medium = set(profile.get("medium_skills", []))
    low = set(profile.get("low_skills", []))
    scores = []
    for skill in ONET_SKILLS:
        name = skill["name"]
        if name in high:
            importance = round(rng.uniform(4.0, 4.8), 2)
            level = round(rng.uniform(5.0, 6.5), 2)
        elif name in medium:
            importance = round(rng.uniform(3.0, 3.8), 2)
            level = round(rng.uniform(3.5, 5.0), 2)
        elif name in low:
            importance = round(rng.uniform(1.5, 2.5), 2)
            level = round(rng.uniform(1.0, 3.0), 2)
        else:
            importance = round(rng.uniform(2.5, 3.5), 2)
            level = round(rng.uniform(2.5, 4.0), 2)
        scores.append({
            "element_id": skill["element_id"],
            "skill_name": name,
            "category": skill["category"],
            "importance": importance,
            "level": level,
        })
    return scores


# ═══════════════════════════════════════════════════════════════════════
# OnetDataStore — main data access class
# ═══════════════════════════════════════════════════════════════════════

class OnetDataStore:
    """In-memory O*NET data store.
    Loads from flat files if available, otherwise uses synthetic data.
    """

    def __init__(self):
        self.occupations: dict = {}       # soc_code -> occupation dict
        self.skills_matrix: dict = {}     # soc_code -> [{element_id, importance, level}, ...]
        self.alternate_titles: dict = {}  # soc_code -> [titles]
        self.technology_skills: dict = {} # soc_code -> [{commodity_title, hot_technology}]
        self.tasks: dict = {}             # soc_code -> [{task_id, task, task_type}]
        self._load_synthetic()

    def _load_synthetic(self):
        """Populate store with synthetic data."""
        for occ in SYNTHETIC_OCCUPATIONS:
            code = occ["onet_soc_code"]
            self.occupations[code] = occ
            self.alternate_titles[code] = occ.get("alternate_titles", [])

            # Skills matrix
            profile = OCCUPATION_PROFILES.get(code, {})
            if profile:
                self.skills_matrix[code] = _generate_skill_scores(code, profile)
            else:
                # Fallback: generic mid-range scores
                self.skills_matrix[code] = _generate_skill_scores(code, {
                    "high_skills": ["Critical Thinking", "Active Listening"],
                    "medium_skills": ["Speaking", "Reading Comprehension", "Time Management"],
                    "low_skills": ["Programming", "Equipment Maintenance"],
                })

            # Technology skills
            mg = occ.get("major_group", "")
            self.technology_skills[code] = TECHNOLOGY_BY_MAJOR_GROUP.get(mg, [])

            # Tasks
            self.tasks[code] = TASKS_BY_MAJOR_GROUP.get(mg, [])

    # ── Search ──────────────────────────────────────────────────────

    def search_occupations(self, query: str, job_zone: int = None, major_group: str = None) -> list:
        """Search occupations by title, alternate titles, or description."""
        query_lower = query.lower().strip()
        results = []
        for code, occ in self.occupations.items():
            if job_zone and occ.get("job_zone") != job_zone:
                continue
            if major_group and occ.get("major_group") != major_group:
                continue
            if not query_lower:
                results.append(occ)
                continue
            # Check title
            if query_lower in occ["title"].lower():
                results.append(occ)
                continue
            # Check alternate titles
            alts = self.alternate_titles.get(code, [])
            if any(query_lower in alt.lower() for alt in alts):
                results.append(occ)
                continue
            # Check description
            if query_lower in occ.get("description", "").lower():
                results.append(occ)
                continue
        # Sort by title
        results.sort(key=lambda x: x["title"])
        return results

    # ── Single occupation ───────────────────────────────────────────

    def get_occupation(self, soc_code: str) -> dict | None:
        """Get full occupation detail."""
        occ = self.occupations.get(soc_code)
        if not occ:
            return None
        return {
            **occ,
            "alternate_titles": self.alternate_titles.get(soc_code, []),
            "technology_skills": self.technology_skills.get(soc_code, []),
            "tasks": self.tasks.get(soc_code, []),
        }

    # ── Skills ──────────────────────────────────────────────────────

    def get_skills(self, soc_code: str, min_importance: float = 0) -> list:
        """Get skills for an occupation, sorted by importance descending."""
        skills = self.skills_matrix.get(soc_code, [])
        if min_importance > 0:
            skills = [s for s in skills if s["importance"] >= min_importance]
        return sorted(skills, key=lambda x: x["importance"], reverse=True)

    def get_occupations_by_skill(self, element_id: str) -> list:
        """Get all occupations ranked by importance of a given skill."""
        results = []
        for code, skills in self.skills_matrix.items():
            for s in skills:
                if s["element_id"] == element_id:
                    occ = self.occupations.get(code, {})
                    results.append({
                        "onet_soc_code": code,
                        "title": occ.get("title", ""),
                        "importance": s["importance"],
                        "level": s["level"],
                    })
                    break
        results.sort(key=lambda x: x["importance"], reverse=True)
        return results

    # ── Title matching ──────────────────────────────────────────────

    def match_title(self, title: str, description: str = "") -> list:
        """Deterministic matching of a job title against O*NET occupations.
        Returns top matches with confidence scores.
        """
        if not title:
            return []
        title_lower = title.lower().strip()
        desc_lower = (description or "").lower().strip()
        scored = []

        for code, occ in self.occupations.items():
            score = 0
            occ_title = occ["title"].lower()
            alts = [a.lower() for a in self.alternate_titles.get(code, [])]

            # Exact title match
            if title_lower == occ_title:
                score = 98
            elif title_lower in alts:
                score = 95
            else:
                # Partial matching
                title_words = set(title_lower.split())
                occ_words = set(occ_title.split())
                # Word overlap with occupation title
                overlap = title_words & occ_words
                if overlap:
                    score = min(85, 40 + len(overlap) * 15)
                # Check alternate titles for word overlap
                for alt in alts:
                    alt_words = set(alt.split())
                    alt_overlap = title_words & alt_words
                    if alt_overlap:
                        alt_score = min(85, 35 + len(alt_overlap) * 15)
                        score = max(score, alt_score)
                # Description boost
                if desc_lower and score > 0:
                    occ_desc = occ.get("description", "").lower()
                    desc_words = set(desc_lower.split()) - {"the", "a", "an", "and", "or", "to", "in", "of", "for", "is", "are", "was", "with"}
                    desc_overlap = desc_words & set(occ_desc.split())
                    if len(desc_overlap) > 3:
                        score = min(95, score + min(10, len(desc_overlap)))

            if score > 20:
                scored.append({
                    "onet_soc_code": code,
                    "title": occ["title"],
                    "confidence": score,
                    "job_zone": occ.get("job_zone"),
                    "major_group_name": occ.get("major_group_name", ""),
                })

        scored.sort(key=lambda x: x["confidence"], reverse=True)
        return scored[:10]


# ── Module-level singleton ──
onet_store = OnetDataStore()
