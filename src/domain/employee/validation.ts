import { z } from "zod";
import type { CreateEmployeeInput } from "./record";

const optionalText = z.string().trim().min(1).max(200).nullable().optional();

const createEmployeeSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  nationalityCode: z.string().trim().length(2).transform((value) => value.toUpperCase()).nullable().optional(),
  roleTitle: optionalText,
  workSite: optionalText,
  contractType: optionalText,
}).strict();

export class EmployeeValidationError extends Error {
  constructor(public readonly issues: string[]) {
    super("Données salarié invalides");
    this.name = "EmployeeValidationError";
  }
}

export function validateCreateEmployeeInput(input: unknown): CreateEmployeeInput {
  const parsed = createEmployeeSchema.safeParse(input);
  if (!parsed.success) {
    throw new EmployeeValidationError(parsed.error.issues.map((issue) => issue.message));
  }

  return parsed.data;
}
