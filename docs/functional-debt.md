# HR Digital Playground — Functional Debt Log

Workarounds applied during the platform upgrade v1 because a clean fix exceeded scope.

---

## page.tsx line count above 1,200 target
Part: 0
Debt: page.tsx is 1,679 lines after extraction (target was 1,200). The Home component's state closure is tightly coupled to many inline sub-components.
Proper fix: Further extraction of tab rendering logic and state into a custom hook as modules are rebuilt in Parts 1-28.
Impact if not fixed: Low — file is functional, just large. Each module rebuild can opportunistically extract its section.
