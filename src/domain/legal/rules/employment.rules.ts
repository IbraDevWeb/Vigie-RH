import type { AssessmentInput, LegalRule } from "../types";

function requiresWorkAuthorization(input: AssessmentInput): boolean {
  if (input.nationalityGroup !== "third_country") return false;
  if (input.permitType === "none") return true;
  if (["employee", "temporary_worker"].includes(input.permitType) && input.newContract && ["hire", "modify"].includes(input.action)) return true;
  return input.permitType === "student"
    && typeof input.studentHoursPlanned === "number"
    && input.studentHoursPlanned > 964
    && input.isApprenticeship !== true;
}

function requiresEmploymentSituationCheck(input: AssessmentInput): boolean {
  return requiresWorkAuthorization(input) && input.workAuthorizationGrantedForContract !== true;
}

export const employmentRules: LegalRule[] = [
  {
    id: "no-permit-third-country",
    version: 2,
    description: "Pays tiers sans titre/document autorisant le travail : autorisation à instruire et droit au travail non établi.",
    effectiveFrom: "2024-09-01",
    lastReviewed: "2026-09-09",
    sourceIds: ["ct-r5221-1", "sp-autorisation-travail"],
    priority: 150,
    applies: ({ input }) => input.nationalityGroup === "third_country" && input.permitType === "none",
    evaluate: ({ input }) => ({
      forceStatus: "conditional",
      patches: { canWorkNow: false, workAuthorization: "yes", confidence: "high" },
      findings: [{
        id: "at-required",
        title: input.workAuthorizationGrantedForContract === true ? "Autorisation de travail déclarée obtenue, document de séjour à compléter" : "Autorisation de travail à instruire",
        detail: input.location === "abroad"
          ? "Le candidat est hors de France : l'autorisation de travail s'inscrit dans un parcours d'introduction plus large. Le moteur ne considère pas la prise de poste en France comme possible sur la seule base de cette donnée."
          : "Aucun document autorisant le séjour et le travail n'est renseigné. Le droit au travail n'est donc pas établi pour une prise de poste immédiate.",
        severity: "warning",
        sourceIds: ["ct-r5221-1", "sp-autorisation-travail"],
      }],
      checklist: [
        {
          id: "employment-situation",
          label: "Vérifier la situation de l'emploi / le métier en tension",
          status: input.workAuthorizationGrantedForContract === true ? "done" : "todo",
          sourceIds: ["ct-r5221-20", "arrete-metiers-2025", "sp-autorisation-travail"],
        },
        {
          id: "work-permit-apply",
          label: "Déposer ou contrôler la demande d'autorisation de travail",
          status: input.workAuthorizationGrantedForContract === true ? "done" : "todo",
          sourceIds: ["ct-r5221-1"],
        },
        {
          id: "wait-right",
          label: "Attendre que le droit au travail et le document de séjour soient établis avant la prise de poste",
          status: "blocked",
          sourceIds: ["ct-r5221-1"],
        },
      ],
    }),
  },
  {
    id: "employee-card-new-contract",
    version: 2,
    description: "Nouveau contrat avec titre salarié/travailleur temporaire : nouvelle autorisation de travail à contrôler.",
    effectiveFrom: "2024-09-01",
    lastReviewed: "2026-09-09",
    sourceIds: ["ct-r5221-1", "sp-autorisation-travail"],
    priority: 120,
    applies: ({ input }) => input.nationalityGroup === "third_country"
      && ["hire", "modify"].includes(input.action)
      && input.newContract
      && ["employee", "temporary_worker"].includes(input.permitType),
    evaluate: ({ input }) => {
      const granted = input.workAuthorizationGrantedForContract === true;
      return {
        forceStatus: granted ? undefined : "conditional",
        patches: {
          canWorkNow: input.action === "hire" ? granted : null,
          workAuthorization: "yes",
          confidence: granted ? "high" : "medium",
        },
        findings: [{
          id: "new-contract-at",
          title: granted ? "Autorisation déclarée obtenue pour le nouveau contrat" : "Nouveau contrat : autorisation à obtenir",
          detail: granted
            ? "L'autorisation correspondant au nouveau contrat est déclarée comme obtenue. Le moteur conserve néanmoins les autres contrôles préalables à l'embauche."
            : "L'article R. 5221-1 prévoit qu'un nouveau contrat de travail fait l'objet d'une demande d'autorisation de travail. La prise de poste ne doit pas être autorisée sur la seule base de l'ancien contrat.",
          severity: granted ? "success" : "warning",
          sourceIds: ["ct-r5221-1", "sp-autorisation-travail"],
        }],
        checklist: [{
          id: "new-contract-at-check",
          label: "Déposer ou contrôler l'autorisation correspondant au nouveau contrat",
          status: granted ? "done" : "attention",
          sourceIds: ["ct-r5221-1"],
        }],
      };
    },
  },
  {
    id: "student-964",
    version: 3,
    description: "Étudiant : dispense jusqu'à 964 heures/an et traitement de l'exception apprentissage au-delà.",
    effectiveFrom: "2026-04-26",
    lastReviewed: "2026-09-09",
    sourceIds: ["ct-r5221-2", "sp-autorisation-travail"],
    priority: 130,
    applies: ({ input }) => input.nationalityGroup === "third_country" && input.permitType === "student",
    evaluate: ({ input }) => {
      if (typeof input.studentHoursPlanned !== "number") {
        return {
          forceStatus: "review_required",
          patches: { canWorkNow: null, workAuthorization: "review", confidence: "low" },
          findings: [{
            id: "student-hours-missing",
            title: "Volume annuel de travail manquant",
            detail: "Le plafond annuel prévu pour le titre étudiant doit être comparé au volume envisagé avant de conclure.",
            severity: "warning",
            sourceIds: ["ct-r5221-2", "sp-autorisation-travail"],
          }],
        };
      }

      if (input.studentHoursPlanned <= 964) {
        return {
          patches: {
            canWorkNow: true,
            workAuthorization: "no",
            employmentSituation: "not_applicable",
            shortageOccupation: "not_applicable",
            confidence: "high",
          },
          findings: [{
            id: "student-under-limit",
            title: "Volume déclaré dans la limite de 964 h/an",
            detail: "Dans le cas général modélisé, le titre étudiant permet une activité salariée accessoire jusqu'à 964 heures par an sans autorisation de travail distincte.",
            severity: "success",
            sourceIds: ["ct-r5221-2", "sp-autorisation-travail"],
          }],
          checklist: input.action === "hire" ? [{
            id: "student-prefecture-declaration",
            label: "Effectuer la formalité préfectorale propre à l'embauche d'un étudiant étranger",
            description: "Service-Public indique une déclaration nominative à anticiper avant l'embauche.",
            status: "todo",
            sourceIds: ["sp-autorisation-travail"],
          }] : [],
        };
      }

      if (input.isApprenticeship === true) {
        if (input.apprenticeshipValidated === true) {
          return {
            patches: {
              canWorkNow: true,
              workAuthorization: "no",
              employmentSituation: "not_applicable",
              shortageOccupation: "not_applicable",
              confidence: "high",
            },
            findings: [{
              id: "student-apprenticeship-exempt",
              title: "Apprentissage déclaré comme validé",
              detail: "L'exception apprentissage est appliquée uniquement parce que le contrat est déclaré comme validé dans le cadre requis. Conservez la preuve de cette validation.",
              severity: "success",
              sourceIds: ["ct-r5221-2", "sp-autorisation-travail"],
            }],
          };
        }

        return {
          forceStatus: "review_required",
          patches: { canWorkNow: null, workAuthorization: "review", confidence: "low" },
          findings: [{
            id: "student-apprenticeship-review",
            title: "Validation de l'apprentissage à confirmer",
            detail: "Le moteur ne peut appliquer l'exception apprentissage sans confirmation de la validation du contrat par le service compétent.",
            severity: "warning",
            sourceIds: ["ct-r5221-2", "sp-autorisation-travail"],
          }],
        };
      }

      const granted = input.workAuthorizationGrantedForContract === true;
      return {
        forceStatus: granted ? undefined : "conditional",
        patches: {
          canWorkNow: input.action === "hire" ? granted : null,
          workAuthorization: "yes",
          confidence: granted ? "high" : "medium",
        },
        findings: [{
          id: "student-over-limit",
          title: granted ? "Autorisation déclarée obtenue au-delà de 964 h/an" : "Autorisation à instruire au-delà de 964 h/an",
          detail: granted
            ? "Le volume déclaré dépasse 964 heures et l'autorisation correspondante est déclarée comme obtenue pour le contrat."
            : "Le volume déclaré dépasse 964 heures sur l'année et le contrat n'est pas renseigné comme apprentissage relevant de l'exception modélisée. Une autorisation de travail doit être instruite avant la prise de poste.",
          severity: granted ? "success" : "warning",
          sourceIds: ["ct-r5221-2", "sp-autorisation-travail"],
        }],
        checklist: [{
          id: "student-employment-situation",
          label: "Vérifier le métier en tension ou le test du marché de l'emploi",
          status: granted ? "done" : "todo",
          sourceIds: ["ct-r5221-20", "sp-autorisation-travail", "arrete-metiers-2025"],
        }],
      };
    },
  },
  {
    id: "work-authorization-delivery-criteria",
    version: 1,
    description: "Lorsque l'autorisation doit encore être instruite, rappeler les autres critères de délivrance non automatisés.",
    effectiveFrom: "2024-09-01",
    lastReviewed: "2026-09-09",
    sourceIds: ["ct-r5221-20", "sp-autorisation-travail"],
    priority: 95,
    applies: ({ input }) => requiresWorkAuthorization(input) && input.workAuthorizationGrantedForContract !== true,
    evaluate: ({ input }) => ({
      findings: [{
        id: "work-authorisation-criteria",
        title: "Autres critères de délivrance à contrôler",
        detail: `Rémunération brute mensuelle déclarée : ${typeof input.salaryGrossMonthly === "number" ? `${input.salaryGrossMonthly.toLocaleString("fr-FR")} €` : "non renseignée"}. Le moteur ne déduit pas automatiquement la conformité au SMIC ou au minimum conventionnel et ne tranche pas les conditions réglementées d'exercice du métier.`,
        severity: "info",
        sourceIds: ["ct-r5221-20", "sp-autorisation-travail"],
      }],
      checklist: [
        {
          id: "check-remuneration",
          label: "Vérifier la rémunération minimale légale et conventionnelle applicable",
          status: "todo",
          sourceIds: ["ct-r5221-20"],
        },
        {
          id: "check-employer-criteria",
          label: "Vérifier les conditions liées à l'employeur prévues pour la délivrance",
          status: "todo",
          sourceIds: ["ct-r5221-20"],
        },
        {
          id: "check-regulated-occupation",
          label: "Vérifier les conditions d'exercice si la profession est réglementée",
          status: "todo",
          sourceIds: ["ct-r5221-20"],
        },
      ],
    }),
  },
  {
    id: "employment-situation-shortage",
    version: 2,
    description: "Métier en tension : critère relatif à l'emploi déclaré comme satisfait.",
    effectiveFrom: "2025-05-23",
    lastReviewed: "2026-09-09",
    sourceIds: ["ct-r5221-20", "arrete-metiers-2025", "sp-autorisation-travail"],
    priority: 90,
    applies: ({ input }) => requiresEmploymentSituationCheck(input) && input.jobInShortageList === true,
    evaluate: ({ input }) => ({
      patches: { employmentSituation: "yes", shortageOccupation: "yes" },
      findings: [{
        id: "shortage",
        title: "Métier déclaré en tension",
        detail: `Le métier est déclaré présent sur la liste applicable${input.region ? ` en ${input.region}` : ""}. La référence exacte de la ligne et de la zone doit être conservée dans le dossier.`,
        severity: "success",
        sourceIds: ["ct-r5221-20", "arrete-metiers-2025", "sp-autorisation-travail"],
      }],
    }),
  },
  {
    id: "employment-situation-market-test",
    version: 2,
    description: "Test du marché de l'emploi : publication trois semaines et absence de candidature valable déclarées.",
    effectiveFrom: "2024-09-01",
    lastReviewed: "2026-09-09",
    sourceIds: ["ct-r5221-20", "sp-autorisation-travail"],
    priority: 85,
    applies: ({ input }) => requiresEmploymentSituationCheck(input)
      && input.jobInShortageList !== true
      && input.offerPublishedThreeWeeks === true
      && input.noValidCandidateReceived === true,
    evaluate: ({ input }) => ({
      patches: {
        employmentSituation: "yes",
        shortageOccupation: input.jobInShortageList === false ? "no" : "review",
      },
      findings: [{
        id: "market-test",
        title: "Test du marché de l'emploi déclaré comme rempli",
        detail: "Une publication de trois semaines et l'absence de candidature valable sont déclarées. Les preuves de publication, dates et résultats doivent être archivées avant d'utiliser ce critère.",
        severity: "success",
        sourceIds: ["ct-r5221-20", "sp-autorisation-travail"],
      }],
    }),
  },
  {
    id: "employment-situation-unresolved",
    version: 2,
    description: "Situation de l'emploi non établie automatiquement lorsque ni métier en tension ni test du marché complet ne sont confirmés.",
    effectiveFrom: "2025-05-23",
    lastReviewed: "2026-09-09",
    sourceIds: ["ct-r5221-20", "arrete-metiers-2025", "sp-autorisation-travail"],
    priority: 80,
    applies: ({ input }) => requiresEmploymentSituationCheck(input)
      && input.jobInShortageList !== true
      && !(input.offerPublishedThreeWeeks === true && input.noValidCandidateReceived === true),
    evaluate: ({ input }) => ({
      patches: {
        employmentSituation: "review",
        shortageOccupation: input.jobInShortageList === false ? "no" : "review",
      },
      findings: [{
        id: "employment-situation-review",
        title: "Situation de l'emploi à compléter",
        detail: input.offerPublishedThreeWeeks === true && input.noValidCandidateReceived === false
          ? "Une publication de trois semaines est déclarée mais une candidature valable a été reçue. Le moteur ne considère donc pas ce test comme satisfait et n'extrapole pas sur les autres voies possibles."
          : "Ni l'inscription du métier sur la liste en tension ni un test du marché de l'emploi complet ne sont établis dans les données fournies.",
        severity: "warning",
        sourceIds: ["ct-r5221-20", "arrete-metiers-2025", "sp-autorisation-travail"],
      }],
      checklist: [{
        id: "complete-employment-situation",
        label: "Compléter et documenter la situation de l'emploi avant le dépôt",
        status: "attention",
        sourceIds: ["ct-r5221-20", "arrete-metiers-2025", "sp-autorisation-travail"],
      }],
    }),
  },
];
