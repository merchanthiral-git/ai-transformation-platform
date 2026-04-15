"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
    // Auto-recover from stale chunk errors after a deploy
    const isChunkError = error.message?.includes("Loading chunk") ||
      error.message?.includes("Failed to load chunk") ||
      error.message?.includes("Failed to fetch dynamically imported module") ||
      error.message?.includes("ChunkLoadError");
    if (isChunkError) {
      const reloaded = sessionStorage.getItem("chunk-reload");
      if (!reloaded) {
        sessionStorage.setItem("chunk-reload", "1");
        window.location.reload();
        return;
      }
    }
  }, [error]);
  return (
    <html>
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0B1120",
          fontFamily: "'Outfit', system-ui, sans-serif",
          padding: 24,
        }}
      >
        <div
          style={{
            maxWidth: 480,
            width: "100%",
            background: "#131B2E",
            border: "1px solid var(--border)",
            borderRadius: 20,
            padding: "48px 36px",
            textAlign: "center",
            boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
          }}
        >
          <div style={{ fontSize: 56, marginBottom: 16 }}>💥</div>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: "#E2E8F0",
              marginBottom: 8,
            }}
          >
            Critical Error
          </h1>
          <p
            style={{
              fontSize: 13,
              color: "#8892A8",
              lineHeight: 1.6,
              marginBottom: 8,
            }}
          >
            The application encountered an unrecoverable error.
          </p>
          <p
            style={{
              fontSize: 12,
              color: "#5A6478",
              lineHeight: 1.5,
              marginBottom: 28,
              maxWidth: 340,
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            {error.message || "Please refresh the page. If this persists, clear your browser cache."}
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <button
              onClick={reset}
              style={{
                padding: "14px 32px",
                borderRadius: 12,
                border: "none",
                background: "linear-gradient(135deg, var(--accent-primary), var(--teal))",
                color: "#fff",
                fontSize: 15,
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 4px 20px rgba(224,144,64,0.3)",
              }}
            >
              Reload Application
            </button>
          </div>
          {error.digest && (
            <div
              style={{
                marginTop: 24,
                fontSize: 10,
                color: "#5A6478",
                fontFamily: "monospace",
              }}
            >
              Digest: {error.digest}
            </div>
          )}
        </div>
      </body>
    </html>
  );
}
