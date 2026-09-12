import { describe, expect, it } from "vitest";
import { AuthorizationError, type ActorContext } from "@/application/authorization";
import {
  AssessmentTaskGenerationRequiresEmployeeError,
  ComplianceTaskAssessmentNotFoundError,
} from "@/application/compliance-task-errors";
import { generateAssessmentComplianceTasks } from "@/application/generate-assessment-compliance-tasks";
import type { AssessmentRecord } from "@/infrastructure/repositories/assessment-repository";
import { InMemoryAssessmentRepository } from "@/infrastructure/repositories/in-memory-assessment-repository";
import { InMemoryComplianceTaskStore } from "@/infrastructure/repositories/in-memory-compliance-task-store";

const actor: ActorContext = {
  userId: "00000000-0000-0000-0000-000000000101",
  organizationId: "00000000-0000-0000-0000-000000000001",
  role: "hr",
};

function makeAssessment(employeeId: string | null = "00000000-0000-0000-0000-000000000201"): AssessmentRecord {
  return {
    id: "00000000-0000-0000-0000-000000000301",
    organizationId: actor.organizationId,
    employeeId,
    createdByUserId: actor.userId,
    createdAt: "2026-09-12T12:00:00.000Z",
    inputSnapshot: {
      action: "renew",
      nationalityGroup: "third_country",
      location: "france",
      permitType: "employee",
      permitValidUntil: "2026-10-01",
      contractType: "cdi",
      newContract: false,
    },
    resultSnapshot: {
      status: "conditional",
      statusLabel: "Sous conditions",
      summary: "Des actions restent à accomplir.",
      canWorkNow: true,
      workAuthorization: "review",
      employerVerification: "not_applicable",
      employmentSituation: "not_applicable",
      shortageOccupation: "not_applicable",
      nextDeadline: "2026-10-01",
      confidence: "medium",
      findings: [],
      checklist: [
        { id: "already-done", label: "Action déjà terminée", status: "done" },
        { id: "file-renewal", label: "Déposer le renouvellement", status: "todo" },
        { id: "verify-proof", label: "Vérifier le justificatif", status: "attention" },
        { id: "stop-work", label: "Suspendre le travail si nécessaire", status: "blocked" },
      ],
      sourceIds: [],
      appliedRules: [],
      generatedAt: "2026-09-12T12:00:00.000Z",
      disclaimer: "Test",
    },
    ruleVersions: [],
  };
}

describe("generateAssessmentComplianceTasks", () => {
  it("creates only open checklist items plus the explicit next deadline", async () => {
    const assessments = new InMemoryAssessmentRepository();
    const tasks = new InMemoryComplianceTaskStore();
    const assessment = makeAssessment();
    await assessments.save(assessment);

    const result = await generateAssessmentComplianceTasks(
      assessment.id,
      assessments,
      tasks,
      actor,
      new Date("2026-09-12T13:00:00.000Z"),
    );

    expect(result.created).toHaveLength(4);
    expect(result.created.map((task) => task.sourceKey).sort()).toEqual([
      "checklist:file-renewal",
      "checklist:stop-work",
      "checklist:verify-proof",
      "result:next-deadline",
    ]);
    expect(result.created.find((task) => task.sourceKey === "checklist:stop-work")?.severity).toBe("critical");
    expect(result.created.find((task) => task.sourceKey === "checklist:verify-proof")?.severity).toBe("warning");
    expect(result.created.find((task) => task.sourceKey === "checklist:file-renewal")?.dueAt).toBeNull();
    expect(result.created.find((task) => task.sourceKey === "result:next-deadline")?.dueAt).toBe("2026-10-01T00:00:00.000Z");
  });

  it("is idempotent for the same assessment and source keys", async () => {
    const assessments = new InMemoryAssessmentRepository();
    const tasks = new InMemoryComplianceTaskStore();
    const assessment = makeAssessment();
    await assessments.save(assessment);

    await generateAssessmentComplianceTasks(assessment.id, assessments, tasks, actor);
    const second = await generateAssessmentComplianceTasks(assessment.id, assessments, tasks, actor);

    expect(second.created).toHaveLength(0);
    expect(second.existingSourceKeys).toHaveLength(4);
    expect(await tasks.listByOrganization(actor.organizationId)).toHaveLength(4);
  });

  it("refuses task generation for an assessment not linked to an employee", async () => {
    const assessments = new InMemoryAssessmentRepository();
    const tasks = new InMemoryComplianceTaskStore();
    const assessment = makeAssessment(null);
    await assessments.save(assessment);

    await expect(generateAssessmentComplianceTasks(assessment.id, assessments, tasks, actor))
      .rejects.toBeInstanceOf(AssessmentTaskGenerationRequiresEmployeeError);
  });

  it("keeps tenant isolation and RBAC", async () => {
    const assessments = new InMemoryAssessmentRepository();
    const tasks = new InMemoryComplianceTaskStore();
    const assessment = makeAssessment();
    await assessments.save(assessment);

    await expect(generateAssessmentComplianceTasks(
      assessment.id,
      assessments,
      tasks,
      { ...actor, organizationId: "00000000-0000-0000-0000-000000000002" },
    )).rejects.toBeInstanceOf(ComplianceTaskAssessmentNotFoundError);

    await expect(generateAssessmentComplianceTasks(
      assessment.id,
      assessments,
      tasks,
      { ...actor, role: "readonly" },
    )).rejects.toBeInstanceOf(AuthorizationError);
  });
});
