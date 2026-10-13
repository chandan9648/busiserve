"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";

import { quoteSchema, type QuoteInput } from "@/lib/validation";
import { budgetRanges, enquiryOptions } from "@/lib/services-catalogue";

/**
 * The project enquiry form.
 *
 * Used in three places: the short form at the foot of /services, the
 * enquiry section on every service detail page, and anywhere a
 * "Request a quote" action lands. All three post to the same
 * /api/quote route and the same Firestore collection — the only
 * difference is which service arrives pre-selected and whether the
 * budget and requirements fields are shown.
 *
 * `defaultService` must match an entry in `enquiryOptions` exactly,
 * otherwise the select falls back to its first option. The values in
 * both come from the service catalogue, so they cannot drift apart.
 */
type Props = {
  /** Pre-selected service. Comes from the detail page, or ?service= in the URL. */
  defaultService?: string;
  /** Shows the budget range and requirements fields. */
  showProjectFields?: boolean;
  submitLabel?: string;
};

const isQuoteField = (value: unknown): value is keyof QuoteInput =>
  value === "firstName" ||
  value === "lastName" ||
  value === "email" ||
  value === "interest" ||
  value === "budget" ||
  value === "requirements";

export default function QuoteForm({
  defaultService,
  showProjectFields = false,
  submitLabel = "Request Quote",
}: Props) {
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const fieldId = useId();

  const resolvedDefault =
    defaultService && enquiryOptions.includes(defaultService)
      ? defaultService
      : enquiryOptions[0];

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<QuoteInput>({
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      interest: resolvedDefault,
      budget: budgetRanges[0],
      requirements: "",
    },
  });

  /*
   * A ?service= parameter pre-selects the service too, so that a
   * link from anywhere on the site can carry its context into the
   * form. Read from the location rather than useSearchParams, which
   * would force every page embedding this form behind a Suspense
   * boundary at prerender.
   */
  useEffect(() => {
    if (defaultService) return;

    const requested = new URLSearchParams(window.location.search).get(
      "service",
    );

    if (requested && enquiryOptions.includes(requested)) {
      setValue("interest", requested);
    }
  }, [defaultService, setValue]);

  async function onSubmit(values: QuoteInput) {
    clearErrors();
    setErrorMessage("");
    setStatus("idle");

    const parsed = quoteSchema.safeParse(values);

    if (!parsed.success) {
      const seen = new Set<string>();

      for (const issue of parsed.error.issues) {
        const field = issue.path[0];

        if (isQuoteField(field) && !seen.has(field)) {
          setError(
            field,
            { type: "validation", message: issue.message },
            { shouldFocus: seen.size === 0 },
          );
          seen.add(field);
        }
      }

      setErrorMessage("Please correct the highlighted fields.");
      setStatus("error");
      return;
    }

    setStatus("loading");

    try {
      const response = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      const result = await response.json().catch(() => null);

      /*
       * Only the server's own confirmation counts as success. A 429
       * from the rate limiter and a 500 both return a readable
       * message, and neither must be reported as submitted.
       */
      if (!response.ok || result?.success !== true) {
        setErrorMessage(
          typeof result?.error === "string"
            ? result.error
            : "Unable to submit your enquiry. Please try again.",
        );
        setStatus("error");
        return;
      }

      reset({
        firstName: "",
        lastName: "",
        email: "",
        interest: resolvedDefault,
        budget: budgetRanges[0],
        requirements: "",
      });

      setStatus("success");
    } catch {
      setErrorMessage(
        "Could not connect to the server. Check your connection and try again.",
      );
      setStatus("error");
    }
  }

  const busy = isSubmitting || status === "loading";

  return (
    <form
      noValidate
      onSubmit={handleSubmit(onSubmit)}
      className="min-w-0"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="First Name"
          htmlFor={`${fieldId}-first`}
          error={errors.firstName?.message}
        >
          <input
            id={`${fieldId}-first`}
            {...register("firstName")}
            autoComplete="given-name"
            placeholder="John"
            className="field"
            aria-invalid={Boolean(errors.firstName)}
            disabled={busy}
          />
        </Field>

        <Field
          label="Last Name"
          htmlFor={`${fieldId}-last`}
          error={errors.lastName?.message}
        >
          <input
            id={`${fieldId}-last`}
            {...register("lastName")}
            autoComplete="family-name"
            placeholder="Doe"
            className="field"
            aria-invalid={Boolean(errors.lastName)}
            disabled={busy}
          />
        </Field>
      </div>

      <div className="mt-4">
        <Field
          label="Work Email"
          htmlFor={`${fieldId}-email`}
          error={errors.email?.message}
        >
          <input
            id={`${fieldId}-email`}
            type="email"
            {...register("email")}
            autoComplete="email"
            placeholder="john@company.com"
            className="field"
            aria-invalid={Boolean(errors.email)}
            disabled={busy}
          />
        </Field>
      </div>

      <div className="mt-4">
        <Field
          label="Service you need"
          htmlFor={`${fieldId}-service`}
          error={errors.interest?.message}
        >
          <select
            id={`${fieldId}-service`}
            {...register("interest")}
            /*
             * Set on the element as well as in the form's default
             * values, so the DOM and the form state agree from the
             * first render. React applies a select's defaultValue on
             * hydration rather than serialising it into the HTML,
             * which is soon enough: the form submits over fetch and
             * so needs JavaScript regardless.
             */
            defaultValue={resolvedDefault}
            className="field"
            aria-invalid={Boolean(errors.interest)}
            disabled={busy}
          >
            {enquiryOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {showProjectFields && (
        <>
          <div className="mt-4">
            <Field
              label="Budget range"
              htmlFor={`${fieldId}-budget`}
              hint="Optional. A range is enough to shape the proposal."
              error={errors.budget?.message}
            >
              <select
                id={`${fieldId}-budget`}
                {...register("budget")}
                className="field"
                aria-invalid={Boolean(errors.budget)}
                disabled={busy}
              >
                {budgetRanges.map((range) => (
                  <option key={range} value={range}>
                    {range}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="mt-4">
            <Field
              label="What do you need?"
              htmlFor={`${fieldId}-requirements`}
              hint="Optional. A few lines about the project is a fine start."
              error={errors.requirements?.message}
            >
              <textarea
                id={`${fieldId}-requirements`}
                {...register("requirements")}
                rows={5}
                placeholder="What you want to build or improve, and anything you already use."
                className="field resize-y"
                aria-invalid={Boolean(errors.requirements)}
                disabled={busy}
              />
            </Field>
          </div>
        </>
      )}

      <button
        type="submit"
        disabled={busy}
        className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#ff8927] px-5 py-3 font-semibold text-[#311400] transition-colors hover:bg-[#964900] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#964900] disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
      >
        {busy ? "Submitting…" : submitLabel}
      </button>

      <p aria-live="polite" className="min-h-0">
        {status === "success" && (
          <span className="mt-3 block text-sm font-semibold text-green-700">
            Thanks — your enquiry has been received. We will reply by email.
          </span>
        )}
      </p>

      {status === "error" && (
        <p role="alert" className="mt-3 text-sm font-semibold text-red-700">
          {errorMessage}
        </p>
      )}
    </form>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <label
        htmlFor={htmlFor}
        className="mb-2 block text-xs font-semibold text-[#181c1e]"
      >
        {label}
      </label>

      {children}

      {hint && !error && (
        <span className="mt-1 block text-xs text-[#434750]">{hint}</span>
      )}

      {error && (
        <span role="alert" className="mt-1 block text-xs text-red-700">
          {error}
        </span>
      )}
    </div>
  );
}
