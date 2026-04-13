"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export default function LandingPage() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const heroBgRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    // ── Loader ──
    const loader = document.getElementById("loader");
    const loaderTimer = setTimeout(() => loader?.classList.add("done"), 2200);

    // ── Cursor ──
    const cursor = cursorRef.current;
    const ring = ringRef.current;
    let cx = 0, cy = 0, rx = 0, ry = 0;
    const onMouseMove = (e: MouseEvent) => {
      cx = e.clientX; cy = e.clientY;
      if (cursor) { cursor.style.left = cx + "px"; cursor.style.top = cy + "px"; }
    };
    document.addEventListener("mousemove", onMouseMove);
    let ringRaf = 0;
    const ringLoop = () => {
      rx += (cx - rx) * 0.12; ry += (cy - ry) * 0.12;
      if (ring) { ring.style.left = rx + "px"; ring.style.top = ry + "px"; }
      ringRaf = requestAnimationFrame(ringLoop);
    };
    ringLoop();

    const hoverEls = document.querySelectorAll("[data-hover],a,button");
    const enterFn = () => { cursor?.classList.add("hover"); ring?.classList.add("hover"); };
    const leaveFn = () => { cursor?.classList.remove("hover"); ring?.classList.remove("hover"); };
    hoverEls.forEach(el => { el.addEventListener("mouseenter", enterFn); el.addEventListener("mouseleave", leaveFn); });

    // ── Nav scroll ──
    const onScroll = () => {
      document.getElementById("nav")?.classList.toggle("scrolled", window.scrollY > 80);
      if (heroBgRef.current) heroBgRef.current.style.transform = `translate(-50%,-50%) translateY(${window.scrollY * -0.15}px)`;
    };
    window.addEventListener("scroll", onScroll);

    // ── Word reveal ──
    document.querySelectorAll(".word-reveal").forEach(container => {
      function processNode(node: ChildNode): string {
        if (node.nodeType === 3) {
          return (node.textContent || "").replace(/(\S+)/g, '<span class="word">$1</span>');
        } else if (node.nodeType === 1) {
          const el = node as HTMLElement;
          const tag = el.tagName.toLowerCase();
          const inner = Array.from(el.childNodes).map(processNode).join("");
          return "<" + tag + ">" + inner + "</" + tag + ">";
        }
        return "";
      }
      container.innerHTML = Array.from(container.childNodes).map(processNode).join("");
    });
    const wordObs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.querySelectorAll(".word").forEach((w, i) => setTimeout(() => w.classList.add("visible"), i * 60));
          wordObs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });
    document.querySelectorAll(".word-reveal").forEach(el => wordObs.observe(el));

    // ── Section reveals ──
    const revealObs = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add("visible"); });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    document.querySelectorAll(".move-section, .tl-panel").forEach(el => revealObs.observe(el));
    document.querySelectorAll(".tl-panel").forEach((p, i) => { (p as HTMLElement).style.transitionDelay = `${i * 0.12}s`; });

    // ── Smooth anchor scroll ──
    const anchors = document.querySelectorAll('a[href^="#"]');
    const anchorFn = function (this: HTMLAnchorElement, e: Event) {
      e.preventDefault();
      const t = document.querySelector(this.getAttribute("href")!);
      if (t) { const y = t.getBoundingClientRect().top + window.scrollY - 80; window.scrollTo({ top: y, behavior: "smooth" }); }
    };
    anchors.forEach(a => a.addEventListener("click", anchorFn as EventListener));

    return () => {
      clearTimeout(loaderTimer);
      cancelAnimationFrame(ringRaf);
      document.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("scroll", onScroll);
      hoverEls.forEach(el => { el.removeEventListener("mouseenter", enterFn); el.removeEventListener("mouseleave", leaveFn); });
      wordObs.disconnect();
      revealObs.disconnect();
      anchors.forEach(a => a.removeEventListener("click", anchorFn as EventListener));
    };
  }, []);

  return (
    <>
      <style>{`
*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
:root {
  --bg: #F4F1EB; --bg-warm: #EBE7DF; --bg-dark: #141311; --surface: #FFFFFF;
  --text: #1A1A17; --text-inv: #F4F1EB; --text-mid: #5C5A54; --text-light: #9E9B93;
  --accent: #C04B2D; --accent-light: #D4725A; --rule: #D6D1C8;
  --serif: 'Cormorant Garamond', Georgia, serif;
  --sans: 'Instrument Sans', -apple-system, sans-serif;
}
html { background: var(--bg); overflow-x: hidden; }
body { font-family: var(--sans); color: var(--text); background: var(--bg); -webkit-font-smoothing: antialiased; cursor: none; }
::selection { background: var(--accent); color: white; }
.cursor { position: fixed; width: 12px; height: 12px; border-radius: 50%; background: var(--accent); pointer-events: none; z-index: 9999; mix-blend-mode: difference; transition: transform 0.15s ease, width 0.3s, height 0.3s; transform: translate(-50%, -50%); }
.cursor.hover { width: 48px; height: 48px; background: var(--accent-light); mix-blend-mode: normal; opacity: 0.4; }
.cursor-ring { position: fixed; width: 40px; height: 40px; border-radius: 50%; border: 1px solid var(--accent); pointer-events: none; z-index: 9998; opacity: 0.3; transition: transform 0.08s ease, width 0.3s, height 0.3s, opacity 0.3s; transform: translate(-50%, -50%); }
.cursor-ring.hover { width: 64px; height: 64px; opacity: 0.15; }
body::after { content: ''; position: fixed; inset: 0; z-index: 9990; pointer-events: none; opacity: 0.03; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"); background-repeat: repeat; background-size: 180px; }
.loader { position: fixed; inset: 0; background: var(--bg); z-index: 10000; display: flex; align-items: center; justify-content: center; flex-direction: column; transition: opacity 0.8s ease, visibility 0.8s; }
.loader.done { opacity: 0; visibility: hidden; pointer-events: none; }
.loader-text { font-family: var(--serif); font-size: 24px; font-weight: 400; font-style: italic; overflow: hidden; }
.loader-text span { display: inline-block; transform: translateY(100%); animation: loaderReveal 0.6s 0.2s forwards; }
@keyframes loaderReveal { to { transform: translateY(0); } }
.loader-bar { width: 120px; height: 1px; background: var(--rule); margin-top: 24px; position: relative; overflow: hidden; }
.loader-bar::after { content: ''; position: absolute; left: 0; top: 0; height: 100%; width: 0%; background: var(--accent); animation: loaderFill 1.8s 0.4s cubic-bezier(0.65,0,0.35,1) forwards; }
@keyframes loaderFill { to { width: 100%; } }
nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; padding: 28px 56px; display: flex; align-items: center; justify-content: space-between; background: transparent; transition: all 0.5s ease; }
nav.scrolled { padding: 16px 56px; background: rgba(244,241,235,0.92); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-bottom: 1px solid var(--rule); }
.nav-logo { font-family: var(--serif); font-size: 22px; font-weight: 500; letter-spacing: -0.3px; }
.nav-right { display: flex; align-items: center; gap: 40px; }
.nav-links { display: flex; gap: 32px; }
.nav-links a { color: var(--text-mid); text-decoration: none; font-size: 12px; font-weight: 600; letter-spacing: 1.2px; text-transform: uppercase; transition: color 0.3s; position: relative; }
.nav-links a::after { content: ''; position: absolute; bottom: -4px; left: 0; width: 0%; height: 1px; background: var(--accent); transition: width 0.4s cubic-bezier(0.65,0,0.35,1); }
.nav-links a:hover { color: var(--text); }
.nav-links a:hover::after { width: 100%; }
.nav-cta { padding: 12px 32px; background: var(--text); color: var(--bg); border-radius: 100px; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; text-decoration: none; transition: all 0.4s cubic-bezier(0.16,1,0.3,1); display: inline-block; }
.nav-cta:hover { background: var(--accent); color: white; transform: scale(1.05); }
.btn-primary { padding: 18px 48px; background: var(--text); color: var(--bg); border: none; border-radius: 100px; font-family: var(--sans); font-size: 12px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; cursor: none; transition: all 0.4s cubic-bezier(0.16,1,0.3,1); position: relative; overflow: hidden; }
.btn-primary::after { content: ''; position: absolute; inset: 0; background: var(--accent); transform: translateY(101%); transition: transform 0.4s cubic-bezier(0.16,1,0.3,1); }
.btn-primary span { position: relative; z-index: 1; }
.btn-primary:hover { color: white; transform: translateY(-2px); }
.btn-primary:hover::after { transform: translateY(0); }
.btn-ghost { padding: 18px 48px; background: transparent; color: var(--text-mid); border: 1px solid var(--rule); border-radius: 100px; font-family: var(--sans); font-size: 12px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; cursor: none; transition: all 0.3s; text-decoration: none; display: inline-block; }
.btn-ghost:hover { color: var(--text); border-color: var(--text); }
@keyframes fadeUp { to { opacity: 1; transform: translateY(0); } }
.hero { min-height: 100vh; display: grid; grid-template-columns: 1fr 1fr; align-items: center; padding: 140px 56px 100px; position: relative; overflow: hidden; gap: 60px; }
.hero-bg-text { position: absolute; font-family: var(--serif); font-size: clamp(140px,18vw,260px); font-weight: 300; color: transparent; -webkit-text-stroke: 1px var(--rule); white-space: nowrap; top: 50%; left: 50%; transform: translate(-50%, -50%); pointer-events: none; opacity: 0.3; user-select: none; letter-spacing: -6px; }
.hero-left { position: relative; z-index: 2; }
.hero-eyebrow { font-size: 11px; font-weight: 700; letter-spacing: 4px; text-transform: uppercase; color: var(--accent); margin-bottom: 40px; }
.hero-eyebrow .line { display: inline-block; width: 32px; height: 1px; background: var(--accent); vertical-align: middle; margin: 0 12px; }
.hero h1 { font-family: var(--serif); font-size: clamp(48px,6vw,96px); font-weight: 300; line-height: 0.98; letter-spacing: -2px; margin-bottom: 36px; }
.hero h1 em { font-style: italic; font-weight: 400; color: var(--accent); }
.split-line { display: block; overflow: hidden; }
.split-line-inner { display: block; transform: translateY(110%); animation: splitReveal 1s cubic-bezier(0.16,1,0.3,1) forwards; }
.split-line:nth-child(2) .split-line-inner { animation-delay: 0.12s; }
@keyframes splitReveal { to { transform: translateY(0); } }
.hero-sub { font-size: 17px; color: var(--text-mid); max-width: 420px; line-height: 1.7; margin-bottom: 44px; opacity: 0; transform: translateY(16px); animation: fadeUp 1s 0.5s forwards; }
.hero-actions { display: flex; gap: 16px; opacity: 0; transform: translateY(20px); animation: fadeUp 1s 0.7s forwards; }
.hero-right { position: relative; z-index: 2; opacity: 0; animation: fadeUp 1.2s 0.4s forwards; transform: translateY(30px); }
.hero-illo { width: 100%; aspect-ratio: 4/3; background: var(--surface); border: 1px solid var(--rule); border-radius: 24px; position: relative; overflow: hidden; padding: 0; }
.hero-illo svg, .hero-illo img { width: 100%; height: 100%; object-fit: cover; }
.marquee-band { padding: 24px 0; border-top: 1px solid var(--rule); border-bottom: 1px solid var(--rule); overflow: hidden; white-space: nowrap; }
.marquee-track { display: inline-flex; animation: marquee 90s linear infinite; }
.marquee-track span { font-family: var(--serif); font-size: 16px; font-weight: 400; font-style: italic; color: var(--text-light); padding: 0 32px; }
.marquee-track span::before { content: '\\2726'; margin-right: 32px; color: var(--accent); font-style: normal; font-size: 10px; vertical-align: middle; }
@keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
.manifesto { padding: 180px 48px; position: relative; }
.manifesto-inner { max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: 1fr 1fr; gap: 80px; align-items: center; }
.manifesto h2 { font-family: var(--serif); font-size: clamp(30px,4vw,52px); font-weight: 300; line-height: 1.2; letter-spacing: -1px; }
.manifesto h2 em { font-style: italic; color: var(--accent); font-weight: 400; }
.word-reveal { display: inline; }
.word-reveal .word { display: inline-block; opacity: 0.1; transition: opacity 0.5s ease, transform 0.5s ease; transform: translateY(4px); }
.word-reveal .word.visible { opacity: 1; transform: translateY(0); }
.manifesto-illo { width: 100%; aspect-ratio: 4/3; background: var(--surface); border: 1px solid var(--rule); border-radius: 20px; overflow: hidden; }
.manifesto-illo svg, .manifesto-illo img { width: 100%; height: 100%; object-fit: cover; }
.three-moves { padding: 160px 48px; }
.three-moves-header { text-align: center; margin-bottom: 80px; }
.three-moves-header h2 { font-family: var(--serif); font-size: clamp(36px,5vw,60px); font-weight: 300; letter-spacing: -1px; }
.three-moves-header h2 em { font-style: italic; color: var(--accent); }
.move-section { max-width: 1200px; margin: 0 auto 100px; display: grid; grid-template-columns: 1fr 1fr; gap: 80px; align-items: center; opacity: 0; transform: translateY(50px); transition: all 0.9s cubic-bezier(0.16,1,0.3,1); }
.move-section.visible { opacity: 1; transform: translateY(0); }
.move-section.reverse { direction: rtl; }
.move-section.reverse > * { direction: ltr; }
.move-section:last-child { margin-bottom: 0; }
.move-num { font-family: var(--serif); font-size: 72px; font-weight: 300; color: var(--rule); line-height: 1; margin-bottom: 16px; }
.move-label { font-size: 11px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; color: var(--accent); margin-bottom: 16px; }
.move-text h3 { font-family: var(--serif); font-size: clamp(28px,3vw,44px); font-weight: 400; line-height: 1.15; letter-spacing: -0.5px; margin-bottom: 20px; }
.move-text h3 em { font-style: italic; }
.move-text p { font-size: 16px; color: var(--text-mid); line-height: 1.75; max-width: 440px; }
.move-visual { background: var(--surface); border: 1px solid var(--rule); border-radius: 20px; overflow: hidden; aspect-ratio: 4/3; position: relative; }
.move-visual svg { width: 100%; height: 100%; }
.modules-pitch { background: var(--bg-dark); color: var(--text-inv); padding: 200px 48px; position: relative; overflow: hidden; }
.modules-pitch::before { content: '20+'; position: absolute; font-family: var(--serif); font-size: clamp(200px,30vw,500px); font-weight: 300; color: transparent; -webkit-text-stroke: 1px rgba(255,255,255,0.03); top: 50%; left: 50%; transform: translate(-50%,-50%); pointer-events: none; letter-spacing: -10px; }
.modules-inner { max-width: 1200px; margin: 0 auto; position: relative; z-index: 2; }
.modules-header { margin-bottom: 100px; display: grid; grid-template-columns: 1fr 1fr; gap: 60px; align-items: end; }
.modules-header h2 { font-family: var(--serif); font-size: clamp(40px,5vw,64px); font-weight: 300; line-height: 1.08; letter-spacing: -2px; }
.modules-header h2 em { font-style: italic; color: var(--accent-light); }
.modules-header h2 .big-num { font-size: 1.3em; color: var(--accent-light); }
.modules-header p { font-size: 16px; color: rgba(244,241,235,0.4); line-height: 1.8; }
.modules-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: rgba(255,255,255,0.06); }
.mod-card { padding: 56px 40px; background: var(--bg-dark); transition: all 0.5s ease; position: relative; overflow: hidden; }
.mod-card::after { content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 2px; background: var(--accent); transform: scaleX(0); transform-origin: left; transition: transform 0.6s cubic-bezier(0.16,1,0.3,1); }
.mod-card:hover { background: rgba(255,255,255,0.02); }
.mod-card:hover::after { transform: scaleX(1); }
.mod-card-num { font-family: var(--serif); font-size: 14px; color: var(--accent-light); margin-bottom: 24px; font-style: italic; }
.mod-card h3 { font-family: var(--serif); font-size: 26px; font-weight: 400; margin-bottom: 14px; letter-spacing: -0.3px; }
.mod-card p { font-size: 14px; line-height: 1.7; color: rgba(244,241,235,0.35); }
.timeline-section { padding: 200px 48px; }
.timeline-header { text-align: center; margin-bottom: 80px; }
.timeline-header h2 { font-family: var(--serif); font-size: clamp(32px,4.5vw,56px); font-weight: 300; letter-spacing: -1px; margin-bottom: 16px; }
.timeline-header h2 em { font-style: italic; color: var(--accent); }
.timeline-header p { font-size: 16px; color: var(--text-mid); max-width: 500px; margin: 0 auto; line-height: 1.7; }
.timeline-track { max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: repeat(6, 1fr); gap: 0; position: relative; }
.timeline-track::before { content: ''; position: absolute; top: 220px; left: 0; right: 0; height: 2px; background: var(--rule); }
.tl-panel { padding: 0 16px; text-align: center; position: relative; opacity: 0; transform: translateY(40px); transition: all 0.8s cubic-bezier(0.16,1,0.3,1); }
.tl-panel.visible { opacity: 1; transform: translateY(0); }
.tl-illo { width: 100%; aspect-ratio: 3/4; background: var(--surface); border: 1px solid var(--rule); border-radius: 16px; margin-bottom: 24px; overflow: hidden; position: relative; }
.tl-illo svg { width: 100%; height: 100%; }
.tl-dot { width: 12px; height: 12px; border-radius: 50%; background: var(--bg); border: 2px solid var(--accent); margin: 0 auto 16px; position: relative; z-index: 2; }
.tl-panel:last-child .tl-dot { background: var(--accent); box-shadow: 0 0 0 4px rgba(192,75,45,0.2); }
.tl-year { font-family: var(--serif); font-size: 18px; font-weight: 600; color: var(--accent); margin-bottom: 8px; }
.tl-title { font-family: var(--serif); font-size: 16px; font-weight: 500; margin-bottom: 6px; letter-spacing: -0.3px; }
.tl-desc { font-size: 12px; color: var(--text-mid); line-height: 1.6; }
.pull-quote { padding: 180px 48px; text-align: center; }
.pull-quote .big-quote { font-family: var(--serif); font-size: 140px; color: var(--rule); line-height: 0.5; margin-bottom: 36px; user-select: none; }
.pull-quote blockquote { font-family: var(--serif); font-size: clamp(28px,4vw,52px); font-weight: 300; font-style: italic; line-height: 1.25; letter-spacing: -0.5px; max-width: 780px; margin: 0 auto 36px; }
.pull-quote cite { font-family: var(--sans); font-size: 12px; font-style: normal; font-weight: 600; letter-spacing: 3px; text-transform: uppercase; color: var(--text-light); }
.cta-section { padding: 120px 48px 200px; text-align: center; }
.cta-section h2 { font-family: var(--serif); font-size: clamp(42px,6vw,88px); font-weight: 300; line-height: 1.0; letter-spacing: -2px; margin-bottom: 28px; }
.cta-section h2 em { font-style: italic; color: var(--accent); font-weight: 400; }
.cta-section p { font-size: 16px; color: var(--text-mid); max-width: 400px; margin: 0 auto 56px; line-height: 1.7; }
.cta-actions { display: flex; gap: 20px; justify-content: center; }
footer { padding: 48px 56px; border-top: 1px solid var(--rule); display: flex; justify-content: space-between; align-items: center; }
.footer-left { font-family: var(--serif); font-size: 18px; font-weight: 400; }
.footer-center { display: flex; gap: 32px; }
.footer-center a { font-size: 11px; color: var(--text-light); text-decoration: none; letter-spacing: 1.2px; text-transform: uppercase; font-weight: 600; transition: color 0.3s; }
.footer-center a:hover { color: var(--text); }
.footer-right { font-size: 12px; color: var(--text-light); }
@media (max-width: 1000px) {
  .hero { grid-template-columns: 1fr; text-align: center; padding: 140px 24px 80px; }
  .hero-sub { margin-left: auto; margin-right: auto; }
  .hero-actions { justify-content: center; }
  .hero-right { max-width: 400px; margin: 0 auto; }
  .manifesto-inner { grid-template-columns: 1fr; }
  .move-section { grid-template-columns: 1fr; gap: 40px; }
  .move-section.reverse { direction: ltr; }
  .modules-header { grid-template-columns: 1fr; }
  .modules-grid { grid-template-columns: 1fr; }
  .timeline-track { grid-template-columns: repeat(3, 1fr); gap: 24px; }
  .timeline-track::before { display: none; }
}
/* ── Hamburger + Mobile Nav Drawer ── */
.hamburger { display: none; width: 48px; height: 48px; border: none; background: none; cursor: pointer; position: relative; z-index: 102; flex-shrink: 0; }
.hamburger span { display: block; width: 22px; height: 2px; background: var(--text); margin: 0 auto; transition: all 0.3s cubic-bezier(0.16,1,0.3,1); border-radius: 1px; }
.hamburger span:nth-child(1) { margin-bottom: 6px; }
.hamburger span:nth-child(3) { margin-top: 6px; }
.hamburger.open span:nth-child(1) { transform: translateY(8px) rotate(45deg); }
.hamburger.open span:nth-child(2) { opacity: 0; transform: scaleX(0); }
.hamburger.open span:nth-child(3) { transform: translateY(-8px) rotate(-45deg); }
.mobile-nav { position: fixed; inset: 0; z-index: 101; background: var(--bg); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 32px; opacity: 0; visibility: hidden; transition: all 0.4s cubic-bezier(0.16,1,0.3,1); }
.mobile-nav.open { opacity: 1; visibility: visible; }
.mobile-nav a { font-family: var(--serif); font-size: 32px; font-weight: 400; color: var(--text); text-decoration: none; transition: color 0.3s; letter-spacing: -0.5px; }
.mobile-nav a:hover { color: var(--accent); }
.mobile-nav .nav-cta { font-family: var(--sans); font-size: 12px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; margin-top: 16px; }
@media (max-width: 900px) {
  body { cursor: auto; }
  .cursor, .cursor-ring { display: none; }
  nav { padding: 20px 24px; }
  nav.scrolled { padding: 14px 24px; }
  .nav-links { display: none; }
  .nav-cta.desktop-only { display: none; }
  .hamburger { display: flex; flex-direction: column; align-items: center; justify-content: center; }
}
@media (max-width: 600px) {
  .hero-actions, .cta-actions { flex-direction: column; width: 100%; align-items: center; }
  .btn-primary, .btn-ghost { width: 100%; text-align: center; }
  .timeline-track { grid-template-columns: repeat(2, 1fr); }
  footer { flex-direction: column; align-items: center; gap: 20px; text-align: center; padding: 32px 24px; }
  .footer-center { flex-wrap: wrap; justify-content: center; gap: 16px; }
}
@keyframes floatPaper { 0%,100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-8px) rotate(3deg); } }
@keyframes pulseRing { 0% { r: 8; opacity: 0.5; } 100% { r: 20; opacity: 0; } }
@keyframes barGrow { from { transform: scaleY(0); } to { transform: scaleY(1); } }
@keyframes nodeFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
@keyframes dashMove { to { stroke-dashoffset: -20; } }
      `}</style>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500;1,600&family=Instrument+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* Loader */}
      <div className="loader" id="loader">
        <div className="loader-text"><span>HR Digital Playground</span></div>
        <div className="loader-bar" />
      </div>

      {/* Cursor */}
      <div className="cursor" ref={cursorRef} />
      <div className="cursor-ring" ref={ringRef} />

      {/* Nav */}
      <nav id="nav">
        <div className="nav-logo">HR Digital Playground</div>
        <div className="nav-right">
          <div className="nav-links">
            <a href="#why-now">Why Now</a>
            <a href="#platform">The Platform</a>
            <a href="#modules">What&apos;s Inside</a>
            <a href="#story">Our Story</a>
          </div>
          <Link href="/app" className="nav-cta desktop-only">Get In</Link>
          <button className={`hamburger${menuOpen ? " open" : ""}`} onClick={() => setMenuOpen(o => !o)} aria-label="Menu">
            <span /><span /><span />
          </button>
        </div>
      </nav>

      {/* Mobile Nav Drawer */}
      <div className={`mobile-nav${menuOpen ? " open" : ""}`}>
        <a href="#why-now" onClick={() => setMenuOpen(false)}>Why Now</a>
        <a href="#platform" onClick={() => setMenuOpen(false)}>The Platform</a>
        <a href="#modules" onClick={() => setMenuOpen(false)}>What&apos;s Inside</a>
        <a href="#story" onClick={() => setMenuOpen(false)}>Our Story</a>
        <Link href="/app" className="nav-cta" onClick={() => setMenuOpen(false)}>Get In</Link>
      </div>

      {/* ═══ HERO ═══ */}
      <section className="hero">
        <div className="hero-bg-text" ref={heroBgRef}>PLAYGROUND</div>
        <div className="hero-left">
          <div className="hero-eyebrow"><span className="line" /> AI &times; Workforce Transformation <span className="line" /></div>
          <h1>
            <span className="split-line"><span className="split-line-inner">Your org chart</span></span>
            <span className="split-line"><span className="split-line-inner">is already <em>obsolete.</em></span></span>
          </h1>
          <p className="hero-sub">The platform that tells you exactly what to do about it — from task-level automation to boardroom-ready decisions.</p>
          <div className="hero-actions">
            <Link href="/app" className="btn-primary" data-hover><span>See What&apos;s Possible</span></Link>
            <a href="#story" className="btn-ghost" data-hover>The 90s Story</a>
          </div>
        </div>
        <div className="hero-right">
          <div className="hero-illo">
              <img src="/web1.png" alt="Transformation team scrambling" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "24px" }} />
            </div>
        </div>
      </section>

      {/* Marquee */}
      <div className="marquee-band">
        <div className="marquee-track">
          <span>Work Design</span><span>Org Architecture</span><span>Skills Intelligence</span><span>AI Readiness</span><span>Role Reconstruction</span><span>Financial Modeling</span><span>Change Management</span><span>Talent Strategy</span>
          <span>Work Design</span><span>Org Architecture</span><span>Skills Intelligence</span><span>AI Readiness</span><span>Role Reconstruction</span><span>Financial Modeling</span><span>Change Management</span><span>Talent Strategy</span>
        </div>
      </div>

      {/* ═══ MANIFESTO ═══ */}
      <section className="manifesto" id="why-now">
        <div className="manifesto-inner">
          <div>
            <h2 className="word-reveal">Every company has an AI strategy. Almost none of them know what happens to their <em>people</em> on Monday morning.</h2>
          </div>
          <div className="manifesto-illo">
              <img src="/web2.png" alt="AI strategy meeting chaos" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "20px" }} />
            </div>
        </div>
      </section>

      {/* ═══ THREE MOVES ═══ */}
      <section className="three-moves" id="platform">
        <div className="three-moves-header">
          <h2>Three moves. One <em>transformation.</em></h2>
        </div>

        {/* Diagnose */}
        <div className="move-section">
          <div className="move-text">
            <div className="move-num">01</div>
            <div className="move-label">Diagnose</div>
            <h3>Find out what AI <em>actually</em> changes.</h3>
            <p>Every role breaks into tasks. We map which ones AI touches, how much time shifts, and where the real exposure lives — with structured intelligence your leadership can act on.</p>
          </div>
          <div className="move-visual">
            <svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
              <rect width="400" height="300" fill="#FAFAF7"/>
              <rect x="140" y="30" width="120" height="30" rx="6" fill="white" stroke="#D6D1C8"/>
              <text x="165" y="49" fontFamily="'Instrument Sans',sans-serif" fontSize="8" fill="#1A1A17" fontWeight="600">WORKFORCE</text>
              <line x1="200" y1="60" x2="140" y2="80" stroke="#D6D1C8"/><line x1="200" y1="60" x2="260" y2="80" stroke="#D6D1C8"/>
              <rect x="100" y="80" width="80" height="24" rx="4" fill="white" stroke="#D6D1C8"/><text x="115" y="96" fontSize="7" fill="#5C5A54">Finance Ops</text>
              <rect x="220" y="80" width="80" height="24" rx="4" fill="white" stroke="#D6D1C8"/><text x="230" y="96" fontSize="7" fill="#5C5A54">People Team</text>
              <line x1="140" y1="104" x2="110" y2="120" stroke="#D6D1C8"/><line x1="140" y1="104" x2="170" y2="120" stroke="#D6D1C8"/>
              <line x1="260" y1="104" x2="230" y2="120" stroke="#D6D1C8"/><line x1="260" y1="104" x2="290" y2="120" stroke="#D6D1C8"/>
              <rect x="90" y="120" width="40" height="18" rx="3" fill="#C04B2D" opacity="0.15" stroke="#C04B2D" strokeWidth="0.5"/><text x="96" y="132" fontSize="6" fill="#C04B2D">38% AI</text>
              <rect x="150" y="120" width="40" height="18" rx="3" fill="#C04B2D" opacity="0.4" stroke="#C04B2D" strokeWidth="0.5"/><text x="156" y="132" fontSize="6" fill="#C04B2D">67% AI</text>
              <rect x="210" y="120" width="40" height="18" rx="3" fill="#C04B2D" opacity="0.25" stroke="#C04B2D" strokeWidth="0.5"/><text x="216" y="132" fontSize="6" fill="#C04B2D">45% AI</text>
              <rect x="270" y="120" width="40" height="18" rx="3" fill="#C04B2D" opacity="0.1" stroke="#C04B2D" strokeWidth="0.5"/><text x="276" y="132" fontSize="6" fill="#C04B2D">12% AI</text>
              <rect x="40" y="160" width="320" height="120" rx="10" fill="white" stroke="#D6D1C8"/>
              <text x="56" y="182" fontFamily="'Instrument Sans',sans-serif" fontSize="8" fill="#9E9B93" fontWeight="600" letterSpacing="1.5">TASK DECOMPOSITION</text>
              <g transform="translate(56, 195)"><text x="0" y="10" fontSize="7" fill="#5C5A54">Data Entry</text><rect x="80" y="2" width="200" height="12" rx="2" fill="#EBE7DF"/><rect x="80" y="2" width="170" height="12" rx="2" fill="#C04B2D" opacity="0.7" style={{ animation: "barGrow 1.5s ease-out forwards", transformOrigin: "left" }}/><text x="258" y="11" fontSize="6" fill="#C04B2D" fontWeight="600">85%</text></g>
              <g transform="translate(56, 218)"><text x="0" y="10" fontSize="7" fill="#5C5A54">Reporting</text><rect x="80" y="2" width="200" height="12" rx="2" fill="#EBE7DF"/><rect x="80" y="2" width="140" height="12" rx="2" fill="#C04B2D" opacity="0.5" style={{ animation: "barGrow 1.8s ease-out forwards", transformOrigin: "left" }}/><text x="228" y="11" fontSize="6" fill="#C04B2D" fontWeight="600">70%</text></g>
              <g transform="translate(56, 241)"><text x="0" y="10" fontSize="7" fill="#5C5A54">Judgment</text><rect x="80" y="2" width="200" height="12" rx="2" fill="#EBE7DF"/><rect x="80" y="2" width="30" height="12" rx="2" fill="#4A6FA5" opacity="0.5" style={{ animation: "barGrow 2s ease-out forwards", transformOrigin: "left" }}/><text x="118" y="11" fontSize="6" fill="#4A6FA5" fontWeight="600">15%</text></g>
            </svg>
          </div>
        </div>

        {/* Design */}
        <div className="move-section reverse">
          <div className="move-text">
            <div className="move-num">02</div>
            <div className="move-label">Redesign</div>
            <h3>Redesign roles for a world that <em>moved.</em></h3>
            <p>Don&apos;t just cut headcount. Reconstruct jobs — bundling augmented tasks, redeploying human effort, and creating roles that didn&apos;t exist six months ago.</p>
          </div>
          <div className="move-visual">
            <svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
              <rect width="400" height="300" fill="#FAFAF7"/>
              <line x1="200" y1="20" x2="200" y2="280" stroke="#D6D1C8" strokeWidth="1" strokeDasharray="4,4"/>
              <text x="60" y="38" fontFamily="'Instrument Sans',sans-serif" fontSize="9" fill="#9E9B93" fontWeight="600" letterSpacing="2">BEFORE</text>
              <text x="260" y="38" fontFamily="'Instrument Sans',sans-serif" fontSize="9" fill="#C04B2D" fontWeight="600" letterSpacing="2">AFTER</text>
              <rect x="30" y="55" width="150" height="28" rx="5" fill="#EBE7DF" stroke="#D6D1C8"/><text x="45" y="73" fontSize="8" fill="#5C5A54">Data Entry Clerk</text>
              <rect x="30" y="90" width="150" height="28" rx="5" fill="#EBE7DF" stroke="#D6D1C8"/><text x="45" y="108" fontSize="8" fill="#5C5A54">Reporting Analyst</text>
              <rect x="30" y="125" width="150" height="28" rx="5" fill="#EBE7DF" stroke="#D6D1C8"/><text x="45" y="143" fontSize="8" fill="#5C5A54">HR Coordinator</text>
              <rect x="30" y="160" width="150" height="28" rx="5" fill="#EBE7DF" stroke="#D6D1C8"/><text x="45" y="178" fontSize="8" fill="#5C5A54">Benefits Admin</text>
              <line x1="155" y1="60" x2="172" y2="78" stroke="#C04B2D" strokeWidth="2" opacity="0.4"/><line x1="172" y1="60" x2="155" y2="78" stroke="#C04B2D" strokeWidth="2" opacity="0.4"/>
              <path d="M185 100 Q200 100 215 80" fill="none" stroke="#C04B2D" strokeWidth="1.5" strokeDasharray="4,2" style={{ animation: "dashMove 1s linear infinite" }}/>
              <path d="M185 130 Q200 130 215 130" fill="none" stroke="#C04B2D" strokeWidth="1.5" strokeDasharray="4,2" style={{ animation: "dashMove 1s linear infinite" }}/>
              <path d="M185 165 Q200 165 215 190" fill="none" stroke="#C04B2D" strokeWidth="1.5" strokeDasharray="4,2" style={{ animation: "dashMove 1s linear infinite" }}/>
              <rect x="220" y="55" width="155" height="34" rx="6" fill="white" stroke="#C04B2D" strokeWidth="1.5"/><text x="235" y="70" fontSize="8" fill="#C04B2D" fontWeight="600">AI Operations Lead</text><text x="235" y="82" fontSize="6" fill="#9E9B93">New role — didn&apos;t exist</text>
              <rect x="220" y="100" width="155" height="34" rx="6" fill="white" stroke="#1A1A17" strokeWidth="1"/><text x="235" y="115" fontSize="8" fill="#1A1A17" fontWeight="600">Insights Strategist</text><text x="235" y="127" fontSize="6" fill="#9E9B93">Redesigned from analyst</text>
              <rect x="220" y="145" width="155" height="34" rx="6" fill="white" stroke="#1A1A17" strokeWidth="1"/><text x="235" y="160" fontSize="8" fill="#1A1A17" fontWeight="600">People Experience Mgr</text><text x="235" y="172" fontSize="6" fill="#9E9B93">Augmented + expanded</text>
              <rect x="220" y="190" width="155" height="34" rx="6" fill="white" stroke="#4A6FA5" strokeWidth="1"/><text x="235" y="205" fontSize="8" fill="#4A6FA5" fontWeight="600">Workforce Architect</text><text x="235" y="217" fontSize="6" fill="#9E9B93">Net-new strategic role</text>
              <rect x="30" y="245" width="340" height="35" rx="6" fill="#1A1A17"/><text x="55" y="265" fontFamily="'Cormorant Garamond',serif" fontSize="14" fill="#F4F1EB" fontWeight="400" fontStyle="italic">4 old roles &rarr; 4 redesigned roles. 0 people lost.</text>
            </svg>
          </div>
        </div>

        {/* Simulate */}
        <div className="move-section">
          <div className="move-text">
            <div className="move-num">03</div>
            <div className="move-label">Simulate</div>
            <h3>Model the future <em>before</em> you bet on it.</h3>
            <p>Run multi-scenario simulations across headcount, cost, readiness, and ROI. Compare paths with projections your CFO trusts and your CHRO can defend.</p>
          </div>
          <div className="move-visual">
            <svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
              <rect width="400" height="300" fill="#FAFAF7"/>
              <text x="40" y="32" fontFamily="'Instrument Sans',sans-serif" fontSize="9" fill="#9E9B93" fontWeight="600" letterSpacing="1.5">SCENARIO ENGINE</text>
              <rect x="40" y="42" width="80" height="24" rx="4" fill="#C04B2D"/><text x="52" y="58" fontSize="7" fill="white" fontWeight="600">Conservative</text>
              <rect x="124" y="42" width="70" height="24" rx="4" fill="#EBE7DF" stroke="#D6D1C8"/><text x="138" y="58" fontSize="7" fill="#5C5A54" fontWeight="600">Moderate</text>
              <rect x="198" y="42" width="72" height="24" rx="4" fill="#EBE7DF" stroke="#D6D1C8"/><text x="210" y="58" fontSize="7" fill="#5C5A54" fontWeight="600">Aggressive</text>
              <rect x="40" y="80" width="320" height="160" rx="8" fill="white" stroke="#D6D1C8"/>
              <line x1="60" y1="100" x2="340" y2="100" stroke="#EBE7DF"/><line x1="60" y1="130" x2="340" y2="130" stroke="#EBE7DF"/><line x1="60" y1="160" x2="340" y2="160" stroke="#EBE7DF"/><line x1="60" y1="190" x2="340" y2="190" stroke="#EBE7DF"/>
              <text x="48" y="103" fontSize="6" fill="#9E9B93">$8M</text><text x="48" y="133" fontSize="6" fill="#9E9B93">$6M</text><text x="48" y="163" fontSize="6" fill="#9E9B93">$4M</text><text x="48" y="193" fontSize="6" fill="#9E9B93">$2M</text>
              <text x="80" y="228" fontSize="6" fill="#9E9B93">Y1</text><text x="140" y="228" fontSize="6" fill="#9E9B93">Y2</text><text x="200" y="228" fontSize="6" fill="#9E9B93">Y3</text><text x="260" y="228" fontSize="6" fill="#9E9B93">Y4</text><text x="320" y="228" fontSize="6" fill="#9E9B93">Y5</text>
              <path d="M80,210 C120,200 160,180 200,155 C240,130 280,110 330,95" fill="none" stroke="#C04B2D" strokeWidth="2.5"/>
              <path d="M80,210 C120,205 160,195 200,180 C240,165 280,155 330,140" fill="none" stroke="#D6D1C8" strokeWidth="1.5" strokeDasharray="6,3"/>
              <path d="M80,210 C120,208 160,200 200,190 C240,180 280,175 330,168" fill="none" stroke="#9E9B93" strokeWidth="1" strokeDasharray="4,4"/>
              <circle cx="330" cy="95" r="5" fill="#C04B2D"/><rect x="290" y="76" width="48" height="18" rx="4" fill="#C04B2D"/><text x="297" y="88" fontSize="7" fill="white" fontWeight="700">3.2x ROI</text>
              <rect x="40" y="250" width="320" height="40" rx="6" fill="#1A1A17"/>
              <text x="60" y="270" fontSize="7" fill="#9E9B93">Savings</text><text x="60" y="282" fontFamily="'Cormorant Garamond',serif" fontSize="14" fill="#F4F1EB" fontWeight="500">$4.1M</text>
              <text x="160" y="270" fontSize="7" fill="#9E9B93">Roles Impacted</text><text x="160" y="282" fontFamily="'Cormorant Garamond',serif" fontSize="14" fill="#F4F1EB" fontWeight="500">142</text>
              <text x="270" y="270" fontSize="7" fill="#9E9B93">Timeline</text><text x="270" y="282" fontFamily="'Cormorant Garamond',serif" fontSize="14" fill="#D4725A" fontWeight="500">18 months</text>
            </svg>
          </div>
        </div>
      </section>

      {/* ═══ MODULES ═══ */}
      <section className="modules-pitch" id="modules">
        <div className="modules-inner">
          <div className="modules-header">
            <h2><span className="big-num">20+</span> modules.<br />Here are the ones that <em>change everything.</em></h2>
            <p>Every module feeds the next. Task-level automation connects to org-level decisions — no disconnected point solutions, no dead&#8209;end dashboards. This is the full operating system for transformation.</p>
          </div>
          <div className="modules-grid">
            {[
              { num: "i.", title: "Work Design Lab", desc: "Six-stage gated workflow. Job context through deconstruction, reconstruction, redeployment, impact, and org link." },
              { num: "ii.", title: "Org Design Studio", desc: "Ten named views. Span of control, cost models, department drilldowns, multi-scenario comparison — inline editing." },
              { num: "iii.", title: "AI Readiness Scoring", desc: "Upload assessments. Get maturity descriptors, gap analysis with effort estimates, and transition roadmaps." },
              { num: "iv.", title: "Skills Architecture", desc: "Inventory, gap analysis, adjacency mapping, build-buy-borrow-automate decisioning across the entire workforce." },
              { num: "v.", title: "Financial Models", desc: "Year 1 through Year 5 projections. Recurring costs, reskilling investment, scenario-linked sensitivity analysis." },
              { num: "vi.", title: "Change & Mobilization", desc: "Action tracking, risk registers, stakeholder mapping, communication planning. Make transformation actually stick." },
            ].map(m => (
              <div key={m.title} className="mod-card" data-hover>
                <div className="mod-card-num">{m.num}</div>
                <h3>{m.title}</h3>
                <p>{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ TIMELINE ═══ */}
      <section className="timeline-section" id="story">
        <div className="timeline-header">
          <h2>Transformation has <em>always</em> been the job.</h2>
          <p>The tools change. The problems are the same. Every generation of professionals has faced the question: how do we redesign work?</p>
        </div>
        <div className="timeline-track">
          {[
            { year: "1920s", title: "Scientific Management", desc: "Time studies, assembly lines, the birth of \"efficiency.\"", label: "EFFICIENCY" },
            { year: "1960s", title: "Org Design Era", desc: "Hierarchies, spans of control, the rise of HR departments.", label: "STRUCTURE" },
            { year: "1990s", title: "Business Reengineering", desc: "Process redesign, ERP systems, the consulting boom.", label: "PROCESS" },
            { year: "2010s", title: "Digital Transformation", desc: "Cloud, agile, design thinking, people analytics.", label: "DIGITAL" },
            { year: "2024", title: "AI Workforce Transformation", desc: "Task-level automation, role redesign, skills architecture.", label: "AI + PEOPLE" },
            { year: "20??", title: "The AGI Question", desc: "When machines think, what does \"work\" even mean?", label: "AGI ERA", dark: true },
          ].map((t, i) => (
            <div key={t.year} className="tl-panel">
              <div className="tl-illo" style={t.dark ? { background: "var(--bg-dark)", borderColor: "rgba(192,75,45,0.3)" } : undefined}>
                <svg viewBox="0 0 200 260" xmlns="http://www.w3.org/2000/svg">
                  <rect width="200" height="260" fill={t.dark ? "#141311" : "#FAFAF7"}/>
                  {i === 0 && <><rect x="30" y="100" width="140" height="100" fill="#D6D1C8"/><rect x="50" y="70" width="20" height="30" fill="#D6D1C8"/><rect x="80" y="50" width="15" height="50" fill="#9E9B93"/><circle cx="88" cy="40" r="8" fill="#EBE7DF"/><circle cx="92" cy="28" r="6" fill="#EBE7DF" opacity="0.6"/><circle cx="100" cy="155" r="10" fill="#E8D5C4"/><rect x="90" y="165" width="20" height="30" rx="3" fill="#5C5A54"/><rect x="20" y="200" width="160" height="4" fill="#9E9B93"/></>}
                  {i === 1 && <><rect x="50" y="60" width="100" height="140" fill="white" stroke="#D6D1C8"/>{[72,96,120].map(y => [60,84,108].map(x => <rect key={`${x}-${y}`} x={x} y={y} width="18" height="14" rx="1" fill="#EBE7DF" stroke="#D6D1C8" strokeWidth="0.5"/>))}<circle cx="100" cy="210" r="8" fill="#E8D5C4"/><rect x="92" y="218" width="16" height="22" rx="2" fill="#4A6FA5"/></>}
                  {i === 2 && <><rect x="55" y="80" width="90" height="70" rx="6" fill="#1A1A17"/><rect x="61" y="86" width="78" height="54" rx="3" fill="#2A2A27"/><rect x="85" y="150" width="30" height="8" rx="2" fill="#1A1A17"/><rect x="40" y="175" width="50" height="65" rx="3" fill="#C04B2D" opacity="0.8"/><text x="48" y="198" fontSize="6" fill="white" fontWeight="700">REENGI-</text><text x="48" y="206" fontSize="6" fill="white" fontWeight="700">NEERING</text><circle cx="140" cy="185" r="8" fill="#E8D5C4"/><rect x="132" y="193" width="16" height="22" rx="2" fill="#1A1A17"/></>}
                  {i === 3 && <><ellipse cx="100" cy="70" rx="50" ry="25" fill="#EBE7DF"/><text x="78" y="74" fontSize="8" fill="#5C5A54" fontWeight="600">CLOUD</text><circle cx="60" cy="140" r="14" fill="white" stroke="#C04B2D" strokeWidth="1.5" style={{ animation: "nodeFloat 3s ease-in-out infinite" }}/><text x="53" y="143" fontSize="6" fill="#5C5A54">HCM</text><circle cx="140" cy="130" r="14" fill="white" stroke="#4A6FA5" strokeWidth="1.5" style={{ animation: "nodeFloat 3s ease-in-out infinite 0.5s" }}/><text x="133" y="133" fontSize="6" fill="#5C5A54">ATS</text><circle cx="100" cy="170" r="14" fill="white" stroke="#D4725A" strokeWidth="1.5" style={{ animation: "nodeFloat 3s ease-in-out infinite 1s" }}/><text x="90" y="173" fontSize="6" fill="#5C5A54">L&amp;D</text></>}
                  {i === 4 && <><circle cx="100" cy="90" r="35" fill="none" stroke="#C04B2D" strokeWidth="1.5"/><circle cx="100" cy="70" r="4" fill="#C04B2D"/><circle cx="85" cy="100" r="4" fill="#C04B2D" opacity="0.7"/><circle cx="115" cy="100" r="4" fill="#C04B2D" opacity="0.7"/><line x1="100" y1="74" x2="85" y2="96" stroke="#C04B2D" strokeWidth="0.8" opacity="0.4"/><line x1="100" y1="74" x2="115" y2="96" stroke="#C04B2D" strokeWidth="0.8" opacity="0.4"/><circle cx="65" cy="170" r="8" fill="#E8D5C4"/><rect x="57" y="178" width="16" height="18" rx="2" fill="#4A6FA5"/><circle cx="100" cy="160" r="8" fill="#D4B896"/><rect x="92" y="168" width="16" height="18" rx="2" fill="#7A8B6A"/><circle cx="135" cy="170" r="8" fill="#E8D5C4"/><rect x="127" y="178" width="16" height="18" rx="2" fill="#5C4A6F"/><rect x="40" y="210" width="120" height="24" rx="12" fill="#C04B2D"/><text x="55" y="226" fontSize="7" fill="white" fontWeight="700" letterSpacing="1">HR DIGITAL PG</text></>}
                  {i === 5 && <><circle cx="100" cy="100" r="60" fill="#C04B2D" opacity="0.06"/><circle cx="100" cy="100" r="40" fill="#C04B2D" opacity="0.08"/><path d="M70 100 Q70 70 100 70 Q130 70 130 100 Q130 130 100 130 Q70 130 70 100Z" fill="none" stroke="#C04B2D" strokeWidth="2"/><circle cx="100" cy="100" r="3" fill="#D4725A"/><text x="100" y="185" fontFamily="'Cormorant Garamond',serif" fontSize="14" fill="#D4725A" textAnchor="middle" fontStyle="italic">What comes</text><text x="100" y="202" fontFamily="'Cormorant Garamond',serif" fontSize="14" fill="#D4725A" textAnchor="middle" fontStyle="italic">after jobs?</text></>}
                  <text x="100" y="242" fontFamily="'Instrument Sans',sans-serif" fontSize="7" fill={t.dark ? "#5C5A54" : "#9E9B93"} textAnchor="middle" fontWeight="600" letterSpacing="1">{t.label}</text>
                </svg>
              </div>
              <div className="tl-dot" />
              <div className="tl-year">{t.year}</div>
              <div className="tl-title">{t.title}</div>
              <div className="tl-desc">{t.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Pull Quote */}
      <section className="pull-quote">
        <div className="big-quote">&ldquo;</div>
        <blockquote>The organizations that figure out AI and people in the next three years will define the next thirty.</blockquote>
        <cite>The premise behind everything we build</cite>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <h2>Curious yet?<br /><em>Good.</em></h2>
        <p>We built this because the tools that existed weren&apos;t good enough for the moment we&apos;re in.</p>
        <div className="cta-actions">
          <Link href="/app" className="btn-primary" data-hover><span>Start Here</span></Link>
          <a href="https://www.linkedin.com/in/hiral-merchant-6a0416b1/" target="_blank" rel="noopener noreferrer" className="btn-ghost" data-hover>Book a Conversation</a>
        </div>
      </section>

      {/* Footer */}
      <footer>
        <div className="footer-left">HR Digital Playground</div>
        <div className="footer-center">
          <a href="#why-now">Why Now</a>
          <a href="#modules">What&apos;s Inside</a>
          <a href="https://www.linkedin.com/in/hiral-merchant-6a0416b1/" target="_blank" rel="noopener noreferrer">LinkedIn</a>
        </div>
        <div className="footer-right">&copy; 2026 Hiral Merchant</div>
      </footer>
    </>
  );
}
