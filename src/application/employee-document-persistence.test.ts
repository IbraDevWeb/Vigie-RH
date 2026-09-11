import { describe, expect, it } from "vitest";
import type { ActorContext } from "./authorization";
import { createEmployee } from "./create-employee";
import { createEmployeeDocument } from "./create-employee-document";
import { getEmployeeDocument } from "./get-employee-document";
import { listEmployeeDocuments } from "./list-employee-documents";
import { InMemoryEmployeeDocumentStore } from "@/infrastructure/repositories/in-memory-employee-document-store";
import { InMemoryEmployeeStore } from "@/infrastructure/repositories/in-memory-employee-store";

const hr: ActorContext = {
  userId: "00000000-0000-4000-8000-000000000002",
  organizationId: "00000000-0000-4000-8000-000000000001",
  role: "hr",
};

describe("employee document persistence use-cases", () => {
  it("creates metadata only for an employee in the current organization", async () => {
    const employees = new InMemoryEmployeeStore();
    const documents = new InMemoryEmployeeDocumentStore();
    const employee = await createEmployee({ firstName: "Nora", lastName: "Martin" }, employees, hr);

    const document = await createEmployeeDocument(employee.id, {
      documentType: "residence_permit",
      label: "Carte de séjour",
      issuedAt: "2026-01-10",
      validUntil: "2027-01-09",
      storageKey: "org/employee/document.pdf",
      isCurrent: true,
    }, documents, employees, hr, new Date("2026-09-09T18:00:00.000Z"));

    expect(document.organizationId).toBe(hr.organizationId);
    expect(document.employeeId).toBe(employee.id);
    expect(document.isCurrent).toBe(true);
    expect(document.extractedFields).toEqual({});
    expect(document.confirmedAt).toBeNull();
    await expect(listEmployeeDocuments(employee.id, documents, employees, hr)).resolves.toHaveLength(1);
  });

  it("defaults an omitted current marker to historical", async () => {
    const employees = new InMemoryEmployeeStore();
    const documents = new InMemoryEmployeeDocumentStore();
    const employee = await createEmployee({ firstName: "Nora", lastName: "Martin" }, employees, hr);

    const document = await createEmployeeDocument(
      employee.id,
      { documentType: "archive", label: "Ancien titre" },
      documents,
      employees,
      hr,
    );

    expect(document.isCurrent).toBe(false);
  });

  it("refuses to attach a document to an employee from another organization", async () => {
    const employees = new InMemoryEmployeeStore();
    const documents = new InMemoryEmployeeDocumentStore();
    const employee = await createEmployee({ firstName: "Nora", lastName: "Martin" }, employees, hr);

    const foreignActor: ActorContext = {
      ...hr,
      organizationId: "00000000-0000-4000-8000-000000000099",
    };

    await expect(createEmployeeDocument(employee.id, {
      documentType: "permit",
      label: "Titre",
    }, documents, employees, foreignActor)).rejects.toThrow("Salarié introuvable");
  });

  it("allows readonly users to read documents but not create them", async () => {
    const employees = new InMemoryEmployeeStore();
    const documents = new InMemoryEmployeeDocumentStore();
    const employee = await createEmployee({ firstName: "Nora", lastName: "Martin" }, employees, hr);
    await createEmployeeDocument(employee.id, { documentType: "permit", label: "Titre" }, documents, employees, hr);

    const readonly: ActorContext = { ...hr, role: "readonly" };
    await expect(listEmployeeDocuments(employee.id, documents, employees, readonly)).resolves.toHaveLength(1);
    await expect(createEmployeeDocument(
      employee.id,
      { documentType: "permit", label: "Autre titre" },
      documents,
      employees,
      readonly,
    )).rejects.toThrow("Permission refusée");
  });

  it("does not expose a document through another organization", async () => {
    const employees = new InMemoryEmployeeStore();
    const documents = new InMemoryEmployeeDocumentStore();
    const employee = await createEmployee({ firstName: "Nora", lastName: "Martin" }, employees, hr);
    const document = await createEmployeeDocument(employee.id, { documentType: "permit", label: "Titre" }, documents, employees, hr);

    const foreign = await getEmployeeDocument(employee.id, document.id, documents, {
      ...hr,
      organizationId: "00000000-0000-4000-8000-000000000099",
      role: "readonly",
    });

    expect(foreign).toBeNull();
  });

  it("rejects inconsistent or invalid document dates", async () => {
    const employees = new InMemoryEmployeeStore();
    const documents = new InMemoryEmployeeDocumentStore();
    const employee = await createEmployee({ firstName: "Nora", lastName: "Martin" }, employees, hr);

    await expect(createEmployeeDocument(employee.id, {
      documentType: "permit",
      label: "Titre",
      issuedAt: "2026-12-01",
      validUntil: "2026-11-30",
    }, documents, employees, hr)).rejects.toThrow("Métadonnées documentaires invalides");

    await expect(createEmployeeDocument(employee.id, {
      documentType: "permit",
      label: "Titre",
      issuedAt: "2026-02-31",
    }, documents, employees, hr)).rejects.toThrow("Métadonnées documentaires invalides");
  });
});
