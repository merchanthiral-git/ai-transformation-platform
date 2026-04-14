"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Route Error]", error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0B1120",
        fontFamily: "'Outfit', sans-serif",
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
        <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.8 }}>⚠️</div>
        <h2
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: "#E2E8F0",
            marginBottom: 8,
          }}
        >
          Something went wrong
        </h2>
        <p
          style={{
            fontSize: 13,
            color: "#8892A8",
            lineHeight: 1.6,
            marginBottom: 24,
            maxWidth: 360,
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          {error.message || "An unexpected error occurred. Your data is safe — try refreshing."}
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button
            onClick={reset}
            style={{
              padding: "12px 28px",
              borderRadius: 12,
              border: "none",
              background: "linear-gradient(135deg, var(--accent-primary), var(--teal))",
              color: "#fff",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "'Outfit', sans-serif",
              boxShadow: "0 4px 20px rgba(224,144,64,0.3)",
            }}
          >
            Try Again
          </button>
          <button
            onClick={() => (window.location.href = "/")}
            style={{
              padding: "12px 28px",
              borderRadius: 12,
              border: "1px solid var(--border)",
              background: "transparent",
              color: "#8892A8",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "'Outfit', sans-serif",
            }}
          >
            Go Home
          </button>
        </div>
        {error.digest && (
          <div
            style={{
              marginTop: 20,
              fontSize: 10,
              color: "#5A6478",
              fontFamily: "'IBM Plex Mono', monospace",
            }}
          >
            Error ID: {error.digest}
          </div>
        )}
      </div>
    </div>
  );
}
