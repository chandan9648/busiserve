import type { Metadata } from "next";
import Link from "next/link";

import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import LegalIdentity from "@/components/LegalIdentity";
import { breadcrumbSchema, pageMetadata } from "@/lib/seo";
import { businessIdentity, displayPhone } from "@/lib/site-data";

export const metadata: Metadata = pageMetadata({
  title: "Terms of Service",
  description:
    "The terms governing use of the Busiserve Infotech Solution website, client portal, quote process and related development services.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Terms of Service", path: "/terms" },
        ])}
      />

      <main
        id="main-content"
        tabIndex={-1}
        className="container-site prose-brand section-gap"
      >
      <h1 className="text-4xl font-extrabold text-[#001b40]">Terms of Service</h1>
      <p className="mt-6"><strong>Effective date:</strong> October 16, 2026</p>
      <p>
        These Terms of Service (&quot;Terms&quot;) govern your access to and use of the
        Busiserve website, portal, quote process, and related services. By using
        the website, creating an account, requesting a quote, or placing an
        order, you agree to these Terms. If you use Busiserve on behalf of a
        company, you confirm that you have authority to bind that company.
      </p>

      <LegalIdentity role="the service provider" />

      <h2 className="mt-10 text-2xl font-bold text-[#001b40]">Our services</h2>
      <p>
        Busiserve provides technology and business software services:
        website development, WordPress and Shopify development,
        mobile and web application development, game design, UI/UX
        design, CMS development, CRM and ERP development, API
        development and integration, AI agent development, workflow
        automation, and related consulting and support. Website
        descriptions, examples, case studies, and plan summaries are
        for general information and do not guarantee a particular
        result, feature, delivery date, or level of performance.
      </p>
      <p>
        Project scope, deliverables, milestones, acceptance criteria, support,
        ownership, fees, and deadlines will be governed by the applicable quote,
        order, statement of work, or written agreement. If there is a conflict,
        the signed project agreement controls for that project.
      </p>

      <h2 className="mt-10 text-2xl font-bold text-[#001b40]">Two different things are sold here</h2>
      <p>
        These Terms cover two distinct kinds of purchase, and it
        matters which one you are making:
      </p>
      <ul>
        <li>
          <strong>Website update subscriptions</strong> (Starter,
          Growth and Scale, shown on our{" "}
          <Link href="/pricing">pricing page</Link>) cover a set number
          of small changes to an existing website that Busiserve has
          already built and delivered, for one calendar month. They are
          bought from the published price in your dashboard. They
          charge once for that month and do not renew automatically; a
          further month requires a new purchase. They do <strong>not</strong>{" "}
          include new website or application development, new pages,
          redesigns, new features or complex fixes, each of which needs
          a separate quotation even while a subscription is active.
        </li>
        <li>
          <strong>Development projects</strong> are quoted individually
          after we review your requirements. They are not sold from a
          published price on this website. Their fees, payment
          schedule, scope, timeline, acceptance criteria and
          cancellation terms are set out in the written quote or
          project agreement for that project.
        </li>
      </ul>

      <h2 className="mt-10 text-2xl font-bold text-[#001b40]">Eligibility</h2>
      <p>
        Our services are offered to businesses and to individuals who
        are of the age of majority in their jurisdiction and able to
        enter a binding contract. A subscription plan may be purchased
        only for a website that Busiserve has already developed and
        delivered; if you buy a plan for any other website, we will
        tell you before starting work and treat the purchase under our{" "}
        <Link href="/refund-policy">
          Refund &amp; Cancellation Policy
        </Link>
        . Accounts must use accurate details and a working email
        address, and email verification is required before payment.
      </p>

      <h2 className="mt-10 text-2xl font-bold text-[#001b40]">Requirements, quotes, and agreed scope</h2>
      <p>
        A quote request or enquiry is an invitation for us to assess
        your requirements. It is not an offer, a reservation, or a
        commitment by either side. We may ask questions, propose a
        different approach, revise an estimate after assessment, or
        decline work. A project becomes binding only when the scope and
        fees are confirmed in writing and any required advance is
        received. Indicative starting prices shown on service pages are
        estimates for planning, not quotations, and the written quote
        prevails over any figure shown on the website.
      </p>

      <h2 className="mt-10 text-2xl font-bold text-[#001b40]">Website and portal use</h2>
      <p>You agree to use the website and portal lawfully and responsibly. You must not:</p>
      <ul>
        <li>access an account, data, or system that you are not authorized to use;</li>
        <li>submit false, misleading, unlawful, infringing, or harmful content;</li>
        <li>interfere with the website, portal, payment flow, or security controls;</li>
        <li>probe, scan, reverse engineer, scrape, copy, or circumvent access restrictions;</li>
        <li>introduce malware, spam, automated abuse, or code intended to disrupt service; or</li>
        <li>use the services to violate another person&apos;s rights or applicable law.</li>
      </ul>

      <h2 className="mt-10 text-2xl font-bold text-[#001b40]">Accounts and security</h2>
      <p>
        Some portal features require an account. You are responsible for
        providing accurate information, keeping your login credentials
        confidential, and all activity under your account. You must promptly
        notify us if you suspect unauthorized access. We may suspend or limit an
        account to protect the website, users, or our business, or where these
        Terms or applicable law have been violated.
      </p>

      <h2 className="mt-10 text-2xl font-bold text-[#001b40]">Plan pricing and currency</h2>
      <p>
        Subscription prices, the number of included change requests,
        and the one-month duration are shown on our{" "}
        <Link href="/pricing">pricing page</Link> and again in your
        dashboard before you pay. Subscription prices on this website
        are quoted and charged in United States dollars (USD). Your bank
        or card issuer may apply its own conversion rate and
        cross-border fees on top of that amount; those are outside our
        control.
      </p>
      <p>
        We may correct an obvious pricing error and may change future
        prices or plans by updating the website. A change does not alter
        an order you have already paid for. Where a figure shown
        anywhere on this website conflicts with the amount shown in your
        dashboard immediately before payment, the amount shown before
        payment is the one that applies — and if an incorrect amount is
        ever charged, our{" "}
        <Link href="/refund-policy">
          Refund &amp; Cancellation Policy
        </Link>{" "}
        explains how it is corrected.
      </p>

      <h2 className="mt-10 text-2xl font-bold text-[#001b40]">Payments, taxes, and invoices</h2>
      <p>
        Payments are processed through Razorpay. The amount shown to
        you before you confirm a payment is the amount that will be
        charged for that purchase, including any tax applied to it. You
        authorize that payment. An order is fulfilled only after the
        payment is verified on our servers against the gateway record;
        a payment that fails verification activates nothing. Card, UPI,
        netbanking and wallet details are entered in Razorpay&apos;s
        checkout and are handled by Razorpay under its own terms and
        privacy policy — we never receive them.
      </p>
      <p>
        Where tax is chargeable on a purchase, it is applied at the rate
        in force at the time of the transaction and reflected in the
        amount shown before payment. An invoice is issued for a
        completed purchase to the email address on the account. Project
        fees, tax treatment, and any withholding are stated in the
        applicable quote or project agreement.
      </p>
      <p>
        Bank, card-network, currency-conversion, cross-border and
        similar charges levied by your own bank or card issuer are
        yours, not ours, and are not part of the amount we receive.
      </p>

      <h2 className="mt-10 text-2xl font-bold text-[#001b40]">Advance payments and milestones</h2>
      <p>
        Subscriptions are paid in full in advance for the month they
        cover. For development projects, we generally work to a payment
        schedule agreed in writing, which may include an advance before
        work starts and further payments tied to milestones or to
        delivery. Work on a stage may be held until the payment due for
        the previous stage is received. Deployment to a live
        environment, and the handover of final source files or
        ownership of project-specific deliverables, may be made
        conditional on the required payments having been received, as
        set out in the project agreement.
      </p>

      <h2 className="mt-10 text-2xl font-bold text-[#001b40]">Delivery, timelines, and what we need from you</h2>
      <p>
        Timelines quoted for a project or for a change request are
        estimates based on the agreed scope and on receiving what we
        need from you. Delivery depends on your cooperation, including
        providing content, images, branding, data, access to domains,
        hosting, repositories or third-party accounts, and giving
        feedback and approvals within a reasonable time. Where a
        dependency on your side is late, the timeline moves by at
        least that delay, and a subscription month continues to run.
      </p>
      <p>
        A change request under a subscription plan is one focused
        update to an existing element or section, confirmed with you
        before work starts. Several unrelated updates count as separate
        requests. Requests are handled one at a time, cover one
        existing website, and expire with the subscription period they
        belong to.
      </p>
      <p>
        Unless the project agreement sets a formal acceptance process,
        a deliverable is treated as accepted when it has been delivered
        and you have either approved it or used it in production
        without raising a defect within the period stated in that
        agreement.
      </p>

      <h2 className="mt-10 text-2xl font-bold text-[#001b40]">Third-party costs and subscriptions</h2>
      <p>
        Domains, hosting, email services, SSL, paid plugins, themes,
        fonts, licences, app-store and developer-account fees, API and
        AI usage charges, SMS and payment-gateway fees, and other
        third-party products are not included in our fees unless a
        quote says so in writing. They are charged by those providers
        under their own terms and pricing, and their renewal is your
        responsibility unless we have agreed otherwise in writing. Where
        we purchase any of them on your behalf, the cost is passed on
        to you and is not refundable by us. Those providers may change
        their prices or terms, and we are not responsible for such
        changes.
      </p>

      <h2 className="mt-10 text-2xl font-bold text-[#001b40]">Changes to scope and additional charges</h2>
      <p>
        If you ask for work outside the agreed scope — new pages or
        screens, new features, a redesign, a change of platform, extra
        rounds of revision beyond those agreed, migration, or work on a
        website other than the one covered by your plan — we will quote
        it separately and begin only after you approve that quote in
        writing. A subscription plan is never converted into project
        work by using up its change requests. If scope grows after work
        has started, the fee and the timeline are revised in writing
        before the additional work proceeds.
      </p>

      <h2 className="mt-10 text-2xl font-bold text-[#001b40]">Cancellations and refunds</h2>
      <p>
        How to cancel, when a refund applies, how duplicate and failed
        payments are handled, how an approved refund is paid, and how to
        raise a complaint are set out in our{" "}
        <Link href="/refund-policy">
          Refund &amp; Cancellation Policy
        </Link>
        , which forms part of these Terms. Where a signed project
        agreement sets different cancellation or refund terms for a
        project, that agreement governs that project. Contact us
        promptly if a payment or order appears incorrect.
      </p>

      <h2 className="mt-10 text-2xl font-bold text-[#001b40]">Client content and responsibilities</h2>
      <p>
        You retain ownership of materials you provide, including text, images,
        data, trademarks, credentials, and other content (&quot;Client Content&quot;).
        You grant Busiserve the limited rights needed to host, copy, modify,
        transmit, and use Client Content to provide the agreed services. You are
        responsible for having the necessary rights, permissions, notices, and
        lawful basis for Client Content, and for backing up your important data.
      </p>

      <h2 className="mt-10 text-2xl font-bold text-[#001b40]">Intellectual property</h2>
      <p>
        The Busiserve name, website, design, software, documentation, templates,
        processes, and other materials we create independently remain owned by
        Busiserve or its licensors. You may not copy, resell, publish, or create
        derivative works from them except as allowed by these Terms or a written
        agreement. Ownership or licensing of project-specific deliverables will
        be stated in the applicable project agreement after required payments
        are made.
      </p>

      <h2 className="mt-10 text-2xl font-bold text-[#001b40]">Third-party services</h2>
      <p>
        The website may link to or depend on third-party services such as
        authentication, hosting, email, analytics, maps, or payment providers.
        Those services are governed by their own terms and policies. We are not
        responsible for third-party outages, content, security practices, or
        changes outside our reasonable control.
      </p>

      <h2 className="mt-10 text-2xl font-bold text-[#001b40]">Availability and disclaimers</h2>
      <p>
        We aim to provide reliable services, but the website and portal are
        provided on an availability basis and may be changed, interrupted, or
        temporarily unavailable for maintenance, security, upgrades, or events
        beyond our control. To the extent permitted by law, we disclaim implied
        warranties including merchantability, fitness for a particular purpose,
        non-infringement, and uninterrupted or error-free operation.
      </p>

      <h2 className="mt-10 text-2xl font-bold text-[#001b40]">Limitation of liability</h2>
      <p>
        To the extent permitted by law, Busiserve will not be liable for
        indirect, incidental, special, consequential, exemplary, or punitive
        damages, or for lost profits, revenue, data, goodwill, or business
        opportunities arising from use of the website or services. Our total
        liability for a claim relating to these Terms will not exceed the amount
        you paid to Busiserve for the relevant service during the twelve months
        before the event giving rise to the claim. Nothing in these Terms limits
        liability that cannot lawfully be limited.
      </p>

      <h2 className="mt-10 text-2xl font-bold text-[#001b40]">Indemnity</h2>
      <p>
        You agree to defend and indemnify Busiserve and its personnel from
        claims, losses, liabilities, costs, and expenses arising from your
        unlawful use of the services, breach of these Terms, infringement of
        another person&apos;s rights, or Client Content that you provide.
      </p>

      <h2 className="mt-10 text-2xl font-bold text-[#001b40]">Suspension and termination</h2>
      <p>
        You may stop using the website at any time. We may suspend or terminate
        access, cancel an order, or discontinue a service if required for
        security, legal, operational, or business reasons, including a material
        breach of these Terms or non-payment. Provisions concerning payments,
        intellectual property, confidentiality, liability, indemnity, and
        dispute resolution survive termination where their nature requires it.
      </p>

      <h2 className="mt-10 text-2xl font-bold text-[#001b40]">Support and complaints</h2>
      <p>
        Support for a purchase made on this website is provided by
        email and phone at the contacts above, and through our{" "}
        <Link href="/contact">contact page</Link>. A subscription
        includes support for the small changes it covers during its
        month; it is not a general-purpose helpdesk, an uptime
        commitment, or a monitoring service, and it does not cover
        hosting, domain or third-party provider problems. Support for a
        development project is as stated in that project&apos;s
        agreement. If you are not satisfied with how a request has been
        handled, the complaint route is set out in our{" "}
        <Link href="/refund-policy">
          Refund &amp; Cancellation Policy
        </Link>
        .
      </p>

      <h2 className="mt-10 text-2xl font-bold text-[#001b40]">Governing law, disputes, and changes</h2>
      <p>
        Busiserve operates from Uttar Pradesh, India. These Terms and
        any dispute arising out of them or out of your use of this
        website are governed by the laws of India. Before starting any
        formal proceeding, the parties will first try in good faith to
        resolve the matter by contacting each other at the addresses in
        these Terms. Subject to that, the courts at Noida, Gautam
        Buddha Nagar, Uttar Pradesh, India will have jurisdiction,
        except where mandatory consumer-protection law gives you the
        right to bring a claim where you live.
      </p>
      <p>
        Where a signed project agreement names a different governing
        law or dispute-resolution process, that agreement governs that
        project. We may update these Terms from time to time by posting
        a revised version with a new effective date; the version
        published when you placed an order applies to that order, and
        continued use of the website after an update means you accept
        the revised Terms for future use.
      </p>

      <h2 className="mt-10 text-2xl font-bold text-[#001b40]">Contact us</h2>
      <p>
        {businessIdentity.tradingName},{" "}
        {businessIdentity.address}. Questions about these Terms can be
        sent to{" "}
        <a href={`mailto:${businessIdentity.email}`}>
          {businessIdentity.email}
        </a>
        , by phone to{" "}
        <a href={`tel:${businessIdentity.phone}`}>
          {displayPhone(businessIdentity.phone)}
        </a>
        , or through our <Link href="/contact">contact page</Link>. See
        also our <Link href="/privacy">Privacy Policy</Link> and{" "}
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
