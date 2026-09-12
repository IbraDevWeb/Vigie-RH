import { notFound } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { getEmployeeDossier } from "@/application/get-employee-dossier";
import type { ComplianceTaskRecord } from "@/domain/compliance/task-record";
import type { EmployeeDocumentRecord } from "@/domain/employee/document-record";
import type { AssessmentRecord } from "@/infrastructure/repositories/assessment-repository";
import { getAssessmentRepository } from "@/infrastructure/repositories/assessment-repository-provider";
import { getComplianceTaskStore } from "@/infrastructure/repositories/compliance-task-store-provider";
import { getEmployeeDocumentStore } from "@/infrastructure/repositories/employee-document-store-provider";
import { getEmployeeStore } from "@/infrastructure/repositories/employee-store-provider";
import { employeeRepository } from "@/infrastructure/repositories/in-memory-employee-repository";
import { resolveServerActor } from "@/infrastructure/security/request-actor";
import { formatFrenchDate } from "@/lib/date";

export async function generateStaticParams() {
  if (process.env.GITHUB_PAGES !== "true") return [];
  const employees = await employeeRepository.list();
  return employees.map((employee) => ({ id: employee.id }));
}

function formatDateTime(value: string | null): string {
  if (!value) return "Non datée";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function assessmentTone(status: AssessmentRecord["resultSnapshot"]["status"]): "success" | "warning" | "danger" | "neutral" {
  if (status === "clear") return "success";
  if (status === "conditional" || status === "review_required") return "warning";
  if (status === "blocked") return "danger";
  return "neutral";
}

function documentTone(document: EmployeeDocumentRecord, today: string): "success" | "warning" | "danger" | "neutral" {
  if (!document.isCurrent) return "neutral";
  if (!document.validUntil) return "neutral";
  if (document.validUntil < today) return "danger";
  const ninetyDays = new Date(`${today}T00:00:00.000Z`);
  ninetyDays.setUTCDate(ninetyDays.getUTCDate() + 90);
  return document.validUntil <= ninetyDays.toISOString().slice(0, 10) ? "warning" : "success";
}

function documentStatus(document: EmployeeDocumentRecord, today: string): string {
  if (!document.isCurrent) return "Historique";
  if (!document.validUntil) return "Actuel · sans échéance";
  if (document.validUntil < today) return "Échéance dépassée";
  const ninetyDays = new Date(`${today}T00:00:00.000Z`);
  ninetyDays.setUTCDate(ninetyDays.getUTCDate() + 90);
  if (document.validUntil <= ninetyDays.toISOString().slice(0, 10)) return "Échéance < 90 jours";
  return "Actuel";
}

function taskTone(task: ComplianceTaskRecord): "danger" | "warning" | "neutral" {
  if (task.severity === "critical") return "danger";
  if (task.severity === "warning") return "warning";
  return "neutral";
}

async function DemoEmployeeDetailPage(id: string) {
  const employee = await employeeRepository.findById(id);
  if (!employee) notFound();
  return <AppShell title={`${employee.firstName} ${employee.lastName}`} subtitle={`${employee.role} · ${employee.site}`} action={<Link href="/analyse" className="btn primary"><Icon name="scan"/> Analyser une action</Link>}>
    <div className="detail-grid"><section className="card detail-profile"><div className="profile-head"><span className="avatar xlarge">{employee.firstName[0]}{employee.lastName[0]}</span><div><h2>{employee.firstName} {employee.lastName}</h2><p>{employee.nationality} · {employee.contract}</p><Badge tone={employee.risk === "ok" ? "success" : employee.risk === "attention" ? "warning" : "danger"}>{employee.riskLabel}</Badge></div></div><dl className="profile-facts"><div><dt>Titre actuel</dt><dd>{employee.permitLabel}</dd></div><div><dt>Valide jusqu'au</dt><dd>{formatFrenchDate(employee.permitValidUntil)}</dd></div><div><dt>Prochaine action</dt><dd>{employee.nextAction}</dd></div></dl></section>
      <section className="card span-2"><div className="card-heading"><div><p className="eyebrow">Dossier</p><h2>Documents de conformité</h2></div><button className="btn secondary small"><Icon name="plus"/> Ajouter</button></div><div className="document-list">{employee.documents.map((doc) => <div className="document-row" key={doc.id}><span className="document-icon"><Icon name="file"/></span><div><strong>{doc.label}</strong><small>{doc.type}{doc.validUntil ? ` · expire le ${formatFrenchDate(doc.validUntil)}` : ""}</small></div><Badge tone={doc.status === "valid" ? "success" : doc.status === "expired" ? "danger" : doc.status === "expiring" ? "warning" : "neutral"}>{doc.status === "valid" ? "Valide" : doc.status === "expired" ? "Expiré" : doc.status === "expiring" ? "Expire bientôt" : "À fournir"}</Badge></div>)}</div></section>
    </div>
    <div className="detail-grid second-row"><section className="card span-2"><div className="card-heading"><div><p className="eyebrow">Historique</p><h2>Timeline juridique</h2></div></div><div className="timeline">{employee.timeline.map((event, i) => <div className={`timeline-item tone-${event.tone}`} key={`${event.date}-${i}`}><span className="timeline-dot"/><div><small>{event.date}</small><strong>{event.title}</strong><p>{event.detail}</p></div></div>)}</div></section><section className="card"><p className="eyebrow">Action recommandée</p><h2>{employee.risk === "critical" ? "Traiter aujourd'hui" : employee.risk === "attention" ? "Anticiper" : "Dossier sain"}</h2><p className="muted">{employee.nextAction}</p><Link href="/analyse" className="btn primary full">Lancer le parcours <Icon name="arrow"/></Link></section></div>
  </AppShell>;
}

async function ServerEmployeeDetailPage(id: string) {
  const actor = resolveServerActor();
  const dossier = await getEmployeeDossier(
    id,
    getEmployeeStore(),
    getEmployeeDocumentStore(),
    getAssessmentRepository(),
    getComplianceTaskStore(),
    actor,
  );
  if (!dossier) notFound();

  const { employee } = dossier;
  const today = dossier.generatedAt.slice(0, 10);
  const allDocuments = [...dossier.currentDocuments, ...dossier.historicalDocuments];
  const employeeAnalysisHref = `/analyse?employeeId=${encodeURIComponent(employee.id)}`;

  return <AppShell title={`${employee.firstName} ${employee.lastName}`} subtitle={`${employee.roleTitle ?? "Poste non renseigné"}${employee.workSite ? ` · ${employee.workSite}` : ""}`} action={<Link href={employeeAnalysisHref} className="btn primary"><Icon name="scan"/> Analyser ce salarié</Link>}>
    <div className="detail-grid">
      <section className="card detail-profile">
        <div className="profile-head"><span className="avatar xlarge">{employee.firstName[0]}{employee.lastName[0]}</span><div><h2>{employee.firstName} {employee.lastName}</h2><p>{employee.nationalityCode ? `Nationalité : ${employee.nationalityCode}` : "Nationalité non renseignée"} · {employee.contractType ?? "Contrat non renseigné"}</p>{dossier.latestAssessment ? <Badge tone={assessmentTone(dossier.latestAssessment.resultSnapshot.status)}>{dossier.latestAssessment.resultSnapshot.statusLabel}</Badge> : <Badge>Aucun assessment</Badge>}</div></div>
        <dl className="profile-facts"><div><dt>Documents actuels</dt><dd>{dossier.currentDocuments.length}</dd></div><div><dt>Prochaine expiration</dt><dd>{dossier.nextDocumentExpiry ? formatFrenchDate(dossier.nextDocumentExpiry) : "Non renseignée"}</dd></div><div><dt>Tâches ouvertes</dt><dd>{dossier.openTasks.length}</dd></div></dl>
      </section>

      <section className="card span-2">
        <div className="card-heading"><div><p className="eyebrow">Dossier</p><h2>Documents persistés</h2></div></div>
        {allDocuments.length === 0 ? <div className="notice info"><Icon name="file"/><div><strong>Aucun document enregistré</strong><p>La vue ne déduit aucun titre de séjour en l'absence de métadonnées persistées.</p></div></div> : <div className="document-list">{allDocuments.map((document) => <div className="document-row" key={document.id}><span className="document-icon"><Icon name="file"/></span><div><strong>{document.label}</strong><small>{document.documentType}{document.validUntil ? ` · échéance ${formatFrenchDate(document.validUntil)}` : " · sans échéance renseignée"}</small></div><Badge tone={documentTone(document, today)}>{documentStatus(document, today)}</Badge></div>)}</div>}
      </section>
    </div>

    <div className="detail-grid second-row">
      <section className="card span-2">
        <div className="card-heading"><div><p className="eyebrow">Historique</p><h2>Assessments rattachés</h2></div></div>
        {dossier.assessments.length === 0 ? <div className="notice info"><Icon name="shield"/><div><strong>Aucun assessment rattaché</strong><p>Une analyse générale existante n'est pas associée automatiquement à ce salarié.</p></div></div> : <div className="timeline">{dossier.assessments.slice(0, 10).map((assessment) => <div className={`timeline-item tone-${assessment.resultSnapshot.status === "blocked" ? "danger" : assessment.resultSnapshot.status === "clear" ? "success" : "warning"}`} key={assessment.id}><span className="timeline-dot"/><div><small>{formatDateTime(assessment.createdAt)} · {assessment.inputSnapshot.action}</small><strong>{assessment.resultSnapshot.statusLabel}</strong><p>{assessment.resultSnapshot.summary}</p></div></div>)}</div>}
      </section>

      <section className="card">
        <p className="eyebrow">Suivi opérationnel</p><h2>Tâches ouvertes</h2>
        {dossier.openTasks.length === 0 ? <p className="muted">Aucune tâche ouverte enregistrée. Cela ne constitue pas un verdict de conformité.</p> : <div className="document-list">{dossier.openTasks.slice(0, 6).map((task) => <div className="document-row" key={task.id}><span className="document-icon"><Icon name="clock"/></span><div><strong>{task.title}</strong><small>{task.dueAt ? `Échéance ${formatDateTime(task.dueAt)}` : "Sans échéance"} · {task.status}</small></div><Badge tone={taskTone(task)}>{task.severity}</Badge></div>)}</div>}
        {dossier.nextTaskDueAt ? <p className="muted">Prochaine échéance de tâche : {formatDateTime(dossier.nextTaskDueAt)}</p> : null}
      </section>
    </div>

    <div className="notice info"><Icon name="shield"/><div><strong>Données persistées uniquement</strong><p>Cette fiche affiche les éléments enregistrés pour ce salarié. Une absence de document, de tâche ou d'assessment ne vaut pas conclusion juridique.</p></div></div>
  </AppShell>;
}

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (process.env.GITHUB_PAGES === "true") return DemoEmployeeDetailPage(id);
  return ServerEmployeeDetailPage(id);
}
