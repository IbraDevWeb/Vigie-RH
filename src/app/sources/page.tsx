import { AppShell } from "@/components/app-shell";
import { Icon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { legalSources } from "@/domain/legal/source-registry";
import { legalRules } from "@/domain/legal/rules";

export default function SourcesPage() {
  const sources = Object.values(legalSources);
  return <AppShell title="Sources juridiques" subtitle="Registre des textes mobilisés par le moteur de règles.">
    <div className="source-metrics"><div className="card"><span><Icon name="book"/></span><strong>{sources.length}</strong><small>sources officielles</small></div><div className="card"><span><Icon name="shield"/></span><strong>{legalRules.length}</strong><small>règles actives</small></div><div className="card"><span><Icon name="calendar"/></span><strong>09/09/2026</strong><small>dernière revue globale</small></div></div>
    <section className="card"><div className="card-heading"><div><p className="eyebrow">Registre</p><h2>Sources officielles</h2></div><Badge tone="success">Toutes revues</Badge></div><div className="legal-source-table">{sources.map((source) => <a key={source.id} href={source.url} target="_blank" rel="noreferrer" className="legal-source-row"><span className={`authority authority-${source.authority}`}>{source.authority === "legifrance" ? "L" : "SP"}</span><div><strong>{source.title}</strong><p>{source.note ?? "Source utilisée par le moteur de règles."}</p><small>Dernière revue : {source.lastReviewed}{source.effectiveFrom ? ` · effet : ${source.effectiveFrom}` : ""}</small></div><Icon name="external"/></a>)}</div></section>
    <section className="card"><div className="card-heading"><div><p className="eyebrow">Auditabilité</p><h2>Règles actives</h2></div></div><div className="rules-list">{legalRules.map((rule) => <div className="rule-row" key={rule.id}><code>{rule.id}</code><div><strong>{rule.description}</strong><small>Priorité {rule.priority} · revue {rule.lastReviewed}</small></div><Badge>Active</Badge></div>)}</div></section>
  </AppShell>;
}
