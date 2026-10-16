import Link from "next/link";

import {
  serviceCardTitle,
  serviceCatalogue,
  servicePath,
} from "@/lib/services-catalogue";
import { businessIdentity, displayPhone } from "@/lib/site-data";

/**
 * The services listed in the footer.
 *
 * A subset, kept to the length the column was already designed for.
 * The labels come from the catalogue so they cannot drift from the
 * service pages they point at.
 */
const footerServices = [
  "web-development",
  "wordpress-development",
  "shopify-development",
  "app-development",
  "crm-development",
]
  .map((slug) => serviceCatalogue.find((service) => service.slug === slug))
  .filter((service): service is NonNullable<typeof service> =>
    Boolean(service),
  )
  .map((service) => ({
    href: servicePath(service.slug),
    label: serviceCardTitle(service),
  }));

export default function Footer() {
  return (
    <footer className="bg-[#001b40] text-white">
      <div className="container-site grid gap-10 py-14 md:grid-cols-4">
        {/* Brand */}
        <div className="md:col-span-1">
          <Link
            href="/"
            className="text-xl font-extrabold tracking-tight"
          >
            Busiserve
          </Link>

          <p className="mt-4 max-w-xs text-sm leading-6 text-[#d7e3ff]">
            Delivering structured growth through expert Infotech Solution and
            professional engineering.
          </p>

          {/*
            Operator name, address and support contact.

            These belong in the footer rather than only on the
            contact page: a visitor deciding whether to pay, and a
            payment provider reviewing the site, both look for them
            on whichever page they happen to be on.
          */}
          <address className="mt-5 not-italic text-sm leading-6 text-[#d7e3ff]">
            <span className="block font-semibold text-white">
              {businessIdentity.tradingName}
            </span>

            <span className="mt-1 block max-w-xs">
              {businessIdentity.address}
            </span>

            <a
              href={`mailto:${businessIdentity.email}`}
              className="mt-2 block break-all transition-colors hover:text-white"
            >
              {businessIdentity.email}
            </a>

            <a
              href={`tel:${businessIdentity.phone}`}
              className="block transition-colors hover:text-white"
            >
              {displayPhone(businessIdentity.phone)}
            </a>
          </address>

          <p className="mt-5 text-sm text-[#aac7ff]">
            © {new Date().getFullYear()} Busiserve. All rights reserved.
          </p>
        </div>

        {/* Company */}
        <div>
          <h3 className="font-bold text-white">
            Company
          </h3>

          <div className="mt-4 flex flex-col gap-3 text-sm text-[#d7e3ff]">
            <Link
              href="/about"
              className="transition-colors hover:text-white"
            >
              About Us
            </Link>

            <Link
              href="/pricing"
              className="transition-colors hover:text-white"
            >
              Pricing
            </Link>

            <Link
              href="/contact"
              className="transition-colors hover:text-white"
            >
              Contact Us
            </Link>

            <Link
              href="/about#team"
              className="transition-colors hover:text-white"
            >
              Careers
            </Link>

            <a
              href={process.env.LINKEDIN_URL ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-white"
            >
              LinkedIn
            </a>
          </div>
        </div>

        {/* Services */}
        <div>
          <h3 className="font-bold text-white">
            Services
          </h3>

          <div className="mt-4 flex flex-col gap-3 text-sm text-[#d7e3ff]">
            {/*
              Each of these now points at the service's own page
              rather than the services index, so the footer carries
              real internal links instead of five copies of one.
            */}
            {footerServices.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="transition-colors hover:text-white"
              >
                {item.label}
              </Link>
            ))}

            <Link
              href="/services"
              className="transition-colors hover:text-white"
            >
              All services
            </Link>

            <Link
              href="/case-studies"
              className="transition-colors hover:text-white"
            >
              Resources
            </Link>
          </div>
        </div>

        {/* Legal */}
        <div>
          <h3 className="font-bold text-white">
            Legal
          </h3>

          <div className="mt-4 flex flex-col gap-3 text-sm text-[#d7e3ff]">
            <Link
              href="/privacy"
              className="transition-colors hover:text-white"
            >
              Privacy Policy
            </Link>

            <Link
              href="/terms"
              className="transition-colors hover:text-white"
            >
              Terms of Service
            </Link>

            {/*
              A purchaser must be able to reach the refund rules from
              any page, and the LinkedIn link that used to sit here
              was already in the Company column above.
            */}
            <Link
              href="/refund-policy"
              className="transition-colors hover:text-white"
            >
              Refund &amp; Cancellation Policy
            </Link>

            {/* <a
              href={process.env.TWITTER_URL ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-white"
            >
              Twitter
            </a> */}

            {/* <a
              href={process.env.GITHUB_URL ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-white"
            >
              GitHub
            </a> */}
          </div>
        </div>
      </div>
    </footer>
  );
}
