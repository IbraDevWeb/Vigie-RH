import type { Metadata } from "next";
import { StaticPagesAnalysisBridge } from "@/infrastructure/static-pages-analysis-bridge";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Vigie RH", template: "%s · Vigie RH" },
  description: "Conformité des salariés étrangers pour les employeurs français.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const staticPages = process.env.GITHUB_PAGES === "true";

  return (
    <html lang="fr">
      <body>
        {staticPages && <StaticPagesAnalysisBridge />}
        {children}
      </body>
    </html>
  );
}
