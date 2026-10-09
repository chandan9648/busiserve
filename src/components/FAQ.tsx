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
            aria-expanded={open === index}
            aria-controls={`faq-answer-${index}`}
            className="flex w-full items-center justify-between gap-5 py-5 text-left font-semibold text-[#001b40]"
          >
            {faq.question}
            <ChevronDown className={`shrink-0 transition ${open === index ? "rotate-180" : ""}`} size={20} />
          </button>
          {/*
            Every answer stays in the markup and is hidden with
            `hidden` rather than being conditionally rendered. The
            FAQPage structured data on this page declares all four
            answers, and Google requires the same text to be present
            in the page itself — rendering only the open one left the
            other three invisible to a crawler.
          */}
          <p
            id={`faq-answer-${index}`}
            hidden={open !== index}
            className="pb-5 pr-8 text-sm leading-6 text-[#434750]"
          >
            {faq.answer}
          </p>
        </div>
      ))}
    </div>
  );
}
