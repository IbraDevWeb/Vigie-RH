import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Icon } from "@/components/ui/icon";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { RiskDot } from "@/components/risk-dot";
import { employeeRepository } from "@/infrastructure/repositories/in-memory-employee-repository";
import { formatFrenchDate } from "@/lib/date";

export default async function DashboardPage() {
  const employees = await employeeRepository.list();
  const critical = employees.filter((e) => e.risk === "critical").length;
  const attention = employees.filter((e) => e.risk === "attention").length;
  return <AppShell title="Bonjour, Ibrahim" subtitle="Voici les points de conformité qui nécessitent votre attention." action={<Link className="btn primary" href="/analyse"><Icon name="plus"/> Nouvelle analyse</Link>}>
    <div className="stats-grid"><StatCard label="Salariés suivis" value={String(employees.length)} detail="Portefeuille de démonstration" icon={<Icon name="users"/>}/><StatCard label="Action urgente" value={String(critical)} detail="À traiter aujourd'hui" icon={<Icon name="alert"/>}/><StatCard label="À surveiller" value={String(attention)} detail="Échéance < 90 jours" icon={<Icon name="clock"/>}/><StatCard label="Score conformité" value="83%" detail="+6 pts depuis la dernière revue" icon={<Icon name="shield"/>}/></div>
    <div className="dashboard-grid"><section className="card span-2"><div className="card-heading"><div><p className="eyebrow">Priorités</p><h2>Actions à traiter</h2></div><Link href="/audit">Voir l'audit <Icon name="arrow"/></Link></div><div className="action-list"><div className="action-row critical"><span className="action-icon"><Icon name="alert"/></span><div><strong>Renouvellement à vérifier — Samir Haddad</strong><p>Certificat de résidence · échéance dans 18 jours · régime spécial</p></div><Badge tone="danger">Aujourd'hui</Badge></div><div className="action-row warning"><span className="action-icon"><Icon name="calendar"/></span><div><strong>Anticiper le renouvellement — Léo Martins</strong><p>Carte étudiant · échéance le 22 novembre 2026</p></div><Badge tone="warning">J-74</Badge></div><div className="action-row"><span className="action-icon"><Icon name="file"/></span><div><strong>2 justificatifs à archiver</strong><p>Preuves de contrôle employeur manquantes dans les dossiers récents</p></div><Badge>Cette semaine</Badge></div></div></section>
      <section className="card"><div className="card-heading"><div><p className="eyebrow">État du parc</p><h2>Conformité</h2></div></div><div className="donut-wrap"><div className="donut"><span>83<small>%</small></span></div><div className="legend"><p><i className="legend-ok"/>Conformes <strong>2</strong></p><p><i className="legend-attention"/>À surveiller <strong>1</strong></p><p><i className="legend-critical"/>Critiques <strong>1</strong></p></div></div></section>
    </div>
    <section className="card"><div className="card-heading"><div><p className="eyebrow">Portefeuille</p><h2>Salariés étrangers</h2></div><Link href="/salaries">Voir tous <Icon name="arrow"/></Link></div><div className="table-wrap"><table><thead><tr><th>Salarié</th><th>Titre</th><th>Expiration</th><th>Statut</th><th>Prochaine action</th></tr></thead><tbody>{employees.map((employee) => <tr key={employee.id}><td><Link className="employee-cell" href={`/salaries/${employee.id}`}><span className="avatar soft">{employee.firstName[0]}{employee.lastName[0]}</span><span><strong>{employee.firstName} {employee.lastName}</strong><small>{employee.role} · {employee.site}</small></span></Link></td><td>{employee.permitLabel}</td><td>{formatFrenchDate(employee.permitValidUntil)}</td><td><span className="risk-label"><RiskDot risk={employee.risk}/>{employee.riskLabel}</span></td><td className="muted">{employee.nextAction}</td></tr>)}</tbody></table></div></section>
  </AppShell>;
}
