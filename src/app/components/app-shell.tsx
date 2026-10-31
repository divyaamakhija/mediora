"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { label: "Overview", href: "/", icon: "◌" },
  { label: "Journal", href: "/journal", icon: "▤" },
  { label: "Medications", href: "/medications", icon: "＋" },
  { label: "Vital signs", href: "/vitals", icon: "⌁" },
  { label: "Documents", href: "/documents", icon: "▧" },
  { label: "AI assistant", href: "/assistant", icon: "✳" },
  { label: "Reminders", href: "/reminders", icon: "◷" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="app-shell">
      <aside className="app-sidebar" aria-label="Mediora workspace">
        <Link className="brand-lockup" href="/" aria-label="Mediora home">
          <span className="brand-mark" aria-hidden="true">m</span>
          <span className="brand-copy"><span className="brand-name">mediora</span><span className="brand-tagline">Your health, beautifully organized.</span></span>
        </Link>
        <p className="nav-caption">Your health space</p>
        <nav className="primary-navigation" aria-label="Main navigation">
          {navigation.map((item) => {
            const active = pathname === item.href;
            return <Link className={`navigation-link${active ? " is-active" : ""}`} href={item.href} aria-current={active ? "page" : undefined} key={item.href}><span className="navigation-icon" aria-hidden="true">{item.icon}</span><span>{item.label}</span>{active && <span className="navigation-indicator" aria-hidden="true" />}</Link>;
          })}
        </nav>
        <div className="sidebar-note"><span className="note-kicker">Your records, together</span><p>A thoughtful place to gather the details that matter to you.</p></div>
        <div className="profile-row"><span className="profile-avatar" aria-hidden="true">M</span><span className="profile-copy"><strong>My health space</strong><small>Personal journal</small></span><span className="profile-dot" aria-hidden="true" /></div>
      </aside>
      <div className="app-content">
        <header className="mobile-header"><Link className="brand-lockup" href="/" aria-label="Mediora home"><span className="brand-mark" aria-hidden="true">m</span><span className="brand-name">mediora</span></Link><span className="mobile-tagline">Your health, beautifully organized.</span></header>
        <nav className="mobile-navigation" aria-label="Main navigation">
          {navigation.map((item) => {
            const active = pathname === item.href;
            return <Link href={item.href} aria-current={active ? "page" : undefined} className={active ? "is-active" : ""} key={item.href}><span aria-hidden="true">{item.icon}</span>{item.label}</Link>;
          })}
        </nav>
        {children}
      </div>
    </div>
  );
}
