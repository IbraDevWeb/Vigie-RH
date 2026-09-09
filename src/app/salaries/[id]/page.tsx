import { notFound } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { employeeRepository } from "@/infrastructure/repositories/in-memory-employee-repository";
import { formatFrenchDate } from "@/lib/date";

export const dynamicParams = false;

export async function generateStaticParams() {
  const employees = await employeeRepository.list();
  return employees.map((employee) => ({ id: employee.id }));
}

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const employee = await employeeRepository.findById(id);
  if (!employee) notFound();
  return <AppShell title={`${employee.firstName} ${employee.lastName}`} subtitle={`${employee.role} · ${employee.site}`} action={<Link href="/analyse" className="btn primary"><Icon name="scan"/> Analyser une action</Link>}>
    <div className="detail-grid"><section className="card detail-profile"><div className="profile-head"><span className="avatar xlarge">{employee.firstName[0]}{employee.lastName[0]}</span><div><h2>{employee.firstName} {employee.lastName}</h2><p>{employee.nationality} · {employee.contract}</p><Badge tone={employee.risk === "ok" ? "success" : employee.risk === "attention" ? "warning" : "danger"}>{employee.riskLabel}</Badge></div></div><dl className="profile-facts"><div><dt>Titre actuel</dt><dd>{employee.permitLabel}</dd></div><div><dt>Valide jusqu'au</dt><dd>{formatFrenchDate(employee.permitValidUntil)}</dd></div><div><dt>Prochaine action</dt><dd>{employee.nextAction}</dd></div></dl></section>
      <section className="card span-2"><div className="card-heading"><div><p className="eyebrow">Dossier</p><h2>Documents de conformité</h2></div><button className="btn secondary small"><Icon name="plus"/> Ajouter</button></div><div className="document-list">{employee.documents.map((doc) => <div className="document-row" key={doc.id}><span className="document-icon"><Icon name="file"/></span><div><strong>{doc.label}</strong><small>{doc.type}{doc.validUntil ? ` · expire le ${formatFrenchDate(doc.validUntil)}` : ""}</small></div><Badge tone={doc.status === "valid" ? "success" : doc.status === "expired" ? "danger" : doc.status === "expiring" ? "warning" : "neutral"}>{doc.status === "valid" ? "Valide" : doc.status === "expired" ? "Expiré" : doc.status === "expiring" ? "Expire bientôt" : "À fournir"}</Badge></div>)}</div></section>
    </div>
    <div className="detail-grid second-row"><section className="card span-2"><div className="card-heading"><div><p className="eyebrow">Historique</p><h2>Timeline juridique</h2></div></div><div className="timeline">{employee.timeline.map((event, i) => <div className={`timeline-item tone-${event.tone}`} key={`${event.date}-${i}`}><span className="timeline-dot"/><div><small>{event.date}</small><strong>{event.title}</strong><p>{event.detail}</p></div></div>)}</div></section><section className="card"><p className="eyebrow">Action recommandée</p><h2>{employee.risk === "critical" ? "Traiter aujourd'hui" : employee.risk === "attention" ? "Anticiper" : "Dossier sain"}</h2><p className="muted">{employee.nextAction}</p><Link href="/analyse" className="btn primary full">Lancer le parcours <Icon name="arrow"/></Link></section></div>
  </AppShell>;
}
