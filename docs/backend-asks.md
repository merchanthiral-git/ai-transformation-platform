# HR Digital Playground — Backend Asks

Backend endpoints the frontend needs but that don't exist yet.

---

## BBBA backend may return duplicate rows
Part: Stage 2 Part 1
Issue: The BBBA endpoint iterates over `adjacencies` and creates one row per `target_role`. Multiple adjacency entries sharing the same `target_role` produce duplicate cards. Frontend now deduplicates via JSON signature matching, but ideally the backend should deduplicate or aggregate at the source.
Impact: Low — frontend workaround in place.
