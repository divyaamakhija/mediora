
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Severity = "Mild" | "Moderate" | "Severe";

type Symptom = {
  id: string;
  name: string;
  severity: Severity;
  date: string;
  notes: string;
};

type SymptomRow = {
  id: string;
  symptom: string;
  severity: Severity;
  recorded_on: string;
  notes: string | null;
};

const STORAGE_KEY = "mediora-symptom-journal";

function formatEntryDate(value: string) {
  const parsed = new Date(`${value}T12:00:00`);

  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
}

function mapRow(row: SymptomRow): Symptom {
  return {
    id: row.id,
    name: row.symptom,
    severity: row.severity,
    date: row.recorded_on,
    notes: row.notes ?? "",
  };
}

function getToday() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

export default function JournalPage() {
  const [entries, setEntries] = useState<Symptom[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [severity, setSeverity] = useState<Severity>("Mild");
  const [date, setDate] = useState(getToday);
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");

  const loadEntries = useCallback(async () => {
    setLoaded(false);
    setMessage("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        setEntries([]);
        setMessage("Please sign in to view your symptom journal.");
        return;
      }

      const { data, error } = await supabase
        .from("symptom_logs")
        .select("id, symptom, severity, recorded_on, notes")
        .order("recorded_on", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;

      let rows = (data ?? []) as SymptomRow[];

      // One-time import of existing browser entries, but only when
      // this account's database journal is empty.
      if (rows.length === 0) {
        let localEntries: Symptom[] = [];

        try {
          const saved = localStorage.getItem(STORAGE_KEY);
          if (saved) {
            const parsed: unknown = JSON.parse(saved);

            if (Array.isArray(parsed)) {
              localEntries = parsed.filter(
                (entry): entry is Symptom =>
                  entry !== null &&
                  typeof entry === "object" &&
                  typeof entry.name === "string" &&
                  typeof entry.date === "string" &&
                  ["Mild", "Moderate", "Severe"].includes(entry.severity) &&
                  typeof entry.notes === "string"
              );
            }
          }
        } catch {
          // Ignore invalid old browser data.
        }

        if (localEntries.length > 0) {
          const { error: importError } = await supabase
            .from("symptom_logs")
            .insert(
              localEntries.map((entry) => ({
                user_id: user.id,
                symptom: entry.name.trim(),
                severity: entry.severity,
                recorded_on: entry.date,
                notes: entry.notes,
              }))
            );

          if (importError) {
            throw new Error(
              `Your old entries could not be imported: ${importError.message}`
            );
          }

          const { data: imported, error: reloadError } = await supabase
            .from("symptom_logs")
            .select("id, symptom, severity, recorded_on, notes")
            .order("recorded_on", { ascending: false })
            .order("created_at", { ascending: false });

          if (reloadError) throw reloadError;

          rows = (imported ?? []) as SymptomRow[];
          localStorage.removeItem(STORAGE_KEY);
          setMessage("Your existing symptom entries were imported.");
        }
      }

      setEntries(rows.map(mapRow));
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not load your symptom journal."
      );
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  function resetForm() {
    setName("");
    setSeverity("Mild");
    setDate(getToday());
    setNotes("");
    setEditingId(null);
  }

  async function saveEntry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanName = name.trim();

    if (!cleanName || !date) return;

    setSaving(true);
    setMessage("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        setMessage("Your session has expired. Please sign in again.");
        return;
      }

      if (editingId) {
        const { error } = await supabase
          .from("symptom_logs")
          .update({
            symptom: cleanName,
            severity,
            recorded_on: date,
            notes: notes.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingId)
          .eq("user_id", user.id);

        if (error) throw error;
        setMessage("Symptom entry updated.");
      } else {
        const { error } = await supabase.from("symptom_logs").insert({
          user_id: user.id,
          symptom: cleanName,
          severity,
          recorded_on: date,
          notes: notes.trim() || null,
        });

        if (error) throw error;
        setMessage("Symptom entry saved to your journal.");
      }

      resetForm();
      await loadEntries();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not save your symptom entry."
      );
    } finally {
      setSaving(false);
    }
  }

  function editEntry(entry: Symptom) {
    setEditingId(entry.id);
    setName(entry.name);
    setSeverity(entry.severity);
    setDate(entry.date);
    setNotes(entry.notes);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteEntry(id: string) {
    if (!window.confirm("Delete this symptom entry?")) return;

    setMessage("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        setMessage("Please sign in again to delete this entry.");
        return;
      }

      const { error } = await supabase
        .from("symptom_logs")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;

      if (editingId === id) resetForm();

      setMessage("Symptom entry deleted.");
      await loadEntries();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not delete the symptom entry."
      );
    }
  }

  const filteredEntries = entries.filter((entry) => {
    const term = search.toLowerCase();

    const matchesSearch =
      entry.name.toLowerCase().includes(term) ||
      entry.notes.toLowerCase().includes(term);

    return matchesSearch &&
      (filter === "All" || entry.severity === filter);
  });

  const severityStyle: Record<Severity, string> = {
    Mild: "bg-emerald-50 text-emerald-700",
    Moderate: "bg-amber-50 text-amber-700",
    Severe: "bg-rose-50 text-rose-700",
  };

  return (
    <main className="min-h-screen bg-[#f7f8fc] px-5 py-8 text-slate-800 md:px-10">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/"
          className="text-sm font-medium text-violet-700 hover:underline"
        >
          ← Back to dashboard
        </Link>

        <header className="mb-8 mt-6">
          <p className="text-sm font-medium text-violet-600">
            MEDIORA / PERSONAL HEALTH
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
            My Journal
          </h1>
          <p className="mt-3 text-slate-500">
            Record and review your symptoms in one organized place.
          </p>
        </header>

        <section className="mb-8 grid gap-4 sm:grid-cols-3">
          {[
            {
              label: "Total entries",
              value: entries.length,
              icon: "◷",
              tone: "journal",
            },
            {
              label: "Moderate entries",
              value: entries.filter((e) => e.severity === "Moderate").length,
              icon: "•",
              tone: "moderate",
            },
            {
              label: "Severe entries",
              value: entries.filter((e) => e.severity === "Severe").length,
              icon: "!",
              tone: "severe",
            },
          ].map((item) => (
            <article
              key={item.label}
              className={`journal-stat journal-stat-${item.tone} rounded-2xl border border-slate-200 bg-white p-5 shadow-sm`}
            >
              <div className="journal-stat-heading">
                <span className="journal-stat-icon" aria-hidden="true">
                  {item.icon}
                </span>
                <p className="text-sm text-slate-500">{item.label}</p>
              </div>
              <p className="journal-stat-value mt-3 text-3xl font-bold">
                {loaded ? item.value : "—"}
              </p>
            </article>
          ))}
        </section>

        <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-bold">
            {editingId ? "Edit symptom entry" : "Add a symptom"}
          </h2>

          <form onSubmit={saveEntry} className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <label className="block text-sm font-medium">
                Symptom *
                <input
                  required
                  maxLength={100}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Headache"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                />
              </label>

              <label className="block text-sm font-medium">
                Date *
                <input
                  type="date"
                  required
                  value={date}
                  max={getToday()}
                  onChange={(e) => setDate(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                />
              </label>

              <label className="block text-sm font-medium">
                Severity *
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as Severity)}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-normal outline-none focus:border-violet-500"
                >
                  <option>Mild</option>
                  <option>Moderate</option>
                  <option>Severe</option>
                </select>
              </label>

              <label className="block text-sm font-medium">
                Notes
                <textarea
                  maxLength={1000}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional details, duration or context..."
                  rows={3}
                  className="mt-2 w-full resize-y rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-violet-500"
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving || !loaded}
                className="rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Save changes"
                    : "Add symptom"}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl border border-slate-200 px-6 py-3 text-sm font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>

        {message && (
          <div
            role="status"
            aria-live="polite"
            className="mb-6 rounded-xl border border-violet-100 bg-violet-50 p-4 text-sm text-violet-900"
          >
            {message}
          </div>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">Symptom history</h2>
              <p className="mt-1 text-sm text-slate-500">
                {filteredEntries.length} matching entries
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search entries..."
                aria-label="Search symptom entries"
                className="min-w-0 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-violet-500"
              />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                aria-label="Filter symptoms by severity"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <option>All</option>
                <option>Mild</option>
                <option>Moderate</option>
                <option>Severe</option>
              </select>
            </div>
          </div>

          {!loaded ? (
            <p className="py-10 text-center text-slate-500">
              Loading journal...
            </p>
          ) : filteredEntries.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 px-5 py-12 text-center">
              <p className="text-lg font-semibold">No symptom entries yet</p>
              <p className="mt-2 text-sm text-slate-500">
                Add an entry above to begin your timeline.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEntries.map((entry) => (
                <article
                  key={entry.id}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{entry.name}</h3>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${severityStyle[entry.severity]}`}
                        >
                          {entry.severity}
                        </span>
                      </div>

                      <time
                        className="journal-entry-date mt-2 block text-sm text-slate-500"
                        dateTime={entry.date}
                      >
                        {formatEntryDate(entry.date)}
                      </time>

                      {entry.notes && (
                        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                          {entry.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => editEntry(entry)}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-violet-50"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteEntry(entry.id)}
                        className="rounded-lg border border-rose-100 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <p className="mt-6 text-center text-xs leading-5 text-slate-400">
          Your symptom entries are stored in your Mediora Supabase account.
          This prototype still needs a complete security review before use with
          real medical information.
        </p>
      </div>
    </main>
  );
}
