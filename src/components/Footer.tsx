import Link from "next/link";

import {
  serviceCardTitle,
  serviceCatalogue,
  servicePath,
} from "@/lib/services-catalogue";

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

            <a
              href={process.env.LINKEDIN_URL ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-white"
            >
              LinkedIn
            </a>

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
