import { ArrowRight } from "lucide-react";
import Link from "next/link";

type CaseStudyCardProps = {
  category: string;
  title: string;
  description: string;
  image: string;
  href?: string;
  imageAlt?: string;
};

export default function CaseStudyCard({
  category,
  title,
  description,
  image,
  href = "/case-studies",
  imageAlt,
}: CaseStudyCardProps) {
  return (
    <article className="group flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-[#dce3ec] bg-white shadow-sm transition-[border-color,box-shadow] duration-300 hover:border-[#e8a571] hover:shadow-lg focus-within:border-[#964900] motion-reduce:transition-none">
      <div className="relative aspect-[16/10] shrink-0 overflow-hidden border-b border-[#e5ebf2] bg-[#eef3fa]">
        <img
          src={image}
          alt={imageAlt ?? title}
          width={800}
          height={500}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-500 ease-out motion-safe:group-hover:scale-105 motion-reduce:transition-none"
        />

        <span className="absolute left-4 top-4 max-w-[calc(100%-2rem)] break-words rounded-full border border-white/20 bg-[#001b40] px-3.5 py-1.5 text-xs font-semibold leading-5 tracking-wide text-white shadow-sm">
          {category}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-6 sm:p-7">
        <h3 className="break-words text-xl font-extrabold leading-snug tracking-tight text-[#001b40] sm:text-2xl">
          {title}
        </h3>

        <p className="mt-3 break-words text-base leading-7 text-[#434750]">
          {description}
        </p>

        <div className="mt-auto pt-7">
          <Link
            href={href}
            className="flex min-h-12 items-center justify-between gap-4 rounded-lg border border-[#dce3ec] bg-[#f7f9fc] px-4 py-3 text-sm font-bold text-[#001b40] transition-colors hover:border-[#e8a571] hover:bg-[#fff0e4] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#964900] motion-reduce:transition-none"
          >
            <span>
              {href === "/case-studies"
                ? "Explore case studies"
                : "View case study"}
              <span className="sr-only">: {title}</span>
            </span>

            <ArrowRight
              size={18}
              className="shrink-0"
              aria-hidden="true"
            />
          </Link>
        </div>
      </div>
    </article>
  );
}