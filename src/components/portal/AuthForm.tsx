"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";

import { portalApi, portalAuth } from "@/lib/portal/client";
import type { MeResponse } from "@/lib/portal/types";

type Mode = "login" | "register" | "reset";

export default function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const title = {
    login: "Welcome back.",
    register: "Create your account.",
    reset: "Reset your password.",
  }[mode];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setBusy(true);
    setMessage("");

    try {
      const auth = portalAuth();

      // =========================
      // RESET PASSWORD
      // =========================
      if (mode === "reset") {
        await sendPasswordResetEmail(auth, email.trim());

        setMessage(
          "If this address has an account, a password-reset email will arrive shortly.",
        );

        return;
      }

      // =========================
      // REGISTER
      // =========================
      if (mode === "register") {
        const credential = await createUserWithEmailAndPassword(
          auth,
          email.trim(),
          password,
        );

        try {
          await updateProfile(credential.user, {
            displayName: name.trim(),
          });

          await credential.user.getIdToken(true);

          await portalApi<MeResponse>("me");

          await sendEmailVerification(credential.user);
        } finally {
          await signOut(auth);
        }

        router.replace("/login?registered=1");
        return;
      }

      // =========================
      // LOGIN
      // =========================
      await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password,
      );

      const me = await portalApi<MeResponse>("me");

      router.replace(
        me.role === "admin" ? "/admin" : "/dashboard",
      );
    } catch (error) {
      console.error("Authentication error:", error);

      setMessage(
        mode === "reset"
          ? "If this address has an account, a password-reset email will arrive shortly."
          : mode === "register"
            ? "Registration could not be completed. If your account was created, sign in or reset your password."
            : "Unable to sign in. Check your email and password, then try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  const input =
    "mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500";

  return (
    <main className="bg-slate-50 px-5 py-16">
      <section className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
        {/* Heading */}
        <p className="text-xs font-bold uppercase tracking-widest text-orange-700">
          Busiserve account
        </p>

        <h1 className="mt-4 text-3xl font-extrabold text-[#001b40]">
          {title}
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-600">
          Users and administrators sign in here.
          Verify your email before purchasing a plan.
        </p>

        {/* Form */}
        <form onSubmit={submit} className="mt-7 space-y-5">
          {/* Full Name - Register Only */}
          {mode === "register" && (
            <label className="block text-sm font-semibold text-slate-800">
              Full name

              <input
                type="text"
                className={input}
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
                autoComplete="name"
                minLength={2}
                maxLength={100}
                required
                disabled={busy}
                placeholder="Enter your full name"
              />
            </label>
          )}

          {/* Email */}
          <label className="block text-sm font-semibold text-slate-800">
            Email

            <input
              type="email"
              className={input}
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              autoComplete="email"
              maxLength={254}
              required
              disabled={busy}
              placeholder="Enter your email"
            />
          </label>

          {/* Password */}
          {mode !== "reset" && (
            <label className="block text-sm font-semibold text-slate-800">
              Password

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  className={`${input} pr-12`}
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  autoComplete={
                    mode === "register"
                      ? "new-password"
                      : "current-password"
                  }
                  minLength={
                    mode === "register" ? 10 : undefined
                  }
                  maxLength={128}
                  required
                  disabled={busy}
                  placeholder="Enter your password"
                />

                {/* Eye Button */}
                <button
                  type="button"
                  onClick={() =>
                    setShowPassword((current) => !current)
                  }
                  disabled={busy}
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                  className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {showPassword ? (
                    /* Eye Off */
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                      <line x1="2" x2="22" y1="2" y2="22" />
                    </svg>
                  ) : (
                    /* Eye */
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M2.06 12.35a1 1 0 0 1 0-.7C3.6 7.5 7.4 5 12 5s8.4 2.5 9.94 6.65a1 1 0 0 1 0 .7C20.4 16.5 16.6 19 12 19s-8.4-2.5-9.94-6.65Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>

              {/* Register password hint */}
              {mode === "register" && (
                <span className="mt-2 block text-xs text-slate-500">
                  Use at least 10 characters.
                </span>
              )}
            </label>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-[#001b40] px-5 py-3 font-semibold text-white transition hover:bg-[#002653] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy
              ? "Please wait…"
              : mode === "login"
                ? "Sign in"
                : mode === "register"
                  ? "Create account"
                  : "Send reset email"}
          </button>

          {/* Message */}
          {message && (
            <p
              role="status"
              className="rounded-xl bg-orange-50 px-4 py-3 text-sm leading-6 text-orange-800"
            >
              {message}
            </p>
          )}
        </form>

        {/* Navigation */}
        <nav className="mt-6 flex flex-wrap gap-4 text-sm text-orange-800">
          {mode !== "login" && (
            <Link
              href="/login"
              className="transition hover:text-orange-600"
            >
              Sign in
            </Link>
          )}

          {mode !== "register" && (
            <Link
              href="/register"
              className="transition hover:text-orange-600"
            >
              Create account
            </Link>
          )}

          {mode !== "reset" && (
            <Link
              href="/forgot-password"
              className="transition hover:text-orange-600"
            >
              Forgot password?
            </Link>
          )}
        </nav>
      </section>
    </main>
  );
}