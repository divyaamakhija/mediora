"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type RecordItem = Record<string, unknown>;
type IconName = "journal" | "medication" | "vitals" | "document" | "reminder";
type ActivityItem = { id: string; title: string; detail: string; date: string; href: string; icon: IconName; severity?: string };

function RecordIcon({ name }: { name: IconName }) {
  const paths: Record<IconName, React.ReactNode> = {
    journal: <><path d="M6 4.75h12a1.5 1.5 0 0 1 1.5 1.5v12.5a1.5 1.5 0 0 1-1.5 1.5H6a1.5 1.5 0 0 1-1.5-1.5V6.25A1.5 1.5 0 0 1 6 4.75Z"/><path d="M8 9h8M8 12h8M8 15h5"/></>,
    medication: <><path d="m8.2 15.8 7.6-7.6a3.1 3.1 0 0 1 4.4 4.4l-7.6 7.6a3.1 3.1 0 0 1-4.4-4.4Z"/><path d="m10.4 13.6 4.4 4.4"/><path d="M5 4v6M2 7h6"/></>,
    vitals: <><path d="M3 12h4l2.2-5 4 10 2.2-5H21"/></>,
    document: <><path d="M7 3.75h7l4 4v12.5H7a2 2 0 0 1-2-2v-12.5a2 2 0 0 1 2-2Z"/><path d="M14 4v4h4M8.5 12h7M8.5 15.5h7"/></>,
    reminder: <><circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.3 2"/></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

const collections = [
  { key: "mediora-symptom-journal", label: "Journal entries", href: "/journal", detail: "Your symptom notes", icon: "journal" as const },
  { key: "mediora-medications", label: "Medications", href: "/medications", detail: "Your saved list", icon: "medication" as const },
  { key: "mediora-vital-signs", label: "Vital records", href: "/vitals", detail: "Measurements recorded", icon: "vitals" as const },
  { key: "mediora-medical-documents", label: "Documents", href: "/documents", detail: "Saved document details", icon: "document" as const },
] as const;

const sources = [
  ...collections.map((item) => ({ ...item, kind: item.key })),
  { key: "mediora-reminders", label: "Reminders", href: "/reminders", detail: "Scheduled activity", icon: "reminder" as const, kind: "mediora-reminders" },
];

const actions = [
  { label: "Log a symptom", href: "/journal", icon: "＋" },
  { label: "Add medication", href: "/medications", icon: "＋" },
  { label: "Record a vital", href: "/vitals", icon: "＋" },
  { label: "Add a document", href: "/documents", icon: "＋" },
];

function readRecords(key: string): RecordItem[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((entry): entry is RecordItem => !!entry && typeof entry === "object") : [];
  } catch {
    return [];
  }
}

function recordText(record: RecordItem, field: string, fallback = "") {
  const value = record[field];
  return typeof value === "string" && value.trim() ? value : fallback;
}

function recordDate(record: RecordItem) {
  return recordText(record, "date", recordText(record, "startDate"));
}

function formatDate(value: string) {
  if (!value) return "Date not recorded";
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function getRecentActivity(): ActivityItem[] {
  return sources.flatMap((source) => readRecords(source.key).map((record, index) => {
    const title = recordText(record, "name", recordText(record, "title", recordText(record, "type", recordText(record, "category", recordText(record, "fileName", source.label.slice(0, -1))))));
    let detail = source.detail;
    const severity = source.kind === "mediora-symptom-journal" ? recordText(record, "severity") : "";
    if (source.kind === "mediora-symptom-journal") detail = "Symptom journal";
    if (source.kind === "mediora-medications") detail = [recordText(record, "dosage"), recordText(record, "frequency")].filter(Boolean).join(" · ") || "Medication entry";
    if (source.kind === "mediora-vital-signs") detail = `${recordText(record, "type", "Measurement")}: ${recordText(record, "value")}${recordText(record, "unit") ? ` ${recordText(record, "unit")}` : ""}`;
    if (source.kind === "mediora-reminders") detail = `${recordText(record, "category", "Reminder")}${recordText(record, "time") ? ` · ${recordText(record, "time")}` : ""}`;
    return { id: `${source.key}-${recordText(record, "id", String(index))}`, title, detail, date: recordDate(record), href: source.href, icon: source.icon, severity };
  })).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
}

export default function Home() {
  const [counts, setCounts] = useState<Record<string, number> | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [localDate, setLocalDate] = useState("");

  useEffect(() => {
    const refresh = () => {
      setCounts(Object.fromEntries(collections.map((item) => [item.key, readRecords(item.key).length])));
      setActivity(getRecentActivity());
    };
    const task = window.setTimeout(() => {
      setLocalDate(new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" }));
      refresh();
    }, 0);
    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearTimeout(task);
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  return (
    <main className="dashboard-main">
      <div className="dashboard-wrap">
        <header className="dashboard-topline">
          <div><p className="dashboard-eyebrow">YOUR PERSONAL HEALTH JOURNAL</p><h1 className="dashboard-heading">Your health,<br />beautifully organized.</h1><p className="dashboard-intro">A calmer way to keep the details of your health together.</p></div>
          <div className="date-stamp"><span className="date-stamp-mark">✳</span><span><small>Today</small><strong>{localDate || "Your local date"}</strong></span></div>
        </header>

        <section className="dashboard-section" aria-labelledby="quick-actions-title">
          <div className="dashboard-section-title"><div><p className="section-kicker">MAKE A NOTE</p><h2 id="quick-actions-title">Keep your records close</h2></div></div>
          <div className="quick-actions">{actions.map((action, index) => <Link className={`quick-action quick-action-${index + 1}`} href={action.href} key={action.href}><span className="quick-action-mark" aria-hidden="true">{action.icon}</span><span>{action.label}</span><span className="action-arrow" aria-hidden="true">↗</span></Link>)}</div>
        </section>

        <section className="dashboard-section" aria-labelledby="record-summary-title">
          <div className="dashboard-section-title summary-heading"><div><p className="section-kicker">YOUR HEALTH, AT A GLANCE</p><h2 id="record-summary-title">A little more in context</h2></div><span className="summary-caption">Counts from your saved records</span></div>
          <div className="summary-grid">{collections.map((item, index) => <Link className="summary-card" href={item.href} key={item.key}><div className="summary-card-top"><span className={`summary-icon summary-icon-${index + 1}`}><RecordIcon name={item.icon} /></span></div><div className="summary-number" aria-live="polite">{counts ? counts[item.key] : "—"}</div><div className="summary-label">{item.label}</div><div className="summary-note">{item.detail}</div></Link>)}</div>
        </section>

        <div className="dashboard-columns">
          <section className="dashboard-panel activity-panel" aria-labelledby="activity-title">
            <div className="dashboard-section-title"><div><p className="section-kicker">YOUR TIMELINE</p><h2 id="activity-title">Recently added</h2></div><span className="activity-count">{counts ? `${activity.length} recent` : "Loading"}</span></div>
            {activity.length ? <div className="activity-list">{activity.map((item) => <Link href={item.href} className="activity-item" key={item.id}><span className="activity-mark"><RecordIcon name={item.icon} /></span><span className="activity-copy"><strong className="activity-title">{item.title}</strong><span className="activity-meta">{item.detail}{item.severity && <span className={`severity-badge severity-${item.severity.toLowerCase()}`}>{item.severity}</span>}</span></span><time className="activity-date" dateTime={item.date || undefined}>{formatDate(item.date)}</time></Link>)}</div> : <div className="activity-empty"><span className="empty-glyph" aria-hidden="true">✳</span><div><strong>{counts ? "Your timeline begins with you" : "Gathering your records"}</strong><p>{counts ? "As you add entries, your recent activity will find its place here." : "Reading your saved health details…"}</p></div>{counts && <Link href="/journal" className="text-link">Write your first note <span aria-hidden="true">↗</span></Link>}</div>}
          </section>

          <section className="assistant-feature" aria-labelledby="assistant-feature-title">
            <div className="assistant-feature-top"><span className="assistant-orbit" aria-hidden="true"><span>✳</span></span><span className="demo-pill">DEMO</span></div>
            <p className="section-kicker">A THOUGHTFUL PLACE TO START</p><h2 id="assistant-feature-title">A little help finding the words.</h2>
            <p className="assistant-feature-copy">Prepare for an appointment, organize health notes, or explore general health-record terminology.</p>
            <Link className="assistant-feature-link" href="/assistant">Visit your assistant <span aria-hidden="true">↗</span></Link>
            <p className="assistant-disclaimer">Demo responses only. The assistant does not access your records, diagnose, or prescribe.</p>
          </section>
        </div>
        <p className="dashboard-footnote">Your saved entries remain in this browser. Mediora is an organizational tool, not a medical service.</p>
      </div>
    </main>
  );
}
