import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Transformation Platform",
  description: "Enterprise-grade workforce transformation and AI readiness platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&family=Outfit:wght@300;400;500;600;700;800&family=IBM+Plex+Mono:wght@300;400;500;600&display=swap" rel="stylesheet" />
        <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem('theme');if(t)document.documentElement.setAttribute('data-theme',t)}catch(e){}` }} />
      </head>
      <body className="min-h-full flex">{children}</body>
    </html>
  );
}
