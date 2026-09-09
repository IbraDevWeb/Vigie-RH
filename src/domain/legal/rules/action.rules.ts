import type { LegalRule } from "../types";

function earliestIsoDate(...dates: Array<string | undefined>): string | null {
  const available = dates.filter((date): date is string => Boolean(date)).sort();
  return available[0] ?? null;
}

export const actionRules: LegalRule[] = [
  {
    id: "hire-abroad-review",
    version: 1,
    description: "Le recrutement d'un ressortissant de pays tiers depuis l'étranger nécessite un parcours d'introduction non entièrement modélisé.",
    effectiveFrom: "2024-09-01",
    lastReviewed: "2026-09-09",
    sourceIds: ["ct-r5221-1", "sp-autorisation-travail"],
    priority: 170,
    applies: ({ input }) => input.action === "hire" && input.nationalityGroup === "third_country" && input.location === "abroad",
    evaluate: () => ({
      forceStatus: "review_required",
      patches: { canWorkNow: false, confidence: "low" },
      findings: [{
        id: "hire-abroad-review",
        title: "Recrutement depuis l'étranger : parcours complémentaire à qualifier",
        detail: "Le moteur peut analyser certaines exigences liées à l'autorisation de travail, mais il ne modélise pas encore de façon exhaustive l'introduction, le visa, l'entrée et le document de séjour nécessaire à la prise de poste en France. Aucune conclusion automatique de prise de poste n'est fournie.",
        severity: "warning",
        sourceIds: ["ct-r5221-1", "sp-autorisation-travail"],
      }],
      checklist: [{
        id: "qualify-introduction-route",
        label: "Qualifier le parcours d'introduction et les formalités d'entrée/séjour avant validation finale",
        status: "attention",
        sourceIds: ["sp-autorisation-travail"],
      }],
    }),
  },
  {
    id: "hire-action",
    version: 2,
    description: "Cadre opérationnel du recrutement et échéance la plus proche renseignée.",
    effectiveFrom: "2024-09-01",
    lastReviewed: "2026-09-09",
    sourceIds: ["ct-r5221-1", "ct-r5221-41", "ct-r5221-42"],
    priority: 30,
    applies: ({ input }) => input.action === "hire",
    evaluate: ({ input }) => ({
      patches: { nextDeadline: earliestIsoDate(input.plannedStartDate, input.permitValidUntil) },
      checklist: [{
        id: "hire-before-start",
        label: "Clore les contrôles requis avant la prise de poste",
        description: input.plannedStartDate ? `Date de prise de poste envisagée : ${input.plannedStartDate}` : undefined,
        status: "todo",
        sourceIds: ["ct-r5221-1", "ct-r5221-41", "ct-r5221-42"],
      }],
    }),
  },
  {
    id: "renew-action",
    version: 1,
    description: "Workflow de renouvellement.",
    effectiveFrom: "2024-09-01",
    lastReviewed: "2026-09-09",
    sourceIds: ["sp-autorisation-travail"],
    priority: 30,
    applies: ({ input }) => input.action === "renew",
    evaluate: () => ({
      checklist: [
        {
          id: "collect-renewal",
          label: "Collecter le justificatif de dépôt / renouvellement",
          status: "todo",
          sourceIds: ["sp-autorisation-travail"],
        },
        {
          id: "check-temp-right",
          label: "Contrôler le droit au travail pendant l'instruction",
          status: "attention",
          sourceIds: ["sp-autorisation-travail"],
        },
        {
          id: "update-file",
          label: "Mettre à jour la date d'échéance et archiver le nouveau titre",
          status: "todo",
          sourceIds: ["sp-autorisation-travail"],
        },
      ],
    }),
  },
  {
    id: "modify-action",
    version: 1,
    description: "Modification du contrat ou du poste.",
    effectiveFrom: "2024-09-01",
    lastReviewed: "2026-09-09",
    sourceIds: ["ct-r5221-1"],
    priority: 35,
    applies: ({ input }) => input.action === "modify" && input.nationalityGroup === "third_country",
    evaluate: () => ({
      forceStatus: "review_required",
      patches: { workAuthorization: "review", confidence: "medium" },
      findings: [{
        id: "modify-review",
        title: "Modification à requalifier",
        detail: "Un changement de poste, d'employeur ou de contrat peut modifier le périmètre du droit au travail. Le moteur exige une nouvelle qualification du document et du contrat.",
        severity: "warning",
        sourceIds: ["ct-r5221-1"],
      }],
      checklist: [{
        id: "compare-contract",
        label: "Comparer l'ancien et le nouveau contrat / poste",
        status: "attention",
        sourceIds: ["ct-r5221-1"],
      }],
    }),
  },
  {
    id: "termination-no-right",
    version: 1,
    description: "Rupture lorsque le droit au travail n'est plus établi.",
    effectiveFrom: "2024-09-01",
    lastReviewed: "2026-09-09",
    sourceIds: ["sp-sanctions", "sp-autorisation-travail"],
    priority: 210,
    applies: ({ input }) => input.action === "terminate" && input.nationalityGroup === "third_country",
    evaluate: () => ({
      forceStatus: "review_required",
      patches: { confidence: "medium" },
      findings: [{
        id: "termination-special",
        title: "Rupture : branche droit social à valider",
        detail: "La rupture liée à la perte du droit au travail combine droit des étrangers et droit du travail. Le prototype prépare les contrôles mais ne génère pas automatiquement une décision de rupture.",
        severity: "warning",
        sourceIds: ["sp-sanctions"],
      }],
      checklist: [
        {
          id: "establish-right",
          label: "Établir précisément la date de fin du droit au travail",
          status: "attention",
          sourceIds: ["sp-autorisation-travail"],
        },
        {
          id: "legal-review-termination",
          label: "Faire valider la procédure de suspension / rupture et les sommes dues",
          status: "attention",
          sourceIds: ["sp-sanctions"],
        },
        {
          id: "document-decision",
          label: "Documenter les vérifications et la décision employeur",
          status: "todo",
          sourceIds: ["sp-sanctions"],
        },
      ],
    }),
  },
];
