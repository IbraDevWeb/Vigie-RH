import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Vigie RH", template: "%s · Vigie RH" },
  description: "Conformité des salariés étrangers pour les employeurs français.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="fr"><body>{children}</body></html>;
}
