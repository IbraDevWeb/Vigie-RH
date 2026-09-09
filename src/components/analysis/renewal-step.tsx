import type { AssessmentInput, RenewalProofType } from "@/domain/legal/types";
import { Icon } from "@/components/ui/icon";

const renewalProofOptions: Array<{ value: RenewalProofType; label: string }> = [
  { value: "none", label: "Aucun justificatif reçu pour le moment" },
  { value: "submission_attestation", label: "Attestation / confirmation de dépôt en ligne" },
  { value: "extension_attestation", label: "Attestation de prolongation d'instruction" },
  { value: "receipt", label: "Récépissé de demande de renouvellement" },
  { value: "favorable_decision_attestation", label: "Attestation de décision favorable" },
  { value: "new_permit", label: "Nouveau titre reçu" },
  { value: "other", label: "Autre justificatif / je ne sais pas" },
];

type Props = {
  form: AssessmentInput;
  set: <K extends keyof AssessmentInput>(key: K, value: AssessmentInput[K]) => void;
};

export function RenewalStep({ form, set }: Props) {
  const foreignWorkflow = ["third_country", "algeria"].includes(form.nationalityGroup);
  const student = form.permitType === "student";
  const studentOverLimit = student && typeof form.studentHoursPlanned === "number" && form.studentHoursPlanned > 964;
  const employeePermit = ["employee", "temporary_worker"].includes(form.permitType);
  const proofType = form.renewalProofType ?? "none";
  const proofNeedsValidity = ["extension_attestation", "receipt", "favorable_decision_attestation", "new_permit"].includes(proofType);

  function setFiled(value: boolean | null) {
    set("renewalFiled", value);
    if (value !== true) {
      set("renewalFiledAt", undefined);
      set("renewalProofType", "none");
      set("renewalProofValidUntil", undefined);
      set("renewalProofAllowsWork", null);
    }
  }

  function setProof(value: RenewalProofType) {
    set("renewalProofType", value);
    if (value !== "none") set("renewalFiled", true);
    if (!["extension_attestation", "receipt", "favorable_decision_attestation", "new_permit"].includes(value)) {
      set("renewalProofValidUntil", undefined);
    }
    if (value !== "receipt") set("renewalProofAllowsWork", null);
  }

  return (
    <section className="wizard-section">
      <p className="eyebrow">Étape 4</p>
      <h2>Renouvellement et continuité du droit au travail</h2>
      <p className="muted">
        Le titre actuel et le justificatif reçu pendant l'instruction sont traités séparément. Une simple preuve de dépôt n'est jamais assimilée à un document autorisant le travail.
      </p>

      {!foreignWorkflow ? (
        <div className="notice info">
          <Icon name="check" />
          <div>
            <strong>Parcours titre de séjour non applicable</strong>
            <p>La nationalité déclarée ne relève pas du workflow de renouvellement d'un titre de séjour étranger modélisé ici.</p>
          </div>
        </div>
      ) : (
        <>
          {form.nationalityGroup === "algeria" && (
            <div className="notice warning">
              <Icon name="alert" />
              <div>
                <strong>Régime franco-algérien</strong>
                <p>Les informations peuvent être enregistrées, mais le verdict restera en revue complémentaire tant que ce régime spécial n'est pas modélisé.</p>
              </div>
            </div>
          )}

          {student && (
            <>
              <h3>Activité étudiante</h3>
              <div className="form-grid">
                <Field label="Heures de travail prévues sur l'année">
                  <input
                    type="number"
                    min="0"
                    value={form.studentHoursPlanned ?? ""}
                    onChange={(event) => set("studentHoursPlanned", event.target.value ? Number(event.target.value) : undefined)}
                    placeholder="Ex. 700"
                  />
                </Field>

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
              </div>
            </>
          )}

          {employeePermit && (
            <>
              <h3>Autorisation de travail associée</h3>
              <p className="muted">Pour un titre « salarié » ou « travailleur temporaire », l'échéance de l'autorisation de travail est suivie séparément de celle du titre.</p>
              <div className="form-grid">
                <Field label="Date de fin de validité de l'autorisation de travail">
                  <input
                    type="date"
                    value={form.workAuthorizationValidUntil ?? ""}
                    onChange={(event) => set("workAuthorizationValidUntil", event.target.value || undefined)}
                  />
                </Field>
                <Field label="Le renouvellement de l'autorisation de travail a-t-il été déposé ?">
                  <select value={triStateValue(form.workAuthorizationRenewalFiled)} onChange={(event) => set("workAuthorizationRenewalFiled", parseTriState(event.target.value))}>
                    <option value="unknown">Je ne sais pas / à vérifier</option>
                    <option value="true">Oui</option>
                    <option value="false">Non</option>
                  </select>
                </Field>
              </div>
            </>
          )}

          <h3>Demande de renouvellement du titre</h3>
          <div className="form-grid">
            <Field label="La demande de renouvellement a-t-elle été déposée ?">
              <select value={triStateValue(form.renewalFiled)} onChange={(event) => setFiled(parseTriState(event.target.value))}>
                <option value="unknown">Je ne sais pas / à confirmer</option>
                <option value="true">Oui</option>
                <option value="false">Non</option>
              </select>
            </Field>

            {form.renewalFiled === true && (
              <Field label="Date de dépôt du renouvellement">
                <input
                  type="date"
                  value={form.renewalFiledAt ?? ""}
                  onChange={(event) => set("renewalFiledAt", event.target.value || undefined)}
                />
              </Field>
            )}

            {(form.renewalFiled === true || proofType !== "none") && (
              <Field label="Quel justificatif avez-vous actuellement ?">
                <select value={proofType} onChange={(event) => setProof(event.target.value as RenewalProofType)}>
                  {renewalProofOptions.map((proof) => <option key={proof.value} value={proof.value}>{proof.label}</option>)}
                </select>
              </Field>
            )}

            {proofNeedsValidity && (
              <Field label={proofType === "new_permit" ? "Date de fin de validité du nouveau titre" : "Date de fin de validité du justificatif"}>
                <input
                  type="date"
                  value={form.renewalProofValidUntil ?? ""}
                  onChange={(event) => set("renewalProofValidUntil", event.target.value || undefined)}
                />
              </Field>
            )}

            {proofType === "receipt" && (
              <Field label="Le récépissé porte-t-il la mention autorisant son titulaire à travailler ?">
                <select value={triStateValue(form.renewalProofAllowsWork)} onChange={(event) => set("renewalProofAllowsWork", parseTriState(event.target.value))}>
                  <option value="unknown">Je ne sais pas / à contrôler</option>
                  <option value="true">Oui, la mention est présente</option>
                  <option value="false">Non</option>
                </select>
              </Field>
            )}
          </div>

          {proofType === "submission_attestation" && (
            <div className="notice warning">
              <Icon name="alert" />
              <div>
                <strong>La preuve de dépôt n'est pas une prolongation de droit</strong>
                <p>Après l'expiration du titre, le moteur ne l'utilise pas pour autoriser le maintien au travail. Une continuité légale spéciale peut toutefois être analysée séparément lorsque ses conditions sont modélisées.</p>
              </div>
            </div>
          )}

          {proofType === "extension_attestation" && (
            <div className="notice info">
              <Icon name="shield" />
              <div>
                <strong>Attestation de prolongation</strong>
                <p>Le moteur vérifie sa validité et ne l'utilise automatiquement que lorsque le titre renouvelé appartient à une catégorie dont le droit au travail est suffisamment modélisé.</p>
              </div>
            </div>
          )}

          {form.permitType === "resident" && (
            <div className="notice info">
              <Icon name="clock" />
              <div>
                <strong>Continuité spécifique de la carte de résident</strong>
                <p>Lorsque les conditions sont établies, le moteur peut appliquer la continuité de trois mois après l'expiration. Il ne généralise pas ce mécanisme aux autres titres.</p>
              </div>
            </div>
          )}
        </>
      )}
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
