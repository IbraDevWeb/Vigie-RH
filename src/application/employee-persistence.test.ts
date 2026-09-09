import { describe, expect, it } from "vitest";
import type { ActorContext } from "./authorization";
import { createEmployee } from "./create-employee";
import { getEmployee } from "./get-employee";
import { listEmployees } from "./list-employees";
import { InMemoryEmployeeStore } from "@/infrastructure/repositories/in-memory-employee-store";

const hr: ActorContext = {
  userId: "00000000-0000-4000-8000-000000000002",
  organizationId: "00000000-0000-4000-8000-000000000001",
  role: "hr",
};

describe("employee persistence use-cases", () => {
  it("normalizes the nationality code and persists the tenant", async () => {
    const store = new InMemoryEmployeeStore();
    const employee = await createEmployee({
      firstName: "Nora",
      lastName: "Martin",
      nationalityCode: "fr",
      roleTitle: "RH",
      contractType: "CDI",
    }, store, hr, new Date("2026-09-09T18:00:00.000Z"));

    expect(employee.nationalityCode).toBe("FR");
    expect(employee.organizationId).toBe(hr.organizationId);
    expect((await listEmployees(store, hr)).map((item) => item.id)).toEqual([employee.id]);
  });

  it("does not expose an employee through another organization", async () => {
    const store = new InMemoryEmployeeStore();
    const employee = await createEmployee({ firstName: "Nora", lastName: "Martin" }, store, hr);

    const foreign = await getEmployee(employee.id, store, {
      ...hr,
      organizationId: "00000000-0000-4000-8000-000000000099",
      role: "readonly",
    });

    expect(foreign).toBeNull();
  });

  it("allows read-only access to listings but refuses employee creation", async () => {
    const store = new InMemoryEmployeeStore();
    const readonly: ActorContext = { ...hr, role: "readonly" };

    await expect(listEmployees(store, readonly)).resolves.toEqual([]);
    await expect(createEmployee({ firstName: "Nora", lastName: "Martin" }, store, readonly))
      .rejects.toThrow("Permission refusée");
  });

  it("rejects a nationality code that is not two characters", async () => {
    const store = new InMemoryEmployeeStore();
    await expect(createEmployee({
      firstName: "Nora",
      lastName: "Martin",
      nationalityCode: "FRA",
    }, store, hr)).rejects.toThrow("Données salarié invalides");
  });
});
