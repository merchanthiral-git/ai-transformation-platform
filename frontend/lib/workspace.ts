"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as api from "./api";
import type { Filters } from "./api";

export type WorkspaceState = {
  models: string[];
  model: string;
  jobs: string[];
  job: string;
  filters: Filters;
  filterOptions: Record<string, string[]>;
  message: string;
  backendOk: boolean;
  loadingModels: boolean;
  uploadFiles: (files: FileList) => Promise<void>;
  resetWorkspace: () => Promise<void>;
  setModel: (model: string) => void;
  setJob: (job: string) => void;
  setFilter: (key: keyof Filters, value: string) => void;
  clearFilters: () => void;
};

const DEFAULT_FILTERS: Filters = { func: "All", jf: "All", sf: "All", cl: "All" };
const DEFAULT_FILTER_OPTIONS = {
  functions: ["All"],
  job_families: ["All"],
  sub_families: ["All"],
  career_levels: ["All"],
};

export function useWorkspaceController(): WorkspaceState {
  const [models, setModels] = useState<string[]>([]);
  const [model, setModelState] = useState("");
  const [jobs, setJobs] = useState<string[]>([]);
  const [job, setJobState] = useState("");
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [filterOptions, setFilterOptions] = useState<Record<string, string[]>>(DEFAULT_FILTER_OPTIONS);
  const [message, setMessage] = useState("");
  const [backendOk, setBackendOk] = useState(true);
  const [loadingModels, setLoadingModels] = useState(true);
  const messageTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Prevent job-loading effect from overwriting upload-set jobs
  const suppressJobEffectRef = useRef(false);

  const setFlash = useCallback((value: string, ms = 3500) => {
    setMessage(value);
    if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
    messageTimerRef.current = setTimeout(() => setMessage(""), ms);
  }, []);

  // ── Model hydration (initial load + after upload/reset) ──
  // Returns the active model ID so callers can use it immediately.
  const hydrateModels = useCallback(async (): Promise<string> => {
    setLoadingModels(true);
    try {
      const response = await api.getModels();
      const nextModels = response.models || [];
      const activeModel = response.last_loaded || nextModels[0] || "";
      setModels(nextModels);
      setBackendOk(true);
      setLoadingModels(false);
      return activeModel;
    } catch {
      setBackendOk(false);
      setLoadingModels(false);
      return "";
    }
  }, []);

  // ── Helper: load jobs for a model and set state ──
  const loadJobsForModel = useCallback(async (mid: string) => {
    if (!mid) {
      setJobs([]);
      setJobState("");
      return;
    }
    try {
      const jobData = await api.getJobOptions(mid);
      const fetchedJobs = jobData.jobs || [];
      setJobs(fetchedJobs);
      setJobState((current) => {
        if (current && fetchedJobs.includes(current)) return current;
        return ""; // Default to "All Jobs" — user selects specific job explicitly
      });
    } catch {
      setJobs([]);
      setJobState("");
    }
  }, []);

  // ── Initial load ──
  useEffect(() => {
    hydrateModels().then((activeModel) => {
      if (activeModel) {
        setModelState(activeModel);
        // Don't suppress — let the effect load jobs naturally on first mount
      }
    });
    return () => {
      if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
    };
  }, [hydrateModels]);

  // ── When model changes → load filter options ──
  useEffect(() => {
    if (!model) {
      setFilterOptions(DEFAULT_FILTER_OPTIONS);
      return;
    }
    api.getFilterOptions(model, filters.func, filters.jf, filters.sf)
      .then((data) => setFilterOptions(data))
      .catch(() => setFilterOptions(DEFAULT_FILTER_OPTIONS));
  }, [model, filters.func, filters.jf, filters.sf]);

  // ── When model or filters change → load jobs ──
  useEffect(() => {
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

    api.getJobOptions(model, filters.func, filters.jf, filters.sf, filters.cl)
      .then((data) => {
        const nextJobs = data.jobs || [];
        setJobs(nextJobs);
        setJobState((current) => {
          if (current && nextJobs.includes(current)) return current;
          return ""; // Keep "All Jobs" default
        });
      })
      .catch(() => {
        setJobs([]);
        setJobState("");
      });
  }, [model, filters.func, filters.jf, filters.sf, filters.cl]);

  // ── Upload handler ──
  // Sets model, jobs, and job atomically — no race conditions.
  const uploadFiles = useCallback(async (files: FileList) => {
    const result = await api.uploadFiles(files);
    const activeModel = result.active_model || "";
    const uploadedJobs = (result.jobs || []) as string[];

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

    setFlash(
      `Loaded ${result.sheets_loaded || 0} sheet(s)` +
      (uploadedJobs.length ? ` · ${uploadedJobs.length} job(s)` : "")
    );
    setBackendOk(true);
  }, [hydrateModels, loadJobsForModel, setFlash]);

  // ── Reset handler ──
  const resetWorkspace = useCallback(async () => {
    await api.resetData();
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
  }, [hydrateModels, loadJobsForModel, setFlash]);

  // ── Filter cascade ──
  const setFilter = useCallback((key: keyof Filters, value: string) => {
    setFilters((prev) => {
      const next = { ...prev, [key]: value };
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

  const clearFilters = useCallback(() => setFilters(DEFAULT_FILTERS), []);
  const setModel = useCallback((value: string) => setModelState(value), []);
  const setJob = useCallback((value: string) => setJobState(value), []);

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
    clearFilters,
  };
}
