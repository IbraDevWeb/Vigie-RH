export class AssessmentEmployeeNotFoundError extends Error {
  constructor(public readonly employeeId: string) {
    super("Salarié introuvable dans l'organisation courante.");
    this.name = "AssessmentEmployeeNotFoundError";
  }
}
