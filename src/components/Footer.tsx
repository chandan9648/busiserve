import Link from "next/link";

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
            <Link
              href="/services"
              className="transition-colors hover:text-white"
            >
              Web Development
            </Link>

            <Link
              href="/services"
              className="transition-colors hover:text-white"
            >
              App Development
            </Link>

            <Link
              href="/services"
              className="transition-colors hover:text-white"
            >
              CMS Development
            </Link>

            <Link
              href="/services"
              className="transition-colors hover:text-white"
            >
              CRM Solutions
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