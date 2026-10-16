import Link from "next/link";

import {
  businessIdentity,
  displayPhone,
} from "@/lib/site-data";

/**
 * The operator block that heads each policy page.
 *
 * Every field here is a detail already published on the contact page
 * or in the site's structured data. The registered entity name and
 * the tax registration are rendered only when an operator has set
 * them in the environment, because an invented registration number
 * is the kind of inconsistency a payment-gateway review looks for.
 */
export default function LegalIdentity({
  role,
}: {
  /** How this business relates to the policy, e.g. "the service provider". */
  role: string;
}) {
  const rows: { label: string; value: React.ReactNode }[] = [
    {
      label: "Business name",
      value: businessIdentity.tradingName,
    },

    ...(businessIdentity.legalName
      ? [
          {
            label: "Registered name",
            value: businessIdentity.entityType
              ? `${businessIdentity.legalName} (${businessIdentity.entityType})`
              : businessIdentity.legalName,
          },
        ]
      : []),

    ...(businessIdentity.gstin
      ? [{ label: "GSTIN", value: businessIdentity.gstin }]
      : []),

    {
      label: "Address",
      value: businessIdentity.address,
    },

    {
      label: "Support email",
      value: (
        <a href={`mailto:${businessIdentity.email}`}>
          {businessIdentity.email}
        </a>
      ),
    },

    {
      label: "Support phone",
      value: (
        <a href={`tel:${businessIdentity.phone}`}>
          {displayPhone(businessIdentity.phone)}
        </a>
      ),
    },

    {
      label: "Website",
      value: (
        <Link href="/">busiserve.in</Link>
      ),
    },
  ];

  return (
    <div className="mt-8 rounded-2xl border border-[#dce3ec] bg-[#f3f6fa] p-6 md:p-8">
      <h2 className="text-lg font-bold text-[#001b40]">
        Who this policy applies to
      </h2>

      <p className="mt-2 text-sm leading-7">
        This policy is issued by the business below, referred to in
        this document as {role}.
      </p>

      <dl className="mt-5 grid gap-x-8 gap-y-4 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label}>
            <dt className="text-xs font-bold uppercase tracking-[0.12em] text-[#964900]">
              {row.label}
            </dt>

            <dd className="mt-1 break-words text-sm leading-6 text-[#181c1e]">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>

      <p className="mt-5 text-xs leading-6 text-[#434750]">
        Support enquiries are received at the email address and phone
        number above, and through the{" "}
        <Link href="/contact">contact page</Link>.
      </p>
    </div>
  );
}
