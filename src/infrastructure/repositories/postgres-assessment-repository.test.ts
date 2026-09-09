import { describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { assessCase } from "@/domain/legal/engine";
import { validateAssessmentInput } from "@/domain/legal/validation";
import { PostgresAssessmentRepository } from "./postgres-assessment-repository";
import type { AssessmentRecord } from "./assessment-repository";

const organizationId = "00000000-0000-4000-8000-000000000001";
const userId = "00000000-0000-4000-8000-000000000002";

function makeRecord(): AssessmentRecord {
  const input = validateAssessmentInput({
    action: "can_work",
    nationalityGroup: "eu_eea_swiss",
    location: "france",
    permitType: "none",
    contractType: "cdi",
    newContract: false,
  });
  const result = assessCase(input, new Date("2026-09-09T12:00:00.000Z"));

  return {
    id: "00000000-0000-4000-8000-000000000010",
    organizationId,
    createdByUserId: userId,
    inputSnapshot: input,
    resultSnapshot: result,
    ruleVersions: result.appliedRules,
    createdAt: result.generatedAt,
  };
}

describe("PostgresAssessmentRepository", () => {
  it("sets the tenant context before inserting an assessment", async () => {
    const calls: Array<{ text: string; values?: unknown[] }> = [];
    const client = {
      query: async (text: string, values?: unknown[]) => {
        calls.push({ text, values });
        return { rows: [] };
      },
      release: () => undefined,
    };
    const pool = { connect: async () => client } as unknown as Pool;
    const repository = new PostgresAssessmentRepository(pool);

    await repository.save(makeRecord());

    expect(calls[0]?.text).toBe("begin");
    expect(calls[1]).toEqual({
      text: "select set_config('vigie.organization_id', $1, true)",
      values: [organizationId],
    });
    expect(calls[2]?.text).toContain("insert into assessments");
    expect(calls[2]?.values?.[1]).toBe(organizationId);
    expect(calls.at(-1)?.text).toBe("commit");
  });

  it("filters lookups by both id and organization", async () => {
    const record = makeRecord();
    const calls: Array<{ text: string; values?: unknown[] }> = [];
    const client = {
      query: async (text: string, values?: unknown[]) => {
        calls.push({ text, values });
        if (text.includes("select id, organization_id")) {
          return {
            rows: [{
              id: record.id,
              organization_id: record.organizationId,
              created_by: record.createdByUserId,
              input_snapshot: record.inputSnapshot,
              result_snapshot: record.resultSnapshot,
              rule_versions: record.ruleVersions,
              created_at: record.createdAt,
            }],
          };
        }
        return { rows: [] };
      },
      release: () => undefined,
    };
    const pool = { connect: async () => client } as unknown as Pool;
    const repository = new PostgresAssessmentRepository(pool);

    const found = await repository.findById(record.id, organizationId);

    expect(found).toEqual(record);
    const selectCall = calls.find((call) => call.text.includes("where id = $1"));
    expect(selectCall?.values).toEqual([record.id, organizationId]);
  });
});
