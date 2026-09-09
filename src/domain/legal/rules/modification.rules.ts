import type { AssessmentInput, LegalRule } from "../types";

function employeeScopedPermit(input: AssessmentInput): boolean {
  return input.nationalityGroup === "third_country"
    && ["employee", "temporary_worker"].includes(input.permitType);
}

function scopeSensitiveChange(input: AssessmentInput): boolean {
  return input.employerChanged === true
    || input.occupationChanged === true
    || input.regionChanged === true;
}

function onlyRemunerationOrTimeChange(input: AssessmentInput): boolean {
  return !input.newContract
    && !scopeSensitiveChange(input)
    && (input.salaryChanged === true || input.workingTimeChanged === true);
}

export const modificationRules: LegalRule[] = [
  {
    id: "modify-employee-scope-authorized",
    version: 1,
    description: "Modification d'activité, de zone ou d'employeur sans nouveau contrat, avec autorisation correspondant à la configuration modifiée déclarée obtenue.",
    effectiveFrom: "2024-01-28",
    lastReviewed: "2026-09-09",
    sourceIds: ["ct-l5221-7", "sp-autorisation-travail"],
    priority: 185,
    applies: ({ input }) => input.action === "modify"
      && employeeScopedPermit(input)
      && !input.newContract
      && scopeSensitiveChange(input)
      && input.workAuthorizationGrantedForModification === true,
    evaluate: ({ input }) => ({
      patches: {
        canWorkNow: true,
        workAuthorization: "yes",
        confidence: "high",
      },
      findings: [{
        id: "modify-scope-authorized",
        title: "Autorisation déclarée obtenue pour la configuration modifiée",
        detail: "Une autorisation correspondant à la modification analysée est déclarée comme obtenue. Le moteur n'en déduit pas qu'une nouvelle autorisation était nécessaire dans tous les cas ; il constate uniquement que le nouveau périmètre déclaré est couvert par une décision fournie.",
        severity: "success",
        sourceIds: ["ct-l5221-7", "sp-autorisation-travail"],
      }],
      checklist: [{
        id: "archive-modification-authorization",
        label: "Archiver l'autorisation couvrant la configuration modifiée",
        description: `Date d'effet envisagée : ${input.modificationEffectiveDate ?? "non renseignée"}`,
        status: "todo",
        sourceIds: ["ct-l5221-7", "sp-autorisation-travail"],
      }],
    }),
  },
  {
    id: "modify-employee-scope-review",
    version: 1,
    description: "Modification d'activité, de zone ou d'employeur sans nouveau contrat : comparer le périmètre de l'autorisation existante avant de conclure.",
    effectiveFrom: "2024-01-28",
    lastReviewed: "2026-09-09",
    sourceIds: ["ct-l5221-7", "sp-autorisation-travail"],
    priority: 180,
    applies: ({ input }) => input.action === "modify"
      && employeeScopedPermit(input)
      && !input.newContract
      && scopeSensitiveChange(input)
      && input.workAuthorizationGrantedForModification !== true,
    evaluate: ({ input }) => ({
      forceStatus: "review_required",
      patches: {
        canWorkNow: null,
        workAuthorization: "review",
        confidence: "low",
      },
      findings: [{
        id: "modify-scope-review",
        title: "Périmètre de l'autorisation actuelle à comparer",
        detail: "L'article L. 5221-7 prévoit qu'une autorisation de travail peut être limitée à certaines activités professionnelles ou zones géographiques. Les données fournies ne permettent pas d'établir que l'autorisation actuelle couvre la configuration modifiée, mais le moteur ne transforme pas non plus automatiquement tout changement interne en obligation de nouvelle autorisation.",
        severity: "warning",
        sourceIds: ["ct-l5221-7", "sp-autorisation-travail"],
      }],
      checklist: [
        {
          id: "compare-authorization-scope",
          label: "Comparer la décision d'autorisation actuelle avec le nouveau poste, la nouvelle zone et l'employeur",
          status: "attention",
          sourceIds: ["ct-l5221-7", "sp-autorisation-travail"],
        },
        ...(input.employerChanged === true ? [{
          id: "qualify-employer-change-contract",
          label: "Qualifier si le changement d'employeur entraîne un nouveau contrat soumis à R. 5221-1",
          status: "attention" as const,
          sourceIds: ["ct-r5221-1"],
        }] : []),
      ],
    }),
  },
  {
    id: "modify-employee-remuneration-time-review",
    version: 1,
    description: "Modification limitée à la rémunération ou au temps de travail : le prototype ne déduit pas automatiquement son effet sur une autorisation existante.",
    effectiveFrom: "2024-09-01",
    lastReviewed: "2026-09-09",
    sourceIds: ["ct-r5221-20", "sp-autorisation-travail"],
    priority: 175,
    applies: ({ input }) => input.action === "modify"
      && employeeScopedPermit(input)
      && onlyRemunerationOrTimeChange(input),
    evaluate: ({ input }) => ({
      forceStatus: "review_required",
      patches: {
        canWorkNow: null,
        workAuthorization: "review",
        confidence: "low",
      },
      findings: [{
        id: "modify-remuneration-time-review",
        title: "Effet de la modification contractuelle à qualifier",
        detail: "La modification déclarée porte uniquement sur la rémunération et/ou le temps de travail. L'article R. 5221-20 traite notamment la rémunération comme critère de délivrance d'une autorisation, mais les sources modélisées ne permettent pas de conclure automatiquement qu'une telle modification impose — ou n'impose pas — une nouvelle autorisation dans tous les cas.",
        severity: "warning",
        sourceIds: ["ct-r5221-20", "sp-autorisation-travail"],
      }],
      checklist: [
        ...(input.salaryChanged === true ? [{
          id: "verify-modified-remuneration",
          label: "Vérifier la conformité de la nouvelle rémunération au minimum légal et conventionnel applicable",
          status: "attention" as const,
          sourceIds: ["ct-r5221-20"],
        }] : []),
        {
          id: "qualify-contractual-modification",
          label: "Faire confirmer l'effet de la modification sur l'autorisation existante avant sa date d'effet",
          status: "attention",
          sourceIds: ["sp-autorisation-travail"],
        },
      ],
    }),
  },
];
