"use client";

import type { AssessmentInput } from "@/domain/legal/types";
import { Icon } from "@/components/ui/icon";

type Props = {
  form: AssessmentInput;
  set: <K extends keyof AssessmentInput>(key: K, value: AssessmentInput[K]) => void;
};

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

export function CanWorkStep({ form, set }: Props) {
  const thirdCountry = form.nationalityGroup === "third_country";
  const employeePermit = ["employee", "temporary_worker"].includes(form.permitType);
  const student = form.permitType === "student";
  const studentOverLimit = student
    && typeof form.studentHoursPlanned === "number"
    && form.studentHoursPlanned > 964;
  const temporary = ["receipt", "extension_attestation"].includes(form.permitType);

  return (
    <section className="wizard-section">
      <p className="eyebrow">Étape 4</p>
      <h2>Droit au travail aujourd&apos;hui</h2>
      <p className="muted">
        Ce contrôle porte sur la situation actuelle. Il ne crée pas un scénario de nouvelle embauche et ne réutilise pas les formalités propres à un nouveau contrat.
      </p>

      {thirdCountry && (employeePermit || student) && (
        <div className="form-grid">
          <Field label="Contrat actuellement exécuté">
            <select
              value={form.contractType}
              onChange={(event) => set("contractType", event.target.value as "cdi" | "cdd" | "none")}
            >
              <option value="cdi">CDI</option>
              <option value="cdd">CDD</option>
              <option value="none">Autre / à préciser</option>
            </select>
          </Field>

          <Field label="Poste / activité actuelle">
            <input
              value={form.occupation ?? ""}
              onChange={(event) => set("occupation", event.target.value || undefined)}
              placeholder="Ex. technicien de maintenance"
            />
          </Field>

          <Field label="Région d'emploi actuelle">
            <select value={form.region ?? ""} onChange={(event) => set("region", event.target.value || undefined)}>
              <option value="">À préciser</option>
              {regions.map((region) => <option key={region} value={region}>{region}</option>)}
            </select>
          </Field>
        </div>
      )}

      {thirdCountry && employeePermit && (
        <>
          <h3>Autorisation associée au contrat actuel</h3>
          <div className="form-grid">
            <Field label="L'autorisation conservée couvre-t-elle ce contrat, cette activité et cette zone d'emploi ?">
              <select
                value={triStateValue(form.workAuthorizationGrantedForContract)}
                onChange={(event) => set("workAuthorizationGrantedForContract", parseTriState(event.target.value))}
              >
                <option value="unknown">Je ne sais pas / à vérifier</option>
                <option value="true">Oui, le périmètre correspond</option>
                <option value="false">Non, le périmètre ne correspond pas</option>
              </select>
            </Field>
          </div>
          <div className="notice info">
            <Icon name="book" />
            <div>
              <strong>Pourquoi vérifier le périmètre ?</strong>
              <p>Une autorisation de travail peut être limitée à certaines activités professionnelles ou zones géographiques. Le moteur ne suppose donc pas que tout contrat actuel est automatiquement couvert.</p>
            </div>
          </div>
        </>
      )}

      {thirdCountry && student && (
        <>
          <h3>Activité salariée de l'étudiant</h3>
          <div className="form-grid">
            <Field label="Heures de travail prévues sur l'année">
              <input
                type="number"
                min="0"
                max="8760"
                value={form.studentHoursPlanned ?? ""}
                onChange={(event) => set("studentHoursPlanned", event.target.value ? Number(event.target.value) : undefined)}
                placeholder="Ex. 700"
              />
            </Field>

            {studentOverLimit && (
              <Field label="L'activité au-delà de 964 heures relève-t-elle d'un contrat d'apprentissage ?">
                <select
                  value={triStateValue(form.isApprenticeship)}
                  onChange={(event) => set("isApprenticeship", parseTriState(event.target.value))}
                >
                  <option value="unknown">À préciser</option>
                  <option value="true">Oui</option>
                  <option value="false">Non</option>
                </select>
              </Field>
            )}

            {studentOverLimit && form.isApprenticeship === true && (
              <Field label="Le contrat d'apprentissage a-t-il été validé par le service compétent ?">
                <select
                  value={triStateValue(form.apprenticeshipValidated)}
                  onChange={(event) => set("apprenticeshipValidated", parseTriState(event.target.value))}
                >
                  <option value="unknown">À confirmer</option>
                  <option value="true">Oui</option>
                  <option value="false">Non / pas encore</option>
                </select>
              </Field>
            )}

            {studentOverLimit && form.isApprenticeship === false && (
              <Field label="Une autorisation de travail correspondant à cette activité est-elle obtenue ?">
                <select
                  value={triStateValue(form.workAuthorizationGrantedForContract)}
                  onChange={(event) => set("workAuthorizationGrantedForContract", parseTriState(event.target.value))}
                >
                  <option value="unknown">À confirmer</option>
                  <option value="true">Oui, preuve disponible</option>
                  <option value="false">Non</option>
                </select>
              </Field>
            )}
          </div>
        </>
      )}

      {thirdCountry && form.permitType === "resident" && (
        <div className="notice info">
          <Icon name="check" />
          <div>
            <strong>Carte de résident</strong>
            <p>Dans le périmètre actuellement modélisé, le moteur contrôle surtout la validité du titre. Il ne demande pas une autorisation de travail distincte pour cette catégorie.</p>
          </div>
        </div>
      )}

      {temporary && !["france", "eu_eea_swiss"].includes(form.nationalityGroup) && (
        <div className="notice warning">
          <Icon name="alert" />
          <div>
            <strong>Document provisoire : contrôle exact indispensable</strong>
            <p>La mention autorisant ou non le travail a été renseignée à l'étape précédente. Le moteur reste prudent sur un récépissé ou une attestation tant que le fondement, la mention exacte et la validité ne sont pas suffisamment qualifiés.</p>
          </div>
        </div>
      )}

      {thirdCountry && ["private_family", "talent", "other"].includes(form.permitType) && (
        <div className="notice warning">
          <Icon name="alert" />
          <div>
            <strong>Document à préciser avant conclusion automatique</strong>
            <p>Le libellé sélectionné ne suffit pas à identifier de manière sûre le fondement exact et, lorsque nécessaire, le périmètre d'activité autorisé. Une revue complémentaire sera demandée.</p>
          </div>
        </div>
      )}

      {form.nationalityGroup === "algeria" && (
        <div className="notice warning">
          <Icon name="alert" />
          <div>
            <strong>Régime franco-algérien</strong>
            <p>Ce régime reste volontairement hors conclusion automatique tant que sa branche juridique dédiée n'est pas modélisée.</p>
          </div>
        </div>
      )}

      {["france", "eu_eea_swiss"].includes(form.nationalityGroup) && (
        <div className="notice info">
          <Icon name="check" />
          <div>
            <strong>Contrôle simplifié</strong>
            <p>Le moteur appliquera les règles liées à la nationalité déclarée sans demander un titre de séjour de ressortissant de pays tiers.</p>
          </div>
        </div>
      )}

      <div className="notice info">
        <Icon name="shield" />
        <div>
          <strong>Contrôle documentaire</strong>
          <p>La conclusion suppose que les données saisies correspondent aux documents authentiques et en vigueur. Vigie ne transforme jamais une information inconnue en réponse positive.</p>
        </div>
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="field"><span>{label}</span>{children}</label>;
}

function triStateValue(value: boolean | null | undefined) {
  return value === true ? "true" : value === false ? "false" : "unknown";
}

function parseTriState(value: string): boolean | null {
  return value === "true" ? true : value === "false" ? false : null;
}
