import type { AssessmentInput, TerminationReason } from "@/domain/legal/types";
import { Icon } from "@/components/ui/icon";

type Props = {
  form: AssessmentInput;
  set: <K extends keyof AssessmentInput>(key: K, value: AssessmentInput[K]) => void;
};

const reasons: Array<{ value: TerminationReason; label: string }> = [
  { value: "unknown", label: "Je ne sais pas encore / motif à qualifier" },
  { value: "document_expired", label: "Titre ou document arrivé à expiration" },
  { value: "authorization_refused_or_withdrawn", label: "Autorisation refusée, retirée ou devenue sans effet" },
  { value: "activity_not_covered", label: "Poste, profession ou zone non couvert par l'autorisation" },
  { value: "other", label: "Autre motif lié au droit au travail" },
];

export function TerminationStep({ form, set }: Props) {
  const thirdCountry = form.nationalityGroup === "third_country";
  const foreignRegime = ["third_country", "algeria"].includes(form.nationalityGroup);
  const employeePermit = ["employee", "temporary_worker"].includes(form.permitType);
  const student = form.permitType === "student";
  const studentOverLimit = student && typeof form.studentHoursPlanned === "number" && form.studentHoursPlanned > 964;
  const studentNeedsAuthorization = studentOverLimit && form.isApprenticeship !== true;

  return (
    <section className="wizard-section">
      <p className="eyebrow">Étape 4</p>
      <h2>Perte du droit au travail et rupture envisagée</h2>
      <p className="muted">
        Ce parcours distingue deux questions : le salarié peut-il encore être maintenu au travail, puis quelles vérifications sont nécessaires avant une éventuelle rupture. Il ne génère jamais automatiquement une lettre ou une décision de licenciement.
      </p>

      <div className="form-grid">
        <Field label="Contrat actuel">
          <select value={form.contractType} onChange={(event) => set("contractType", event.target.value as "cdi" | "cdd" | "none")}>
            <option value="cdi">CDI</option>
            <option value="cdd">CDD</option>
            <option value="none">À préciser</option>
          </select>
        </Field>

        <Field label="Pourquoi envisagez-vous une rupture liée au droit au travail ?">
          <select
            value={form.terminationReason ?? "unknown"}
            onChange={(event) => set("terminationReason", event.target.value as TerminationReason)}
          >
            {reasons.map((reason) => <option key={reason.value} value={reason.value}>{reason.label}</option>)}
          </select>
        </Field>

        {foreignRegime && (
          <Field label="Date à laquelle le droit au travail aurait cessé, si elle est établie">
            <input
              type="date"
              value={form.terminationLossDate ?? ""}
              onChange={(event) => set("terminationLossDate", event.target.value || undefined)}
            />
          </Field>
        )}

        {thirdCountry && (
          <Field label="Le salarié bénéficie-t-il d'un statut de salarié protégé ?">
            <select
              value={triStateValue(form.protectedEmployee)}
              onChange={(event) => set("protectedEmployee", parseTriState(event.target.value))}
            >
              <option value="unknown">À vérifier</option>
              <option value="true">Oui</option>
              <option value="false">Non</option>
            </select>
          </Field>
        )}

        {thirdCountry && (
          <Field label="A-t-il continué à travailler pendant une période où il était sans droit au travail établi ?">
            <select
              value={triStateValue(form.workedWhileUnauthorized)}
              onChange={(event) => set("workedWhileUnauthorized", parseTriState(event.target.value))}
            >
              <option value="unknown">Je ne sais pas / à vérifier</option>
              <option value="true">Oui</option>
              <option value="false">Non</option>
            </select>
          </Field>
        )}

        {(employeePermit || form.terminationReason === "activity_not_covered") && thirdCountry && (
          <>
            <Field label="Poste / activité actuellement exercé">
              <input
                value={form.occupation ?? ""}
                onChange={(event) => set("occupation", event.target.value || undefined)}
                placeholder="Ex. technicien de maintenance"
              />
            </Field>
            <Field label="Région d'emploi actuelle">
              <input
                value={form.region ?? ""}
                onChange={(event) => set("region", event.target.value || undefined)}
                placeholder="Ex. Île-de-France"
              />
            </Field>
          </>
        )}

        {employeePermit && thirdCountry && (
          <Field label="L'autorisation actuellement valable couvre-t-elle ce contrat, cette activité et cette zone d'emploi ?">
            <select
              value={triStateValue(form.workAuthorizationGrantedForContract)}
              onChange={(event) => set("workAuthorizationGrantedForContract", parseTriState(event.target.value))}
            >
              <option value="unknown">Je ne sais pas / à contrôler sur l'autorisation</option>
              <option value="true">Oui, le périmètre actuel est couvert</option>
              <option value="false">Non, le périmètre actuel n'est pas couvert</option>
            </select>
          </Field>
        )}

        {student && thirdCountry && (
          <Field label="Heures de travail actuelles ou prévues sur l'année">
            <input
              type="number"
              min="0"
              value={form.studentHoursPlanned ?? ""}
              onChange={(event) => set("studentHoursPlanned", event.target.value ? Number(event.target.value) : undefined)}
              placeholder="Ex. 700"
            />
          </Field>
        )}

        {studentOverLimit && thirdCountry && (
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

        {studentOverLimit && form.isApprenticeship === true && thirdCountry && (
          <Field label="Le contrat d'apprentissage a-t-il été validé par le service compétent ?">
            <select
              value={triStateValue(form.apprenticeshipValidated)}
              onChange={(event) => set("apprenticeshipValidated", parseTriState(event.target.value))}
            >
              <option value="unknown">À confirmer</option>
              <option value="true">Oui</option>
              <option value="false">Non</option>
            </select>
          </Field>
        )}

        {studentNeedsAuthorization && thirdCountry && (
          <Field label="Une autorisation de travail valable couvre-t-elle cette activité au-delà de 964 heures ?">
            <select
              value={triStateValue(form.workAuthorizationGrantedForContract)}
              onChange={(event) => set("workAuthorizationGrantedForContract", parseTriState(event.target.value))}
            >
              <option value="unknown">Je ne sais pas / à vérifier</option>
              <option value="true">Oui</option>
              <option value="false">Non</option>
            </select>
          </Field>
        )}
      </div>

      {form.protectedEmployee === true && (
        <div className="notice warning">
          <Icon name="alert" />
          <div>
            <strong>Salarié protégé déclaré</strong>
            <p>Le moteur signalera la procédure spéciale et ne conclura pas automatiquement à une rupture. Le mandat exact doit être identifié avant toute notification.</p>
          </div>
        </div>
      )}

      {form.workedWhileUnauthorized === true && (
        <div className="notice warning">
          <Icon name="alert" />
          <div>
            <strong>Période de travail sans autorisation déclarée</strong>
            <p>Le résultat signalera les droits prévus par l'article L. 8252-2 et demandera un calcul juridique des sommes dues.</p>
          </div>
        </div>
      )}

      {!thirdCountry && (
        <div className="notice info">
          <Icon name="book" />
          <div>
            <strong>Périmètre du parcours</strong>
            <p>Ce workflow vise la rupture liée à la perte d'un droit au travail de ressortissant de pays tiers. Les autres motifs de rupture ne sont pas modélisés ici.</p>
          </div>
        </div>
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
