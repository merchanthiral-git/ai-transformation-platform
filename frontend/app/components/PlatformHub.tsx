"use client";
import React, { useState, useEffect } from "react";
import * as authApi from "../../lib/auth-api";
import { KNOWLEDGE_BASE, KnowledgeModal } from "./KnowledgeBase";

/* ═══════════════════════════════════════════════════════════════
   PLATFORM HUB — premium command center with warm amber design
   ═══════════════════════════════════════════════════════════════ */

const IS: React.CSSProperties = { width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid rgba(212,134,10,0.15)", background: "rgba(255,250,240,0.04)", color: "var(--text-primary)", fontSize: 13, fontFamily: "'Outfit', sans-serif", outline: "none", boxSizing: "border-box", transition: "border-color 0.2s" };
const LBL: React.CSSProperties = { display: "block", fontSize: 10, color: "var(--text-muted)", marginBottom: 5, fontFamily: "'IBM Plex Mono', monospace", textTransform: "uppercase", letterSpacing: "1.5px" };

export function PlatformHub({ user, onBack, onUpdateUser }: { user: authApi.AuthUser; onBack: () => void; onUpdateUser: (u: authApi.AuthUser) => void }) {
  const [tab, setTab] = useState("account");

  const isAdmin = user.username === "hiral";
  const tabs = [
    { id: "account", icon: "👤", label: "Account" },
    { id: "about", icon: "✦", label: "About" },
    { id: "kb", icon: "📚", label: "Knowledge Base" },
    { id: "usecases", icon: "🏢", label: "Use Cases" },
    { id: "tutorials", icon: "🎬", label: "Tutorials" },
    { id: "releases", icon: "📋", label: "Release Notes" },
    { id: "feedback", icon: "💬", label: "Feedback" },
    ...(isAdmin ? [{ id: "admin", icon: "🛡️", label: "Admin" }] : []),
  ];

  return <div className="flex min-h-screen w-full" style={{ background: "radial-gradient(ellipse at 30% 20%, rgba(30,18,8,0.6) 0%, transparent 50%), linear-gradient(135deg, #0B1120 0%, #12182a 50%, #0f1525 100%)" }}>
    {/* Sidebar — premium warm amber design */}
    <aside className="w-[220px] min-h-screen flex flex-col px-3 py-5 shrink-0" style={{ height: "100vh", position: "sticky", top: 0, background: "rgba(12,10,8,0.95)", borderRight: "1px solid rgba(212,134,10,0.06)" }}>
      <button onClick={onBack} className="text-[11px] text-[var(--text-muted)] hover:text-[var(--accent-primary)] mb-5 flex items-center gap-1.5 transition-colors font-semibold group">
        <span className="group-hover:-translate-x-0.5 transition-transform">←</span> Back to Platform
      </button>
      <div className="flex items-center gap-2.5 mb-6 px-2">
        <div style={{ width: 32, height: 32, borderRadius: 10, background: "linear-gradient(135deg, #e09040, #c07030)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "#fff", fontFamily: "'Outfit', sans-serif" }}>AI</div>
        <div>
          <div className="text-[12px] font-bold" style={{ color: "rgba(255,245,235,0.9)" }}>Platform Hub</div>
          <div className="text-[9px]" style={{ color: "rgba(212,134,10,0.4)" }}>v4.0</div>
        </div>
      </div>
      <div className="space-y-0.5 relative">
        {tabs.map(t => {
          const active = tab === t.id;
          return <button key={t.id} onClick={() => setTab(t.id)} className="w-full text-left px-3 py-2.5 rounded-xl text-[12px] transition-all flex items-center gap-2.5 relative" style={{ background: active ? "rgba(212,134,10,0.1)" : "transparent", color: active ? "#e09040" : "rgba(255,230,200,0.35)", fontWeight: active ? 600 : 400, borderLeft: active ? "3px solid #D4860A" : "3px solid transparent" }} onMouseEnter={e => { if (!active) e.currentTarget.style.color = "rgba(255,230,200,0.6)"; }} onMouseLeave={e => { if (!active) e.currentTarget.style.color = "rgba(255,230,200,0.35)"; }}>
            <span className="text-[15px]">{t.icon}</span>{t.label}
          </button>;
        })}
      </div>
      <div className="mt-auto pt-4">
        <div className="text-center text-[9px] opacity-30" style={{ color: "rgba(212,134,10,0.6)" }}>AI Transformation Platform</div>
      </div>
    </aside>

    {/* Main content — full width, magazine layout */}
    <main className="flex-1 overflow-y-auto">
      <div key={tab} style={{ animation: "hubFade 0.25s ease-out" }}>
        {tab === "account" && <div className="px-10 py-8 max-w-[880px]"><AccountTab user={user} onUpdate={onUpdateUser} /></div>}
        {tab === "about" && <AboutTab />}
        {tab === "kb" && <div className="px-10 py-8 max-w-[880px]"><KnowledgeBaseTab /></div>}
        {tab === "usecases" && <div className="px-10 py-8 max-w-[880px]"><UseCasesTab /></div>}
        {tab === "tutorials" && <div className="px-10 py-8 max-w-[880px]"><TutorialsTab /></div>}
        {tab === "releases" && <div className="px-10 py-8 max-w-[880px]"><ReleasesTab /></div>}
        {tab === "feedback" && <div className="px-10 py-8 max-w-[880px]"><FeedbackTab user={user} /></div>}
        {tab === "admin" && isAdmin && <div className="px-10 py-8 max-w-[880px]"><AdminTab /></div>}
      </div>
      {/* Footer */}
      <div className="px-10 py-6 text-center border-t" style={{ borderColor: "rgba(212,134,10,0.06)" }}>
        <div className="text-[10px]" style={{ color: "rgba(255,230,200,0.15)" }}>Built with purpose in New York {"\u00B7"} {"\u00A9"} 2026 Hiral Merchant</div>
      </div>
      <style>{`@keyframes hubFade { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </main>
  </div>;
}

/* ═══ ACCOUNT TAB ═══ */
function AccountTab({ user, onUpdate }: { user: authApi.AuthUser; onUpdate: (u: authApi.AuthUser) => void }) {
  const [dn, setDn] = useState(user.display_name || user.username);
  const [email, setEmail] = useState(user.email || "");
  const [curPw, setCurPw] = useState(""); const [newPw, setNewPw] = useState(""); const [confPw, setConfPw] = useState("");
  const [saving, setSaving] = useState(false); const [msg, setMsg] = useState(""); const [err, setErr] = useState("");
  const pwScore = [newPw.length >= 8, /[A-Z]/.test(newPw), /[a-z]/.test(newPw), /[0-9]/.test(newPw), /[!@#$%^&*]/.test(newPw)].filter(Boolean).length;

  const save = async () => {
    setSaving(true); setErr(""); setMsg("");
    try {
      const updates: Record<string, string> = {};
      if (dn !== (user.display_name || user.username)) updates.display_name = dn;
      if (email !== (user.email || "")) updates.email = email;
      if (newPw) { updates.current_password = curPw; updates.new_password = newPw; updates.new_password_confirm = confPw; }
      if (Object.keys(updates).length === 0) { setMsg("No changes"); setSaving(false); return; }
      const result = await authApi.updateProfile(updates);
      setMsg("Saved!"); onUpdate({ ...user, ...result }); setCurPw(""); setNewPw(""); setConfPw("");
    } catch (e: unknown) { setErr(e instanceof Error ? e.message : "Failed"); }
    setSaving(false);
  };

  return <div>
    <h1 className="text-[24px] font-bold font-heading text-[var(--text-primary)] mb-8" style={{ letterSpacing: "-0.5px" }}>Account Settings</h1>

    {/* Profile hero card */}
    <div className="rounded-2xl p-6 mb-6" style={{ background: "linear-gradient(135deg, rgba(212,134,10,0.08), rgba(192,112,48,0.04))", border: "1px solid rgba(212,134,10,0.12)" }}>
      <div className="flex items-center gap-5 mb-5">
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-[28px] font-bold text-white shrink-0" style={{ background: "linear-gradient(135deg, #e09040, #c07030)", fontFamily: "'Outfit',sans-serif", boxShadow: "0 8px 24px rgba(212,134,10,0.25)" }}>{(dn || "U")[0].toUpperCase()}</div>
        <div>
          <div className="text-[18px] font-bold text-[var(--text-primary)] font-heading">{user.username}</div>
          <div className="flex gap-4 mt-1.5 text-[10px] font-data" style={{ color: "rgba(212,134,10,0.5)" }}>
            <span>Member since {new Date().toLocaleDateString()}</span>
            {user.last_login && <span>Last active: {new Date(user.last_login).toLocaleDateString()}</span>}
          </div>
        </div>
      </div>
      {err && <div className="rounded-xl px-4 py-2.5 mb-4 text-[11px] font-data" style={{ background: "rgba(220,50,50,0.06)", border: "1px solid rgba(220,50,50,0.15)", color: "#f08080" }}>{err}</div>}
      {msg && <div className="rounded-xl px-4 py-2.5 mb-4 text-[11px] font-data" style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)", color: "#6ee7b7" }}>{msg}</div>}
      <div className="grid grid-cols-2 gap-5">
        <div><label style={LBL}>Display Name</label><input value={dn} onChange={e => setDn(e.target.value)} style={IS} onFocus={e => e.currentTarget.style.borderColor = "rgba(212,134,10,0.4)"} onBlur={e => e.currentTarget.style.borderColor = "rgba(212,134,10,0.15)"} /></div>
        <div><label style={LBL}>Email</label><input value={email} onChange={e => setEmail(e.target.value)} type="email" style={IS} onFocus={e => e.currentTarget.style.borderColor = "rgba(212,134,10,0.4)"} onBlur={e => e.currentTarget.style.borderColor = "rgba(212,134,10,0.15)"} /></div>
      </div>
    </div>

    {/* Change password */}
    <div className="rounded-2xl p-6 mb-6" style={{ background: "rgba(255,250,240,0.02)", border: "1px solid rgba(212,134,10,0.08)" }}>
      <h3 className="text-[15px] font-bold font-heading text-[var(--text-primary)] mb-5" style={{ letterSpacing: "0.3px" }}>Change Password</h3>
      <div className="space-y-4 max-w-md">
        <div><label style={LBL}>Current Password</label><input type="password" value={curPw} onChange={e => setCurPw(e.target.value)} style={IS} onFocus={e => e.currentTarget.style.borderColor = "rgba(212,134,10,0.4)"} onBlur={e => e.currentTarget.style.borderColor = "rgba(212,134,10,0.15)"} /></div>
        <div><label style={LBL}>New Password</label><input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} style={IS} onFocus={e => e.currentTarget.style.borderColor = "rgba(212,134,10,0.4)"} onBlur={e => e.currentTarget.style.borderColor = "rgba(212,134,10,0.15)"} />
          {newPw && <div className="flex gap-1 mt-2">{[1,2,3,4,5].map(i => <div key={i} className="h-1.5 flex-1 rounded-full transition-all" style={{ background: i <= pwScore ? (pwScore <= 2 ? "#f08080" : pwScore <= 4 ? "#f0a050" : "#6ee7b7") : "rgba(255,255,255,0.05)" }} />)}</div>}
        </div>
        <div><label style={LBL}>Confirm New Password</label><input type="password" value={confPw} onChange={e => setConfPw(e.target.value)} style={IS} onFocus={e => e.currentTarget.style.borderColor = "rgba(212,134,10,0.4)"} onBlur={e => e.currentTarget.style.borderColor = "rgba(212,134,10,0.15)"} /></div>
      </div>
    </div>

    <button onClick={save} disabled={saving} className="px-8 py-3 rounded-xl text-[13px] font-semibold text-white transition-all hover:translate-y-[-1px] disabled:opacity-50" style={{ background: "linear-gradient(135deg, #e09040, #c07030)", boxShadow: "0 4px 16px rgba(212,134,10,0.25)" }}>{saving ? "Saving..." : "Save Changes"}</button>
  </div>;
}

/* ═══ ABOUT TAB — Magazine-style full-width layout ═══ */
function AboutTab() {
  const [quoteIdx, setQuoteIdx] = useState(0);
  useEffect(() => { const t = setInterval(() => setQuoteIdx(p => (p + 1) % 3), 12000); return () => clearInterval(t); }, []);

  return <div>
    {/* Hero Banner — full-width warm gradient */}
    <div className="relative overflow-hidden" style={{ height: 280, background: "linear-gradient(135deg, #3d2000 0%, #C07030 40%, #D4860A 70%, #E8C547 100%)" }}>
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 30% 60%, rgba(0,0,0,0.2) 0%, transparent 70%)" }} />
      <div className="relative z-10 flex items-center gap-8 h-full px-12">
        <div style={{ width: 120, height: 120, borderRadius: "50%", background: "rgba(0,0,0,0.25)", backdropFilter: "blur(12px)", border: "4px solid rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48, fontWeight: 800, color: "#fff", fontFamily: "'Outfit', sans-serif", boxShadow: "0 0 40px rgba(212,134,10,0.3)", flexShrink: 0 }}>HM</div>
        <div>
          <h1 style={{ fontSize: 36, fontWeight: 800, color: "#fff", fontFamily: "'Outfit', sans-serif", textShadow: "0 2px 16px rgba(0,0,0,0.3)", marginBottom: 4 }}>Hiral Merchant</h1>
          <div style={{ fontSize: 18, color: "rgba(255,230,200,0.85)", fontWeight: 500 }}>Consultant at Mercer &middot; New York</div>
          <div className="flex gap-2 mt-4">
            <a href="https://www.linkedin.com/in/hiral-merchant-6a0416b1/" target="_blank" rel="noopener noreferrer" style={{ padding: "6px 16px", borderRadius: 10, fontSize: 12, fontWeight: 600, background: "rgba(0,0,0,0.2)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              LinkedIn
            </a>
          </div>
        </div>
      </div>
    </div>

    {/* Bio Section — two-column layout */}
    <div className="px-10 py-10" style={{ maxWidth: 960 }}>
      <div className="flex gap-8">
        {/* Left: Bio text (60%) */}
        <div className="flex-1">
          <p style={{ fontSize: 17, lineHeight: 1.85, color: "var(--text-secondary)" }}>Born in Montreal and raised in the mountains of Western North Carolina, Hiral is now based in <strong style={{ color: "var(--accent-primary)" }}>New York</strong> as a Consultant at <strong style={{ color: "var(--accent-primary)" }}>Mercer</strong>. He holds a Bachelor of Science from the University of North Carolina at Charlotte.</p>
          <p style={{ fontSize: 17, lineHeight: 1.85, color: "var(--text-secondary)", marginTop: 16 }}>Passionate about the intersection of <strong style={{ color: "var(--accent-primary)" }}>AI and people</strong>, and the democratization of knowledge that enables a more confident workforce — this platform is a reflection of that mission. The AI Transformation Platform provides the analytical rigor of a top-tier consulting engagement in a self-service tool that any organization can use.</p>
        </div>
        {/* Right: At a Glance card (40%) */}
        <div style={{ width: 280, flexShrink: 0, borderRadius: 18, padding: 24, background: "rgba(255,255,255,0.02)", backdropFilter: "blur(12px)", border: "1px solid rgba(212,134,10,0.1)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(212,134,10,0.5)", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 16 }}>At a Glance</div>
          {[
            { icon: "🎓", label: "UNC Charlotte — BS" },
            { icon: "📍", label: "New York, NY" },
            { icon: "🏢", label: "Mercer — Workforce Transformation" },
            { icon: "🌐", label: "LinkedIn", link: "https://www.linkedin.com/in/hiral-merchant-6a0416b1/" },
            { icon: "📧", label: "merchanthiral@gmail.com" },
          ].map(item => <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, fontSize: 12, color: "var(--text-secondary)" }}>
            <span style={{ fontSize: 15 }}>{item.icon}</span>
            {item.link ? <a href={item.link} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent-primary)", textDecoration: "none" }}>{item.label}</a> : <span>{item.label}</span>}
          </div>)}
        </div>
      </div>
    </div>

    {/* ═══ QUOTES SECTION — Interactive Carousel ═══ */}
    <div className="px-10 py-10">
      <div className="text-center mb-8">
        <h2 style={{ fontSize: 28, fontWeight: 700, fontFamily: "'Outfit', sans-serif", color: "var(--text-primary)", marginBottom: 4 }}>Words That Shape the Work</h2>
        <div style={{ width: 60, height: 3, borderRadius: 2, background: "#D4860A", margin: "8px auto 0" }} />
        <p className="text-[14px] mt-3" style={{ color: "rgba(232,197,71,0.4)" }}>Three voices, one philosophy</p>
      </div>

      {/* Quote 1 — Stephanie Penner */}
      {/* Quote Carousel */}
      {(() => {
        const quotes = [
          { q: "What factors do you attribute to your success and advancement in your career?", text: "This might seem cliché, but I've found that the most successful people are those who find opportunity even in challenging situations, and when they encounter adversity, they're able to have resilience coupled with a positive mindset. That not only allows you to figure out how to solve for something, but you also inspire others to work through change. That outlook really helped me over the course of my career. Change is a constant in today's world, so having a muscle for it that I've built over time has helped me accept change as part of the everyday equation.", author: "Stephanie Penner", bg: "linear-gradient(135deg, rgba(212,134,10,0.06), rgba(232,197,71,0.03))", accent: "#D4860A", border: "rgba(212,134,10,0.15)" },
          { q: "What are the most important qualities you look for in people and leaders?", text: "I look for a whole bunch of things. They have to be smart, they have to have good judgment, they have to work hard… they have to be capable. But character is a sine qua non — an absolute necessity. They tell the truth, and nothing but the truth. They don't shave the truth. They don't twist it depending on who they're talking to. They have courage — they're not afraid to speak up. They care about the company, not just themselves.", author: "Jamie Dimon, Chairman & CEO, JPMorgan Chase", bg: "linear-gradient(135deg, rgba(11,17,32,0.6), rgba(26,35,64,0.4))", accent: "#3B82F6", border: "rgba(59,130,246,0.12)" },
          { q: "On preparation and excellence", text: "You have to take responsibility for your job. You have to do the work ahead of time. You can't just show up and expect things to work out. Always be prepared. Because you never know when you're going to be tested. It could be in a meeting, it could be when someone asks you a question, it could be when you least expect it. And if you're not prepared, it's going to show. People will know.", author: "Jim Donovan, Vice Chairman, Goldman Sachs", bg: "linear-gradient(135deg, rgba(192,112,48,0.06), rgba(184,96,42,0.03))", accent: "#C07030", border: "rgba(192,112,48,0.12)" },
        ];
        const cur = quotes[quoteIdx];
        return <div className="relative" style={{ maxWidth: 800, margin: "0 auto" }}>
          {/* Arrows */}
          <button onClick={() => setQuoteIdx((quoteIdx + 2) % 3)} style={{ position: "absolute", left: -48, top: "50%", transform: "translateY(-50%)", width: 40, height: 40, borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", color: "var(--text-muted)", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} onMouseEnter={e => e.currentTarget.style.color = "#D4860A"} onMouseLeave={e => e.currentTarget.style.color = "var(--text-muted)"}>←</button>
          <button onClick={() => setQuoteIdx((quoteIdx + 1) % 3)} style={{ position: "absolute", right: -48, top: "50%", transform: "translateY(-50%)", width: 40, height: 40, borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", color: "var(--text-muted)", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} onMouseEnter={e => e.currentTarget.style.color = "#D4860A"} onMouseLeave={e => e.currentTarget.style.color = "var(--text-muted)"}>→</button>
          {/* Quote card */}
          <div key={quoteIdx} className="rounded-2xl relative overflow-hidden" style={{ padding: "40px 48px", background: cur.bg, border: `1px solid ${cur.border}`, borderLeft: `4px solid ${cur.accent}`, animation: "quoteFade 0.5s ease" }}>
            <div className="absolute top-4 left-10 font-serif leading-none select-none" style={{ fontSize: 80, color: `${cur.accent}12` }}>&ldquo;</div>
            <div className="relative z-10">
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 2, fontStyle: "italic", color: `${cur.accent}80`, marginBottom: 16 }}>{cur.q}</div>
              <blockquote style={{ fontSize: 20, fontFamily: "'Outfit', sans-serif", lineHeight: 1.8, color: "rgba(232,236,244,0.75)", fontStyle: "italic", marginBottom: 20 }}>{cur.text}</blockquote>
              <div style={{ textAlign: "right", fontFamily: "'IBM Plex Mono', monospace", fontSize: 14, fontWeight: 700, color: cur.accent }}>— {cur.author}</div>
            </div>
          </div>
          {/* Dots */}
          <div className="flex justify-center gap-2 mt-4">{[0,1,2].map(i => <button key={i} onClick={() => setQuoteIdx(i)} style={{ width: i === quoteIdx ? 20 : 8, height: 8, borderRadius: 4, background: i === quoteIdx ? "#D4860A" : "rgba(255,255,255,0.06)", border: "none", cursor: "pointer", transition: "all 0.25s", padding: 0 }} />)}</div>
          <style>{`@keyframes quoteFade { from { opacity: 0; transform: translateX(16px); } to { opacity: 1; transform: translateX(0); } }`}</style>
        </div>;
      })()}
    </div>

    {/* ═══ PHILOSOPHY BOX ═══ */}
    <div className="mx-10 rounded-2xl mb-10" style={{ padding: 48, background: "linear-gradient(135deg, rgba(255,248,235,0.04), rgba(212,134,10,0.02))", border: "1px solid rgba(212,134,10,0.12)" }}>
      <h2 className="text-[20px] font-bold font-heading text-[var(--text-primary)] mb-2" style={{ letterSpacing: "-0.3px" }}>This Is About You</h2>
      <p className="text-[12px] mb-10" style={{ color: "rgba(232,197,71,0.4)" }}>Why these principles define the transformation journey</p>

      {/* Paragraph 1 — Courage */}
      <p className="text-[14px] leading-[1.85] text-[var(--text-secondary)] mb-8">At some point in your transformation journey, you&apos;re going to sit in a room with data that tells an uncomfortable truth. Maybe it shows that 40% of tasks in your largest function are automatable. Maybe it reveals that your most tenured leaders are in the roles most exposed to AI disruption. Maybe it surfaces a pay equity gap that restructuring will either fix or amplify. In that moment, you have a choice — soften the message or <strong style={{ color: "var(--accent-primary)" }}>tell the truth</strong>. Jamie Dimon&apos;s words aren&apos;t about banking. They&apos;re about you, in that room, deciding whether to present the data as it is or shade it to make people comfortable. The organizations that transform successfully are led by people who choose truth. Not because it&apos;s easy, but because every decision built on incomplete truth compounds into a plan that doesn&apos;t work. When you use this platform and the AI impact scores tell you something hard — <strong style={{ color: "var(--accent-primary)" }}>sit with it. Don&apos;t shave it.</strong> That&apos;s where the real work begins.</p>

      {/* Paragraph 2 — Resilience */}
      <p className="text-[14px] leading-[1.85] text-[var(--text-secondary)] mb-8">Transformation is not a single moment — it&apos;s an eighteen-month, sometimes three-year grind. There will be a point where your stakeholders lose patience. Where the pilot program doesn&apos;t show results fast enough. Where employees push back harder than expected. Where a leader you were counting on as a champion suddenly becomes a skeptic. Stephanie&apos;s insight isn&apos;t motivational poster wisdom — it&apos;s operational reality. The consultants and HR leaders who deliver real transformation are the ones who <strong style={{ color: "var(--accent-primary)" }}>find opportunity in those setbacks</strong>. When 60% of your workforce scores as &ldquo;resistant to change&rdquo; in the readiness assessment, that&apos;s not a failure — that&apos;s a segmentation strategy. Those are the people who need a different engagement approach, not a louder memo. When a redesigned role gets rejected by the business, that&apos;s feedback, not defeat. You&apos;ll use this platform to run scenarios, score readiness, model impacts — and some of those outputs will be discouraging. The resilience isn&apos;t in ignoring the data. It&apos;s in asking <strong style={{ color: "var(--accent-primary)" }}>&ldquo;what does this tell me about what to do differently?&rdquo;</strong> and iterating.</p>

      {/* Paragraph 3 — Preparation */}
      <p className="text-[14px] leading-[1.85] text-[var(--text-secondary)] mb-8">Jim Donovan&apos;s advice sounds simple. Be prepared. But in transformation, preparation is everything that separates a plan that gets funded from one that gets shelved. When your CEO asks &ldquo;what&apos;s the ROI on this transformation?&rdquo; and you&apos;ve run the cost model with realistic assumptions, pressure-tested it across three scenarios, and can speak to the skill gaps, reskilling costs, and timeline — you earn credibility. When you can&apos;t, you lose the room. This platform exists so that <strong style={{ color: "var(--accent-primary)" }}>you&apos;re never caught unprepared</strong>. Every module — from the org health scorecard to the capacity waterfall to the stakeholder map — is a layer of preparation. When a board member challenges your headcount projections, you can drill into the FTE impact model and show exactly which roles are being reduced, redeployed, and created. When an employee asks &ldquo;what happens to me?&rdquo;, you can pull up the reskilling pathway and show them their transition plan. You don&apos;t get those answers from intuition. You get them from doing the work ahead of time.</p>

      {/* Callout 1 */}
      <div className="rounded-xl my-10 py-6 px-8 text-center" style={{ background: "rgba(212,134,10,0.04)", borderTop: "2px solid rgba(212,134,10,0.15)", borderBottom: "2px solid rgba(212,134,10,0.15)" }}>
        <p className="text-[16px] italic leading-[1.8]" style={{ color: "rgba(232,197,71,0.6)", fontFamily: "'Outfit', sans-serif" }}>&ldquo;A playground is where you test assumptions without consequences. Where you model a restructuring before announcing it. Where you simulate the impact before committing budget.&rdquo;</p>
      </div>

      {/* Paragraph 4 — The Digital Playground */}
      <p className="text-[14px] leading-[1.85] text-[var(--text-secondary)] mb-8">This is why this platform is called a Digital Playground. Not because transformation is a game — but because every athlete, every performer, every leader who excels at the real thing practices first. A playground is where you test assumptions without consequences. Where you model a restructuring before announcing it. Where you simulate the financial impact before committing budget. Where you draft the change narrative before standing in front of 5,000 employees. The leaders and practitioners who use this tool the way it&apos;s intended — <strong style={{ color: "var(--accent-primary)" }}>experimenting with scenarios, stress-testing their designs, building and rebuilding until the plan is bulletproof</strong> — they walk into the real transformation with confidence. They&apos;ve already seen every version of the future. They&apos;ve already answered the hard questions. They&apos;ve prepared, they&apos;ve built resilience through iteration, and they&apos;ve faced the data with honesty. They swing, they slide, they climb — and when the real moment comes, they&apos;re ready.</p>

      {/* Callout 2 */}
      <div className="rounded-xl my-10 py-6 px-8 text-center" style={{ background: "rgba(212,134,10,0.04)", borderTop: "2px solid rgba(212,134,10,0.15)", borderBottom: "2px solid rgba(212,134,10,0.15)" }}>
        <p className="text-[16px] italic leading-[1.8]" style={{ color: "rgba(232,197,71,0.6)", fontFamily: "'Outfit', sans-serif" }}>&ldquo;The principles behind great leadership and great transformation are the same.&rdquo;</p>
      </div>

      {/* Paragraph 5 — Why This Matters */}
      <p className="text-[14px] leading-[1.85] text-[var(--text-secondary)] mb-8">The reason I built this platform — and the reason these quotes live here — is because I believe the principles behind great leadership and great transformation are the same. And those principles shouldn&apos;t be locked behind expensive consulting engagements that only Fortune 500 companies can access. A 200-person healthcare system deserves the same rigor in their workforce planning as a 50,000-person bank. A first-time HR leader navigating their company&apos;s first AI initiative deserves the same strategic toolkit as a McKinsey partner. That&apos;s what <strong style={{ color: "var(--accent-primary)" }}>democratizing knowledge</strong> means. Not dumbing it down — opening it up. If Stephanie&apos;s resilience, Jamie&apos;s character, and Jim&apos;s preparation resonate with you the way they resonate with me, then you&apos;re exactly who this platform was built for. Welcome to the Digital Playground. Let&apos;s build something.</p>

      {/* Signature */}
      <div className="flex items-center gap-3 mt-10 pt-6" style={{ borderTop: "1px solid rgba(212,134,10,0.08)" }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[14px] font-bold text-white shrink-0" style={{ background: "linear-gradient(135deg, #e09040, #c07030)", fontFamily: "'Outfit',sans-serif" }}>HM</div>
        <div>
          <div className="text-[13px] font-semibold text-[var(--text-primary)] font-heading">Hiral Merchant</div>
          <div className="text-[10px]" style={{ color: "rgba(212,134,10,0.4)" }}>New York</div>
        </div>
      </div>
    </div>

    {/* Footer */}
    <div className="text-center pb-8">
      <p className="text-[10px]" style={{ color: "rgba(255,230,200,0.15)" }}>Built with purpose in New York. {"\u00A9"} 2026</p>
    </div>
  </div>;
}

/* ═══ KNOWLEDGE BASE TAB ═══ */
function KnowledgeBaseTab() {
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [bookmarks, setBookmarks] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem("kb_bookmarks") || "[]"); } catch { return []; } });
  const toggleBookmark = (id: string) => { const next = bookmarks.includes(id) ? bookmarks.filter(b => b !== id) : [...bookmarks, id]; setBookmarks(next); localStorage.setItem("kb_bookmarks", JSON.stringify(next)); };

  const entries = Object.entries(KNOWLEDGE_BASE);
  const filtered = search ? entries.filter(([_, e]) => e.title.toLowerCase().includes(search.toLowerCase()) || e.summary.toLowerCase().includes(search.toLowerCase())) : entries;
  const groups: Record<string, [string, typeof KNOWLEDGE_BASE[string]][]> = {};
  filtered.forEach(([id, e]) => { (groups[e.category] = groups[e.category] || []).push([id, e]); });

  const gettingStarted = [
    { step: 1, title: "Understanding the Platform", id: "snapshot" },
    { step: 2, title: "Uploading Your Data", id: "export" },
    { step: 3, title: "Running Your First Diagnosis", id: "scan" },
    { step: 4, title: "Designing Your Future State", id: "design" },
    { step: 5, title: "Simulating Impact", id: "simulate" },
    { step: 6, title: "Building Your Roadmap", id: "plan" },
    { step: 7, title: "Exporting Deliverables", id: "export" },
  ];

  return <div>
    <h1 className="text-[24px] font-bold font-heading text-[var(--text-primary)] mb-2" style={{ letterSpacing: "-0.5px" }}>Knowledge Base</h1>
    <p className="text-[14px] mb-6" style={{ color: "rgba(212,134,10,0.4)" }}>Comprehensive guides for every module and feature.</p>

    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search articles..." className="w-full rounded-xl px-5 py-3.5 text-[13px] text-[var(--text-primary)] outline-none mb-7 transition-all" style={{ background: "rgba(255,250,240,0.03)", border: "1px solid rgba(212,134,10,0.1)", fontFamily: "'Outfit',sans-serif" }} onFocus={e => e.currentTarget.style.borderColor = "rgba(212,134,10,0.3)"} onBlur={e => e.currentTarget.style.borderColor = "rgba(212,134,10,0.1)"} />

    {!search && <div className="rounded-2xl p-5 mb-7" style={{ background: "rgba(212,134,10,0.04)", border: "1px solid rgba(212,134,10,0.08)" }}>
      <h3 className="text-[13px] font-bold font-heading mb-3" style={{ color: "var(--accent-primary)" }}>Getting Started</h3>
      <div className="space-y-1.5">{gettingStarted.map(s => <button key={s.step} onClick={() => setOpenId(s.id)} className="w-full text-left flex items-center gap-3 p-2.5 rounded-xl transition-all hover:translate-x-1" style={{ background: "transparent" }}>
        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ background: "var(--accent-primary)" }}>{s.step}</div>
        <span className="text-[12px] text-[var(--text-secondary)]">{s.title}</span>
      </button>)}</div>
    </div>}

    {Object.entries(groups).map(([cat, items]) => <div key={cat} className="mb-6">
      <h3 className="text-[10px] font-bold uppercase tracking-[2px] mb-3" style={{ color: "rgba(212,134,10,0.4)" }}>{cat}</h3>
      <div className="space-y-2">{items.map(([id, e]) => <div key={id} className="rounded-xl p-4 flex items-center gap-3 cursor-pointer transition-all hover:translate-x-1" style={{ background: "rgba(255,250,240,0.02)", border: "1px solid rgba(212,134,10,0.06)" }} onClick={() => setOpenId(id)}>
        <div className="flex-1 min-w-0"><div className="text-[13px] font-semibold text-[var(--text-primary)] font-heading">{e.title}</div><div className="text-[10px] mt-0.5 truncate" style={{ color: "rgba(212,134,10,0.35)" }}>{e.summary}</div></div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[8px] px-2 py-0.5 rounded-full font-semibold" style={{ background: `${e.categoryColor}15`, color: e.categoryColor }}>{e.category}</span>
          <button onClick={ev => { ev.stopPropagation(); toggleBookmark(id); }} className="text-[14px] transition-opacity hover:opacity-100" style={{ opacity: bookmarks.includes(id) ? 1 : 0.3 }}>{bookmarks.includes(id) ? "⭐" : "☆"}</button>
        </div>
      </div>)}</div>
    </div>)}

    {openId && <KnowledgeModal moduleId={openId} onClose={() => setOpenId(null)} />}
  </div>;
}

/* ═══ USE CASES TAB ═══ */
const USE_CASES = [
  { id: "uc1", icon: "🏦", industry: "Financial Services", company: "Global Alternative Asset Manager, 800 employees", challenge: "Redesign investment operations roles for AI-augmented portfolio management", modules: ["Job Architecture", "Design", "Simulate"], outcome: "35% capacity freed in operations, redeployed to direct portfolio analysis", detail: "A leading alternative asset manager managing $45B AUM needed to understand how AI would reshape their investment operations team. The team used the Job Architecture module to map 45 distinct roles across Fund Accounting, Portfolio Monitoring, and Investor Reporting. The Work Design Lab deconstructed 12 key roles task-by-task, revealing that 42% of Fund Accounting tasks were highly automatable. The Impact Simulator modeled three scenarios — the recommended Balanced scenario freed 35% of operations capacity. The freed capacity was redeployed to direct portfolio analysis and LP relationship management." },
  { id: "uc2", icon: "🛒", industry: "Retail", company: "National Retailer, 52,000 employees", challenge: "Model the workforce impact of store operations automation", modules: ["Diagnose", "Simulate", "Mobilize"], outcome: "Identified $18M annual savings while preserving customer experience roles", detail: "A major national retailer was deploying self-checkout and AI-powered scheduling across 850 stores. The Diagnose module assessed readiness across 5 store operations roles. The AI Opportunity Scan revealed that Cashier and Stock Associate roles had 55-65% automatable task content. The Simulator modeled the impact: the Balanced scenario showed $18M annual labor savings but required reskilling 2,400 employees." },
  { id: "uc3", icon: "🏥", industry: "Healthcare", company: "Regional Health System, 12,000 employees", challenge: "Full clinical workforce transformation for AI-augmented care delivery", modules: ["All modules"], outcome: "Redesigned 85 clinical roles, built 3-year transformation roadmap", detail: "A regional health system with 8 hospitals needed a comprehensive workforce strategy for clinical AI adoption. The engagement used every module in the platform. The Workforce Snapshot revealed 12,000 employees across 340 unique roles. The Job Architecture module rationalized to 180 roles. The Work Design Lab redesigned 85 clinical and administrative roles." },
  { id: "uc4", icon: "🚀", industry: "Technology", company: "High-growth SaaS, 3,200 employees", challenge: "Clean up title inflation after rapid scaling", modules: ["Job Architecture", "Skills"], outcome: "Reduced 420 unique titles to 140, improved pay equity by 22%", detail: "A SaaS company that grew from 400 to 3,200 employees in 3 years had accumulated 420 unique job titles. The Job Architecture module revealed: 35% of titles had only 1 incumbent, career levels were inconsistent. After rationalization, they reduced to 140 titles, improved market benchmarking accuracy by 35%, and increased internal mobility by 28%." },
  { id: "uc5", icon: "🏭", industry: "Manufacturing", company: "Automotive parts manufacturer, 8,500 employees", challenge: "Model cost-benefit of factory automation on workforce", modules: ["Simulate", "Design", "Headcount"], outcome: "Identified $24M savings with 70% absorption through natural attrition", detail: "An automotive parts manufacturer evaluated a $45M investment in robotic assembly and AI-powered quality inspection across 6 plants. The Work Design Lab deconstructed 15 production roles. The Headcount Waterfall revealed that natural attrition absorbed 68% of the automation-driven reduction." },
  { id: "uc6", icon: "💼", industry: "Professional Services", company: "Management consulting firm, 2,800 consultants", challenge: "Build change management roadmap for AI tool adoption", modules: ["Mobilize", "Readiness"], outcome: "Achieved 78% AI tool adoption in 6 months vs. industry average of 35%", detail: "A management consulting firm was rolling out AI-powered research tools and automated slide generation. The Change Readiness assessment revealed stark differences between practices. The Manager Development module identified 12 Partner-level Champions. The result: 78% firm-wide adoption in 6 months." },
];

function UseCasesTab() {
  const [openId, setOpenId] = useState<string | null>(null);
  const uc = USE_CASES.find(u => u.id === openId);
  if (uc) return <div style={{ animation: "fadeIn 0.3s ease-out" }}>
    <button onClick={() => setOpenId(null)} className="text-[11px] hover:text-[var(--accent-primary)] mb-5 flex items-center gap-1.5 group transition-colors" style={{ color: "rgba(212,134,10,0.4)" }}><span className="group-hover:-translate-x-0.5 transition-transform">←</span> Back</button>
    <div className="rounded-2xl p-7" style={{ background: "rgba(255,250,240,0.02)", border: "1px solid rgba(212,134,10,0.08)" }}>
      <div className="flex items-center gap-2 mb-2"><span className="text-2xl">{uc.icon}</span><span className="text-[10px] px-2.5 py-0.5 rounded-full font-semibold" style={{ background: "rgba(212,134,10,0.08)", color: "var(--accent-primary)" }}>{uc.industry}</span></div>
      <h2 className="text-[20px] font-bold font-heading text-[var(--text-primary)] mb-1">{uc.company}</h2>
      <div className="text-[13px] font-semibold mb-4" style={{ color: "var(--accent-primary)" }}>{uc.challenge}</div>
      <div className="rounded-xl p-4 mb-5" style={{ background: "rgba(16,185,129,0.04)", border: "1px solid rgba(16,185,129,0.1)" }}><div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--success)" }}>Outcome</div><div className="text-[13px] text-[var(--text-primary)] font-semibold">{uc.outcome}</div></div>
      <p className="text-[13px] text-[var(--text-secondary)] leading-[1.8]">{uc.detail}</p>
    </div>
  </div>;

  return <div>
    <h1 className="text-[24px] font-bold font-heading text-[var(--text-primary)] mb-2" style={{ letterSpacing: "-0.5px" }}>Use Cases</h1>
    <p className="text-[14px] mb-7" style={{ color: "rgba(212,134,10,0.4)" }}>Real-world consulting scenarios.</p>
    <div className="grid grid-cols-2 gap-4">{USE_CASES.map(uc => <div key={uc.id} onClick={() => setOpenId(uc.id)} className="rounded-2xl p-5 cursor-pointer transition-all hover:translate-y-[-2px]" style={{ background: "rgba(255,250,240,0.02)", border: "1px solid rgba(212,134,10,0.06)" }}>
      <div className="flex items-center gap-2 mb-2"><span className="text-xl">{uc.icon}</span><span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: "rgba(212,134,10,0.08)", color: "var(--accent-primary)" }}>{uc.industry}</span></div>
      <div className="text-[12px] font-semibold text-[var(--text-primary)] font-heading mb-1">{uc.company}</div>
      <div className="text-[11px] mb-3" style={{ color: "rgba(212,134,10,0.35)" }}>{uc.challenge}</div>
      <div className="text-[10px] font-semibold" style={{ color: "var(--success)" }}>{uc.outcome}</div>
    </div>)}</div>
  </div>;
}

/* ═══ TUTORIALS TAB ═══ */
const TUTORIALS = [
  { id: "t1", cat: "Getting Started", title: "Platform Overview Tour", duration: "5 min", level: "Beginner", desc: "Complete walkthrough of the platform's interface, navigation, and core concepts." },
  { id: "t2", cat: "Getting Started", title: "Uploading and Configuring Data", duration: "8 min", level: "Beginner", desc: "Step-by-step guide to importing workforce data from your HRIS." },
  { id: "t3", cat: "Module Deep Dives", title: "Running an Org Health Diagnosis", duration: "10 min", level: "Intermediate", desc: "Using the Diagnose module to assess organizational health." },
  { id: "t4", cat: "Module Deep Dives", title: "Building a Job Architecture", duration: "15 min", level: "Intermediate", desc: "Creating an enterprise job architecture from scratch." },
  { id: "t5", cat: "Module Deep Dives", title: "Calibrating Your Job Architecture", duration: "10 min", level: "Intermediate", desc: "Using the validation engine to identify and resolve structural issues." },
  { id: "t6", cat: "Module Deep Dives", title: "Using the Work Design Lab", duration: "12 min", level: "Intermediate", desc: "Master the 4-step work design process." },
  { id: "t7", cat: "Module Deep Dives", title: "Task Deconstruction Walkthrough", duration: "10 min", level: "Intermediate", desc: "Breaking a role into tasks with AI impact scoring." },
  { id: "t8", cat: "Module Deep Dives", title: "Running Simulations", duration: "10 min", level: "Intermediate", desc: "Model transformation scenarios and build ROI analysis." },
  { id: "t9", cat: "Module Deep Dives", title: "Building a Change Roadmap", duration: "12 min", level: "Intermediate", desc: "Creating a sequenced transformation plan." },
  { id: "t10", cat: "Module Deep Dives", title: "Configuring Operating Models", duration: "10 min", level: "Intermediate", desc: "Industry-specific taxonomies and blueprints." },
  { id: "t11", cat: "Module Deep Dives", title: "Exporting Deliverables", duration: "8 min", level: "Beginner", desc: "Generate professional reports for stakeholders." },
  { id: "t12", cat: "Advanced", title: "AI Insights & Recommendations", duration: "10 min", level: "Advanced", desc: "Leveraging Gemini AI for cross-cutting analysis." },
];

function TutorialsTab() {
  const [openId, setOpenId] = useState<string | null>(null);
  const [requestText, setRequestText] = useState("");
  const tut = TUTORIALS.find(t => t.id === openId);
  if (tut) return <div style={{ animation: "fadeIn 0.3s ease-out" }}>
    <button onClick={() => setOpenId(null)} className="text-[11px] hover:text-[var(--accent-primary)] mb-5 flex items-center gap-1.5 transition-colors" style={{ color: "rgba(212,134,10,0.4)" }}>← Back</button>
    <div className="rounded-2xl p-8 text-center mb-5" style={{ background: "linear-gradient(135deg, rgba(212,134,10,0.06), rgba(192,112,48,0.03))", border: "1px solid rgba(212,134,10,0.1)", minHeight: 180 }}>
      <div className="text-5xl mb-3 opacity-30">▶️</div>
      <div className="text-[14px] font-semibold text-[var(--text-primary)]">Video Coming Soon</div>
      <div className="text-[12px] mt-1" style={{ color: "rgba(212,134,10,0.4)" }}>{tut.title} &middot; {tut.duration}</div>
    </div>
    <div className="rounded-2xl p-6" style={{ background: "rgba(255,250,240,0.02)", border: "1px solid rgba(212,134,10,0.08)" }}>
      <h2 className="text-[18px] font-bold font-heading text-[var(--text-primary)] mb-2">{tut.title}</h2>
      <div className="flex gap-2 mb-4"><span className="text-[9px] px-2.5 py-0.5 rounded-full font-semibold" style={{ background: "rgba(212,134,10,0.08)", color: "var(--accent-primary)" }}>{tut.level}</span><span className="text-[9px]" style={{ color: "rgba(212,134,10,0.35)" }}>{tut.duration}</span></div>
      <p className="text-[13px] text-[var(--text-secondary)] leading-[1.8]">{tut.desc}</p>
    </div>
  </div>;

  const cats = [...new Set(TUTORIALS.map(t => t.cat))];
  return <div>
    <h1 className="text-[24px] font-bold font-heading text-[var(--text-primary)] mb-2" style={{ letterSpacing: "-0.5px" }}>Tutorials</h1>
    <p className="text-[14px] mb-7" style={{ color: "rgba(212,134,10,0.4)" }}>Step-by-step guides for every feature.</p>
    {cats.map(cat => <div key={cat} className="mb-6">
      <h3 className="text-[10px] font-bold uppercase tracking-[2px] mb-3" style={{ color: "rgba(212,134,10,0.4)" }}>{cat}</h3>
      <div className="grid grid-cols-3 gap-3">{TUTORIALS.filter(t => t.cat === cat).map(t => <div key={t.id} onClick={() => setOpenId(t.id)} className="rounded-2xl overflow-hidden cursor-pointer transition-all hover:translate-y-[-2px]" style={{ border: "1px solid rgba(212,134,10,0.06)" }}>
        <div className="h-24 flex items-center justify-center" style={{ background: "linear-gradient(135deg, rgba(212,134,10,0.06), rgba(192,112,48,0.03))" }}><span className="text-3xl opacity-25" style={{ color: "var(--accent-primary)" }}>▶</span></div>
        <div className="p-3.5" style={{ background: "rgba(255,250,240,0.02)" }}><div className="text-[12px] font-semibold text-[var(--text-primary)] font-heading mb-1">{t.title}</div><div className="flex gap-2 text-[9px]"><span style={{ color: "rgba(212,134,10,0.35)" }}>{t.duration}</span><span className="px-1.5 py-0.5 rounded-full" style={{ background: "rgba(212,134,10,0.06)", color: "var(--accent-primary)" }}>{t.level}</span></div></div>
      </div>)}</div>
    </div>)}
    <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: "rgba(255,250,240,0.02)", border: "1px solid rgba(212,134,10,0.06)" }}>
      <input value={requestText} onChange={e => setRequestText(e.target.value)} placeholder="Request a tutorial topic..." className="flex-1 rounded-xl px-4 py-2.5 text-[12px] text-[var(--text-primary)] outline-none" style={{ background: "rgba(255,250,240,0.03)", border: "1px solid rgba(212,134,10,0.1)" }} />
      <button onClick={() => { if (requestText.trim()) { const r = JSON.parse(localStorage.getItem("tutorial_requests") || "[]"); r.push({ text: requestText, date: new Date().toISOString() }); localStorage.setItem("tutorial_requests", JSON.stringify(r)); setRequestText(""); }}} className="px-5 py-2.5 rounded-xl text-[11px] font-semibold text-white" style={{ background: "linear-gradient(135deg, #e09040, #c07030)" }}>Request</button>
    </div>
  </div>;
}

/* ═══ RELEASE NOTES TAB ═══ */
function ReleasesTab() {
  const releases = [
    { ver: "2.5", date: "Apr 2026", badges: ["New Feature"], title: "Job Architecture Module", desc: "Premium job catalogue with hierarchy tree, career path visualization, calibration engine with 19 validation rules." },
    { ver: "2.4", date: "Apr 2026", badges: ["New Feature"], title: "Operating Model Taxonomy", desc: "Industry-specific taxonomy with 10 universal functions, 14 industries, and full customization." },
    { ver: "2.3", date: "Apr 2026", badges: ["New Feature"], title: "AI-Powered Insights", desc: "AI Recommendations Engine, Executive Summary Generator, Scenario comparison with visualizations." },
    { ver: "2.2", date: "Apr 2026", badges: ["Improvement"], title: "Enhanced Export & Auth", desc: "Word export, AI narrative, remember me, profile settings, session management." },
    { ver: "2.1", date: "Apr 2026", badges: ["Improvement"], title: "Design System & Refactoring", desc: "Outfit + IBM Plex Mono fonts, warm amber palette, modular backend, 562-employee demo dataset." },
    { ver: "2.0", date: "Apr 2026", badges: ["New Feature"], title: "Full Platform Rebuild", desc: "Next.js 16 + FastAPI rewrite. 7 tab modules, 65 API endpoints, tutorial system." },
    { ver: "1.x", date: "2025", badges: ["Legacy"], title: "Original Prototype", desc: "Initial Dash/Streamlit prototype proving the concept." },
  ];

  return <div>
    <h1 className="text-[24px] font-bold font-heading text-[var(--text-primary)] mb-7" style={{ letterSpacing: "-0.5px" }}>Release Notes</h1>
    <div className="space-y-4">{releases.map(r => <div key={r.ver} className="flex gap-5 rounded-2xl p-5" style={{ background: "rgba(255,250,240,0.02)", border: "1px solid rgba(212,134,10,0.06)" }}>
      {/* Timeline dot */}
      <div className="flex flex-col items-center shrink-0 pt-1"><div className="w-3 h-3 rounded-full" style={{ background: "var(--accent-primary)", boxShadow: "0 0 8px rgba(212,134,10,0.3)" }} /><div className="w-0.5 flex-1 mt-1" style={{ background: "rgba(212,134,10,0.1)" }} /></div>
      <div className="flex-1">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-[16px] font-black font-data" style={{ color: "var(--accent-primary)" }}>v{r.ver}</span>
          <span className="text-[10px]" style={{ color: "rgba(212,134,10,0.35)" }}>{r.date}</span>
          {r.badges.map(b => <span key={b} className="text-[8px] font-bold px-2 py-0.5 rounded-full" style={{ color: b === "New Feature" ? "var(--success)" : b === "Improvement" ? "var(--accent-primary)" : "var(--text-muted)", background: b === "New Feature" ? "rgba(16,185,129,0.08)" : b === "Improvement" ? "rgba(212,134,10,0.08)" : "rgba(255,255,255,0.03)" }}>{b}</span>)}
        </div>
        <div className="text-[14px] font-bold text-[var(--text-primary)] font-heading mb-1">{r.title}</div>
        <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed">{r.desc}</p>
      </div>
    </div>)}</div>
  </div>;
}

/* ═══ FEEDBACK TAB ═══ */
function FeedbackTab({ user }: { user: authApi.AuthUser }) {
  const [cat, setCat] = useState("General Feedback");
  const [subject, setSubject] = useState(""); const [desc, setDesc] = useState(""); const [severity, setSeverity] = useState("Low");
  const [submitted, setSubmitted] = useState<{cat:string;subject:string;date:string;status:string}[]>(() => { try { return JSON.parse(localStorage.getItem(`feedback_${user.id}`) || "[]"); } catch { return []; } });

  const submit = () => {
    if (!subject.trim() || !desc.trim()) return;
    const next = [{ cat, subject: subject.trim(), date: new Date().toISOString(), status: "Submitted" }, ...submitted];
    setSubmitted(next); localStorage.setItem(`feedback_${user.id}`, JSON.stringify(next));
    setSubject(""); setDesc("");
  };

  return <div>
    <h1 className="text-[24px] font-bold font-heading text-[var(--text-primary)] mb-7" style={{ letterSpacing: "-0.5px" }}>Feedback & Support</h1>
    <div className="rounded-2xl p-6 mb-6" style={{ background: "rgba(255,250,240,0.02)", border: "1px solid rgba(212,134,10,0.08)" }}>
      <h3 className="text-[15px] font-bold font-heading text-[var(--text-primary)] mb-5">Submit Feedback</h3>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div><label style={LBL}>Category</label><select value={cat} onChange={e => setCat(e.target.value)} style={IS}><option>Bug Report</option><option>Feature Request</option><option>General Feedback</option><option>Question</option></select></div>
          {cat === "Bug Report" && <div><label style={LBL}>Severity</label><select value={severity} onChange={e => setSeverity(e.target.value)} style={IS}><option>Low</option><option>Medium</option><option>High</option></select></div>}
        </div>
        <div><label style={LBL}>Subject</label><input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Brief description" style={IS} onFocus={e => e.currentTarget.style.borderColor = "rgba(212,134,10,0.4)"} onBlur={e => e.currentTarget.style.borderColor = "rgba(212,134,10,0.15)"} /></div>
        <div><label style={LBL}>Description</label><textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Detailed description..." rows={4} style={{ ...IS, resize: "vertical" as const }} onFocus={e => e.currentTarget.style.borderColor = "rgba(212,134,10,0.4)"} onBlur={e => e.currentTarget.style.borderColor = "rgba(212,134,10,0.15)"} /></div>
        <button onClick={submit} disabled={!subject.trim() || !desc.trim()} className="px-6 py-2.5 rounded-xl text-[12px] font-semibold text-white transition-all disabled:opacity-30" style={{ background: "linear-gradient(135deg, #e09040, #c07030)" }}>Submit Feedback</button>
      </div>
    </div>
    {submitted.length > 0 && <div className="rounded-2xl p-6" style={{ background: "rgba(255,250,240,0.02)", border: "1px solid rgba(212,134,10,0.08)" }}>
      <h3 className="text-[15px] font-bold font-heading text-[var(--text-primary)] mb-4">My Submissions</h3>
      <div className="space-y-2">{submitted.map((s, i) => <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(212,134,10,0.03)", border: "1px solid rgba(212,134,10,0.05)" }}>
        <div className="flex-1"><div className="text-[12px] font-semibold text-[var(--text-primary)]">{s.subject}</div><div className="text-[9px]" style={{ color: "rgba(212,134,10,0.35)" }}>{s.cat} &middot; {new Date(s.date).toLocaleDateString()}</div></div>
        <span className="text-[9px] px-2 py-0.5 rounded-full font-semibold" style={{ background: "rgba(212,134,10,0.08)", color: "var(--accent-primary)" }}>{s.status}</span>
      </div>)}</div>
    </div>}
  </div>;
}

/* ═══ ADMIN TAB (hiral only) ═══ */
function AdminTab() {
  const [users, setUsers] = useState<Record<string, unknown>[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [aiUsage, setAiUsage] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    Promise.all([
      authApi.adminGetUsers(),
      authApi.adminGetAIUsage(),
    ]).then(([userData, aiData]) => {
      setUsers((userData as Record<string, unknown>).users as Record<string, unknown>[] || []);
      setStats((userData as Record<string, unknown>).stats as Record<string, number> || {});
      setAiUsage(aiData);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const toggleStatus = async (userId: string, currentlyActive: boolean) => {
    try {
      await authApi.adminToggleUserStatus(userId, !currentlyActive);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: !currentlyActive } : u));
    } catch {}
  };

  if (loading) return <div className="text-center py-12 text-[var(--text-muted)]">Loading admin data...</div>;

  return <div>
    <h1 className="text-[24px] font-bold font-heading text-[var(--text-primary)] mb-2" style={{ letterSpacing: "-0.5px" }}>Admin Panel</h1>
    <p className="text-[14px] mb-7" style={{ color: "rgba(212,134,10,0.4)" }}>User management and platform analytics.</p>

    {/* Stats row */}
    <div className="grid grid-cols-5 gap-3 mb-6">
      {[{ label: "Total Users", value: stats.total_users || 0 },
        { label: "Active Today", value: stats.active_today || 0 },
        { label: "Total Projects", value: stats.total_projects || 0 },
        { label: "AI Calls Today", value: (aiUsage as Record<string,unknown>).total_today || 0 },
        { label: "AI Limit/User", value: (aiUsage as Record<string,unknown>).limit_per_user || 20 },
      ].map(s => <div key={s.label} className="rounded-xl p-4 text-center" style={{ background: "rgba(212,134,10,0.04)", border: "1px solid rgba(212,134,10,0.08)" }}>
        <div className="text-[22px] font-extrabold font-data" style={{ color: "var(--accent-primary)" }}>{String(s.value)}</div>
        <div className="text-[9px] uppercase tracking-wider mt-0.5" style={{ color: "rgba(212,134,10,0.4)" }}>{s.label}</div>
      </div>)}
    </div>

    {/* AI Usage per user */}
    {Object.keys((aiUsage as Record<string,unknown>).per_user || {}).length > 0 && <div className="rounded-xl p-5 mb-6" style={{ background: "rgba(255,250,240,0.02)", border: "1px solid rgba(212,134,10,0.08)" }}>
      <h3 className="text-[13px] font-bold font-heading text-[var(--text-primary)] mb-3">AI Usage by User (Today)</h3>
      <div className="space-y-1.5">{Object.entries((aiUsage as Record<string,Record<string,number>>).per_user || {}).map(([uid, count]) => <div key={uid} className="flex items-center gap-3">
        <span className="text-[11px] text-[var(--text-secondary)] w-32 truncate font-data">{uid.slice(0, 12)}...</span>
        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(212,134,10,0.06)" }}><div className="h-full rounded-full" style={{ width: `${(count / 20) * 100}%`, background: "var(--accent-primary)" }} /></div>
        <span className="text-[10px] font-data" style={{ color: "var(--accent-primary)" }}>{count}/20</span>
      </div>)}</div>
    </div>}

    {/* User table */}
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(212,134,10,0.08)" }}>
      <table className="w-full text-[12px]">
        <thead><tr style={{ background: "rgba(212,134,10,0.04)" }}>
          {["Username", "Email", "Display Name", "Created", "Last Login", "Projects", "Status", ""].map(h => <th key={h} className="px-3 py-2.5 text-left text-[9px] font-semibold uppercase tracking-wider" style={{ color: "rgba(212,134,10,0.4)", borderBottom: "1px solid rgba(212,134,10,0.06)" }}>{h}</th>)}
        </tr></thead>
        <tbody>{users.map(u => <tr key={String(u.id)} className="transition-colors" style={{ borderBottom: "1px solid rgba(212,134,10,0.04)" }}>
          <td className="px-3 py-2.5 font-semibold text-[var(--text-primary)]">{String(u.username)}</td>
          <td className="px-3 py-2.5 text-[var(--text-secondary)]">{String(u.email || "—")}</td>
          <td className="px-3 py-2.5 text-[var(--text-secondary)]">{String(u.display_name || "—")}</td>
          <td className="px-3 py-2.5 font-data" style={{ color: "rgba(212,134,10,0.4)" }}>{String(u.created_at || "—")}</td>
          <td className="px-3 py-2.5 font-data" style={{ color: "rgba(212,134,10,0.4)" }}>{String(u.last_login || "Never")}</td>
          <td className="px-3 py-2.5 font-data text-center" style={{ color: "var(--accent-primary)" }}>{String(u.project_count || 0)}</td>
          <td className="px-3 py-2.5"><span className="text-[9px] px-2 py-0.5 rounded-full font-semibold" style={{ color: u.is_active ? "var(--success)" : "var(--risk)", background: u.is_active ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)" }}>{u.is_active ? "Active" : "Inactive"}</span></td>
          <td className="px-3 py-2.5">{String(u.username) !== "hiral" && <button onClick={() => toggleStatus(String(u.id), !!u.is_active)} className="text-[10px] font-semibold transition-colors" style={{ color: u.is_active ? "var(--risk)" : "var(--success)" }}>{u.is_active ? "Deactivate" : "Activate"}</button>}</td>
        </tr>)}</tbody>
      </table>
    </div>
  </div>;
}
