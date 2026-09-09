export class ComplianceTaskEmployeeNotFoundError extends Error {
  constructor(public readonly employeeId: string) {
    super("Salarié introuvable dans l'organisation courante.");
    this.name = "ComplianceTaskEmployeeNotFoundError";
  }
}

export class ComplianceTaskAssessmentNotFoundError extends Error {
  constructor(public readonly assessmentId: string) {
    super("Assessment introuvable dans l'organisation courante.");
    this.name = "ComplianceTaskAssessmentNotFoundError";
  }
}
