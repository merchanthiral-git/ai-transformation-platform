/**
 * Auth API client for the AI Transformation Platform.
 * Handles login, register, token storage, and authenticated requests.
 */

const TOKEN_KEY = "auth_token";
const USER_KEY = "auth_user";

export interface AuthUser {
  id: string;
  username: string;
  email?: string | null;
  display_name?: string | null;
  last_login?: string | null;
  user_type?: string | null;  // "consultant" or "industry"
  user_role?: string | null;  // specific role within type
}

export interface ProjectData {
  id: string;
  name: string;
  meta: string;
  client?: string;
  industry?: string;
  size?: string;
  lead?: string;
  status: string;
  created: string;
  state_data?: Record<string, unknown>;
}

// ─── Token management ─────────────────────────────────────────
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: AuthUser) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

// ─── Auth headers helper ──────────────────────────────────────
function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ─── Generic fetch with auth ──────────────────────────────────
async function authFetch<T>(path: string, fallback: T, options?: RequestInit): Promise<T> {
  try {
    const res = await fetch(path, {
      ...options,
      headers: {
        ...authHeaders(),
        ...(options?.headers || {}),
      },
    });
    if (res.status === 401) {
      clearToken();
      window.location.reload();
      return fallback;
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(body.detail || res.statusText);
    }
    return await res.json();
  } catch (err) {
    if (err instanceof Error && err.message) throw err;
    return fallback;
  }
}

// ─── Auth endpoints ───────────────────────────────────────────
// Pydantic v2 returns detail as an array of {msg, loc, type} objects on 422
function parseDetail(detail: unknown): string {
  if (!detail) return "";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const first = detail[0];
    if (first && typeof first === "object" && "msg" in first) {
      const msg = String((first as Record<string, unknown>).msg || "");
      // Strip "Value error, " prefix that Pydantic v2 adds
      return msg.replace(/^Value error,\s*/i, "");
    }
  }
  return String(detail);
}

async function safeAuthFetch(path: string, body: Record<string, unknown>): Promise<{ res: Response; data: Record<string, unknown> }> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error(`[AUTH] Network error on ${path}:`, err);
    throw new Error("Cannot connect to server — make sure the backend is running on port 8000");
  }
  let data: Record<string, unknown>;
  try {
    const text = await res.text();
    data = JSON.parse(text);
  } catch {
    console.error(`[AUTH] Non-JSON response from ${path}: status ${res.status}`);
    if (res.status === 502 || res.status === 504) {
      throw new Error("Backend is not responding — start it with: cd backend && python3 main.py");
    }
    throw new Error(`Server error (${res.status}) — check that the backend is running`);
  }
  return { res, data };
}

export async function register(username: string, password: string, passwordConfirm: string, email?: string, displayName?: string) {
  const { res, data } = await safeAuthFetch("/api/auth/register", {
    username,
    password,
    password_confirm: passwordConfirm,
    email: email || null,
    display_name: displayName || null,
  });
  if (!res.ok) throw new Error(parseDetail(data.detail) || "Registration failed");
  setToken(data.token as string);
  setStoredUser(data.user as AuthUser);
  return data;
}

export async function checkUsername(username: string): Promise<{ available: boolean; reason: string; suggestions: string[] }> {
  try {
    const res = await fetch(`/api/auth/check-username?username=${encodeURIComponent(username)}`);
    if (!res.ok) return { available: false, reason: "error", suggestions: [] };
    return await res.json();
  } catch { return { available: false, reason: "error", suggestions: [] }; }
}

export async function checkEmail(email: string): Promise<{ available: boolean }> {
  try {
    const res = await fetch(`/api/auth/check-email?email=${encodeURIComponent(email)}`);
    if (!res.ok) return { available: true };
    return await res.json();
  } catch { return { available: true }; }
}

export async function login(username: string, password: string) {
  const { res, data } = await safeAuthFetch("/api/auth/login", { username, password });
  if (!res.ok) throw new Error(parseDetail(data.detail) || "Login failed");
  setToken(data.token as string);
  setStoredUser(data.user as AuthUser);
  // Track last activity for session timeout
  localStorage.setItem("last_activity", Date.now().toString());
  return data;
}

export async function getMe(): Promise<AuthUser | null> {
  try {
    return await authFetch<AuthUser | null>("/api/auth/me", null);
  } catch {
    return null;
  }
}

export async function forgotPassword(email: string) {
  const { res, data } = await safeAuthFetch("/api/auth/forgot-password", { email });
  if (!res.ok) throw new Error(parseDetail(data.detail) || "Failed");
  return data;
}

export async function resetPassword(token: string, newPassword: string, confirmPassword: string) {
  const { res, data } = await safeAuthFetch("/api/auth/reset-password", {
    token,
    new_password: newPassword,
    new_password_confirm: confirmPassword,
  });
  if (!res.ok) throw new Error(parseDetail(data.detail) || "Reset failed");
  return data;
}

export function logout() {
  clearToken();
  localStorage.removeItem("hub_active");
  window.location.reload();
}

// ─── Project endpoints (authenticated) ────────────────────────
export async function listProjects(): Promise<ProjectData[]> {
  const data = await authFetch<{ projects: ProjectData[] }>("/api/projects/", { projects: [] });
  return data.projects;
}

export async function createProject(project: {
  name: string;
  meta?: string;
  client?: string;
  industry?: string;
  size?: string;
  lead?: string;
}): Promise<ProjectData> {
  return authFetch<ProjectData>("/api/projects/", {} as ProjectData, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(project),
  });
}

export async function updateProject(projectId: string, updates: {
  name?: string;
  meta?: string;
  status?: string;
  state_data?: Record<string, unknown>;
}): Promise<ProjectData> {
  return authFetch<ProjectData>(`/api/projects/${projectId}`, {} as ProjectData, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
}

export async function deleteProject(projectId: string): Promise<void> {
  await authFetch(`/api/projects/${projectId}`, {}, { method: "DELETE" });
}

export async function getProject(projectId: string): Promise<ProjectData> {
  return authFetch<ProjectData>(`/api/projects/${projectId}`, {} as ProjectData);
}

export async function saveProjectState(projectId: string, state: Record<string, unknown>): Promise<void> {
  await authFetch(`/api/projects/${projectId}/state`, {}, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(state),
  });
}

// ─── Profile ─────────────────────────────────────────────────
export async function updateProfile(updates: {
  display_name?: string;
  email?: string;
  current_password?: string;
  new_password?: string;
  new_password_confirm?: string;
}): Promise<AuthUser> {
  const result = await authFetch<AuthUser>("/api/auth/profile", {} as AuthUser, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  // Update stored user
  const stored = getStoredUser();
  if (stored) setStoredUser({ ...stored, ...result });
  return result;
}

// ─── Remember Me ─────────────────────────────────────────────
const REMEMBER_KEY = "remember_me";
export function saveRememberedCredentials(username: string, password: string) {
  localStorage.setItem(REMEMBER_KEY, JSON.stringify({ username, password }));
}
export function getRememberedCredentials(): { username: string; password: string } | null {
  try {
    const raw = localStorage.getItem(REMEMBER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
export function clearRememberedCredentials() {
  localStorage.removeItem(REMEMBER_KEY);
}

// ─── Session Management ──────────────────────────────────────
const SESSION_TIMEOUT_MS = 24 * 60 * 60 * 1000; // 24 hours
const SESSION_WARNING_MS = 5 * 60 * 1000; // 5 minutes before

export function touchActivity() {
  localStorage.setItem("last_activity", Date.now().toString());
}

export function getSessionTimeRemaining(): number {
  const last = Number(localStorage.getItem("last_activity") || "0");
  if (!last) return SESSION_TIMEOUT_MS;
  return Math.max(0, SESSION_TIMEOUT_MS - (Date.now() - last));
}

export function isSessionExpired(): boolean {
  return getSessionTimeRemaining() <= 0;
}

export function isSessionWarning(): boolean {
  const remaining = getSessionTimeRemaining();
  return remaining > 0 && remaining <= SESSION_WARNING_MS;
}

// ─── Admin API ───────────────────────────────────────────
export async function adminGetUsers(): Promise<{ users: Record<string, unknown>[]; stats: Record<string, number> }> {
  return authFetch("/api/auth/admin/users", { users: [], stats: {} });
}

export async function adminToggleUserStatus(userId: string, active: boolean): Promise<Record<string, unknown>> {
  return authFetch(`/api/auth/admin/users/${userId}/status`, {}, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ active }),
  });
}

export async function adminGetAIUsage(): Promise<Record<string, unknown>> {
  return authFetch("/api/auth/admin/ai-usage", {});
}
