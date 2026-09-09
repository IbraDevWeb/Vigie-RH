import type { LegalSource } from "./types";

export const legalSources: Record<string, LegalSource> = {
  "ct-r5221-1": {
    id: "ct-r5221-1",
    title: "Code du travail — article R. 5221-1",
    authority: "legifrance",
    url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000049999770/",
    effectiveFrom: "2024-09-01",
    lastReviewed: "2026-09-09",
    note: "Principe de l'autorisation de travail, demande par l'employeur et nouvelle demande pour tout nouveau contrat.",
  },
  "ct-r5221-2": {
    id: "ct-r5221-2",
    title: "Code du travail — article R. 5221-2",
    authority: "legifrance",
    url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000043323648/",
    effectiveFrom: "2026-04-26",
    lastReviewed: "2026-09-09",
    note: "Dispenses d'autorisation de travail, avec catégories et sous-catégories précisément énumérées.",
  },
  "ct-r5221-20": {
    id: "ct-r5221-20",
    title: "Code du travail — article R. 5221-20",
    authority: "legifrance",
    url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000049999760/",
    effectiveFrom: "2024-09-01",
    lastReviewed: "2026-09-09",
    note: "Critères de délivrance : emploi proposé, situation de l'employeur, profession réglementée, rémunération et cas particuliers.",
  },
  "ct-r5221-41": {
    id: "ct-r5221-41",
    title: "Code du travail — article R. 5221-41",
    authority: "legifrance",
    url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000043320795/",
    effectiveFrom: "2021-04-01",
    lastReviewed: "2026-09-09",
    note: "Vérification par l'employeur de la régularité du séjour auprès du préfet avant l'embauche.",
  },
  "ct-r5221-42": {
    id: "ct-r5221-42",
    title: "Code du travail — article R. 5221-42",
    authority: "legifrance",
    url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000043320792/",
    effectiveFrom: "2021-04-01",
    lastReviewed: "2026-09-09",
    note: "Saisine au moins deux jours ouvrables avant l'embauche et délai de réponse du préfet.",
  },
  "sp-autorisation-travail": {
    id: "sp-autorisation-travail",
    title: "Service-Public — Autorisation de travail d'un salarié étranger en France",
    authority: "service-public",
    url: "https://www.service-public.fr/particuliers/vosdroits/F2728",
    lastReviewed: "2026-09-09",
    note: "Fiche vérifiée le 18 juin 2026 : titres, étudiants, situation de l'emploi, vérification du titre et démarches employeur.",
  },
  "arrete-metiers-2025": {
    id: "arrete-metiers-2025",
    title: "Arrêté du 21 mai 2025 — métiers et zones en tension",
    authority: "legifrance",
    url: "https://www.legifrance.gouv.fr/loda/id/JORFTEXT000051643488/",
    effectiveFrom: "2025-05-23",
    lastReviewed: "2026-09-09",
  },
  "sp-sanctions": {
    id: "sp-sanctions",
    title: "Service-Public — Conséquences de l'emploi sans autorisation de travail",
    authority: "service-public",
    url: "https://www.service-public.fr/particuliers/vosdroits/F33886",
    lastReviewed: "2026-09-09",
  },
};

export function getSources(ids: string[]): LegalSource[] {
  return [...new Set(ids)].map((id) => legalSources[id]).filter(Boolean);
}
