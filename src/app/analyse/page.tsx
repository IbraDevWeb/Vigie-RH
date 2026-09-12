import { AppShell } from "@/components/app-shell";
import { AnalysisWizard } from "@/components/analysis/analysis-wizard";
import { EmployeeAnalysisBridge } from "@/infrastructure/employee-analysis-bridge";

export default function AnalysePage() {
  const staticPages = process.env.GITHUB_PAGES === "true";

  return <AppShell title="Nouvelle analyse" subtitle="Décrivez la situation : Vigie construit le parcours juridique et les actions employeur.">
    {!staticPages && <EmployeeAnalysisBridge />}
    <AnalysisWizard/>
  </AppShell>;
}
