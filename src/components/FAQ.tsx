"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { faqs } from "@/lib/site-data";

export default function FAQ() {
  const [open, setOpen] = useState(0);

  return (
    <div className="mx-auto mt-10 max-w-3xl divide-y divide-[#c3c6d1] border-y border-[#c3c6d1]">
      {faqs.map((faq, index) => (
        <div key={faq.question}>
          <button
            type="button"
            onClick={() => setOpen(open === index ? -1 : index)}
            className="flex w-full items-center justify-between gap-5 py-5 text-left font-semibold text-[#001b40]"
          >
            {faq.question}
            <ChevronDown className={`shrink-0 transition ${open === index ? "rotate-180" : ""}`} size={20} />
          </button>
          {open === index && <p className="pb-5 pr-8 text-sm leading-6 text-[#434750]">{faq.answer}</p>}
        </div>
      ))}
    </div>
  );
}
