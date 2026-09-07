"use client";

import { useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { contactSchema, type ContactInput } from "@/lib/validation";
import { Send } from "lucide-react";

const subjects = [
  "General Inquiry",
  "Web Development",
  "App Development",
  "CMS Development",
  "CRM Solutions",
  "Partnership",
];

const defaultValues: ContactInput = {
  fullName: "",
  email: "",
  subject: "General Inquiry",
  message: "",
};

function isContactField(value: unknown): value is keyof ContactInput {
  return (
    value === "fullName" ||
    value === "email" ||
    value === "subject" ||
    value === "message"
  );
}

export default function ContactForm() {
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<ContactInput>({
    defaultValues,
  });

  async function onSubmit(values: ContactInput) {
    clearErrors();
    setErrorMessage("");
    setStatus("idle");

    const parsed = contactSchema.safeParse(values);

    if (!parsed.success) {
      const seenFields = new Set<string>();

      for (const issue of parsed.error.issues) {
        const field = issue.path[0];

        if (isContactField(field) && !seenFields.has(field)) {
          setError(
            field,
            {
              type: "validation",
              message: issue.message,
            },
            { shouldFocus: seenFields.size === 0 }
          );
          seenFields.add(field);
        }
      }

      setErrorMessage("Please correct the highlighted fields.");
      setStatus("error");
      return;
    }

    setStatus("loading");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(parsed.data),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || result?.success !== true) {
        if (Array.isArray(result?.details)) {
          for (const detail of result.details) {
            if (
              isContactField(detail?.field) &&
              typeof detail?.message === "string"
            ) {
              setError(detail.field, {
                type: "server",
                message: detail.message,
              });
            }
          }
        }

        setErrorMessage(
          typeof result?.error === "string"
            ? result.error
            : "Unable to submit your message. Please try again."
        );
        setStatus("error");
        return;
      }

      reset(defaultValues);
      setStatus("success");
    } catch {
      setErrorMessage(
        "Could not connect to the server. Check your connection and try again."
      );
      setStatus("error");
    }
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit(onSubmit)}
      className="rounded-md border border-[#c3c6d1] bg-white p-7 md:p-10"
    >
      <h2 className="text-2xl font-bold text-[#001b40]">
        Send a Message
      </h2>

      <div className="mt-7 grid gap-5 md:grid-cols-2">
        <Field label="Full Name" error={errors.fullName?.message}>
          <input
            {...register("fullName")}
            autoComplete="name"
            placeholder="John Doe"
            className="field"
            aria-invalid={Boolean(errors.fullName)}
            disabled={isSubmitting}
          />
        </Field>

        <Field label="Work Email" error={errors.email?.message}>
          <input
            type="email"
            {...register("email")}
            autoComplete="email"
            placeholder="john@company.com"
            className="field"
            aria-invalid={Boolean(errors.email)}
            disabled={isSubmitting}
          />
        </Field>
      </div>

      <div className="mt-5">
        <Field label="Subject" error={errors.subject?.message}>
          <select
            {...register("subject")}
            className="field"
            aria-invalid={Boolean(errors.subject)}
            disabled={isSubmitting}
          >
            {subjects.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="mt-5">
        <Field label="Message" error={errors.message?.message}>
          <textarea
            {...register("message")}
            rows={7}
            placeholder="How can we help you achieve your goals?"
            className="field resize-none"
            aria-invalid={Boolean(errors.message)}
            disabled={isSubmitting}
          />
        </Field>

        <p className="mt-2 text-xs text-[#434750]">
          Please enter at least 10 characters.
        </p>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-7 inline-flex items-center gap-2 rounded-md bg-[#ff8927] px-7 py-3.5 font-semibold text-[#311400] transition hover:bg-[#964900] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Sending..." : "Send Message"}
        <Send size={17} aria-hidden="true" />
      </button>

      {status === "success" && (
        <p
          role="status"
          className="mt-4 text-sm font-semibold text-green-700"
        >
          Thanks — your message has been received.
        </p>
      )}

      {status === "error" && (
        <p
          role="alert"
          className="mt-4 text-sm font-semibold text-red-700"
        >
          {errorMessage}
        </p>
      )}
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-[#181c1e]">
        {label}
      </span>

      {children}

      {error && (
        <span role="alert" className="mt-1 block text-xs text-red-700">
          {error}
        </span>
      )}
    </label>
  );
}