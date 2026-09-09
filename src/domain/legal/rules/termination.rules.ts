import type { AssessmentInput, LegalRule } from "../types";

function isCurrent(validUntil: string | undefined, today: Date): boolean {
  if (!validUntil) return false;
  const end = new Date(`${validUntil}T23:59:59`);
  return end.getTime() >= today.getTime();
}

function isExpired(validUntil: string | undefined, today: Date): boolean {
  if (!validUntil) return false;
  return !isCurrent(validUntil, today);
}

function studentNeedsSeparateAuthorization(input: AssessmentInput): boolean {
  return input.permitType === "student"
    && typeof input.studentHoursPlanned === "number"
    && input.studentHoursPlanned > 964
    && input.isApprenticeship !== true;
}

function lossOfRightEstablished(input: AssessmentInput, today: Date): boolean {
  if (input.nationalityGroup !== "third_country") return false;

  if (input.permitType === "none") return true;
  if (isExpired(input.permitValidUntil, today)) return true;

  if (
    ["receipt", "extension_attestation"].includes(input.permitType)
    && input.temporaryDocumentAllowsWork === false
  ) return true;

  if (
    ["employee", "temporary_worker"].includes(input.permitType)
    && isCurrent(input.permitValidUntil, today)
    && input.workAuthorizationGrantedForContract === false
  ) return true;

  if (
    studentNeedsSeparateAuthorization(input)
    && isCurrent(input.permitValidUntil, today)
    && input.workAuthorizationGrantedForContract === false
  ) return true;

  return false;
}

function rightAppearsEstablished(input: AssessmentInput, today: Date): boolean {
  if (input.nationalityGroup !== "third_country") return false;
  if (!isCurrent(input.permitValidUntil, today)) return false;

  if (input.permitType === "resident") return true;

  if (["employee", "temporary_worker"].includes(input.permitType)) {
    return input.workAuthorizationGrantedForContract === true;
  }

  if (input.permitType === "student") {
    if (typeof input.studentHoursPlanned !== "number") return false;
    if (input.studentHoursPlanned <= 964) return true;
    if (input.isApprenticeship === true) return input.apprenticeshipValidated === true;
    return input.workAuthorizationGrantedForContract === true;
  }

  return false;
}

function reasonLabel(input: AssessmentInput): string {
  return {
    document_expired: "expiration du document",
    authorization_refused_or_withdrawn: "refus ou retrait d'une autorisation",
    activity_not_covered: "activité ou périmètre non couvert",
    other: "autre motif lié au droit au travail",
    unknown: "motif encore à qualifier",
  }[input.terminationReason ?? "unknown"];
}

export const terminationRules: LegalRule[] = [
  {
    id: "termination-protected-employee",
    version: 1,
    description: "Un salarié protégé relève d'une procédure spéciale de licenciement impliquant l'inspection du travail selon le mandat concerné.",
    effectiveFrom: "2018-01-01",
    lastReviewed: "2026-09-09",
    sourceIds: ["ct-l2411-1", "ct-l2421-1"],
    priority: 280,
    applies: ({ input }) => input.action === "terminate" && input.protectedEmployee === true,
    evaluate: () => ({
      forceStatus: "review_required",
      patches: { confidence: "low" },
      findings: [{
        id: "protected-employee-special-procedure",
        title: "Salarié protégé : procédure spéciale obligatoire",
        detail: "Le salarié est déclaré protégé. Le licenciement des catégories protégées visées par le Code du travail relève d'une procédure spéciale et, selon le mandat, d'une autorisation de l'inspecteur du travail. Le moteur ne génère aucune décision de rupture automatique dans ce cas.",
        severity: "danger",
        sourceIds: ["ct-l2411-1", "ct-l2421-1"],
      }],
      checklist: [{
        id: "protected-employee-authorization",
        label: "Identifier précisément le mandat et sécuriser la procédure d'autorisation auprès de l'inspection du travail",
        status: "attention",
        sourceIds: ["ct-l2411-1", "ct-l2421-1"],
      }],
    }),
  },
  {
    id: "termination-illegal-employment-period",
    version: 1,
    description: "Si une période d'emploi sans droit au travail est déclarée, signaler les droits indemnitaires prévus par L. 8252-2.",
    effectiveFrom: "2016-03-09",
    lastReviewed: "2026-09-09",
    sourceIds: ["ct-l8252-2"],
    priority: 275,
    applies: ({ input }) => input.action === "terminate" && input.workedWhileUnauthorized === true,
    evaluate: ({ input }) => ({
      forceStatus: "review_required",
      findings: [{
        id: "illegal-employment-compensation",
        title: "Période de travail sans autorisation déclarée : indemnisation à calculer",
        detail: `Une période de travail sans droit au travail est déclarée pour le ${input.contractType.toUpperCase()}. L'article L. 8252-2 prévoit, en cas de rupture après emploi illicite, une indemnité forfaitaire égale à trois mois de salaire, sauf si les règles légales, contractuelles ou conventionnelles visées par le texte sont plus favorables. Le moteur ne calcule pas le montant dû.`,
        severity: "danger",
        sourceIds: ["ct-l8252-2"],
      }],
      checklist: [{
        id: "calculate-illegal-employment-rights",
        label: "Faire calculer les salaires, accessoires et indemnités dus au titre de la période d'emploi illicite et de la rupture",
        status: "attention",
        sourceIds: ["ct-l8252-2"],
      }],
    }),
  },
  {
    id: "termination-loss-established",
    version: 1,
    description: "Lorsque les faits renseignés établissent l'absence actuelle de droit au travail, interdire le maintien au travail sans automatiser la rupture.",
    effectiveFrom: "2011-06-18",
    lastReviewed: "2026-09-09",
    sourceIds: ["ct-l8251-1", "min-travail-sans-titre", "ct-l8252-2"],
    priority: 260,
    applies: ({ input, today }) => input.action === "terminate" && lossOfRightEstablished(input, today),
    evaluate: ({ input }) => ({
      forceStatus: "review_required",
      patches: {
        canWorkNow: false,
        workAuthorization: "review",
        employerVerification: "not_applicable",
        employmentSituation: "not_applicable",
        shortageOccupation: "not_applicable",
        confidence: "high",
        nextDeadline: input.terminationLossDate ?? input.permitValidUntil ?? null,
      },
      findings: [{
        id: "termination-loss-established",
        title: "Droit au travail non établi : maintien au travail interdit en l'état",
        detail: `Les faits renseignés conduisent à constater l'absence de droit au travail pour l'activité actuelle (${reasonLabel(input)}). L'article L. 8251-1 interdit de conserver à son service un étranger sans titre l'autorisant à travailler ou hors du périmètre autorisé. Cette conclusion concerne le maintien au travail ; la procédure de rupture et les sommes dues doivent être sécurisées séparément.`,
        severity: "danger",
        sourceIds: ["ct-l8251-1", "min-travail-sans-titre"],
      }],
      checklist: [
        {
          id: "stop-unauthorized-work",
          label: "Ne pas laisser le salarié poursuivre une activité non couverte par un droit au travail établi",
          status: "blocked",
          sourceIds: ["ct-l8251-1", "min-travail-sans-titre"],
        },
        {
          id: "establish-loss-date",
          label: "Établir et documenter la date exacte à laquelle le droit au travail a cessé d'être établi",
          description: input.terminationLossDate ? `Date déclarée : ${input.terminationLossDate}` : "Date non renseignée : à déterminer à partir des décisions et justificatifs.",
          status: input.terminationLossDate ? "done" : "attention",
          sourceIds: ["ct-l8251-1"],
        },
        {
          id: "validate-termination-procedure",
          label: "Faire valider la procédure de rupture et les sommes dues avant notification",
          status: "attention",
          sourceIds: ["min-travail-sans-titre", "ct-l8252-2"],
        },
      ],
    }),
  },
  {
    id: "termination-right-appears-established",
    version: 1,
    description: "Lorsque le droit au travail apparaît encore établi, ne pas assimiler la situation à une perte de droit justifiant le parcours spécialisé.",
    effectiveFrom: "2011-06-18",
    lastReviewed: "2026-09-09",
    sourceIds: ["ct-l8251-1", "sp-autorisation-travail"],
    priority: 255,
    applies: ({ input, today }) => input.action === "terminate" && rightAppearsEstablished(input, today),
    evaluate: ({ input }) => ({
      forceStatus: "review_required",
      patches: { canWorkNow: true, confidence: "medium" },
      findings: [{
        id: "termination-right-still-established",
        title: "La perte du droit au travail n'est pas établie par les données fournies",
        detail: `Le document et les faits déclarés indiquent encore un droit au travail dans le périmètre modélisé, alors que le motif sélectionné est « ${reasonLabel(input)} ». Le parcours « Rompre » ne doit donc pas être utilisé pour transformer cette situation en décision automatique de licenciement.`,
        severity: "warning",
        sourceIds: ["ct-l8251-1", "sp-autorisation-travail"],
      }],
      checklist: [{
        id: "recheck-termination-ground",
        label: "Requalifier le motif de rupture ou compléter les justificatifs établissant réellement la perte du droit au travail",
        status: "attention",
        sourceIds: ["ct-l8251-1", "sp-autorisation-travail"],
      }],
    }),
  },
  {
    id: "termination-right-uncertain",
    version: 1,
    description: "En l'absence de faits suffisants pour établir ou exclure le droit au travail, conserver une revue complémentaire.",
    effectiveFrom: "2011-06-18",
    lastReviewed: "2026-09-09",
    sourceIds: ["ct-l8251-1", "sp-autorisation-travail"],
    priority: 250,
    applies: ({ input, today }) => input.action === "terminate"
      && input.nationalityGroup === "third_country"
      && !lossOfRightEstablished(input, today)
      && !rightAppearsEstablished(input, today),
    evaluate: ({ input }) => ({
      forceStatus: "review_required",
      patches: {
        canWorkNow: null,
        workAuthorization: "review",
        employerVerification: "not_applicable",
        confidence: "low",
      },
      findings: [{
        id: "termination-right-uncertain",
        title: "Droit au travail à établir avant toute décision",
        detail: `Le motif « ${reasonLabel(input)} » ne suffit pas, avec les justificatifs renseignés, à établir automatiquement si le salarié peut encore travailler. Le moteur reste volontairement fail-closed et demande une qualification documentaire avant de traiter la rupture.`,
        severity: "warning",
        sourceIds: ["ct-l8251-1", "sp-autorisation-travail"],
      }],
      checklist: [{
        id: "qualify-current-right-before-termination",
        label: "Contrôler le document, sa validité, ses mentions et le périmètre exact de l'autorisation avant de décider",
        status: "attention",
        sourceIds: ["ct-l8251-1", "sp-autorisation-travail"],
      }],
    }),
  },
  {
    id: "termination-non-third-country-basis",
    version: 1,
    description: "Pour les Français et ressortissants UE/EEE/Suisse, le motif de rupture lié à une autorisation de travail de ressortissant de pays tiers n'est pas applicable dans ce moteur.",
    effectiveFrom: "2024-09-01",
    lastReviewed: "2026-09-09",
    sourceIds: ["ct-r5221-1", "ct-r5221-2"],
    priority: 245,
    applies: ({ input }) => input.action === "terminate" && ["france", "eu_eea_swiss"].includes(input.nationalityGroup),
    evaluate: () => ({
      forceStatus: "review_required",
      patches: {
        canWorkNow: true,
        workAuthorization: "not_applicable",
        employerVerification: "not_applicable",
        employmentSituation: "not_applicable",
        shortageOccupation: "not_applicable",
        confidence: "high",
      },
      findings: [{
        id: "termination-basis-not-applicable",
        title: "Perte d'autorisation de travail : motif non applicable dans ce parcours",
        detail: "La nationalité déclarée ne relève pas du régime de l'autorisation de travail des ressortissants de pays tiers modélisé ici. Le moteur ne fournit donc aucune base de rupture sur ce motif.",
        severity: "warning",
        sourceIds: ["ct-r5221-1", "ct-r5221-2"],
      }],
    }),
  },
  {
    id: "termination-operational-review",
    version: 1,
    description: "Toute rupture reste soumise à une validation de droit social hors du verdict automatique du moteur.",
    effectiveFrom: "2011-06-18",
    lastReviewed: "2026-09-09",
    sourceIds: ["min-travail-sans-titre", "ct-l8252-2"],
    priority: 40,
    applies: ({ input }) => input.action === "terminate" && input.nationalityGroup === "third_country",
    evaluate: () => ({
      forceStatus: "review_required",
      checklist: [
        {
          id: "archive-termination-evidence",
          label: "Archiver les titres, décisions administratives, contrôles et preuves utilisés pour motiver la décision",
          status: "todo",
          sourceIds: ["ct-l8251-1", "min-travail-sans-titre"],
        },
        {
          id: "final-social-law-review",
          label: "Valider la procédure de rupture en droit du travail avant notification au salarié",
          status: "attention",
          sourceIds: ["min-travail-sans-titre", "ct-l8252-2"],
        },
      ],
    }),
  },
];
