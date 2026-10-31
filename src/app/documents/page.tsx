
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type MedicalDocument = {
  id: string;
  name: string;
  category: string;
  date: string;
  notes: string;
  fileName: string;
  fileType: string;
  fileSize: number;
};

type DocumentRow = {
  id: string;
  title: string;
  category: string;
  document_date: string;
  notes: string | null;
  file_name: string;
  file_type: string;
  file_size: number | null;
};

const categories = [
  "Lab Report",
  "Prescription",
  "Imaging / Scan",
  "Discharge Summary",
  "Consultation Notes",
  "Vaccination Record",
  "Other",
];

function today() {
  const date = new Date();
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function mapRow(row: DocumentRow): MedicalDocument {
  return {
    id: row.id,
    name: row.title,
    category: row.category,
    date: row.document_date,
    notes: row.notes ?? "",
    fileName: row.file_name,
    fileType: row.file_type,
    fileSize: Number(row.file_size) || 0,
  };
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<MedicalDocument[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState(categories[0]);
  const [date, setDate] = useState(today());
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All categories");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadDocuments() {
      setLoaded(false);
      setError("");

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;
        if (!user) {
          setError("Please sign in to view your medical documents.");
          return;
        }

        const { data, error: fetchError } = await supabase
          .from("medical_documents")
          .select(
            "id, title, category, document_date, notes, file_name, file_type, file_size"
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (fetchError) throw fetchError;

        setDocuments(((data ?? []) as DocumentRow[]).map(mapRow));
      } catch (err) {
        console.error("Could not load documents:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Could not load documents from Supabase."
        );
      } finally {
        setLoaded(true);
      }
    }

    void loadDocuments();
  }, []);

  function resetForm() {
    setName("");
    setCategory(categories[0]);
    setDate(today());
    setNotes("");
    setFile(null);
    setEditingId(null);
    setError("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function submitDocument(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    setError("");

    if (!editingId && !file) {
      setError("Please choose a file to attach to this document.");
      return;
    }

    if (file && file.size > 10 * 1024 * 1024) {
      setError("The file is too large. Choose a file under 10 MB.");
      return;
    }

    if (
      file &&
      !["application/pdf", "image/jpeg", "image/png"].includes(file.type)
    ) {
      setError("Please select a PDF, JPG or PNG file.");
      return;
    }

    const existing = documents.find((item) => item.id === editingId);

    if (editingId && !existing) {
      setError("This document could not be found. Refresh and try again.");
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
        setError("Please sign in before saving a document.");
        return;
      }

      const payload = {
        title: name.trim(),
        category,
        document_date: date,
        notes: notes.trim(),
        file_name: file?.name ?? existing?.fileName ?? "",
        file_type: file?.type ?? existing?.fileType ?? "",
        file_size: file?.size ?? existing?.fileSize ?? 0,
      };

      if (editingId) {
        const { data, error: updateError } = await supabase
          .from("medical_documents")
          .update(payload)
          .eq("id", editingId)
          .eq("user_id", user.id)
          .select(
            "id, title, category, document_date, notes, file_name, file_type, file_size"
          )
          .single();

        if (updateError) throw updateError;

        const updated = mapRow(data as DocumentRow);
        setDocuments((current) =>
          current.map((item) => (item.id === editingId ? updated : item))
        );
      } else {
        const { data, error: insertError } = await supabase
          .from("medical_documents")
          .insert({ ...payload, user_id: user.id })
          .select(
            "id, title, category, document_date, notes, file_name, file_type, file_size"
          )
          .single();

        if (insertError) throw insertError;

        setDocuments((current) => [mapRow(data as DocumentRow), ...current]);
      }

      resetForm();
    } catch (err: unknown) {
      console.error("Could not save document:", err);

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

  function editDocument(documentEntry: MedicalDocument) {
    setEditingId(documentEntry.id);
    setName(documentEntry.name);
    setCategory(documentEntry.category);
    setDate(documentEntry.date);
    setNotes(documentEntry.notes);
    setFile(null);
    setError("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteDocument(id: string) {
    if (
      !window.confirm(
        "Remove this document entry from Mediora? The original file is not stored by this page."
      )
    ) {
      return;
    }

    setError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        setError("Please sign in before deleting a document.");
        return;
      }

      const { error: deleteError } = await supabase
        .from("medical_documents")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (deleteError) throw deleteError;

      setDocuments((current) => current.filter((item) => item.id !== id));

      if (editingId === id) resetForm();
    } catch (err) {
      console.error("Could not delete document:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Could not delete the document. Please try again."
      );
    }
  }

  const filteredDocuments = documents.filter((documentEntry) => {
    const matchesSearch = [
      documentEntry.name,
      documentEntry.category,
      documentEntry.fileName,
      documentEntry.notes,
    ]
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase());

    return (
      matchesSearch &&
      (filter === "All categories" || documentEntry.category === filter)
    );
  });

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
            Medical Documents
          </h1>
          <p className="mt-3 text-lg text-slate-500">
            Keep your reports, prescriptions and medical records organized.
          </p>
        </header>

        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          {[
            { label: "Total documents", value: documents.length, icon: "▧" },
            {
              label: "Categories used",
              value: new Set(documents.map((item) => item.category)).size,
              icon: "▤",
            },
            {
              label: "PDF documents",
              value: documents.filter(
                (item) => item.fileType === "application/pdf"
              ).length,
              icon: "▣",
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
            {editingId ? "Edit document details" : "Add a medical document"}
          </h2>

          <form onSubmit={submitDocument} className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <label className="text-sm font-medium">
                Document name *
                <input
                  className={inputClass}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. Blood test report"
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
                Document date *
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
                Attach file {!editingId && "*"}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                  className={`${inputClass} file:mr-3 file:rounded-lg file:border-0 file:bg-violet-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-violet-700`}
                  onChange={(event) => {
                    setFile(event.target.files?.[0] ?? null);
                    setError("");
                  }}
                  required={!editingId}
                />
                <span className="mt-1 block text-xs font-normal text-slate-400">
                  PDF, JPG or PNG · Maximum 10 MB
                  {editingId
                    ? " · Leave empty to keep the existing file details"
                    : ""}
                </span>
              </label>
            </div>

            <label className="block text-sm font-medium">
              Notes
              <textarea
                className={inputClass}
                rows={3}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Optional description or context..."
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
                className="rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-200 hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Save changes"
                    : "Add document"}
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
              <h2 className="text-2xl font-bold">Your documents</h2>
              <p className="mt-1 text-sm text-slate-500">
                Search and organize your saved document entries.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-violet-500"
                placeholder="Search documents..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Search documents"
              />

              <select
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-violet-500"
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                aria-label="Filter by category"
              >
                <option>All categories</option>
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
              Loading document entries...
            </p>
          ) : filteredDocuments.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 px-5 py-12 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-2xl text-violet-600">
                ▧
              </div>
              <h3 className="font-semibold">
                {search || filter !== "All categories"
                  ? "No matching documents"
                  : "Your document library starts here"}
              </h3>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
                Add a document using the form above to organize its details here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredDocuments.map((item) => (
                <article
                  key={item.id}
                  className="rounded-xl border border-slate-200 p-5 transition hover:border-violet-200"
                >
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div className="flex min-w-0 gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-xl text-violet-600">
                        {item.fileType === "application/pdf" ? "▣" : "▧"}
                      </div>

                      <div className="min-w-0">
                        <h3 className="break-words text-lg font-bold">
                          {item.name}
                        </h3>

                        <span className="mt-2 inline-block rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">
                          {item.category}
                        </span>

                        <p className="mt-2 break-all text-sm text-slate-600">
                          {item.fileName}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          Date: {item.date}
                          {item.fileSize > 0
                            ? ` · ${formatSize(item.fileSize)}`
                            : ""}
                        </p>

                        {item.notes && (
                          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                            {item.notes}
                          </p>
                        )}

                        <p className="mt-3 text-xs leading-5 text-amber-700">
                          File details only: the selected file itself has not
                          been uploaded to Supabase.
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => editDocument(item)}
                        className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-violet-50 hover:text-violet-700"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => void deleteDocument(item.id)}
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
          Mediora prototype · Document metadata is saved in Supabase. Actual
          file uploads and secure file access will be implemented separately.
        </p>
      </div>
    </main>
  );
}
