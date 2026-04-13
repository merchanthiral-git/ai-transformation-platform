"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

/**
 * DesktopOnlyGate — wraps platform/tool routes.
 * On viewports below 1024px, shows a full-screen message
 * directing users to a desktop browser. Listens for resize.
 */
export function DesktopOnlyGate({ children }: { children: React.ReactNode }) {
  const [isMobile, setIsMobile] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    setChecked(true);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Don't render anything until we've checked (avoids flash)
  if (!checked) return null;
  if (!isMobile) return <>{children}</>;

  return (
    <>
      <style>{`
.desktop-gate {
  min-height: 100vh; display: flex; flex-direction: column; align-items: center;
  justify-content: center; padding: 48px 32px; text-align: center;
  background: #F4F1EB;
  font-family: 'Instrument Sans', -apple-system, sans-serif;
  color: #1A1A17;
}
.desktop-gate h1 {
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-size: 32px; font-weight: 400; line-height: 1.2;
  letter-spacing: -0.5px; margin: 0 0 20px; max-width: 360px;
}
.desktop-gate p {
  font-size: 15px; color: #5C5A54; line-height: 1.7;
  max-width: 340px; margin: 0 0 40px;
}
.desktop-gate .gate-icon {
  width: 80px; height: 80px; border-radius: 20px;
  background: rgba(192,75,45,0.08); display: flex;
  align-items: center; justify-content: center; margin-bottom: 36px;
}
.desktop-gate .gate-logo {
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-size: 20px; font-weight: 500; letter-spacing: -0.3px;
  margin-bottom: 48px; color: #1A1A17;
}
.desktop-gate .gate-btn {
  padding: 16px 40px; background: #1A1A17; color: #F4F1EB;
  border-radius: 100px; font-size: 12px; font-weight: 700;
  letter-spacing: 1.5px; text-transform: uppercase;
  text-decoration: none; transition: all 0.3s;
  display: inline-block;
}
.desktop-gate .gate-btn:hover { background: #C04B2D; color: white; }
/* CSS-only gate for immediate render before JS hydrates */
@media (min-width: 1024px) { .desktop-gate { display: none; } }
      `}</style>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500&family=Instrument+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <div className="desktop-gate">
        <div className="gate-logo">HR Digital Playground</div>
        <div className="gate-icon">
          {/* Desktop monitor icon */}
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="4" y="6" width="32" height="22" rx="3" stroke="#C04B2D" strokeWidth="1.5" fill="none" />
            <rect x="7" y="9" width="26" height="16" rx="1" fill="#C04B2D" opacity="0.08" />
            <line x1="14" y1="32" x2="26" y2="32" stroke="#C04B2D" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="20" y1="28" x2="20" y2="32" stroke="#C04B2D" strokeWidth="1.5" />
            {/* Screen content hint */}
            <rect x="10" y="12" width="8" height="4" rx="0.5" fill="#C04B2D" opacity="0.2" />
            <rect x="10" y="18" width="20" height="2" rx="0.5" fill="#C04B2D" opacity="0.12" />
            <rect x="10" y="22" width="14" height="2" rx="0.5" fill="#C04B2D" opacity="0.12" />
          </svg>
        </div>
        <h1>This tool is built for desktop.</h1>
        <p>
          The HR Digital Playground platform requires a desktop browser
          for the best experience — large dashboards, multi-panel workflows,
          and data visualizations need the screen real estate.
        </p>
        <p style={{ fontSize: 14, color: "#9E9B93", marginBottom: 40 }}>
          Please visit us again from a desktop or laptop computer.
        </p>
        <Link href="/" className="gate-btn">Back to Website &rarr;</Link>
      </div>
    </>
  );
}
