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
export async function register(username: string, password: string, passwordConfirm: string, email?: string) {
  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username,
      password,
      password_confirm: passwordConfirm,
      email: email || null,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Registration failed");
  setToken(data.token);
  setStoredUser(data.user);
  return data;
}

export async function login(username: string, password: string) {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Login failed");
  setToken(data.token);
  setStoredUser(data.user);
  return data;
}

export async function getMe(): Promise<AuthUser | null> {
  try {
    return await authFetch<AuthUser | null>("/api/auth/me", null);
  } catch {
    return null;
  }
}

export async function forgotPassword(username: string) {
  const res = await fetch("/api/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed");
  return data;
}

export async function resetPassword(token: string, newPassword: string, confirmPassword: string) {
  const res = await fetch("/api/auth/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token,
      new_password: newPassword,
      new_password_confirm: confirmPassword,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Reset failed");
  return data;
}

export function logout() {
  clearToken();
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
