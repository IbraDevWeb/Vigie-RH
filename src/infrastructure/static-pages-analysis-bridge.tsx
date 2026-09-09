"use client";

import { useEffect } from "react";
import { assessForeignWorkerCase } from "@/application/assess-foreign-worker-case";
import { ValidationError } from "@/domain/legal/validation";
import type { AssessmentInput } from "@/domain/legal/types";

function isAnalysisRequest(input: RequestInfo | URL, init?: RequestInit): boolean {
  const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
  if (method !== "POST") return false;

  const rawUrl = typeof input === "string"
    ? input
    : input instanceof URL
      ? input.toString()
      : input.url;

  try {
    const url = new URL(rawUrl, window.location.origin);
    return url.pathname.endsWith("/api/analyse");
  } catch {
    return false;
  }
}

async function readBody(input: RequestInfo | URL, init?: RequestInit): Promise<Partial<AssessmentInput>> {
  if (typeof init?.body === "string") return JSON.parse(init.body) as Partial<AssessmentInput>;
  if (input instanceof Request) return await input.clone().json() as Partial<AssessmentInput>;
  return {};
}

export function StaticPagesAnalysisBridge() {
  useEffect(() => {
    const nativeFetch = window.fetch.bind(window);

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      if (!isAnalysisRequest(input, init)) return nativeFetch(input, init);

      try {
        const body = await readBody(input, init);
        const result = assessForeignWorkerCase(body);
        const assessmentId = `pages-${crypto.randomUUID()}`;

        return new Response(JSON.stringify({ assessmentId, result }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        if (error instanceof ValidationError) {
          return new Response(JSON.stringify({ error: "Entrée invalide", issues: error.issues }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ error: "Analyse impossible" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    };

    return () => {
      window.fetch = nativeFetch;
    };
  }, []);

  return null;
}
