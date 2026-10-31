
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Reminder = {
  id: string;
  title: string;
  category: string;
  date: string;
  time: string;
  notes: string;
  isCompleted: boolean;
};

type ReminderRow = {
  id: string;
  title: string;
  category: string;
  reminder_date: string | null;
  reminder_time: string | null;
  notes: string | null;
  is_completed: boolean;
};

const categories = [
  "Medication",
  "Doctor Appointment",
  "Health Check",
  "Follow-up",
  "Other",
];

function today() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function currentTime() {
  const date = new Date();
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function formatDate(dateString: string) {
  if (!dateString) return "Date not set";

  return new Date(`${dateString}T12:00:00`).toLocaleDateString(
    undefined,
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  );
}

function mapRow(row: ReminderRow): Reminder {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    date: row.reminder_date ?? "",
    time: row.reminder_time?.slice(0, 5) ?? "",
    notes: row.notes ?? "",
    isCompleted: row.is_completed,
  };
}

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(categories[0]);
  const [date, setDate] = useState(today());
  const [time, setTime] = useState(currentTime());
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadReminders() {
      setLoaded(false);
      setError("");

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;

        if (!user) {
          setError("Please sign in to view your reminders.");
          return;
        }

        const { data, error: fetchError } = await supabase
          .from("reminders")
          .select(
            "id, title, category, reminder_date, reminder_time, notes, is_completed"
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (fetchError) throw fetchError;

        setReminders(((data ?? []) as ReminderRow[]).map(mapRow));
      } catch (err) {
        console.error("Could not load reminders:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Could not load reminders from Supabase."
        );
      } finally {
        setLoaded(true);
      }
    }

    void loadReminders();
  }, []);

  function resetForm() {
    setTitle("");
    setCategory(categories[0]);
    setDate(today());
    setTime(currentTime());
    setNotes("");
    setEditingId(null);
    setError("");
  }

  async function submitReminder(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (saving) return;

    setError("");

    if (!title.trim()) {
      setError("Please enter a reminder title.");
      return;
    }

    if (!date || !time) {
      setError("Please select a date and time.");
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
        setError("Please sign in before saving a reminder.");
        return;
      }

      const payload = {
        title: title.trim(),
        category,
        reminder_date: date,
        reminder_time: time,
        notes: notes.trim(),
      };

      if (editingId) {
        const { data, error: updateError } = await supabase
          .from("reminders")
          .update(payload)
          .eq("id", editingId)
          .eq("user_id", user.id)
          .select(
            "id, title, category, reminder_date, reminder_time, notes, is_completed"
          )
          .single();

        if (updateError) throw updateError;

        const updated = mapRow(data as ReminderRow);

        setReminders((current) =>
          current.map((item) =>
            item.id === editingId ? updated : item
          )
        );
      } else {
        const { data, error: insertError } = await supabase
          .from("reminders")
          .insert({
            ...payload,
            user_id: user.id,
          })
          .select(
            "id, title, category, reminder_date, reminder_time, notes, is_completed"
          )
          .single();

        if (insertError) throw insertError;

        setReminders((current) => [
          mapRow(data as ReminderRow),
          ...current,
        ]);
      }

      resetForm();
    } catch (err: unknown) {
      console.error("Could not save reminder:", err);

      const dbError = err as {
        message?: string;
        details?: string;
        hint?: string;
        code?: string;
      };

      setError(
        [
          dbError.message ?? "Unknown database error",
          dbError.details,
          dbError.hint,
          dbError.code ? `Code: ${dbError.code}` : undefined,
        ]
          .filter(Boolean)
          .join(" — ")
      );
    } finally {
      setSaving(false);
    }
  }

  function editReminder(reminder: Reminder) {
    setEditingId(reminder.id);
    setTitle(reminder.title);
    setCategory(reminder.category);
    setDate(reminder.date || today());
    setTime(reminder.time || currentTime());
    setNotes(reminder.notes);
    setError("");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteReminder(id: string) {
    if (!window.confirm("Delete this reminder?")) return;

    setError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        setError("Please sign in before deleting a reminder.");
        return;
      }

      const { error: deleteError } = await supabase
        .from("reminders")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (deleteError) throw deleteError;

      setReminders((current) =>
        current.filter((item) => item.id !== id)
      );

      if (editingId === id) resetForm();
    } catch (err) {
      console.error("Could not delete reminder:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Could not delete the reminder."
      );
    }
  }

  const filteredReminders = reminders
    .filter((reminder) => {
      const matchesSearch = [
        reminder.title,
        reminder.category,
        reminder.notes,
      ]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesFilter =
        filter === "All" || reminder.category === filter;

      return matchesSearch && matchesFilter;
    })
    .sort((a, b) =>
      `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)
    );

  const now = new Date();

  const upcomingCount = reminders.filter((reminder) => {
    if (reminder.isCompleted || !reminder.date || !reminder.time) {
      return false;
    }

    return new Date(`${reminder.date}T${reminder.time}:00`) >= now;
  }).length;

  const todayCount = reminders.filter(
    (reminder) => reminder.date === today()
  ).length;

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
            Reminders
          </h1>
          <p className="mt-3 text-lg text-slate-500">
            Keep track of appointments, medication schedules and health follow-ups.
          </p>
        </header>

        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          {[
            { label: "Total reminders", value: reminders.length, icon: "◷" },
            { label: "Upcoming", value: upcomingCount, icon: "↗" },
            { label: "Scheduled today", value: todayCount, icon: "♡" },
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
            {editingId ? "Edit reminder" : "Create a reminder"}
          </h2>

          <form onSubmit={submitReminder} className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <label className="text-sm font-medium">
                Reminder title *
                <input
                  className={inputClass}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="e.g. Doctor appointment"
                  maxLength={120}
                  required
                />
              </label>

              <label className="text-sm font-medium">
                Category *
                <select
                  className={inputClass}
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  required
                >
                  {categories.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-medium">
                Date *
                <input
                  type="date"
                  className={inputClass}
                  value={date}
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
                placeholder="Additional details..."
                maxLength={500}
              />
            </label>

            {error && (
              <p
                role="alert"
                className="break-words text-sm font-medium text-red-600"
              >
                {error}
              </p>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-200 hover:bg-violet-700 disabled:opacity-60"
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Save changes"
                    : "Add reminder"}
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

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <h2 className="text-2xl font-bold">Your schedule</h2>
              <p className="mt-1 text-sm text-slate-500">
                Review and manage your saved reminders.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-violet-500"
                placeholder="Search reminders..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Search reminders"
              />

              <select
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-violet-500"
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                aria-label="Filter reminders by category"
              >
                <option>All</option>
                {categories.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <p
              role="alert"
              className="mb-4 break-words text-sm font-medium text-red-600"
            >
              {error}
            </p>
          )}

          {!loaded ? (
            <p className="py-10 text-center text-sm text-slate-500">
              Loading reminders...
            </p>
          ) : filteredReminders.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 px-5 py-12 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-2xl text-violet-600">
                ◷
              </div>
              <h3 className="font-semibold">
                {search || filter !== "All"
                  ? "No matching reminders"
                  : "Your schedule starts here"}
              </h3>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
                Add a reminder above to start organizing your schedule.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredReminders.map((reminder) => {
                const scheduled =
                  reminder.date && reminder.time
                    ? new Date(`${reminder.date}T${reminder.time}:00`)
                    : null;

                const isUpcoming =
                  !reminder.isCompleted &&
                  scheduled !== null &&
                  scheduled >= new Date();

                return (
                  <article
                    key={reminder.id}
                    className="rounded-xl border border-slate-200 p-5 transition hover:border-violet-200"
                  >
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                      <div className="flex min-w-0 gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-xl text-violet-600">
                          ◷
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="break-words text-lg font-bold">
                              {reminder.title}
                            </h3>
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-medium ${
                                reminder.isCompleted
                                  ? "bg-blue-50 text-blue-700"
                                  : isUpcoming
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {reminder.isCompleted
                                ? "Completed"
                                : isUpcoming
                                  ? "Upcoming"
                                  : "Past"}
                            </span>
                          </div>

                          <span className="mt-2 inline-block rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">
                            {reminder.category}
                          </span>

                          <p className="mt-3 text-sm text-slate-600">
                            {formatDate(reminder.date)} · {reminder.time || "Time not set"}
                          </p>

                          {reminder.notes && (
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-500">
                              {reminder.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          onClick={() => editReminder(reminder)}
                          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-violet-50 hover:text-violet-700"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => void deleteReminder(reminder.id)}
                          className="rounded-lg border border-red-100 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <p className="mt-6 text-center text-xs leading-5 text-slate-400">
          Mediora prototype · Reminder schedules are saved in Supabase.
          This page does not send automatic notifications or medication alerts.
          Always follow instructions from your healthcare professional.
        </p>
      </div>
    </main>
  );
}
