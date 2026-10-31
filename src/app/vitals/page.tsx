
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Vital = {
  id: string;
  type: string;
  value: string;
  unit: string;
  date: string;
  time: string;
  notes: string;
};

type VitalRow = {
  id: string;
  measurement_type: string;
  value: string;
  unit: string;
  recorded_at: string;
  notes: string | null;
};

const vitalTypes = [
  { name: "Blood pressure", unit: "mmHg", placeholder: "e.g. 120/80" },
  { name: "Heart rate", unit: "bpm", placeholder: "e.g. 72" },
  { name: "Temperature", unit: "°C", placeholder: "e.g. 36.8" },
  { name: "Oxygen saturation", unit: "%", placeholder: "e.g. 98" },
  { name: "Weight", unit: "kg", placeholder: "e.g. 65.5" },
  { name: "Blood glucose", unit: "mg/dL", placeholder: "e.g. 95" },
];

function today() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function currentTime() {
  const date = new Date();
  return `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes()
  ).padStart(2, "0")}`;
}

function mapRow(row: VitalRow): Vital {
  const recorded = new Date(row.recorded_at);

  const date = `${recorded.getFullYear()}-${String(
    recorded.getMonth() + 1
  ).padStart(2, "0")}-${String(recorded.getDate()).padStart(2, "0")}`;

  const time = `${String(recorded.getHours()).padStart(2, "0")}:${String(
    recorded.getMinutes()
  ).padStart(2, "0")}`;

  return {
    id: row.id,
    type: row.measurement_type,
    value: String(row.value),
    unit: row.unit,
    date,
    time,
    notes: row.notes ?? "",
  };
}

export default function VitalsPage() {
  const [entries, setEntries] = useState<Vital[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [type, setType] = useState(vitalTypes[0].name);
  const [value, setValue] = useState("");
  const [date, setDate] = useState(today());
  const [time, setTime] = useState(currentTime());
  const [notes, setNotes] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedType =
    vitalTypes.find((item) => item.name === type) ?? vitalTypes[0];

  useEffect(() => {
    async function loadEntries() {
      setLoaded(false);
      setError("");

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;

        if (!user) {
          setError("Please sign in to view your vital signs.");
          return;
        }

        const { data, error: fetchError } = await supabase
          .from("vital_signs")
          .select("id, measurement_type, value, unit, recorded_at, notes")
          .eq("user_id", user.id)
          .order("recorded_at", { ascending: false });

        if (fetchError) throw fetchError;

        setEntries(((data ?? []) as VitalRow[]).map(mapRow));
      } catch (err) {
        console.error("Could not load vital signs:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Could not load measurements from Supabase."
        );
      } finally {
        setLoaded(true);
      }
    }

    void loadEntries();
  }, []);

  function resetForm() {
    setType(vitalTypes[0].name);
    setValue("");
    setDate(today());
    setTime(currentTime());
    setNotes("");
    setEditingId(null);
    setError("");
  }

  async function submitEntry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    setError("");

    const cleanedValue = value.trim();

    if (!cleanedValue) {
      setError("Please enter a measurement.");
      return;
    }

    if (type === "Blood pressure") {
      if (!/^\d{2,3}\s*\/\s*\d{2,3}$/.test(cleanedValue)) {
        setError("Enter blood pressure as two numbers, for example 120/80.");
        return;
      }
    } else {
      const number = Number(cleanedValue);
      if (!Number.isFinite(number) || number <= 0) {
        setError("Enter a valid positive measurement.");
        return;
      }
    }

    const recordedDate = new Date(`${date}T${time}:00`);

    if (Number.isNaN(recordedDate.getTime())) {
      setError("Please enter a valid date and time.");
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        setError("Please sign in before saving a measurement.");
        return;
      }

      const payload = {
        measurement_type: type,
        value: cleanedValue,
        unit: selectedType.unit,
        recorded_at: recordedDate.toISOString(),
        notes: notes.trim(),
      };

      if (editingId) {
        const { data, error: updateError } = await supabase
          .from("vital_signs")
          .update(payload)
          .eq("id", editingId)
          .eq("user_id", user.id)
          .select("id, measurement_type, value, unit, recorded_at, notes")
          .single();

        if (updateError) throw updateError;

        const updatedEntry = mapRow(data as VitalRow);
        setEntries((current) =>
          current.map((item) =>
            item.id === editingId ? updatedEntry : item
          )
        );
      } else {
        const { data, error: insertError } = await supabase
          .from("vital_signs")
          .insert({ ...payload, user_id: user.id })
          .select("id, measurement_type, value, unit, recorded_at, notes")
          .single();

        if (insertError) throw insertError;

        setEntries((current) => [mapRow(data as VitalRow), ...current]);
      }

      resetForm();
    } catch (err) {
      console.error("Could not save vital sign:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Could not save the measurement. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  function editEntry(entry: Vital) {
    setType(entry.type);
    setValue(entry.value);
    setDate(entry.date);
    setTime(entry.time);
    setNotes(entry.notes);
    setEditingId(entry.id);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteEntry(id: string) {
    if (!window.confirm("Delete this vital sign entry?")) return;

    setError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        setError("Please sign in before deleting a measurement.");
        return;
      }

      const { error: deleteError } = await supabase
        .from("vital_signs")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (deleteError) throw deleteError;

      setEntries((current) => current.filter((item) => item.id !== id));

      if (editingId === id) resetForm();
    } catch (err) {
      console.error("Could not delete vital sign:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Could not delete the measurement. Please try again."
      );
    }
  }

  const filteredEntries = entries.filter((entry) =>
    `${entry.type} ${entry.value} ${entry.notes}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const latestByType = vitalTypes.map((item) => ({
    ...item,
    latest: entries
      .filter((entry) => entry.type === item.name)
      .sort((a, b) =>
        `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`)
      )[0],
  }));

  const inputClass =
    "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-100";

  return (
    <main className="min-h-screen bg-[#f7f8fc] px-5 py-8 text-slate-800 md:px-10">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/"
          className="text-sm font-medium text-violet-700 hover:text-violet-900"
        >
          ← Back to dashboard
        </Link>

        <header className="mb-8 mt-8">
          <p className="mb-3 text-sm font-medium uppercase tracking-widest text-violet-600">
            MEDIORA / PERSONAL HEALTH
          </p>
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
            Vital Signs
          </h1>
          <p className="mt-3 text-lg text-slate-500">
            Keep track of your measurements and review your recorded history.
          </p>
        </header>

        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          {[
            { label: "Total measurements", value: entries.length, icon: "⌁" },
            {
              label: "Measurement types",
              value: new Set(entries.map((entry) => entry.type)).size,
              icon: "◈",
            },
            {
              label: "Recorded today",
              value: entries.filter((entry) => entry.date === today()).length,
              icon: "◷",
            },
          ].map((stat) => (
            <article
              key={stat.label}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">{stat.label}</p>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-xl text-violet-600">
                  {stat.icon}
                </span>
              </div>
              <p className="mt-4 text-3xl font-bold">
                {loaded ? stat.value : "—"}
              </p>
            </article>
          ))}
        </div>

        <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <h2 className="mb-6 text-2xl font-bold">
            {editingId ? "Edit measurement" : "Record a measurement"}
          </h2>

          <form onSubmit={submitEntry} className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <label className="text-sm font-medium">
                Measurement type *
                <select
                  className={inputClass}
                  value={type}
                  onChange={(event) => {
                    setType(event.target.value);
                    setValue("");
                    setError("");
                  }}
                >
                  {vitalTypes.map((item) => (
                    <option key={item.name} value={item.name}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-medium">
                Value * ({selectedType.unit})
                <input
                  className={inputClass}
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                  placeholder={selectedType.placeholder}
                  required
                  maxLength={30}
                  inputMode="decimal"
                />
              </label>

              <label className="text-sm font-medium">
                Date *
                <input
                  type="date"
                  className={inputClass}
                  value={date}
                  max={today()}
                  onChange={(event) => setDate(event.target.value)}
                  required
                />
              </label>

              <label className="text-sm font-medium">
                Time *
                <input
                  type="time"
                  className={inputClass}
                  value={time}
                  onChange={(event) => setTime(event.target.value)}
                  required
                />
              </label>
            </div>

            <label className="block text-sm font-medium">
              Notes (optional)
              <textarea
                className={inputClass}
                rows={3}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Optional context for this measurement..."
                maxLength={500}
              />
            </label>

            {error && (
              <p role="alert" className="break-words text-sm font-medium text-red-600">
                {error}
              </p>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-200 hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Save changes"
                    : "Save measurement"}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <h2 className="mb-5 text-xl font-bold">
            Latest recorded measurements
          </h2>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {latestByType.map((item) => (
              <article
                key={item.name}
                className="rounded-xl border border-slate-200 p-4"
              >
                <p className="text-sm text-slate-500">{item.name}</p>
                {item.latest ? (
                  <>
                    <p className="mt-3 text-2xl font-bold">
                      {item.latest.value}{" "}
                      <span className="text-sm font-medium text-slate-500">
                        {item.unit}
                      </span>
                    </p>
                    <p className="mt-2 text-xs text-slate-400">
                      {item.latest.date} at {item.latest.time}
                    </p>
                  </>
                ) : (
                  <p className="mt-3 text-sm text-slate-400">
                    No measurement recorded
                  </p>
                )}
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-2xl font-bold">Measurement history</h2>
              <p className="mt-1 text-sm text-slate-500">
                Search, review, edit or remove your entries.
              </p>
            </div>
            <input
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-violet-500 sm:max-w-xs"
              placeholder="Search measurements..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search measurement history"
            />
          </div>

          {!loaded ? (
            <p className="py-10 text-center text-sm text-slate-500">
              Loading measurements...
            </p>
          ) : filteredEntries.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 px-5 py-12 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-2xl text-violet-600">
                ⌁
              </div>
              <h3 className="font-semibold">
                {search ? "No matching measurements" : "Your history starts here"}
              </h3>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
                {search
                  ? "Try another search term."
                  : "Save a measurement above to start building your history."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredEntries
                .slice()
                .sort((a, b) =>
                  `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`)
                )
                .map((entry) => (
                  <article
                    key={entry.id}
                    className="rounded-xl border border-slate-200 p-5 transition hover:border-violet-200"
                  >
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                      <div>
                        <p className="font-semibold">{entry.type}</p>
                        <p className="mt-2 text-2xl font-bold">
                          {entry.value}{" "}
                          <span className="text-sm font-medium text-slate-500">
                            {entry.unit}
                          </span>
                        </p>
                        <p className="mt-2 text-xs text-slate-400">
                          {entry.date} at {entry.time}
                        </p>
                        {entry.notes && (
                          <p className="mt-3 whitespace-pre-wrap text-sm text-slate-600">
                            {entry.notes}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => editEntry(entry)}
                          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-violet-50 hover:text-violet-700"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteEntry(entry.id)}
                          className="rounded-lg border border-red-100 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
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
          Mediora is an organizational tool, not a diagnostic system. Recorded
          values are not automatically interpreted as normal or abnormal.
          Measurements are saved to your Supabase account.
        </p>
      </div>
    </main>
  );
}
