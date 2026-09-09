import type { Answer, AssessmentInput, LegalRule } from "../types";

function dateAtNoon(dateIso: string): Date {
  return new Date(`${dateIso}T12:00:00`);
}

function isExpired(dateIso: string, today: Date): boolean {
  return dateAtNoon(dateIso).getTime() < today.getTime();
}

function addCalendarMonths(dateIso: string, months: number): Date {
  const date = dateAtNoon(dateIso);
  const day = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() + months);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0, 12).getDate();
  date.setDate(Math.min(day, lastDay));
  return date;
}

function subtractCalendarMonths(dateIso: string, months: number): Date {
  return addCalendarMonths(dateIso, -months);
}

function filedNoLaterThanCurrentExpiry(input: AssessmentInput): boolean {
  if (!input.renewalFiledAt || !input.permitValidUntil) return false;
  return dateAtNoon(input.renewalFiledAt).getTime() <= dateAtNoon(input.permitValidUntil).getTime();
}

function hasQualifiedRenewalProof(input: AssessmentInput): boolean {
  return Boolean(input.renewalProofType) && input.renewalProofType !== "none";
}

function residentThreeMonthContinuationApplies(input: AssessmentInput, today: Date): boolean {
  const continuationIsNeeded = !hasQualifiedRenewalProof(input) || input.renewalProofType === "submission_attestation";
  if (
    input.action !== "renew"
    || input.nationalityGroup !== "third_country"
    || input.permitType !== "resident"
    || input.renewalFiled !== true
    || !input.permitValidUntil
    || !filedNoLaterThanCurrentExpiry(input)
    || !continuationIsNeeded
  ) return false;

  const expiry = dateAtNoon(input.permitValidUntil);
  const continuationEnd = addCalendarMonths(input.permitValidUntil, 3);
  return today.getTime() > expiry.getTime() && today.getTime() <= continuationEnd.getTime();
}

function knownCurrentTitleAllowsWork(input: AssessmentInput): boolean {
  if (["employee", "temporary_worker", "resident"].includes(input.permitType)) return true;
  if (input.permitType !== "student") return false;
  if (typeof input.studentHoursPlanned !== "number") return false;
  if (input.studentHoursPlanned <= 964) return true;
  return input.isApprenticeship === true && input.apprenticeshipValidated === true;
}

function workAuthorizationAnswer(input: AssessmentInput): Answer {
  if (["employee", "temporary_worker"].includes(input.permitType)) return "yes";
  if (input.permitType === "resident") return "no";
  if (input.permitType === "student") {
    if (typeof input.studentHoursPlanned !== "number") return "review";
    if (input.studentHoursPlanned <= 964) return "no";
    if (input.isApprenticeship === true && input.apprenticeshipValidated === true) return "no";
    return "yes";
  }
  return "review";
}

function proofIsValid(input: AssessmentInput, today: Date): boolean | null {
  if (!input.renewalProofValidUntil) return null;
  return !isExpired(input.renewalProofValidUntil, today);
}

export function hasResidentRenewalContinuation(input: AssessmentInput, today: Date): boolean {
  return residentThreeMonthContinuationApplies(input, today);
}

export const renewalRules: LegalRule[] = [
  {
    id: "renewal-resident-three-month-continuation",
    version: 2,
    description: "Carte de résident : maintien du séjour et du droit au travail pendant trois mois après expiration lorsque le renouvellement a été demandé à temps et qu'aucun justificatif plus spécifique ne gouverne déjà la situation.",
    effectiveFrom: "2021-05-01",
    lastReviewed: "2026-09-09",
    sourceIds: ["ceseda-l433-3", "sp-autorisation-travail"],
    priority: 240,
    applies: ({ input, today }) => residentThreeMonthContinuationApplies(input, today),
    evaluate: ({ input }) => ({
      forceStatus: "conditional",
      patches: {
        canWorkNow: true,
        workAuthorization: "no",
        confidence: "high",
        nextDeadline: input.permitValidUntil ? addCalendarMonths(input.permitValidUntil, 3).toISOString().slice(0, 10) : null,
      },
      findings: [{
        id: "resident-renewal-continuation",
        title: "Continuité temporaire du droit au travail modélisée",
        detail: "La carte de résident est expirée, mais le renouvellement est déclaré comme demandé au plus tard à l'échéance. Dans le périmètre modélisé, le droit au travail est maintenu pendant trois mois après l'expiration.",
        severity: "warning",
        sourceIds: ["ceseda-l433-3", "sp-autorisation-travail"],
      }],
      checklist: [{
        id: "resident-continuation-end",
        label: "Obtenir un nouveau titre ou un justificatif valable avant la fin de la continuité de trois mois",
        status: "attention",
        sourceIds: ["ceseda-l433-3"],
      }],
    }),
  },
  {
    id: "renewal-current-title-valid",
    version: 1,
    description: "Un titre actuel encore valide continue à produire ses effets dans son périmètre pendant l'instruction du renouvellement.",
    effectiveFrom: "2026-04-26",
    lastReviewed: "2026-09-09",
    sourceIds: ["sp-autorisation-travail"],
    priority: 135,
    applies: ({ input, today }) => input.action === "renew"
      && input.nationalityGroup === "third_country"
      && Boolean(input.permitValidUntil)
      && !isExpired(input.permitValidUntil!, today)
      && knownCurrentTitleAllowsWork(input),
    evaluate: ({ input }) => ({
      patches: {
        canWorkNow: true,
        workAuthorization: workAuthorizationAnswer(input),
        confidence: "high",
      },
      findings: [{
        id: "renewal-current-title-valid",
        title: "Titre actuel encore valide",
        detail: "Le titre actuel n'est pas expiré. Le maintien au travail reste possible dans le périmètre de ce titre et, lorsqu'elle est requise, de l'autorisation de travail associée.",
        severity: "success",
        sourceIds: ["sp-autorisation-travail"],
      }],
    }),
  },
  {
    id: "renewal-filing-unknown",
    version: 2,
    description: "L'état du dépôt du renouvellement doit rester explicitement inconnu s'il n'est pas établi et qu'aucun justificatif de renouvellement n'est fourni.",
    effectiveFrom: "2021-05-01",
    lastReviewed: "2026-09-09",
    sourceIds: ["ceseda-r431-15-1", "sp-autorisation-travail"],
    priority: 125,
    applies: ({ input }) => input.action === "renew"
      && input.nationalityGroup === "third_country"
      && !hasQualifiedRenewalProof(input)
      && input.renewalFiled === null,
    evaluate: () => ({
      forceStatus: "review_required",
      patches: { confidence: "low" },
      findings: [{
        id: "renewal-filing-unknown",
        title: "Dépôt du renouvellement à confirmer",
        detail: "Le moteur ne sait pas si la demande de renouvellement a été déposée. Il ne peut donc pas conclure sur la continuité après l'échéance ni sur les justificatifs attendus.",
        severity: "warning",
        sourceIds: ["ceseda-r431-15-1", "sp-autorisation-travail"],
      }],
      checklist: [{
        id: "confirm-renewal-filing",
        label: "Confirmer le dépôt et conserver sa date ainsi que le justificatif obtenu",
        status: "attention",
        sourceIds: ["ceseda-r431-15-1"],
      }],
    }),
  },
  {
    id: "renewal-not-filed",
    version: 2,
    description: "Renouvellement non déposé et sans justificatif : action à engager avant l'échéance du titre.",
    effectiveFrom: "2021-05-01",
    lastReviewed: "2026-09-09",
    sourceIds: ["ceseda-r431-15-1", "sp-autorisation-travail"],
    priority: 120,
    applies: ({ input }) => input.action === "renew"
      && input.nationalityGroup === "third_country"
      && !hasQualifiedRenewalProof(input)
      && input.renewalFiled === false,
    evaluate: () => ({
      forceStatus: "conditional",
      findings: [{
        id: "renewal-not-filed",
        title: "Renouvellement non déclaré comme déposé",
        detail: "Le titre doit être suivi jusqu'à son échéance et la demande de renouvellement doit être engagée selon la procédure applicable. Aucun dépôt n'est établi dans les données fournies.",
        severity: "warning",
        sourceIds: ["ceseda-r431-15-1", "sp-autorisation-travail"],
      }],
      checklist: [{
        id: "file-renewal",
        label: "Déposer la demande de renouvellement et archiver la preuve de dépôt",
        status: "attention",
        sourceIds: ["ceseda-r431-15-1"],
      }],
    }),
  },
  {
    id: "renewal-submission-attestation",
    version: 2,
    description: "L'attestation de dépôt en ligne n'établit pas à elle seule la régularité du séjour ni un droit au travail après expiration.",
    effectiveFrom: "2021-05-01",
    lastReviewed: "2026-09-09",
    sourceIds: ["ceseda-r431-15-1", "sp-autorisation-travail"],
    priority: 230,
    applies: ({ input, today }) => input.action === "renew"
      && input.nationalityGroup === "third_country"
      && input.renewalProofType === "submission_attestation"
      && Boolean(input.permitValidUntil)
      && isExpired(input.permitValidUntil!, today)
      && !residentThreeMonthContinuationApplies(input, today),
    evaluate: ({ input }) => ({
      forceStatus: "blocked",
      patches: { canWorkNow: false, workAuthorization: workAuthorizationAnswer(input), confidence: "high" },
      findings: [{
        id: "submission-attestation-no-work",
        title: "Attestation de dépôt insuffisante après expiration",
        detail: "L'attestation dématérialisée de dépôt en ligne ne justifie pas la régularité du séjour et ne permet pas, à elle seule, de maintenir le travail après l'expiration du titre.",
        severity: "danger",
        sourceIds: ["ceseda-r431-15-1", "sp-autorisation-travail"],
      }],
      checklist: [{
        id: "wait-valid-renewal-proof",
        label: "Ne pas maintenir le travail tant qu'un justificatif établissant le droit au travail n'est pas disponible",
        status: "blocked",
        sourceIds: ["ceseda-r431-15-1", "sp-autorisation-travail"],
      }],
    }),
  },
  {
    id: "renewal-extension-attestation",
    version: 1,
    description: "Une attestation de prolongation de renouvellement d'une carte autorisant le travail permet de poursuivre l'activité pendant sa validité.",
    effectiveFrom: "2025-06-16",
    lastReviewed: "2026-09-09",
    sourceIds: ["ceseda-r431-15-2", "sp-autorisation-travail"],
    priority: 235,
    applies: ({ input }) => input.action === "renew"
      && input.nationalityGroup === "third_country"
      && input.renewalProofType === "extension_attestation",
    evaluate: ({ input, today }) => {
      const valid = proofIsValid(input, today);
      if (valid === null) {
        return {
          forceStatus: "review_required",
          patches: { canWorkNow: null, confidence: "low" },
          findings: [{
            id: "renewal-extension-validity-missing",
            title: "Validité de l'attestation de prolongation à confirmer",
            detail: "La date de validité du justificatif n'est pas renseignée. Le moteur ne suppose pas qu'une attestation de prolongation est encore valable.",
            severity: "warning",
            sourceIds: ["ceseda-r431-15-2"],
          }],
        };
      }

      if (!valid) {
        return {
          forceStatus: "blocked",
          patches: { canWorkNow: false, confidence: "high" },
          findings: [{
            id: "renewal-extension-expired",
            title: "Attestation de prolongation expirée",
            detail: "Le justificatif de prolongation renseigné est expiré. Il ne permet pas d'établir un droit au travail actuel.",
            severity: "danger",
            sourceIds: ["ceseda-r431-15-2", "sp-autorisation-travail"],
          }],
        };
      }

      if (!knownCurrentTitleAllowsWork(input)) {
        return {
          forceStatus: "review_required",
          patches: { canWorkNow: null, workAuthorization: "review", confidence: "low" },
          findings: [{
            id: "renewal-extension-title-scope-review",
            title: "Périmètre du titre renouvelé à confirmer",
            detail: "L'attestation de prolongation autorise le travail lorsqu'elle concerne le renouvellement d'une carte permettant une activité professionnelle. La catégorie actuelle n'est pas suffisamment qualifiée par le modèle pour l'affirmer automatiquement.",
            severity: "warning",
            sourceIds: ["ceseda-r431-15-2"],
          }],
        };
      }

      return {
        forceStatus: "conditional",
        patches: {
          canWorkNow: true,
          workAuthorization: workAuthorizationAnswer(input),
          confidence: "high",
          nextDeadline: input.renewalProofValidUntil ?? null,
        },
        findings: [{
          id: "renewal-extension-allows-work",
          title: "Attestation de prolongation valable",
          detail: "Le justificatif est déclaré comme une attestation de prolongation d'instruction valable pour le renouvellement d'un titre permettant l'activité professionnelle. Le travail peut être poursuivi dans son périmètre pendant sa validité.",
          severity: "success",
          sourceIds: ["ceseda-r431-15-2", "sp-autorisation-travail"],
        }],
      };
    },
  },
  {
    id: "renewal-receipt",
    version: 1,
    description: "Un récépissé de renouvellement permet le travail uniquement lorsque sa mention l'autorise.",
    effectiveFrom: "2021-05-01",
    lastReviewed: "2026-09-09",
    sourceIds: ["sp-autorisation-travail"],
    priority: 235,
    applies: ({ input }) => input.action === "renew"
      && input.nationalityGroup === "third_country"
      && input.renewalProofType === "receipt",
    evaluate: ({ input, today }) => {
      const valid = proofIsValid(input, today);
      if (valid === null || input.renewalProofAllowsWork === null) {
        return {
          forceStatus: "review_required",
          patches: { canWorkNow: false, confidence: "low" },
          findings: [{
            id: "renewal-receipt-review",
            title: "Mention ou validité du récépissé à contrôler",
            detail: "Le droit au travail dépend de la validité du récépissé et de la mention autorisant son titulaire à travailler. Le moteur ne conclut pas sans ces informations.",
            severity: "warning",
            sourceIds: ["sp-autorisation-travail"],
          }],
        };
      }

      if (!valid || input.renewalProofAllowsWork === false) {
        return {
          forceStatus: "blocked",
          patches: { canWorkNow: false, confidence: "high" },
          findings: [{
            id: "renewal-receipt-no-work",
            title: "Récépissé ne permettant pas d'établir un droit au travail actuel",
            detail: !valid
              ? "Le récépissé renseigné est expiré."
              : "Le récépissé est déclaré comme ne portant pas la mention autorisant son titulaire à travailler.",
            severity: "danger",
            sourceIds: ["sp-autorisation-travail"],
          }],
        };
      }

      return {
        forceStatus: "conditional",
        patches: {
          canWorkNow: true,
          workAuthorization: workAuthorizationAnswer(input),
          confidence: "high",
          nextDeadline: input.renewalProofValidUntil ?? null,
        },
        findings: [{
          id: "renewal-receipt-allows-work",
          title: "Récépissé valable autorisant le travail",
          detail: "Le récépissé de renouvellement est déclaré comme valable et portant la mention autorisant son titulaire à travailler. Conservez sa copie et suivez son échéance.",
          severity: "success",
          sourceIds: ["sp-autorisation-travail"],
        }],
      };
    },
  },
  {
    id: "renewal-favorable-decision",
    version: 1,
    description: "L'attestation de décision favorable permet de travailler si le futur titre autorise cette activité.",
    effectiveFrom: "2026-04-26",
    lastReviewed: "2026-09-09",
    sourceIds: ["sp-autorisation-travail"],
    priority: 235,
    applies: ({ input }) => input.action === "renew"
      && input.nationalityGroup === "third_country"
      && input.renewalProofType === "favorable_decision_attestation",
    evaluate: ({ input, today }) => {
      const valid = proofIsValid(input, today);
      if (valid !== true || !knownCurrentTitleAllowsWork(input)) {
        return {
          forceStatus: "review_required",
          patches: { canWorkNow: false, confidence: "low" },
          findings: [{
            id: "renewal-favorable-decision-review",
            title: "Décision favorable à qualifier",
            detail: "Le droit au travail dépend de la validité de l'attestation et du fait que le titre à délivrer autorise l'activité professionnelle. Le moteur ne l'affirme pas sans ces éléments.",
            severity: "warning",
            sourceIds: ["sp-autorisation-travail"],
          }],
        };
      }

      return {
        forceStatus: "conditional",
        patches: {
          canWorkNow: true,
          workAuthorization: workAuthorizationAnswer(input),
          confidence: "high",
          nextDeadline: input.renewalProofValidUntil ?? null,
        },
        findings: [{
          id: "renewal-favorable-decision-allows-work",
          title: "Attestation de décision favorable compatible avec le travail",
          detail: "Le justificatif est déclaré valable et le titre renouvelé appartient à une catégorie modélisée comme permettant l'activité concernée.",
          severity: "success",
          sourceIds: ["sp-autorisation-travail"],
        }],
      };
    },
  },
  {
    id: "renewal-new-permit",
    version: 1,
    description: "Nouveau titre reçu : le renouvellement du titre est considéré comme finalisé dans le périmètre modélisé.",
    effectiveFrom: "2026-04-26",
    lastReviewed: "2026-09-09",
    sourceIds: ["sp-autorisation-travail"],
    priority: 235,
    applies: ({ input }) => input.action === "renew"
      && input.nationalityGroup === "third_country"
      && input.renewalProofType === "new_permit",
    evaluate: ({ input, today }) => {
      const valid = proofIsValid(input, today);
      if (valid !== true || !knownCurrentTitleAllowsWork(input)) {
        return {
          forceStatus: "review_required",
          patches: { canWorkNow: false, confidence: "low" },
          findings: [{
            id: "renewal-new-permit-review",
            title: "Nouveau titre à qualifier",
            detail: "La validité du nouveau titre ou son périmètre de droit au travail n'est pas suffisamment établi pour conclure automatiquement.",
            severity: "warning",
            sourceIds: ["sp-autorisation-travail"],
          }],
        };
      }

      return {
        patches: {
          canWorkNow: true,
          workAuthorization: workAuthorizationAnswer(input),
          confidence: "high",
          nextDeadline: input.renewalProofValidUntil ?? null,
        },
        findings: [{
          id: "renewal-new-permit-valid",
          title: "Nouveau titre valable déclaré reçu",
          detail: "Le renouvellement du titre est déclaré comme finalisé. Archivez le nouveau document et utilisez sa nouvelle échéance pour le suivi.",
          severity: "success",
          sourceIds: ["sp-autorisation-travail"],
        }],
        checklist: [{
          id: "archive-new-permit",
          label: "Archiver le nouveau titre et mettre à jour son échéance dans le dossier salarié",
          status: "done",
          sourceIds: ["sp-autorisation-travail"],
        }],
      };
    },
  },
  {
    id: "renewal-other-proof",
    version: 1,
    description: "Une preuve de renouvellement non qualifiée ne permet pas de conclure automatiquement.",
    effectiveFrom: "2021-05-01",
    lastReviewed: "2026-09-09",
    sourceIds: ["ceseda-r431-15-1", "sp-autorisation-travail"],
    priority: 225,
    applies: ({ input }) => input.action === "renew"
      && input.nationalityGroup === "third_country"
      && input.renewalProofType === "other",
    evaluate: () => ({
      forceStatus: "review_required",
      patches: { canWorkNow: null, confidence: "low" },
      findings: [{
        id: "renewal-other-proof-review",
        title: "Justificatif de renouvellement à qualifier",
        detail: "Le justificatif déclaré n'est pas une catégorie modélisée. Son effet sur le séjour et le droit au travail doit être vérifié avant toute conclusion.",
        severity: "warning",
        sourceIds: ["ceseda-r431-15-1", "sp-autorisation-travail"],
      }],
    }),
  },
  {
    id: "renewal-work-authorization-expired",
    version: 1,
    description: "Pour les titres salarié/travailleur temporaire, une autorisation de travail expirée n'est pas prolongée par le seul dépôt de sa demande de renouvellement.",
    effectiveFrom: "2026-06-18",
    lastReviewed: "2026-09-09",
    sourceIds: ["sp-autorisation-travail"],
    priority: 245,
    applies: ({ input, today }) => input.action === "renew"
      && input.nationalityGroup === "third_country"
      && ["employee", "temporary_worker"].includes(input.permitType)
      && Boolean(input.workAuthorizationValidUntil)
      && isExpired(input.workAuthorizationValidUntil!, today),
    evaluate: () => ({
      forceStatus: "blocked",
      patches: { canWorkNow: false, workAuthorization: "yes", confidence: "high" },
      findings: [{
        id: "work-authorization-expired",
        title: "Autorisation de travail arrivée à échéance",
        detail: "La date de fin de validité renseignée pour l'autorisation de travail est dépassée. Le dépôt d'une demande de renouvellement n'est pas traité par le moteur comme une nouvelle autorisation accordée.",
        severity: "danger",
        sourceIds: ["sp-autorisation-travail"],
      }],
      checklist: [{
        id: "establish-renewed-work-authorization",
        label: "Établir une autorisation de travail valable avant tout maintien au travail",
        status: "blocked",
        sourceIds: ["sp-autorisation-travail"],
      }],
    }),
  },
  {
    id: "renewal-work-authorization-date-missing",
    version: 1,
    description: "Pour salarié/travailleur temporaire, la date d'échéance de l'autorisation doit être connue pour sécuriser le renouvellement.",
    effectiveFrom: "2026-06-18",
    lastReviewed: "2026-09-09",
    sourceIds: ["sp-autorisation-travail"],
    priority: 118,
    applies: ({ input }) => input.action === "renew"
      && input.nationalityGroup === "third_country"
      && ["employee", "temporary_worker"].includes(input.permitType)
      && !input.workAuthorizationValidUntil,
    evaluate: () => ({
      forceStatus: "review_required",
      patches: { workAuthorization: "review", confidence: "low" },
      findings: [{
        id: "work-authorization-validity-review",
        title: "Échéance de l'autorisation de travail à confirmer",
        detail: "Le titre salarié ou travailleur temporaire ne suffit pas à déterminer l'échéance de l'autorisation de travail associée. Sa date de fin doit être contrôlée séparément.",
        severity: "warning",
        sourceIds: ["sp-autorisation-travail"],
      }],
    }),
  },
  {
    id: "renewal-work-authorization-window",
    version: 1,
    description: "Rappel de renouvellement de l'autorisation de travail au cours du deuxième mois avant son échéance.",
    effectiveFrom: "2026-06-18",
    lastReviewed: "2026-09-09",
    sourceIds: ["sp-autorisation-travail"],
    priority: 117,
    applies: ({ input, today }) => {
      if (
        input.action !== "renew"
        || input.nationalityGroup !== "third_country"
        || !["employee", "temporary_worker"].includes(input.permitType)
        || !input.workAuthorizationValidUntil
        || isExpired(input.workAuthorizationValidUntil, today)
      ) return false;

      return today.getTime() >= subtractCalendarMonths(input.workAuthorizationValidUntil, 2).getTime();
    },
    evaluate: ({ input }) => ({
      forceStatus: input.workAuthorizationRenewalFiled === true ? undefined : "conditional",
      patches: { workAuthorization: "yes" },
      findings: [{
        id: "work-authorization-renewal-window",
        title: input.workAuthorizationRenewalFiled === true
          ? "Renouvellement de l'autorisation de travail déclaré engagé"
          : "Renouvellement de l'autorisation de travail à engager",
        detail: "Service-Public indique que, lorsqu'une autorisation de travail a une fin de validité, l'employeur doit demander son renouvellement au cours du deuxième mois avant cette date de fin.",
        severity: input.workAuthorizationRenewalFiled === true ? "success" : "warning",
        sourceIds: ["sp-autorisation-travail"],
      }],
      checklist: [{
        id: "renew-work-authorization",
        label: "Déposer et suivre le renouvellement de l'autorisation de travail",
        status: input.workAuthorizationRenewalFiled === true ? "done" : "attention",
        sourceIds: ["sp-autorisation-travail"],
      }],
    }),
  },
];
