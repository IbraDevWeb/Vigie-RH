"use client";

import { useEffect } from "react";

function getEmployeeId(): string | null {
  const employeeId = new URLSearchParams(window.location.search).get("employeeId")?.trim();
  return employeeId || null;
}

function isGeneralAnalysisRequest(input: RequestInfo | URL, init?: RequestInit): boolean {
  const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
  if (method !== "POST") return false;

  const rawUrl = typeof input === "string"
    ? input
    : input instanceof URL
      ? input.toString()
      : input.url;

  try {
    const url = new URL(rawUrl, window.location.origin);
    return url.origin === window.location.origin && url.pathname.endsWith("/api/analyse");
  } catch {
    return false;
  }
}

function replaceRequestUrl(
  input: RequestInfo | URL,
  employeeId: string,
): RequestInfo | URL {
  const employeeAnalysisUrl = `/api/employees/${encodeURIComponent(employeeId)}/assessments`;

  if (input instanceof Request) {
    return new Request(new URL(employeeAnalysisUrl, window.location.origin), input);
  }

  if (input instanceof URL) {
    return new URL(employeeAnalysisUrl, window.location.origin);
  }

  return employeeAnalysisUrl;
}

/**
 * UI adapter used only on the server-capable application.
 *
 * The legacy AnalysisWizard posts to /api/analyse. When the page was opened
 * from a persisted employee dossier with ?employeeId=..., this bridge scopes
 * that POST to the employee-specific endpoint. The endpoint remains the source
 * of authorization and tenant validation; the query string is never trusted as
 * an authorization decision.
 */
export function EmployeeAnalysisBridge() {
  useEffect(() => {
    const employeeId = getEmployeeId();
    if (!employeeId) return;

    const nativeFetch = window.fetch.bind(window);
    const bridgedFetch: typeof window.fetch = async (input, init) => {
      if (!isGeneralAnalysisRequest(input, init)) return nativeFetch(input, init);
      return nativeFetch(replaceRequestUrl(input, employeeId), init);
    };

    window.fetch = bridgedFetch;

    return () => {
      if (window.fetch === bridgedFetch) window.fetch = nativeFetch;
    };
  }, []);

  return null;
}
