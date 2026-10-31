
"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const suggestions = [
  {
    icon: "▤",
    title: "Organize my health history",
    prompt: "How can I organize my health history for a doctor visit?",
  },
  {
    icon: "✚",
    title: "Prepare for an appointment",
    prompt: "Help me prepare a checklist for my next doctor appointment.",
  },
  {
    icon: "♡",
    title: "Understand health records",
    prompt: "What information should I keep in a personal health journal?",
  },
  {
    icon: "◷",
    title: "Build a medication checklist",
    prompt: "Help me create a checklist for tracking prescribed medications.",
  },
];

function getDemoResponse(question: string) {
  const text = question.toLowerCase();

  if (text.includes("history") || text.includes("journal")) {
    return "A well-organized health journal can help you communicate clearly with your healthcare professional. Consider recording:\n\n• The date and time of symptoms or measurements\n• What you experienced and how long it lasted\n• Current medications and the instructions provided with them\n• Relevant test reports and appointment notes\n• Questions you want to discuss with your clinician\n\nMediora can help organize these records. Share them with your healthcare professional for interpretation.";
  }

  if (text.includes("appointment") || text.includes("doctor")) {
    return "Here's a useful appointment checklist:\n\n• List the concerns you want to discuss.\n• Bring your current medication list, including prescribed dosage instructions.\n• Organize relevant test reports and previous consultation notes.\n• Note when symptoms began and any changes you've observed.\n• Ask your clinician about follow-up steps and when to seek further care.\n\nYour healthcare professional can advise you based on your individual circumstances.";
  }

  if (text.includes("medication") || text.includes("medicine")) {
    return "You can use a medication checklist to keep your records organized:\n\n• Medication name as shown on the prescription\n• Prescribed dosage and frequency\n• Instructions provided by your clinician or pharmacist\n• Start and end dates, if specified\n• Questions, side effects, or concerns to discuss with your healthcare professional\n\nThis demo does not verify prescriptions or send reminders. Do not start, stop, or change medication based on this response.";
  }

  return "I can help you organize health information, prepare questions for a medical appointment, and understand general health-record terminology.\n\nTo make your records more useful, consider noting dates, relevant context, medications as prescribed, and questions for your healthcare professional.\n\nI'm currently running in demo mode and cannot access your saved Mediora records or provide a personalized medical assessment.";
}

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function sendMessage(text?: string) {
    const question = (text ?? input).trim();
    if (!question || loading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: question,
    };

    setMessages((current) => [...current, userMessage]);
    setInput("");
    setLoading(true);

    // Demo response only. A real AI API will be connected in a later step.
    window.setTimeout(() => {
      const response: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: getDemoResponse(question),
      };

      setMessages((current) => [...current, response]);
      setLoading(false);
    }, 700);
  }

  function startNewChat() {
    if (loading) return;
    setMessages([]);
    setInput("");
  }

  return (
    <main className="min-h-screen bg-[#f7f8fc] text-slate-800 md:flex">
      <aside className="border-b border-slate-200 bg-white p-5 md:min-h-screen md:w-72 md:border-b-0 md:border-r">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-600 text-xl text-white">
            ♡
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Mediora</h1>
            <p className="text-xs text-slate-500">Your personal health space</p>
          </div>
        </Link>

        <div className="mt-10">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
            Assistant
          </p>

          <div className="flex items-center gap-3 rounded-xl bg-violet-50 px-4 py-3 text-sm font-semibold text-violet-700">
            <span className="text-lg">✳</span>
            AI Health Assistant
          </div>

          <button
            onClick={startNewChat}
            disabled={loading}
            className="mt-3 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-600 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700 disabled:opacity-50"
          >
            + New conversation
          </button>
        </div>

        <div className="mt-8 rounded-2xl bg-violet-50 p-4">
          <div className="mb-2 text-xl">✦</div>
          <p className="text-sm font-semibold text-violet-900">
            Your health, in context.
          </p>
          <p className="mt-1 text-xs leading-5 text-violet-700">
            Organize your information and prepare for more informed doctor visits.
          </p>
        </div>

        <Link
          href="/"
          className="mt-6 block text-sm font-medium text-slate-500 hover:text-violet-700"
        >
          ← Back to dashboard
        </Link>
      </aside>

      <section className="flex min-h-[85vh] min-w-0 flex-1 flex-col md:h-screen md:min-h-0">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 md:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-xl text-indigo-600">
              ✳
            </div>
            <div>
              <h2 className="font-bold">Mediora AI</h2>
              <p className="text-xs text-slate-500">
                Health information assistant · Demo mode
              </p>
            </div>
          </div>

          <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700">
            Demo
          </span>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-8 md:px-8">
          <div className="mx-auto max-w-3xl">
            {messages.length === 0 ? (
              <div className="py-4 md:py-10">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-violet-100 text-3xl text-violet-700">
                  ✳
                </div>

                <p className="mb-3 text-sm font-medium uppercase tracking-widest text-violet-600">
                  YOUR HEALTH COMPANION
                </p>

                <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                  How can I help you today?
                </h1>

                <p className="mt-4 max-w-xl text-sm leading-6 text-slate-500 md:text-base">
                  Ask me to help organize your health information, prepare for
                  appointments, or understand general health-record terminology.
                </p>

                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  {suggestions.map((item) => (
                    <button
                      key={item.title}
                      onClick={() => sendMessage(item.prompt)}
                      className="rounded-2xl border border-slate-200 bg-white p-5 text-left transition hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-md"
                    >
                      <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-lg text-violet-600">
                        {item.icon}
                      </span>
                      <span className="block text-sm font-semibold">
                        {item.title}
                      </span>
                      <span className="mt-2 block text-xs leading-5 text-slate-500">
                        {item.prompt}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {message.role === "assistant" && (
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                        ✳
                      </div>
                    )}

                    <div
                      className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-7 sm:max-w-[80%] ${
                        message.role === "user"
                          ? "whitespace-pre-wrap bg-violet-600 text-white"
                          : "whitespace-pre-wrap border border-slate-200 bg-white text-slate-700"
                      }`}
                    >
                      {message.content}
                    </div>

                    {message.role === "user" && (
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-violet-100 bg-white text-sm font-semibold text-violet-700">
                        D
                      </div>
                    )}
                  </div>
                ))}

                {loading && (
                  <div
                    role="status"
                    aria-label="Preparing demo response"
                    className="flex items-center gap-3"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                      ✳
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-500">
                      Preparing a demo response...
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-slate-200 bg-white px-4 py-4 md:px-8">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              sendMessage();
            }}
            className="mx-auto max-w-3xl"
          >
            <div className="flex items-end gap-3 rounded-2xl border border-slate-200 bg-white p-2 transition focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-100">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Ask how to organize your health information..."
                rows={2}
                maxLength={1000}
                aria-label="Message for Mediora AI"
                className="max-h-36 min-h-12 flex-1 resize-y bg-transparent px-3 py-2 text-sm outline-none placeholder:text-slate-400"
              />

              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="mb-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-lg text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Send message"
              >
                ↑
              </button>
            </div>

            <div className="mt-3 flex flex-col justify-between gap-2 text-xs text-slate-400 sm:flex-row">
              <span>Enter to send · Shift + Enter for a new line</span>
              <span>{input.length}/1000</span>
            </div>

            <p className="mt-3 text-center text-xs leading-5 text-slate-400">
              Demo responses only. Not for diagnosis, emergency advice or
              prescriptions. Avoid entering personal or sensitive health details.
            </p>
          </form>
        </div>
      </section>
    </main>
  );
}
