"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import type { ContactInput } from "@/lib/validation";
import { Send } from "lucide-react";

const subjects = ["General Inquiry", "Web Development", "App Development", "CMS Development", "CRM Solutions", "Partnership"];

export default function ContactForm() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ContactInput>({
    defaultValues: { subject: "General Inquiry" },
  });

  async function onSubmit(values: ContactInput) {
    setStatus("loading");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error("Request failed");
      reset({ fullName: "", email: "", subject: "General Inquiry", message: "" });
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="rounded-md border border-[#c3c6d1] bg-white p-7 md:p-10">
      <h2 className="text-2xl font-bold text-[#001b40]">Send a Message</h2>

      <div className="mt-7 grid gap-5 md:grid-cols-2">
        <Field label="Full Name" error={errors.fullName?.message}>
          <input {...register("fullName", { required: "Full name is required" })} placeholder="John Doe" className="field" />
        </Field>
        <Field label="Work Email" error={errors.email?.message}>
          <input type="email" {...register("email", { required: "Email is required" })} placeholder="john@company.com" className="field" />
        </Field>
      </div>

      <div className="mt-5">
        <Field label="Subject" error={errors.subject?.message}>
          <select {...register("subject")} className="field">
            {subjects.map((subject) => <option key={subject}>{subject}</option>)}
          </select>
        </Field>
      </div>

      <div className="mt-5">
        <Field label="Message" error={errors.message?.message}>
          <textarea {...register("message", { required: "Message is required" })} rows={7} placeholder="How can we help you achieve your goals?" className="field resize-none" />
        </Field>
      </div>

      <button
        disabled={status === "loading"}
        className="mt-7 inline-flex items-center gap-2 rounded-md bg-[#ff8927] px-7 py-3.5 font-semibold text-[#311400] transition hover:bg-[#964900] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "loading" ? "Sending..." : "Send Message"} <Send size={17} />
      </button>

      {status === "success" && <p className="mt-4 text-sm font-semibold text-green-700">Thanks — your message has been received.</p>}
      {status === "error" && <p className="mt-4 text-sm font-semibold text-red-700">Something went wrong. Please try again.</p>}
    </form>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-[#181c1e]">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-red-700">{error}</span>}
    </label>
  );
}
