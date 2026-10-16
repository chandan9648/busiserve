import { prototypeImages } from "@/lib/site-data";

/**
 * Case study catalogue.
 *
 * One entry drives the card on /case-studies, the detail page at
 * /case-studies/<slug> and the sitemap entry, so a new case study
 * needs a record here and nothing else.
 *
 * The card fields come first because `CaseStudyCard` is spread from
 * the same object.
 */
export type CaseStudyResult = {
  metric: string;
  label: string;
  detail: string;
};

export type CaseStudyStep = {
  title: string;
  body: string;
};

export type CaseStudy = {
  slug: string;

  // Card fields.
  category: string;
  title: string;
  description: string;
  image: string;

  // Detail page.
  metaTitle: string;
  metaDescription: string;
  summary: string;
  sector: string;
  engagement: string;
  duration: string;
  stack: readonly string[];
  challenge: readonly string[];
  approach: readonly CaseStudyStep[];
  delivered: readonly string[];
  results: readonly CaseStudyResult[];
  outcome: string;
};

const studies: CaseStudy[] = [
  {
    slug: "fintech-app-revolution",
    category: "Finance",
    title: "Fintech App Revolution",
    description:
      "Re-architected a legacy financial application for a global bank, resulting in a 40% increase in user retention and a significant reduction in transaction latency.",
    image: prototypeImages.case1,

    metaTitle: "Fintech App Rebuild: Case Study",
    metaDescription:
      "How Busiserve re-architected a bank's legacy financial application, cut transaction latency and lifted user retention by 40%.",
    summary:
      "A retail banking client was running a decade-old transaction application that had grown one feature at a time. It still worked, but every release was slower than the last and customers were abandoning payments midway. We rebuilt it around a modern service architecture without ever taking the existing system offline.",
    sector: "Retail and commercial banking",
    engagement: "Platform re-architecture and migration",
    duration: "7 months, delivered in four phases",
    stack: [
      "React",
      "Node.js",
      "PostgreSQL",
      "Redis",
      "Docker",
      "AWS",
    ],

    challenge: [
      "A single monolithic codebase meant one slow query could hold up every other request on the server, including balance checks and payment confirmations.",
      "Transaction confirmations took several seconds at peak hours, and customers were closing the app before the screen settled — the drop-off showed clearly in the funnel.",
      "Business logic was duplicated across the web app, the mobile API and a batch reporting job, so every rule change had to be made in three places and tested in three places.",
      "There was no safe way to release. Deployments went out at night, by hand, and a rollback meant restoring a database snapshot.",
    ],

    approach: [
      {
        title: "Audit before touching anything",
        body: "We spent the first three weeks instrumenting the running system rather than rewriting it. Request tracing showed that four endpoints accounted for most of the latency, and that the slowest of them was re-reading the same account data up to eleven times per request. That audit decided the order of everything that followed.",
      },
      {
        title: "Carve out the transaction core first",
        body: "Instead of a full rewrite, we extracted the transaction engine into its own service with a clearly defined contract. The old monolith kept serving traffic and simply called the new service, so the riskiest part of the system could be proved in production before anything else moved.",
      },
      {
        title: "One source of truth for business rules",
        body: "The duplicated fee, limit and eligibility rules were collapsed into a single rules module consumed by every caller. A rule change now happens once, and the test suite covers it once.",
      },
      {
        title: "Caching with correctness guarantees",
        body: "Read-heavy account and reference data moved behind Redis with explicit invalidation tied to write events, rather than time-based expiry. This removed the repeated reads the audit found without ever serving a stale balance.",
      },
      {
        title: "Migrate users in controlled waves",
        body: "Traffic moved to the new stack a percentage at a time, with the old path kept warm as an instant fallback. No migration window, no maintenance page, and a rollback that took seconds rather than a database restore.",
      },
    ],

    delivered: [
      "A standalone transaction service with its own deployment pipeline and monitoring",
      "A shared business-rules module replacing three divergent copies",
      "An event-driven cache layer for account and reference data",
      "Automated CI/CD with staged rollout and one-click rollback",
      "End-to-end request tracing and alerting on latency, not just on errors",
      "A documented runbook so the client's own team owns the platform",
    ],

    results: [
      {
        metric: "40%",
        label: "Increase in user retention",
        detail:
          "Measured over the two quarters following the final migration wave, against the same quarters a year earlier.",
      },
      {
        metric: "Sub-second",
        label: "Transaction confirmation",
        detail:
          "Peak-hour confirmations settled from several seconds to consistently under one second at the 95th percentile.",
      },
      {
        metric: "3 → 1",
        label: "Copies of business logic",
        detail:
          "Fee, limit and eligibility rules now live in one module, cutting the testing surface for every rule change.",
      },
      {
        metric: "Zero",
        label: "Downtime during migration",
        detail:
          "Traffic shifted in waves with the previous path kept live, so customers never saw a maintenance window.",
      },
    ],

    outcome:
      "The client's team now ships to the transaction platform during business hours, which was unthinkable at the start of the engagement. The slower-moving parts of the old monolith were left deliberately untouched: they were not costing anything, and replacing working code for its own sake would have added risk without adding value.",
  },

  {
    slug: "ecommerce-scale-up",
    category: "Retail",
    title: "E-commerce Scale-up",
    description:
      "Developed a robust, scalable infrastructure for a rapidly growing online retailer, ensuring seamless performance during peak holiday traffic spikes.",
    image: prototypeImages.case2,

    metaTitle: "E-commerce Scale-up Case Study",
    metaDescription:
      "How Busiserve rebuilt an online retailer's infrastructure to hold up through holiday traffic spikes without overspending the rest of the year.",
    summary:
      "An online retailer had outgrown the setup that launched the business. Ordinary weeks were fine; sale days were not. The previous two holiday peaks had both ended in checkout failures at exactly the moment the traffic was worth the most. We rebuilt the infrastructure to absorb those spikes, and to cost sensibly on the ordinary days in between.",
    sector: "Direct-to-consumer retail",
    engagement: "Infrastructure rebuild and performance engineering",
    duration: "5 months, completed ahead of the festive season",
    stack: [
      "Next.js",
      "Node.js",
      "PostgreSQL",
      "Redis",
      "Kubernetes",
      "CDN edge caching",
    ],

    challenge: [
      "Fixed-capacity servers were sized for average traffic. A sale pushed load ten times higher within minutes, and nothing scaled to meet it.",
      "The catalogue was rendered on demand on every request, so the pages that drew the most traffic were also the most expensive to serve.",
      "Checkout shared a database connection pool with catalogue browsing. Under load, shoppers browsing starved the pool and paying customers were the ones who saw errors.",
      "Inventory counts were read straight from the primary database, making the single busiest query also the single biggest point of contention.",
      "There was no load testing. Capacity was a guess, confirmed or refuted by whatever happened on the day.",
    ],

    approach: [
      {
        title: "Reproduce the failure before fixing it",
        body: "We built a load-test harness that replayed the previous peak's real traffic shape against a staging copy. That made the failure reproducible on a Tuesday afternoon instead of once a year, and it became the gate every later change had to pass.",
      },
      {
        title: "Separate the paths that must not fail",
        body: "Checkout and payment were given their own service boundary, their own connection pool and their own scaling rules. Browsing traffic can now surge as much as it likes without ever taking capacity away from a customer who is paying.",
      },
      {
        title: "Serve the catalogue from the edge",
        body: "Product and category pages moved to statically generated pages revalidated on content change and served from a CDN. The pages carrying the heaviest traffic stopped touching the application servers at all.",
      },
      {
        title: "Make inventory reads cheap",
        body: "Stock levels moved to a cache updated by order and restock events, with the authoritative check kept where it matters — at the point of order placement. Browsing shows accurate stock without hammering the primary database.",
      },
      {
        title: "Scale on demand, shrink afterwards",
        body: "The application runs on an orchestrated cluster that adds capacity on queue depth and request latency, then releases it when the spike passes. Peak capacity stopped being something the client pays for year-round.",
      },
    ],

    delivered: [
      "An isolated checkout and payment service with dedicated capacity",
      "Statically generated, CDN-cached catalogue and category pages",
      "Event-driven inventory cache with authoritative checks at order time",
      "Autoscaling cluster configuration tuned against replayed peak traffic",
      "A repeatable load-test suite the client runs before every sale",
      "Dashboards and alerts covering checkout success rate, not just uptime",
    ],

    results: [
      {
        metric: "10x",
        label: "Peak traffic absorbed",
        detail:
          "The festive peak ran at roughly ten times baseline load with no checkout failures and no manual intervention.",
      },
      {
        metric: "Faster",
        label: "Catalogue page loads",
        detail:
          "Product and category pages now come from the CDN, so they load at the same speed on a sale day as on a quiet one.",
      },
      {
        metric: "Lower",
        label: "Off-peak infrastructure cost",
        detail:
          "Capacity is released once a spike passes, so the client no longer pays all year for servers sized for one week.",
      },
      {
        metric: "Rehearsed",
        label: "Every sale, in advance",
        detail:
          "Peak load is now replayed against staging before each event, so capacity is a tested number rather than an estimate.",
      },
    ],

    outcome:
      "The retailer went through its next two peak seasons without an incident call. The more useful change was cultural: capacity is now something the team verifies in advance rather than discovers on the day.",
  },

  {
    slug: "enterprise-cms-migration",
    category: "Technology",
    title: "Enterprise CMS Migration",
    description:
      "Successfully migrated a multinational corporation's complex content ecosystem to a modern headless CMS, improving editorial workflows by 60%.",
    image: prototypeImages.case3,

    metaTitle: "Enterprise CMS Migration",
    metaDescription:
      "How Busiserve moved a multinational's content ecosystem to a headless CMS, cutting publishing time and unifying content across regions.",
    summary:
      "A multinational was running separate content systems per region, each with its own templates, its own editors and its own idea of what a product page should contain. Publishing one global announcement took a week of coordination. We consolidated everything onto a single headless CMS and gave each region the autonomy it actually needed, without the duplication it did not.",
    sector: "Enterprise technology",
    engagement: "Content platform consolidation and migration",
    duration: "9 months across three regional rollouts",
    stack: [
      "Headless CMS",
      "Next.js",
      "TypeScript",
      "GraphQL",
      "CDN edge caching",
      "Automated migration tooling",
    ],

    challenge: [
      "Four regional CMS installations held overlapping content with no shared structure, so the same product was described four different ways.",
      "Publishing anything global meant a manual relay between regional teams, with each one re-entering content by hand and introducing its own errors.",
      "Front-end templates were coupled to the CMS, so a layout change required a developer release in every region separately.",
      "Years of accumulated content included broken links, orphaned pages and assets nobody could trace to an owner.",
      "Translation was a side process run over email and spreadsheets, entirely outside the systems that held the content.",
    ],

    approach: [
      {
        title: "Model the content before moving it",
        body: "We ran workshops with editors from every region to agree a shared content model: what a product page genuinely is, which fields are global, and which are legitimately regional. Agreeing this first is what kept the migration from simply reproducing the existing mess in a newer system.",
      },
      {
        title: "Audit and triage the archive",
        body: "Automated crawling catalogued every page, asset and link across the four systems. Roughly a third turned out to be orphaned or superseded. Rather than migrate it, we gave each region a reviewed list and archived what nobody claimed.",
      },
      {
        title: "Decouple presentation from content",
        body: "The front end was rebuilt to consume the CMS through an API, so templates are now versioned with the application. A layout change ships once and applies everywhere, instead of being repeated per region.",
      },
      {
        title: "Script the migration, repeatedly",
        body: "Migration ran as repeatable tooling, not a one-off import. We could re-run a region's migration as often as needed, diff the output against the source and fix the mapping — rather than hand-correcting records after the fact.",
      },
      {
        title: "Roll out one region at a time",
        body: "Each region went live separately, with the previous system kept readable for a defined period. Lessons from the first rollout were folded into the second and third, and the last region took a fraction of the time the first one did.",
      },
      {
        title: "Bring translation inside the platform",
        body: "Translation became a workflow state within the CMS, with source-change notifications. Translators work against live content instead of exported spreadsheets, and nothing ships half-translated.",
      },
    ],

    delivered: [
      "A single shared content model governing all regions",
      "A headless CMS with regional permissions and editorial workflow",
      "A decoupled front end consuming content over GraphQL",
      "Repeatable, re-runnable migration tooling with verification diffs",
      "An in-platform translation workflow with change notifications",
      "Editor training and documentation for each regional team",
    ],

    results: [
      {
        metric: "60%",
        label: "Faster editorial workflow",
        detail:
          "Measured as the time from draft creation to publication, averaged across regional teams before and after the move.",
      },
      {
        metric: "4 → 1",
        label: "Content systems",
        detail:
          "Four regional installations consolidated into one platform, removing duplicated structure and licensing.",
      },
      {
        metric: "~33%",
        label: "Archive retired, not migrated",
        detail:
          "Orphaned and superseded pages were identified and archived rather than carried into the new system.",
      },
      {
        metric: "One release",
        label: "For a global layout change",
        detail:
          "Templates now ship with the application, so a change applies across every region at once.",
      },
    ],

    outcome:
      "A global announcement that previously took a week of coordination now publishes the same day. Regional teams kept the local control they genuinely needed — pricing, availability and local campaigns — while everything that was only duplicated by accident is now shared.",
  },
];

export const caseStudies = studies;

const bySlug = new Map(studies.map((study) => [study.slug, study]));

export const getCaseStudy = (slug: string) => bySlug.get(slug);

export const caseStudySlugs = studies.map((study) => study.slug);

export const caseStudyPath = (slug: string) => `/case-studies/${slug}`;

/**
 * The subset `CaseStudyCard` renders, with the link to the detail
 * page already resolved.
 */
export const caseStudyCards = studies.map((study) => ({
  category: study.category,
  title: study.title,
  description: study.description,
  image: study.image,
  href: caseStudyPath(study.slug),
}));
