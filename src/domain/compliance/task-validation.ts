import { z } from "zod";
import type { ComplianceTaskStatus, CreateComplianceTaskInput } from "./task-record";

const optionalUuid = z.string().uuid().nullable().optional();
const optionalDueAt = z.string().datetime({ offset: true }).nullable().optional();

const createComplianceTaskSchema = z.object({
  employeeId: optionalUuid,
  assessmentId: optionalUuid,
  title: z.string().trim().min(1).max(300),
  dueAt: optionalDueAt,
  severity: z.enum(["info", "warning", "critical"]).optional(),
}).strict();

const updateComplianceTaskStatusSchema = z.object({
  status: z.enum(["todo", "doing", "done", "cancelled"]),
}).strict();

export class ComplianceTaskValidationError extends Error {
  constructor(public readonly issues: string[]) {
    super("Données de tâche invalides");
    this.name = "ComplianceTaskValidationError";
  }
}

export function validateCreateComplianceTaskInput(input: unknown): CreateComplianceTaskInput {
  const parsed = createComplianceTaskSchema.safeParse(input);
  if (!parsed.success) {
    throw new ComplianceTaskValidationError(parsed.error.issues.map((issue) => issue.message));
  }
  return parsed.data;
}

export function validateComplianceTaskStatusInput(input: unknown): ComplianceTaskStatus {
  const parsed = updateComplianceTaskStatusSchema.safeParse(input);
  if (!parsed.success) {
    throw new ComplianceTaskValidationError(parsed.error.issues.map((issue) => issue.message));
  }
  return parsed.data.status;
}
