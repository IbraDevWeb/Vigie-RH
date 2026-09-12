"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/icon";

const EVENT_NAME = "vigie:employee-assessment-created";

type CreatedEventDetail = {
  employeeId: string;
  assessmentId: string;
};

type GenerationResponse = {
  assessmentId: string;
  employeeId: string;
  created: Array<{ id: string; title: string }>;
  existingSourceKeys: string[];
  error?: string;
};

export function AssessmentTaskGenerationPanel() {
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const currentEmployeeId = new URLSearchParams(window.location.search).get("employeeId")?.trim() || null;
    setEmployeeId(currentEmployeeId);
    if (!currentEmployeeId) return;

    const onCreated = (event: Event) => {
      const detail = (event as CustomEvent<CreatedEventDetail>).detail;
      if (!detail || detail.employeeId !== currentEmployeeId) return;
      setAssessmentId(detail.assessmentId);
      setMessage(null);
      setError(null);
    };

    window.addEventListener(EVENT_NAME, onCreated);
    return () => window.removeEventListener(EVENT_NAME, onCreated);
  }, []);

  if (!employeeId || !assessmentId) return null;

  async function generateTasks() {
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/assessments/${encodeURIComponent(assessmentId)}/tasks/generate`, {
        method: "POST",
      });
      const payload = await response.json() as GenerationResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? "Impossible de créer les tâches de suivi.");
      }

      if (payload.created.length > 0) {
        const duplicates = payload.existingSourceKeys.length;
        setMessage(
          `${payload.created.length} tâche${payload.created.length > 1 ? "s" : ""} créée${payload.created.length > 1 ? "s" : ""}`
          + (duplicates > 0 ? ` · ${duplicates} déjà existante${duplicates > 1 ? "s" : ""}` : ""),
        );
      } else if (payload.existingSourceKeys.length > 0) {
        setMessage("Les tâches de suivi de cette analyse existent déjà. Aucun doublon n'a été créé.");
      } else {
        setMessage("Cette analyse ne contient aucune action ouverte à transformer en tâche.");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Erreur inconnue lors de la génération des tâches.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card" style={{ marginTop: "1rem" }}>
      <p className="eyebrow">Suivi opérationnel</p>
      <h2>Créer les tâches issues de cette analyse</h2>
      <p className="muted">
        Vigie crée uniquement les actions encore ouvertes de la checklist et l'échéance explicitement calculée par le moteur.
        Les actions déjà terminées sont ignorées et une nouvelle génération ne crée pas de doublons.
      </p>

      <div className="wizard-actions">
        <button className="btn primary" disabled={loading} onClick={generateTasks}>
          <Icon name="check" /> {loading ? "Création…" : "Créer les tâches de suivi"}
        </button>
        <Link href={`/salaries/${encodeURIComponent(employeeId)}`} className="btn secondary">
          Revenir au dossier
        </Link>
      </div>

      {message && (
        <div className="notice info">
          <Icon name="check" />
          <div><strong>Suivi mis à jour</strong><p>{message}</p></div>
        </div>
      )}
      {error && (
        <div className="notice danger">
          <Icon name="alert" />
          <div><strong>Création impossible</strong><p>{error}</p></div>
        </div>
      )}
    </section>
  );
}
