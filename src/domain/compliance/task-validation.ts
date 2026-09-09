import { z } from "zod";
import type {
  ComplianceTaskListFilter,
  ComplianceTaskStatus,
  CreateComplianceTaskInput,
} from "./task-record";

const optionalUuid = z.string().uuid().nullable().optional();
const optionalDueAt = z.string().datetime({ offset: true }).nullable().optional();
const statusSchema = z.enum(["todo", "doing", "done", "cancelled"]);

const createComplianceTaskSchema = z.object({
  employeeId: optionalUuid,
  assessmentId: optionalUuid,
  title: z.string().trim().min(1).max(300),
  dueAt: optionalDueAt,
  severity: z.enum(["info", "warning", "critical"]).optional(),
}).strict();

const updateComplianceTaskStatusSchema = z.object({
  status: statusSchema,
}).strict();

const complianceTaskListFilterSchema = z.object({
  employeeId: z.string().uuid().optional(),
  status: statusSchema.optional(),
}).strict();

export class ComplianceTaskValidationError extends Error {
  constructor(public readonly issues: string[]) {
    super("Données de tâche invalides");
    this.name = "ComplianceTaskValidationError";
  }
}

function parseOrThrow<T>(result: z.ZodSafeParseResult<T>): T {
  if (!result.success) {
    throw new ComplianceTaskValidationError(result.error.issues.map((issue) => issue.message));
  }
  return result.data;
}

export function validateCreateComplianceTaskInput(input: unknown): CreateComplianceTaskInput {
  return parseOrThrow(createComplianceTaskSchema.safeParse(input));
}

export function validateComplianceTaskStatusInput(input: unknown): ComplianceTaskStatus {
  return parseOrThrow(updateComplianceTaskStatusSchema.safeParse(input)).status;
}

export function validateComplianceTaskListFilter(input: unknown): ComplianceTaskListFilter {
  return parseOrThrow(complianceTaskListFilterSchema.safeParse(input));
}
