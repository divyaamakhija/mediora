
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Medication = {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  reminder_time: string | null;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
};

const inputStyle =
  "mt-1 w-full rounded-xl border border-[#e6ddd5] bg-white px-4 py-3 text-[#403443] outline-none focus:border-[#8b7898]";

export default function MedicationsPage() {
  const [items, setItems] = useState<Medication[]>([]);
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState("Once a day");
  const [time, setTime] = useState("09:00");
  const [startDate, setStartDate] = useState(
    new Date().toLocaleDateString("en-CA")
  );
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("medications")
        .select(
          "id, name, dosage, frequency, reminder_time, start_date, end_date, notes"
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      setItems((data ?? []) as Medication[]);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not load medications."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  function resetForm() {
    setName("");
    setDosage("");
    setFrequency("Once a day");
    setTime("09:00");
    setStartDate(new Date().toLocaleDateString("en-CA"));
    setEndDate("");
    setNotes("");
    setEditingId(null);
  }

  async function saveMedication(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) throw new Error("Please sign in again.");

      const values = {
        name: name.trim(),
        dosage: dosage.trim(),
        frequency,
        reminder_time: time || null,
        start_date: startDate || null,
        end_date: endDate || null,
        notes: notes.trim(),
      };

      if (editingId) {
        const { error } = await supabase
          .from("medications")
          .update(values)
          .eq("id", editingId)
          .eq("user_id", user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("medications")
          .insert({ ...values, user_id: user.id });

        if (error) throw error;
      }

      resetForm();
      setMessage(editingId ? "Medication updated." : "Medication saved.");
      await loadItems();
    } catch (error) {
      setMessage(
        `Could not save medication: ${
          error instanceof Error ? error.message : JSON.stringify(error)
        }`
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteMedication(id: string) {
    if (!window.confirm("Delete this medication?")) return;

    setMessage("");

    try {
      const { data: { user }, error: authError } =
        await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) throw new Error("Please sign in again.");

      const { error } = await supabase
        .from("medications")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;

      if (editingId === id) resetForm();
      setMessage("Medication deleted.");
      await loadItems();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not delete medication."
      );
    }
  }

  function editMedication(item: Medication) {
    setEditingId(item.id);
    setName(item.name);
    setDosage(item.dosage);
    setFrequency(item.frequency);
    setTime(item.reminder_time?.slice(0, 5) ?? "");
    setStartDate(item.start_date ?? "");
    setEndDate(item.end_date ?? "");
    setNotes(item.notes ?? "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const filtered = items.filter((item) =>
    item.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <main className="min-h-screen bg-[#fbf8f3] px-5 py-8 text-[#403443] md:px-10">
      <div className="mx-auto max-w-5xl">
        <Link href="/" className="text-sm text-[#81708e] hover:underline">
          ← Back to dashboard
        </Link>

        <header className="mb-8 mt-7">
          <p className="text-sm font-semibold tracking-widest text-[#9481b8]">
            MEDIORA / PERSONAL HEALTH
          </p>
          <h1 className="mt-3 font-serif text-4xl">Medication tracker</h1>
          <p className="mt-3 text-[#817984]">
            Keep your medication details organized in one place.
          </p>
        </header>

        <section className="mb-7 rounded-2xl border border-[#e9e0d8] bg-white p-6">
          <h2 className="mb-5 font-serif text-2xl">
            {editingId ? "Edit medication" : "Add a medication"}
          </h2>

          <form onSubmit={saveMedication} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm font-medium">
                Medication name *
                <input
                  className={inputStyle}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={100}
                  placeholder="e.g. Test medication"
                />
              </label>

              <label className="text-sm font-medium">
                Dosage *
                <input
                  className={inputStyle}
                  value={dosage}
                  onChange={(e) => setDosage(e.target.value)}
                  required
                  maxLength={80}
                  placeholder="e.g. 500 mg"
                />
              </label>

              <label className="text-sm font-medium">
                Frequency *
                <select
                  className={inputStyle}
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                >
                  <option>Once a day</option>
                  <option>Twice a day</option>
                  <option>Three times a day</option>
                  <option>Every 4 hours</option>
                  <option>Every 6 hours</option>
                  <option>Every 8 hours</option>
                  <option>Every 12 hours</option>
                  <option>As needed</option>
                  <option>Other / custom</option>
                </select>
              </label>

              <label className="text-sm font-medium">
                Reminder time
                <input
                  type="time"
                  className={inputStyle}
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </label>

              <label className="text-sm font-medium">
                Start date *
                <input
                  type="date"
                  className={inputStyle}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </label>

              <label className="text-sm font-medium">
                End date
                <input
                  type="date"
                  className={inputStyle}
                  value={endDate}
                  min={startDate || undefined}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </label>
            </div>

            <label className="block text-sm font-medium">
              Notes
              <textarea
                className={inputStyle}
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={500}
                placeholder="Optional notes..."
              />
            </label>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving || loading}
                className="rounded-xl bg-[#81708e] px-6 py-3 font-semibold text-white hover:bg-[#6e5b7c] disabled:opacity-60"
              >
                {saving ? "Saving..." : editingId ? "Save changes" : "Add medication"}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl border border-[#e6ddd5] px-5 py-3"
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
            className="mb-6 break-words rounded-xl border border-[#e6dcec] bg-[#f2edf7] p-4 text-sm"
          >
            {message}
          </div>
        )}

        <section className="rounded-2xl border border-[#e9e0d8] bg-white p-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-serif text-2xl">Your medications</h2>
              <p className="mt-2 text-sm text-[#817984]">
                {filtered.length} medication{filtered.length === 1 ? "" : "s"}
              </p>
            </div>

            <input
              aria-label="Search medications"
              className="w-full rounded-xl border border-[#e6ddd5] px-4 py-3 sm:max-w-xs"
              placeholder="Search medications..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {loading ? (
            <p className="py-8 text-center text-[#817984]">
              Loading medications...
            </p>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#e6ddd5] p-10 text-center">
              <p className="font-serif text-xl">
                {search ? "No matching medications" : "No medications added yet"}
              </p>
              <p className="mt-2 text-sm text-[#817984]">
                Add a medication using the form above.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((item) => (
                <article
                  key={item.id}
                  className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-[#eee5dd] p-5"
                >
                  <div className="min-w-0">
                    <h3 className="font-semibold">{item.name}</h3>
                    <p className="mt-1 text-sm text-[#817984]">
                      {item.dosage} · {item.frequency}
                    </p>
                    <p className="mt-1 text-sm text-[#817984]">
                      Reminder: {item.reminder_time || "Not set"}
                    </p>
                    <p className="mt-1 text-xs text-[#9a909b]">
                      Start: {item.start_date || "Not set"}
                      {item.end_date ? ` · End: ${item.end_date}` : ""}
                    </p>
                    {item.notes && (
                      <p className="mt-2 whitespace-pre-wrap text-sm">
                        {item.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => editMedication(item)}
                      className="rounded-lg border border-[#e6ddd5] px-4 py-2 text-sm hover:bg-[#f8f4fa]"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteMedication(item.id)}
                      className="rounded-lg border border-red-100 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <p className="mt-5 text-center text-xs text-[#9a909b]">
          Reminder times are saved as information; notifications are not enabled yet.
        </p>
      </div>
    </main>
  );
}
