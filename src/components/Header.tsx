"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { navItems } from "@/lib/site-data";

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-50 border-b border-[#c3c6d1] bg-[#f7fafd]/95 backdrop-blur">
      <div className="container-site flex h-20 items-center justify-between">
        <Link href="/" className="focus-ring flex items-center gap-2" onClick={() => setOpen(false)}>
          <img src="/logo.svg" alt="Busiserve" className="h-9 w-auto" />
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Primary navigation">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`relative py-2 text-[15px] transition-colors ${
                isActive(item.href)
                  ? "font-bold text-[#001b40] after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-[#964900]"
                  : "text-[#434750] hover:text-[#001b40]"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Link
          href="/contact"
          className="hidden rounded-md bg-[#ff8927] px-6 py-3 text-sm font-semibold tracking-wide text-white transition hover:bg-[#964900] md:inline-flex"
        >
          Contact Us
        </Link>

        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="focus-ring rounded-md p-2 text-[#001b40] md:hidden"
        >
          {open ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {open && (
        <div className="border-t border-[#c3c6d1] bg-[#f7fafd] px-5 py-5 md:hidden">
          <nav className="container-site flex flex-col gap-2" aria-label="Mobile navigation">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`rounded-md px-3 py-3 ${
                  isActive(item.href)
                    ? "bg-[#e5e8eb] font-semibold text-[#001b40]"
                    : "text-[#434750]"
                }`}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/contact"
              onClick={() => setOpen(false)}
              className="mt-2 rounded-md bg-[#ff8927] px-4 py-3 text-center font-semibold text-white"
            >
              Contact Us
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
