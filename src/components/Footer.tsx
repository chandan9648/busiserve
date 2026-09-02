import Link from "next/link";
import { Linkedin, Twitter, Github } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-[#001b40] text-white">
      <div className="container-site grid gap-10 py-14 md:grid-cols-4">
        <div className="md:col-span-1">
          <Link href="/" className="text-xl font-extrabold">
            Busiserve
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-6 text-[#d7e3ff]">
            Delivering structured growth through expert digital solutions and professional engineering.
          </p>
          <p className="mt-5 text-sm text-[#aac7ff]">© 2024 Busiserve. All rights reserved.</p>
        </div>

        <div>
          <h3 className="font-bold">Company</h3>
          <div className="mt-4 flex flex-col gap-3 text-sm text-[#d7e3ff]">
            <Link href="/about" className="hover:text-white">About Us</Link>
            <Link href="/about#team" className="hover:text-white">Careers</Link>
            <a href={process.env.NEXT_PUBLIC_LINKEDIN_URL ?? "#"} className="hover:text-white">LinkedIn</a>
          </div>
        </div>

        <div>
          <h3 className="font-bold">Services</h3>
          <div className="mt-4 flex flex-col gap-3 text-sm text-[#d7e3ff]">
            <Link href="/services" className="hover:text-white">Web Development</Link>
            <Link href="/services" className="hover:text-white">App Development</Link>
            <Link href="/services" className="hover:text-white">CRM Solutions</Link>
            <Link href="/case-studies" className="hover:text-white">Resources</Link>
          </div>
        </div>

        <div>
          <h3 className="font-bold">Legal</h3>
          <div className="mt-4 flex flex-col gap-3 text-sm text-[#d7e3ff]">
            <Link href="/privacy" className="hover:text-white">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white">Terms of Service</Link>
            <a href={process.env.NEXT_PUBLIC_GITHUB_URL ?? "#"} className="flex items-center gap-2 hover:text-white">
              <Github size={15} /> GitHub
            </a>
            <a href={process.env.NEXT_PUBLIC_TWITTER_URL ?? "#"} className="flex items-center gap-2 hover:text-white">
              <Twitter size={15} /> Twitter
            </a>
            <a href={process.env.NEXT_PUBLIC_LINKEDIN_URL ?? "#"} className="flex items-center gap-2 hover:text-white">
              <Linkedin size={15} /> LinkedIn
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
