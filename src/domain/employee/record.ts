export interface EmployeeRecord {
  id: string;
  organizationId: string;
  firstName: string;
  lastName: string;
  nationalityCode: string | null;
  roleTitle: string | null;
  workSite: string | null;
  contractType: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEmployeeInput {
  firstName: string;
  lastName: string;
  nationalityCode?: string | null;
  roleTitle?: string | null;
  workSite?: string | null;
  contractType?: string | null;
}
