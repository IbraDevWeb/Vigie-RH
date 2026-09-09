import { legalRules } from "./rules";
import type { AssessmentInput, AssessmentResult, AssessmentStatus, RuleOutput } from "./types";

const statusRank: Record<AssessmentStatus, number> = {
  clear: 0,
  conditional: 1,
  blocked: 2,
  review_required: 3,
};

function worstStatus(a: AssessmentStatus, b?: AssessmentStatus): AssessmentStatus {
  if (!b) return a;
  return statusRank[b] > statusRank[a] ? b : a;
}

function deriveStatus(input: AssessmentInput, result: AssessmentResult): AssessmentStatus {
  if (result.workAuthorization === "review" || result.employerVerification === "review") return "review_required";

  if (result.canWorkNow === false) {
    if (input.action === "hire" && result.workAuthorization === "yes") return "conditional";
    return "blocked";
  }

  if (
    result.workAuthorization === "yes"
    || result.employerVerification === "yes"
    || result.employmentSituation === "review"
  ) return "conditional";

  return "clear";
}

function labelFor(status: AssessmentStatus): string {
  return {
    clear: "Situation claire",
    conditional: "Instruction possible sous conditions",
    blocked: "Prise ou maintien en poste bloqué",
    review_required: "Validation complémentaire requise",
  }[status];
}

function summaryFor(status: AssessmentStatus): string {
  return {
    clear: "Les informations fournies ne déclenchent pas de blocage dans le périmètre des règles modélisées.",
    conditional: "Le dossier peut poursuivre son instruction, mais des démarches ou critères restent à satisfaire avant toute prise de poste.",
    blocked: "Le droit au travail n'est pas établi dans la situation renseignée : la prise ou le maintien en poste n'est pas autorisé en l'état.",
    review_required: "Cette situation comporte une information ou un régime que le moteur ne peut pas trancher automatiquement.",
  }[status];
}

export function assessCase(input: AssessmentInput, now = new Date()): AssessmentResult {
  let result: AssessmentResult = {
    status: "clear",
    statusLabel: "Situation claire",
    summary: "",
    canWorkNow: null,
    workAuthorization: "review",
    employerVerification: "not_applicable",
    employmentSituation: "not_applicable",
    shortageOccupation: "not_applicable",
    nextDeadline: null,
    confidence: "medium",
    findings: [],
    checklist: [],
    sourceIds: [],
    appliedRules: [],
    generatedAt: now.toISOString(),
    disclaimer: "Aide à la conformité — ne remplace pas une consultation juridique. Vérifier la version des textes et le régime spécial applicable avant décision.",
  };

  let forced: AssessmentStatus = "clear";
  const lockedPatchFields = new Set<string>();
  const context = { input, today: now };

  for (const rule of legalRules) {
    if (!rule.applies(context)) continue;

    result.appliedRules.push({
      ruleId: rule.id,
      version: rule.version,
      effectiveFrom: rule.effectiveFrom,
      lastReviewed: rule.lastReviewed,
      sourceIds: rule.sourceIds,
    });
    result.sourceIds.push(...rule.sourceIds);

    const output: RuleOutput = rule.evaluate(context);
    if (output.patches) {
      for (const [key, value] of Object.entries(output.patches)) {
        if (lockedPatchFields.has(key)) continue;
        (result as unknown as Record<string, unknown>)[key] = value;
        lockedPatchFields.add(key);
      }
    }
    if (output.findings) result.findings.push(...output.findings);
    if (output.checklist) result.checklist.push(...output.checklist);
    if (output.sourceIds) result.sourceIds.push(...output.sourceIds);
    if (output.forceStatus) forced = worstStatus(forced, output.forceStatus);
  }

  const derived = deriveStatus(input, result);
  result.status = worstStatus(derived, forced);
  result.statusLabel = labelFor(result.status);
  result.summary = summaryFor(result.status);
  result.sourceIds = [...new Set(result.sourceIds)];
  result.findings = dedupeById(result.findings);
  result.checklist = dedupeById(result.checklist);
  result.appliedRules = dedupeByRuleId(result.appliedRules);
  return result;
}

function dedupeById<T extends { id: string }>(items: T[]): T[] {
  return [...new Map(items.map((item) => [item.id, item])).values()];
}

function dedupeByRuleId<T extends { ruleId: string }>(items: T[]): T[] {
  return [...new Map(items.map((item) => [item.ruleId, item])).values()];
}
