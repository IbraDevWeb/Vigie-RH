import type { LegalRule } from "../types";

export const actionRules: LegalRule[] = [
  {
    id: "renew-action",
    description: "Workflow de renouvellement.",
    effectiveFrom: "2024-09-01",
    lastReviewed: "2026-09-09",
    priority: 30,
    applies: ({ input }) => input.action === "renew",
    evaluate: () => ({
      checklist: [
        { id: "collect-renewal", label: "Collecter le justificatif de dépôt / renouvellement", status: "todo", sourceIds: ["sp-autorisation-travail"] },
        { id: "check-temp-right", label: "Contrôler le droit au travail pendant l'instruction", status: "attention", sourceIds: ["sp-autorisation-travail"] },
        { id: "update-file", label: "Mettre à jour la date d'échéance et archiver le nouveau titre", status: "todo", sourceIds: ["sp-autorisation-travail"] },
      ],
      sourceIds: ["sp-autorisation-travail"],
    }),
  },
  {
    id: "modify-action",
    description: "Modification du contrat ou du poste.",
    effectiveFrom: "2024-09-01",
    lastReviewed: "2026-09-09",
    priority: 35,
    applies: ({ input }) => input.action === "modify" && input.nationalityGroup === "third_country",
    evaluate: () => ({
      forceStatus: "review_required",
      patches: { workAuthorization: "review", confidence: "medium" },
      findings: [{ id: "modify-review", title: "Modification à requalifier", detail: "Un changement de poste, d'employeur ou de contrat peut modifier le périmètre du droit au travail. Le moteur exige une nouvelle qualification du document et du contrat.", severity: "warning", sourceIds: ["ct-r5221-1"] }],
      checklist: [{ id: "compare-contract", label: "Comparer l'ancien et le nouveau contrat / poste", status: "attention", sourceIds: ["ct-r5221-1"] }],
      sourceIds: ["ct-r5221-1"],
    }),
  },
  {
    id: "termination-no-right",
    description: "Rupture lorsque le droit au travail n'est plus établi.",
    effectiveFrom: "2024-09-01",
    lastReviewed: "2026-09-09",
    priority: 210,
    applies: ({ input }) => input.action === "terminate" && input.nationalityGroup === "third_country",
    evaluate: () => ({
      forceStatus: "review_required",
      patches: { confidence: "medium" },
      findings: [{ id: "termination-special", title: "Rupture : branche droit social à valider", detail: "La rupture liée à la perte du droit au travail combine droit des étrangers et droit du travail. Le prototype prépare les contrôles mais ne génère pas automatiquement une décision de rupture.", severity: "warning", sourceIds: ["sp-sanctions"] }],
      checklist: [
        { id: "establish-right", label: "Établir précisément la date de fin du droit au travail", status: "attention", sourceIds: ["sp-autorisation-travail"] },
        { id: "legal-review-termination", label: "Faire valider la procédure de suspension / rupture et les sommes dues", status: "attention", sourceIds: ["sp-sanctions"] },
        { id: "document-decision", label: "Documenter les vérifications et la décision employeur", status: "todo", sourceIds: ["sp-sanctions"] },
      ],
      sourceIds: ["sp-sanctions", "sp-autorisation-travail"],
    }),
  },
];
