import type { Employee } from "@/domain/employee/types";

export interface EmployeeRepository {
  list(): Promise<Employee[]>;
  findById(id: string): Promise<Employee | null>;
}
