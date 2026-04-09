module.exports = [
"[project]/lib/api.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * API client for the AI Transformation Platform.
 *
 * v3.1 — Better error visibility + non-null fallbacks for every endpoint.
 * Uses RELATIVE URLs so requests go through the Next.js proxy in next.config.ts.
 */ __turbopack_context__.s([
    "checkAiHealth",
    ()=>checkAiHealth,
    "computeReconstruction",
    ()=>computeReconstruction,
    "getAIPriority",
    ()=>getAIPriority,
    "getBBBA",
    ()=>getBBBA,
    "getChangeReadiness",
    ()=>getChangeReadiness,
    "getCompensation",
    ()=>getCompensation,
    "getDataQuality",
    ()=>getDataQuality,
    "getDeconstruction",
    ()=>getDeconstruction,
    "getDownloadUrl",
    ()=>getDownloadUrl,
    "getExportDatasets",
    ()=>getExportDatasets,
    "getExportSummary",
    ()=>getExportSummary,
    "getFilterOptions",
    ()=>getFilterOptions,
    "getHeadcountPlan",
    ()=>getHeadcountPlan,
    "getJobContext",
    ()=>getJobContext,
    "getJobOptions",
    ()=>getJobOptions,
    "getManagerCapability",
    ()=>getManagerCapability,
    "getManagerDevelopment",
    ()=>getManagerDevelopment,
    "getModels",
    ()=>getModels,
    "getOperatingModel",
    ()=>getOperatingModel,
    "getOrgDiagnostics",
    ()=>getOrgDiagnostics,
    "getOverview",
    ()=>getOverview,
    "getReadiness",
    ()=>getReadiness,
    "getReadinessAssessment",
    ()=>getReadinessAssessment,
    "getReskillingPathways",
    ()=>getReskillingPathways,
    "getRisk",
    ()=>getRisk,
    "getRoadmap",
    ()=>getRoadmap,
    "getScenarios",
    ()=>getScenarios,
    "getSkillAnalysis",
    ()=>getSkillAnalysis,
    "getSkillsAdjacency",
    ()=>getSkillsAdjacency,
    "getSkillsGap",
    ()=>getSkillsGap,
    "getSkillsInventory",
    ()=>getSkillsInventory,
    "getTalentMarketplace",
    ()=>getTalentMarketplace,
    "resetData",
    ()=>resetData,
    "uploadFiles",
    ()=>uploadFiles
]);
function filterParams(f) {
    return `func=${encodeURIComponent(f.func)}&jf=${encodeURIComponent(f.jf)}&sf=${encodeURIComponent(f.sf)}&cl=${encodeURIComponent(f.cl)}`;
}
async function fetchJSON(path, fallback, options) {
    try {
        const res = await fetch(path, options);
        if (!res.ok) {
            const text = await res.text().catch(()=>"");
            console.error(`[API ERROR] ${path} → ${res.status} ${res.statusText}`, text.slice(0, 200));
            return fallback;
        }
        const json = await res.json();
        return json;
    } catch (err) {
        console.error(`[API NETWORK ERROR] ${path}`, err);
        return fallback;
    }
}
async function getModels() {
    return fetchJSON("/api/models", {
        models: [],
        last_loaded: ""
    });
}
async function uploadFiles(files) {
    const formData = new FormData();
    Array.from(files).forEach((f)=>formData.append("files", f));
    return fetchJSON("/api/upload", {
        sheets_loaded: 0,
        active_model: "",
        jobs: [],
        models: []
    }, {
        method: "POST",
        body: formData
    });
}
async function resetData() {
    return fetchJSON("/api/reset", {
        ok: true
    }, {
        method: "POST"
    });
}
// ─── Filters & Jobs ──────────────────────────────────────
const EMPTY_FILTERS = {
    functions: [
        "All"
    ],
    job_families: [
        "All"
    ],
    sub_families: [
        "All"
    ],
    career_levels: [
        "All"
    ]
};
async function getFilterOptions(modelId, func = "All", jf = "All", sf = "All") {
    return fetchJSON(`/api/filter-options?model_id=${encodeURIComponent(modelId)}&func=${encodeURIComponent(func)}&jf=${encodeURIComponent(jf)}&sf=${encodeURIComponent(sf)}`, EMPTY_FILTERS);
}
async function getJobOptions(modelId, func = "All", jf = "All", sf = "All", cl = "All") {
    return fetchJSON(`/api/job-options?model_id=${encodeURIComponent(modelId)}&func=${encodeURIComponent(func)}&jf=${encodeURIComponent(jf)}&sf=${encodeURIComponent(sf)}&cl=${encodeURIComponent(cl)}`, {
        jobs: []
    });
}
async function getOverview(modelId, f) {
    return fetchJSON(`/api/overview?model_id=${encodeURIComponent(modelId)}&${filterParams(f)}`, {
        kpis: {
            employees: 0,
            roles: 0,
            tasks_mapped: 0,
            avg_span: 0,
            high_ai_pct: 0,
            readiness_score: 0,
            readiness_tier: ""
        },
        readiness_dims: {},
        func_distribution: [],
        ai_distribution: [],
        data_coverage: {}
    });
}
async function getAIPriority(modelId, f) {
    return fetchJSON(`/api/diagnose/ai-priority?model_id=${encodeURIComponent(modelId)}&${filterParams(f)}`, {
        summary: {
            tasks_scored: 0,
            quick_wins: 0,
            total_time_impact: 0,
            avg_risk: 0
        },
        top10: [],
        workstream_impact: []
    });
}
async function getSkillAnalysis(modelId, f) {
    return fetchJSON(`/api/diagnose/skills?model_id=${encodeURIComponent(modelId)}&${filterParams(f)}`, {
        current: [],
        future: [],
        gap: []
    });
}
async function getOrgDiagnostics(modelId, f) {
    return fetchJSON(`/api/diagnose/org?model_id=${encodeURIComponent(modelId)}&${filterParams(f)}`, {
        kpis: {
            total: 0,
            managers: 0,
            ics: 0,
            avg_span: 0,
            max_span: 0,
            layers: 0
        },
        managers: [],
        span_top15: [],
        layers: [],
        layer_distribution: []
    });
}
async function getDataQuality(modelId) {
    return fetchJSON(`/api/diagnose/data-quality?model_id=${encodeURIComponent(modelId)}`, {
        summary: {
            ready: 0,
            missing: 0,
            total_issues: 0,
            avg_completeness: 0
        },
        readiness: [],
        upload_log: []
    });
}
async function getJobContext(modelId, job, f) {
    return fetchJSON(`/api/design/job-context?model_id=${encodeURIComponent(modelId)}&job=${encodeURIComponent(job)}&${filterParams(f)}`, {
        kpis: {
            hours_week: 0,
            tasks: 0,
            workstreams: 0,
            released_hrs: 0,
            released_pct: 0,
            future_hrs: 0,
            evolution: ""
        },
        meta: {},
        description: "",
        decon_summary: [],
        ws_breakdown: [],
        ai_distribution: []
    });
}
async function getDeconstruction(modelId, job, f) {
    return fetchJSON(`/api/design/deconstruction?model_id=${encodeURIComponent(modelId)}&job=${encodeURIComponent(job)}&${filterParams(f)}`, {
        tasks: [],
        dimensions: [],
        ai_priority: []
    });
}
async function computeReconstruction(tasks, scenario = "Balanced") {
    return fetchJSON("/api/design/reconstruct", {
        reconstruction: [],
        rollup: [],
        value_model: {},
        recommendations: [],
        action_mix: {},
        waterfall: {},
        evolution: "",
        redeployment: [],
        insights: []
    }, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            tasks,
            scenario
        })
    });
}
async function getCompensation(modelId, f) {
    return fetchJSON(`/api/compensation?model_id=${encodeURIComponent(modelId)}&${filterParams(f)}`, {
        kpis: {},
        positioning: [],
        by_function: [],
        by_level: [],
        pay_ranges: [],
        insights: [],
        detail: []
    });
}
async function getOperatingModel(modelId, f) {
    return fetchJSON(`/api/operating-model?model_id=${encodeURIComponent(modelId)}&${filterParams(f)}`, {
        kpis: {},
        maturity: [],
        structure: [],
        workflow: [],
        decisions: [],
        insights: [],
        layer_agg: [],
        service_split: [],
        scope_dist: [],
        decision_load: [],
        stage_throughput: []
    });
}
async function getScenarios(modelId, f) {
    return fetchJSON(`/api/simulate/scenarios?model_id=${encodeURIComponent(modelId)}&${filterParams(f)}`, {
        scenarios: {}
    });
}
async function getReadiness(modelId, f) {
    return fetchJSON(`/api/simulate/readiness?model_id=${encodeURIComponent(modelId)}&${filterParams(f)}`, {
        score: 0,
        total: 0,
        tier: "",
        dimensions: {},
        dims: {}
    });
}
async function getRoadmap(modelId, f) {
    return fetchJSON(`/api/mobilize/roadmap?model_id=${encodeURIComponent(modelId)}&${filterParams(f)}`, {
        roadmap: [],
        summary: {
            total: 0,
            high_priority: 0,
            waves: 0,
            source: ""
        },
        priority_distribution: {},
        wave_distribution: {}
    });
}
async function getRisk(modelId, f) {
    return fetchJSON(`/api/mobilize/risk?model_id=${encodeURIComponent(modelId)}&${filterParams(f)}`, {
        high_risk_tasks: [],
        risk_by_workstream: [],
        summary: {
            high_risk_count: 0,
            no_automate_count: 0,
            avg_risk: 0,
            total_assessed: 0
        }
    });
}
async function getExportDatasets(modelId, f) {
    return fetchJSON(`/api/export/datasets?model_id=${encodeURIComponent(modelId)}&${filterParams(f)}`, {
        exports: {},
        summary: {
            available: 0,
            total_rows: 0,
            model_id: ""
        }
    });
}
function getDownloadUrl(modelId, datasetName, f) {
    return `/api/export/download/${datasetName}?model_id=${encodeURIComponent(modelId)}&${filterParams(f)}`;
}
async function getSkillsInventory(modelId, filters) {
    const params = new URLSearchParams(filters || {});
    const r = await fetch(`/api/skills/inventory/${modelId}?${params}`);
    return r.json();
}
async function getSkillsGap(modelId) {
    const r = await fetch(`/api/skills/gap/${modelId}`);
    return r.json();
}
async function getSkillsAdjacency(modelId) {
    const r = await fetch(`/api/skills/adjacency/${modelId}`);
    return r.json();
}
async function checkAiHealth() {
    const r = await fetch("/api/ai/health");
    return r.json();
}
async function getBBBA(modelId) {
    const r = await fetch(`/api/bbba/${modelId}`);
    return r.json();
}
async function getHeadcountPlan(modelId) {
    const r = await fetch(`/api/headcount/${modelId}`);
    return r.json();
}
async function getReadinessAssessment(modelId) {
    const r = await fetch(`/api/readiness/${modelId}`);
    return r.json();
}
async function getReskillingPathways(modelId) {
    const r = await fetch(`/api/reskilling/${modelId}`);
    return r.json();
}
async function getTalentMarketplace(modelId) {
    const r = await fetch(`/api/marketplace/${modelId}`);
    return r.json();
}
async function getManagerCapability(modelId) {
    const r = await fetch(`/api/manager-capability/${modelId}`);
    return r.json();
}
async function getChangeReadiness(modelId) {
    const r = await fetch(`/api/change-readiness/${modelId}`);
    return r.json();
}
async function getManagerDevelopment(modelId) {
    const r = await fetch(`/api/manager-development/${modelId}`);
    return r.json();
}
async function getExportSummary(modelId) {
    const r = await fetch(`/api/export/summary/${modelId}`);
    return r.json();
}
}),
"[project]/lib/auth-api.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "clearToken",
    ()=>clearToken,
    "createProject",
    ()=>createProject,
    "deleteProject",
    ()=>deleteProject,
    "forgotPassword",
    ()=>forgotPassword,
    "getMe",
    ()=>getMe,
    "getProject",
    ()=>getProject,
    "getStoredUser",
    ()=>getStoredUser,
    "getToken",
    ()=>getToken,
    "listProjects",
    ()=>listProjects,
    "login",
    ()=>login,
    "logout",
    ()=>logout,
    "register",
    ()=>register,
    "resetPassword",
    ()=>resetPassword,
    "saveProjectState",
    ()=>saveProjectState,
    "setStoredUser",
    ()=>setStoredUser,
    "setToken",
    ()=>setToken,
    "updateProject",
    ()=>updateProject
]);
/**
 * Auth API client for the AI Transformation Platform.
 * Handles login, register, token storage, and authenticated requests.
 */ const TOKEN_KEY = "auth_token";
const USER_KEY = "auth_user";
function getToken() {
    if ("TURBOPACK compile-time truthy", 1) return null;
    //TURBOPACK unreachable
    ;
}
function setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
}
function clearToken() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
}
function getStoredUser() {
    if ("TURBOPACK compile-time truthy", 1) return null;
    //TURBOPACK unreachable
    ;
}
function setStoredUser(user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
}
// ─── Auth headers helper ──────────────────────────────────────
function authHeaders() {
    const token = getToken();
    return token ? {
        Authorization: `Bearer ${token}`
    } : {};
}
// ─── Generic fetch with auth ──────────────────────────────────
async function authFetch(path, fallback, options) {
    try {
        const res = await fetch(path, {
            ...options,
            headers: {
                ...authHeaders(),
                ...options?.headers || {}
            }
        });
        if (res.status === 401) {
            clearToken();
            window.location.reload();
            return fallback;
        }
        if (!res.ok) {
            const body = await res.json().catch(()=>({
                    detail: res.statusText
                }));
            throw new Error(body.detail || res.statusText);
        }
        return await res.json();
    } catch (err) {
        if (err instanceof Error && err.message) throw err;
        return fallback;
    }
}
async function register(username, password, passwordConfirm, email) {
    const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            username,
            password,
            password_confirm: passwordConfirm,
            email: email || null
        })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Registration failed");
    setToken(data.token);
    setStoredUser(data.user);
    return data;
}
async function login(username, password) {
    const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            username,
            password
        })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Login failed");
    setToken(data.token);
    setStoredUser(data.user);
    return data;
}
async function getMe() {
    try {
        return await authFetch("/api/auth/me", null);
    } catch  {
        return null;
    }
}
async function forgotPassword(username) {
    const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            username
        })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed");
    return data;
}
async function resetPassword(token, newPassword, confirmPassword) {
    const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            token,
            new_password: newPassword,
            new_password_confirm: confirmPassword
        })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Reset failed");
    return data;
}
function logout() {
    clearToken();
    window.location.reload();
}
async function listProjects() {
    const data = await authFetch("/api/projects/", {
        projects: []
    });
    return data.projects;
}
async function createProject(project) {
    return authFetch("/api/projects/", {}, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(project)
    });
}
async function updateProject(projectId, updates) {
    return authFetch(`/api/projects/${projectId}`, {}, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(updates)
    });
}
async function deleteProject(projectId) {
    await authFetch(`/api/projects/${projectId}`, {}, {
        method: "DELETE"
    });
}
async function getProject(projectId) {
    return authFetch(`/api/projects/${projectId}`, {});
}
async function saveProjectState(projectId, state) {
    await authFetch(`/api/projects/${projectId}/state`, {}, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(state)
    });
}
}),
"[project]/lib/workspace.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useWorkspaceController",
    ()=>useWorkspaceController
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/api.ts [app-ssr] (ecmascript)");
"use client";
;
;
const DEFAULT_FILTERS = {
    func: "All",
    jf: "All",
    sf: "All",
    cl: "All"
};
const DEFAULT_FILTER_OPTIONS = {
    functions: [
        "All"
    ],
    job_families: [
        "All"
    ],
    sub_families: [
        "All"
    ],
    career_levels: [
        "All"
    ]
};
function useWorkspaceController() {
    const [models, setModels] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [model, setModelState] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [jobs, setJobs] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [job, setJobState] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [filters, setFilters] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(DEFAULT_FILTERS);
    const [filterOptions, setFilterOptions] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(DEFAULT_FILTER_OPTIONS);
    const [message, setMessage] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [backendOk, setBackendOk] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(true);
    const [loadingModels, setLoadingModels] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(true);
    const messageTimerRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    // Prevent job-loading effect from overwriting upload-set jobs
    const suppressJobEffectRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(false);
    const setFlash = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((value, ms = 3500)=>{
        setMessage(value);
        if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
        messageTimerRef.current = setTimeout(()=>setMessage(""), ms);
    }, []);
    // ── Model hydration (initial load + after upload/reset) ──
    // Returns the active model ID so callers can use it immediately.
    const hydrateModels = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async ()=>{
        setLoadingModels(true);
        try {
            const response = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getModels"]();
            const nextModels = response.models || [];
            const activeModel = response.last_loaded || nextModels[0] || "";
            setModels(nextModels);
            setBackendOk(true);
            setLoadingModels(false);
            return activeModel;
        } catch  {
            setBackendOk(false);
            setLoadingModels(false);
            return "";
        }
    }, []);
    // ── Helper: load jobs for a model and set state ──
    const loadJobsForModel = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async (mid)=>{
        if (!mid) {
            setJobs([]);
            setJobState("");
            return;
        }
        try {
            const jobData = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getJobOptions"](mid);
            const fetchedJobs = jobData.jobs || [];
            setJobs(fetchedJobs);
            setJobState((current)=>{
                if (current && fetchedJobs.includes(current)) return current;
                return fetchedJobs[0] || "";
            });
        } catch  {
            setJobs([]);
            setJobState("");
        }
    }, []);
    // ── Initial load ──
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        hydrateModels().then((activeModel)=>{
            if (activeModel) {
                setModelState(activeModel);
            // Don't suppress — let the effect load jobs naturally on first mount
            }
        });
        return ()=>{
            if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
        };
    }, [
        hydrateModels
    ]);
    // ── When model changes → load filter options ──
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (!model) {
            setFilterOptions(DEFAULT_FILTER_OPTIONS);
            return;
        }
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getFilterOptions"](model, filters.func, filters.jf, filters.sf).then((data)=>setFilterOptions(data)).catch(()=>setFilterOptions(DEFAULT_FILTER_OPTIONS));
    }, [
        model,
        filters.func,
        filters.jf,
        filters.sf
    ]);
    // ── When model or filters change → load jobs ──
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (!model) {
            setJobs([]);
            setJobState("");
            return;
        }
        // If upload just set jobs directly, skip this effect once
        if (suppressJobEffectRef.current) {
            suppressJobEffectRef.current = false;
            return;
        }
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getJobOptions"](model, filters.func, filters.jf, filters.sf, filters.cl).then((data)=>{
            const nextJobs = data.jobs || [];
            setJobs(nextJobs);
            setJobState((current)=>{
                if (current && nextJobs.includes(current)) return current;
                return nextJobs[0] || "";
            });
        }).catch(()=>{
            setJobs([]);
            setJobState("");
        });
    }, [
        model,
        filters.func,
        filters.jf,
        filters.sf,
        filters.cl
    ]);
    // ── Upload handler ──
    // Sets model, jobs, and job atomically — no race conditions.
    const uploadFiles = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async (files)=>{
        const result = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["uploadFiles"](files);
        const activeModel = result.active_model || "";
        const uploadedJobs = result.jobs || [];
        // Reset filters for the fresh dataset
        setFilters(DEFAULT_FILTERS);
        setFilterOptions(DEFAULT_FILTER_OPTIONS);
        // Hydrate models from backend to get the updated model list
        const hydratedModel = await hydrateModels();
        const finalModel = activeModel || hydratedModel;
        // Suppress the job-loading useEffect for the next model change
        // so it doesn't overwrite the jobs we're about to set.
        suppressJobEffectRef.current = true;
        // Set model first
        setModelState(finalModel);
        if (uploadedJobs.length > 0) {
            // Upload response already includes jobs — use them directly
            setJobs(uploadedJobs);
            setJobState(uploadedJobs[0]);
        } else if (finalModel) {
            // Fallback: fetch jobs for the new model
            await loadJobsForModel(finalModel);
        }
        setFlash(`Loaded ${result.sheets_loaded || 0} sheet(s)` + (uploadedJobs.length ? ` · ${uploadedJobs.length} job(s)` : ""));
        setBackendOk(true);
    }, [
        hydrateModels,
        loadJobsForModel,
        setFlash
    ]);
    // ── Reset handler ──
    const resetWorkspace = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async ()=>{
        await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["resetData"]();
        setFilters(DEFAULT_FILTERS);
        setFilterOptions(DEFAULT_FILTER_OPTIONS);
        const activeModel = await hydrateModels();
        // Suppress so the effect doesn't double-load
        suppressJobEffectRef.current = true;
        setModelState(activeModel);
        if (activeModel) {
            await loadJobsForModel(activeModel);
        } else {
            setJobs([]);
            setJobState("");
        }
        setFlash("Workspace reset");
    }, [
        hydrateModels,
        loadJobsForModel,
        setFlash
    ]);
    // ── Filter cascade ──
    const setFilter = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((key, value)=>{
        setFilters((prev)=>{
            const next = {
                ...prev,
                [key]: value
            };
            if (key === "func") {
                next.jf = "All";
                next.sf = "All";
                next.cl = "All";
            }
            if (key === "jf") {
                next.sf = "All";
                next.cl = "All";
            }
            if (key === "sf") {
                next.cl = "All";
            }
            return next;
        });
    }, []);
    const clearFilters = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(()=>setFilters(DEFAULT_FILTERS), []);
    const setModel = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((value)=>setModelState(value), []);
    const setJob = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((value)=>setJobState(value), []);
    return {
        models,
        model,
        jobs,
        job,
        filters,
        filterOptions,
        message,
        backendOk,
        loadingModels,
        uploadFiles,
        resetWorkspace,
        setModel,
        setJob,
        setFilter,
        clearFilters
    };
}
}),
];

//# sourceMappingURL=lib_0q3oq5d._.js.map