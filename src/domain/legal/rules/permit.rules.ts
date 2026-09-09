import type { LegalRule } from "../types";
import { hasResidentRenewalContinuation } from "./renewal.rules";

function daysUntil(dateIso: string, today: Date): number {
  const target = new Date(`${dateIso}T12:00:00`);
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
}

function hasForeignPermitContext(nationalityGroup: string, permitType: string): boolean {
  return !["france", "eu_eea_swiss"].includes(nationalityGroup) && permitType !== "none";
}

function renewalEvidenceHasDedicatedRule(action: string, proofType?: string): boolean {
  return action === "renew" && Boolean(proofType) && proofType !== "none";
}

export const permitRules: LegalRule[] = [
  {
    id: "expired-permit",
    version: 3,
    description: "Un document expiré empêche d'établir un droit au travail à partir de ce document, sauf continuité ou justificatif de renouvellement traité par une règle dédiée.",
    effectiveFrom: "2024-09-01",
    lastReviewed: "2026-09-09",
    sourceIds: ["sp-autorisation-travail", "sp-sanctions"],
    priority: 220,
    applies: ({ input, today }) => Boolean(input.permitValidUntil)
      && hasForeignPermitContext(input.nationalityGroup, input.permitType)
      && daysUntil(input.permitValidUntil!, today) < 0
      && !renewalEvidenceHasDedicatedRule(input.action, input.renewalProofType)
      && !hasResidentRenewalContinuation(input, today),
    evaluate: ({ input }) => ({
      forceStatus: input.action === "hire" ? "conditional" : "blocked",
      patches: { canWorkNow: false, confidence: "high" },
      findings: [{
        id: "expired",
        title: "Document expiré : droit au travail non établi",
        detail: "Le document renseigné est expiré. Le moteur ne lui attribue aucun droit au travail après sa date de validité ; un éventuel justificatif de renouvellement doit être analysé comme document distinct.",
        severity: "danger",
        sourceIds: ["sp-autorisation-travail", "sp-sanctions"],
      }],
      checklist: [{
        id: "stop-work",
        label: input.action === "hire"
          ? "Ne pas autoriser la prise de poste tant qu'un droit au travail valide n'est pas établi"
          : "Ne pas maintenir le salarié au travail tant que le droit au travail n'est pas établi",
        status: "blocked",
        sourceIds: ["sp-sanctions"],
      }],
    }),
  },
  {
    id: "expiry-alert",
    version: 2,
    description: "Alerte avant expiration du document étranger renseigné.",
    effectiveFrom: "2024-09-01",
    lastReviewed: "2026-09-09",
    sourceIds: ["sp-autorisation-travail"],
    priority: 20,
    applies: ({ input, today }) => Boolean(input.permitValidUntil)
      && hasForeignPermitContext(input.nationalityGroup, input.permitType)
      && daysUntil(input.permitValidUntil!, today) >= 0
      && daysUntil(input.permitValidUntil!, today) <= 120,
    evaluate: ({ input, today }) => {
      const days = daysUntil(input.permitValidUntil!, today);
      const severity = days <= 30 ? "danger" : days <= 60 ? "warning" : "info";
      return {
        patches: { nextDeadline: input.permitValidUntil ?? null },
        findings: [{
          id: "expiry-alert",
          title: `Titre à échéance dans ${days} jour${days > 1 ? "s" : ""}`,
          detail: "Anticipez le renouvellement et demandez les justificatifs de dépôt suffisamment tôt pour éviter une rupture de droit au travail.",
          severity,
          sourceIds: ["sp-autorisation-travail"]
        }],
        checklist: [{
          id: "renewal-followup",
          label: "Planifier le suivi du renouvellement",
          description: `Échéance déclarée : ${input.permitValidUntil}`,
          status: days <= 30 ? "attention" : "todo",
          sourceIds: ["sp-autorisation-travail"]
        }],
      };
    },
  },
  {
    id: "temporary-document",
    version: 2,
    description: "Traitement prudent des documents provisoires selon leur mention exacte de droit au travail.",
    effectiveFrom: "2026-04-26",
    lastReviewed: "2026-09-09",
    sourceIds: ["ct-r5221-2", "sp-autorisation-travail"],
    priority: 180,
    applies: ({ input }) => !["france", "eu_eea_swiss"].includes(input.nationalityGroup)
      && ["receipt", "extension_attestation"].includes(input.permitType),
    evaluate: ({ input }) => {
      if (input.temporaryDocumentAllowsWork === true) {
        return {
          patches: { canWorkNow: true, workAuthorization: "review", confidence: "medium" },
          forceStatus: "review_required",
          findings: [{
            id: "temporary-yes",
            title: "Document temporaire déclaré comme autorisant le travail",
            detail: "Le document est déclaré comme portant une mention autorisant le travail. La mention exacte, le fondement et la validité doivent être contrôlés avant de conclure.",
            severity: "warning",
            sourceIds: ["ct-r5221-2", "sp-autorisation-travail"]
          }],
        };
      }

      if (input.temporaryDocumentAllowsWork === false) {
        return {
          forceStatus: "review_required",
          patches: { canWorkNow: false, workAuthorization: "review", confidence: "high" },
          findings: [{
            id: "temporary-no",
            title: "Document temporaire déclaré sans droit au travail",
            detail: "Le document renseigné ne permet pas d'établir un droit au travail pour la situation déclarée.",
            severity: "danger",
            sourceIds: ["sp-autorisation-travail"]
          }],
        };
      }

      return {
        forceStatus: "review_required",
        patches: { canWorkNow: null, workAuthorization: "review", confidence: "low" },
        findings: [{
          id: "temporary-unknown",
          title: "Mention du document temporaire à contrôler",
          detail: "Le droit au travail dépend du contenu exact du récépissé ou de l'attestation. Le moteur ne conclut pas sans cette information.",
          severity: "warning",
          sourceIds: ["ct-r5221-2", "sp-autorisation-travail"]
        }],
      };
    },
  },
];
