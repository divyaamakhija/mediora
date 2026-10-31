
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");

    if (!email.trim() || !password) {
      setMessage("Please enter your email and password.");
      return;
    }

    if (!isLogin && !name.trim()) {
      setMessage("Please enter your full name.");
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) throw error;

        router.replace("/");
        router.refresh();
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { full_name: name.trim() },
            emailRedirectTo: `${window.location.origin}/login`,
          },
        });

        if (error) throw error;

        if (data.session) {
          setMessage("Account created! You can now open your dashboard.");
          router.replace("/");
          router.refresh();
        } else {
          setMessage(
            "Account created! Check your email for the confirmation link, then return here to log in."
          );
          setIsLogin(true);
          setPassword("");
        }
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f8f7f3] px-5 py-10 text-[#29283a]">
      <div className="mx-auto grid min-h-[80vh] max-w-5xl overflow-hidden rounded-[2rem] border border-[#e8e4df] bg-white shadow-sm md:grid-cols-2">
        <section className="flex flex-col justify-between bg-[#eae7f5] p-8 md:p-12">
          <a href="/" className="text-xl font-semibold tracking-tight">
            mediora<span className="text-[#9186bd]">.</span>
          </a>

          <div className="my-12">
            <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-[#77708f]">
              Your health, beautifully organized.
            </p>
            <h1 className="font-serif text-4xl leading-tight md:text-5xl">
              A calmer way to care for yourself.
            </h1>
            <p className="mt-5 max-w-sm leading-7 text-[#666176]">
              Keep your symptoms, medications, vitals and medical records
              organized in one thoughtful space.
            </p>
          </div>

          <p className="text-sm text-[#77708f]">
            Your personal health journal, all in one place.
          </p>
        </section>

        <section className="flex items-center justify-center p-7 md:p-12">
          <div className="w-full max-w-sm">
            <p className="text-sm font-medium text-[#9186bd]">
              YOUR PERSONAL HEALTH SPACE
            </p>

            <h2 className="mt-3 font-serif text-3xl">
              {isLogin ? "Welcome back" : "Create your account"}
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#777681]">
              {isLogin
                ? "Sign in to continue to your health journal."
                : "Start organizing your health journey with Mediora."}
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              {!isLogin && (
                <div>
                  <label
                    htmlFor="name"
                    className="mb-2 block text-sm font-medium"
                  >
                    Full name
                  </label>
                  <input
                    id="name"
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required={!isLogin}
                    className="w-full rounded-xl border border-[#e5e2e9] bg-white px-4 py-3 outline-none transition focus:border-[#9186bd]"
                    placeholder="Your name"
                  />
                </div>
              )}

              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium"
                >
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-xl border border-[#e5e2e9] bg-white px-4 py-3 outline-none transition focus:border-[#9186bd]"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium"
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full rounded-xl border border-[#e5e2e9] bg-white px-4 py-3 outline-none transition focus:border-[#9186bd]"
                  placeholder="At least 6 characters"
                />
              </div>

              {message && (
                <p
                  role="status"
                  aria-live="polite"
                  className="rounded-xl bg-[#f1eff8] p-3 text-sm leading-6 text-[#5e557e]"
                >
                  {message}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-[#8c80b7] px-4 py-3.5 font-medium text-white transition hover:bg-[#786ca5] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading
                  ? "Please wait..."
                  : isLogin
                    ? "Sign in"
                    : "Create account"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-[#777681]">
              {isLogin ? "New to Mediora?" : "Already have an account?"}{" "}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setMessage("");
                }}
                className="font-semibold text-[#786ca5] hover:underline"
              >
                {isLogin ? "Create account" : "Sign in"}
              </button>
            </p>

            <a
              href="/"
              className="mt-8 block text-center text-sm text-[#777681] hover:text-[#786ca5]"
            >
              ← Back to dashboard
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}
