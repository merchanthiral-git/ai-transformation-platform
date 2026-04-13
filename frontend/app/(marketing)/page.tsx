"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";

export default function LandingPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const particles: { x: number; y: number; size: number; speedX: number; speedY: number; opacity: number }[] = [];
    const mouse = { x: null as number | null, y: null as number | null };
    let raf = 0;

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);
    const onMouse = (e: MouseEvent) => { mouse.x = e.clientX; mouse.y = e.clientY; };
    document.addEventListener("mousemove", onMouse);

    function makeParticle() {
      return {
        x: Math.random() * canvas!.width, y: Math.random() * canvas!.height,
        size: Math.random() * 1.5 + 0.5, speedX: (Math.random() - 0.5) * 0.3,
        speedY: (Math.random() - 0.5) * 0.3, opacity: Math.random() * 0.4 + 0.1,
      };
    }
    for (let i = 0; i < 80; i++) particles.push(makeParticle());

    const animate = () => {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      for (const p of particles) {
        p.x += p.speedX; p.y += p.speedY;
        if (mouse.x !== null && mouse.y !== null) {
          const dx = mouse.x - p.x, dy = mouse.y - p.y;
          if (Math.sqrt(dx * dx + dy * dy) < 150) { p.x -= dx * 0.005; p.y -= dy * 0.005; }
        }
        if (p.x < 0 || p.x > canvas!.width || p.y < 0 || p.y > canvas!.height) Object.assign(p, makeParticle());
        ctx!.fillStyle = `rgba(200,210,255,${p.opacity})`;
        ctx!.beginPath(); ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx!.fill();
      }
      for (let a = 0; a < particles.length; a++) {
        for (let b = a + 1; b < particles.length; b++) {
          const dx = particles[a].x - particles[b].x, dy = particles[a].y - particles[b].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx!.strokeStyle = `rgba(100,140,255,${0.06 * (1 - dist / 120)})`;
            ctx!.lineWidth = 0.5; ctx!.beginPath();
            ctx!.moveTo(particles[a].x, particles[a].y);
            ctx!.lineTo(particles[b].x, particles[b].y); ctx!.stroke();
          }
        }
      }
      raf = requestAnimationFrame(animate);
    };
    animate();

    const onScroll = () => document.getElementById("lp-nav")?.classList.toggle("scrolled", window.scrollY > 60);
    window.addEventListener("scroll", onScroll);

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add("visible"); });
    }, { threshold: 0.15, rootMargin: "0px 0px -60px 0px" });
    document.querySelectorAll(".reveal-text, .glass-card, .feature-card, .stat-item").forEach(el => observer.observe(el));
    document.querySelectorAll(".feature-card").forEach((c, i) => ((c as HTMLElement).style.transitionDelay = `${i * 0.1}s`));
    document.querySelectorAll(".stat-item").forEach((c, i) => ((c as HTMLElement).style.transitionDelay = `${i * 0.15}s`));

    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); window.removeEventListener("scroll", onScroll); document.removeEventListener("mousemove", onMouse); observer.disconnect(); };
  }, []);

  return (
    <>
      <style>{`
:root{--bg-deep:#05080F;--glass-bg:rgba(255,255,255,0.04);--glass-border:rgba(255,255,255,0.08);--glass-hover:rgba(255,255,255,0.08);--text-primary:#F0F0F5;--text-secondary:rgba(240,240,245,0.55);--text-tertiary:rgba(240,240,245,0.3);--accent-blue:#3B82F6;--accent-cyan:#06B6D4;--accent-orange:#F97316;--accent-violet:#8B5CF6;--gradient-hero:linear-gradient(135deg,#3B82F6 0%,#8B5CF6 40%,#F97316 100%);--font-display:'Syne',sans-serif;--font-body:'Outfit',sans-serif}
.lp{font-family:var(--font-body);color:var(--text-primary);background:var(--bg-deep);-webkit-font-smoothing:antialiased;overflow-x:hidden}
#lp-canvas{position:fixed;top:0;left:0;width:100%;height:100%;z-index:0;pointer-events:none}
#lp-nav{position:fixed;top:0;left:0;right:0;z-index:100;padding:20px 48px;display:flex;align-items:center;justify-content:space-between;backdrop-filter:blur(24px) saturate(1.4);background:rgba(5,8,15,0.6);border-bottom:1px solid var(--glass-border);transition:all 0.4s cubic-bezier(0.16,1,0.3,1)}
#lp-nav.scrolled{padding:14px 48px;background:rgba(5,8,15,0.85)}
.lp-logo{font-family:var(--font-display);font-weight:800;font-size:20px;letter-spacing:-0.5px;background:var(--gradient-hero);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.lp-links{display:flex;gap:36px;align-items:center}.lp-links a{color:var(--text-secondary);text-decoration:none;font-size:14px;font-weight:500;transition:color 0.3s}.lp-links a:hover{color:var(--text-primary)}
.lp-cta-nav{padding:10px 24px;background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:100px;color:var(--text-primary);font-weight:600;transition:all 0.3s;text-decoration:none}.lp-cta-nav:hover{background:rgba(255,255,255,0.1);border-color:rgba(255,255,255,0.2)}
.lp-s{position:relative;z-index:1}
.hero{min-height:100vh;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:140px 48px 100px;overflow:hidden}
.hero-orb{position:absolute;border-radius:50%;filter:blur(120px);opacity:0.35;animation:orbF 12s ease-in-out infinite}
.ho1{width:600px;height:600px;background:var(--accent-blue);top:-10%;left:-10%}.ho2{width:500px;height:500px;background:var(--accent-violet);bottom:-15%;right:-5%;animation-delay:-4s}.ho3{width:300px;height:300px;background:var(--accent-orange);top:30%;right:15%;animation-delay:-8s}
@keyframes orbF{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(30px,-40px) scale(1.05)}66%{transform:translate(-20px,20px) scale(0.95)}}
.hero-badge{display:inline-flex;align-items:center;gap:8px;padding:8px 20px;background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:100px;font-size:13px;font-weight:500;color:var(--text-secondary);margin-bottom:40px;opacity:0;transform:translateY(20px);animation:fU 0.8s 0.2s forwards}
.hero-badge .dot{width:6px;height:6px;border-radius:50%;background:#22C55E;animation:pls 2s infinite;display:inline-block}
@keyframes pls{0%,100%{opacity:1}50%{opacity:0.4}}
.hero h1{font-family:var(--font-display);font-size:clamp(52px,8vw,110px);font-weight:900;line-height:0.95;letter-spacing:-3px;margin:0 0 32px;opacity:0;transform:translateY(40px);animation:fU 1s 0.4s forwards}
.gt{background:var(--gradient-hero);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.hero-sub{font-size:clamp(17px,2vw,22px);font-weight:300;color:var(--text-secondary);max-width:600px;line-height:1.6;margin-bottom:56px;opacity:0;transform:translateY(30px);animation:fU 1s 0.6s forwards}
.hero-acts{display:flex;gap:16px;align-items:center;opacity:0;transform:translateY(30px);animation:fU 1s 0.8s forwards}
.bp{padding:16px 40px;background:var(--accent-blue);color:#fff;border:none;border-radius:100px;font-family:var(--font-body);font-size:16px;font-weight:600;cursor:pointer;transition:all 0.3s;text-decoration:none;display:inline-block}.bp:hover{transform:translateY(-2px);box-shadow:0 12px 40px rgba(59,130,246,0.4)}
.bg{padding:16px 40px;background:transparent;color:var(--text-secondary);border:1px solid var(--glass-border);border-radius:100px;font-family:var(--font-body);font-size:16px;font-weight:500;cursor:pointer;transition:all 0.3s;text-decoration:none;display:inline-block}.bg:hover{color:var(--text-primary);border-color:rgba(255,255,255,0.2);background:var(--glass-bg)}
@keyframes fU{to{opacity:1;transform:translateY(0)}}
.scroll-ind{position:absolute;bottom:40px;left:50%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:8px;opacity:0;animation:fU 1s 1.2s forwards}.scroll-ind span{font-size:11px;text-transform:uppercase;letter-spacing:2px;color:var(--text-tertiary)}
.scroll-line{width:1px;height:40px;background:linear-gradient(to bottom,var(--text-tertiary),transparent);animation:sP 2s ease-in-out infinite}@keyframes sP{0%,100%{opacity:0.3;transform:scaleY(1)}50%{opacity:1;transform:scaleY(1.2)}}
.rs{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:120px 48px}
.rc{max-width:1200px;width:100%;display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:center}.rc.rev{direction:rtl}.rc.rev>*{direction:ltr}
.rt{opacity:0;transform:translateY(60px);transition:all 1s cubic-bezier(0.16,1,0.3,1)}.rt.visible{opacity:1;transform:translateY(0)}
.rl{font-size:12px;text-transform:uppercase;letter-spacing:3px;font-weight:600;margin-bottom:16px;display:inline-block}
.lb{color:var(--accent-blue)}.lv{color:var(--accent-violet)}.lo{color:var(--accent-orange)}
.rt h2{font-family:var(--font-display);font-size:clamp(36px,4vw,56px);font-weight:800;line-height:1.05;letter-spacing:-2px;margin:0 0 24px}.rt p{font-size:17px;line-height:1.7;color:var(--text-secondary);font-weight:300;margin:0}
.gc{background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:24px;padding:48px;backdrop-filter:blur(20px);position:relative;overflow:hidden;opacity:0;transform:translateY(60px) scale(0.96);transition:all 1s cubic-bezier(0.16,1,0.3,1)}.gc.visible{opacity:1;transform:translateY(0) scale(1)}.gc::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent)}.gc:hover{border-color:rgba(255,255,255,0.12);background:var(--glass-hover)}
.md{width:100%;aspect-ratio:16/10;background:rgba(0,0,0,0.3);border-radius:16px;border:1px solid var(--glass-border);position:relative;overflow:hidden}
.ms{position:absolute;left:0;top:0;bottom:0;width:50px;background:rgba(28,43,58,0.6);border-right:1px solid var(--glass-border);display:flex;flex-direction:column;align-items:center;padding-top:16px;gap:14px}
.msd{width:8px;height:8px;border-radius:3px;background:rgba(255,255,255,0.15)}.msd.a{background:var(--accent-blue)}
.mm{position:absolute;left:50px;top:0;right:0;bottom:0;padding:16px;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:auto 1fr;gap:10px}
.mst{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:12px;display:flex;flex-direction:column;gap:4px}
.mstl{font-size:8px;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:1px}
.mstv{font-family:var(--font-display);font-size:20px;font-weight:700}
.mc{grid-column:1/-1;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:10px;position:relative;overflow:hidden}.mc svg{width:100%;height:100%}
.fs{padding:160px 48px;position:relative;z-index:1}
.sh{text-align:center;max-width:700px;margin:0 auto 80px}.sh h2{font-family:var(--font-display);font-size:clamp(36px,4vw,56px);font-weight:800;letter-spacing:-2px;line-height:1.05;margin:0 0 20px}.sh p{font-size:18px;color:var(--text-secondary);font-weight:300;line-height:1.6;margin:0}
.fg{max-width:1200px;margin:0 auto;display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
.feature-card{background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:20px;padding:40px 32px;transition:all 0.5s cubic-bezier(0.16,1,0.3,1);position:relative;overflow:hidden;opacity:0;transform:translateY(40px)}.feature-card.visible{opacity:1;transform:translateY(0)}.feature-card:hover{transform:translateY(-4px);background:var(--glass-hover)}
.fi{width:48px;height:48px;border-radius:14px;display:flex;align-items:center;justify-content:center;margin-bottom:24px;font-size:22px}
.fib{background:rgba(59,130,246,0.12);color:var(--accent-blue)}.fiv{background:rgba(139,92,246,0.12);color:var(--accent-violet)}.fio{background:rgba(249,115,22,0.12);color:var(--accent-orange)}.fic{background:rgba(6,182,212,0.12);color:var(--accent-cyan)}.fig{background:rgba(34,197,94,0.12);color:#22C55E}.fir{background:rgba(244,63,94,0.12);color:#F43F5E}
.feature-card h3{font-family:var(--font-display);font-size:20px;font-weight:700;margin:0 0 12px;letter-spacing:-0.5px}.feature-card p{font-size:15px;color:var(--text-secondary);line-height:1.65;font-weight:300;margin:0}
.sb{padding:80px 48px;position:relative;z-index:1}.si{max-width:1000px;margin:0 auto;display:grid;grid-template-columns:repeat(4,1fr);gap:24px;text-align:center}
.stat-item{opacity:0;transform:translateY(30px);transition:all 0.8s cubic-bezier(0.16,1,0.3,1)}.stat-item.visible{opacity:1;transform:translateY(0)}
.sn{font-family:var(--font-display);font-size:clamp(40px,5vw,64px);font-weight:900;letter-spacing:-2px;background:var(--gradient-hero);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.sl{font-size:14px;color:var(--text-tertiary);margin-top:8px;text-transform:uppercase;letter-spacing:1.5px;font-weight:500}
.cs{padding:160px 48px;text-align:center;position:relative;z-index:1}.cs h2{font-family:var(--font-display);font-size:clamp(40px,5vw,72px);font-weight:900;letter-spacing:-2px;line-height:1;margin:0 0 24px}.cs p{font-size:19px;color:var(--text-secondary);font-weight:300;max-width:500px;margin:0 auto 48px;line-height:1.6}
.lf{padding:60px 48px 40px;border-top:1px solid var(--glass-border);position:relative;z-index:1}.lfi{max-width:1200px;margin:0 auto;display:flex;justify-content:space-between;align-items:center}
.lfl{font-family:var(--font-display);font-weight:800;font-size:18px;background:var(--gradient-hero);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}.lfr{font-size:13px;color:var(--text-tertiary)}
@media(max-width:900px){#lp-nav{padding:16px 24px}.lp-links{display:none}.hero{padding:120px 24px 80px}.rc{grid-template-columns:1fr;gap:40px}.rc.rev{direction:ltr}.fg{grid-template-columns:1fr}.si{grid-template-columns:repeat(2,1fr)}.lfi{flex-direction:column;gap:16px}.rs,.fs,.sb,.cs{padding-left:24px!important;padding-right:24px!important}}
      `}</style>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      <div className="lp">
        <canvas id="lp-canvas" ref={canvasRef} />

        <nav id="lp-nav">
          <div className="lp-logo">HR Digital Playground</div>
          <div className="lp-links">
            <a href="#features">Platform</a>
            <a href="#diagnose">Diagnose</a>
            <a href="#design">Design</a>
            <a href="#simulate">Simulate</a>
            <Link href="/app" className="lp-cta-nav">Launch Platform</Link>
          </div>
        </nav>

        <section className="hero lp-s">
          <div className="hero-orb ho1" /><div className="hero-orb ho2" /><div className="hero-orb ho3" />
          <div className="hero-badge"><span className="dot" />&nbsp;AI-Powered Workforce Transformation</div>
          <h1>Redesign Work.<br /><span className="gt">Not Just Jobs.</span></h1>
          <p className="hero-sub">The enterprise platform that connects task-level AI automation to KPI outcomes and org-level decisions — in one cinematic workflow.</p>
          <div className="hero-acts">
            <Link href="/app" className="bp">Start Transforming</Link>
            <Link href="/the-tool-nobody-else-built" className="bg">See the Platform</Link>
          </div>
          <div className="scroll-ind"><span>Explore</span><div className="scroll-line" /></div>
        </section>

        <section className="rs lp-s" id="diagnose">
          <div className="rc">
            <div className="reveal-text rt">
              <div className="rl lb">Diagnose</div>
              <h2>See what AI<br />actually changes.</h2>
              <p>Decompose every role into its atomic tasks. Map automation potential, time allocation, and AI readiness — not with guesswork, but with structured intelligence your leadership team can act on.</p>
            </div>
            <div className="glass-card gc">
              <div className="md"><div className="ms"><div className="msd a" /><div className="msd" /><div className="msd" /><div className="msd" /><div className="msd" /></div>
              <div className="mm"><div className="mst"><div className="mstl">Tasks Mapped</div><div className="mstv" style={{color:"var(--accent-blue)"}}>2,847</div></div><div className="mst"><div className="mstl">AI Automatable</div><div className="mstv" style={{color:"var(--accent-orange)"}}>38%</div></div>
              <div className="mc"><svg viewBox="0 0 400 140" preserveAspectRatio="none"><defs><linearGradient id="cg1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3B82F6" stopOpacity={0.3}/><stop offset="100%" stopColor="#3B82F6" stopOpacity={0}/></linearGradient></defs><path d="M0,120 C40,110 80,90 120,85 C160,80 200,95 240,60 C280,25 320,35 360,20 L400,15 L400,140 L0,140Z" fill="url(#cg1)"/><path d="M0,120 C40,110 80,90 120,85 C160,80 200,95 240,60 C280,25 320,35 360,20 L400,15" fill="none" stroke="#3B82F6" strokeWidth={2}/></svg></div></div></div>
            </div>
          </div>
        </section>

        <section className="rs lp-s" id="design">
          <div className="rc rev">
            <div className="reveal-text rt">
              <div className="rl lv">Design</div>
              <h2>Reconstruct roles<br />for an AI world.</h2>
              <p>Do not just cut headcount. Reconstruct jobs — bundling augmented tasks, redeploying human effort, and creating entirely new roles that did not exist last quarter.</p>
            </div>
            <div className="glass-card gc">
              <div className="md"><div className="ms"><div className="msd" /><div className="msd a" /><div className="msd" /><div className="msd" /><div className="msd" /></div>
              <div className="mm"><div className="mst"><div className="mstl">Roles Redesigned</div><div className="mstv" style={{color:"var(--accent-violet)"}}>142</div></div><div className="mst"><div className="mstl">New Roles Created</div><div className="mstv" style={{color:"#22C55E"}}>23</div></div>
              <div className="mc"><svg viewBox="0 0 400 140" preserveAspectRatio="none"><defs><linearGradient id="cg2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.3}/><stop offset="100%" stopColor="#8B5CF6" stopOpacity={0}/></linearGradient></defs>{[20,80,140,200,260,320].map((x,i)=><rect key={i} x={x} y={[60,40,70,30,50,20][i]} width={40} height={[80,100,70,110,90,120][i]} rx={4} fill="url(#cg2)" stroke="#8B5CF6" strokeWidth={1}/>)}</svg></div></div></div>
            </div>
          </div>
        </section>

        <section className="rs lp-s" id="simulate">
          <div className="rc">
            <div className="reveal-text rt">
              <div className="rl lo">Simulate</div>
              <h2>Model the future<br />before you commit.</h2>
              <p>Run multi-scenario simulations across headcount, cost, readiness, and ROI. Compare conservative vs. aggressive transformation paths with real financial projections your CFO can trust.</p>
            </div>
            <div className="glass-card gc">
              <div className="md"><div className="ms"><div className="msd" /><div className="msd" /><div className="msd a" /><div className="msd" /><div className="msd" /></div>
              <div className="mm"><div className="mst"><div className="mstl">Projected ROI</div><div className="mstv" style={{color:"var(--accent-orange)"}}>3.2x</div></div><div className="mst"><div className="mstl">Cost Savings</div><div className="mstv" style={{color:"var(--accent-cyan)"}}>$4.1M</div></div>
              <div className="mc"><svg viewBox="0 0 400 140" preserveAspectRatio="none"><defs><linearGradient id="cg3" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#F97316" stopOpacity={0.25}/><stop offset="100%" stopColor="#F97316" stopOpacity={0}/></linearGradient></defs><path d="M0,130 C60,125 100,100 160,80 C220,60 260,70 300,40 L400,10 L400,140 L0,140Z" fill="url(#cg3)"/><path d="M0,130 C60,125 100,100 160,80 C220,60 260,70 300,40 L400,10" fill="none" stroke="#F97316" strokeWidth={2}/><path d="M0,130 C70,128 120,120 180,110 C240,100 300,90 400,70" fill="none" stroke="#06B6D4" strokeWidth={1.5} strokeDasharray="4,4" opacity={0.5}/></svg></div></div></div>
            </div>
          </div>
        </section>

        <section className="fs lp-s" id="features">
          <div className="sh">
            <h2>Built for the<br /><span className="gt">enterprise CHRO.</span></h2>
            <p>Every module connects task-level automation to org-level decisions — no disconnected point solutions.</p>
          </div>
          <div className="fg">
            {[{i:"◆",c:"fib",t:"Work Design Lab",d:"Six-tab gated workflow from job context through deconstruction, reconstruction, redeployment, impact, and org link."},{i:"◉",c:"fiv",t:"Org Design Studio",d:"Ten named views with inline editing. Span of control, cost models, and multi-scenario comparison in real time."},{i:"△",c:"fio",t:"AI Readiness Scoring",d:"Template-out, data-in pattern. Upload your assessments, get maturity descriptors, gap analysis, and transition roadmaps."},{i:"◎",c:"fic",t:"ROI & Financial Models",d:"Year 1 through Year 5 projections with recurring costs, reskilling investment, and scenario-linked sensitivity analysis."},{i:"⬡",c:"fig",t:"Skills Architecture",d:"Skills inventory, gap analysis, adjacency mapping, and build-buy-borrow-automate decisioning across the entire workforce."},{i:"◈",c:"fir",t:"Change & Mobilization",d:"Action tracking, risk registers, stakeholder mapping, and communication planning to make transformation stick."}].map(f=><div key={f.t} className="feature-card"><div className={`fi ${f.c}`}>{f.i}</div><h3>{f.t}</h3><p>{f.d}</p></div>)}
          </div>
        </section>

        <section className="sb lp-s">
          <div className="si">
            {[{n:"20+",l:"Modules"},{n:"10",l:"Org Views"},{n:"6",l:"Workflow Stages"},{n:"∞",l:"Scenarios"}].map(s=><div key={s.l} className="stat-item"><div className="sn">{s.n}</div><div className="sl">{s.l}</div></div>)}
          </div>
        </section>

        <section className="cs lp-s">
          <h2>Ready to redesign<br /><span className="gt">how work works?</span></h2>
          <p>Join the next generation of enterprise workforce transformation.</p>
          <div style={{display:"flex",gap:16,justifyContent:"center"}}>
            <Link href="/app" className="bp">Get Early Access</Link>
            <Link href="/what-i-saw-from-the-inside" className="bg">Learn More</Link>
          </div>
        </section>

        <footer className="lf">
          <div className="lfi">
            <div className="lfl">HR Digital Playground</div>
            <div className="lfr">&copy; 2026 Hiral Merchant. All rights reserved.</div>
          </div>
        </footer>
      </div>
    </>
  );
}
