import type { LegalRule } from "../types";

const workPermitExemptTitles = new Set(["private_family", "resident", "talent"]);

export const baseRules: LegalRule[] = [
  {
    id: "fr-national",
    description: "La procédure travailleurs étrangers ne s'applique pas à un ressortissant français.",
    effectiveFrom: "2024-09-01",
    lastReviewed: "2026-09-09",
    priority: 100,
    applies: ({ input }) => input.nationalityGroup === "france",
    evaluate: () => ({
      patches: { canWorkNow: true, workAuthorization: "not_applicable", employerVerification: "not_applicable", confidence: "high" },
      forceStatus: "clear",
      findings: [{ id: "france", title: "Hors champ travailleurs étrangers", detail: "Aucune autorisation de travail liée à la nationalité étrangère n'est à instruire dans ce parcours.", severity: "success", sourceIds: [] }],
    }),
  },
  {
    id: "eu-free-movement",
    description: "UE/EEE/Suisse : dispense d'autorisation de travail.",
    effectiveFrom: "2026-04-26",
    lastReviewed: "2026-09-09",
    priority: 90,
    applies: ({ input }) => input.nationalityGroup === "eu_eea_swiss",
    evaluate: () => ({
      patches: { canWorkNow: true, workAuthorization: "no", employerVerification: "not_applicable", confidence: "high" },
      forceStatus: "clear",
      sourceIds: ["ct-r5221-2"],
      findings: [{ id: "eu-exempt", title: "Autorisation de travail non requise", detail: "Les ressortissants UE/EEE/Suisse relèvent du régime de libre circulation, sous réserve des conditions propres à leur droit au séjour.", severity: "success", sourceIds: ["ct-r5221-2"] }],
      checklist: [{ id: "identity", label: "Conserver le justificatif d'identité et de nationalité", status: "todo", sourceIds: ["ct-r5221-2"] }],
    }),
  },
  {
    id: "algerian-special-regime",
    description: "Le régime franco-algérien nécessite une branche dédiée.",
    effectiveFrom: "2024-09-01",
    lastReviewed: "2026-09-09",
    priority: 95,
    applies: ({ input }) => input.nationalityGroup === "algeria",
    evaluate: () => ({
      forceStatus: "review_required",
      patches: { canWorkNow: null, workAuthorization: "review", employerVerification: "review", confidence: "low" },
      sourceIds: ["sp-autorisation-travail"],
      findings: [{ id: "algeria-review", title: "Régime spécial à vérifier", detail: "Le régime des ressortissants algériens obéit à des règles particulières. Le prototype bloque volontairement la conclusion automatique tant que ce corpus n'est pas modélisé.", severity: "warning", sourceIds: ["sp-autorisation-travail"] }],
      checklist: [{ id: "special-regime", label: "Faire vérifier le régime franco-algérien applicable", status: "attention", sourceIds: ["sp-autorisation-travail"] }],
    }),
  },
  {
    id: "third-country-principle",
    description: "Principe d'autorisation de travail pour les ressortissants de pays tiers.",
    effectiveFrom: "2024-09-01",
    lastReviewed: "2026-09-09",
    priority: 50,
    applies: ({ input }) => input.nationalityGroup === "third_country",
    evaluate: ({ input }) => ({
      patches: { employerVerification: "yes" },
      sourceIds: ["ct-r5221-1", "sp-autorisation-travail"],
      checklist: [
        { id: "verify-title", label: "Vérifier le document autorisant le séjour et/ou le travail", status: "todo", sourceIds: ["sp-autorisation-travail"] },
        { id: "archive-proof", label: "Archiver la preuve du contrôle dans le dossier salarié", status: "todo", sourceIds: ["sp-autorisation-travail"] },
      ],
      findings: input.newContract ? [{ id: "new-contract", title: "Nouveau contrat détecté", detail: "Le moteur réévalue l'exigence d'autorisation de travail pour ce nouveau contrat.", severity: "info", sourceIds: ["ct-r5221-1"] }] : [],
    }),
  },
  {
    id: "exempt-permit",
    description: "Titres de séjour courants dispensant d'une autorisation de travail distincte dans le périmètre du prototype.",
    effectiveFrom: "2026-04-26",
    lastReviewed: "2026-09-09",
    priority: 70,
    applies: ({ input }) => input.nationalityGroup === "third_country" && workPermitExemptTitles.has(input.permitType),
    evaluate: () => ({
      patches: { canWorkNow: true, workAuthorization: "no", confidence: "high" },
      sourceIds: ["ct-r5221-2"],
      findings: [{ id: "permit-exempt", title: "Titre compatible avec une dispense dans le périmètre modélisé", detail: "Aucune demande d'autorisation de travail distincte n'est déclenchée par le moteur. Vérifiez néanmoins la validité, les mentions et le périmètre exact du titre.", severity: "success", sourceIds: ["ct-r5221-2"] }],
    }),
  },
];
