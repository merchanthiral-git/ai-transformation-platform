/**
 * Centralized API Client for the AI Transformation Platform
 *
 * Features:
 * - Error classification by HTTP status (401, 422, 5xx, network)
 * - Exponential backoff retry (3 attempts) for 5xx and network errors
 * - Typed error objects for UI-appropriate display
 * - Never swallows errors silently — always logs + returns actionable info
 *
 * Usage:
 *   import { apiClient } from '@/lib/apiClient';
 *   const data = await apiClient.get('/api/models', { models: [], last_loaded: '' });
 */

// ─── Error Types ──────────────────────────────────────────────
export type ApiErrorKind =
  | "network"        // Couldn't reach server
  | "timeout"        // Request timed out
  | "auth"           // 401 — session expired
  | "validation"     // 422 — bad input
  | "not_found"      // 404
  | "server"         // 500+ — server error
  | "unknown";       // Catch-all

export interface ApiError {
  kind: ApiErrorKind;
  status?: number;
  message: string;
  detail?: string;
  retryable: boolean;
  raw?: unknown;
}

export class ApiRequestError extends Error {
  public readonly error: ApiError;
  constructor(err: ApiError) {
    super(err.message);
    this.name = "ApiRequestError";
    this.error = err;
  }
}

// ─── Error Classification ─────────────────────────────────────
function classifyError(status: number, body?: string): ApiError {
  if (status === 401) {
    return {
      kind: "auth",
      status,
      message: "Session expired — please sign in again",
      retryable: false,
    };
  }
  if (status === 404) {
    return {
      kind: "not_found",
      status,
      message: "Resource not found",
      retryable: false,
    };
  }
  if (status === 422) {
    let detail = body || "Invalid input";
    try {
      const parsed = JSON.parse(body || "{}");
      if (parsed.detail) {
        if (typeof parsed.detail === "string") detail = parsed.detail;
        else if (Array.isArray(parsed.detail) && parsed.detail[0]?.msg) {
          detail = String(parsed.detail[0].msg).replace(/^Value error,\s*/i, "");
        }
      }
    } catch {}
    return {
      kind: "validation",
      status,
      message: detail,
      detail,
      retryable: false,
    };
  }
  if (status >= 500) {
    return {
      kind: "server",
      status,
      message: "Server error — the backend encountered a problem",
      detail: body?.slice(0, 200),
      retryable: true,
    };
  }
  return {
    kind: "unknown",
    status,
    message: `Unexpected error (HTTP ${status})`,
    detail: body?.slice(0, 200),
    retryable: false,
  };
}

function networkError(err: unknown): ApiError {
  const msg = err instanceof Error ? err.message : "Unknown error";
  if (msg.includes("abort") || msg.includes("AbortError")) {
    return {
      kind: "timeout",
      message: "Request timed out — the server took too long to respond",
      retryable: true,
    };
  }
  return {
    kind: "network",
    message: "Cannot connect to backend — is it running?",
    detail: msg,
    retryable: true,
    raw: err,
  };
}

// ─── Retry Logic ──────────────────────────────────────────────
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Core Fetch ───────────────────────────────────────────────
async function fetchWithRetry<T>(
  path: string,
  fallback: T,
  options?: RequestInit & { timeoutMs?: number },
): Promise<T> {
  const timeoutMs = options?.timeoutMs ?? 30000;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(path, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const json = await res.json();
        return json as T;
      }

      // Non-OK response
      const bodyText = await res.text().catch(() => "");
      const apiErr = classifyError(res.status, bodyText);

      // Log every non-OK response
      console.error(
        `[API ${apiErr.kind.toUpperCase()}] ${options?.method || "GET"} ${path} → ${res.status}`,
        apiErr.detail || "",
      );

      // Auth errors: don't retry, clear session
      if (apiErr.kind === "auth") {
        if (typeof window !== "undefined") {
          localStorage.removeItem("auth_token");
          localStorage.removeItem("auth_user");
          // Don't auto-reload — let the caller handle it
        }
        return fallback;
      }

      // Validation/404: don't retry
      if (!apiErr.retryable) {
        return fallback;
      }

      // Server error: retry with backoff
      if (attempt < MAX_RETRIES - 1) {
        const backoff = BASE_DELAY_MS * Math.pow(2, attempt);
        console.warn(`[API RETRY] Attempt ${attempt + 2}/${MAX_RETRIES} in ${backoff}ms...`);
        await delay(backoff);
        continue;
      }

      // Final attempt failed
      console.error(`[API EXHAUSTED] ${path} — all ${MAX_RETRIES} attempts failed`);
      return fallback;
    } catch (err) {
      clearTimeout(timeoutId);
      const apiErr = networkError(err);

      console.error(
        `[API ${apiErr.kind.toUpperCase()}] ${options?.method || "GET"} ${path}`,
        apiErr.detail || err,
      );

      if (apiErr.retryable && attempt < MAX_RETRIES - 1) {
        const backoff = BASE_DELAY_MS * Math.pow(2, attempt);
        console.warn(`[API RETRY] Attempt ${attempt + 2}/${MAX_RETRIES} in ${backoff}ms...`);
        await delay(backoff);
        continue;
      }

      return fallback;
    }
  }

  return fallback;
}

// ─── Public API ───────────────────────────────────────────────
export const apiClient = {
  /**
   * GET request with typed fallback
   */
  get<T>(path: string, fallback: T, options?: { timeoutMs?: number }): Promise<T> {
    return fetchWithRetry(path, fallback, { method: "GET", ...options });
  },

  /**
   * POST request with JSON body and typed fallback
   */
  post<T>(path: string, body: unknown, fallback: T, options?: { timeoutMs?: number }): Promise<T> {
    return fetchWithRetry(path, fallback, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      ...options,
    });
  },

  /**
   * POST with FormData (file uploads)
   */
  postForm<T>(path: string, formData: FormData, fallback: T): Promise<T> {
    return fetchWithRetry(path, fallback, {
      method: "POST",
      body: formData,
      timeoutMs: 120000, // 2 min for uploads
    });
  },

  /**
   * PUT request with JSON body
   */
  put<T>(path: string, body: unknown, fallback: T): Promise<T> {
    return fetchWithRetry(path, fallback, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  },

  /**
   * DELETE request
   */
  delete<T>(path: string, fallback: T): Promise<T> {
    return fetchWithRetry(path, fallback, { method: "DELETE" });
  },
};

// ─── Global Unhandled Error Listeners ─────────────────────────
// Install these once from your root layout or _app
export function installGlobalErrorHandlers() {
  if (typeof window === "undefined") return;

  window.addEventListener("unhandledrejection", (event) => {
    console.error(
      "[UNHANDLED PROMISE REJECTION]",
      event.reason instanceof Error ? event.reason.message : event.reason,
    );
    // Don't prevent default — let React error boundaries catch render errors
  });

  window.addEventListener("error", (event) => {
    console.error(
      "[UNCAUGHT ERROR]",
      event.error?.message || event.message,
      event.filename ? `at ${event.filename}:${event.lineno}` : "",
    );
  });
}
