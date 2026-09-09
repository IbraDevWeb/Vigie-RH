import type { LegalRule } from "../types";

export const studentFormalityRules: LegalRule[] = [
  {
    id: "student-prefecture-declaration",
    version: 1,
    description: "L'embauche d'un étudiant étranger nécessite une déclaration nominative préalable distincte.",
    effectiveFrom: "2021-04-01",
    lastReviewed: "2026-09-09",
    sourceIds: ["ct-r5221-27", "sp-autorisation-travail"],
    priority: 125,
    applies: ({ input }) => input.action === "hire"
      && input.nationalityGroup === "third_country"
      && input.permitType === "student",
    evaluate: ({ input }) => {
      const completed = input.studentPrefectureDeclarationCompleted === true;

      return {
        forceStatus: completed ? undefined : "conditional",
        findings: [{
          id: "student-prefecture-declaration-finding",
          title: completed
            ? "Déclaration nominative étudiante déclarée accomplie"
            : "Déclaration nominative étudiante à accomplir",
          detail: completed
            ? "La déclaration préalable propre à l'embauche de l'étudiant est déclarée comme accomplie. Conservez une preuve datée de la formalité."
            : "L'article R. 5221-27 prévoit une déclaration nominative préalable au préfet au moins deux jours ouvrables avant la date d'effet de l'embauche.",
          severity: completed ? "success" : "warning",
          sourceIds: ["ct-r5221-27", "sp-autorisation-travail"],
        }],
        checklist: [{
          id: "student-prefecture-declaration",
          label: "Effectuer la déclaration nominative préalable de l'embauche de l'étudiant",
          description: "À adresser au préfet au moins deux jours ouvrables avant la date d'effet de l'embauche.",
          status: completed ? "done" : "todo",
          sourceIds: ["ct-r5221-27", "sp-autorisation-travail"],
        }],
      };
    },
  },
];
