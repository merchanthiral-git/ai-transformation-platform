import type { Metadata } from "next";
import "./globals.css";
import VistaProvider from "./components/vista/VistaProvider";
// CustomCursor removed — native cursor is zero-cost; custom cursor added per-frame rAF + 3 document listeners

export const metadata: Metadata = {
  title: "AI Transformation Platform",
  description: "Enterprise-grade workforce transformation, organizational design, and AI readiness platform. Diagnose, design, simulate, and mobilize your workforce for the AI era.",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
  },
  openGraph: {
    title: "AI Transformation Platform",
    description: "Enterprise-grade workforce transformation, organizational design, and AI readiness platform. Built by HR Digital Playground.",
    type: "website",
    siteName: "AI Transformation Platform",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Transformation Platform",
    description: "Diagnose, design, simulate, and mobilize your workforce for the AI era.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Critical fonts: Inter Tight + Fraunces — loaded immediately */}
        <link href="https://fonts.googleapis.com/css2?family=Inter+Tight:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;1,9..144,300;1,9..144,400;1,9..144,500&display=swap" rel="stylesheet" />
        {/* Non-critical font: JetBrains Mono — deferred */}
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500&display=swap" rel="stylesheet" media="print" data-onload="this.media='all'" />
        <script dangerouslySetInnerHTML={{ __html: `document.querySelectorAll('link[data-onload]').forEach(function(l){l.onload=function(){this.media='all'}})` }} />
        <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem('theme');if(t)document.documentElement.setAttribute('data-theme',t)}catch(e){}\n;(function(){var w=window.innerWidth,d=window.devicePixelRatio||1,el=document.documentElement;el.removeAttribute('data-screen');if(w<1280)el.setAttribute('data-screen','small');else if(w<1600)el.setAttribute('data-screen','medium');else if(w<1920)el.setAttribute('data-screen','large');else el.setAttribute('data-screen','xlarge');if(d>=2)el.setAttribute('data-retina','true');window.addEventListener('resize',function(){var w2=window.innerWidth;el.removeAttribute('data-screen');if(w2<1280)el.setAttribute('data-screen','small');else if(w2<1600)el.setAttribute('data-screen','medium');else if(w2<1920)el.setAttribute('data-screen','large');else el.setAttribute('data-screen','xlarge');})})()` }} />
        <script dangerouslySetInnerHTML={{ __html: [
          `(function(){window.addEventListener('error',function(e){if(e.message&&(e.message.indexOf('Loading chunk')!==-1||e.message.indexOf('Failed to load chunk')!==-1||e.message.indexOf('Failed to fetch dynamically imported module')!==-1)||(e.target&&e.target.tagName==='SCRIPT')){var r=sessionStorage.getItem('chunk-reload');if(!r){sessionStorage.setItem('chunk-reload','1');window.location.reload()}}},true);window.addEventListener('load',function(){sessionStorage.removeItem('chunk-reload')})})()`,
          `if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js')}`,
          `(function(){try{var bid='${process.env.NEXT_PUBLIC_BUILD_ID||""}';if(!bid)return;var last=localStorage.getItem('buildId');if(last&&last!==bid){if('caches' in window){caches.keys().then(function(k){k.forEach(function(key){caches.delete(key)})})}localStorage.setItem('buildId',bid);window.location.reload()}else{localStorage.setItem('buildId',bid)}}catch(e){}})()`,
          `(function(){try{fetch('/api/version').then(function(r){return r.json()}).then(function(d){var v=d.version;if(!v)return;var prev=localStorage.getItem('app_version');if(prev&&prev!==v){var keys=Object.keys(localStorage);for(var i=0;i<keys.length;i++){var k=keys[i];if(k==='auth_token'||k==='auth_user'||k==='last_activity'||k==='theme'||k==='hub_projects'||k==='remembered_credentials'||k==='app_version'||k==='buildId')continue;if(k.indexOf('_page')!==-1||k.indexOf('_viewMode')!==-1||k.indexOf('_visited')!==-1||k==='hub_active'){localStorage.removeItem(k)}}}localStorage.setItem('app_version',v)})}catch(e){}})()`,
          `(function(){var currentVersion=null;function check(){fetch('/api/version').then(function(r){return r.json()}).then(function(d){if(!d.version)return;if(!currentVersion){currentVersion=d.version;return}if(d.version!==currentVersion&&!document.getElementById('version-banner')){var b=document.createElement('div');b.id='version-banner';b.style.cssText='position:fixed;bottom:24px;right:24px;z-index:99999;background:rgba(22,24,34,0.9);border:1px solid rgba(244,168,58,0.3);border-radius:12px;padding:14px 20px;display:flex;align-items:center;gap:12px;font-family:Inter Tight,sans-serif;box-shadow:0 8px 32px rgba(0,0,0,0.4);backdrop-filter:blur(12px)';b.innerHTML='<span style=\"color:var(--ink-soft);font-size:14px\">A new version is available</span><button onclick=\"window.location.reload()\" style=\"padding:6px 16px;border-radius:8px;border:1px solid rgba(244,168,58,0.3);background:rgba(244,168,58,0.1);color:var(--amber);font-size:13px;font-weight:600;cursor:pointer;font-family:Inter Tight,sans-serif\">Refresh</button>';document.body.appendChild(b)}}).catch(function(){})}setTimeout(check,3000);setInterval(check,300000)})()`,
        ].join(';') }} />
      </head>
      <body className="min-h-full flex flex-col" style={{ background: 'var(--app-bg)', color: 'var(--ink)' }}>
        <VistaProvider>
          {children}
        </VistaProvider>
      </body>
    </html>
  );
}
