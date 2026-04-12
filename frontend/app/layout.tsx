import type { Metadata } from "next";
import "./globals.css";
import { AnimatedBgProvider } from "../lib/animated-bg-context";

export const metadata: Metadata = {
  title: "AI Transformation Platform",
  description: "Enterprise-grade workforce transformation and AI readiness platform",
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
      </head>
      <body className="min-h-full flex"><AnimatedBgProvider>{children}</AnimatedBgProvider></body>
    </html>
  );
}
