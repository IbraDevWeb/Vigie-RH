import { legalRules } from "./rules";
import type { AssessmentInput, AssessmentResult, AssessmentStatus, RuleOutput } from "./types";

const statusRank: Record<AssessmentStatus, number> = { clear: 0, conditional: 1, review_required: 2, blocked: 3 };

function worstStatus(a: AssessmentStatus, b?: AssessmentStatus): AssessmentStatus {
  if (!b) return a;
  return statusRank[b] > statusRank[a] ? b : a;
}

function deriveStatus(result: AssessmentResult): AssessmentStatus {
  if (result.canWorkNow === false) return "blocked";
  if (result.workAuthorization === "review" || result.employerVerification === "review") return "review_required";
  if (result.workAuthorization === "yes") return "conditional";
  return "clear";
}

function labelFor(status: AssessmentStatus): string {
  return {
    clear: "Situation claire",
    conditional: "Possible sous conditions",
    blocked: "Prise ou maintien en poste bloqué",
    review_required: "Validation juridique requise",
  }[status];
}

function summaryFor(status: AssessmentStatus): string {
  return {
    clear: "Les informations fournies ne déclenchent pas de blocage dans le périmètre des règles modélisées.",
    conditional: "Une ou plusieurs démarches doivent être réalisées avant ou pendant l'opération envisagée.",
    blocked: "Le droit au travail n'est pas suffisamment établi pour permettre la prise ou le maintien en poste.",
    review_required: "Le cas comporte une incertitude ou un régime spécial qui ne doit pas être tranché automatiquement.",
  }[status];
}

export function assessCase(input: AssessmentInput, now = new Date()): AssessmentResult {
  let result: AssessmentResult = {
    status: "clear",
    statusLabel: "Situation claire",
    summary: "",
    canWorkNow: null,
    workAuthorization: "review",
    employerVerification: "review",
    confidence: "medium",
    findings: [],
    checklist: [],
    sourceIds: [],
    generatedAt: now.toISOString(),
    disclaimer: "Aide à la conformité — ne remplace pas une consultation juridique. Vérifier la version des textes et le régime spécial applicable avant décision.",
  };

  let forced: AssessmentStatus = "clear";
  const lockedPatchFields = new Set<string>();
  const context = { input, today: now };

  for (const rule of legalRules) {
    if (!rule.applies(context)) continue;
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

  const derived = deriveStatus(result);
  result.status = worstStatus(derived, forced);
  result.statusLabel = labelFor(result.status);
  result.summary = summaryFor(result.status);
  result.sourceIds = [...new Set(result.sourceIds)];
  result.findings = dedupeById(result.findings);
  result.checklist = dedupeById(result.checklist);
  return result;
}

function dedupeById<T extends { id: string }>(items: T[]): T[] {
  return [...new Map(items.map((item) => [item.id, item])).values()];
}
