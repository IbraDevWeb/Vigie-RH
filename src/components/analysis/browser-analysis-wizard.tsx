"use client";

import { useEffect } from "react";
import { assessForeignWorkerCase } from "@/application/assess-foreign-worker-case";
import { AnalysisWizard } from "@/components/analysis/analysis-wizard";

/**
 * Static-hosting adapter for GitHub Pages.
 *
 * The existing wizard talks to `/api/analyse` so the same UI can also be used
 * with a server deployment. GitHub Pages cannot execute Next.js route handlers,
 * therefore this adapter answers that one request locally with the deterministic
 * application use-case. No legal rule is duplicated in the UI.
 */
export function BrowserAnalysisWizard() {
  useEffect(() => {
    const originalFetch = window.fetch.bind(window);

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;

      const isAnalysisRequest = url === "/api/analyse"
        || url.endsWith("/api/analyse")
        || url.endsWith("/api/analyse/");

      if (!isAnalysisRequest) return originalFetch(input, init);

      try {
        const body = typeof init?.body === "string" ? JSON.parse(init.body) : {};
        const result = assessForeignWorkerCase(body);
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        return new Response(JSON.stringify({
          error: error instanceof Error ? error.message : "Analyse impossible",
        }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  return <AnalysisWizard />;
}
