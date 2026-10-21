import type { Metadata } from "next";
import Link from "next/link";

import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import LegalIdentity from "@/components/LegalIdentity";
import { breadcrumbSchema, pageMetadata } from "@/lib/seo";
import { businessIdentity, displayPhone } from "@/lib/site-data";

export const metadata: Metadata = pageMetadata({
  title: "Privacy Policy",
  description:
    "How Busiserve Infotech Solution collects, uses, shares and protects personal information across our website, client portal and payment flow.",
  path: "/privacy",
  keywords: ["privacy policy", "data protection"],
});

export default function PrivacyPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Privacy Policy", path: "/privacy" },
        ])}
      />

      <main
        id="main-content"
        tabIndex={-1}
        className="container-site prose-brand section-gap"
      >
      <h1 className="text-4xl font-extrabold text-[#001b40]">Privacy Policy</h1>
      <p className="mt-6"><strong>Effective date:</strong> October 16, 2026</p>
      <p>
        Busiserve (&quot;Busiserve&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) respects your privacy.
        This Privacy Policy explains how we collect, use, disclose, and protect
        information when you visit our website, contact us, request a quote,
        create an account, use the portal, or purchase a plan.
      </p>

      <LegalIdentity role="the data fiduciary for the information described here" />

      <h2 className="mt-10 text-2xl font-bold text-[#001b40]">Information we collect</h2>
      <p>Depending on how you use the website, we may collect:</p>
      <ul>
        <li><strong>Contact and quote information:</strong> your name, work email address, subject, message, service interest, and information you choose to include about your project.</li>
        <li><strong>Account information:</strong> your name, email address, password credentials, email-verification status, and account or portal activity. Passwords are processed by our authentication provider and are not available to us in readable form.</li>
        <li><strong>Purchase information:</strong> selected plan, order number, payment status, amount, currency, and payment or verification identifiers. Payment card and banking details are handled by Razorpay and are not stored by Busiserve.</li>
        <li><strong>Technical information:</strong> browser and device type, pages visited, approximate usage times, referral information, and error or security logs when these are made available by the hosting and security services we use.</li>
        <li><strong>Visit counting:</strong> to count unique visits we combine your IP address, your browser&apos;s user-agent string and the date into a one-way hash. Only that hash is stored; we do not keep the IP address or the user-agent string themselves, and the hash cannot be reversed to identify you.</li>
        <li><strong>Security events:</strong> where a request is refused by our access controls — for example a payment confirmation whose signature does not match, repeated failed sign-ins, or automated scanning of our website — we record the event so we can investigate abuse. These records hold the requesting address only in masked form (such as <code>203.0.113.x</code>) together with a short one-way digest of it, not the full address. The full address may still appear in our hosting provider&apos;s own request logs, which that provider retains under its own terms.</li>
        <li><strong>Communications:</strong> correspondence, support requests, and responses to messages from us.</li>
      </ul>

      <h2 className="mt-10 text-2xl font-bold text-[#001b40]">How we use information</h2>
      <p>We use information to:</p>
      <ul>
        <li>respond to enquiries and quote requests;</li>
        <li>understand project requirements and prepare proposals;</li>
        <li>create, authenticate, maintain, and secure portal accounts;</li>
        <li>process plan orders, verify payments, and provide purchased services;</li>
        <li>send service, account, security, and transaction communications;</li>
        <li>operate, troubleshoot, improve, and secure the website and portal;</li>
        <li>prevent fraud, abuse, unauthorized access, and other harmful activity;</li>
        <li>comply with legal obligations and enforce our agreements; and</li>
        <li>send relevant business updates where permitted by law. You may opt out of non-essential marketing communications at any time.</li>
      </ul>

      <h2 className="mt-10 text-2xl font-bold text-[#001b40]">Legal bases for processing</h2>
      <p>
        Where data-protection law requires a legal basis, we process information
        to perform a contract or take steps at your request, to comply with law,
        for our legitimate interests in operating and protecting the business,
        or with your consent. You may withdraw consent where processing is based
        on consent, although this will not affect earlier lawful processing.
      </p>

      <h2 className="mt-10 text-2xl font-bold text-[#001b40]">Cookies and similar technologies</h2>
      <p>
        The website may use essential cookies, local storage, or similar
        technologies to keep accounts secure, maintain sessions, remember
        necessary preferences, and support payment or portal functionality. We
        may also receive limited technical data from hosting, security, and
        performance services. Where consent is required for non-essential
        cookies, we will request it and provide available controls. Blocking
        essential technologies may prevent parts of the website from working.
      </p>

      <h2 className="mt-10 text-2xl font-bold text-[#001b40]">When we share information</h2>
      <p>
        We may share information with service providers that help us host the
        website, authenticate users, deliver email, process payments, store
        data, provide security, or operate our business. These providers may
        process information only for the services they provide to us. We may
        also disclose information when required by law, to protect rights and
        safety, to investigate fraud or abuse, or as part of a merger,
        acquisition, financing, or sale of business assets. We do not sell your
        personal information.
      </p>

      <h2 className="mt-10 text-2xl font-bold text-[#001b40]">The providers we actually use</h2>
      <p>
        We keep this list specific rather than general, so that you can
        read each provider&apos;s own policy. Each one processes
        information only for the function described:
      </p>
      <ul>
        <li><strong>Google Firebase</strong> (Google LLC / Google Cloud) — account authentication, email verification and password reset, and the database that stores accounts, enquiries, orders and subscription records.</li>
        <li><strong>Razorpay</strong> (Razorpay Software Private Limited) — payment processing. Card, UPI, netbanking and wallet details are entered in Razorpay&apos;s checkout and are handled by Razorpay under its own privacy policy and terms. Busiserve never receives or stores your card number, CVV, UPI PIN or banking credentials.</li>
        <li><strong>Resend</strong> (Resend, Inc.) — sending transactional email such as order confirmations and invoices.</li>
        <li><strong>Vercel</strong> (Vercel Inc.) — website and application hosting, including request and error logs generated in the normal course of serving the site.</li>
      </ul>
      <p>
        These providers may process information outside your country,
        including outside India. We rely on their contractual terms and
        safeguards for such transfers. If we add or replace a provider
        that handles personal information, we update this list.
      </p>

      <h2 className="mt-10 text-2xl font-bold text-[#001b40]">Payment information in detail</h2>
      <p>
        Payments are initiated through Razorpay. From a completed or
        attempted payment we receive and retain the order reference,
        plan name, amount, currency, payment and signature identifiers,
        payment status, invoice number and the email address on the
        account. We use these to confirm an order, activate the plan you
        bought, issue your invoice, handle refund or chargeback
        requests, detect fraudulent payment attempts, and meet
        accounting and tax obligations. How a cancellation or refund is
        handled is set out in our{" "}
        <Link href="/refund-policy">
          Refund &amp; Cancellation Policy
        </Link>
        .
      </p>

      <h2 className="mt-10 text-2xl font-bold text-[#001b40]">Data retention and security</h2>
      <p>
        We retain information only for as long as reasonably necessary for the
        purposes described here, including responding to enquiries, maintaining
        active accounts, completing transactions, resolving disputes, enforcing
        agreements, and meeting legal, tax, accounting, or security obligations.
        Retention periods depend on the type of information and our legal duties.
        We use reasonable administrative, technical, and organizational measures
        to protect information, but no online service can be guaranteed to be
        completely secure.
      </p>

      <h2 className="mt-10 text-2xl font-bold text-[#001b40]">Your choices and rights</h2>
      <p>
        Subject to applicable law, you may ask us to access, correct, delete, or
        restrict use of your personal information, object to certain processing,
        receive a portable copy, or withdraw consent. You may also unsubscribe
        from non-essential emails. To make a request, contact us using the
        details on our Contact page. We may need to verify your identity before
        completing a request. You may have the right to complain to your local
        data-protection authority.
      </p>

      <h2 className="mt-10 text-2xl font-bold text-[#001b40]">Children&apos;s privacy</h2>
      <p>
        Our services are intended for businesses and adults. We do not knowingly
        collect personal information from children under the age required by
        applicable law. If you believe a child has provided information to us,
        please contact us so we can review and delete it where appropriate.
      </p>

      <h2 className="mt-10 text-2xl font-bold text-[#001b40]">Changes to this policy</h2>
      <p>
        We may update this policy when our services, providers, or legal
        obligations change. The updated version will be posted on this page with
        a new effective date. Your continued use of the website after an update
        means the updated policy applies to future use.
      </p>

      <h2 className="mt-10 text-2xl font-bold text-[#001b40]">Contact us about privacy</h2>
      <p>
        For privacy questions, data requests or a privacy complaint,
        write to{" "}
        <a href={`mailto:${businessIdentity.email}`}>
          {businessIdentity.email}
        </a>{" "}
        with the subject line &quot;Privacy request&quot;, call{" "}
        <a href={`tel:${businessIdentity.phone}`}>
          {displayPhone(businessIdentity.phone)}
        </a>
        , or use our <Link href="/contact">contact page</Link>. Postal
        address: {businessIdentity.tradingName},{" "}
        {businessIdentity.address}.
      </p>
      <p>
        Requests sent to this address are handled by the person
        responsible for privacy and grievances at Busiserve. We confirm
        receipt and respond in writing. If you are not satisfied with
        the outcome, you may escalate to the data-protection or consumer
        authority with jurisdiction over you.
      </p>
      <p>
        See also our <Link href="/terms">Terms of Service</Link> and{" "}
        <Link href="/refund-policy">
          Refund &amp; Cancellation Policy
        </Link>
        .
      </p>
      </main>

      <Footer />
    </>
  );
}
