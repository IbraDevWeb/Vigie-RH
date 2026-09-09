"use client";

import { useMemo, useState } from "react";
import type { AssessmentInput, AssessmentResult, ActionType, NationalityGroup, PermitType } from "@/domain/legal/types";
import { getSources } from "@/domain/legal/source-registry";
import { Icon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";

const actions: Array<{ value: ActionType; label: string; description: string }> = [
  { value: "hire", label: "Recruter", description: "Sécuriser une nouvelle embauche" },
  { value: "renew", label: "Renouveler", description: "Anticiper l'échéance d'un titre" },
  { value: "modify", label: "Modifier", description: "Poste, contrat ou employeur" },
  { value: "can_work", label: "Peut-il travailler ?", description: "Vérifier le droit au travail aujourd'hui" },
  { value: "terminate", label: "Rompre", description: "Traiter une perte ou un refus de droit au travail" },
];

const permitOptions: Array<{ value: PermitType; label: string }> = [
  { value: "none", label: "Aucun titre / candidat hors de France" },
  { value: "employee", label: "Carte / VLS-TS salarié" },
  { value: "temporary_worker", label: "Travailleur temporaire" },
  { value: "student", label: "Étudiant" },
  { value: "private_family", label: "Vie privée et familiale" },
  { value: "resident", label: "Carte de résident" },
  { value: "talent", label: "Talent" },
  { value: "receipt", label: "Récépissé" },
  { value: "extension_attestation", label: "Attestation de prolongation" },
  { value: "other", label: "Autre / je ne sais pas" },
];

const initial: AssessmentInput = {
  action: "hire", nationalityGroup: "third_country", location: "france", permitType: "employee",
  contractType: "cdi", newContract: true, region: "Île-de-France", occupation: "Développeur logiciel",
  studentHoursPlanned: 700, jobInShortageList: false, offerPublishedThreeWeeks: false, temporaryDocumentAllowsWork: null,
};

export function AnalysisWizard() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<AssessmentInput>(initial);
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const steps = ["Action", "Salarié", "Document", "Emploi", "Résultat"];
  const set = <K extends keyof AssessmentInput>(key: K, value: AssessmentInput[K]) => setForm((prev) => ({ ...prev, [key]: value }));

  async function runAssessment() {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/analyse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Analyse impossible");
      setResult(payload); setStep(4);
    } catch (e) { setError(e instanceof Error ? e.message : "Erreur inconnue"); }
    finally { setLoading(false); }
  }

  function restart() { setForm(initial); setResult(null); setStep(0); setError(""); }

  return <div className="wizard-grid">
    <div className="wizard-main card">
      <div className="stepper">{steps.map((label, index) => <div key={label} className={`step ${index === step ? "current" : index < step ? "done" : ""}`}><span>{index < step ? "✓" : index + 1}</span><small>{label}</small></div>)}</div>
      {step === 0 && <ActionStep form={form} set={set} />}
      {step === 1 && <PersonStep form={form} set={set} />}
      {step === 2 && <PermitStep form={form} set={set} />}
      {step === 3 && <EmploymentStep form={form} set={set} />}
      {step === 4 && result && <ResultView result={result} onRestart={restart} />}
      {error && <div className="notice danger"><Icon name="alert"/><div><strong>Analyse impossible</strong><p>{error}</p></div></div>}
      {step < 4 && <div className="wizard-actions"><button className="btn secondary" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>Retour</button>{step < 3 ? <button className="btn primary" onClick={() => setStep((s) => s + 1)}>Continuer <Icon name="arrow"/></button> : <button className="btn primary" disabled={loading} onClick={runAssessment}>{loading ? "Analyse…" : "Lancer l'analyse"} <Icon name="spark"/></button>}</div>}
    </div>
    <aside className="wizard-aside">
      <div className="card sticky-card"><p className="eyebrow">Dossier en cours</p><h3>Résumé</h3><dl className="summary-list"><div><dt>Action</dt><dd>{actions.find((a) => a.value === form.action)?.label}</dd></div><div><dt>Nationalité</dt><dd>{nationalityLabel(form.nationalityGroup)}</dd></div><div><dt>Document</dt><dd>{permitOptions.find((p) => p.value === form.permitType)?.label}</dd></div><div><dt>Contrat</dt><dd>{form.contractType.toUpperCase()}</dd></div></dl><div className="mini-note"><Icon name="shield"/><span>Les conclusions viennent du moteur de règles versionné, pas d'une génération libre.</span></div></div>
    </aside>
  </div>;
}

function ActionStep({ form, set }: StepProps) {
  return <section className="wizard-section"><p className="eyebrow">Étape 1</p><h2>Que souhaitez-vous faire ?</h2><p className="muted">Le parcours adapte ensuite les contrôles au moment de la relation de travail.</p><div className="choice-grid">{actions.map((a) => <button key={a.value} className={`choice-card ${form.action === a.value ? "selected" : ""}`} onClick={() => set("action", a.value)}><span className="choice-icon"><Icon name={a.value === "hire" ? "plus" : a.value === "renew" ? "calendar" : a.value === "terminate" ? "alert" : "briefcase"}/></span><strong>{a.label}</strong><small>{a.description}</small></button>)}</div></section>;
}

function PersonStep({ form, set }: StepProps) {
  return <section className="wizard-section"><p className="eyebrow">Étape 2</p><h2>Situation du salarié</h2><div className="form-grid"><Field label="Groupe de nationalité"><select value={form.nationalityGroup} onChange={(e) => set("nationalityGroup", e.target.value as NationalityGroup)}><option value="france">France</option><option value="eu_eea_swiss">UE / EEE / Suisse</option><option value="third_country">Pays tiers</option><option value="algeria">Algérie — régime spécial</option></select></Field><Field label="Où se trouve la personne ?"><select value={form.location} onChange={(e) => set("location", e.target.value as "france" | "abroad")}><option value="france">En France</option><option value="abroad">À l'étranger</option></select></Field></div><div className="notice info"><Icon name="book"/><div><strong>Pourquoi cette question ?</strong><p>La nationalité et le lieu de résidence déterminent le corpus juridique et la nature du parcours à instruire.</p></div></div></section>;
}

function PermitStep({ form, set }: StepProps) {
  const temporary = ["receipt", "extension_attestation"].includes(form.permitType);
  return <section className="wizard-section"><p className="eyebrow">Étape 3</p><h2>Document actuel</h2><div className="form-grid"><Field label="Titre / document"><select value={form.permitType} onChange={(e) => set("permitType", e.target.value as PermitType)}>{permitOptions.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}</select></Field><Field label="Date d'expiration"><input type="date" value={form.permitValidUntil ?? ""} onChange={(e) => set("permitValidUntil", e.target.value || undefined)} /></Field>{temporary && <Field label="Le document indique-t-il un droit au travail ?"><select value={form.temporaryDocumentAllowsWork === null ? "unknown" : String(form.temporaryDocumentAllowsWork)} onChange={(e) => set("temporaryDocumentAllowsWork", e.target.value === "unknown" ? null : e.target.value === "true")}><option value="unknown">Je ne sais pas</option><option value="true">Oui</option><option value="false">Non</option></select></Field>}{form.permitType === "student" && <Field label="Heures de travail prévues sur l'année"><input type="number" min="0" value={form.studentHoursPlanned ?? 0} onChange={(e) => set("studentHoursPlanned", Number(e.target.value))}/></Field>}</div><div className="upload-zone"><Icon name="file"/><div><strong>Extraction documentaire</strong><p>Emplacement prévu pour OCR/IA : type de titre, mention, nationalité et expiration. Désactivé dans cette version pour garder le verdict 100 % déterministe.</p></div><Badge tone="info">Architecture prête</Badge></div></section>;
}

function EmploymentStep({ form, set }: StepProps) {
  return <section className="wizard-section"><p className="eyebrow">Étape 4</p><h2>Emploi envisagé</h2><div className="form-grid"><Field label="Contrat"><select value={form.contractType} onChange={(e) => set("contractType", e.target.value as "cdi" | "cdd" | "none")}><option value="cdi">CDI</option><option value="cdd">CDD</option><option value="none">Pas de nouveau contrat</option></select></Field><Field label="Nouveau contrat ?"><select value={form.newContract ? "yes" : "no"} onChange={(e) => set("newContract", e.target.value === "yes")}><option value="yes">Oui</option><option value="no">Non</option></select></Field><Field label="Métier"><input value={form.occupation ?? ""} onChange={(e) => set("occupation", e.target.value)} placeholder="Ex. développeur logiciel"/></Field><Field label="Région"><select value={form.region ?? ""} onChange={(e) => set("region", e.target.value)}><option>Île-de-France</option><option>Auvergne-Rhône-Alpes</option><option>Provence-Alpes-Côte d'Azur</option><option>Occitanie</option><option>Nouvelle-Aquitaine</option><option>Hauts-de-France</option><option>Grand Est</option><option>Bretagne</option><option>Pays de la Loire</option><option>Normandie</option><option>Bourgogne-Franche-Comté</option><option>Centre-Val de Loire</option></select></Field><Field label="Métier sur la liste en tension ?"><select value={form.jobInShortageList ? "yes" : "no"} onChange={(e) => set("jobInShortageList", e.target.value === "yes")}><option value="no">Non / à vérifier</option><option value="yes">Oui</option></select></Field><Field label="Offre publiée 3 semaines ?"><select value={form.offerPublishedThreeWeeks ? "yes" : "no"} onChange={(e) => set("offerPublishedThreeWeeks", e.target.value === "yes")}><option value="no">Non</option><option value="yes">Oui</option></select></Field></div></section>;
}

function ResultView({ result, onRestart }: { result: AssessmentResult; onRestart: () => void }) {
  const tone = result.status === "clear" ? "success" : result.status === "blocked" ? "danger" : "warning";
  const sources = useMemo(() => getSources(result.sourceIds), [result.sourceIds]);
  return <section className="result-view"><div className={`result-hero result-${result.status}`}><div><Badge tone={tone}>{result.statusLabel}</Badge><h2>{result.summary}</h2><p>Confiance moteur : <strong>{result.confidence === "high" ? "élevée" : result.confidence === "medium" ? "moyenne" : "faible"}</strong></p></div><div className="work-now"><small>Peut travailler maintenant</small><strong>{result.canWorkNow === true ? "OUI" : result.canWorkNow === false ? "NON" : "À VÉRIFIER"}</strong></div></div><div className="result-kpis"><div><span>Autorisation de travail</span><strong>{answerLabel(result.workAuthorization)}</strong></div><div><span>Contrôle employeur</span><strong>{answerLabel(result.employerVerification)}</strong></div><div><span>Règles sourcées</span><strong>{sources.length}</strong></div></div><h3>Ce que le moteur a détecté</h3><div className="finding-list">{result.findings.map((f) => <div className={`finding finding-${f.severity}`} key={f.id}><span className="finding-icon"><Icon name={f.severity === "success" ? "check" : f.severity === "danger" ? "alert" : "clock"}/></span><div><strong>{f.title}</strong><p>{f.detail}</p></div></div>)}</div><h3>Plan d'action</h3><div className="checklist">{result.checklist.map((item) => <div className="check-row" key={item.id}><span className={`check-state state-${item.status}`}>{item.status === "done" ? "✓" : item.status === "blocked" ? "!" : "○"}</span><div><strong>{item.label}</strong>{item.description && <p>{item.description}</p>}</div></div>)}</div><h3>Sources mobilisées</h3><div className="source-list">{sources.map((source) => <a key={source.id} href={source.url} target="_blank" rel="noreferrer" className="source-row"><div><strong>{source.title}</strong><small>Revue le {source.lastReviewed}</small></div><Icon name="external"/></a>)}</div><div className="notice info"><Icon name="shield"/><div><strong>Cadre d'usage</strong><p>{result.disclaimer}</p></div></div><button className="btn secondary" onClick={onRestart}>Nouvelle analyse</button></section>;
}

type StepProps = { form: AssessmentInput; set: <K extends keyof AssessmentInput>(key: K, value: AssessmentInput[K]) => void };
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="field"><span>{label}</span>{children}</label>; }
function nationalityLabel(value: NationalityGroup) { return { france: "France", eu_eea_swiss: "UE / EEE / Suisse", third_country: "Pays tiers", algeria: "Algérie" }[value]; }
function answerLabel(value: AssessmentResult["workAuthorization"]) { return { yes: "Requise", no: "Non requise", review: "À vérifier", not_applicable: "Non applicable" }[value]; }
