/**
 * Analytics wrapper around PostHog.
 *
 * Reads NEXT_PUBLIC_POSTHOG_KEY from env. If unset, every call is a no-op.
 * Also captures lightweight local metrics in localStorage for the admin
 * dashboard (works even without PostHog).
 */

import posthog from "posthog-js";

// ── Initialisation ──

const PH_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY || "";
let _initialised = false;

export function initAnalytics() {
  if (_initialised) return;
  _initialised = true;
  if (PH_KEY) {
    posthog.init(PH_KEY, {
      api_host: "https://us.i.posthog.com",
      autocapture: false,
      capture_pageview: false,
      persistence: "localStorage",
      loaded: () => {
        if (process.env.NODE_ENV === "development") {
          posthog.debug(false);
        }
      },
    });
  }
}

// ── Identity ──

export function identifyUser(userId: string, traits?: Record<string, unknown>) {
  if (PH_KEY && _initialised) posthog.identify(userId, traits);
  // Local: bump user count
  _bumpLocalStat("total_users", userId);
}

export function resetIdentity() {
  if (PH_KEY && _initialised) posthog.reset();
}

// ── Event tracking ──

export function track(event: string, properties?: Record<string, unknown>) {
  if (PH_KEY && _initialised) posthog.capture(event, properties);
  _recordLocalEvent(event, properties);
}

// ── Convenience helpers for key events ──

export function trackSignup(userId: string, method: string) {
  track("user_signed_up", { user_id: userId, method });
  _bumpLocalCounter("signups");
}

export function trackLogin(userId: string) {
  track("user_logged_in", { user_id: userId });
  _bumpLocalCounter("logins");
  _recordActiveUser(userId);
}

export function trackProjectCreated(projectId: string, industry?: string) {
  track("project_created", { project_id: projectId, industry });
  _bumpLocalCounter("projects_created");
}

export function trackSandboxSelected(company: string) {
  track("sandbox_selected", { company });
  _bumpLocalCounter("sandbox_selected");
}

export function trackModuleVisited(module: string) {
  track("module_visited", { module });
  _bumpLocalModuleVisit(module);
}

export function trackDataUploaded(fileType: string, sizeBytes: number, rowCount?: number) {
  track("data_uploaded", { file_type: fileType, size_bytes: sizeBytes, row_count: rowCount });
  _bumpLocalCounter("data_uploads");
}

export function trackExportGenerated(format?: string) {
  track("export_generated", { format });
  _bumpLocalCounter("exports");
}

export function trackAIFeatureUsed(feature: string, module?: string) {
  track("ai_feature_used", { feature, module });
  _bumpLocalCounter("ai_uses");
}

// ── Session duration per module ──

let _moduleEnterTime = 0;
let _currentModule = "";

export function startModuleSession(module: string) {
  // Close previous session
  if (_currentModule && _moduleEnterTime) {
    const elapsed = Math.round((Date.now() - _moduleEnterTime) / 1000);
    if (elapsed > 1) {
      track("module_session_end", { module: _currentModule, duration_seconds: elapsed });
      _addModuleDuration(_currentModule, elapsed);
    }
  }
  _currentModule = module;
  _moduleEnterTime = Date.now();
}

export function endAllSessions() {
  if (_currentModule && _moduleEnterTime) {
    const elapsed = Math.round((Date.now() - _moduleEnterTime) / 1000);
    if (elapsed > 1) {
      track("module_session_end", { module: _currentModule, duration_seconds: elapsed });
      _addModuleDuration(_currentModule, elapsed);
    }
  }
  _currentModule = "";
  _moduleEnterTime = 0;
}

// ── Signup funnel ──

export function trackFunnelStep(step: "landed" | "signed_up" | "uploaded_data" | "used_3_modules") {
  track("funnel_step", { step });
  _bumpLocalFunnel(step);
}

// ═══════════════════════════════════════════════════════════════
//  LOCAL METRICS (stored in localStorage for admin dashboard)
// ═══════════════════════════════════════════════════════════════

const LS_PREFIX = "_atx_";

function _lsGet(key: string): unknown {
  try {
    const raw = localStorage.getItem(LS_PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function _lsSet(key: string, val: unknown) {
  try {
    localStorage.setItem(LS_PREFIX + key, JSON.stringify(val));
  } catch {}
}

function _bumpLocalCounter(key: string) {
  const current = (_lsGet(`counter_${key}`) as number) || 0;
  _lsSet(`counter_${key}`, current + 1);
}

function _bumpLocalStat(key: string, userId: string) {
  const set = (_lsGet(`set_${key}`) as string[]) || [];
  if (!set.includes(userId)) {
    set.push(userId);
    _lsSet(`set_${key}`, set);
  }
}

function _recordActiveUser(userId: string) {
  const now = Date.now();
  const active = (_lsGet("active_users") as { id: string; ts: number }[]) || [];
  const updated = active.filter(a => a.id !== userId);
  updated.push({ id: userId, ts: now });
  // Keep last 500 entries
  _lsSet("active_users", updated.slice(-500));
}

function _bumpLocalModuleVisit(module: string) {
  const visits = (_lsGet("module_visits") as Record<string, number>) || {};
  visits[module] = (visits[module] || 0) + 1;
  _lsSet("module_visits", visits);
}

function _addModuleDuration(module: string, seconds: number) {
  const durations = (_lsGet("module_durations") as Record<string, { total: number; count: number }>) || {};
  if (!durations[module]) durations[module] = { total: 0, count: 0 };
  durations[module].total += seconds;
  durations[module].count += 1;
  _lsSet("module_durations", durations);
}

function _bumpLocalFunnel(step: string) {
  const funnel = (_lsGet("funnel") as Record<string, number>) || {};
  funnel[step] = (funnel[step] || 0) + 1;
  _lsSet("funnel", funnel);
}

// ── Read local metrics (for admin dashboard) ──

export interface LocalMetrics {
  counters: Record<string, number>;
  moduleVisits: Record<string, number>;
  moduleDurations: Record<string, { total: number; count: number }>;
  activeUsers7d: number;
  activeUsers30d: number;
  totalUsers: number;
  funnel: Record<string, number>;
  avgSessionMinutes: number;
}

export function getLocalMetrics(): LocalMetrics {
  const now = Date.now();
  const DAY = 86400000;

  // Counters
  const counterKeys = ["signups", "logins", "projects_created", "sandbox_selected", "data_uploads", "exports", "ai_uses"];
  const counters: Record<string, number> = {};
  for (const k of counterKeys) {
    counters[k] = (_lsGet(`counter_${k}`) as number) || 0;
  }

  // Module visits
  const moduleVisits = (_lsGet("module_visits") as Record<string, number>) || {};

  // Module durations
  const moduleDurations = (_lsGet("module_durations") as Record<string, { total: number; count: number }>) || {};

  // Active users
  const active = (_lsGet("active_users") as { id: string; ts: number }[]) || [];
  const activeUsers7d = new Set(active.filter(a => now - a.ts < 7 * DAY).map(a => a.id)).size;
  const activeUsers30d = new Set(active.filter(a => now - a.ts < 30 * DAY).map(a => a.id)).size;

  // Total users
  const totalUsers = ((_lsGet("set_total_users") as string[]) || []).length;

  // Funnel
  const funnel = (_lsGet("funnel") as Record<string, number>) || {};

  // Avg session duration across all modules
  let totalDuration = 0;
  let totalSessions = 0;
  for (const mod of Object.values(moduleDurations)) {
    totalDuration += mod.total;
    totalSessions += mod.count;
  }
  const avgSessionMinutes = totalSessions > 0 ? Math.round((totalDuration / totalSessions) / 60 * 10) / 10 : 0;

  return { counters, moduleVisits, moduleDurations, activeUsers7d, activeUsers30d, totalUsers, funnel, avgSessionMinutes };
}
