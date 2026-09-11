import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Icon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { RiskDot } from "@/components/risk-dot";
import { getComplianceOverview } from "@/application/get-compliance-overview";
import type { OperationalAttentionLevel } from "@/domain/compliance/overview";
import { getAssessmentRepository } from "@/infrastructure/repositories/assessment-repository-provider";
import { getComplianceTaskStore } from "@/infrastructure/repositories/compliance-task-store-provider";
import { getEmployeeDocumentStore } from "@/infrastructure/repositories/employee-document-store-provider";
import { getEmployeeStore } from "@/infrastructure/repositories/employee-store-provider";
import { employeeRepository } from "@/infrastructure/repositories/in-memory-employee-repository";
import { resolveServerActor } from "@/infrastructure/security/request-actor";
import { formatFrenchDate } from "@/lib/date";

interface EmployeesPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function firstParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function attentionLabel(level: OperationalAttentionLevel): string {
  if (level === "urgent") return "Urgent";
  if (level === "attention") return "À surveiller";
  if (level === "no_open_signal") return "Aucun signal ouvert";
  return "À qualifier";
}

function attentionTone(level: OperationalAttentionLevel): "danger" | "warning" | "success" | "neutral" {
  if (level === "urgent") return "danger";
  if (level === "attention") return "warning";
  if (level === "no_open_signal") return "success";
  return "neutral";
}

async function DemoEmployeesPage() {
  const employees = await employeeRepository.list();
  return <AppShell title="Salariés" subtitle="Centralisez les titres, échéances, contrôles et prochaines actions." action={<button className="btn secondary"><Icon name="plus"/> Ajouter un salarié</button>}>
    <div className="toolbar card"><label className="search-box"><Icon name="search"/><input placeholder="Rechercher un salarié, une nationalité…"/></label><div className="toolbar-actions"><select defaultValue="all"><option value="all">Tous les statuts</option><option>Critiques</option><option>À surveiller</option><option>Conformes</option></select><select defaultValue="all"><option value="all">Tous les sites</option><option>Paris</option><option>Lyon</option><option>Marseille</option></select></div></div>
    <div className="employee-card-grid">{employees.map((employee) => <Link href={`/salaries/${employee.id}`} className="employee-card card" key={employee.id}><div className="employee-card-top"><span className="avatar large">{employee.firstName[0]}{employee.lastName[0]}</span><Badge tone={employee.risk === "ok" ? "success" : employee.risk === "attention" ? "warning" : "danger"}><RiskDot risk={employee.risk}/>{employee.riskLabel}</Badge></div><h3>{employee.firstName} {employee.lastName}</h3><p>{employee.role} · {employee.site}</p><dl><div><dt>Nationalité</dt><dd>{employee.nationality}</dd></div><div><dt>Contrat</dt><dd>{employee.contract}</dd></div><div><dt>Titre</dt><dd>{employee.permitLabel}</dd></div><div><dt>Expiration</dt><dd>{formatFrenchDate(employee.permitValidUntil)}</dd></div></dl><div className="next-action"><Icon name="clock"/><span>{employee.nextAction}</span><Icon name="chevron"/></div></Link>)}</div>
  </AppShell>;
}

async function ServerEmployeesPage({ searchParams }: EmployeesPageProps) {
  const actor = resolveServerActor();
  const overview = await getComplianceOverview(
    getEmployeeStore(),
    getEmployeeDocumentStore(),
    getAssessmentRepository(),
    getComplianceTaskStore(),
    actor,
  );
  const params = await searchParams;
  const query = firstParam(params?.q).trim().toLocaleLowerCase("fr-FR");
  const status = firstParam(params?.status) || "all";
  const site = firstParam(params?.site) || "all";
  const sites = [...new Set(overview.employees.map((employee) => employee.workSite).filter((value): value is string => Boolean(value)))].sort();
  const employees = overview.employees.filter((employee) => {
    const searchable = `${employee.firstName} ${employee.lastName} ${employee.roleTitle ?? ""} ${employee.workSite ?? ""}`.toLocaleLowerCase("fr-FR");
    return (!query || searchable.includes(query))
      && (status === "all" || employee.attentionLevel === status)
      && (site === "all" || employee.workSite === site);
  });

  return <AppShell title="Salariés" subtitle="Portefeuille persistant et signaux opérationnels issus des données de votre organisation.">
    <form className="toolbar card" method="get">
      <label className="search-box"><Icon name="search"/><input name="q" defaultValue={firstParam(params?.q)} placeholder="Rechercher un salarié, un poste, un site…"/></label>
      <div className="toolbar-actions">
        <select name="status" defaultValue={status}><option value="all">Tous les états</option><option value="urgent">Urgents</option><option value="attention">À surveiller</option><option value="unknown">À qualifier</option><option value="no_open_signal">Aucun signal ouvert</option></select>
        <select name="site" defaultValue={site}><option value="all">Tous les sites</option>{sites.map((value) => <option value={value} key={value}>{value}</option>)}</select>
        <button className="btn secondary small" type="submit">Filtrer</button>
      </div>
    </form>

    {employees.length === 0 ? <section className="card"><div className="notice info"><Icon name="search"/><div><strong>Aucun salarié correspondant</strong><p>Modifiez les filtres ou vérifiez que le portefeuille persistant contient des salariés pour cette organisation.</p></div></div></section> : null}

    <div className="employee-card-grid">{employees.map((employee) => <Link href={`/salaries/${employee.employeeId}`} className="employee-card card" key={employee.employeeId}>
      <div className="employee-card-top"><span className="avatar large">{employee.firstName[0]}{employee.lastName[0]}</span><Badge tone={attentionTone(employee.attentionLevel)}>{attentionLabel(employee.attentionLevel)}</Badge></div>
      <h3>{employee.firstName} {employee.lastName}</h3>
      <p>{employee.roleTitle ?? "Poste non renseigné"}{employee.workSite ? ` · ${employee.workSite}` : ""}</p>
      <dl><div><dt>Documents actuels</dt><dd>{employee.currentDocumentCount}</dd></div><div><dt>Prochaine expiration</dt><dd>{employee.currentDocumentNextExpiry ? formatFrenchDate(employee.currentDocumentNextExpiry) : "Non renseignée"}</dd></div><div><dt>Tâches ouvertes</dt><dd>{employee.openTaskCount}</dd></div><div><dt>Dernier assessment</dt><dd>{employee.latestAssessment?.statusLabel ?? "Aucun"}</dd></div></dl>
      <div className="next-action"><Icon name="clock"/><span>{employee.nextTaskDueAt ? `Prochaine tâche : ${new Intl.DateTimeFormat("fr-FR").format(new Date(employee.nextTaskDueAt))}` : "Aucune tâche datée ouverte"}</span><Icon name="chevron"/></div>
    </Link>)}</div>
    <div className="notice info"><Icon name="shield"/><div><strong>État opérationnel</strong><p>{overview.disclaimer}</p></div></div>
  </AppShell>;
}

export default async function EmployeesPage(props: EmployeesPageProps) {
  if (process.env.GITHUB_PAGES === "true") return DemoEmployeesPage();
  return ServerEmployeesPage(props);
}
