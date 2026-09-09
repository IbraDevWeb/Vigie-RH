export type EmployeeRisk = "ok" | "attention" | "critical";

export interface EmployeeDocument {
  id: string;
  label: string;
  type: string;
  validUntil?: string;
  status: "valid" | "expiring" | "expired" | "pending";
}

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  nationality: string;
  role: string;
  site: string;
  contract: string;
  permitLabel: string;
  permitValidUntil?: string;
  risk: EmployeeRisk;
  riskLabel: string;
  nextAction: string;
  documents: EmployeeDocument[];
  timeline: { date: string; title: string; detail: string; tone: "neutral" | "success" | "warning" | "danger" }[];
}
