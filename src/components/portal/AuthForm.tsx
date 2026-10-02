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

import { toast } from "react-toastify";

import {
  Eye,
  EyeOff,
} from "lucide-react";

import {
  loginRateLimit,
  portalApi,
  portalAuth,
} from "@/lib/portal/client";

import type { MeResponse } from "@/lib/portal/types";

type Mode = "login" | "register" | "reset";

function waitLabel(milliseconds: number) {
  const seconds = Math.max(
    1,
    Math.ceil(milliseconds / 1000),
  );

  if (seconds < 60) {
    return `${seconds} second${seconds === 1 ? "" : "s"}`;
  }

  const minutes = Math.ceil(seconds / 60);

  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
}

export default function AuthForm({
  mode,
}: {
  mode: Mode;
}) {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  const title = {
    login: "Welcome back.",
    register: "Create your account.",
    reset: "Reset your password.",
  }[mode];

  async function submit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (busy) return;

    // Attempts left in the login token bucket, once it has answered,
    // and how long the next attempt has to wait when none are left.
    let attemptsLeft: number | null = null;
    let nextWaitMs = 0;

    setBusy(true);

    try {
      const auth = portalAuth();

      // =====================================================
      // RESET PASSWORD
      // =====================================================

      if (mode === "reset") {
        const cleanEmail = email.trim().toLowerCase();

        if (!cleanEmail) {
          toast.error("Please enter your email address.");
          return;
        }

        await sendPasswordResetEmail(
          auth,
          cleanEmail,
        );

        toast.success(
          "If this email exists, a password reset email has been sent.",
        );

        setEmail("");

        return;
      }

      // =====================================================
      // REGISTER
      // =====================================================

      if (mode === "register") {
        const cleanName = name.trim();
        const cleanEmail = email.trim().toLowerCase();

        if (cleanName.length < 2) {
          toast.error("Please enter your full name.");
          return;
        }

        if (!cleanEmail) {
          toast.error("Please enter your email address.");
          return;
        }

        if (password.length < 10) {
          toast.error(
            "Password must be at least 10 characters.",
          );
          return;
        }

        const credential =
          await createUserWithEmailAndPassword(
            auth,
            cleanEmail,
            password,
          );

        try {
          // Save name in Firebase
          await updateProfile(
            credential.user,
            {
              displayName: cleanName,
            },
          );

          // Refresh Firebase token
          await credential.user.getIdToken(true);

          // Create/sync user in portal backend
          await portalApi<MeResponse>("me");

          // Send verification email
          await sendEmailVerification(
            credential.user,
          );

          toast.success(
            "Account created successfully! Please verify your email.",
          );

          // Give toast time to appear
          await new Promise((resolve) =>
            setTimeout(resolve, 1200),
          );

          router.replace(
            "/login?registered=1",
          );
        } finally {
          // Registration ke baad automatically
          // logged-in nahi rehna
          await signOut(auth);
        }

        return;
      }

      // =====================================================
      // LOGIN
      // =====================================================

      const cleanEmail = email.trim().toLowerCase();

      if (!cleanEmail) {
        toast.error(
          "Please enter your email address.",
        );
        return;
      }

      if (!password) {
        toast.error(
          "Please enter your password.",
        );
        return;
      }

      // =====================================================
      // RATE LIMIT
      //
      // 5 attempts per email + device address, then a
      // 15 minute lock, for users and admins alike.
      // =====================================================

      const limit = await loginRateLimit(
        "attempt",
        cleanEmail,
      );

      if (!limit.allowed) {
        toast.error(
          `Too many login attempts. Please try again in ${waitLabel(
            limit.retryAfterMs,
          )}.`,
        );
        return;
      }

      attemptsLeft = limit.remaining;
      nextWaitMs = limit.retryAfterMs;

      const credential =
        await signInWithEmailAndPassword(
          auth,
          cleanEmail,
          password,
        );

      // A valid sign-in refills the bucket.
      attemptsLeft = null;

      await loginRateLimit(
        "success",
        cleanEmail,
      );

      // Fresh token
      await credential.user.getIdToken(true);

      // Get role from backend
      const me =
        await portalApi<MeResponse>("me");

      console.log(
        "Logged in user:",
        me,
      );

      console.log(
        "Logged in role:",
        me.role,
      );

      toast.success(
        me.role === "admin"
          ? "Admin login successful!"
          : "Login successful!",
      );

      // Give toast time
      await new Promise((resolve) =>
        setTimeout(resolve, 700),
      );

      // =====================================================
      // IMPORTANT:
      // ADMIN -> /admin
      // USER  -> /dashboard
      // =====================================================

      if (me.role === "admin") {
        router.replace("/admin");
      } else {
        router.replace("/dashboard");
      }
    } catch (error: unknown) {
      console.error(
        "AUTH ERROR:",
        error,
      );

      const firebaseError =
        error as {
          code?: string;
          message?: string;
        };

      switch (firebaseError.code) {
        // LOGIN
        case "auth/invalid-credential":
        case "auth/wrong-password":
        case "auth/user-not-found":
          toast.error(
            attemptsLeft === null
              ? "Invalid email or password."
              : attemptsLeft > 0
                ? `Invalid email or password. ${attemptsLeft} attempt${
                    attemptsLeft === 1 ? "" : "s"
                  } left.`
                : `Invalid email or password. Too many attempts: please try again in ${waitLabel(
                    nextWaitMs,
                  )}.`,
          );
          break;

        case "auth/invalid-email":
          toast.error(
            "Please enter a valid email address.",
          );
          break;

        case "auth/user-disabled":
          toast.error(
            "This account has been disabled. Please contact support.",
          );
          break;

        case "auth/too-many-requests":
          toast.error(
            "Too many attempts. Please try again later.",
          );
          break;

        // REGISTER
        case "auth/email-already-in-use":
          toast.error(
            "An account already exists with this email.",
          );
          break;

        case "auth/weak-password":
          toast.error(
            "Password is too weak. Use at least 10 characters.",
          );
          break;

        // RESET
        case "auth/missing-email":
          toast.error(
            "Please enter your email address.",
          );
          break;

        // NETWORK
        case "auth/network-request-failed":
          toast.error(
            "Network error. Please check your internet connection.",
          );
          break;

        // DEFAULT
        default:
          toast.error(
            firebaseError.message ||
              "Something went wrong. Please try again.",
          );
      }
    } finally {
      setBusy(false);
    }
  }

  const input =
    "mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200 disabled:bg-slate-100";

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

        {/* FORM */}

        <form
          onSubmit={submit}
          className="mt-7 space-y-5"
        >

          {/* NAME */}

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

          {/* EMAIL */}

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

          {/* PASSWORD */}

          {mode !== "reset" && (
            <label className="block text-sm font-semibold text-slate-800">
              Password

              <div className="relative">
                <input
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  className={`${input} pr-12`}
                  value={password}
                  onChange={(event) =>
                    setPassword(
                      event.target.value,
                    )
                  }
                  autoComplete={
                    mode === "register"
                      ? "new-password"
                      : "current-password"
                  }
                  minLength={
                    mode === "register"
                      ? 10
                      : undefined
                  }
                  maxLength={128}
                  required
                  disabled={busy}
                  placeholder="Enter your password"
                />

                {/* EYE BUTTON */}

                <button
                  type="button"
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                  onClick={() =>
                    setShowPassword(
                      (current) =>
                        !current,
                    )
                  }
                  disabled={busy}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 transition hover:text-[#001b40] disabled:opacity-50"
                >
                  {showPassword ? (
                    <EyeOff
                      size={20}
                      strokeWidth={2}
                    />
                  ) : (
                    <Eye
                      size={20}
                      strokeWidth={2}
                    />
                  )}
                </button>
              </div>

              {mode === "register" && (
                <span className="mt-2 block text-xs text-slate-500">
                  Use at least 10 characters.
                </span>
              )}
            </label>
          )}

          {/* SUBMIT */}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-[#001b40] px-5 py-3 font-semibold text-white transition hover:bg-[#002855] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy
              ? "Please wait…"
              : mode === "login"
                ? "Sign in"
                : mode === "register"
                  ? "Create account"
                  : "Send reset email"}
          </button>
        </form>

        {/* LINKS */}

        <nav className="mt-6 flex flex-wrap gap-4 text-sm text-orange-800">
          {mode !== "login" && (
            <Link
              href="/login"
              className="hover:underline"
            >
              Sign in
            </Link>
          )}

          {mode !== "register" && (
            <Link
              href="/register"
              className="hover:underline"
            >
              Create account
            </Link>
          )}

          {mode !== "reset" && (
            <Link
              href="/forgot-password"
              className="hover:underline"
            >
              Forgot password?
            </Link>
          )}
        </nav>
      </section>
    </main>
  );
}