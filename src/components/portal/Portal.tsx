"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
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

    script.onload = () => {
      if (getRazorpayConstructor()) {
        resolve();
      } else {
        script.remove();
        checkoutLoader = null;

        reject(new Error("Payment checkout could not load."));
      }
    };

    script.onerror = () => {
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

/* -------------------------------------------------------------------------- */
/* Portal                                                                     */
/* -------------------------------------------------------------------------- */

export default function Portal({
  admin = false,
}: {
  admin?: boolean;
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

            if (admin && result.role !== "admin") {
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
  }, [admin, router]);

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

  return (
    <main className="min-h-screen bg-slate-50 py-10 text-[#001b40]">
      <div className="container-site space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-orange-700">
              Busiserve portal
            </p>

            <h1 className="mt-2 text-3xl font-extrabold">
              {admin
                ? "Admin dashboard"
                : `Hello, ${me.profile.name}`}
            </h1>
          </div>

          <nav className="flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className={secondary}
            >
              My account
            </Link>

            {me.role === "admin" && (
              <Link
                href="/admin"
                className={secondary}
              >
                Admin
              </Link>
            )}

            <button
              type="button"
              onClick={logout}
              className={secondary}
            >
              Sign out
            </button>
          </nav>
        </header>

        {message && (
          <p role="status">{message}</p>
        )}

        {admin ? (
          <AdminDashboard />
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
    setBusy(true);
    setMessage("");

    try {
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

              await reload();

              setMessage(
                "Payment verified. Your subscription details are updated.",
              );
            } catch (error) {
              setMessage(
                `${errorMessage(error)} If money was debited, do not pay again; refresh shortly or contact support.`,
              );
            } finally {
              setBusy(false);
            }
          })();
        },

        modal: {
          ondismiss: () => {
            if (!verificationStarted) {
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
          className={secondary}
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
                onClick={() => buy(plan.id)}
                disabled={busy || !me.emailVerified}
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

function AdminDashboard() {
  const [data, setData] =
    useState<AdminResponse | null>(null);

  const [page, setPage] = useState(1);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);

    try {
      const result = await portalApi<AdminResponse>(
        `admin?page=${page}`,
      );

      setData(result);
      setMessage("");
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }, [page]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!data) {
    return (
      <p role="status">
        {message || "Loading admin dashboard…"}
      </p>
    );
  }

  const stats = [
    {
      label: "Registered portal users",
      value: data.totalUsers,
    },
    {
      label: "Active subscriptions",
      value: data.activeUsers,
    },
    {
      label: "Users with expired plans",
      value: data.expiredUsers,
    },
    {
      label: "Gross captured payments",
      value: formatMoney(data.totalRevenue),
    },
  ];

  return (
    <>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={load}
          disabled={busy}
          className={secondary}
        >
          {busy
            ? "Refreshing…"
            : "Refresh dashboard"}
        </button>

        {message && (
          <p role="status">{message}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <section
            key={stat.label}
            className="rounded-2xl border bg-white p-6"
          >
            <p className="text-sm text-slate-600">
              {stat.label}
            </p>

            <p className="mt-3 text-3xl font-extrabold">
              {stat.value}
            </p>
          </section>
        ))}
      </div>

      <AdminCharts data={data} />

      <section className="rounded-2xl border bg-white p-6">
        <h2 className="text-xl font-bold">
          Users and current plans
        </h2>

        <p className="mt-2 text-sm text-slate-600">
          Update completed change counts after fulfilling
          a user’s requests.
        </p>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b">
                {[
                  "User",
                  "Phone",
                  "Active plan",
                  "Expires",
                  "Changes used",
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
              {data.users.map((user) => (
                <tr
                  key={user.uid}
                  className="border-b align-top"
                >
                  <td className="p-3">
                    <p className="font-semibold">
                      {user.name}
                    </p>
                    <p className="text-slate-500">
                      {user.email}
                    </p>
                  </td>

                  <td className="p-3">
                    {user.phone || "—"}
                  </td>

                  <td className="p-3">
                    {user.active?.planName ||
                      "No active plan"}
                  </td>

                  <td className="p-3">
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
                      "—"
                    )}
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
            className={secondary}
          >
            Previous
          </button>

          <span>
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
            className={secondary}
          >
            Next
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
          className="w-20 rounded-lg border px-3 py-2"
          required
        />

        <span>/ {subscription.allowance}</span>

        <button
          type="submit"
          disabled={busy}
          className={secondary}
        >
          {busy ? "Saving…" : "Save"}
        </button>
      </div>

      {message && (
        <p
          role="status"
          className="mt-2 text-xs"
        >
          {message}
        </p>
      )}
    </form>
  );
}