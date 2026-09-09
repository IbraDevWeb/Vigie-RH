import type { Employee } from "@/domain/employee/types";
import type { EmployeeRepository } from "./employee-repository";
import { demoEmployees } from "@/infrastructure/mock/employees";

export class InMemoryEmployeeRepository implements EmployeeRepository {
  async list(): Promise<Employee[]> { return demoEmployees; }
  async findById(id: string): Promise<Employee | null> { return demoEmployees.find((employee) => employee.id === id) ?? null; }
}

export const employeeRepository = new InMemoryEmployeeRepository();
