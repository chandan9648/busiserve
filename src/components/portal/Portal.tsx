"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import {
  onAuthStateChanged,
  sendEmailVerification,
  signOut,
} from "firebase/auth";

import {
  errorMessage,
  portalApi,
  portalAuth,
} from "@/lib/portal/client";

import {
  PLANS,
  formatDate,
  formatMoney,
  type PlanId,
} from "@/lib/portal/plans";

import {
  subscriptionStatus,
  type AdminResponse,
  type MeResponse,
  type Profile,
  type Subscription,
} from "@/lib/portal/types";

import Countdown from "./Countdown";
import AdminCharts from "./AdminCharts";

/* -------------------------------------------------------------------------- */
/* Portal checkout types                                                      */
/* -------------------------------------------------------------------------- */

type PaymentResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type CheckoutOrder = {
  key: string;
  orderId: string;
  amount: number;
  currency: string;
  planName: string;
};

type PortalRazorpayOptions = {
  key: string;
  order_id: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  prefill: {
    name: string;
    email: string;
    contact: string;
  };
  theme: {
    color: string;
  };
  handler: (response: PaymentResponse) => void;
  modal: {
    ondismiss: () => void;
  };
};

type PortalRazorpayInstance = {
  open: () => void;
  on: (
    event: "payment.failed",
    handler: () => void,
  ) => void;
};

type PortalRazorpayConstructor = new (
  options: PortalRazorpayOptions,
) => PortalRazorpayInstance;

/*
 * Local type only.
 * Do not declare Window.Razorpay globally in this file.
 * Your existing RazorpayCheckout.tsx already declares it.
 */
function getRazorpayConstructor():
  | PortalRazorpayConstructor
  | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  const checkoutWindow = window as unknown as {
    Razorpay?: PortalRazorpayConstructor;
  };

  return checkoutWindow.Razorpay;
}

/* -------------------------------------------------------------------------- */
/* Checkout script loader                                                     */
/* -------------------------------------------------------------------------- */

let checkoutLoader: Promise<void> | null = null;

function loadCheckout(): Promise<void> {
  if (getRazorpayConstructor()) {
    return Promise.resolve();
  }

  if (checkoutLoader) {
    return checkoutLoader;
  }

  checkoutLoader = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");

    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;

    const timeout = window.setTimeout(() => {
      script.onload = null;
      script.onerror = null;
      script.remove();
      checkoutLoader = null;
      reject(new Error("Payment checkout timed out. Check your connection and try again."));
    }, 15000);

    script.onload = () => {
      window.clearTimeout(timeout);
      if (getRazorpayConstructor()) {
        resolve();
      } else {
        script.remove();
        checkoutLoader = null;

        reject(new Error("Payment checkout could not load."));
      }
    };

    script.onerror = () => {
      window.clearTimeout(timeout);
      script.remove();
      checkoutLoader = null;

      reject(new Error("Payment checkout could not load."));
    };

    document.body.appendChild(script);
  });

  return checkoutLoader;
}

/* -------------------------------------------------------------------------- */
/* Shared styles                                                              */
/* -------------------------------------------------------------------------- */

const button =
  "inline-flex items-center justify-center rounded-xl bg-[#001b40] px-5 py-3 text-sm font-bold text-white disabled:opacity-50";

const secondary =
  "inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-50";

const input =
  "mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-2 focus:outline-orange-500";

// This account is the primary administrator and must never appear as a customer.
const PRIMARY_ADMIN_EMAIL = process.env.YOUR_PRIMARY_ADMIN_EMAIL;  

function isAdminCustomer(user: { uid?: string; email?: string }, currentAdminUid: string) {
  const email = String(user.email || "").trim().toLowerCase();
  return (
    user.uid === currentAdminUid ||
    email === PRIMARY_ADMIN_EMAIL
  );
}

/* -------------------------------------------------------------------------- */
/* Portal                                                                     */
/* -------------------------------------------------------------------------- */

export default function Portal({
  admin = false,
  profileOnly = false,
}: {
  admin?: boolean;
  profileOnly?: boolean;
}) {
  const router = useRouter();

  const [me, setMe] = useState<MeResponse | null>(null);
  const [message, setMessage] = useState("");

  const reload = useCallback(async () => {
    const result = await portalApi<MeResponse>("me");
    setMe(result);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let authVersion = 0;

    const unsubscribe = onAuthStateChanged(
      portalAuth(),
      (user) => {
        const currentVersion = ++authVersion;

        setMe(null);
        setMessage("");

        if (!user) {
          router.replace("/login");
          return;
        }

        portalApi<MeResponse>("me")
          .then((result) => {
            if (
              cancelled ||
              currentVersion !== authVersion
            ) {
              return;
            }

            if ((admin || profileOnly) && result.role !== "admin") {
              router.replace("/dashboard");
              return;
            }

            setMe(result);
          })
          .catch((error: unknown) => {
            if (
              !cancelled &&
              currentVersion === authVersion
            ) {
              setMessage(errorMessage(error));
            }
          });
      },
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [admin, profileOnly, router]);

  async function logout() {
    try {
      await signOut(portalAuth());
      router.replace("/login");
    } catch (error) {
      setMessage(errorMessage(error));
    }
  }

  if (!me) {
    return (
      <main className="container-site py-16">
        <p role="status">
          {message || "Loading your account…"}
        </p>

        <Link
          href="/login"
          className="mt-4 inline-block underline"
        >
          Back to login
        </Link>
      </main>
    );
  }

  const isAdminPage = admin || profileOnly;

  return (
    <main
      className={`min-h-screen py-10 ${
        isAdminPage
          ? "bg-[#060d1a] text-white"
          : "bg-slate-50 text-[#001b40]"
      }`}
    >
      <div className="container-site space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p
              className={`text-xs font-bold uppercase tracking-widest ${
                isAdminPage ? "text-indigo-400" : "text-orange-700"
              }`}
            >
              Busiserve portal
            </p>

            <h1
              className={`mt-2 text-3xl font-extrabold ${
                isAdminPage ? "text-white" : "text-[#001b40]"
              }`}
            >
              {admin
                ? "Admin dashboard"
                : `Hello, ${me.profile.name}`}
            </h1>
          </div>

          <nav className="flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className={
                isAdminPage
                  ? "inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/20 transition"
                  : secondary
              }
            >
              My account
            </Link>

            {me.role === "admin" && (
              <Link
                href="/admin"
                className={
                  isAdminPage
                    ? "inline-flex items-center justify-center rounded-xl border border-indigo-500/40 bg-indigo-500/20 px-4 py-2 text-sm font-semibold text-indigo-300 backdrop-blur-sm hover:bg-indigo-500/30 transition"
                    : secondary
                }
              >
                Admin
              </Link>
            )}

            <button
              type="button"
              onClick={logout}
              className={
                isAdminPage
                  ? "inline-flex items-center justify-center cursor-pointer rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-400 backdrop-blur-sm hover:bg-rose-500/20 transition"
                  : secondary
              }
            >
              Sign out
            </button>
          </nav>
        </header>

        {message && (
          <p role="status" className={isAdminPage ? "text-white/70" : ""}>{message}</p>
        )}

        {admin ? (
          <AdminDashboard currentAdminUid={me.profile.uid} />
        ) : me.role === "admin" ? (
          <AdminProfile me={me} />
        ) : (
          <UserDashboard
            me={me}
            reload={reload}
          />
        )}
      </div>
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/* Admin profile                                                              */
/* -------------------------------------------------------------------------- */

function AdminProfile({
  me,
}: {
  me: MeResponse;
}) {
  const name =
    me.profile?.name?.trim() || "Administrator";

  const email =
    me.profile?.email?.trim() || "—";

  const phone =
    me.profile?.phone?.trim() || "—";

  return (
    <section className="space-y-6">

      {/* PROFILE HEADER */}

      <section className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-5">

          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-orange-700">
              Administrator
            </p>

            <h2 className="mt-2 text-2xl font-extrabold text-[#001b40]">
              My Profile
            </h2>

            <p className="mt-2 text-sm text-slate-600">
              Administrator account information.
            </p>
          </div>

          <div className="rounded-full bg-orange-100 px-4 py-2 text-sm font-bold text-orange-800">
            ADMIN
          </div>
        </div>
      </section>

      {/* PERSONAL INFORMATION */}

      <section className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">

        <h3 className="text-xl font-bold text-[#001b40]">
          Personal details
        </h3>

        <div className="mt-6 grid gap-5 md:grid-cols-2">

          {/* NAME */}

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Full name
            </p>

            <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              {name}
            </div>
          </div>

          {/* EMAIL */}

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Email
            </p>

            <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 break-all">
              {email}
            </div>
          </div>

          {/* PHONE */}

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Phone
            </p>

            <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              {phone}
            </div>
          </div>

          {/* ROLE */}

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Account role
            </p>

            <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-semibold capitalize">
              Administrator
            </div>
          </div>

        </div>
      </section>

      {/* ADMIN NOTICE */}

      <section className="rounded-2xl border border-orange-200 bg-orange-50 p-6">

        <h3 className="font-bold text-[#001b40]">
          Administrator account
        </h3>

        <p className="mt-2 text-sm leading-6 text-slate-700">
          This account is an administrator account.
          Subscription plans, checkout and payment
          history are available only for customer accounts.
        </p>

      </section>

    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* User dashboard                                                             */
/* -------------------------------------------------------------------------- */

function UserDashboard({
  me,
  reload,
}: {
  me: MeResponse;
  reload: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState<PlanId | null>(null);
  const detailsRef = useRef<HTMLElement | null>(null);
  const checkoutInProgress = useRef(false);
  const selectedPlan = selectedPlanId ? PLANS[selectedPlanId] : null;

  useEffect(() => {
    if (selectedPlanId) {
      detailsRef.current?.focus({ preventScroll: true });
      detailsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selectedPlanId]);

  const active = me.subscriptions.find(
    (item) =>
      item.startsAt <= me.serverNow &&
      item.expiresAt > me.serverNow,
  );

  const refreshAfterExpiry = useCallback(() => {
    void reload().catch((error: unknown) => {
      setMessage(errorMessage(error));
    });
  }, [reload]);

  async function refresh() {
    setBusy(true);

    try {
      const user = portalAuth().currentUser;

      if (user) {
        await user.reload();
        await user.getIdToken(true);
      }

      await reload();
      setMessage("Account refreshed.");
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function resendVerification() {
    setBusy(true);

    try {
      const user = portalAuth().currentUser;

      if (!user) {
        throw new Error("Please sign in again.");
      }

      await sendEmailVerification(user);

      setMessage(
        "Verification email sent. Check your inbox.",
      );
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function buy(planId: PlanId) {
    if (busy || checkoutInProgress.current) return;
    checkoutInProgress.current = true;
    setBusy(true);
    setMessage("");

    try {
      const user = portalAuth().currentUser;
      if (!user) throw new Error("Please sign in again.");
      await user.reload();
      await user.getIdToken(true);
      if (!user.emailVerified) {
        throw new Error("Verify your email, then select Refresh account before payment.");
      }
      await loadCheckout();

      const RazorpayCheckout = getRazorpayConstructor();

      if (!RazorpayCheckout) {
        throw new Error(
          "Payment checkout is unavailable.",
        );
      }

      const order = await portalApi<CheckoutOrder>(
        "order",
        "POST",
        { planId },
      );

      let verificationStarted = false;

      const checkout = new RazorpayCheckout({
        key: order.key,
        order_id: order.orderId,
        amount: order.amount,
        currency: order.currency,
        name: "Busiserve",
        description: `${order.planName}: one calendar month`,

        prefill: {
          name: me.profile.name,
          email: me.profile.email,
          contact: me.profile.phone,
        },

        theme: {
          color: "#001b40",
        },

        handler: (response) => {
          if (verificationStarted) {
            return;
          }

          verificationStarted = true;

          void (async () => {
            try {
              await portalApi(
                "verify",
                "POST",
                response,
              );

              setSelectedPlanId(null);
              await reload();

              setMessage(
                "Payment verified. Your subscription details are updated.",
              );
            } catch (error) {
              setMessage(
                `${errorMessage(error)} If money was debited, do not pay again; refresh shortly or contact support.`,
              );
            } finally {
              checkoutInProgress.current = false;
              setBusy(false);
            }
          })();
        },

        modal: {
          ondismiss: () => {
            if (!verificationStarted) {
              checkoutInProgress.current = false;
              setBusy(false);

              setMessage(
                "Checkout closed. Refresh your account if you completed payment.",
              );
            }
          },
        },
      });

      checkout.on("payment.failed", () => {
        setMessage(
          "The payment attempt failed. You can retry in checkout or close it.",
        );
      });

      checkout.open();
    } catch (error) {
      checkoutInProgress.current = false;
      setMessage(errorMessage(error));
      setBusy(false);
    }
  }

  return (
    <>
      {!me.emailVerified && (
        <section className="rounded-xl border border-orange-200 bg-orange-50 p-5">
          <h2 className="font-bold">
            Verify your email to purchase a plan.
          </h2>

          <p className="mt-2 text-sm">
            Open the verification email, then select
            Refresh account.
          </p>

          <button
            type="button"
            onClick={resendVerification}
            disabled={busy}
            className={`${secondary} mt-3`}
          >
            Resend verification email
          </button>
        </section>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={refresh}
          disabled={busy}
          className={secondary + "cursor-pointer"}
        >
          Refresh account
        </button>

        {message && (
          <p
            role="status"
            className="text-sm"
          >
            {message}
          </p>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ProfileForm
          key={`${me.profile.uid}-${me.profile.name}-${me.profile.phone}`}
          profile={me.profile}
          reload={reload}
        />

        <section className="rounded-2xl bg-[#001b40] p-7 text-white">
          <p className="text-sm text-orange-200">
            Your current subscription
          </p>

          {active ? (
            <>
              <h2 className="mt-3 text-3xl font-extrabold">
                {active.planName}
              </h2>

              <p className="mt-3">
                {Math.max(
                  0,
                  active.allowance - active.used,
                )}{" "}
                of {active.allowance} changes remaining
              </p>

              <p className="mt-3 text-sm text-slate-200">
                Started: {formatDate(active.startsAt)}
              </p>

              <p className="mt-1 text-sm text-slate-200">
                Expires: {formatDate(active.expiresAt)}
              </p>

              <Countdown
                expiresAt={active.expiresAt}
                serverNow={me.serverNow}
                onExpire={refreshAfterExpiry}
              />
            </>
          ) : (
            <>
              <h2 className="mt-3 text-2xl font-bold">
                No active subscription
              </h2>

              <p className="mt-4 leading-7 text-slate-200">
                Choose a plan below. Any scheduled
                subscriptions are listed in your payment
                history.
              </p>
            </>
          )}
        </section>
      </div>

      <section>
        <h2 className="text-2xl font-bold">
          Choose or renew a plan
        </h2>

        <p className="mt-2 text-sm leading-7 text-slate-600">
          Each payment buys one calendar month. An early
          renewal starts after your existing paid periods
          finish. Change allowances reset for each period,
          and unused changes do not roll over.
        </p>

        <div className="mt-6 grid gap-5 lg:grid-cols-3">
          {Object.values(PLANS).map((plan) => (
            <article
              key={plan.id}
              className="rounded-2xl border bg-white p-6"
            >
              <h3 className="text-xl font-bold">
                {plan.name}
              </h3>

              <p className="mt-3 text-sm text-slate-600">
                {plan.description}
              </p>

              <p className="mt-5 text-3xl font-extrabold">
                {formatMoney(plan.amount)}
              </p>

              <p className="mt-2 text-sm">
                One month · {plan.changes} small changes
              </p>

              <button
                type="button"
                onClick={() => {
                  setMessage("");
                  setSelectedPlanId(plan.id);
                  if (selectedPlanId === plan.id) {
                    detailsRef.current?.focus({ preventScroll: true });
                    detailsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }
                }}
                aria-controls="selected-plan-details"
                disabled={busy}
                className={`${button} mt-6 w-full`}
              >
                {busy
                  ? "Please wait…"
                  : `Buy ${plan.name}`}
              </button>
            </article>
          ))}
        </div>
      </section>

      {selectedPlan && (
        <section
          id="selected-plan-details"
          ref={detailsRef}
          tabIndex={-1}
          aria-labelledby="selected-plan-title"
          className="scroll-mt-24 rounded-2xl border border-orange-200 bg-white p-6 shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 md:p-8"
        >
          <p className="text-xs font-bold uppercase tracking-widest text-orange-700">
            Review your plan
          </p>
          <h2 id="selected-plan-title" className="mt-2 text-2xl font-extrabold">
            {selectedPlan.name} plan
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">{selectedPlan.description}</p>
          <dl className="mt-6 grid gap-4 rounded-xl bg-slate-50 p-5 sm:grid-cols-2">
            <div><dt className="text-sm text-slate-500">Plan price</dt>
              <dd className="mt-1 text-2xl font-bold">{formatMoney(selectedPlan.amount)}</dd></div>
            <div><dt className="text-sm text-slate-500">Duration</dt>
              <dd className="mt-1 font-semibold">One calendar month</dd></div>
            <div><dt className="text-sm text-slate-500">Included changes</dt>
              <dd className="mt-1 font-semibold">{selectedPlan.changes} small changes</dd></div>
            <div><dt className="text-sm text-slate-500">Renewal</dt>
              <dd className="mt-1 font-semibold">A separate purchase for each period</dd></div>
          </dl>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            An early renewal starts after your existing paid periods finish.
            Unused changes do not roll over. Review the final amount in payment checkout.
          </p>
          <div className="mt-6 border-t border-slate-200 pt-5">
            <h3 className="font-bold">Account details</h3>
            <p className="mt-2 text-sm">{me.profile.name}</p>
            <p className="mt-1 break-all text-sm text-slate-600">{me.profile.email}</p>
            <p className="mt-1 text-sm text-slate-600">Phone: {me.profile.phone || "Not added"}</p>
            <p className="mt-2 text-xs text-slate-500">Update these in Personal details before payment if needed.</p>
          </div>
          {!me.emailVerified && (
            <div className="mt-5 rounded-xl border border-orange-200 bg-orange-50 p-4">
              <p className="text-sm font-semibold">Verify your email to continue to payment.</p>
              <p className="mt-1 text-sm">Open the verification email, then refresh your account here.</p>
              <div className="mt-3 flex flex-wrap gap-3">
                <button type="button" className={secondary} onClick={resendVerification} disabled={busy}>
                  Resend verification email
                </button>
                <button type="button" className={secondary} onClick={refresh} disabled={busy}>
                  Refresh account
                </button>
              </div>
            </div>
          )}
          {message && <p role="status" className="mt-5 rounded-xl bg-slate-100 p-4 text-sm">{message}</p>}
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" className={button} disabled={busy || !me.emailVerified}
              onClick={() => void buy(selectedPlan.id)}>
              {busy ? "Please wait…" : `Continue to payment · ${formatMoney(selectedPlan.amount)}`}
            </button>
            <button type="button" className={secondary} disabled={busy}
              onClick={() => setSelectedPlanId(null)}>Cancel</button>
          </div>
          <p className="mt-3 text-xs text-slate-500">Payment opens securely with Razorpay.</p>
        </section>
      )}

      <section className="rounded-2xl border bg-white p-6">
        <h2 className="text-xl font-bold">
          Payments and subscription history
        </h2>

        {me.subscriptions.length === 0 ? (
          <p className="mt-4 text-slate-600">
            No verified payments yet.
          </p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b">
                  {[
                    "Plan",
                    "Paid",
                    "Starts",
                    "Expires",
                    "Status",
                    "Payment ID",
                  ].map((label) => (
                    <th
                      key={label}
                      scope="col"
                      className="p-3"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {me.subscriptions.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b"
                  >
                    <td className="p-3">
                      {item.planName}
                    </td>

                    <td className="p-3">
                      {formatMoney(item.amount)}
                    </td>

                    <td className="p-3">
                      {formatDate(item.startsAt)}
                    </td>

                    <td className="p-3">
                      {formatDate(item.expiresAt)}
                    </td>

                    <td className="p-3">
                      {subscriptionStatus(
                        item,
                        me.serverNow,
                      )}
                    </td>

                    <td className="p-3 font-mono text-xs">
                      {item.paymentId}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Profile form                                                               */
/* -------------------------------------------------------------------------- */

function ProfileForm({
  profile,
  reload,
}: {
  profile: Profile;
  reload: () => Promise<void>;
}) {
  const [name, setName] = useState(profile.name);
  const [phone, setPhone] = useState(profile.phone);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function save(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      await portalApi("profile", "PUT", {
        name,
        phone,
      });

      setMessage("Profile saved.");
      await reload();
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border bg-white p-7">
      <h2 className="text-xl font-bold">
        Personal details
      </h2>

      <form
        onSubmit={save}
        className="mt-5 space-y-4"
      >
        <label className="block text-sm font-semibold">
          Full name
          <input
            className={input}
            value={name}
            onChange={(event) =>
              setName(event.target.value)
            }
            autoComplete="name"
            minLength={2}
            maxLength={100}
            required
          />
        </label>

        <label className="block text-sm font-semibold">
          Email
          <input
            className={`${input} bg-slate-50`}
            value={profile.email}
            readOnly
            type="email"
          />
        </label>

        <label className="block text-sm font-semibold">
          Phone
          <input
            className={input}
            value={phone}
            onChange={(event) =>
              setPhone(event.target.value)
            }
            autoComplete="tel"
            type="tel"
            maxLength={25}
          />
        </label>

        <button
          type="submit"
          disabled={busy}
          className={button}
        >
          {busy ? "Saving…" : "Save details"}
        </button>

        {message && (
          <p
            role="status"
            className="text-sm"
          >
            {message}
          </p>
        )}
      </form>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Admin dashboard                                                            */
/* -------------------------------------------------------------------------- */

function AdminDashboard({
  currentAdminUid,
}: {
  currentAdminUid: string;
}) {
  const [data, setData] =
    useState<AdminResponse | null>(null);

  const [page, setPage] = useState(1);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const requestVersion = useRef(0);
  const deleting = useRef(false);

  const fetchData = useCallback(async () => {
    const version = ++requestVersion.current;
    const result = await portalApi<AdminResponse>(`admin?page=${page}&_t=${Date.now()}`);
    if (version === requestVersion.current) {
      setData(result);
      setPage(result.page);
    }
  }, [page]);

  const load = useCallback(async () => {
    if (deleting.current) return;
    setBusy(true);
    try {
      await fetchData();
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }, [fetchData]);

  useEffect(() => {
    let active = true;
    const syncData = async () => {
      if (deleting.current) return;
      const version = ++requestVersion.current;
      try {
        const result = await portalApi<AdminResponse>(`admin?page=${page}&_t=${Date.now()}`);
        if (active && version === requestVersion.current && !deleting.current) {
          setData(result);
          setPage(result.page);
        }
      } catch (error) {
        if (active && version === requestVersion.current && !deleting.current) {
          setMessage(errorMessage(error));
        }
      }
    };
    void syncData();
    const interval = window.setInterval(() => void syncData(), 5000);
    return () => {
      active = false;
      ++requestVersion.current;
      window.clearInterval(interval);
    };
  }, [page]);

  // Never expose an administrator as a customer.
  // We check both UID and the primary admin email so the admin stays hidden
  // even if the backend returns a stale/duplicate admin profile record.
  const visibleUsers = data
    ? data.users.filter(
        (user) => !isAdminCustomer(user, currentAdminUid),
      )
    : [];

  // Do not access data.totalUsers until after the null check below.
  // The API is also responsible for excluding admin accounts from totals.
  if (!data) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-8">
        <p role="status">
          {message || "Loading admin dashboard…"}
        </p>

        {message && (
          <button
            type="button"
            onClick={() => void load()}
            disabled={busy}
            className={`${secondary} mt-4`}
          >
            Retry
          </button>
        )}
      </section>
    );
  }

  // The backend total already excludes administrators. Do not subtract 1 here.
  const visibleTotalUsers = data.totalUsers;
  const visibleActiveUsers = data.activeUsers;
  const visibleExpiredUsers = data.expiredUsers;

  const stats = [
    {
      label: "Registered portal users",
      value: visibleTotalUsers,
    },
    {
      label: "Active subscriptions",
      value: visibleActiveUsers,
    },
    {
      label: "Users with expired plans",
      value: visibleExpiredUsers,
    },
    {
      label: "Gross captured payments",
      value: formatMoney(data.totalRevenue),
    },
  ];

  async function deleteUser(user: AdminResponse["users"][number]) {
    if (busy || deleting.current) return;

    if (isAdminCustomer(user, currentAdminUid)) {
      setMessage("Administrator accounts cannot be deleted from customer management.");
      return;
    }

    const confirmed = window.confirm(
      `PERMANENT DELETE WARNING\n\nDelete ${user.name || user.email} permanently?\n\nThis will remove the Firebase Authentication account and the user's portal profile. This action cannot be undone.`,
    );

    if (!confirmed) return;

    const finalConfirmed = window.confirm(
      `FINAL CONFIRMATION\n\nPermanently delete ${user.email}?\n\nPress OK only if you are completely sure.`,
    );

    if (!finalConfirmed) return;

    deleting.current = true;
    ++requestVersion.current;
    setBusy(true);
    setMessage("");

    try {
      await portalApi(
        `admin/delete-user?uid=${encodeURIComponent(user.uid)}`,
        "DELETE",
      );

      setMessage(`User ${user.email} permanently deleted.`);
      // Do not show stale counts if the follow-up request fails.
      setData(null);
      try {
        await fetchData();
      } catch (refreshError) {
        setMessage(`User deleted, but statistics could not refresh. Click Refresh. ${errorMessage(refreshError)}`);
      }
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      deleting.current = false;
      setBusy(false);
    }
  }

  return (
    <>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={load}
          disabled={busy}
          className="inline-flex items-center cursor-pointer gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20 disabled:opacity-50"
        >
          <svg
            className={`h-4 w-4 ${busy ? "animate-spin" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {busy ? "Refreshing…" : "Refresh dashboard"}
        </button>

        {message && (
          <p role="status" className="text-sm text-white/70">{message}</p>
        )}
      </div>

      <AdminCharts data={data} />

      <section className="rounded-2xl border border-white/10 bg-[#0d1a2e] p-6 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white">
              Users &amp; current plans
            </h2>
            <p className="mt-1 text-sm text-white/50">
              Update completed change counts after fulfilling a user&apos;s requests.
            </p>
          </div>
          <span className="rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-300">
            {visibleUsers.length} user{visibleUsers.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10">
                {[
                  "User",
                  "Phone",
                  "Active plan",
                  "Expires",
                  "Changes used",
                  "Action",
                ].map((label) => (
                  <th
                    key={label}
                    scope="col"
                    className="p-3 text-xs font-semibold uppercase tracking-wider text-white/40"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {visibleUsers.map((user) => (
                <tr
                  key={user.uid}
                  className="border-b border-white/5 align-top transition hover:bg-white/5"
                >
                  <td className="p-3">
                    <p className="font-semibold text-white">
                      {user.name}
                    </p>
                    <p className="text-xs text-white/40">
                      {user.email}
                    </p>
                  </td>

                  <td className="p-3 text-white/70">
                    {user.phone || "—"}
                  </td>

                  <td className="p-3">
                    {user.active?.planName ? (
                      <span className="rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs font-semibold text-emerald-400">
                        {user.active.planName}
                      </span>
                    ) : (
                      <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-white/40">None</span>
                    )}
                  </td>

                  <td className="p-3 text-white/70">
                    {user.active
                      ? formatDate(
                        user.active.expiresAt,
                      )
                      : "—"}
                  </td>

                  <td className="p-3">
                    {user.active ? (
                      <UsageEditor
                        key={`${user.active.id}-${user.active.used}`}
                        subscription={user.active}
                        onSaved={load}
                      />
                    ) : (
                      <span className="text-white/30">—</span>
                    )}
                  </td>

                  <td className="p-3">
                    <button
                      type="button"
                      onClick={() => void deleteUser(user)}
                      disabled={busy}
                      className="inline-flex items-center justify-center cursor-pointer rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-400 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-4">
          <button
            type="button"
            disabled={busy || data.page <= 1}
            onClick={() =>
              setPage(data.page - 1)
            }
            className="inline-flex items-center justify-center cursor-pointer rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20 disabled:opacity-40"
          >
            ← Previous
          </button>

          <span className="text-sm text-white/50">
            Page {data.page} of {data.totalPages}
          </span>

          <button
            type="button"
            disabled={
              busy ||
              data.page >= data.totalPages
            }
            onClick={() =>
              setPage(data.page + 1)
            }
            className="inline-flex items-center justify-center cursor-pointer rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20 disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      </section>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Admin change usage editor                                                  */
/* -------------------------------------------------------------------------- */

function UsageEditor({
  subscription,
  onSaved,
}: {
  subscription: Subscription;
  onSaved: () => Promise<void>;
}) {
  const [used, setUsed] = useState(subscription.used);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function save(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      await portalApi("usage", "PUT", {
        subscriptionId: subscription.id,
        used,
      });

      await onSaved();
      setMessage("Saved.");
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save}>
      <div className="flex items-center gap-2">
        <input
          aria-label={`Completed changes for subscription ${subscription.id}`}
          type="number"
          min={0}
          max={subscription.allowance}
          step={1}
          value={used}
          onChange={(event) =>
            setUsed(Number(event.target.value))
          }
          className="w-20 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          required
        />

        <span className="text-white/50">/ {subscription.allowance}</span>

        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20 disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save"}
        </button>
      </div>

      {message && (
        <p
          role="status"
          className="mt-2 text-xs text-emerald-400"
        >
          {message}
        </p>
      )}
    </form>
  );
}