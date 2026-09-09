import { cn } from "@/lib/cn";

export function RiskDot({ risk }: { risk: "ok" | "attention" | "critical" }) {
  return <span className={cn("risk-dot", `risk-${risk}`)} aria-label={risk}/>;
}
