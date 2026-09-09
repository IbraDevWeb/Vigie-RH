import type { ReactNode } from "react";

export function StatCard({ label, value, detail, icon }: { label: string; value: string; detail: string; icon: ReactNode }) {
  return <div className="stat-card"><div className="stat-icon">{icon}</div><div><p className="eyebrow">{label}</p><strong className="stat-value">{value}</strong><p className="muted compact">{detail}</p></div></div>;
}
