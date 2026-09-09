"use client";

import type { AssessmentInput } from "@/domain/legal/types";
import { Icon } from "@/components/ui/icon";

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

type Props = {
  form: AssessmentInput;
  set: <K extends keyof AssessmentInput>(key: K, value: AssessmentInput[K]) => void;
};

function triStateValue(value: boolean | null | undefined) {
  return value === true ? "true" : value === false ? "false" : "unknown";
}

function parseTriState(value: string): boolean | null {
  return value === "true" ? true : value === "false" ? false : null;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="field"><span>{label}</span>{children}</label>;
}

export function ModificationStep({ form, set }: Props) {
  const thirdCountry = form.nationalityGroup === "third_country";
  const employeeScoped = thirdCountry && ["employee", "temporary_worker"].includes(form.permitType);
  const student = thirdCountry && form.permitType === "student";
  const scopeSensitive = form.employerChanged === true || form.occupationChanged === true || form.regionChanged === true;
  const studentOverLimit = student && typeof form.studentHoursPlanned === "number" && form.studentHoursPlanned > 964;
  const newContractNeedsAuthorization = employeeScoped && form.newContract;
  const modificationNeedsScopeQualification = employeeScoped && !form.newContract && scopeSensitive;
  const needsEmploymentSituation = newContractNeedsAuthorization && form.workAuthorizationGrantedForContract !== true;

  function setNewContract(value: boolean) {
    set("newContract", value);
    if (value) {
      set("workAuthorizationGrantedForModification", null);
    } else {
      set("workAuthorizationGrantedForContract", null);
      set("jobInShortageList", null);
      set("offerPublishedThreeWeeks", null);
      set("noValidCandidateReceived", null);
    }
  }

  return (
    <section className="wizard-section">
      <p className="eyebrow">Étape 4</p>
      <h2>Quelle modification envisagez-vous ?</h2>
      <p className="muted">
        Décrivez la situation après modification. Le moteur distingue un nouveau contrat des changements internes et ne déduit pas une nouvelle autorisation lorsque le périmètre juridique n'est pas établi.
      </p>

      <div className="form-grid">
        <Field label="Date d'effet envisagée">
          <input
            type="date"
            value={form.modificationEffectiveDate ?? ""}
            onChange={(event) => set("modificationEffectiveDate", event.target.value || undefined)}
          />
        </Field>

        <Field label="Un nouveau contrat de travail sera-t-il conclu ?">
          <select value={form.newContract ? "true" : "false"} onChange={(event) => setNewContract(event.target.value === "true")}>
            <option value="false">Non</option>
            <option value="true">Oui</option>
          </select>
        </Field>

        <Field label="L'employeur change-t-il ?">
          <select value={triStateValue(form.employerChanged)} onChange={(event) => set("employerChanged", parseTriState(event.target.value))}>
            <option value="unknown">Je ne sais pas / à qualifier</option>
            <option value="true">Oui</option>
            <option value="false">Non</option>
          </select>
        </Field>

        <Field label="Le poste ou l'activité change-t-il ?">
          <select value={triStateValue(form.occupationChanged)} onChange={(event) => set("occupationChanged", parseTriState(event.target.value))}>
            <option value="unknown">Je ne sais pas / à qualifier</option>
            <option value="true">Oui</option>
            <option value="false">Non</option>
          </select>
        </Field>

        <Field label="La région d'emploi change-t-elle ?">
          <select value={triStateValue(form.regionChanged)} onChange={(event) => set("regionChanged", parseTriState(event.target.value))}>
            <option value="unknown">Je ne sais pas / à qualifier</option>
            <option value="true">Oui</option>
            <option value="false">Non</option>
          </select>
        </Field>

        <Field label="La rémunération change-t-elle ?">
          <select value={triStateValue(form.salaryChanged)} onChange={(event) => set("salaryChanged", parseTriState(event.target.value))}>
            <option value="unknown">Je ne sais pas / à qualifier</option>
            <option value="true">Oui</option>
            <option value="false">Non</option>
          </select>
        </Field>

        <Field label="Le temps de travail change-t-il ?">
          <select value={triStateValue(form.workingTimeChanged)} onChange={(event) => set("workingTimeChanged", parseTriState(event.target.value))}>
            <option value="unknown">Je ne sais pas / à qualifier</option>
            <option value="true">Oui</option>
            <option value="false">Non</option>
          </select>
        </Field>
      </div>

      {(form.occupationChanged === true || form.newContract) && (
        <>
          <h3>Poste avant / après</h3>
          <div className="form-grid">
            <Field label="Poste actuel">
              <input
                value={form.currentOccupation ?? ""}
                onChange={(event) => set("currentOccupation", event.target.value || undefined)}
                placeholder="Ex. technicien support"
              />
            </Field>
            <Field label="Poste après modification">
              <input
                value={form.occupation ?? ""}
                onChange={(event) => set("occupation", event.target.value || undefined)}
                placeholder="Ex. administrateur systèmes"
              />
            </Field>
          </div>
        </>
      )}

      {(form.regionChanged === true || (form.newContract && employeeScoped)) && (
        <>
          <h3>Zone d'emploi avant / après</h3>
          <div className="form-grid">
            <Field label="Région actuelle">
              <select value={form.currentRegion ?? ""} onChange={(event) => set("currentRegion", event.target.value || undefined)}>
                <option value="">À préciser</option>
                {regions.map((region) => <option key={region} value={region}>{region}</option>)}
              </select>
            </Field>
            <Field label="Région après modification">
              <select value={form.region ?? ""} onChange={(event) => set("region", event.target.value || undefined)}>
                <option value="">À préciser</option>
                {regions.map((region) => <option key={region} value={region}>{region}</option>)}
              </select>
            </Field>
          </div>
        </>
      )}

      {(form.salaryChanged === true || needsEmploymentSituation) && (
        <>
          <h3>Rémunération</h3>
          <div className="form-grid">
            {form.salaryChanged === true && (
              <Field label="Rémunération brute mensuelle actuelle">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.currentSalaryGrossMonthly ?? ""}
                  onChange={(event) => set("currentSalaryGrossMonthly", event.target.value ? Number(event.target.value) : undefined)}
                />
              </Field>
            )}
            <Field label="Rémunération brute mensuelle après modification">
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.salaryGrossMonthly ?? ""}
                onChange={(event) => set("salaryGrossMonthly", event.target.value ? Number(event.target.value) : undefined)}
              />
            </Field>
          </div>
        </>
      )}

      {form.newContract && (
        <div className="form-grid">
          <Field label="Type du nouveau contrat">
            <select value={form.contractType} onChange={(event) => set("contractType", event.target.value as "cdi" | "cdd" | "none")}>
              <option value="cdi">CDI</option>
              <option value="cdd">CDD</option>
              <option value="none">À préciser</option>
            </select>
          </Field>
        </div>
      )}

      {student && (
        <>
          <h3>Situation étudiante après modification</h3>
          <div className="form-grid">
            <Field label="Heures de travail prévues sur l'année après modification">
              <input
                type="number"
                min="0"
                value={form.studentHoursPlanned ?? ""}
                onChange={(event) => set("studentHoursPlanned", event.target.value ? Number(event.target.value) : undefined)}
              />
            </Field>
            {studentOverLimit && (
              <Field label="Le contrat relève-t-il d'un apprentissage dans le cursus ?">
                <select value={triStateValue(form.isApprenticeship)} onChange={(event) => set("isApprenticeship", parseTriState(event.target.value))}>
                  <option value="unknown">À préciser</option>
                  <option value="true">Oui</option>
                  <option value="false">Non</option>
                </select>
              </Field>
            )}
            {studentOverLimit && form.isApprenticeship === true && (
              <Field label="L'apprentissage est-il validé par le service compétent ?">
                <select value={triStateValue(form.apprenticeshipValidated)} onChange={(event) => set("apprenticeshipValidated", parseTriState(event.target.value))}>
                  <option value="unknown">À confirmer</option>
                  <option value="true">Oui</option>
                  <option value="false">Non / pas encore</option>
                </select>
              </Field>
            )}
          </div>
        </>
      )}

      {newContractNeedsAuthorization && (
        <Field label="Une autorisation de travail a-t-elle été obtenue pour ce nouveau contrat ?">
          <select
            value={triStateValue(form.workAuthorizationGrantedForContract)}
            onChange={(event) => set("workAuthorizationGrantedForContract", parseTriState(event.target.value))}
          >
            <option value="unknown">À confirmer / pas encore</option>
            <option value="true">Oui, décision obtenue</option>
            <option value="false">Non</option>
          </select>
        </Field>
      )}

      {modificationNeedsScopeQualification && (
        <Field label="Une autorisation couvrant précisément la configuration modifiée a-t-elle été obtenue ?">
          <select
            value={triStateValue(form.workAuthorizationGrantedForModification)}
            onChange={(event) => set("workAuthorizationGrantedForModification", parseTriState(event.target.value))}
          >
            <option value="unknown">Je ne sais pas / à vérifier</option>
            <option value="true">Oui, décision disponible</option>
            <option value="false">Non</option>
          </select>
        </Field>
      )}

      {needsEmploymentSituation && (
        <>
          <h3>Critères d'une nouvelle autorisation</h3>
          <p className="muted">Ces questions ne sont affichées que lorsqu'un nouveau contrat nécessite encore l'instruction d'une autorisation.</p>
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
              <Field label="Aucune candidature valable n'a-t-elle été reçue ?">
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

      {employeeScoped && (
        <div className="notice info">
          <Icon name="book" />
          <div>
            <strong>Nouveau contrat et périmètre de l'autorisation sont deux questions différentes</strong>
            <p>
              Un nouveau contrat déclenche la règle R. 5221-1. Sans nouveau contrat, l'autorisation existante peut néanmoins être limitée à certaines activités ou zones : le moteur vérifie alors son périmètre au lieu d'inventer une obligation automatique.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
