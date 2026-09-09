import { AppShell } from "@/components/app-shell";
import { BrowserAnalysisWizard } from "@/components/analysis/browser-analysis-wizard";

export default function AnalysePage() {
  return (
    <AppShell
      title="Nouvelle analyse"
      subtitle="Décrivez la situation : Vigie construit le parcours juridique et les actions employeur."
    >
      <BrowserAnalysisWizard />
    </AppShell>
  );
}
