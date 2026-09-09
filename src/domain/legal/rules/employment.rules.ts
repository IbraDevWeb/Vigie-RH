import type { LegalRule } from "../types";

export const employmentRules: LegalRule[] = [
  {
    id: "no-permit-third-country",
    description: "Pays tiers sans titre/document autorisant le travail.",
    effectiveFrom: "2024-09-01",
    lastReviewed: "2026-09-09",
    priority: 150,
    applies: ({ input }) => input.nationalityGroup === "third_country" && input.permitType === "none",
    evaluate: ({ input }) => ({
      forceStatus: "conditional",
      patches: { canWorkNow: false, workAuthorization: "yes", confidence: "high" },
      sourceIds: ["ct-r5221-1", "sp-autorisation-travail"],
      findings: [{ id: "at-required", title: "Autorisation de travail à instruire", detail: input.location === "abroad" ? "Le candidat est hors de France : la procédure d'introduction et l'autorisation de travail doivent être préparées avant la prise de poste." : "Aucun titre autorisant le travail n'est renseigné : une autorisation de travail doit être instruite avant la prise de poste.", severity: "warning", sourceIds: ["ct-r5221-1", "sp-autorisation-travail"] }],
      checklist: [
        { id: "employment-situation", label: "Vérifier la situation de l'emploi / métier en tension", status: "todo", sourceIds: ["arrete-metiers-2025", "sp-autorisation-travail"] },
        { id: "work-permit-apply", label: "Déposer la demande d'autorisation de travail", status: "todo", sourceIds: ["ct-r5221-1"] },
        { id: "wait-right", label: "Attendre que le droit au travail soit établi avant la prise de poste", status: "blocked", sourceIds: ["ct-r5221-1"] },
      ],
    }),
  },
  {
    id: "employee-card-new-contract",
    description: "Nouveau contrat avec titre salarié/travailleur temporaire : réexamen requis.",
    effectiveFrom: "2024-09-01",
    lastReviewed: "2026-09-09",
    priority: 120,
    applies: ({ input }) => input.nationalityGroup === "third_country" && ["hire", "modify"].includes(input.action) && input.newContract && ["employee", "temporary_worker"].includes(input.permitType),
    evaluate: () => ({
      forceStatus: "conditional",
      patches: { canWorkNow: null, workAuthorization: "yes", confidence: "medium" },
      sourceIds: ["ct-r5221-1", "sp-autorisation-travail"],
      findings: [{ id: "new-contract-at", title: "Nouveau contrat : nouvelle analyse d'autorisation", detail: "Le nouveau contrat doit être contrôlé au regard de l'autorisation de travail. Le prototype demande une validation du périmètre exact du titre avant de conclure sur une prise de poste immédiate.", severity: "warning", sourceIds: ["ct-r5221-1"] }],
      checklist: [{ id: "new-contract-at-check", label: "Contrôler / déposer l'autorisation liée au nouveau contrat", status: "attention", sourceIds: ["ct-r5221-1"] }],
    }),
  },
  {
    id: "student-964",
    description: "Étudiant : travail sans autorisation distincte dans la limite de 964 heures/an, hors régimes spéciaux.",
    effectiveFrom: "2024-09-01",
    lastReviewed: "2026-09-09",
    priority: 130,
    applies: ({ input }) => input.nationalityGroup === "third_country" && input.permitType === "student",
    evaluate: ({ input }) => {
      if (typeof input.studentHoursPlanned !== "number") {
        return { forceStatus: "review_required", patches: { canWorkNow: null, workAuthorization: "review", confidence: "low" }, findings: [{ id: "student-hours-missing", title: "Volume annuel de travail manquant", detail: "Le plafond annuel prévu pour le titre étudiant doit être comparé au volume envisagé.", severity: "warning", sourceIds: ["sp-autorisation-travail"] }], sourceIds: ["sp-autorisation-travail"] };
      }
      if (input.studentHoursPlanned <= 964) {
        return { patches: { canWorkNow: true, workAuthorization: "no", confidence: "high" }, findings: [{ id: "student-under-limit", title: "Volume déclaré dans la limite de 964 h/an", detail: "Dans le cas général modélisé, le titre étudiant permet un travail salarié jusqu'à 964 heures par an sans autorisation de travail distincte.", severity: "success", sourceIds: ["sp-autorisation-travail"] }], sourceIds: ["sp-autorisation-travail"] };
      }
      return { forceStatus: "conditional", patches: { canWorkNow: null, workAuthorization: "yes", confidence: "high" }, findings: [{ id: "student-over-limit", title: "Autorisation à instruire au-delà de 964 h/an", detail: "Le volume déclaré dépasse 964 heures sur l'année. Une autorisation de travail est requise dans le cas général modélisé.", severity: "warning", sourceIds: ["sp-autorisation-travail"] }], checklist: [{ id: "student-employment-situation", label: "Vérifier métier en tension ou publication de l'offre", status: "todo", sourceIds: ["sp-autorisation-travail", "arrete-metiers-2025"] }], sourceIds: ["sp-autorisation-travail", "arrete-metiers-2025"] };
    },
  },
  {
    id: "employment-situation-check",
    description: "Lorsque l'autorisation est requise, vérifier métier en tension ou publication.",
    effectiveFrom: "2025-05-23",
    lastReviewed: "2026-09-09",
    priority: 40,
    applies: ({ input }) => input.nationalityGroup === "third_country" && Boolean(input.jobInShortageList || input.offerPublishedThreeWeeks),
    evaluate: ({ input }) => {
      if (input.jobInShortageList) {
        return { findings: [{ id: "shortage", title: "Métier déclaré en tension", detail: `La situation renseignée indique que le métier est présent sur la liste applicable${input.region ? ` en ${input.region}` : ""}. Conservez la référence exacte de la ligne utilisée.`, severity: "success", sourceIds: ["arrete-metiers-2025"] }], sourceIds: ["arrete-metiers-2025"] };
      }
      return { findings: [{ id: "offer-published", title: "Publication de l'offre déclarée", detail: "Une publication de trois semaines est déclarée. Il faudra conserver la preuve de publication et l'absence de candidature valable lorsque ce critère est mobilisé.", severity: "info", sourceIds: ["sp-autorisation-travail"] }], sourceIds: ["sp-autorisation-travail"] };
    },
  },
];
