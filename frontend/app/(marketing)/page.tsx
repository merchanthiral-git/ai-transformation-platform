"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CACHE_V } from "../../lib/cdn";

export default function LandingPage() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    // ── Loader ──
    const loader = document.getElementById("loader");
    const loaderTimer = setTimeout(() => loader?.classList.add("done"), 2500);

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

    // ── Visibility change — restart CSS animations when tab regains focus ──
    // Chrome throttles CSS animations in background tabs; they can freeze on return.
    const onVisibility = () => {
      if (!document.hidden) {
        document.querySelectorAll('.marquee-track, .method-track, .nav-scene, [class*="animate"]')
          .forEach(el => { (el as HTMLElement).style.animationPlayState = "running"; });
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearTimeout(loaderTimer);
      cancelAnimationFrame(ringRaf);
      document.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVisibility);
      hoverEls.forEach(el => { el.removeEventListener("mouseenter", enterFn); el.removeEventListener("mouseleave", leaveFn); });
      wordObs.disconnect();
      revealObs.disconnect();
      anchors.forEach(a => a.removeEventListener("click", anchorFn as EventListener));
    };
  }, []);

  return (
    <>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[99999] focus:px-4 focus:py-2 focus:bg-[var(--accent)] focus:text-white focus:rounded-lg focus:text-sm focus:font-semibold">Skip to main content</a>
      <style>{`
*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
:root {
  --bg: #F0EBE1; --bg-warm: #E6E0D4; --bg-dark: #141311; --surface: #FAF8F4;
  --text: #1A1A17; --text-inv: #F4F1EB; --text-mid: #5C5A54; --text-light: #9E9B93;
  --accent: #C04B2D; --accent-light: #D4725A; --rule: #D4CCBF;
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
.loader { position: fixed; inset: 0; background: #F7F5F0; z-index: 10000; display: flex; align-items: center; justify-content: center; flex-direction: column; transition: opacity 0.6s ease, visibility 0.6s; }
.loader.done { opacity: 0; visibility: hidden; pointer-events: none; }
.loader-signature { font-family: 'Playfair Display', var(--serif); font-size: clamp(36px, 6vw, 60px); font-weight: 400; font-style: italic; color: #1C2B3A; letter-spacing: -0.5px; position: relative; display: flex; overflow: hidden; }
.loader-signature .loader-char { display: inline-block; opacity: 0; transform: translateY(8px); animation: charReveal 0.3s cubic-bezier(0.16,1,0.3,1) forwards; }
@keyframes charReveal { to { opacity: 1; transform: translateY(0); } }
.loader-signature::after { content: ''; position: absolute; top: 0; left: -10%; width: 30%; height: 100%; background: linear-gradient(90deg, transparent, rgba(212,168,80,0.25), rgba(232,197,71,0.15), transparent); animation: shimmerSweep 0.6s 1.8s ease-out forwards; opacity: 0; pointer-events: none; }
@keyframes shimmerSweep { 0% { left: -30%; opacity: 1; } 100% { left: 110%; opacity: 0; } }
.loader-line { width: 60px; height: 1px; background: linear-gradient(90deg, transparent, #C9B896, transparent); margin-top: 20px; opacity: 0; animation: lineReveal 0.5s 1.2s ease forwards; }
@keyframes lineReveal { to { opacity: 0.6; width: 80px; } }
nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; padding: 28px 56px; display: flex; align-items: center; justify-content: space-between; background: transparent; transition: all 0.5s ease; }
nav.scrolled { padding: 16px 56px; background: rgba(244,241,235,0.92); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-bottom: 1px solid var(--rule); }
.nav-logo { font-family: var(--serif); font-size: 22px; font-weight: 500; letter-spacing: -0.3px; display: flex; align-items: center; gap: 10px; }
.nav-logo-anim { width: 48px; height: 40px; position: relative; flex-shrink: 0; overflow: hidden; border-radius: 4px; }
.nav-logo-anim svg { position: absolute; inset: 0; width: 100%; height: 100%; }
.nav-scene { opacity: 0; animation: sceneLoop 12s linear infinite; animation-duration: 12s !important; }
.nav-scene:nth-child(1) { animation-delay: 0s !important; }
.nav-scene:nth-child(2) { animation-delay: 4s !important; }
.nav-scene:nth-child(3) { animation-delay: 8s !important; }
@keyframes sceneLoop { 0% { opacity: 0; } 4% { opacity: 1; } 29% { opacity: 1; } 33% { opacity: 0; } 100% { opacity: 0; } }
.nav-logo-anim .slide-person { animation: slideDown 3.5s ease-in-out infinite; animation-duration: 3.5s !important; }
.nav-logo-anim .swing-group { animation: swingArc 1.6s ease-in-out infinite; animation-duration: 1.6s !important; transform-origin: 24px 4px; }
.nav-logo-anim .monkey-person { animation: monkeyTraverse 3s ease-in-out infinite; animation-duration: 3s !important; }
.nav-logo-anim .arm-l { animation: armSwap 0.6s step-end infinite; animation-duration: 0.6s !important; }
.nav-logo-anim .arm-r { animation: armSwap 0.6s step-end infinite 0.3s; animation-duration: 0.6s !important; animation-delay: 0.3s !important; }
@keyframes slideDown { 0% { transform: translate(8px, 4px); } 30% { transform: translate(8px, 4px); } 80% { transform: translate(28px, 24px); } 100% { transform: translate(28px, 24px); } }
@keyframes swingArc { 0% { transform: rotate(-20deg); } 25% { transform: rotate(20deg); } 50% { transform: rotate(-18deg); } 75% { transform: rotate(16deg); } 100% { transform: rotate(-14deg); } }
@keyframes monkeyTraverse { 0% { transform: translateX(0); } 100% { transform: translateX(22px); } }
@keyframes armSwap { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }
.nav-right { display: flex; align-items: center; gap: 40px; }
.nav-links { display: flex; gap: 32px; }
.nav-links a { color: var(--text-mid); text-decoration: none; font-size: 12px; font-weight: 600; letter-spacing: 1.2px; text-transform: uppercase; transition: color 0.3s; position: relative; }
.nav-links a::after { content: ''; position: absolute; bottom: -4px; left: 0; width: 0%; height: 1px; background: var(--accent); transition: width 0.4s cubic-bezier(0.65,0,0.35,1); }
.nav-links a:hover { color: var(--text); }
.nav-links a:hover::after { width: 100%; }
.nav-cta { padding: 12px 24px; background: var(--text); color: var(--bg); border-radius: 100px; font-size: 10px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; text-decoration: none; transition: all 0.4s cubic-bezier(0.16,1,0.3,1); display: inline-block; white-space: nowrap; }
.nav-cta:hover { background: var(--accent); color: white; transform: scale(1.05); }
.btn-primary { padding: 18px 48px; background: var(--text); color: var(--bg); border: none; border-radius: 100px; font-family: var(--sans); font-size: 12px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; cursor: none; transition: all 0.4s cubic-bezier(0.16,1,0.3,1); position: relative; overflow: hidden; }
.btn-primary::after { content: ''; position: absolute; inset: 0; background: var(--accent); transform: translateY(101%); transition: transform 0.4s cubic-bezier(0.16,1,0.3,1); }
.btn-primary span { position: relative; z-index: 1; }
.btn-primary:hover { color: white; transform: translateY(-2px); }
.btn-primary:hover::after { transform: translateY(0); }
.btn-ghost { padding: 18px 48px; background: transparent; color: var(--text-mid); border: 1px solid var(--rule); border-radius: 100px; font-family: var(--sans); font-size: 12px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; cursor: none; transition: all 0.3s; text-decoration: none; display: inline-block; }
.btn-ghost:hover { color: var(--text); border-color: var(--text); }
.btn-ghost-teal { padding: 18px 48px; background: transparent; color: #22d3ee; border: 1px solid #22d3ee; border-radius: 100px; font-family: var(--sans); font-size: 12px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; cursor: none; transition: all 0.3s; text-decoration: none; display: inline-block; }
.btn-ghost-teal:hover { background: rgba(34,211,238,0.1); color: #22d3ee; border-color: #22d3ee; }
@keyframes fadeUp { to { opacity: 1; transform: translateY(0); } }
.hero { min-height: 100vh; display: grid; grid-template-columns: 1fr 1fr; align-items: center; padding: 140px 56px 100px; position: relative; overflow: hidden; gap: 60px; }
.hero-left { position: relative; z-index: 2; }
.hero-eyebrow { font-size: 16px; font-weight: 700; letter-spacing: 4px; text-transform: uppercase; color: var(--accent); margin-bottom: 40px; }
.hero-eyebrow .line { display: inline-block; width: 32px; height: 1px; background: var(--accent); vertical-align: middle; margin: 0 12px; }
.hero h1 { font-family: var(--serif); font-size: clamp(32px,3.8vw,56px); font-weight: 300; line-height: 1.15; letter-spacing: -1px; margin-bottom: 36px; }
.hero h1 em { font-style: italic; font-weight: 400; color: var(--accent); }
.hero h1 .teal { color: #2A6B6B; }
.hero-line2 { display: block; margin-top: 14px; font-style: italic; font-weight: 400; }
.split-line { display: block; overflow: hidden; }
.split-line-inner { display: block; transform: translateY(110%); animation: splitReveal 1s cubic-bezier(0.16,1,0.3,1) forwards; }
.split-line:nth-child(2) .split-line-inner { animation-delay: 0.12s; }
@keyframes splitReveal { to { transform: translateY(0); } }
.hero-sub { font-size: 17px; color: var(--text-mid); max-width: 420px; line-height: 1.7; margin-bottom: 44px; opacity: 0; transform: translateY(16px); animation: fadeUp 1s 0.5s forwards; }
.hero-actions { display: flex; gap: 16px; opacity: 0; transform: translateY(20px); animation: fadeUp 1s 0.7s forwards; }
.hero-right { position: relative; z-index: 2; opacity: 0; animation: fadeUp 1.2s 0.4s forwards; transform: translateY(30px); }
.hero-illo { width: 100%; aspect-ratio: 4/3; background: var(--surface); border: 1px solid var(--rule); border-radius: 24px; position: relative; overflow: hidden; padding: 0; }
.hero-illo svg, .hero-illo img { width: 100%; height: 100%; object-fit: cover; }
.marquee-band { padding: 28px 0; border-top: 1px solid var(--rule); border-bottom: 1px solid var(--rule); overflow: hidden; white-space: nowrap; }
.marquee-track { display: inline-flex; width: max-content; animation: marquee 45s linear infinite; animation-duration: 45s !important; }
.marquee-track:hover { animation-play-state: paused !important; }
.marquee-track span { font-family: var(--serif); font-size: 21px; font-weight: 400; font-style: italic; color: var(--text-light); padding: 0 36px; }
.marquee-track span::before { content: '\\2726'; margin-right: 36px; color: var(--accent); font-style: normal; font-size: 12px; vertical-align: middle; }
@keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
@keyframes marqueeReverse { 0% { transform: translateX(-50%); } 100% { transform: translateX(0); } }
.method-band { padding: 20px 0; background: rgba(42,107,107,0.04); border-top: 1px solid rgba(42,107,107,0.1); border-bottom: 1px solid rgba(42,107,107,0.1); overflow: hidden; white-space: nowrap; }
.method-track { display: inline-flex; width: max-content; animation: marqueeReverse 45s linear infinite; animation-duration: 45s !important; }
.method-track:hover { animation-play-state: paused !important; }
.method-track span { font-family: var(--sans); font-size: 18px; font-weight: 500; color: #2A6B6B; padding: 0 28px; letter-spacing: 0.3px; }
.method-track span::before { content: '\\25C6'; margin-right: 28px; color: rgba(42,107,107,0.35); font-size: 8px; vertical-align: middle; }
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
.pain-section { padding: 160px 0 120px; overflow: hidden; }
.pain-header { text-align: center; margin-bottom: 60px; padding: 0 48px; }
.pain-header h2 { font-family: var(--serif); font-size: clamp(32px,4.5vw,56px); font-weight: 300; letter-spacing: -1px; margin-bottom: 16px; }
.pain-header h2 em { font-style: italic; color: var(--accent); }
.pain-header p { font-size: 17px; color: var(--text-mid); max-width: 520px; margin: 0 auto; line-height: 1.7; font-style: italic; }
.pain-scroll { position: relative; padding: 0 48px; }
.pain-track { display: flex; gap: 28px; overflow-x: auto; scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch; padding: 20px 0 40px; scrollbar-width: none; }
.pain-track::-webkit-scrollbar { display: none; }
.pain-card { flex: 0 0 340px; min-height: 520px; border-radius: 24px; padding: 36px 32px; position: relative; overflow: hidden; scroll-snap-align: start; transition: transform 0.4s ease, box-shadow 0.4s ease; display: flex; flex-direction: column; }
.pain-card:hover { transform: translateY(-6px); box-shadow: 0 16px 40px rgba(0,0,0,0.1); }
.pain-card-num { font-family: var(--sans); font-size: 11px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 16px; }
.pain-card h3 { font-family: var(--serif); font-size: 26px; font-weight: 400; letter-spacing: -0.5px; margin-bottom: 20px; }
.pain-card p { font-size: 15px; line-height: 1.75; flex: 1; }
.pain-card-illo { height: 160px; margin-bottom: 24px; display: flex; align-items: center; justify-content: center; }
.pain-card-illo svg { width: 100%; height: 100%; }
.pain-dot-row { display: flex; justify-content: center; gap: 12px; padding: 0 48px; margin-top: 8px; }
.pain-dot { width: 10px; height: 10px; border-radius: 50%; background: #D6D1C8; border: 2px solid #D6D1C8; transition: all 0.3s; }
.pain-dot.active { background: var(--accent); border-color: var(--accent); box-shadow: 0 0 0 4px rgba(192,75,45,0.15); }
.pain-card.playground { flex: 0 0 400px; min-height: 560px; }
@keyframes playgroundPulse { 0%, 100% { box-shadow: 0 8px 32px rgba(212,134,10,0.15); } 50% { box-shadow: 0 12px 48px rgba(212,134,10,0.25); } }
.pain-scroll-hint { position: absolute; top: 50%; right: 16px; transform: translateY(-50%); width: 40px; height: 40px; border-radius: 20px; background: rgba(0,0,0,0.04); display: flex; align-items: center; justify-content: center; font-size: 18px; color: var(--text-light); pointer-events: none; animation: hintPulse 2s ease-in-out infinite; }
@keyframes hintPulse { 0%, 100% { opacity: 0.4; transform: translateY(-50%) translateX(0); } 50% { opacity: 0.8; transform: translateY(-50%) translateX(4px); } }
@media (max-width: 1000px) { .pain-card { flex: 0 0 300px; min-height: 480px; } .pain-card.playground { flex: 0 0 340px; } }
@media (max-width: 600px) { .pain-track { flex-direction: column; overflow-x: visible; scroll-snap-type: none; padding: 0 24px 20px; gap: 20px; } .pain-card, .pain-card.playground { flex: none; width: 100%; min-height: auto; } .pain-scroll { padding: 0; } .pain-scroll-hint { display: none; } .pain-dot-row { display: none; } }
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
  footer { flex-direction: column; align-items: center; gap: 20px; text-align: center; padding: 32px 24px; }
  .footer-center { flex-wrap: wrap; justify-content: center; gap: 16px; }
}
@keyframes floatPaper { 0%,100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-8px) rotate(3deg); } }
@keyframes pulseRing { 0% { r: 8; opacity: 0.5; } 100% { r: 20; opacity: 0; } }
@keyframes barGrow { from { transform: scaleY(0); } to { transform: scaleY(1); } }
@keyframes nodeFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
@keyframes dashMove { to { stroke-dashoffset: -20; } }
      `}</style>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500;1,600&family=Instrument+Sans:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400;1,500;1,600&display=swap" rel="stylesheet" />

      {/* Loader */}
      <div className="loader" id="loader">
        <div className="loader-signature">
          {"HR Digital Playground".split("").map((ch, i) => (
            <span key={i} className="loader-char" style={{ animationDelay: `${0.3 + i * 0.06}s`, ...(ch === " " ? { width: "0.3em" } : {}) }}>{ch === " " ? "\u00A0" : ch}</span>
          ))}
        </div>
        <div className="loader-line" />
      </div>

      {/* Cursor */}
      <div className="cursor" ref={cursorRef} />
      <div className="cursor-ring" ref={ringRef} />

      {/* Nav */}
      <nav id="nav">
        <div className="nav-logo">
          <div className="nav-logo-anim">
            {/* Scene 1 — The Slide */}
            <svg className="nav-scene" viewBox="0 0 48 40" xmlns="http://www.w3.org/2000/svg">
              {/* Slide structure */}
              <line x1="10" y1="6" x2="10" y2="32" stroke="#D4A843" strokeWidth="1.8" strokeLinecap="round"/>
              <line x1="10" y1="6" x2="36" y2="28" stroke="#D4A843" strokeWidth="1.8" strokeLinecap="round"/>
              <line x1="36" y1="28" x2="42" y2="28" stroke="#D4A843" strokeWidth="1.8" strokeLinecap="round"/>
              {/* Ladder rungs */}
              <line x1="7" y1="12" x2="13" y2="12" stroke="#D4A843" strokeWidth="1.2"/><line x1="7" y1="18" x2="13" y2="18" stroke="#D4A843" strokeWidth="1.2"/><line x1="7" y1="24" x2="13" y2="24" stroke="#D4A843" strokeWidth="1.2"/>
              {/* Person sliding */}
              <g className="slide-person">
                <circle cx="4" cy="0" r="3" fill="#E8D5C4"/>
                <rect x="1" y="3" width="6" height="8" rx="1.5" fill="#1C2B3A"/>
                <rect x="0.5" y="3" width="3" height="5" rx="1" fill="#1C2B3A"/>
                <rect x="4" y="3" width="3" height="5" rx="1" fill="#1C2B3A"/>
              </g>
            </svg>
            {/* Scene 2 — The Swing */}
            <svg className="nav-scene" viewBox="0 0 48 40" xmlns="http://www.w3.org/2000/svg">
              {/* Swing frame */}
              <line x1="8" y1="4" x2="40" y2="4" stroke="#2A6B6B" strokeWidth="2" strokeLinecap="round"/>
              <line x1="10" y1="4" x2="6" y2="36" stroke="#2A6B6B" strokeWidth="1.8" strokeLinecap="round"/>
              <line x1="38" y1="4" x2="42" y2="36" stroke="#2A6B6B" strokeWidth="1.8" strokeLinecap="round"/>
              {/* Swing + person */}
              <g className="swing-group">
                <line x1="20" y1="4" x2="18" y2="24" stroke="#2A6B6B" strokeWidth="1.2"/>
                <line x1="28" y1="4" x2="30" y2="24" stroke="#2A6B6B" strokeWidth="1.2"/>
                <rect x="16" y="24" width="16" height="3" rx="1" fill="#2A6B6B"/>
                {/* Person in skirt */}
                <circle cx="24" cy="17" r="3" fill="#E8D5C4"/>
                <rect x="21" y="20" width="6" height="4" rx="1" fill="#1C2B3A"/>
                <path d="M21 24 L19 28 L29 28 L27 24" fill="#1C2B3A"/>
              </g>
            </svg>
            {/* Scene 3 — The Monkey Bars */}
            <svg className="nav-scene" viewBox="0 0 48 40" xmlns="http://www.w3.org/2000/svg">
              {/* Frame */}
              <line x1="4" y1="8" x2="4" y2="36" stroke="#D4A843" strokeWidth="1.8" strokeLinecap="round"/>
              <line x1="44" y1="8" x2="44" y2="36" stroke="#D4A843" strokeWidth="1.8" strokeLinecap="round"/>
              <line x1="4" y1="8" x2="44" y2="8" stroke="#D4A843" strokeWidth="2" strokeLinecap="round"/>
              {/* Rungs */}
              {[12,20,28,36].map(x => <line key={x} x1={x} y1="6" x2={x} y2="10" stroke="#D4A843" strokeWidth="1.2"/>)}
              {/* Person traversing */}
              <g className="monkey-person">
                <circle cx="10" cy="14" r="3" fill="#E8D5C4"/>
                <rect x="7" y="17" width="6" height="8" rx="1.5" fill="#1C2B3A"/>
                {/* Arms reaching up alternating */}
                <line x1="9" y1="17" x2="8" y2="10" stroke="#1C2B3A" strokeWidth="1.2" strokeLinecap="round" className="arm-l"/>
                <line x1="11" y1="17" x2="16" y2="10" stroke="#1C2B3A" strokeWidth="1.2" strokeLinecap="round" className="arm-r"/>
                {/* Legs dangling */}
                <line x1="8" y1="25" x2="7" y2="30" stroke="#1C2B3A" strokeWidth="1.2" strokeLinecap="round"/>
                <line x1="12" y1="25" x2="13" y2="30" stroke="#1C2B3A" strokeWidth="1.2" strokeLinecap="round"/>
              </g>
            </svg>
          </div>
          HR Digital Playground
        </div>
        <div className="nav-right">
          <div className="nav-links">
            <a href="#the-shift">The Shift</a>
            <a href="#see-inside">See Inside</a>
            <a href="#how-it-works">How It Works</a>
            <a href="#our-story">Why We Get Your Pain</a>
          </div>
          <Link href="/app" className="nav-cta desktop-only">Slide Into the Digital Playground</Link>
          <button className={`hamburger${menuOpen ? " open" : ""}`} onClick={() => setMenuOpen(o => !o)} aria-label="Menu">
            <span /><span /><span />
          </button>
        </div>
      </nav>

      {/* Mobile Nav Drawer */}
      <div className={`mobile-nav${menuOpen ? " open" : ""}`}>
        <a href="#the-shift" onClick={() => setMenuOpen(false)}>The Shift</a>
        <a href="#see-inside" onClick={() => setMenuOpen(false)}>See Inside</a>
        <a href="#how-it-works" onClick={() => setMenuOpen(false)}>How It Works</a>
        <a href="#our-story" onClick={() => setMenuOpen(false)}>Why We Get Your Pain</a>
        <Link href="/app" className="nav-cta" onClick={() => setMenuOpen(false)}>Slide In</Link>
      </div>

      {/* ═══ HERO ═══ */}
      <section id="main-content" className="hero">
        <div className="hero-left">
          <div className="hero-eyebrow"><span className="line" /> AI &times; Workforce Transformation <span className="line" /></div>
          <h1>
            <span className="split-line"><span className="split-line-inner">Shareholders push for <span className="teal">performance</span>. Boards demand <span className="teal">oversight</span>. CEOs drive <span className="teal">change</span>. HR absorbs the <span className="teal">pressure</span>.</span></span>
            <span className="split-line hero-line2"><span className="split-line-inner">And no one designed how it <em>actually</em> works.</span></span>
          </h1>
          <p className="hero-sub">The platform that tells you exactly what to do about it — from task-level automation to boardroom-ready decisions.</p>
          <div className="hero-actions">
            <Link href="/app" className="btn-primary" data-hover><span>See What&apos;s Possible</span></Link>
            <a href="/the-part-everyone-gets-wrong" className="btn-ghost-teal" data-hover>See Why We Get It</a>
          </div>
        </div>
        <div className="hero-right">
          <div className="hero-illo">
              <img src={`/web1.png?v=${CACHE_V}`} alt="Transformation team scrambling" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "24px" }} />
            </div>
        </div>
      </section>

      {/* Marquee */}
      <div className="marquee-band">
        <div className="marquee-track">
          {/* Copy 1 */}
          <span>Work Design</span><span>Org Architecture</span><span>Skills Intelligence</span><span>AI Readiness</span><span>Role Reconstruction</span><span>Financial Modeling</span><span>Change Management</span><span>Talent Strategy</span>
          {/* Copy 2 (identical — fills gap when copy 1 scrolls off) */}
          <span>Work Design</span><span>Org Architecture</span><span>Skills Intelligence</span><span>AI Readiness</span><span>Role Reconstruction</span><span>Financial Modeling</span><span>Change Management</span><span>Talent Strategy</span>
        </div>
      </div>

      {/* ═══ MANIFESTO ═══ */}
      <section className="manifesto" id="the-shift">
        <div className="manifesto-inner">
          <div>
            <h2 className="word-reveal">Every company has an AI strategy. Almost none of them know what happens to their <em>people</em> on Monday morning.</h2>
          </div>
          <div className="manifesto-illo">
              <img src={`/web2.png?v=${CACHE_V}`} alt="AI strategy meeting chaos" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "20px" }} />
            </div>
        </div>
      </section>

      {/* Methodology Marquee */}
      <div className="method-band">
        <div className="method-track">
          {/* Copy 1 */}
          <span>Task Decomposition</span><span>Role Redesign</span><span>Impact Scoring</span><span>Scenario Modeling</span><span>Skills Gap Mapping</span><span>Redeployment Planning</span><span>ROI Forecasting</span><span>Readiness Assessment</span><span>Transition Roadmapping</span><span>Workforce Simulation</span>
          {/* Copy 2 */}
          <span>Task Decomposition</span><span>Role Redesign</span><span>Impact Scoring</span><span>Scenario Modeling</span><span>Skills Gap Mapping</span><span>Redeployment Planning</span><span>ROI Forecasting</span><span>Readiness Assessment</span><span>Transition Roadmapping</span><span>Workforce Simulation</span>
        </div>
      </div>

      {/* ═══ THREE MOVES ═══ */}
      <section className="three-moves" id="see-inside">
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
      <section className="modules-pitch" id="how-it-works">
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

      {/* ═══ WHY WE GET YOUR PAIN ═══ */}
      <section className="pain-section" id="our-story">
        <div className="pain-header">
          <h2>Why We Get Your <em>Pain</em></h2>
          <p>Because we&apos;ve lived in the same broken system you have.</p>
        </div>
        <div className="pain-scroll">
          <div className="pain-track">

            {/* Card 1 — The Silos */}
            <div className="pain-card" style={{ background: "#F0EDE7", border: "1px solid #DDD8CE", color: "#3A3832" }}>
              <div className="pain-card-illo">
                <svg viewBox="0 0 280 140" xmlns="http://www.w3.org/2000/svg">
                  <rect x="10" y="50" width="60" height="80" rx="4" fill="#D6D1C8" stroke="#B8B0A3"/>
                  <rect x="20" y="60" width="40" height="10" rx="2" fill="#C9C1B2"/>
                  <rect x="20" y="75" width="40" height="10" rx="2" fill="#C9C1B2"/>
                  <rect x="110" y="30" width="60" height="100" rx="4" fill="#C9C1B2" stroke="#B8B0A3"/>
                  <rect x="120" y="40" width="40" height="10" rx="2" fill="#B8B0A3"/>
                  <rect x="120" y="55" width="40" height="10" rx="2" fill="#B8B0A3"/>
                  <rect x="120" y="70" width="40" height="10" rx="2" fill="#B8B0A3"/>
                  <rect x="210" y="45" width="60" height="85" rx="4" fill="#D6D1C8" stroke="#B8B0A3"/>
                  <rect x="220" y="55" width="40" height="10" rx="2" fill="#C9C1B2"/>
                  <rect x="220" y="70" width="40" height="10" rx="2" fill="#C9C1B2"/>
                  {/* No connections — that's the point */}
                  <line x1="75" y1="90" x2="105" y2="90" stroke="#B8B0A3" strokeWidth="1.5" strokeDasharray="3,5" opacity="0.4"/>
                  <line x1="175" y1="90" x2="205" y2="90" stroke="#B8B0A3" strokeWidth="1.5" strokeDasharray="3,5" opacity="0.4"/>
                  <text x="40" y="25" fontSize="8" fill="#9E9B93" textAnchor="middle" fontWeight="600">COMP</text>
                  <text x="140" y="18" fontSize="8" fill="#9E9B93" textAnchor="middle" fontWeight="600">WF PLAN</text>
                  <text x="240" y="32" fontSize="8" fill="#9E9B93" textAnchor="middle" fontWeight="600">L&amp;D</text>
                </svg>
              </div>
              <div className="pain-card-num" style={{ color: "#9E9B93" }}>01</div>
              <h3>The Silos</h3>
              <p style={{ color: "#5C5A54" }}>Compensation doesn&apos;t talk to workforce planning. Workforce planning doesn&apos;t talk to L&amp;D. L&amp;D doesn&apos;t talk to recruiting. Everyone has their own spreadsheet, their own vendor, their own version of the truth. The org chart says you&apos;re one company. The reality says you&apos;re twelve.</p>
            </div>

            {/* Card 2 — The Fiefdoms */}
            <div className="pain-card" style={{ background: "#EDEAE4", border: "1px solid #D8D3C9", color: "#3A3832" }}>
              <div className="pain-card-illo">
                <svg viewBox="0 0 280 140" xmlns="http://www.w3.org/2000/svg">
                  {/* Multiple figures building separate things */}
                  <circle cx="50" cy="35" r="10" fill="#D4B896"/><rect x="42" y="45" width="16" height="22" rx="3" fill="#7A7568"/>
                  <rect x="30" y="75" width="40" height="55" rx="3" fill="#C9C1B2" stroke="#B8B0A3"/>
                  <rect x="35" y="80" width="12" height="8" rx="1" fill="#B8B0A3"/>
                  <circle cx="140" cy="30" r="10" fill="#D4B896"/><rect x="132" y="40" width="16" height="22" rx="3" fill="#8B7568"/>
                  <rect x="115" y="70" width="50" height="60" rx="3" fill="#B8B0A3" stroke="#A8A095"/>
                  <circle cx="140" cy="95" r="8" fill="#C9C1B2"/>
                  <circle cx="230" cy="38" r="10" fill="#D4B896"/><rect x="222" y="48" width="16" height="22" rx="3" fill="#6B7568"/>
                  <rect x="210" y="78" width="40" height="52" rx="3" fill="#D6D1C8" stroke="#B8B0A3"/>
                  <line x1="215" y1="88" x2="245" y2="88" stroke="#B8B0A3"/><line x1="215" y1="98" x2="245" y2="98" stroke="#B8B0A3"/>
                  {/* No connections between any of them */}
                  <text x="140" y="138" fontSize="7" fill="#9E9B93" textAnchor="middle" fontStyle="italic">none of this connects</text>
                </svg>
              </div>
              <div className="pain-card-num" style={{ color: "#9E9B93" }}>02</div>
              <h3>The Fiefdoms</h3>
              <p style={{ color: "#5C5A54" }}>Every VP protects their headcount. Every HRBP has a different process. Every business unit swears their situation is unique. And the CHRO is supposed to make sense of all of it with a PowerPoint and a prayer.</p>
            </div>

            {/* Card 3 — The Capacity Problem */}
            <div className="pain-card" style={{ background: "#EAE7E0", border: "1px solid #D4CFC5", color: "#3A3832" }}>
              <div className="pain-card-illo">
                <svg viewBox="0 0 280 140" xmlns="http://www.w3.org/2000/svg">
                  {/* Person buried under layers */}
                  <circle cx="140" cy="40" r="12" fill="#D4B896"/>
                  <rect x="130" y="52" width="20" height="26" rx="3" fill="#7A7568"/>
                  {/* Stack of papers/tabs */}
                  <rect x="60" y="55" width="50" height="35" rx="3" fill="#D6D1C8" stroke="#C9C1B2" transform="rotate(-8 85 72)"/>
                  <rect x="65" y="50" width="50" height="35" rx="3" fill="#E0DBD2" stroke="#D6D1C8" transform="rotate(-4 90 67)"/>
                  <rect x="70" y="45" width="50" height="35" rx="3" fill="#EBE7DF" stroke="#D6D1C8"/>
                  <rect x="170" y="50" width="50" height="35" rx="3" fill="#D6D1C8" stroke="#C9C1B2" transform="rotate(6 195 67)"/>
                  <rect x="165" y="47" width="50" height="35" rx="3" fill="#EBE7DF" stroke="#D6D1C8" transform="rotate(3 190 64)"/>
                  {/* 120% bar */}
                  <rect x="60" y="105" width="160" height="16" rx="4" fill="#EBE7DF" stroke="#D6D1C8"/>
                  <rect x="60" y="105" width="192" height="16" rx="4" fill="#C04B2D" opacity="0.2"/>
                  <text x="245" y="117" fontSize="9" fill="#C04B2D" fontWeight="700">120%</text>
                </svg>
              </div>
              <div className="pain-card-num" style={{ color: "#9E9B93" }}>03</div>
              <h3>The Capacity Problem</h3>
              <p style={{ color: "#5C5A54" }}>Your team is already running at 120%. Now layer on an AI strategy, a skills taxonomy, a workforce plan, and a reorg. There are no extra people. There is no extra time. And the consultants want six months and a seven-figure check just to tell you what you already know.</p>
            </div>

            {/* Card 4 — The Moving Target */}
            <div className="pain-card" style={{ background: "#E7E3DC", border: "1px solid #D0CBC1", color: "#3A3832" }}>
              <div className="pain-card-illo">
                <svg viewBox="0 0 280 140" xmlns="http://www.w3.org/2000/svg">
                  {/* Target that keeps shifting */}
                  <circle cx="160" cy="70" r="40" fill="none" stroke="#D6D1C8" strokeWidth="2" strokeDasharray="6,4"/>
                  <circle cx="160" cy="70" r="25" fill="none" stroke="#D6D1C8" strokeWidth="1.5" strokeDasharray="4,4"/>
                  <circle cx="160" cy="70" r="10" fill="none" stroke="#C9C1B2" strokeWidth="1"/>
                  {/* Arrows missing the target */}
                  <line x1="30" y1="120" x2="115" y2="50" stroke="#B8B0A3" strokeWidth="1.5"/>
                  <polygon points="115,50 108,52 112,58" fill="#B8B0A3"/>
                  <line x1="40" y1="30" x2="125" y2="85" stroke="#B8B0A3" strokeWidth="1.5"/>
                  <polygon points="125,85 118,80 120,88" fill="#B8B0A3"/>
                  <line x1="55" y1="110" x2="130" y2="35" stroke="#C04B2D" strokeWidth="1.5" opacity="0.5"/>
                  <polygon points="130,35 123,37 127,43" fill="#C04B2D" opacity="0.5"/>
                  {/* Motion lines showing target moved */}
                  <path d="M200 70 Q210 60 220 70 Q230 80 240 70" fill="none" stroke="#D6D1C8" strokeWidth="1" strokeDasharray="2,3"/>
                  <text x="230" y="55" fontSize="7" fill="#9E9B93" fontStyle="italic">moved again</text>
                </svg>
              </div>
              <div className="pain-card-num" style={{ color: "#9E9B93" }}>04</div>
              <h3>The Moving Target</h3>
              <p style={{ color: "#5C5A54" }}>By the time you finish the workforce plan, the business has pivoted. By the time you roll out the skills framework, three roles have changed. Every workstream has moving pieces, and the pieces don&apos;t stop moving just because you have a deadline.</p>
            </div>

            {/* Card 5 — The Restart */}
            <div className="pain-card" style={{ background: "#E3E0D9", border: "1px solid #CCC7BD", color: "#3A3832" }}>
              <div className="pain-card-illo">
                <svg viewBox="0 0 280 140" xmlns="http://www.w3.org/2000/svg">
                  {/* Progress bar that resets */}
                  <rect x="30" y="30" width="220" height="20" rx="6" fill="#EBE7DF" stroke="#D6D1C8"/>
                  <rect x="30" y="30" width="200" height="20" rx="6" fill="#7A9B6A" opacity="0.5"/>
                  <text x="240" y="44" fontSize="8" fill="#7A9B6A" fontWeight="700">92%</text>
                  {/* Reset arrow */}
                  <path d="M140 58 L140 72 L60 72" fill="none" stroke="#C04B2D" strokeWidth="2"/>
                  <polygon points="60,72 67,67 67,77" fill="#C04B2D"/>
                  <text x="155" y="68" fontSize="7" fill="#C04B2D" fontWeight="600">REORG</text>
                  {/* Bar reset to zero */}
                  <rect x="30" y="85" width="220" height="20" rx="6" fill="#EBE7DF" stroke="#D6D1C8"/>
                  <rect x="30" y="85" width="12" height="20" rx="6" fill="#C04B2D" opacity="0.3"/>
                  <text x="52" y="99" fontSize="8" fill="#C04B2D" fontWeight="700" opacity="0.6">3%</text>
                  <text x="140" y="130" fontSize="7" fill="#9E9B93" textAnchor="middle" fontStyle="italic">back to square one</text>
                </svg>
              </div>
              <div className="pain-card-num" style={{ color: "#9E9B93" }}>05</div>
              <h3>The Restart</h3>
              <p style={{ color: "#5C5A54" }}>You finally get alignment. You finally get the data clean. You finally get the exec sign-off. Then there&apos;s a reorg. Or an acquisition. Or a new CEO. And you&apos;re back to square one, except now you also have to integrate two companies that can&apos;t even agree on job titles.</p>
            </div>

            {/* Card 6 — The Acquisition */}
            <div className="pain-card" style={{ background: "#E0DDD6", border: "1px solid #C8C3B9", color: "#3A3832" }}>
              <div className="pain-card-illo">
                <svg viewBox="0 0 280 140" xmlns="http://www.w3.org/2000/svg">
                  {/* Two puzzle pieces that don't fit */}
                  <path d="M40 40 L100 40 L100 55 Q90 55 90 65 Q90 75 100 75 L100 100 L40 100 Z" fill="#D6D1C8" stroke="#B8B0A3" strokeWidth="1.5"/>
                  <text x="70" y="75" fontSize="8" fill="#7A7568" textAnchor="middle" fontWeight="600">CO. A</text>
                  <path d="M130 40 L130 55 Q140 55 140 65 Q140 75 130 75 L130 100 L240 100 L240 40 Z" fill="#C9C1B2" stroke="#B8B0A3" strokeWidth="1.5"/>
                  <text x="185" y="75" fontSize="8" fill="#7A7568" textAnchor="middle" fontWeight="600">CO. B</text>
                  {/* Gap between them — they don't fit */}
                  <text x="115" y="68" fontSize="16" fill="#C04B2D" textAnchor="middle" opacity="0.5">?</text>
                  {/* Papers everywhere */}
                  <rect x="80" y="108" width="30" height="20" rx="2" fill="#EBE7DF" stroke="#D6D1C8" transform="rotate(-12 95 118)"/>
                  <rect x="140" y="105" width="30" height="20" rx="2" fill="#EBE7DF" stroke="#D6D1C8" transform="rotate(8 155 115)"/>
                  <rect x="110" y="110" width="30" height="20" rx="2" fill="#EBE7DF" stroke="#D6D1C8" transform="rotate(3 125 120)"/>
                </svg>
              </div>
              <div className="pain-card-num" style={{ color: "#9E9B93" }}>06</div>
              <h3>The Acquisition</h3>
              <p style={{ color: "#5C5A54" }}>Good luck. You just inherited a company with a completely different HRIS, a completely different comp philosophy, and 4,000 employees who were told nothing would change. Everything needs to be mapped, merged, and rationalized. It&apos;s going to feel like the final exam for a class nobody signed up for.</p>
            </div>

            {/* Card 7 — Recess (THE FLIP) */}
            <div className="pain-card playground" style={{ background: "linear-gradient(135deg, #FFF8EE 0%, #FFF3E0 50%, #FFF0D6 100%)", border: "2px solid rgba(212,134,10,0.25)", color: "#1A1A17", animation: "playgroundPulse 4s ease-in-out infinite" }}>
              <div className="pain-card-illo">
                <svg viewBox="0 0 320 140" xmlns="http://www.w3.org/2000/svg">
                  {/* Sun */}
                  <circle cx="260" cy="30" r="20" fill="var(--warning)" opacity="0.3"/>
                  <circle cx="260" cy="30" r="12" fill="var(--warning)" opacity="0.5"/>
                  {/* Swing set */}
                  <line x1="80" y1="20" x2="60" y2="120" stroke="#C07840" strokeWidth="3"/>
                  <line x1="160" y1="20" x2="180" y2="120" stroke="#C07840" strokeWidth="3"/>
                  <line x1="60" y1="20" x2="180" y2="20" stroke="#C07840" strokeWidth="3"/>
                  {/* Swing chains + seat */}
                  <line x1="100" y1="20" x2="95" y2="85" stroke="var(--accent-primary)" strokeWidth="1.5"/>
                  <line x1="115" y1="20" x2="120" y2="85" stroke="var(--accent-primary)" strokeWidth="1.5"/>
                  <rect x="90" y="85" width="35" height="6" rx="2" fill="#C07840"/>
                  {/* Happy figure on swing */}
                  <circle cx="108" cy="72" r="8" fill="#E8D5C4"/>
                  <rect x="101" y="80" width="14" height="6" rx="2" fill="#2A6B6B"/>
                  {/* Ground */}
                  <ellipse cx="160" cy="125" rx="140" ry="8" fill="var(--warning)" opacity="0.15"/>
                  {/* Running figure */}
                  <circle cx="220" cy="95" r="7" fill="#D4B896"/>
                  <rect x="214" y="102" width="12" height="15" rx="2" fill="#C04B2D" opacity="0.7"/>
                  {/* Open field feeling — small flowers/dots */}
                  <circle cx="40" cy="115" r="2" fill="#2A6B6B" opacity="0.3"/>
                  <circle cx="200" cy="118" r="2" fill="var(--accent-primary)" opacity="0.3"/>
                  <circle cx="140" cy="120" r="2" fill="#2A6B6B" opacity="0.2"/>
                  <circle cx="280" cy="112" r="2" fill="var(--warning)" opacity="0.4"/>
                </svg>
              </div>
              <div className="pain-card-num" style={{ color: "var(--accent-primary)", letterSpacing: "4px" }}>RECESS</div>
              <h3 style={{ fontSize: 30, color: "#1A1A17" }}>What if it felt like <em style={{ color: "#C04B2D", fontStyle: "italic" }}>play?</em></h3>
              <p style={{ color: "#5C5A54", fontSize: 16 }}>What if diagnosing your org, redesigning roles, and simulating outcomes felt less like a compliance exercise and more like recess? That&apos;s what we built. A place where the hard work of transformation actually feels like play.</p>
              <div style={{ marginTop: 24, textAlign: "center" }}>
                <div style={{ fontFamily: "var(--serif)", fontSize: 16, fontStyle: "italic", color: "#C07840", marginBottom: 16 }}>HR Digital Playground</div>
                <Link href="/app" className="btn-primary" data-hover style={{ display: "inline-block" }}><span>Step onto the Playground &rarr;</span></Link>
              </div>
            </div>

          </div>
          <div className="pain-scroll-hint">&rarr;</div>
        </div>
        {/* Dot indicators */}
        <div className="pain-dot-row">
          {[0,1,2,3,4,5].map(i => <div key={i} className="pain-dot" />)}
          <div className="pain-dot active" />
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
          <a href="#the-shift">The Shift</a>
          <a href="#how-it-works">How It Works</a>
          <a href="https://www.linkedin.com/in/hiral-merchant-6a0416b1/" target="_blank" rel="noopener noreferrer">LinkedIn</a>
        </div>
        <div className="footer-right">&copy; 2026 Hiral Merchant</div>
      </footer>
    </>
  );
}
