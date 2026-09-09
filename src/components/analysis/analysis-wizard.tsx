"use client";

import { useMemo, useState } from "react";
import type {
  ActionType,
  AssessmentInput,
  AssessmentResult,
  NationalityGroup,
  PermitType,
} from "@/domain/legal/types";
import { getSources } from "@/domain/legal/source-registry";
import { Icon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { RenewalStep } from "@/components/analysis/renewal-step";
import { ModificationStep } from "@/components/analysis/modification-step";

const actions: Array<{ value: ActionType; label: string; description: string }> = [
  { value: "hire", label: "Recruter", description: "Sécuriser une nouvelle embauche" },
  { value: "renew", label: "Renouveler", description: "Anticiper l'échéance d'un titre" },
  { value: "modify", label: "Modifier", description: "Poste, contrat ou employeur" },
  { value: "can_work", label: "Peut-il travailler ?", description: "Vérifier le droit au travail aujourd'hui" },
  { value: "terminate", label: "Rompre", description: "Traiter une perte ou un refus de droit au travail" },
];

const permitOptions: Array<{ value: PermitType; label: string }> = [
  { value: "none", label: "Aucun titre / aucun document autorisant le travail" },
  { value: "employee", label: "Carte / VLS-TS salarié" },
  { value: "temporary_worker", label: "Travailleur temporaire" },
  { value: "student", label: "Étudiant" },
  { value: "private_family", label: "Vie privée et familiale — sous-catégorie non précisée" },
  { value: "resident", label: "Carte de résident" },
  { value: "talent", label: "Talent — sous-catégorie non précisée" },
  { value: "receipt", label: "Récépissé" },
  { value: "extension_attestation", label: "Attestation de prolongation d'instruction" },
  { value: "other", label: "Autre / je ne sais pas" },
];

const regions = [
  "Auvergne-Rhône-Alpes",
  "Bourgogne-Franche-Comté",
  "Bretagne",
  "Centre-Val de Loire",
  "Corse",
  "Grand Est",
  "Hauts-de-France",
  "Île-de-France",
  "Normandie",
  "Nouvelle-Aquitaine",
  "Occitanie",
  "Pays de la Loire",
  "Provence-Alpes-Côte d'Azur",
  "Guadeloupe",
  "Guyane",
  "La Réunion",
  "Martinique",
  "Mayotte",
];

const initial: AssessmentInput = {
  action: "hire",
  nationalityGroup: "third_country",
  location: "france",
  permitType: "none",
  contractType: "cdi",
  newContract: true,
  plannedStartDate: undefined,
  occupation: undefined,
  region: undefined,
  salaryGrossMonthly: undefined,
  studentHoursPlanned: undefined,
  isApprenticeship: null,
  apprenticeshipValidated: null,
  studentPrefectureDeclarationCompleted: null,
  registeredWithFranceTravail: null,
  jobInShortageList: null,
  offerPublishedThreeWeeks: null,
  noValidCandidateReceived: null,
  temporaryDocumentAllowsWork: null,
  workAuthorizationGrantedForContract: null,
  employerVerificationCompleted: null,
  renewalFiled: null,
  renewalFiledAt: undefined,
  renewalProofType: "none",
  renewalProofValidUntil: undefined,
  renewalProofAllowsWork: null,
  workAuthorizationValidUntil: undefined,
  workAuthorizationRenewalFiled: null,
  modificationEffectiveDate: undefined,
  employerChanged: null,
  occupationChanged: null,
  regionChanged: null,
  salaryChanged: null,
  workingTimeChanged: null,
  currentOccupation: undefined,
  currentRegion: undefined,
  currentSalaryGrossMonthly: undefined,
  workAuthorizationGrantedForModification: null,
};

type AnalysisApiResponse = {
  assessmentId: string;
  result: AssessmentResult;
};

export function AnalysisWizard() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<AssessmentInput>(initial);
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const workflowStep = form.action === "renew" ? "Renouvellement" : form.action === "modify" ? "Modification" : "Emploi";
  const steps = ["Action", "Personne", "Document", workflowStep, "Résultat"];
  const set = <K extends keyof AssessmentInput>(key: K, value: AssessmentInput[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  function selectAction(action: ActionType) {
    setForm((prev) => ({
      ...prev,
      action,
      newContract: action === "hire" ? true : ["renew", "modify"].includes(action) ? false : prev.newContract,
      contractType: action === "hire" && prev.contractType === "none" ? "cdi" : prev.contractType,
      plannedStartDate: action === "hire" ? prev.plannedStartDate : undefined,
      registeredWithFranceTravail: action === "hire" ? prev.registeredWithFranceTravail : null,
      employerVerificationCompleted: action === "hire" ? prev.employerVerificationCompleted : null,
      studentPrefectureDeclarationCompleted: action === "hire" ? prev.studentPrefectureDeclarationCompleted : null,
      renewalFiled: action === "renew" ? prev.renewalFiled : null,
      renewalFiledAt: action === "renew" ? prev.renewalFiledAt : undefined,
      renewalProofType: action === "renew" ? (prev.renewalProofType ?? "none") : "none",
      renewalProofValidUntil: action === "renew" ? prev.renewalProofValidUntil : undefined,
      renewalProofAllowsWork: action === "renew" ? prev.renewalProofAllowsWork : null,
      workAuthorizationValidUntil: action === "renew" ? prev.workAuthorizationValidUntil : undefined,
      workAuthorizationRenewalFiled: action === "renew" ? prev.workAuthorizationRenewalFiled : null,
      modificationEffectiveDate: action === "modify" ? prev.modificationEffectiveDate : undefined,
      employerChanged: action === "modify" ? prev.employerChanged : null,
      occupationChanged: action === "modify" ? prev.occupationChanged : null,
      regionChanged: action === "modify" ? prev.regionChanged : null,
      salaryChanged: action === "modify" ? prev.salaryChanged : null,
      workingTimeChanged: action === "modify" ? prev.workingTimeChanged : null,
      currentOccupation: action === "modify" ? prev.currentOccupation : undefined,
      currentRegion: action === "modify" ? prev.currentRegion : undefined,
      currentSalaryGrossMonthly: action === "modify" ? prev.currentSalaryGrossMonthly : undefined,
      workAuthorizationGrantedForModification: action === "modify" ? prev.workAuthorizationGrantedForModification : null,
    }));
  }

  function selectNationality(nationalityGroup: NationalityGroup) {
    const exemptFromForeignDocument = ["france", "eu_eea_swiss"].includes(nationalityGroup);
    const renewalApplicable = ["third_country", "algeria"].includes(nationalityGroup);
    setForm((prev) => ({
      ...prev,
      nationalityGroup,
      permitType: exemptFromForeignDocument ? "none" : prev.permitType,
      permitValidUntil: exemptFromForeignDocument ? undefined : prev.permitValidUntil,
      temporaryDocumentAllowsWork: null,
      workAuthorizationGrantedForContract: nationalityGroup === "third_country" ? prev.workAuthorizationGrantedForContract : null,
      workAuthorizationGrantedForModification: nationalityGroup === "third_country" ? prev.workAuthorizationGrantedForModification : null,
      registeredWithFranceTravail: nationalityGroup === "third_country" ? prev.registeredWithFranceTravail : null,
      employerVerificationCompleted: nationalityGroup === "third_country" ? prev.employerVerificationCompleted : null,
      studentPrefectureDeclarationCompleted: nationalityGroup === "third_country" ? prev.studentPrefectureDeclarationCompleted : null,
      jobInShortageList: nationalityGroup === "third_country" ? prev.jobInShortageList : null,
      offerPublishedThreeWeeks: nationalityGroup === "third_country" ? prev.offerPublishedThreeWeeks : null,
      noValidCandidateReceived: nationalityGroup === "third_country" ? prev.noValidCandidateReceived : null,
      renewalFiled: renewalApplicable ? prev.renewalFiled : null,
      renewalFiledAt: renewalApplicable ? prev.renewalFiledAt : undefined,
      renewalProofType: renewalApplicable ? (prev.renewalProofType ?? "none") : "none",
      renewalProofValidUntil: renewalApplicable ? prev.renewalProofValidUntil : undefined,
      renewalProofAllowsWork: renewalApplicable ? prev.renewalProofAllowsWork : null,
      workAuthorizationValidUntil: nationalityGroup === "third_country" ? prev.workAuthorizationValidUntil : undefined,
      workAuthorizationRenewalFiled: nationalityGroup === "third_country" ? prev.workAuthorizationRenewalFiled : null,
    }));
  }

  function selectPermit(permitType: PermitType) {
    const employeePermit = ["employee", "temporary_worker"].includes(permitType);
    setForm((prev) => ({
      ...prev,
      permitType,
      permitValidUntil: permitType === "none" ? undefined : prev.permitValidUntil,
      temporaryDocumentAllowsWork: ["receipt", "extension_attestation"].includes(permitType)
        ? prev.temporaryDocumentAllowsWork
        : null,
      studentHoursPlanned: permitType === "student" ? prev.studentHoursPlanned : undefined,
      isApprenticeship: permitType === "student" ? prev.isApprenticeship : null,
      apprenticeshipValidated: permitType === "student" ? prev.apprenticeshipValidated : null,
      studentPrefectureDeclarationCompleted: permitType === "student" ? prev.studentPrefectureDeclarationCompleted : null,
      workAuthorizationGrantedForContract: ["none", "employee", "temporary_worker", "student"].includes(permitType)
        ? prev.workAuthorizationGrantedForContract
        : null,
      workAuthorizationGrantedForModification: ["employee", "temporary_worker", "student"].includes(permitType)
        ? prev.workAuthorizationGrantedForModification
        : null,
      workAuthorizationValidUntil: employeePermit ? prev.workAuthorizationValidUntil : undefined,
      workAuthorizationRenewalFiled: employeePermit ? prev.workAuthorizationRenewalFiled : null,
    }));
  }

  function setFranceTravail(value: boolean | null) {
    setForm((prev) => ({
      ...prev,
      registeredWithFranceTravail: value,
      employerVerificationCompleted: value === true ? null : prev.employerVerificationCompleted,
    }));
  }

  async function runAssessment() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = await response.json();

      if (!response.ok) {
        const details = Array.isArray(payload.issues) ? ` ${payload.issues.join(" ")}` : "";
        throw new Error(`${payload.error ?? "Analyse impossible"}${details}`);
      }

      const assessment = payload as AnalysisApiResponse;
      setAssessmentId(assessment.assessmentId);
      setResult(assessment.result);
      setStep(4);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  function restart() {
    setForm(initial);
    setAssessmentId(null);
    setResult(null);
    setStep(0);
    setError("");
  }

  return (
    <div className="wizard-grid">
      <div className="wizard-main card">
        <div className="stepper">
          {steps.map((label, index) => (
            <div key={label} className={`step ${index === step ? "current" : index < step ? "done" : ""}`}>
              <span>{index < step ? "✓" : index + 1}</span>
              <small>{label}</small>
            </div>
          ))}
        </div>

        {step === 0 && <ActionStep form={form} onSelect={selectAction} />}
        {step === 1 && <PersonStep form={form} onSelectNationality={selectNationality} set={set} />}
        {step === 2 && <PermitStep form={form} onSelectPermit={selectPermit} set={set} />}
        {step === 3 && form.action === "renew" && <RenewalStep form={form} set={set} />}
        {step === 3 && form.action === "modify" && <ModificationStep form={form} set={set} />}
        {step === 3 && !["renew", "modify"].includes(form.action) && <EmploymentStep form={form} set={set} setFranceTravail={setFranceTravail} />}
        {step === 4 && result && (
          <ResultView action={form.action} assessmentId={assessmentId} result={result} onRestart={restart} />
        )}

        {error && (
          <div className="notice danger">
            <Icon name="alert" />
            <div>
              <strong>Analyse impossible</strong>
              <p>{error}</p>
            </div>
          </div>
        )}

        {step < 4 && (
          <div className="wizard-actions">
            <button className="btn secondary" disabled={step === 0} onClick={() => setStep((current) => current - 1)}>
              Retour
            </button>
            {step < 3 ? (
              <button className="btn primary" onClick={() => setStep((current) => current + 1)}>
                Continuer <Icon name="arrow" />
              </button>
            ) : (
              <button className="btn primary" disabled={loading} onClick={runAssessment}>
                {loading ? "Analyse…" : "Lancer l'analyse"} <Icon name="spark" />
              </button>
            )}
          </div>
        )}
      </div>

      <aside className="wizard-aside">
        <div className="card sticky-card">
          <p className="eyebrow">Dossier en cours</p>
          <h3>Résumé</h3>
          <dl className="summary-list">
            <div><dt>Action</dt><dd>{actions.find((action) => action.value === form.action)?.label}</dd></div>
            <div><dt>Nationalité</dt><dd>{nationalityLabel(form.nationalityGroup)}</dd></div>
            <div><dt>Lieu</dt><dd>{form.location === "france" ? "France" : "Étranger"}</dd></div>
            <div><dt>Document</dt><dd>{documentSummary(form)}</dd></div>
            <div><dt>Contrat</dt><dd>{form.contractType.toUpperCase()}</dd></div>
            {form.plannedStartDate && <div><dt>Prise de poste</dt><dd>{formatDate(form.plannedStartDate)}</dd></div>}
            {form.action === "renew" && <div><dt>Justificatif</dt><dd>{renewalProofSummary(form)}</dd></div>}
            {form.action === "modify" && form.modificationEffectiveDate && <div><dt>Effet modification</dt><dd>{formatDate(form.modificationEffectiveDate)}</dd></div>}
          </dl>
          <div className="mini-note">
            <Icon name="shield" />
            <span>Les conclusions viennent du moteur de règles versionné. Une donnée insuffisante déclenche une revue complémentaire.</span>
          </div>
        </div>
      </aside>
    </div>
  );
}

function ActionStep({ form, onSelect }: { form: AssessmentInput; onSelect: (action: ActionType) => void }) {
  return (
    <section className="wizard-section">
      <p className="eyebrow">Étape 1</p>
      <h2>Que souhaitez-vous faire ?</h2>
      <p className="muted">Les parcours « Recruter », « Renouveler » et « Modifier » disposent maintenant de questionnaires dédiés. Les autres actions conservent leur périmètre actuel.</p>
      <div className="choice-grid">
        {actions.map((action) => (
          <button
            key={action.value}
            className={`choice-card ${form.action === action.value ? "selected" : ""}`}
            onClick={() => onSelect(action.value)}
          >
            <span className="choice-icon">
              <Icon name={action.value === "hire" ? "plus" : action.value === "renew" ? "calendar" : action.value === "terminate" ? "alert" : "briefcase"} />
            </span>
            <strong>{action.label}</strong>
            <small>{action.description}</small>
          </button>
        ))}
      </div>
    </section>
  );
}

function PersonStep({ form, onSelectNationality, set }: StepProps & { onSelectNationality: (value: NationalityGroup) => void }) {
  return (
    <section className="wizard-section">
      <p className="eyebrow">Étape 2</p>
      <h2>Situation de la personne</h2>
      <div className="form-grid">
        <Field label="Groupe de nationalité">
          <select value={form.nationalityGroup} onChange={(event) => onSelectNationality(event.target.value as NationalityGroup)}>
            <option value="france">France</option>
            <option value="eu_eea_swiss">UE / EEE / Suisse</option>
            <option value="third_country">Pays tiers</option>
            <option value="algeria">Algérie — régime spécial</option>
          </select>
        </Field>
        <Field label="Où se trouve la personne ?">
          <select value={form.location} onChange={(event) => set("location", event.target.value as "france" | "abroad")}>
            <option value="france">En France</option>
            <option value="abroad">À l'étranger</option>
          </select>
        </Field>
      </div>
      <div className="notice info">
        <Icon name="book" />
        <div>
          <strong>Pourquoi ces questions ?</strong>
          <p>La nationalité et le lieu de résidence orientent le corpus à appliquer. Le régime algérien reste volontairement en revue complémentaire tant qu'il n'est pas modélisé.</p>
        </div>
      </div>
    </section>
  );
}

function PermitStep({ form, onSelectPermit, set }: StepProps & { onSelectPermit: (value: PermitType) => void }) {
  const needsForeignDocument = !["france", "eu_eea_swiss"].includes(form.nationalityGroup);
  const temporary = ["receipt", "extension_attestation"].includes(form.permitType);

  return (
    <section className="wizard-section">
      <p className="eyebrow">Étape 3</p>
      <h2>{form.action === "renew" ? "Titre actuellement renouvelé" : "Document actuel"}</h2>

      {!needsForeignDocument ? (
        <div className="notice info">
          <Icon name="check" />
          <div>
            <strong>Aucun titre de séjour à qualifier dans ce parcours</strong>
            <p>Le moteur traitera la nationalité déclarée sans utiliser un document de séjour étranger.</p>
          </div>
        </div>
      ) : (
        <div className="form-grid">
          <Field label={form.action === "renew" ? "Titre à renouveler" : "Titre / document"}>
            <select value={form.permitType} onChange={(event) => onSelectPermit(event.target.value as PermitType)}>
              {permitOptions.map((permit) => <option key={permit.value} value={permit.value}>{permit.label}</option>)}
            </select>
          </Field>

          {form.permitType !== "none" && (
            <Field label="Date de fin de validité">
              <input
                type="date"
                value={form.permitValidUntil ?? ""}
                onChange={(event) => set("permitValidUntil", event.target.value || undefined)}
              />
            </Field>
          )}

          {temporary && form.action !== "renew" && (
            <Field label="Le document porte-t-il une mention autorisant le travail ?">
              <select
                value={triStateValue(form.temporaryDocumentAllowsWork)}
                onChange={(event) => set("temporaryDocumentAllowsWork", parseTriState(event.target.value))}
              >
                <option value="unknown">Je ne sais pas / à contrôler</option>
                <option value="true">Oui, la mention est présente</option>
                <option value="false">Non</option>
              </select>
            </Field>
          )}
        </div>
      )}

      {form.permitType === "private_family" && needsForeignDocument && (
        <div className="notice info">
          <Icon name="shield" />
          <div>
            <strong>Sous-catégorie requise pour conclure</strong>
            <p>« Vie privée et familiale » recouvre plusieurs fondements. Cette version ne déduit pas automatiquement une dispense à partir de ce libellé générique.</p>
          </div>
        </div>
      )}

      {form.permitType === "talent" && needsForeignDocument && (
        <div className="notice info">
          <Icon name="shield" />
          <div>
            <strong>Sous-catégorie Talent requise pour conclure</strong>
            <p>Le moteur reste fail-closed tant que le fondement exact et le périmètre d'activité de la carte Talent ne sont pas renseignés.</p>
          </div>
        </div>
      )}

      <div className="upload-zone">
        <Icon name="file" />
        <div>
          <strong>Extraction documentaire</strong>
          <p>Emplacement prévu pour OCR/IA : extraction uniquement. Les champs devront être confirmés par l'utilisateur avant d'entrer dans le moteur déterministe.</p>
        </div>
        <Badge tone="info">Non activée</Badge>
      </div>
    </section>
  );
}

function EmploymentStep({
  form,
  set,
  setFranceTravail,
}: StepProps & { setFranceTravail: (value: boolean | null) => void }) {
  const isHire = form.action === "hire";
  const thirdCountry = form.nationalityGroup === "third_country";
  const specialRegime = form.nationalityGroup === "algeria";
  const student = form.permitType === "student";
  const studentOverLimit = student && typeof form.studentHoursPlanned === "number" && form.studentHoursPlanned > 964;
  const needsWorkAuthorization = thirdCountry && (
    form.permitType === "none"
    || (["employee", "temporary_worker"].includes(form.permitType) && form.newContract && ["hire", "modify"].includes(form.action))
    || (studentOverLimit && form.isApprenticeship !== true)
  );
  const franceHire = isHire && thirdCountry && form.location === "france";
  const needsPrefectureCheck = franceHire && form.registeredWithFranceTravail === false;
  const needsStudentDeclaration = isHire && thirdCountry && student;
  const needsEmploymentSituation = needsWorkAuthorization && form.workAuthorizationGrantedForContract !== true;

  return (
    <section className="wizard-section">
      <p className="eyebrow">Étape 4</p>
      <h2>{isHire ? "Emploi et prise de poste envisagés" : "Emploi concerné"}</h2>

      <div className="form-grid">
        <Field label="Contrat">
          <select value={form.contractType} onChange={(event) => set("contractType", event.target.value as "cdi" | "cdd" | "none")}>
            <option value="cdi">CDI</option>
            <option value="cdd">CDD</option>
            {!isHire && <option value="none">Pas de nouveau contrat</option>}
          </select>
        </Field>

        {isHire && (
          <Field label="Date de prise de poste envisagée">
            <input
              type="date"
              value={form.plannedStartDate ?? ""}
              onChange={(event) => set("plannedStartDate", event.target.value || undefined)}
            />
          </Field>
        )}

        <Field label="Métier / poste">
          <input
            value={form.occupation ?? ""}
            onChange={(event) => set("occupation", event.target.value || undefined)}
            placeholder="Ex. technicien de maintenance"
          />
        </Field>

        {(thirdCountry || specialRegime) && (
          <Field label="Région d'emploi">
            <select value={form.region ?? ""} onChange={(event) => set("region", event.target.value || undefined)}>
              <option value="">Sélectionner une région</option>
              {regions.map((region) => <option key={region} value={region}>{region}</option>)}
            </select>
          </Field>
        )}

        {student && (
          <Field label="Heures de travail prévues sur l'année">
            <input
              type="number"
              min="0"
              value={form.studentHoursPlanned ?? ""}
              onChange={(event) => set("studentHoursPlanned", event.target.value ? Number(event.target.value) : undefined)}
              placeholder="Ex. 700"
            />
          </Field>
        )}

        {studentOverLimit && (
          <Field label="S'agit-il d'un contrat d'apprentissage dans le cadre du cursus ?">
            <select value={triStateValue(form.isApprenticeship)} onChange={(event) => set("isApprenticeship", parseTriState(event.target.value))}>
              <option value="unknown">À préciser</option>
              <option value="true">Oui</option>
              <option value="false">Non</option>
            </select>
          </Field>
        )}

        {studentOverLimit && form.isApprenticeship === true && (
          <Field label="Le contrat d'apprentissage a-t-il été validé par le service compétent ?">
            <select value={triStateValue(form.apprenticeshipValidated)} onChange={(event) => set("apprenticeshipValidated", parseTriState(event.target.value))}>
              <option value="unknown">À confirmer</option>
              <option value="true">Oui</option>
              <option value="false">Non / pas encore</option>
            </select>
          </Field>
        )}

        {needsWorkAuthorization && (
          <Field label="Une autorisation de travail a-t-elle déjà été accordée pour ce contrat précis ?">
            <select value={triStateValue(form.workAuthorizationGrantedForContract)} onChange={(event) => set("workAuthorizationGrantedForContract", parseTriState(event.target.value))}>
              <option value="unknown">À confirmer / pas encore</option>
              <option value="true">Oui, décision obtenue</option>
              <option value="false">Non</option>
            </select>
          </Field>
        )}

        {needsEmploymentSituation && (
          <Field label="Rémunération brute mensuelle proposée">
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.salaryGrossMonthly ?? ""}
              onChange={(event) => set("salaryGrossMonthly", event.target.value ? Number(event.target.value) : undefined)}
              placeholder="Ex. 2500"
            />
          </Field>
        )}
      </div>

      {franceHire && (
        <>
          <h3>Contrôle préalable à l'embauche</h3>
          <div className="form-grid">
            <Field label="La personne produit-elle un justificatif d'inscription France Travail comme demandeur d'emploi ?">
              <select value={triStateValue(form.registeredWithFranceTravail)} onChange={(event) => setFranceTravail(parseTriState(event.target.value))}>
                <option value="unknown">Je ne sais pas / à vérifier</option>
                <option value="true">Oui, justificatif disponible</option>
                <option value="false">Non</option>
              </select>
            </Field>

            {needsPrefectureCheck && (
              <Field label="La vérification préfectorale a-t-elle déjà été accomplie ?">
                <select value={triStateValue(form.employerVerificationCompleted)} onChange={(event) => set("employerVerificationCompleted", parseTriState(event.target.value))}>
                  <option value="unknown">Pas encore / à confirmer</option>
                  <option value="true">Oui, preuve disponible</option>
                  <option value="false">Non</option>
                </select>
              </Field>
            )}

            {needsStudentDeclaration && (
              <Field label="La déclaration nominative préalable de l'embauche de l'étudiant a-t-elle été accomplie ?">
                <select
                  value={triStateValue(form.studentPrefectureDeclarationCompleted)}
                  onChange={(event) => set("studentPrefectureDeclarationCompleted", parseTriState(event.target.value))}
                >
                  <option value="unknown">Je ne sais pas / pas encore</option>
                  <option value="true">Oui, preuve disponible</option>
                  <option value="false">Non</option>
                </select>
              </Field>
            )}
          </div>

          {form.registeredWithFranceTravail === true && (
            <div className="notice info">
              <Icon name="check" />
              <div>
                <strong>Exception France Travail déclarée</strong>
                <p>Les vérifications R. 5221-41 et R. 5221-42 sont écartées dans le cas modélisé. Les autres formalités applicables restent indépendantes, notamment la déclaration nominative propre à l'embauche d'un étudiant.</p>
              </div>
            </div>
          )}
        </>
      )}

      {needsEmploymentSituation && (
        <>
          <h3>Situation de l'emploi</h3>
          <p className="muted">Ces données sont utilisées lorsque l'autorisation de travail doit encore être instruite. Le moteur ignore les champs non pertinents et ne transforme jamais « je ne sais pas » en fait acquis.</p>
          <div className="form-grid">
            <Field label="Le métier est-il sur la liste en tension pour la région ?">
              <select value={triStateValue(form.jobInShortageList)} onChange={(event) => set("jobInShortageList", parseTriState(event.target.value))}>
                <option value="unknown">Je ne sais pas / à vérifier</option>
                <option value="true">Oui</option>
                <option value="false">Non</option>
              </select>
            </Field>

            {form.jobInShortageList !== true && (
              <Field label="L'offre a-t-elle été publiée 3 semaines consécutives dans les 6 derniers mois ?">
                <select value={triStateValue(form.offerPublishedThreeWeeks)} onChange={(event) => set("offerPublishedThreeWeeks", parseTriState(event.target.value))}>
                  <option value="unknown">Je ne sais pas / à vérifier</option>
                  <option value="true">Oui</option>
                  <option value="false">Non</option>
                </select>
              </Field>
            )}

            {form.offerPublishedThreeWeeks === true && form.jobInShortageList !== true && (
              <Field label="À l'issue de la publication, aucune candidature valable n'a-t-elle été reçue ?">
                <select value={triStateValue(form.noValidCandidateReceived)} onChange={(event) => set("noValidCandidateReceived", parseTriState(event.target.value))}>
                  <option value="unknown">À confirmer</option>
                  <option value="true">Oui, aucune candidature valable</option>
                  <option value="false">Non, une candidature valable a été reçue</option>
                </select>
              </Field>
            )}
          </div>
        </>
      )}

      {needsWorkAuthorization && form.workAuthorizationGrantedForContract === true && (
        <div className="notice info">
          <Icon name="check" />
          <div>
            <strong>Autorisation déclarée obtenue</strong>
            <p>Les critères ayant conduit à sa délivrance ne sont pas réévalués comme prérequis ouverts. Le moteur poursuit les contrôles du titre, de sa validité et des formalités employeur.</p>
          </div>
        </div>
      )}
    </section>
  );
}

function ResultView({
  action,
  assessmentId,
  result,
  onRestart,
}: {
  action: ActionType;
  assessmentId: string | null;
  result: AssessmentResult;
  onRestart: () => void;
}) {
  const tone = result.status === "clear" ? "success" : result.status === "blocked" ? "danger" : "warning";
  const sources = useMemo(() => getSources(result.sourceIds), [result.sourceIds]);

  return (
    <section className="result-view">
      <div className={`result-hero result-${result.status}`}>
        <div>
          <Badge tone={tone}>{result.statusLabel}</Badge>
          <h2>{result.summary}</h2>
          <p>Confiance moteur : <strong>{confidenceLabel(result.confidence)}</strong></p>
          {assessmentId && <small>Référence d'analyse : {assessmentId}</small>}
        </div>
        <div className="work-now">
          <small>{action === "modify" ? "Modification applicable aujourd'hui" : "Peut travailler aujourd'hui"}</small>
          <strong>{booleanAnswerLabel(result.canWorkNow)}</strong>
        </div>
      </div>

      {result.status === "review_required" && (
        <div className="notice warning">
          <Icon name="alert" />
          <div>
            <strong>Le moteur ne fournit pas de conclusion automatique sur le point incertain.</strong>
            <p>Complétez les données ou faites valider le régime applicable avant toute décision RH.</p>
          </div>
        </div>
      )}

      <div className="result-kpis">
        <div><span>Autorisation de travail</span><strong>{answerLabel(result.workAuthorization)}</strong></div>
        <div><span>Vérification employeur</span><strong>{answerLabel(result.employerVerification)}</strong></div>
        <div><span>Situation de l'emploi</span><strong>{answerLabel(result.employmentSituation)}</strong></div>
        <div><span>Métier en tension</span><strong>{answerLabel(result.shortageOccupation)}</strong></div>
        <div><span>Prochaine échéance</span><strong>{result.nextDeadline ? formatDate(result.nextDeadline) : "—"}</strong></div>
        <div><span>Règles appliquées</span><strong>{result.appliedRules.length}</strong></div>
      </div>

      <h3>Ce que le moteur a détecté</h3>
      <div className="finding-list">
        {result.findings.map((finding) => (
          <div className={`finding finding-${finding.severity}`} key={finding.id}>
            <span className="finding-icon">
              <Icon name={finding.severity === "success" ? "check" : finding.severity === "danger" ? "alert" : "clock"} />
            </span>
            <div>
              <strong>{finding.title}</strong>
              <p>{finding.detail}</p>
            </div>
          </div>
        ))}
      </div>

      <h3>Plan d'action</h3>
      <div className="checklist">
        {result.checklist.map((item) => (
          <div className="check-row" key={item.id}>
            <span className={`check-state state-${item.status}`}>
              {item.status === "done" ? "✓" : item.status === "blocked" ? "!" : "○"}
            </span>
            <div>
              <strong>{item.label}</strong>
              {item.description && <p>{item.description}</p>}
            </div>
          </div>
        ))}
      </div>

      <h3>Traçabilité des règles</h3>
      <div className="source-list">
        {result.appliedRules.map((rule) => (
          <div className="source-row" key={rule.ruleId}>
            <div>
              <strong>{rule.ruleId} · v{rule.version}</strong>
              <small>Effet : {formatDate(rule.effectiveFrom)} · revue : {formatDate(rule.lastReviewed)}</small>
            </div>
          </div>
        ))}
      </div>

      <h3>Sources mobilisées</h3>
      <div className="source-list">
        {sources.map((source) => (
          <a key={source.id} href={source.url} target="_blank" rel="noreferrer" className="source-row">
            <div>
              <strong>{source.title}</strong>
              <small>
                {source.effectiveFrom ? `Effet : ${formatDate(source.effectiveFrom)} · ` : ""}
                Revue : {formatDate(source.lastReviewed)}
              </small>
              {source.note && <small>{source.note}</small>}
            </div>
            <Icon name="external" />
          </a>
        ))}
      </div>

      <div className="notice info">
        <Icon name="shield" />
        <div>
          <strong>Cadre d'usage</strong>
          <p>{result.disclaimer}</p>
        </div>
      </div>

      <button className="btn secondary" onClick={onRestart}>Nouvelle analyse</button>
    </section>
  );
}

type StepProps = {
  form: AssessmentInput;
  set: <K extends keyof AssessmentInput>(key: K, value: AssessmentInput[K]) => void;
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="field"><span>{label}</span>{children}</label>;
}

function nationalityLabel(value: NationalityGroup) {
  return {
    france: "France",
    eu_eea_swiss: "UE / EEE / Suisse",
    third_country: "Pays tiers",
    algeria: "Algérie",
  }[value];
}

function documentSummary(form: AssessmentInput) {
  if (["france", "eu_eea_swiss"].includes(form.nationalityGroup)) return "Non applicable";
  return permitOptions.find((permit) => permit.value === form.permitType)?.label ?? "À préciser";
}

function renewalProofSummary(form: AssessmentInput) {
  return {
    none: form.renewalFiled === true ? "Dépôt déclaré, justificatif non reçu" : form.renewalFiled === false ? "Non déposé" : "À confirmer",
    submission_attestation: "Attestation de dépôt",
    extension_attestation: "Attestation de prolongation",
    receipt: "Récépissé",
    favorable_decision_attestation: "Décision favorable",
    new_permit: "Nouveau titre reçu",
    other: "Autre / à qualifier",
  }[form.renewalProofType ?? "none"];
}

function answerLabel(value: AssessmentResult["workAuthorization"]) {
  return {
    yes: "Oui",
    no: "Non",
    review: "À vérifier",
    not_applicable: "Non applicable",
  }[value];
}

function booleanAnswerLabel(value: boolean | null) {
  return value === true ? "OUI" : value === false ? "NON" : "À VÉRIFIER";
}

function confidenceLabel(value: AssessmentResult["confidence"]) {
  return value === "high" ? "élevée" : value === "medium" ? "moyenne" : "faible";
}

function triStateValue(value: boolean | null | undefined) {
  return value === true ? "true" : value === false ? "false" : "unknown";
}

function parseTriState(value: string): boolean | null {
  return value === "true" ? true : value === "false" ? false : null;
}

function formatDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}
