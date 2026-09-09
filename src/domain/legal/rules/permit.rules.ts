import type { LegalRule } from "../types";

function daysUntil(dateIso: string, today: Date): number {
  const target = new Date(`${dateIso}T12:00:00`);
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
}

export const permitRules: LegalRule[] = [
  {
    id: "expired-permit",
    description: "Un document expiré sans justificatif temporaire autorisant le travail bloque le maintien en poste.",
    effectiveFrom: "2024-09-01",
    lastReviewed: "2026-09-09",
    priority: 200,
    applies: ({ input, today }) => Boolean(input.permitValidUntil) && daysUntil(input.permitValidUntil!, today) < 0 && !["france", "eu_eea_swiss"].includes(input.nationalityGroup),
    evaluate: ({ input }) => {
      if (["receipt", "extension_attestation"].includes(input.permitType) && input.temporaryDocumentAllowsWork === true) {
        return {
          patches: { canWorkNow: true, confidence: "medium" },
          findings: [{ id: "temp-allows-work", title: "Document temporaire déclaré comme autorisant le travail", detail: "Le maintien en poste est possible dans le périmètre déclaré. Conservez le document et contrôlez sa date de validité.", severity: "warning", sourceIds: ["sp-autorisation-travail"] }],
          sourceIds: ["sp-autorisation-travail"],
        };
      }
      return {
        forceStatus: "blocked",
        patches: { canWorkNow: false, confidence: "high" },
        sourceIds: ["sp-autorisation-travail", "sp-sanctions"],
        findings: [{ id: "expired", title: "Droit au travail non établi", detail: "Le document renseigné est expiré et aucun justificatif temporaire autorisant le travail n'est établi dans le dossier.", severity: "danger", sourceIds: ["sp-autorisation-travail", "sp-sanctions"] }],
        checklist: [{ id: "stop-work", label: "Ne pas maintenir le salarié au travail tant que le droit au travail n'est pas établi", status: "blocked", sourceIds: ["sp-sanctions"] }],
      };
    },
  },
  {
    id: "expiry-alert",
    description: "Alerte avant expiration.",
    effectiveFrom: "2024-09-01",
    lastReviewed: "2026-09-09",
    priority: 20,
    applies: ({ input, today }) => Boolean(input.permitValidUntil) && daysUntil(input.permitValidUntil!, today) >= 0 && daysUntil(input.permitValidUntil!, today) <= 120,
    evaluate: ({ input, today }) => {
      const days = daysUntil(input.permitValidUntil!, today);
      const severity = days <= 30 ? "danger" : days <= 60 ? "warning" : "info";
      return {
        findings: [{ id: "expiry-alert", title: `Titre à échéance dans ${days} jour${days > 1 ? "s" : ""}`, detail: "Anticipez le renouvellement et demandez au salarié les justificatifs de dépôt suffisamment tôt pour éviter une rupture de droit au travail.", severity, sourceIds: ["sp-autorisation-travail"] }],
        checklist: [{ id: "renewal-followup", label: "Planifier le suivi du renouvellement", description: `Échéance déclarée : ${input.permitValidUntil}`, status: days <= 30 ? "attention" : "todo", sourceIds: ["sp-autorisation-travail"] }],
        sourceIds: ["sp-autorisation-travail"],
      };
    },
  },
  {
    id: "temporary-document",
    description: "Traitement des documents provisoires.",
    effectiveFrom: "2024-09-01",
    lastReviewed: "2026-09-09",
    priority: 110,
    applies: ({ input }) => ["receipt", "extension_attestation"].includes(input.permitType),
    evaluate: ({ input }) => {
      if (input.temporaryDocumentAllowsWork === true) {
        return { patches: { canWorkNow: true, workAuthorization: "review", confidence: "medium" }, findings: [{ id: "temporary-yes", title: "Droit au travail indiqué sur le document temporaire", detail: "Le document a été déclaré comme autorisant le travail. La mention exacte et la validité doivent être archivées.", severity: "warning", sourceIds: ["sp-autorisation-travail"] }], sourceIds: ["sp-autorisation-travail"] };
      }
      if (input.temporaryDocumentAllowsWork === false) {
        return { forceStatus: "blocked", patches: { canWorkNow: false, confidence: "high" }, findings: [{ id: "temporary-no", title: "Document temporaire sans droit au travail", detail: "Le document déclaré ne permet pas le travail dans la situation renseignée.", severity: "danger", sourceIds: ["sp-autorisation-travail"] }], sourceIds: ["sp-autorisation-travail"] };
      }
      return { forceStatus: "review_required", patches: { canWorkNow: null, workAuthorization: "review", confidence: "low" }, findings: [{ id: "temporary-unknown", title: "Mention du document temporaire à contrôler", detail: "Le droit au travail dépend du contenu exact du récépissé ou de l'attestation. Le moteur ne conclut pas sans cette information.", severity: "warning", sourceIds: ["sp-autorisation-travail"] }], sourceIds: ["sp-autorisation-travail"] };
    },
  },
];
