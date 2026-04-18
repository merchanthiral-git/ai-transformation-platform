# HR Digital Playground — Functional Debt Log

Workarounds applied during the platform upgrade v1 because a clean fix exceeded scope.

---

## page.tsx line count above 1,200 target
Part: 0
Debt: page.tsx is 1,679 lines after extraction (target was 1,200). The Home component's state closure is tightly coupled to many inline sub-components.
Proper fix: Further extraction of tab rendering logic and state into a custom hook as modules are rebuilt in Parts 1-28.
Impact if not fixed: Low — file is functional, just large. Each module rebuild can opportunistically extract its section.

## HeadcountPlanning "Load Chesapeake demo" button is a stub
Part: Stage 2 Part 2
Debt: The secondary action "Load Chesapeake demo" on the empty state is a no-op. Needs to be wired to `lib/demoData/chesapeake.ts` loadDemoWorkspace function.
Proper fix: Wire onClick to call loadDemoWorkspace("chesapeake") and refresh the module state.
Impact if not fixed: Low — the primary action (go to Work Design Lab) works. Demo load is a convenience feature.

## AI Recommendations "Draft campaign" cross-module action
Part: Stage 2 Part 3
Debt: The "Draft campaign from this bet" button navigates to the Change Campaign Planner but doesn't pre-populate campaign fields from the bet data.
Proper fix: Pass bet data (title, audience, timeline) as query params or via shared state to pre-fill the New Campaign wizard.
Impact if not fixed: Low — navigation works, consultant manually fills in campaign details.

## AI Recommendations "Export as PDF" not implemented
Part: Stage 2 Part 3
Debt: Full PDF export of the recommendations is out of scope. "Copy as Markdown" is implemented as the interim.
Proper fix: Add a PDF generation library (e.g. @react-pdf/renderer) and compose the structured output into a branded PDF.
Impact if not fixed: Medium — consultant can copy Markdown and format externally.
