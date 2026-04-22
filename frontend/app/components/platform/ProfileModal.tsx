"use client";
import React, { useState } from "react";
import * as authApi from "../../../lib/auth-api";

/** Validate email — matches backend _validate_email_strict rules. */
export function isValidEmail(email: string): boolean {
  const v = email.trim().toLowerCase();
  if (!v) return false;
  if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(v)) return false;
  const atIdx = v.lastIndexOf("@");
  const local = v.slice(0, atIdx);
  const domain = v.slice(atIdx + 1);
  if (local.length < 2) return false;
  if (domain.length < 4) return false;
  const parts = domain.split(".");
  if (parts.length < 2 || parts[parts.length - 1].length < 2) return false;
  if (parts[0].length < 2) return false;
  const fakes = ["test.com", "test.test", "example.com", "example.org", "fake.com", "asdf.com", "aaa.com", "xxx.com", "temp.com"];
  if (fakes.includes(domain)) return false;
  return true;
}

export function ProfileModal({ user, onClose, onUpdate }: { user: authApi.AuthUser; onClose: () => void; onUpdate: (u: authApi.AuthUser) => void }) {
  const [displayName, setDisplayName] = useState(user.display_name || user.username);
  const [email, setEmail] = useState(user.email || "");
  const [emailTouched, setEmailTouched] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const emailValid = email.length === 0 || isValidEmail(email);
  const showEmailError = emailTouched && email.length > 0 && !isValidEmail(email);
  const showEmailOk = emailTouched && email.length > 0 && isValidEmail(email);

  const handleSave = async () => {
    setError(""); setSuccess("");
    const cleanEmail = email.trim().toLowerCase();
    if (cleanEmail && !isValidEmail(cleanEmail)) { setError("Please enter a valid email address"); return; }
    setSaving(true);
    try {
      const updates: Record<string, string> = {};
      if (displayName !== (user.display_name || user.username)) updates.display_name = displayName;
      if (cleanEmail !== (user.email || "")) updates.email = cleanEmail;
      if (newPw) { updates.current_password = currentPw; updates.new_password = newPw; updates.new_password_confirm = confirmPw; }
      if (Object.keys(updates).length === 0) { setSuccess("No changes"); setSaving(false); return; }
      const result = await authApi.updateProfile(updates);
      setSuccess("Profile updated");
      onUpdate({ ...user, ...result });
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Update failed"); }
    setSaving(false);
  };

  const inputStyle: React.CSSProperties = { width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text-primary)", fontSize: 15, fontFamily: "'Inter Tight', sans-serif", outline: "none", boxSizing: "border-box" as const };
  const labelStyle: React.CSSProperties = { display: "block", fontSize: 15, color: "var(--text-muted)", marginBottom: 4, fontFamily: "monospace", textTransform: "uppercase" as const, letterSpacing: "1px" };

  return <div style={{ position: "fixed", inset: 0, zIndex: 99998, display: "flex", alignItems: "center", justifyContent: "center" }}>
    <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }} />
    <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 420, background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 20, padding: "28px 24px", boxShadow: "var(--shadow-4)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 className="font-heading" style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>Profile Settings</h2>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 16, cursor: "pointer" }}>✕</button>
      </div>

      {error && <div style={{ background: "rgba(220,50,50,0.08)", border: "1px solid rgba(220,50,50,0.2)", borderRadius: 8, padding: "8px 12px", marginBottom: 12, color: "var(--coral)", fontSize: 15, fontFamily: "monospace" }}>{error}</div>}
      {success && <div style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 8, padding: "8px 12px", marginBottom: 12, color: "var(--sage)", fontSize: 15, fontFamily: "monospace" }}>{success}</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg, var(--accent-primary), var(--teal))", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 20, fontWeight: 700, fontFamily: "'Inter Tight', sans-serif" }}>{(displayName || "U")[0].toUpperCase()}</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{user.username}</div>
            <div style={{ fontSize: 15, color: "var(--text-muted)", fontFamily: "monospace" }}>Member since {user.last_login ? new Date().toLocaleDateString() : "today"}</div>
          </div>
        </div>

        <div><label style={labelStyle}>Display Name</label><input value={displayName} onChange={e => setDisplayName(e.target.value)} style={inputStyle} /></div>
        <div><label style={labelStyle}>Email</label>
          <div style={{ position: "relative" }}>
            <input value={email} onChange={e => { setEmail(e.target.value); if (!emailTouched) setEmailTouched(true); }} onBlur={() => setEmailTouched(true)} type="email" style={{ ...inputStyle, paddingRight: 32, borderColor: showEmailError ? "rgba(240,128,128,0.4)" : showEmailOk ? "rgba(110,231,183,0.3)" : undefined }} />
            {showEmailOk && <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "var(--sage)", fontSize: 14 }}>✓</span>}
            {showEmailError && <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "var(--coral)", fontSize: 15 }}>✕</span>}
          </div>
          {showEmailError && <span style={{ fontSize: 14, color: "var(--coral)", fontFamily: "monospace", marginTop: 2, display: "block" }}>Please enter a valid email address</span>}
        </div>

        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14, marginTop: 4 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-muted)", marginBottom: 10, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "1px" }}>Change Password</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div><label style={labelStyle}>Current Password</label><input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} placeholder="Required to change password" style={inputStyle} /></div>
            <div><label style={labelStyle}>New Password</label><input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Min 8 chars, 1 uppercase, 1 number" style={inputStyle} /></div>
            <div><label style={labelStyle}>Confirm New Password</label><input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="Type again" style={inputStyle} /></div>
          </div>
        </div>

        <button onClick={handleSave} disabled={saving || !emailValid} style={{ width: "100%", padding: "12px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, var(--accent-primary), var(--teal))", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter Tight', sans-serif", opacity: (saving || !emailValid) ? 0.5 : 1, marginTop: 4 }}>{saving ? "Saving..." : "Save Changes"}</button>
      </div>
    </div>
  </div>;
}
