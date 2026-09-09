import type { LegalRule } from "../types";

function isPermitCurrent(validUntil: string | undefined, today: Date): boolean {
  if (!validUntil) return false;
  const end = new Date(`${validUntil}T23:59:59`);
  return end.getTime() >= today.getTime();
}

export const canWorkRules: LegalRule[] = [
  {
    id: "can-work-employee-current-scope",
    version: 1,
    description: "Pour un titre salarié ou travailleur temporaire valide, vérifier que l'activité actuelle est couverte par l'autorisation correspondant au contrat en cours.",
    effectiveFrom: "2024-09-01",
    lastReviewed: "2026-09-09",
    sourceIds: ["ct-r5221-1", "ct-l5221-7", "sp-autorisation-travail"],
    priority: 155,
    applies: ({ input, today }) => input.action === "can_work"
      && input.nationalityGroup === "third_country"
      && ["employee", "temporary_worker"].includes(input.permitType)
      && isPermitCurrent(input.permitValidUntil, today),
    evaluate: ({ input }) => {
      if (input.workAuthorizationGrantedForContract === true) {
        return {
          patches: {
            canWorkNow: true,
            workAuthorization: "yes",
            employerVerification: "not_applicable",
            employmentSituation: "not_applicable",
            shortageOccupation: "not_applicable",
            confidence: "high",
          },
          findings: [{
            id: "current-contract-covered",
            title: "Contrat actuel déclaré couvert par l'autorisation",
            detail: "Le titre est déclaré valide et l'autorisation correspondant au contrat actuel est déclarée comme couvrant l'activité exercée. Le contrôle reste limité aux faits renseignés et à l'authenticité des justificatifs conservés.",
            severity: "success",
            sourceIds: ["ct-r5221-1", "ct-l5221-7", "sp-autorisation-travail"],
          }],
          checklist: [{
            id: "archive-current-authorization",
            label: "Conserver le titre et la preuve de l'autorisation correspondant au contrat actuel",
            status: "todo",
            sourceIds: ["ct-r5221-1", "ct-l5221-7"],
          }],
        };
      }

      if (input.workAuthorizationGrantedForContract === false) {
        return {
          forceStatus: "blocked",
          patches: {
            canWorkNow: false,
            workAuthorization: "yes",
            employerVerification: "not_applicable",
            employmentSituation: "not_applicable",
            shortageOccupation: "not_applicable",
            confidence: "high",
          },
          findings: [{
            id: "current-contract-not-covered",
            title: "Contrat actuel déclaré non couvert",
            detail: "Le contrat ou l'activité actuelle n'est pas déclaré comme couvert par l'autorisation associée. Le moteur n'établit donc pas de droit au travail pour cette activité en l'état.",
            severity: "danger",
            sourceIds: ["ct-r5221-1", "ct-l5221-7", "sp-autorisation-travail"],
          }],
          checklist: [{
            id: "stop-current-uncovered-work",
            label: "Ne pas maintenir l'activité déclarée tant qu'un droit au travail adapté n'est pas établi",
            status: "blocked",
            sourceIds: ["ct-r5221-1", "sp-sanctions"],
          }],
        };
      }

      return {
        forceStatus: "review_required",
        patches: {
          canWorkNow: null,
          workAuthorization: "review",
          employerVerification: "not_applicable",
          employmentSituation: "not_applicable",
          shortageOccupation: "not_applicable",
          confidence: "low",
        },
        findings: [{
          id: "current-contract-scope-unknown",
          title: "Périmètre de l'autorisation actuelle à vérifier",
          detail: "Le moteur ne sait pas si le contrat, l'activité et la zone d'emploi actuels correspondent au périmètre autorisé. L'article L. 5221-7 permet qu'une autorisation soit limitée à certaines activités ou zones géographiques ; aucune conclusion positive n'est donc déduite sans contrôle.",
          severity: "warning",
          sourceIds: ["ct-l5221-7", "sp-autorisation-travail"],
        }],
        checklist: [{
          id: "compare-current-authorization-scope",
          label: "Comparer l'autorisation conservée au contrat, au poste et à la zone d'emploi actuels",
          status: "attention",
          sourceIds: ["ct-l5221-7"],
        }],
      };
    },
  },
  {
    id: "can-work-student-over-limit",
    version: 2,
    description: "Pour un étudiant dépassant 964 heures annuelles hors exception apprentissage modélisée, contrôler l'autorisation correspondant à l'activité actuelle.",
    effectiveFrom: "2026-04-26",
    lastReviewed: "2026-09-09",
    sourceIds: ["ct-r5221-2", "sp-autorisation-travail"],
    priority: 145,
    applies: ({ input, today }) => input.action === "can_work"
      && input.nationalityGroup === "third_country"
      && input.permitType === "student"
      && isPermitCurrent(input.permitValidUntil, today)
      && typeof input.studentHoursPlanned === "number"
      && input.studentHoursPlanned > 964
      && input.isApprenticeship !== true,
    evaluate: ({ input }) => {
      if (input.workAuthorizationGrantedForContract === true) {
        return {
          patches: {
            canWorkNow: true,
            workAuthorization: "yes",
            employerVerification: "not_applicable",
            confidence: "high",
          },
          findings: [{
            id: "can-work-student-over-limit",
            title: "Autorisation déclarée obtenue pour l'activité étudiante au-delà de 964 h/an",
            detail: "Le volume annuel déclaré dépasse 964 heures et l'autorisation correspondant à l'activité actuelle est déclarée comme obtenue.",
            severity: "success",
            sourceIds: ["ct-r5221-2", "sp-autorisation-travail"],
          }],
          checklist: [{
            id: "can-work-student-authorization-proof",
            label: "Conserver la preuve de l'autorisation correspondant au contrat et au volume de travail actuels",
            status: "todo",
            sourceIds: ["ct-r5221-2", "sp-autorisation-travail"],
          }],
        };
      }

      if (input.workAuthorizationGrantedForContract === false) {
        return {
          forceStatus: "blocked",
          patches: {
            canWorkNow: false,
            workAuthorization: "yes",
            employerVerification: "not_applicable",
            confidence: "high",
          },
          findings: [{
            id: "can-work-student-over-limit",
            title: "Droit au travail non établi au-delà de 964 h/an",
            detail: "Le volume annuel déclaré dépasse 964 heures et aucune autorisation correspondant à l'activité actuelle n'est déclarée comme obtenue. Le moteur ne valide donc pas le maintien au travail dans cette configuration.",
            severity: "danger",
            sourceIds: ["ct-r5221-2", "sp-autorisation-travail"],
          }],
          checklist: [{
            id: "can-work-student-authorization-proof",
            label: "Ne pas maintenir cette configuration tant que l'autorisation nécessaire n'est pas établie",
            status: "blocked",
            sourceIds: ["ct-r5221-2", "sp-autorisation-travail"],
          }],
        };
      }

      return {
        forceStatus: "review_required",
        patches: {
          canWorkNow: null,
          workAuthorization: "review",
          employerVerification: "not_applicable",
          confidence: "low",
        },
        findings: [{
          id: "can-work-student-over-limit",
          title: "Autorisation au-delà de 964 h/an à confirmer",
          detail: "Le volume annuel déclaré dépasse 964 heures mais la présence d'une autorisation correspondant à l'activité actuelle n'est pas établie. Le moteur conserve cette donnée comme inconnue.",
          severity: "warning",
          sourceIds: ["ct-r5221-2", "sp-autorisation-travail"],
        }],
        checklist: [{
          id: "can-work-student-authorization-proof",
          label: "Vérifier et archiver l'autorisation correspondant au contrat et au volume de travail actuels",
          status: "attention",
          sourceIds: ["ct-r5221-2", "sp-autorisation-travail"],
        }],
      };
    },
  },
  {
    id: "can-work-operational-check",
    version: 1,
    description: "Checklist opérationnelle du contrôle ponctuel du droit au travail.",
    effectiveFrom: "2024-09-01",
    lastReviewed: "2026-09-09",
    sourceIds: ["sp-autorisation-travail"],
    priority: 25,
    applies: ({ input }) => input.action === "can_work" && input.nationalityGroup === "third_country",
    evaluate: () => ({
      checklist: [{
        id: "can-work-archive-check",
        label: "Archiver les justificatifs utilisés pour le contrôle du jour",
        status: "todo",
        sourceIds: ["sp-autorisation-travail"],
      }],
    }),
  },
];
