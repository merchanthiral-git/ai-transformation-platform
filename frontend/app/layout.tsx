import type { Metadata } from "next";
import "./globals.css";

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
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&family=Outfit:wght@300;400;500;600;700;800&family=IBM+Plex+Mono:wght@300;400;500;600&display=swap" rel="stylesheet" />
        <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem('theme');if(t)document.documentElement.setAttribute('data-theme',t)}catch(e){}\n;(function(){var w=window.innerWidth,d=window.devicePixelRatio||1,el=document.documentElement;el.removeAttribute('data-screen');if(w<1280)el.setAttribute('data-screen','small');else if(w<1600)el.setAttribute('data-screen','medium');else if(w<1920)el.setAttribute('data-screen','large');else el.setAttribute('data-screen','xlarge');if(d>=2)el.setAttribute('data-retina','true');window.addEventListener('resize',function(){var w2=window.innerWidth;el.removeAttribute('data-screen');if(w2<1280)el.setAttribute('data-screen','small');else if(w2<1600)el.setAttribute('data-screen','medium');else if(w2<1920)el.setAttribute('data-screen','large');else el.setAttribute('data-screen','xlarge');})})()` }} />
        <script dangerouslySetInnerHTML={{ __html: [
          // 1. Service worker cleanup — unregister any stale service workers
          `if('serviceWorker' in navigator){navigator.serviceWorker.getRegistrations().then(function(r){r.forEach(function(reg){reg.unregister()})})}`,
          // 2. Stale localStorage cleanup on version change
          `(function(){try{fetch('/api/version').then(function(r){return r.json()}).then(function(d){var v=d.version;if(!v)return;var prev=localStorage.getItem('app_version');if(prev&&prev!==v){var keys=Object.keys(localStorage);for(var i=0;i<keys.length;i++){var k=keys[i];if(k==='auth_token'||k==='auth_user'||k==='last_activity'||k==='theme'||k==='hub_projects'||k==='remembered_credentials'||k==='app_version')continue;if(k.indexOf('_page')!==-1||k.indexOf('_viewMode')!==-1||k.indexOf('_visited')!==-1||k==='hub_active'){localStorage.removeItem(k)}}}localStorage.setItem('app_version',v)})}catch(e){}})()`,
          // 3. Version check polling — every 5 minutes, show update banner if version changed
          `(function(){var currentVersion=null;function check(){fetch('/api/version').then(function(r){return r.json()}).then(function(d){if(!d.version)return;if(!currentVersion){currentVersion=d.version;return}if(d.version!==currentVersion&&!document.getElementById('version-banner')){var b=document.createElement('div');b.id='version-banner';b.style.cssText='position:fixed;bottom:24px;right:24px;z-index:99999;background:linear-gradient(135deg,#1a1a2e,#16213e);border:1px solid rgba(212,134,10,0.4);border-radius:12px;padding:14px 20px;display:flex;align-items:center;gap:12px;font-family:Outfit,sans-serif;box-shadow:0 8px 32px rgba(0,0,0,0.4)';b.innerHTML='<span style=\"color:rgba(255,200,150,0.9);font-size:14px\">A new version is available</span><button onclick=\"window.location.reload()\" style=\"padding:6px 16px;border-radius:8px;border:1px solid rgba(212,134,10,0.4);background:rgba(212,134,10,0.15);color:#f0a050;font-size:13px;font-weight:600;cursor:pointer;font-family:Outfit,sans-serif\">Refresh</button>';document.body.appendChild(b)}}).catch(function(){})}setTimeout(check,3000);setInterval(check,300000)})()`,
        ].join(';') }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
