"use client";

import { useEffect } from "react";

function getEmployeeId(): string | null {
  const employeeId = new URLSearchParams(window.location.search).get("employeeId")?.trim();
  return employeeId || null;
}

function getEmployeeAnalysisRequest(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  employeeId: string,
): RequestInfo | URL | null {
  // AnalysisWizard currently calls fetch with a URL string. A pre-built Request
  // is deliberately left untouched rather than cloning a body stream implicitly.
  if (input instanceof Request) return null;

  const method = (init?.method ?? "GET").toUpperCase();
  if (method !== "POST") return null;

  const rawUrl = typeof input === "string" ? input : input.toString();

  try {
    const url = new URL(rawUrl, window.location.origin);
    if (url.origin !== window.location.origin || !url.pathname.endsWith("/api/analyse")) return null;

    const scopedPath = `/api/employees/${encodeURIComponent(employeeId)}/assessments`;
    return input instanceof URL ? new URL(scopedPath, window.location.origin) : scopedPath;
  } catch {
    return null;
  }
}

/**
 * UI adapter used only on the server-capable application.
 *
 * AnalysisWizard posts to /api/analyse. When the page was opened from a
 * persisted employee dossier with ?employeeId=..., this bridge scopes that POST
 * to the employee-specific endpoint. The endpoint remains the source of
 * authorization and tenant validation; the query string is never trusted as an
 * authorization decision.
 */
export function EmployeeAnalysisBridge() {
  useEffect(() => {
    const employeeId = getEmployeeId();
    if (!employeeId) return;

    const nativeFetch = window.fetch.bind(window);
    const bridgedFetch: typeof window.fetch = async (input, init) => {
      const scopedInput = getEmployeeAnalysisRequest(input, init, employeeId);
      return nativeFetch(scopedInput ?? input, init);
    };

    window.fetch = bridgedFetch;

    return () => {
      if (window.fetch === bridgedFetch) window.fetch = nativeFetch;
    };
  }, []);

  return null;
}
