"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import type { QuoteInput } from "@/lib/validation";

const interests = ["Web Development", "App Development", "CMS Development", "CRM Solutions", "Other / Not Sure"];

export default function QuoteForm() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const { register, handleSubmit, reset, formState: { errors } } = useForm<QuoteInput>();

  async function onSubmit(values: QuoteInput) {
    setStatus("loading");
    try {
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error("Request failed");
      reset();
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="rounded-md border border-[#c3c6d1] bg-white p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="First Name" error={errors.firstName?.message} {...register("firstName", { required: "Required" })} placeholder="John" />
        <Input label="Last Name" error={errors.lastName?.message} {...register("lastName", { required: "Required" })} placeholder="Doe" />
      </div>
      <Input label="Work Email" error={errors.email?.message} {...register("email", { required: "Required" })} placeholder="john@company.com" className="mt-4" />
      <label className="mt-4 block">
        <span className="mb-2 block text-xs font-semibold">Primary Interest</span>
        <select {...register("interest")} className="field">
          {interests.map((interest) => <option key={interest}>{interest}</option>)}
        </select>
      </label>

      <button disabled={status === "loading"} className="mt-4 w-full rounded-sm bg-[#ff8927] px-5 py-3 text-sm font-semibold text-[#311400] hover:bg-[#964900] hover:text-white disabled:opacity-60">
        {status === "loading" ? "Submitting..." : "Request Quote"}
      </button>

      {status === "success" && <p className="mt-3 text-xs font-semibold text-green-700">Quote request submitted successfully.</p>}
      {status === "error" && <p className="mt-3 text-xs font-semibold text-red-700">Unable to submit. Please try again.</p>}
    </form>
  );
}

function Input({
  label,
  error,
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-xs font-semibold">{label}</span>
      <input {...props} className="field" />
      {error && <span className="mt-1 block text-xs text-red-700">{error}</span>}
    </label>
  );
}
