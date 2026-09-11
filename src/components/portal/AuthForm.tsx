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

import {
  portalApi,
  portalAuth,
} from "@/lib/portal/client";
import type { MeResponse } from "@/lib/portal/types";

type Mode = "login" | "register" | "reset";

export default function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

      if (mode === "reset") {
        await sendPasswordResetEmail(auth, email.trim());

        setMessage(
          "If this address has an account, a password-reset email will arrive shortly.",
        );

        return;
      }

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

      await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password,
      );

      const me = await portalApi<MeResponse>("me");

      router.replace(me.role === "admin" ? "/admin" : "/dashboard");
    } catch {
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
    "mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:outline-2 focus:outline-orange-500";

  return (
    <main className="bg-slate-50 px-5 py-16">
      <section className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
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

        <form onSubmit={submit} className="mt-7 space-y-5">
          {mode === "register" && (
            <label className="block text-sm font-semibold">
              Full name
              <input
                className={input}
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
                minLength={2}
                maxLength={100}
                required
              />
            </label>
          )}

          <label className="block text-sm font-semibold">
            Email
            <input
              type="email"
              className={input}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              maxLength={254}
              required
            />
          </label>

          {mode !== "reset" && (
            <label className="block text-sm font-semibold">
              Password
              <input
                type="password"
                className={input}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={
                  mode === "register" ? "new-password" : "current-password"
                }
                minLength={mode === "register" ? 10 : undefined}
                maxLength={128}
                required
              />
              {mode === "register" && (
                <span className="mt-2 block text-xs text-slate-500">
                  Use at least 10 characters.
                </span>
              )}
            </label>
          )}

          <button
            disabled={busy}
            className="w-full rounded-xl bg-[#001b40] px-5 py-3 font-semibold text-white disabled:opacity-50"
          >
            {busy
              ? "Please wait…"
              : mode === "login"
                ? "Sign in"
                : mode === "register"
                  ? "Create account"
                  : "Send reset email"}
          </button>

          {message && (
            <p role="status" className="text-sm leading-6 text-orange-800">
              {message}
            </p>
          )}
        </form>

        <nav className="mt-6 flex flex-wrap gap-4 text-sm text-orange-800">
          {mode !== "login" && <Link href="/login">Sign in</Link>}
          {mode !== "register" && (
            <Link href="/register">Create account</Link>
          )}
          {mode !== "reset" && (
            <Link href="/forgot-password">Forgot password?</Link>
          )}
        </nav>
      </section>
    </main>
  );
}