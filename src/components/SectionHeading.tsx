import type { ReactNode } from "react";

export default function SectionHeading({
  eyebrow,
  title,
  description,
  centered = false,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  centered?: boolean;
}) {
  return (
    <div className={centered ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
      {eyebrow && (
        <span className="mb-4 inline-flex rounded-sm bg-[#e5e8eb] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#001b40]">
          {eyebrow}
        </span>
      )}
      <h1 className="text-4xl font-extrabold tracking-tight text-[#001b40] md:text-5xl">{title}</h1>
      {description && (
        <p className="mt-5 text-lg leading-7 text-[#434750]">{description}</p>
      )}
    </div>
  );
}
