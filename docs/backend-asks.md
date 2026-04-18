# HR Digital Playground — Backend Asks

Backend endpoints the frontend needs but that don't exist yet.

---

## BBBA backend may return duplicate rows
Part: Stage 2 Part 1
Issue: The BBBA endpoint iterates over `adjacencies` and creates one row per `target_role`. Multiple adjacency entries sharing the same `target_role` produce duplicate cards. Frontend now deduplicates via JSON signature matching, but ideally the backend should deduplicate or aggregate at the source.
Impact: Low — frontend workaround in place.

## Skill analysis endpoint returns empty until Work Design Lab has roles decomposed
Part: Stage 2 Part 4
Issue: `build_skill_analysis` in `backend/app/store.py` requires work_design data with skill columns to compute current/future skill demand. When no Work Design tasks exist, it returns empty DataFrames, causing the Skill Shift Index to show 0%. Frontend now shows a rich empty state with preview ghost when data is absent.
Impact: Low — empty state is informative and guides user to Work Design Lab.
