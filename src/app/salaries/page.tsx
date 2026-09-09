import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Icon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { RiskDot } from "@/components/risk-dot";
import { employeeRepository } from "@/infrastructure/repositories/in-memory-employee-repository";
import { formatFrenchDate } from "@/lib/date";

export default async function EmployeesPage() {
  const employees = await employeeRepository.list();
  return <AppShell title="Salariés" subtitle="Centralisez les titres, échéances, contrôles et prochaines actions." action={<button className="btn secondary"><Icon name="plus"/> Ajouter un salarié</button>}>
    <div className="toolbar card"><label className="search-box"><Icon name="search"/><input placeholder="Rechercher un salarié, une nationalité…"/></label><div className="toolbar-actions"><select defaultValue="all"><option value="all">Tous les statuts</option><option>Critiques</option><option>À surveiller</option><option>Conformes</option></select><select defaultValue="all"><option value="all">Tous les sites</option><option>Paris</option><option>Lyon</option><option>Marseille</option></select></div></div>
    <div className="employee-card-grid">{employees.map((employee) => <Link href={`/salaries/${employee.id}`} className="employee-card card" key={employee.id}><div className="employee-card-top"><span className="avatar large">{employee.firstName[0]}{employee.lastName[0]}</span><Badge tone={employee.risk === "ok" ? "success" : employee.risk === "attention" ? "warning" : "danger"}><RiskDot risk={employee.risk}/>{employee.riskLabel}</Badge></div><h3>{employee.firstName} {employee.lastName}</h3><p>{employee.role} · {employee.site}</p><dl><div><dt>Nationalité</dt><dd>{employee.nationality}</dd></div><div><dt>Contrat</dt><dd>{employee.contract}</dd></div><div><dt>Titre</dt><dd>{employee.permitLabel}</dd></div><div><dt>Expiration</dt><dd>{formatFrenchDate(employee.permitValidUntil)}</dd></div></dl><div className="next-action"><Icon name="clock"/><span>{employee.nextAction}</span><Icon name="chevron"/></div></Link>)}</div>
  </AppShell>;
}
