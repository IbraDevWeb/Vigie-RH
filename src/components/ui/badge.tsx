import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "success" | "warning" | "danger" | "info" }) {
  return <span className={cn("badge", `badge-${tone}`)}>{children}</span>;
}
