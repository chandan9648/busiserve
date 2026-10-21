import type { Metadata } from "next";
import Link from "next/link";

import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import LegalIdentity from "@/components/LegalIdentity";
import { breadcrumbSchema, pageMetadata } from "@/lib/seo";
import { businessIdentity, displayPhone } from "@/lib/site-data";

export const metadata: Metadata = pageMetadata({
  title: "Refund & Cancellation Policy",
  description:
    "How to cancel an order or website update subscription with Busiserve, when a refund applies, how duplicate and failed payments are handled, and how to complain.",
  path: "/refund-policy",
  keywords: ["refund policy", "cancellation policy"],
});

const heading = "mt-10 text-2xl font-bold text-[#001b40]";

export default function RefundPolicyPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Refund & Cancellation Policy", path: "/refund-policy" },
        ])}
      />

      <main
        id="main-content"
        tabIndex={-1}
        className="container-site prose-brand section-gap"
      >
        <h1 className="text-4xl font-extrabold text-[#001b40]">
          Refund &amp; Cancellation Policy
        </h1>

        <p className="mt-6">
          <strong>Effective date:</strong> October 16, 2026
        </p>

        <p>
          This policy explains how to cancel a purchase made from this
          website, when a refund applies, and how refunds are
          processed. It applies alongside our{" "}
          <Link href="/terms">Terms of Service</Link> and the quote,
          order or project agreement for your engagement. Where a
          signed project agreement sets different cancellation or
          refund terms for that project, that agreement applies to it.
        </p>

        <LegalIdentity role="Busiserve" />

        <h2 className={heading}>What you can buy from us</h2>

        <p>
          Two things are sold through this website, and they cancel
          differently:
        </p>

        <ul>
          <li>
            <strong>Website update subscriptions</strong> (Starter,
            Growth and Scale) — a one-month period of small changes to
            an existing website that Busiserve has already built and
            delivered. These are bought in the dashboard, charge once,
            and do not renew automatically. Each plan is listed on the{" "}
            <Link href="/pricing">pricing page</Link> with its price
            and its number of included change requests.
          </li>

          <li>
            <strong>Development projects</strong> — websites,
            applications, CMS, CRM, ERP, API and automation work,
            quoted individually after we review your requirements.
            These are not bought from a published price on this
            website; their fees, milestones and cancellation terms are
            set in the written quote or project agreement.
          </li>
        </ul>

        <h2 className={heading}>The internal Company CRM is not sold</h2>

        <p>
          Busiserve also operates an internal application, the Company
          CRM, which our own administrators and team members use to
          assign and track work. It is not sold, licensed, subscribed to
          or billed separately, to customers or to anyone else. There is
          no purchase price, subscription fee or renewal attached to it,
          no customer order includes access to it, and nothing on this
          website charges for it.
        </p>

        <p>
          Because nothing is ever paid for the CRM, there is no payment
          to cancel and no amount that could be refunded in respect of
          it. This changes nothing about the terms above: the
          cancellation and refund terms for website update subscriptions
          and for development projects continue to apply in full to
          those paid services, and remain subject to applicable law.
          Internal CRM access itself is granted, suspended or withdrawn
          by Busiserve administration as described in our{" "}
          <Link href="/terms">Terms of Service</Link>, which is an
          access decision and not a cancellation or refund matter.
        </p>

        <h2 className={heading}>How to request a cancellation or refund</h2>

        <p>
          Send a request to{" "}
          <a href={`mailto:${businessIdentity.email}`}>
            {businessIdentity.email}
          </a>{" "}
          from the email address on your account, or call{" "}
          <a href={`tel:${businessIdentity.phone}`}>
            {displayPhone(businessIdentity.phone)}
          </a>
          . You can also use the{" "}
          <Link href="/contact">contact page</Link>. Please include:
        </p>

        <ul>
          <li>the order number or Razorpay payment reference;</li>
          <li>the registered account email address;</li>
          <li>the plan or project the request relates to; and</li>
          <li>the reason for the cancellation or refund request.</li>
        </ul>

        <p>
          We acknowledge refund and cancellation requests by email and
          tell you what we have decided, and why, in writing. A request
          is treated as received only once it reaches one of the
          contacts above; a message to any other channel may not be
          seen.
        </p>

        <h2 className={heading}>
          Website update subscriptions: cancellation
        </h2>

        <p>
          A subscription covers one calendar month and does not renew
          on its own, so there is nothing to cancel to stop future
          billing — a new period starts only when you buy one.
        </p>

        <ul>
          <li>
            <strong>Before any change request is started.</strong> If
            you have not yet submitted a change request and no work has
            begun, tell us and we will cancel the subscription period.
            A refund request in this situation is reviewed on the facts
            of the order, including whether the period has already run.
          </li>

          <li>
            <strong>After work has started.</strong> Once we have begun
            work on a change request, the fee covers the work performed
            and the time reserved for your month. The remaining change
            requests in that period cannot be exchanged for money.
          </li>

          <li>
            <strong>Unused change requests.</strong> Change requests
            expire with the subscription period they belong to and are
            not refunded, credited or carried into a later period. This
            is stated on the pricing page before purchase.
          </li>

          <li>
            <strong>If we cannot deliver.</strong> If we accept a
            subscription and are then unable to provide the agreed
            small-change support within your period for a reason on our
            side, we will either extend the period or refund the part
            of the fee that relates to the support we did not provide.
          </li>
        </ul>

        <h2 className={heading}>Development projects: cancellation</h2>

        <ul>
          <li>
            <strong>Before work begins.</strong> A quote is an enquiry
            response, not a charge. If you cancel after paying an
            advance but before we begin work, we refund the advance
            less any third-party costs already committed on your behalf
            and any work already carried out at your request.
          </li>

          <li>
            <strong>Work in progress.</strong> Fees for completed
            milestones, work already performed and third-party costs
            already incurred are not refundable. Where a project is
            cancelled mid-milestone, we confirm in writing what was
            completed and what, if anything, is returned.
          </li>

          <li>
            <strong>Delivered work.</strong> Once a deliverable has
            been delivered, deployed or accepted, its fee is not
            refundable. Defects in delivered work are handled as
            corrections under the project agreement, not as refunds.
          </li>
        </ul>

        <h2 className={heading}>Third-party costs are not refundable</h2>

        <p>
          Domains, hosting, email services, paid plugins, themes,
          licences, app-store fees, API usage and other third-party
          subscriptions are purchased from those providers and are
          governed by their own refund rules. Where we buy them on your
          behalf, these amounts are not refundable by Busiserve, even
          when the rest of an order is cancelled.
        </p>

        <h2 className={heading}>Failed and duplicate payments</h2>

        <ul>
          <li>
            <strong>A payment that fails or is left incomplete.</strong>{" "}
            No subscription is activated and no order is fulfilled. If
            money was debited while the payment shows as failed, it is
            normally reversed by your bank or card issuer without any
            action from us. Tell us if it has not reversed and we will
            trace the transaction with Razorpay.
          </li>

          <li>
            <strong>A duplicate payment.</strong> If you are charged
            more than once for the same order, write to us with both
            payment references. Once Razorpay confirms both charges
            relate to the same order, we refund the duplicate amount in
            full. A duplicate payment is never treated as a second
            subscription period unless you ask for it to be.
          </li>

          <li>
            <strong>An amount charged in error.</strong> If an amount
            was charged that does not match the price shown at
            checkout, tell us and we will refund the difference once
            verified.
          </li>
        </ul>

        <h2 className={heading}>How an approved refund is paid</h2>

        <p>
          Approved refunds are made through Razorpay to the original
          payment method used for the purchase. We cannot send a refund
          to a different card, account or payment instrument, and we do
          not refund in cash.
        </p>

        <p>
          After we approve a refund, we initiate it with Razorpay. The
          time it then takes to appear in your account is set by
          Razorpay and by your bank or card issuer, not by Busiserve,
          and for an international card payment it can be longer than
          for a domestic one. We tell you the date we initiated the
          refund and the reference you can quote to your bank. We do
          not control, and cannot guarantee, the settlement date.
        </p>

        <h2 className={heading}>Checking the status of a refund</h2>

        <p>
          Reply to the email thread for your request, or write to{" "}
          <a href={`mailto:${businessIdentity.email}`}>
            {businessIdentity.email}
          </a>{" "}
          with your order number. Your dashboard shows your plan,
          verified payments, activation and expiry dates and remaining
          change allowance, which is also useful when you contact us.
          Once a refund has been initiated with Razorpay, the status
          with your bank is best confirmed using the refund reference
          we provide.
        </p>

        <h2 className={heading}>Complaints</h2>

        <p>
          If you are not satisfied with a decision on a cancellation or
          refund, write to{" "}
          <a href={`mailto:${businessIdentity.email}`}>
            {businessIdentity.email}
          </a>{" "}
          with the subject line &quot;Complaint&quot; and your order
          number. Describe what you asked for and what you think should
          happen. We review complaints ourselves before any external
          step and respond in writing. Nothing in this policy affects
          rights you have under applicable consumer law.
        </p>

        <h2 className={heading}>Chargebacks</h2>

        <p>
          If you believe a charge is wrong, please contact us first. We
          can usually resolve a billing error faster than a chargeback,
          and a chargeback raised while a request is already with us
          may delay the outcome. We cooperate with Razorpay and the
          card networks on any dispute and provide the order, delivery
          and communication records relevant to it.
        </p>

        <h2 className={heading}>Changes to this policy</h2>

        <p>
          We may update this policy when our services or payment
          providers change. The updated version is posted on this page
          with a new effective date. The version published when you
          placed your order applies to that order.
        </p>

        <h2 className={heading}>Contact</h2>

        <p>
          {businessIdentity.tradingName},{" "}
          {businessIdentity.address}. Email{" "}
          <a href={`mailto:${businessIdentity.email}`}>
            {businessIdentity.email}
          </a>
          , phone{" "}
          <a href={`tel:${businessIdentity.phone}`}>
            {displayPhone(businessIdentity.phone)}
          </a>
          . See also our <Link href="/terms">Terms of Service</Link> and{" "}
          <Link href="/privacy">Privacy Policy</Link>.
        </p>
      </main>

      <Footer />
    </>
  );
}
