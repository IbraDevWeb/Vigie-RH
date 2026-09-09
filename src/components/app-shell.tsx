"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

const nav: Array<{ href: string; label: string; icon: IconName }> = [
  { href: "/dashboard", label: "Vue d'ensemble", icon: "grid" },
  { href: "/analyse", label: "Nouvelle analyse", icon: "scan" },
  { href: "/salaries", label: "Salariés", icon: "users" },
  { href: "/audit", label: "Audit conformité", icon: "shield" },
  { href: "/sources", label: "Sources juridiques", icon: "book" },
];

export function AppShell({ children, title, subtitle, action }: { children: ReactNode; title: string; subtitle?: string; action?: ReactNode }) {
  const pathname = usePathname();
  return <div className="app-layout">
    <aside className="sidebar">
      <Link className="brand" href="/dashboard"><span className="brand-mark">V</span><span><b>Vigie</b><small>conformité RH</small></span></Link>
      <nav className="nav-list">
        {nav.map((item) => <Link key={item.href} href={item.href} className={cn("nav-link", pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href)) ? "active" : "")}><Icon name={item.icon}/><span>{item.label}</span></Link>)}
      </nav>
      <div className="sidebar-bottom">
        <div className="org-card"><span className="avatar">AC</span><div><strong>Atelier Conseil</strong><small>Organisation démo</small></div></div>
        <Link className="nav-link" href="/parametres"><Icon name="settings"/><span>Paramètres</span></Link>
      </div>
    </aside>
    <main className="main-panel">
      <header className="topbar"><div><p className="breadcrumbs">Vigie RH / Atelier Conseil</p><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>{action && <div>{action}</div>}</header>
      <div className="page-content">{children}</div>
    </main>
  </div>;
}
