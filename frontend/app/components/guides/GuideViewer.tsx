"use client";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { GuideData, GuideChapter } from "./types";

interface GuideViewerProps {
  guide: GuideData;
  onBack: () => void;
  onNavigate?: (moduleId: string) => void;
}

export default function GuideViewer({ guide, onBack, onNavigate }: GuideViewerProps) {
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());
  const [activeChapter, setActiveChapter] = useState<string>(guide.chapters[0]?.id || "");
  const [activeSection, setActiveSection] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ chapterId: string; sectionId: string; title: string; snippet: string }[]>([]);
  const [tocCollapsed, setTocCollapsed] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  // Toggle chapter expansion in TOC
  const toggleChapter = useCallback((chapterId: string) => {
    setExpandedChapters(prev => {
      const next = new Set(prev);
      if (next.has(chapterId)) next.delete(chapterId);
      else next.add(chapterId);
      return next;
    });
  }, []);

  // Scroll to a specific section
  const scrollToSection = useCallback((chapterId: string, sectionId?: string) => {
    setActiveChapter(chapterId);
    if (sectionId) setActiveSection(sectionId);
    setExpandedChapters(prev => new Set([...prev, chapterId]));
    const targetId = sectionId || chapterId;
    requestAnimationFrame(() => {
      const el = sectionRefs.current[targetId];
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  // Search functionality
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const q = searchQuery.toLowerCase();
    const results: typeof searchResults = [];
    for (const ch of guide.chapters) {
      for (const sec of ch.sections) {
        const plainText = sec.content.replace(/<[^>]+>/g, " ").toLowerCase();
        const titleMatch = sec.title.toLowerCase().includes(q);
        const contentMatch = plainText.includes(q);
        if (titleMatch || contentMatch) {
          const idx = plainText.indexOf(q);
          const start = Math.max(0, idx - 60);
          const end = Math.min(plainText.length, idx + q.length + 60);
          const snippet = (start > 0 ? "..." : "") + plainText.slice(start, end).trim() + (end < plainText.length ? "..." : "");
          results.push({ chapterId: ch.id, sectionId: sec.id, title: sec.title, snippet });
        }
      }
    }
    setSearchResults(results.slice(0, 20));
  }, [searchQuery, guide.chapters]);

  // Track scroll position for active section highlighting
  useEffect(() => {
    const container = contentRef.current;
    if (!container) return;
    const handleScroll = () => {
      const scrollTop = container.scrollTop + 120;
      let currentChapter = activeChapter;
      let currentSection = "";
      for (const ch of guide.chapters) {
        const chEl = sectionRefs.current[ch.id];
        if (chEl && chEl.offsetTop <= scrollTop) currentChapter = ch.id;
        for (const sec of ch.sections) {
          const secEl = sectionRefs.current[sec.id];
          if (secEl && secEl.offsetTop <= scrollTop) { currentChapter = ch.id; currentSection = sec.id; }
        }
      }
      if (currentChapter !== activeChapter) setActiveChapter(currentChapter);
      if (currentSection !== activeSection) setActiveSection(currentSection);
    };
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [activeChapter, activeSection, guide.chapters]);

  // Handle "Try it now" clicks
  useEffect(() => {
    const container = contentRef.current;
    if (!container || !onNavigate) return;
    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("[data-navigate]");
      if (target) {
        e.preventDefault();
        const moduleId = target.getAttribute("data-navigate");
        if (moduleId) onNavigate(moduleId);
      }
    };
    container.addEventListener("click", handleClick);
    return () => container.removeEventListener("click", handleClick);
  }, [onNavigate]);

  // Keyboard: Escape to go back
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onBack(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onBack]);

  // Chapter progress (based on expanded/visited)
  const visitedChapters = useMemo(() => expandedChapters, [expandedChapters]);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", background: "#0B1120" }}>
      {/* ── TOC SIDEBAR ── */}
      <aside style={{
        width: tocCollapsed ? 48 : 320, minWidth: tocCollapsed ? 48 : 320,
        borderRight: "1px solid rgba(255,200,150,0.08)",
        background: "rgba(8,12,24,0.95)", backdropFilter: "blur(20px)",
        display: "flex", flexDirection: "column", transition: "width 0.3s ease, min-width 0.3s ease",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{ padding: tocCollapsed ? "16px 8px" : "20px 20px 12px", borderBottom: "1px solid rgba(255,200,150,0.06)", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          {!tocCollapsed && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <button onClick={onBack} style={{ fontSize: 13, color: "rgba(255,200,150,0.4)", background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: 8, display: "block" }}>← Back</button>
              <div style={{ fontSize: 15, fontWeight: 700, color: "rgba(255,245,235,0.9)", fontFamily: "'Outfit', sans-serif", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{guide.icon} {guide.title}</div>
              <div style={{ fontSize: 12, color: "rgba(255,200,150,0.3)", marginTop: 2 }}>{guide.chapters.length} chapters</div>
            </div>
          )}
          <button onClick={() => setTocCollapsed(!tocCollapsed)} style={{ width: 28, height: 28, borderRadius: 6, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,200,150,0.08)", cursor: "pointer", color: "rgba(255,200,150,0.4)", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {tocCollapsed ? "→" : "←"}
          </button>
        </div>

        {!tocCollapsed && (
          <>
            {/* Search */}
            <div style={{ padding: "12px 20px", flexShrink: 0 }}>
              <div style={{ position: "relative" }}>
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search guide..."
                  style={{
                    width: "100%", padding: "8px 12px 8px 32px", borderRadius: 8,
                    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,200,150,0.1)",
                    color: "rgba(255,245,235,0.85)", fontSize: 13, outline: "none",
                    fontFamily: "'IBM Plex Mono', monospace",
                  }}
                />
                <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 13, opacity: 0.3 }}>🔍</span>
              </div>
            </div>

            {/* Search results */}
            {searchQuery && searchResults.length > 0 && (
              <div style={{ padding: "0 12px 12px", flexShrink: 0, maxHeight: 300, overflowY: "auto" }}>
                {searchResults.map((r, i) => (
                  <button key={i} onClick={() => { scrollToSection(r.chapterId, r.sectionId); setSearchQuery(""); }} style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 10px", borderRadius: 8, background: "rgba(212,134,10,0.06)", border: "none", cursor: "pointer", marginBottom: 4 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,245,235,0.8)" }}>{r.title}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,200,150,0.35)", marginTop: 2, lineHeight: 1.4 }}>{r.snippet}</div>
                  </button>
                ))}
              </div>
            )}
            {searchQuery && searchResults.length === 0 && (
              <div style={{ padding: "8px 20px", fontSize: 13, color: "rgba(255,200,150,0.3)" }}>No results found</div>
            )}

            {/* Chapter list */}
            <nav style={{ flex: 1, overflowY: "auto", padding: "4px 12px 20px" }}>
              {guide.chapters.map(ch => (
                <div key={ch.id} style={{ marginBottom: 2 }}>
                  <button
                    onClick={() => { toggleChapter(ch.id); scrollToSection(ch.id); }}
                    style={{
                      width: "100%", textAlign: "left", padding: "10px 10px",
                      borderRadius: 8, border: "none", cursor: "pointer",
                      background: activeChapter === ch.id ? "rgba(212,134,10,0.1)" : "transparent",
                      transition: "background 0.15s",
                      display: "flex", alignItems: "flex-start", gap: 10,
                    }}
                  >
                    <span style={{ fontSize: 11, fontWeight: 700, color: activeChapter === ch.id ? "#D4860A" : "rgba(255,200,150,0.3)", fontFamily: "'IBM Plex Mono', monospace", minWidth: 20, paddingTop: 1 }}>{ch.number}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: activeChapter === ch.id ? "rgba(255,245,235,0.9)" : "rgba(255,245,235,0.6)", lineHeight: 1.3 }}>{ch.icon} {ch.title}</div>
                      {expandedChapters.has(ch.id) && ch.sections.length > 0 && (
                        <div style={{ marginTop: 6, paddingLeft: 2 }}>
                          {ch.sections.map(sec => (
                            <button key={sec.id} onClick={e => { e.stopPropagation(); scrollToSection(ch.id, sec.id); }} style={{ display: "block", width: "100%", textAlign: "left", padding: "4px 0", border: "none", background: "none", cursor: "pointer", fontSize: 12, color: activeSection === sec.id ? "#D4860A" : "rgba(255,200,150,0.35)", lineHeight: 1.4, transition: "color 0.15s" }}>
                              {sec.title}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <span style={{ fontSize: 10, color: "rgba(255,200,150,0.2)", paddingTop: 3, transform: expandedChapters.has(ch.id) ? "rotate(90deg)" : "none", transition: "transform 0.15s" }}>▶</span>
                  </button>
                </div>
              ))}
            </nav>

            {/* Progress */}
            <div style={{ padding: "12px 20px", borderTop: "1px solid rgba(255,200,150,0.06)", flexShrink: 0 }}>
              <div style={{ fontSize: 11, color: "rgba(255,200,150,0.3)", marginBottom: 4 }}>Progress</div>
              <div style={{ height: 3, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 2, background: "#D4860A", width: `${Math.round((visitedChapters.size / guide.chapters.length) * 100)}%`, transition: "width 0.3s" }} />
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,200,150,0.25)", marginTop: 4 }}>{visitedChapters.size} / {guide.chapters.length} chapters explored</div>
            </div>
          </>
        )}
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main ref={contentRef} style={{ flex: 1, overflowY: "auto", background: "#0B1120" }}>
        {/* Hero header */}
        <div style={{
          padding: "48px 64px 40px", borderBottom: "1px solid rgba(255,200,150,0.06)",
          background: "linear-gradient(180deg, rgba(212,134,10,0.06) 0%, transparent 100%)",
        }}>
          <div style={{ maxWidth: 860 }}>
            <div style={{ fontSize: 42, marginBottom: 8 }}>{guide.icon}</div>
            <h1 style={{ fontSize: 32, fontWeight: 800, color: "#fff", fontFamily: "'Outfit', sans-serif", marginBottom: 8 }}>{guide.title}</h1>
            <p style={{ fontSize: 16, color: "rgba(255,220,180,0.5)", lineHeight: 1.6, maxWidth: 600 }}>{guide.subtitle}</p>
            <div style={{ display: "flex", gap: 16, marginTop: 20 }}>
              <span style={{ fontSize: 13, color: "rgba(255,200,150,0.3)", display: "flex", alignItems: "center", gap: 6 }}>📖 {guide.chapters.length} Chapters</span>
              <span style={{ fontSize: 13, color: "rgba(255,200,150,0.3)", display: "flex", alignItems: "center", gap: 6 }}>📋 {guide.chapters.reduce((n, c) => n + c.sections.length, 0)} Sections</span>
            </div>
          </div>
        </div>

        {/* Chapters */}
        <div style={{ padding: "32px 64px 80px", maxWidth: 960 }}>
          {guide.chapters.map(ch => (
            <ChapterBlock
              key={ch.id}
              chapter={ch}
              isExpanded={expandedChapters.has(ch.id)}
              onToggle={() => toggleChapter(ch.id)}
              sectionRefs={sectionRefs}
            />
          ))}
        </div>
      </main>

      {/* Guide content styles */}
      <style>{guideStyles}</style>
    </div>
  );
}

function ChapterBlock({ chapter, isExpanded, onToggle, sectionRefs }: {
  chapter: GuideChapter;
  isExpanded: boolean;
  onToggle: () => void;
  sectionRefs: React.MutableRefObject<Record<string, HTMLElement | null>>;
}) {
  return (
    <div
      ref={el => { sectionRefs.current[chapter.id] = el; }}
      style={{ marginBottom: 32 }}
    >
      {/* Chapter header */}
      <button onClick={onToggle} style={{
        width: "100%", textAlign: "left", padding: "24px 28px",
        borderRadius: 16, cursor: "pointer", border: "1px solid rgba(255,200,150,0.08)",
        background: isExpanded ? "rgba(212,134,10,0.06)" : "rgba(255,255,255,0.02)",
        transition: "all 0.2s", display: "flex", alignItems: "center", gap: 20,
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: isExpanded ? "rgba(212,134,10,0.15)" : "rgba(255,255,255,0.04)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 22, flexShrink: 0, transition: "background 0.2s",
        }}>{chapter.icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(212,134,10,0.5)", fontFamily: "'IBM Plex Mono', monospace", letterSpacing: 1, marginBottom: 4 }}>CHAPTER {chapter.number}</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "rgba(255,245,235,0.9)", fontFamily: "'Outfit', sans-serif" }}>{chapter.title}</div>
          <div style={{ fontSize: 14, color: "rgba(255,220,180,0.4)", marginTop: 4, lineHeight: 1.5 }}>{chapter.summary}</div>
        </div>
        <span style={{
          fontSize: 16, color: "rgba(255,200,150,0.3)", flexShrink: 0,
          transform: isExpanded ? "rotate(90deg)" : "none", transition: "transform 0.2s",
        }}>▶</span>
      </button>

      {/* Chapter content */}
      {isExpanded && (
        <div style={{ padding: "24px 0 0 0" }}>
          {chapter.sections.map(sec => (
            <div
              key={sec.id}
              ref={el => { sectionRefs.current[sec.id] = el; }}
              className="guide-section"
              style={{ marginBottom: 32, paddingLeft: 28 }}
            >
              <h3 style={{
                fontSize: 18, fontWeight: 700, color: "rgba(255,245,235,0.85)",
                fontFamily: "'Outfit', sans-serif", marginBottom: 16,
                paddingBottom: 8, borderBottom: "1px solid rgba(255,200,150,0.06)",
              }}>{sec.title}</h3>
              <div
                className="guide-content"
                dangerouslySetInnerHTML={{ __html: sec.content }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const guideStyles = `
  .guide-content {
    font-size: 14px;
    line-height: 1.8;
    color: rgba(255,220,180,0.55);
  }
  .guide-content h4 {
    font-size: 15px;
    font-weight: 700;
    color: rgba(255,245,235,0.8);
    font-family: 'Outfit', sans-serif;
    margin: 24px 0 10px 0;
  }
  .guide-content p {
    margin: 0 0 14px 0;
  }
  .guide-content ul, .guide-content ol {
    margin: 0 0 14px 0;
    padding-left: 20px;
  }
  .guide-content li {
    margin-bottom: 6px;
  }
  .guide-content strong {
    color: rgba(255,245,235,0.75);
    font-weight: 600;
  }
  .guide-content em {
    color: rgba(212,134,10,0.7);
    font-style: normal;
  }
  .guide-content table {
    width: 100%;
    border-collapse: collapse;
    margin: 16px 0;
    font-size: 13px;
  }
  .guide-content table th {
    text-align: left;
    padding: 10px 12px;
    background: rgba(212,134,10,0.08);
    border: 1px solid rgba(255,200,150,0.08);
    color: rgba(255,245,235,0.7);
    font-weight: 700;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .guide-content table td {
    padding: 10px 12px;
    border: 1px solid rgba(255,200,150,0.06);
    color: rgba(255,220,180,0.5);
    vertical-align: top;
  }
  .guide-content table tr:nth-child(even) td {
    background: rgba(255,255,255,0.01);
  }
  .guide-content .callout {
    padding: 16px 20px;
    border-radius: 12px;
    margin: 16px 0;
    border-left: 3px solid;
  }
  .guide-content .callout-tip {
    background: rgba(16,185,129,0.06);
    border-color: rgba(16,185,129,0.4);
  }
  .guide-content .callout-tip .callout-title {
    color: #6EE7B7;
    font-weight: 700;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 6px;
  }
  .guide-content .callout-warning {
    background: rgba(245,158,11,0.06);
    border-color: rgba(245,158,11,0.4);
  }
  .guide-content .callout-warning .callout-title {
    color: #FBBF24;
    font-weight: 700;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 6px;
  }
  .guide-content .callout-info {
    background: rgba(59,130,246,0.06);
    border-color: rgba(59,130,246,0.4);
  }
  .guide-content .callout-info .callout-title {
    color: #93C5FD;
    font-weight: 700;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 6px;
  }
  .guide-content .callout-example {
    background: rgba(139,92,246,0.06);
    border-color: rgba(139,92,246,0.4);
  }
  .guide-content .callout-example .callout-title {
    color: #C4B5FD;
    font-weight: 700;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 6px;
  }
  .guide-content .checklist {
    padding: 16px 20px;
    border-radius: 12px;
    background: rgba(255,255,255,0.02);
    border: 1px solid rgba(255,200,150,0.06);
    margin: 16px 0;
  }
  .guide-content .checklist-title {
    font-size: 13px;
    font-weight: 700;
    color: rgba(255,245,235,0.7);
    margin-bottom: 10px;
    font-family: 'Outfit', sans-serif;
  }
  .guide-content .checklist ul {
    list-style: none;
    padding-left: 0;
  }
  .guide-content .checklist li {
    padding-left: 24px;
    position: relative;
    margin-bottom: 6px;
  }
  .guide-content .checklist li::before {
    content: "☐";
    position: absolute;
    left: 0;
    color: rgba(212,134,10,0.5);
  }
  .guide-content .framework {
    padding: 20px 24px;
    border-radius: 14px;
    background: rgba(212,134,10,0.04);
    border: 1px solid rgba(212,134,10,0.12);
    margin: 16px 0;
  }
  .guide-content .framework-title {
    font-size: 14px;
    font-weight: 700;
    color: #D4860A;
    margin-bottom: 10px;
    font-family: 'Outfit', sans-serif;
  }
  .guide-content .try-it {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    border-radius: 8px;
    background: rgba(212,134,10,0.1);
    border: 1px solid rgba(212,134,10,0.25);
    color: #E8C547;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    margin: 8px 0;
    text-decoration: none;
  }
  .guide-content .try-it:hover {
    background: rgba(212,134,10,0.18);
    border-color: rgba(212,134,10,0.4);
  }
  .guide-content .step-list {
    counter-reset: steps;
    list-style: none;
    padding-left: 0;
  }
  .guide-content .step-list li {
    counter-increment: steps;
    padding-left: 36px;
    position: relative;
    margin-bottom: 12px;
  }
  .guide-content .step-list li::before {
    content: counter(steps);
    position: absolute;
    left: 0;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: rgba(212,134,10,0.15);
    color: #D4860A;
    font-size: 12px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'IBM Plex Mono', monospace;
  }
  .guide-content .metric-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 12px;
    margin: 16px 0;
  }
  .guide-content .metric-card {
    padding: 14px 16px;
    border-radius: 10px;
    background: rgba(255,255,255,0.02);
    border: 1px solid rgba(255,200,150,0.06);
  }
  .guide-content .metric-card .metric-label {
    font-size: 11px;
    font-weight: 700;
    color: rgba(255,200,150,0.35);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 4px;
  }
  .guide-content .metric-card .metric-value {
    font-size: 15px;
    font-weight: 700;
    color: rgba(255,245,235,0.7);
    font-family: 'Outfit', sans-serif;
  }
`;
