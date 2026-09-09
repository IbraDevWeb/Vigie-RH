import { AppShell } from "@/components/app-shell";
import { Icon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";

const controls = [
  { label: "Titre de séjour / droit au travail archivé", score: 94, status: "success", detail: "1 dossier incomplet" },
  { label: "Dates d'expiration renseignées", score: 100, status: "success", detail: "Tous les dossiers" },
  { label: "Preuve de contrôle employeur", score: 76, status: "warning", detail: "2 justificatifs manquants" },
  { label: "Suivi des renouvellements", score: 82, status: "warning", detail: "1 échéance critique" },
  { label: "Régimes spéciaux validés", score: 50, status: "danger", detail: "1 dossier à faire revoir" },
];

export default function AuditPage() {
  return <AppShell title="Audit conformité" subtitle="Une vue d'ensemble des contrôles employeur et des preuves disponibles." action={<button className="btn secondary"><Icon name="file"/> Exporter le rapport</button>}>
    <section className="audit-hero card"><div><p className="eyebrow">Score global</p><div className="big-score">83<span>/100</span></div><p>Bon niveau de conformité, avec <strong>3 actions</strong> à prioriser.</p></div><div className="audit-summary"><div><Icon name="check"/><span><strong>12</strong><small>contrôles conformes</small></span></div><div><Icon name="clock"/><span><strong>2</strong><small>à surveiller</small></span></div><div><Icon name="alert"/><span><strong>1</strong><small>critique</small></span></div></div></section>
    <section className="card"><div className="card-heading"><div><p className="eyebrow">Contrôles</p><h2>Matrice de conformité</h2></div><Badge tone="info">Audit du 09/09/2026</Badge></div><div className="control-list">{controls.map((control) => <div className="control-row" key={control.label}><div><strong>{control.label}</strong><small>{control.detail}</small></div><div className="progress"><span style={{ width: `${control.score}%` }}/></div><strong className={`score-${control.status}`}>{control.score}%</strong></div>)}</div></section>
    <section className="card"><div className="card-heading"><div><p className="eyebrow">Plan de remédiation</p><h2>3 actions prioritaires</h2></div></div><div className="remediation-grid"><article><span>01</span><h3>Régime spécial algérien</h3><p>Faire valider le dossier Samir Haddad et formaliser une règle dédiée.</p><Badge tone="danger">Urgent</Badge></article><article><span>02</span><h3>Preuves de vérification</h3><p>Archiver deux contrôles employeur manquants dans les dossiers récents.</p><Badge tone="warning">Cette semaine</Badge></article><article><span>03</span><h3>Renouvellement étudiant</h3><p>Préparer la collecte des justificatifs pour Léo Martins.</p><Badge>À planifier</Badge></article></div></section>
  </AppShell>;
}
