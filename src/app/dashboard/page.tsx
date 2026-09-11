import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Icon } from "@/components/ui/icon";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { RiskDot } from "@/components/risk-dot";
import { getComplianceOverview } from "@/application/get-compliance-overview";
import type { OperationalAttentionLevel, OperationalPriority } from "@/domain/compliance/overview";
import { getAssessmentRepository } from "@/infrastructure/repositories/assessment-repository-provider";
import { getComplianceTaskStore } from "@/infrastructure/repositories/compliance-task-store-provider";
import { getEmployeeDocumentStore } from "@/infrastructure/repositories/employee-document-store-provider";
import { getEmployeeStore } from "@/infrastructure/repositories/employee-store-provider";
import { employeeRepository } from "@/infrastructure/repositories/in-memory-employee-repository";
import { resolveServerActor } from "@/infrastructure/security/request-actor";
import { formatFrenchDate } from "@/lib/date";

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

function priorityTone(priority: OperationalPriority): "danger" | "warning" | "neutral" {
  if (priority.urgency === "overdue") return "danger";
  if (priority.urgency === "critical") return "warning";
  return "neutral";
}

function priorityLabel(priority: OperationalPriority): string {
  if (priority.urgency === "overdue") return "En retard";
  if (priority.urgency === "critical") return "Prioritaire";
  return priority.kind === "document_expiry" ? "Échéance" : "À planifier";
}

function formatOperationalDate(value: string | null): string {
  if (!value) return "—";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return formatFrenchDate(value);
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

async function DemoDashboard() {
  const employees = await employeeRepository.list();
  const critical = employees.filter((e) => e.risk === "critical").length;
  const attention = employees.filter((e) => e.risk === "attention").length;
  return <AppShell title="Bonjour, Ibrahim" subtitle="Voici les points de conformité qui nécessitent votre attention." action={<Link className="btn primary" href="/analyse"><Icon name="plus"/> Nouvelle analyse</Link>}>
    <div className="stats-grid"><StatCard label="Salariés suivis" value={String(employees.length)} detail="Portefeuille de démonstration" icon={<Icon name="users"/>}/><StatCard label="Action urgente" value={String(critical)} detail="À traiter aujourd'hui" icon={<Icon name="alert"/>}/><StatCard label="À surveiller" value={String(attention)} detail="Échéance < 90 jours" icon={<Icon name="clock"/>}/><StatCard label="Score conformité" value="83%" detail="Donnée de démonstration" icon={<Icon name="shield"/>}/></div>
    <div className="dashboard-grid"><section className="card span-2"><div className="card-heading"><div><p className="eyebrow">Priorités</p><h2>Actions à traiter</h2></div><Link href="/audit">Voir l'audit <Icon name="arrow"/></Link></div><div className="action-list"><div className="action-row critical"><span className="action-icon"><Icon name="alert"/></span><div><strong>Renouvellement à vérifier — Samir Haddad</strong><p>Certificat de résidence · échéance dans 18 jours · régime spécial</p></div><Badge tone="danger">Aujourd'hui</Badge></div><div className="action-row warning"><span className="action-icon"><Icon name="calendar"/></span><div><strong>Anticiper le renouvellement — Léo Martins</strong><p>Carte étudiant · échéance le 22 novembre 2026</p></div><Badge tone="warning">J-74</Badge></div><div className="action-row"><span className="action-icon"><Icon name="file"/></span><div><strong>2 justificatifs à archiver</strong><p>Preuves de contrôle employeur manquantes dans les dossiers récents</p></div><Badge>Cette semaine</Badge></div></div></section>
      <section className="card"><div className="card-heading"><div><p className="eyebrow">État du parc</p><h2>Conformité</h2></div></div><div className="donut-wrap"><div className="donut"><span>83<small>%</small></span></div><div className="legend"><p><i className="legend-ok"/>Conformes <strong>2</strong></p><p><i className="legend-attention"/>À surveiller <strong>1</strong></p><p><i className="legend-critical"/>Critiques <strong>1</strong></p></div></div></section>
    </div>
    <section className="card"><div className="card-heading"><div><p className="eyebrow">Portefeuille</p><h2>Salariés étrangers</h2></div><Link href="/salaries">Voir tous <Icon name="arrow"/></Link></div><div className="table-wrap"><table><thead><tr><th>Salarié</th><th>Titre</th><th>Expiration</th><th>Statut</th><th>Prochaine action</th></tr></thead><tbody>{employees.map((employee) => <tr key={employee.id}><td><Link className="employee-cell" href={`/salaries/${employee.id}`}><span className="avatar soft">{employee.firstName[0]}{employee.lastName[0]}</span><span><strong>{employee.firstName} {employee.lastName}</strong><small>{employee.role} · {employee.site}</small></span></Link></td><td>{employee.permitLabel}</td><td>{formatFrenchDate(employee.permitValidUntil)}</td><td><span className="risk-label"><RiskDot risk={employee.risk}/>{employee.riskLabel}</span></td><td className="muted">{employee.nextAction}</td></tr>)}</tbody></table></div></section>
  </AppShell>;
}

async function ServerDashboard() {
  const actor = resolveServerActor();
  const overview = await getComplianceOverview(
    getEmployeeStore(),
    getEmployeeDocumentStore(),
    getAssessmentRepository(),
    getComplianceTaskStore(),
    actor,
  );

  const urgentEmployees = overview.employees.filter((employee) => employee.attentionLevel === "urgent").length;
  const attentionEmployees = overview.employees.filter((employee) => employee.attentionLevel === "attention").length;
  const unknownEmployees = overview.employees.filter((employee) => employee.attentionLevel === "unknown").length;
  const assessedEmployees = overview.counts.employees - overview.counts.employeesWithoutAssessment;
  const assessmentCoverage = overview.counts.employees === 0
    ? 0
    : Math.round((assessedEmployees / overview.counts.employees) * 100);

  return <AppShell title="Tableau de bord" subtitle="Vue opérationnelle construite à partir des données persistées de votre organisation." action={<Link className="btn primary" href="/analyse"><Icon name="plus"/> Nouvelle analyse</Link>}>
    <div className="stats-grid">
      <StatCard label="Salariés suivis" value={String(overview.counts.employees)} detail="Portefeuille persistant" icon={<Icon name="users"/>}/>
      <StatCard label="Signaux urgents" value={String(urgentEmployees)} detail={`${overview.counts.overdueOpenTasks} tâche(s) ouverte(s) en retard`} icon={<Icon name="alert"/>}/>
      <StatCard label="À surveiller" value={String(attentionEmployees)} detail={`${overview.counts.currentDocumentsExpiringWithin90Days} document(s) actuel(s) à échéance < 90 j`} icon={<Icon name="clock"/>}/>
      <StatCard label="Couverture assessments" value={`${assessmentCoverage}%`} detail={`${assessedEmployees}/${overview.counts.employees} salarié(s) avec assessment`} icon={<Icon name="shield"/>}/>
    </div>

    <div className="dashboard-grid">
      <section className="card span-2">
        <div className="card-heading"><div><p className="eyebrow">Priorités</p><h2>Actions et échéances</h2></div></div>
        <div className="action-list">
          {overview.priorities.length === 0 ? <div className="action-row"><span className="action-icon"><Icon name="shield"/></span><div><strong>Aucune priorité datée ouverte</strong><p>Cette vue ne signifie pas que les dossiers sont juridiquement conformes.</p></div><Badge>À confirmer</Badge></div> : overview.priorities.slice(0, 6).map((priority) => <div className={`action-row ${priority.urgency === "overdue" ? "critical" : priority.urgency === "critical" ? "warning" : ""}`} key={`${priority.kind}-${priority.id}`}><span className="action-icon"><Icon name={priority.kind === "document_expiry" ? "file" : "calendar"}/></span><div><strong>{priority.title}{priority.employeeName ? ` — ${priority.employeeName}` : ""}</strong><p>{priority.kind === "document_expiry" ? "Document marqué actuel" : `Tâche ${priority.taskSeverity ?? ""}`} · échéance {formatOperationalDate(priority.dueAt)}</p></div><Badge tone={priorityTone(priority)}>{priorityLabel(priority)}</Badge></div>)}
        </div>
      </section>

      <section className="card">
        <div className="card-heading"><div><p className="eyebrow">Qualification</p><h2>État opérationnel</h2></div></div>
        <div className="action-list">
          <div className="action-row critical"><span className="action-icon"><Icon name="alert"/></span><div><strong>Urgents</strong><p>Signal fort vérifiable</p></div><Badge tone="danger">{urgentEmployees}</Badge></div>
          <div className="action-row warning"><span className="action-icon"><Icon name="clock"/></span><div><strong>À surveiller</strong><p>Échéance ou revue nécessaire</p></div><Badge tone="warning">{attentionEmployees}</Badge></div>
          <div className="action-row"><span className="action-icon"><Icon name="shield"/></span><div><strong>À qualifier</strong><p>Aucun assessment salarié disponible</p></div><Badge>{unknownEmployees}</Badge></div>
        </div>
      </section>
    </div>

    <section className="card">
      <div className="card-heading"><div><p className="eyebrow">Portefeuille</p><h2>Salariés suivis</h2></div></div>
      <div className="table-wrap"><table><thead><tr><th>Salarié</th><th>Documents actuels</th><th>Prochaine expiration</th><th>État opérationnel</th><th>Tâches ouvertes</th></tr></thead><tbody>{overview.employees.map((employee) => <tr key={employee.employeeId}><td><div className="employee-cell"><span className="avatar soft">{employee.firstName[0]}{employee.lastName[0]}</span><span><strong>{employee.firstName} {employee.lastName}</strong><small>{employee.roleTitle ?? "Poste non renseigné"}{employee.workSite ? ` · ${employee.workSite}` : ""}</small></span></div></td><td>{employee.currentDocumentCount}</td><td>{formatOperationalDate(employee.currentDocumentNextExpiry)}</td><td><Badge tone={attentionTone(employee.attentionLevel)}>{attentionLabel(employee.attentionLevel)}</Badge></td><td>{employee.openTaskCount}{employee.nextTaskDueAt ? <span className="muted"> · prochaine {formatOperationalDate(employee.nextTaskDueAt)}</span> : null}</td></tr>)}</tbody></table></div>
      <div className="notice info"><Icon name="shield"/><div><strong>Lecture opérationnelle</strong><p>{overview.disclaimer}</p></div></div>
    </section>
  </AppShell>;
}

export default async function DashboardPage() {
  if (process.env.GITHUB_PAGES === "true") return DemoDashboard();
  return ServerDashboard();
}
