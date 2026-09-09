import type { LegalRule } from "../types";

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
    id: "renew-action",
    version: 3,
    description: "Cadre opérationnel du workflow de renouvellement.",
    effectiveFrom: "2021-05-01",
    lastReviewed: "2026-09-09",
    sourceIds: ["ceseda-r431-15-1", "sp-autorisation-travail"],
    priority: 30,
    applies: ({ input }) => input.action === "renew",
    evaluate: ({ input }) => {
      const completed = input.renewalProofType === "new_permit";
      const proofExists = Boolean(input.renewalProofType) && input.renewalProofType !== "none";
      const pending = input.nationalityGroup === "third_country" && (input.renewalFiled === true || proofExists) && !completed;
      return {
        forceStatus: pending ? "conditional" : undefined,
        checklist: [
          {
            id: "collect-renewal",
            label: "Collecter et archiver le justificatif de renouvellement",
            status: input.renewalFiled === true || proofExists ? "done" : "todo",
            sourceIds: ["ceseda-r431-15-1", "sp-autorisation-travail"],
          },
          {
            id: "check-temp-right",
            label: "Contrôler le droit au travail pendant toute l'instruction",
            status: completed ? "done" : "attention",
            sourceIds: ["sp-autorisation-travail"],
          },
          {
            id: "update-file",
            label: "Mettre à jour l'échéance et archiver le nouveau titre à réception",
            status: completed ? "done" : "todo",
            sourceIds: ["sp-autorisation-travail"],
          },
        ],
      };
    },
  },
  {
    id: "modify-action",
    version: 2,
    description: "Cadre opérationnel du workflow de modification sans préjuger du verdict juridique.",
    effectiveFrom: "2024-09-01",
    lastReviewed: "2026-09-09",
    sourceIds: ["ct-r5221-1", "ct-l5221-7"],
    priority: 30,
    applies: ({ input }) => input.action === "modify" && input.nationalityGroup === "third_country",
    evaluate: ({ input }) => ({
      checklist: [
        {
          id: "compare-contract",
          label: "Comparer la situation actuelle et la configuration après modification",
          status: "done",
          sourceIds: ["ct-r5221-1", "ct-l5221-7"],
        },
        {
          id: "archive-modification-decision",
          label: "Archiver les justificatifs et la décision relative à la modification",
          status: input.workAuthorizationGrantedForContract === true || input.workAuthorizationGrantedForModification === true ? "todo" : "attention",
          sourceIds: ["ct-r5221-1", "ct-l5221-7"],
        },
      ],
    }),
  },
];
