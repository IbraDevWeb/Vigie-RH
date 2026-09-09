import { z } from "zod";
import type { CreateEmployeeDocumentInput } from "./document-record";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date attendue au format YYYY-MM-DD").refine(
  (value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)),
  "Date invalide",
);

const nullableIsoDate = isoDate.nullable().optional();
const optionalStorageKey = z.string().trim().min(1).max(500).nullable().optional();

const createEmployeeDocumentSchema = z.object({
  documentType: z.string().trim().min(1).max(100),
  label: z.string().trim().min(1).max(200),
  storageKey: optionalStorageKey,
  issuedAt: nullableIsoDate,
  validUntil: nullableIsoDate,
}).strict().superRefine((value, context) => {
  if (value.issuedAt && value.validUntil && value.issuedAt > value.validUntil) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["validUntil"],
      message: "La date de fin de validité ne peut pas précéder la date d'émission.",
    });
  }
});

export class EmployeeDocumentValidationError extends Error {
  constructor(public readonly issues: string[]) {
    super("Métadonnées documentaires invalides");
    this.name = "EmployeeDocumentValidationError";
  }
}

export function validateCreateEmployeeDocumentInput(input: unknown): CreateEmployeeDocumentInput {
  const parsed = createEmployeeDocumentSchema.safeParse(input);
  if (!parsed.success) {
    throw new EmployeeDocumentValidationError(parsed.error.issues.map((issue) => issue.message));
  }

  return parsed.data;
}
