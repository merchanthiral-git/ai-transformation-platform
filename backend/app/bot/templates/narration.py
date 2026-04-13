"""Rich narration templates for the bot.

Used when no AI API key is configured. Templates use Python str.format()
with data values injected at runtime. Each action has intro, progress,
finding, and summary templates. Multiple options per slot allow variation.
"""

# ═════════════════════════════════════════════════════════════════
#  PROFILE WORKFORCE
# ═════════════════════════════════════════════════════════════════

PROFILE_WORKFORCE = {
    "intro": [
        "Let me start by understanding who works here. Reading the workforce data for {company_name}...",
        "First things first — let's see what your organization looks like. Pulling up the data for {company_name}...",
        "Before we look at AI opportunities, I need to understand the organization itself. Loading {company_name} workforce data...",
    ],
    "progress": [
        "Processing {total_employees:,} employee records across {function_count} functions...",
        "Building the workforce profile... {total_employees:,} people, {family_count} job families...",
        "Mapping {total_employees:,} employees across {function_count} functions and {family_count} job families...",
    ],
    "findings": {
        "concentration_risk": [
            "Your {function_name} function represents {percentage:.0f}% of total headcount ({count:,} people). That's a significant concentration — if this function is disrupted by AI or attrition, it affects a disproportionate share of the workforce.",
            "{function_name} accounts for {percentage:.0f}% of the org ({count:,} people). In my experience, concentrations above 30% create fragility — any disruption to this function ripples across the business.",
        ],
        "micro_function": [
            "{function_name} has only {count} people. Functions this small often lack career progression paths and create key-person dependencies. Consider whether this should be a standalone function or embedded in a larger group.",
            "Heads up — {function_name} has just {count} employees. That's too small for a distinct function. You'll likely see retention issues (no growth path) and knowledge concentration risk.",
        ],
        "tenure_high": [
            "Average tenure is {avg_tenure:.1f} years. {high_tenure_function} has the longest average at {high_tenure:.1f} years — deep institutional knowledge but potentially higher resistance to change. {low_tenure_function} is at {low_tenure:.1f} years — more adaptable but with less organisational memory.",
            "The org averages {avg_tenure:.1f} years tenure. That's {tenure_interpretation}. {high_tenure_function} leads at {high_tenure:.1f} years — you'll find the most change resistance there but also the most domain expertise.",
        ],
        "tenure_low": [
            "Average tenure is only {avg_tenure:.1f} years — that's quite low. This suggests either rapid growth, high turnover, or both. The upside: less resistance to change. The downside: you may not have enough institutional knowledge to guide the transformation safely.",
            "At {avg_tenure:.1f} years average tenure, your workforce is relatively new. Good news for AI adoption — newer employees tend to be more receptive. But watch out for knowledge gaps during the transition.",
        ],
        "manager_ratio": [
            "Your manager-to-IC ratio is 1:{ratio:.1f}. Industry benchmark for companies your size is roughly 1:{benchmark:.0f}. {interpretation}",
            "I'm seeing 1 manager for every {ratio:.1f} ICs. The benchmark is 1:{benchmark:.0f}. {interpretation}",
        ],
        "fte_split": [
            "{full_time:,} full-time and {part_time:,} part-time employees. {split_comment}",
        ],
    },
    "summary": [
        "Here's the picture: {company_name} has {total_employees:,} employees across {function_count} functions. The largest is {largest_function} ({largest_count:,} people, {largest_pct:.0f}% of the org). Average tenure is {avg_tenure:.1f} years. {key_observation}",
        "Workforce overview: {total_employees:,} people in {function_count} functions. {largest_function} dominates at {largest_pct:.0f}% ({largest_count:,} people). Tenure averages {avg_tenure:.1f} years. {key_observation}",
    ],
}


# ═════════════════════════════════════════════════════════════════
#  ANALYZE ORG STRUCTURE
# ═════════════════════════════════════════════════════════════════

ANALYZE_ORG_STRUCTURE = {
    "intro": [
        "Now let's look at how the organization is structured — management layers, reporting lines, spans of control...",
        "Time to examine the org architecture. I'll map out the hierarchy and see how it compares to benchmarks...",
        "Let me trace the reporting lines. Org structure tells you a lot about decision speed, overhead cost, and change capacity...",
    ],
    "progress": [
        "Mapping the org tree... {manager_count} managers identified across {layer_count} levels...",
        "Building the hierarchy... {total_employees:,} nodes, {manager_count} managers, tracing all reporting lines...",
    ],
    "findings": {
        "layer_count": [
            "Your org has {layers} management layers. For a company with {size:,} employees, the benchmark is {benchmark_min}-{benchmark_max} layers. {interpretation}",
            "I count {layers} layers from individual contributor to the top. {interpretation} Benchmark for orgs your size: {benchmark_min}-{benchmark_max}.",
        ],
        "narrow_span": [
            "{count} managers have fewer than 3 direct reports. Spans below 3 often indicate unnecessary management layers — these roles may be candidates for consolidation or redesign.",
            "I found {count} managers with a span under 3. That's a red flag for over-management. Each of these positions adds salary cost without enough span to justify a dedicated management role.",
        ],
        "wide_span": [
            "{count} managers have more than 15 direct reports. That's too wide — these people likely can't provide meaningful coaching, development, or oversight to all their reports.",
            "{count} managers are stretched across 15+ reports each. In practice, spans this wide mean some reports are essentially unmanaged. Consider adding team leads or splitting these groups.",
        ],
        "span_average": [
            "Average span of control is {avg_span:.1f}. {interpretation}",
            "Overall average span: {avg_span:.1f} direct reports per manager. {interpretation}",
        ],
        "layer_opportunity": [
            "Reducing from {current_layers} to {target_layers} layers could eliminate approximately {eliminated_managers} management positions, saving an estimated ${savings:,.0f} annually in management overhead.",
            "There's a delayering opportunity here. Going from {current_layers} to {target_layers} layers would remove roughly {eliminated_managers} management roles — that's ${savings:,.0f}/year in savings, plus faster decision-making.",
        ],
        "span_by_function": [
            "{function} has an average span of {avg_span:.1f}. {comparison_text}",
        ],
    },
    "summary": [
        "Structural overview: {layers} layers, average span of {avg_span:.1f}, {manager_count} managers overseeing {ic_count:,} ICs. {key_issue}",
    ],
}


# ═════════════════════════════════════════════════════════════════
#  ASSESS AI READINESS
# ═════════════════════════════════════════════════════════════════

ASSESS_AI_READINESS = {
    "intro": [
        "Let's assess how ready each function is for AI transformation. I'll evaluate technology, process, people, and data readiness...",
        "Now for the critical question — where are you ready for AI, and where aren't you? Let me score each function across four dimensions...",
        "AI readiness isn't uniform — some functions are years ahead of others. Let me map the landscape...",
    ],
    "progress": [
        "Scoring {function_count} functions across 4 dimensions: technology, process, people, and data readiness...",
        "Evaluating readiness for {function_count} functions... weighting technology (30%), process (25%), people (25%), data (20%)...",
    ],
    "findings": {
        "readiness_leader": [
            "{function} scores highest at {score}/100 overall — maturity level {level} ({level_name}). {strength_detail}",
            "{function} leads the readiness chart at {score}/100. They're at {level_name} maturity. {strength_detail}",
        ],
        "readiness_laggard": [
            "{function} scores lowest at {score}/100. Their biggest gap is in {weakest_dimension} ({dim_score}/100). {gap_detail}",
            "{function} is the least ready at {score}/100. The main bottleneck is {weakest_dimension} at just {dim_score}/100. {gap_detail}",
        ],
        "readiness_gap": [
            "There's a {gap}-point readiness gap between your most and least ready functions. This means a one-size-fits-all transformation approach won't work — you'll need function-specific strategies and timelines.",
            "The {gap}-point spread between top and bottom functions tells me you need a phased approach. Start transformation where readiness is high, then use those wins to build momentum for lagging functions.",
        ],
        "dimension_insight": [
            "Across the whole org, {weakest_dimension} is the weakest dimension at {avg_score:.0f}/100. {implication}",
            "Organization-wide, the biggest drag is {weakest_dimension} readiness ({avg_score:.0f}/100). {implication}",
        ],
    },
    "summary": [
        "Readiness ranges from {lowest_score}/100 ({lowest_func}) to {highest_score}/100 ({highest_func}). The {gap}-point gap means you need a differentiated strategy. Start pilots in high-readiness functions.",
    ],
}


# ═════════════════════════════════════════════════════════════════
#  IDENTIFY OPPORTUNITIES
# ═════════════════════════════════════════════════════════════════

IDENTIFY_OPPORTUNITIES = {
    "intro": [
        "Now the exciting part — where are the real AI opportunities? Let me analyze each role's automation and augmentation potential...",
        "Let's find where AI can have the biggest impact. I'll score every role based on task characteristics and estimate the value...",
        "This is where the transformation gets concrete. I'm going to identify specific roles where AI can free up time, reduce costs, or improve quality...",
    ],
    "progress": [
        "Scoring {role_count} unique roles... estimating automation potential, hours freed, and cost savings...",
        "Analyzing {role_count} roles across {function_count} functions for automation and augmentation potential...",
    ],
    "findings": {
        "top_opportunity": [
            "Biggest opportunity: **{role_name}** in {function} — {ftes} FTEs spending {automation_pct:.0f}% of time on automatable tasks. That's ~{hours_freed:,.0f} hours/year freed up, worth an estimated ${savings:,.0f}.",
            "The highest-value target is **{role_name}** ({function}): {ftes} people, {automation_pct:.0f}% automation potential. If you only do one thing, start here — ${savings:,.0f} in potential annual savings.",
        ],
        "quick_win": [
            "Quick win: **{role_name}** — {detail}. Low complexity, high impact. Could see results within {timeline}.",
            "Easy win on the table: **{role_name}** — {detail}. This is the kind of change that builds momentum because people see results fast ({timeline}).",
        ],
        "strategic_bet": [
            "Strategic opportunity: **{role_name}** — {detail}. Higher complexity but transformative potential. Plan for {timeline} implementation.",
            "Bigger play: **{role_name}** — {detail}. This requires more investment but the payoff is substantial. Expect {timeline} to full value.",
        ],
        "total_opportunity": [
            "Total across all analyzed roles: {total_ftes:.0f} FTE-equivalents of automatable work, representing ${total_savings:,.0f} in potential annual savings. Of course, real-world capture rates are typically 60-70% of theoretical potential.",
            "Adding it all up: ${total_savings:,.0f} in addressable savings across {total_ftes:.0f} FTE-equivalents. This is the theoretical ceiling — let me model realistic scenarios next.",
        ],
        "quadrant_breakdown": [
            "Opportunity breakdown: {quick_wins} Quick Wins (${qw_savings:,.0f}), {strategic} Strategic Bets (${sb_savings:,.0f}), {incremental} Incremental Gains, {deprioritize} Deprioritized.",
        ],
    },
    "summary": [
        "{role_count} roles analyzed. Top opportunity: {top_role} (${top_savings:,.0f}). {quick_win_count} quick wins identified worth ${qw_total:,.0f}. Total addressable: ${total:,.0f}.",
    ],
}


# ═════════════════════════════════════════════════════════════════
#  ANALYZE SKILLS
# ═════════════════════════════════════════════════════════════════

ANALYZE_SKILLS = {
    "intro": [
        "Let me look at the skills landscape — what you have, what you need, and where the gaps are...",
        "Skills are the bridge between current state and transformed state. Let me map what you're working with...",
        "Now for the human side — do your people have the skills they'll need in the transformed org? Let's find out...",
    ],
    "progress": [
        "Mapping skills across {family_count} job families...",
        "Analyzing skill coverage and identifying gaps for {family_count} job families...",
    ],
    "findings": {
        "top_gap": [
            "Top skill gap: **{skill_name}** — needed across {affected_count:,} employees but currently at low coverage. This is a {market_note} skill, so {strategy_note}.",
            "The most critical gap is **{skill_name}** ({affected_count:,} employees affected). {market_note}. {strategy_note}.",
        ],
        "concentrated_skill": [
            "Warning: **{skill_name}** is held by fewer than 5 people. If any of them leave, you lose that capability entirely. This is a single point of failure.",
            "Risk flag: **{skill_name}** sits with just a handful of people. That's a bus-factor problem — invest in knowledge sharing or cross-training immediately.",
        ],
        "reskill_estimate": [
            "Reskilling timeline: adjacent skill gaps take 4-8 weeks, moderate gaps 8-16 weeks, and major gaps 16-24 weeks. For your workforce, I'd estimate an average of {avg_weeks} weeks per person for the most critical gaps.",
            "Training investment: plan for {avg_weeks} weeks average per person for priority skill gaps. Adjacent skills (same category, different tool) are the fastest wins — look for employees who are 80% of the way there already.",
        ],
        "tech_skills_demand": [
            "Technical skills in high demand across your org: {skills_list}. These all have high market scarcity and salary premiums — building internally is usually 40-60% cheaper than hiring.",
        ],
    },
    "summary": [
        "Skill landscape: {gap_count} priority gaps identified. Top need: {top_skill}. Estimated reskilling: {avg_weeks} weeks average per person. {key_recommendation}",
    ],
}


# ═════════════════════════════════════════════════════════════════
#  ASSESS CHANGE READINESS
# ═════════════════════════════════════════════════════════════════

ASSESS_CHANGE_READINESS = {
    "intro": [
        "Now the make-or-break question: is your workforce ready for change? Let me segment everyone by willingness and ability...",
        "The best transformation plan fails without change readiness. Let me assess where your people stand...",
        "Time to look at the human factor. I'll score every employee on willingness to change and ability to adapt...",
    ],
    "progress": [
        "Scoring {total_employees:,} employees on willingness and ability to change...",
        "Segmenting the workforce into Champions, Training Needs, Change Management Needs, and High Risk...",
    ],
    "findings": {
        "champion_pct": [
            "{pct:.0f}% of your workforce are **Champions** — willing and able to adopt change. These are your transformation ambassadors. Recruit them for pilot programs and peer advocacy.",
            "Good news: {pct:.0f}% are Champions (high willingness + high ability). In my experience, you need at least 25% Champions for successful transformation. {sufficiency_note}",
        ],
        "high_risk_pct": [
            "{pct:.0f}% are **High Risk** — both unwilling and unable. These individuals need intensive support: either reskilling with change management, or compassionate role transition planning.",
            "{pct:.0f}% of employees fall into the High Risk quadrant. Don't ignore them — unaddressed, they become active resistors who slow everything down. Plan for targeted interventions.",
        ],
        "training_need_pct": [
            "{pct:.0f}% are eager but lack skills (**Training Need**). These are actually your best investment targets — they're already motivated, they just need upskilling.",
        ],
        "change_mgmt_need_pct": [
            "{pct:.0f}% are capable but resistant (**Change Management Need**). They have the skills but not the motivation. Focus on showing them 'what's in it for me' — career growth, less tedious work, new capabilities.",
        ],
        "bottleneck_function": [
            "**{function}** has {pct:.0f}% High Risk employees — this is a transformation bottleneck. Don't try to force change here first. Start elsewhere, show results, then come back with proof points.",
            "Watch out for **{function}**: {pct:.0f}% High Risk. This function will need 2-3x the change management investment compared to your Champions. Budget accordingly.",
        ],
        "pilot_function": [
            "**{function}** has {pct:.0f}% Champions — best candidate for pilot programs. Start here, get quick wins, and let their success build the case for broader transformation.",
            "**{function}** stands out with {pct:.0f}% Champions. This is where you light the spark. A successful pilot here becomes your most persuasive argument for the rest of the org.",
        ],
    },
    "summary": [
        "Change readiness: {champion_pct:.0f}% Champions, {training_pct:.0f}% Training Need, {change_pct:.0f}% Change Mgmt Need, {risk_pct:.0f}% High Risk. {key_takeaway}",
    ],
}


# ═════════════════════════════════════════════════════════════════
#  BUILD SCENARIOS
# ═════════════════════════════════════════════════════════════════

BUILD_SCENARIOS = {
    "intro": [
        "Let me model three scenarios — conservative, moderate, and aggressive — so you can see the range of outcomes...",
        "Time to put numbers to this. I'll build three scenarios with different adoption assumptions and show the trade-offs...",
        "Now for the financial modelling. Three scenarios, each with a different level of ambition and risk...",
    ],
    "progress": [
        "Modeling {scenario_count} scenarios across {role_count} roles...",
        "Running scenario projections... calculating FTE impact, investment, ROI, and payback period...",
    ],
    "findings": {
        "scenario_summary": [
            "**{name}** ({adoption_pct:.0f}% adoption, {timeline_months} months):\n  Net FTE impact: {net_fte:+,.0f}\n  Year 1 savings: ${year1_savings:,.0f}\n  Investment required: ${investment:,.0f}\n  Net Year 1 benefit: ${net_benefit:+,.0f}\n  Payback: {payback:.0f} months",
        ],
        "scenario_comparison": [
            "The Moderate scenario offers the best risk-adjusted return: ${net_benefit:,.0f} net benefit at {risk} risk. The Aggressive scenario delivers {aggressive_multiple:.1f}x the savings but requires {aggressive_invest_multiple:.1f}x the investment.",
            "Comparing the three: Conservative is safest but leaves value on the table. Moderate captures most of the opportunity. Aggressive goes furthest but carries execution risk.",
        ],
        "scenario_recommendation": [
            "Based on your readiness profile ({champion_pct:.0f}% Champions), I'd recommend the **{recommended}** scenario. {rationale}",
            "My recommendation: start with **{recommended}**. {rationale}",
        ],
        "redeployment_note": [
            "Of the {impacted:.0f} impacted FTEs, approximately {redeployable:.0f} ({redeployable_pct:.0f}%) have adjacent skills for redeployment. The remaining {net_reduction:.0f} would need more significant role transitions or managed exits.",
        ],
    },
    "summary": [
        "Three scenarios modeled. Recommended: {recommended} ({adoption_pct:.0f}% adoption, ${net_benefit:+,.0f} Year 1). Total addressable: ${total:,.0f}.",
    ],
}


# ═════════════════════════════════════════════════════════════════
#  GENERATE ROADMAP
# ═════════════════════════════════════════════════════════════════

GENERATE_ROADMAP = {
    "intro": [
        "Let me build a phased implementation roadmap — from pilot to full scale...",
        "Time to sequence the work. I'll create a phased plan that matches your readiness and resource constraints...",
        "A great analysis with no plan is just expensive trivia. Let me turn all of this into an actionable roadmap...",
    ],
    "progress": [
        "Building a {phase_count}-phase roadmap across {timeline_months} months...",
        "Sequencing {workstream_count} workstreams across {phase_count} phases with dependencies and milestones...",
    ],
    "findings": {
        "phase_overview": [
            "**Phase {phase_num}: {phase_name}** (Months {start}-{end}): {workstream_count} workstreams. Key milestones: {milestones}.",
        ],
        "pilot_assignment": [
            "Pilot functions assigned based on readiness: {pilot_functions}. These have the highest Champion percentages and will give you the fastest wins.",
        ],
        "critical_path": [
            "Critical path: {path_description}. Don't start Phase {next_phase} until {gate_condition} is validated.",
            "Phase gate: before moving from {phase_a} to {phase_b}, validate that {gate_condition}. Premature scaling is the #1 cause of transformation failure.",
        ],
    },
    "summary": [
        "Roadmap: {phase_count} phases over {timeline_months} months. {workstream_count} workstreams. First milestone: {first_milestone} by month {first_milestone_month}.",
    ],
}


# ═════════════════════════════════════════════════════════════════
#  SYNTHESIZE FINDINGS
# ═════════════════════════════════════════════════════════════════

SYNTHESIZE_FINDINGS = {
    "intro": [
        "Let me pull everything together and identify the three moves that will drive the most value...",
        "Synthesizing all findings... looking for the patterns that matter most...",
        "Time for the big picture. Let me distill everything into what actually matters for your leadership team...",
    ],
    "progress": [
        "Cross-referencing {finding_count} findings across {theme_count} themes...",
        "Ranking findings by impact and urgency... identifying the Big 3...",
    ],
    "findings": {
        "big_move": [
            "**Big Move #{rank}: {title}** — {detail}. This represents approximately {value_share}% of total transformation value.",
            "**Priority #{rank}: {title}** — {detail}. Impact: {impact}. Urgency: {urgency}.",
        ],
        "theme_summary": [
            "**{theme}**: {count} findings. {top_finding}",
        ],
    },
    "summary": [
        "After analyzing {company_name}'s workforce of {total_employees:,}, here's the bottom line: {executive_summary}. The three highest-impact moves are: 1) {big_move_1}, 2) {big_move_2}, 3) {big_move_3}.",
        "Bottom line for {company_name} ({total_employees:,} employees): {executive_summary}. Top 3 priorities: 1) {big_move_1}, 2) {big_move_2}, 3) {big_move_3}.",
    ],
}


# ═════════════════════════════════════════════════════════════════
#  TRANSITIONS & GUIDED-MODE QUESTIONS
# ═════════════════════════════════════════════════════════════════

TRANSITIONS = [
    "Good. Now let me look at {next_action_description}...",
    "That gives us a solid foundation. Moving on to {next_action_description}...",
    "Interesting patterns emerging. Let me now examine {next_action_description}...",
    "Noted. Next step: {next_action_description}...",
    "Building on that, let's look at {next_action_description}...",
]

GUIDED_QUESTIONS = {
    "profile_workforce": [
        "I've mapped out your workforce composition. Should I analyze the org structure next, or would you like to focus on a specific function first?",
        "Workforce profile complete. Want me to look at the organizational hierarchy next? Type **go** to continue or **focus on [function name]** to dive deeper.",
    ],
    "analyze_org_structure": [
        "The structural analysis reveals some interesting patterns. Want me to assess AI readiness next, or dig deeper into the span of control issues I found?",
        "Org structure mapped. Ready for AI readiness assessment? Type **go** or ask me about anything I've found so far.",
    ],
    "assess_ai_readiness": [
        "Now I know which functions are ready and which aren't. Should I identify specific AI opportunities, or would you prefer to look at skills gaps first?",
        "Readiness scored across all functions. Want to see the specific AI opportunities? Type **go** to continue.",
    ],
    "identify_opportunities": [
        "I've found {opportunity_count} potential AI opportunities worth ${total_value:,.0f}. Want me to build scenario projections, or should we discuss specific opportunities first?",
        "Opportunities mapped — ${total_value:,.0f} in addressable value. Ready for scenario modeling? Type **go** or **tell me more about [role]** for details.",
    ],
    "analyze_skills": [
        "The skills analysis shows {gap_count} significant gaps. Should I assess change readiness to understand how feasible transformation is, or move to scenario modeling?",
        "Skills landscape mapped. Want me to check if the workforce is ready for change? Type **go** to continue.",
    ],
    "assess_change_readiness": [
        "{champion_pct:.0f}% of your workforce are potential Champions. Ready to see scenario projections?",
        "Change readiness assessed — {champion_pct:.0f}% Champions, {risk_pct:.0f}% High Risk. Let me model scenarios. Type **go** to continue.",
    ],
    "build_scenarios": [
        "Three scenarios modeled. Want me to build a roadmap based on the recommended scenario, or would you prefer a different one?",
        "Scenarios complete. Type **go** for the implementation roadmap, or **tell me more about [scenario]** for details.",
    ],
    "generate_roadmap": [
        "The roadmap is ready — {phase_count} phases over {timeline_months} months. Should I compile everything into an executive summary?",
        "Implementation plan built. Type **go** for the final synthesis and executive summary.",
    ],
}


# ═════════════════════════════════════════════════════════════════
#  USER ACKNOWLEDGEMENT TEMPLATES
# ═════════════════════════════════════════════════════════════════

USER_ACKNOWLEDGEMENTS = {
    "correction": [
        "Got it — I've noted that correction. I'll factor \"{detail}\" into my analysis going forward.",
        "Understood — correcting my understanding. \"{detail}\" is now factored in.",
        "Thanks for the correction. I've adjusted: \"{detail}\". This may affect some earlier findings.",
    ],
    "focus": [
        "Focusing on **{detail}**. I'll prioritize findings and recommendations related to this area.",
        "Understood — zeroing in on **{detail}**. All subsequent analysis will emphasize this focus.",
    ],
    "skip": [
        "Skipping that step. Moving on.",
        "No problem — skipping ahead.",
    ],
    "pause": [
        "Paused. Take your time — I'll be here when you're ready to continue.",
        "Standing by. Type **go** or **resume** when you want to continue.",
    ],
    "resume": [
        "Welcome back. Let's pick up where we left off.",
        "Ready to continue. Where we were: {context}",
    ],
    "restart": [
        "Starting fresh. All previous analysis has been cleared. Type **go** when you're ready.",
        "Clean slate. Let's go again — type **go** to begin the analysis.",
    ],
}


# ═════════════════════════════════════════════════════════════════
#  ACTION DESCRIPTIONS (for transitions)
# ═════════════════════════════════════════════════════════════════

ACTION_DESCRIPTIONS = {
    "profile_workforce": "workforce composition and demographics",
    "analyze_org_structure": "the organizational hierarchy and management structure",
    "assess_ai_readiness": "AI readiness across each function",
    "identify_opportunities": "specific AI automation and augmentation opportunities",
    "analyze_skills": "the skills landscape and capability gaps",
    "assess_change_readiness": "change readiness and workforce segmentation",
    "build_scenarios": "transformation scenarios and financial projections",
    "generate_roadmap": "the implementation roadmap and workstream plan",
    "synthesize_findings": "the executive synthesis and top priorities",
}


# ═════════════════════════════════════════════════════════════════
#  DELAYS (ms) by speed setting
# ═════════════════════════════════════════════════════════════════

DELAYS = {
    "slow":   {"intro": 2000, "progress": 1500, "finding": 1000, "transition": 1500, "summary": 1500},
    "normal": {"intro": 1000, "progress": 800,  "finding": 500,  "transition": 800,  "summary": 1000},
    "fast":   {"intro": 200,  "progress": 200,  "finding": 200,  "transition": 200,  "summary": 200},
}
