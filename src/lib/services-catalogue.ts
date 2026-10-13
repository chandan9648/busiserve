import {
  Bot,
  Building2,
  Code2,
  Gamepad2,
  Globe2,
  LayoutGrid,
  PanelsTopLeft,
  PenTool,
  ShoppingBag,
  Smartphone,
  Users,
  Workflow,
  type LucideIcon,
} from "lucide-react";

/**
 * The single source of truth for the service catalogue.
 *
 * The services page cards, the `/services/[slug]` detail pages, the
 * enquiry form options and the sitemap all read from this file. The
 * descriptions used to be written out twice — once in site-data for
 * the homepage and again inside the services page — which is how the
 * two drifted apart.
 *
 * Nothing here is derived from the monthly care plans in
 * `lib/portal/plans.ts` or the subscription tiers on /pricing. Those
 * are recurring products; everything below is quoted per project.
 */

export type TechItem = {
  name: string;
  /** Plain-language reason this technology appears, for a non-technical reader. */
  purpose: string;
};

export type TechGroup = {
  label: string;
  items: TechItem[];
};

export type ServiceTier = {
  name: string;
  tagline: string;
  /**
   * Indicative one-time starting price in rupees, or null where no
   * verified figure exists for this service.
   *
   * A null renders a "Request a quote" action instead of a number.
   * Never put an unverified figure here: the detail page presents
   * whatever is set as a real starting price.
   */
  startingPrice: number | null;
  highlights: string[];
  /**
   * Per-tier delivery estimate, e.g. "4–6 weeks".
   *
   * Left unset until the catalogue timelines are confirmed. The tier
   * card simply omits the line while it is undefined rather than
   * showing a guess.
   */
  estimatedTimeline?: string;
};

export type TierMatrixRow = {
  label: string;
  /** One value per tier, in the same order as `tiers.items`. */
  values: string[];
};

export type ServiceTiers = {
  note: string;
  items: ServiceTier[];
  matrix: TierMatrixRow[];
};

export type ServiceDetail = {
  /** URL segment under /services. Also the React key and the sitemap entry. */
  slug: string;
  title: string;
  /** Shorter label for cards and navigation, where the full title is unwieldy. */
  cardTitle?: string;
  icon: LucideIcon;
  /** One-line summary used on the card and in structured data. */
  short: string;
  /** Card bullets. Three keeps every card the same height. */
  deliverables: string[];
  /** Compact badges on the card. Keep to four so they stay on one line. */
  techBadges: string[];
  overview: string[];
  suitableFor: string[];
  problems: string[];
  features: { group: string; items: string[] }[];
  tech: TechGroup[];
  tiers?: ServiceTiers;
  addOns: string[];
  /** Costs the customer pays directly, and work outside the quote. */
  exclusions: string[];
  /** What moves the delivery date, in place of a promised one. */
  timelineDrivers: string[];
  /** Pre-selected value in the enquiry form. Must match an option exactly. */
  enquiryValue: string;
  metaTitle: string;
  metaDescription: string;
  /** Slugs shown under "Related services". */
  related: string[];
};

export type ServiceCategory = {
  id: string;
  number: string;
  label: string;
  title: string;
  description: string;
  /** Slugs, in display order. */
  services: string[];
};

/** Formats an indicative price for display, e.g. 70000 -> "₹70,000". */
export const formatProjectPrice = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);

/**
 * The four-tier website model from the service catalogue.
 *
 * Only the website services carry these figures. They are indicative
 * starting prices for a one-time project, not a fixed quotation and
 * not a subscription.
 */
export const PROJECT_PRICE_NOTE =
  "Indicative starting price for a one-time project. The final scope, deliverables and cost are confirmed in a written proposal after a requirement assessment.";

export const SUBSCRIPTION_SEPARATION_NOTE =
  "A project price is separate from the monthly website care plans, which cover ongoing changes after launch.";

/** The delivery stages quoted on every detail page. */
export const projectWorkflow = [
  {
    step: "01",
    title: "Requirement Discussion",
    description:
      "We go through what you need, who it is for and which features matter most, so the scope is built on your actual priorities.",
  },
  {
    step: "02",
    title: "Scope and Proposal",
    description:
      "You receive a written proposal setting out the deliverables, assumptions, timeline and cost before any work begins.",
  },
  {
    step: "03",
    title: "UI/UX and Planning",
    description:
      "Structure, screens and user journeys are designed and agreed, along with the technical approach for the build.",
  },
  {
    step: "04",
    title: "Development",
    description:
      "The approved scope is built in stages, with the work shared as it progresses rather than only at the end.",
  },
  {
    step: "05",
    title: "Testing and Quality Assurance",
    description:
      "Functionality, responsiveness, performance and content are checked across devices and common browsers.",
  },
  {
    step: "06",
    title: "Client Review",
    description:
      "You review the build against the agreed scope and raise changes, which are handled before deployment.",
  },
  {
    step: "07",
    title: "Deployment and Handover",
    description:
      "The project goes live on your hosting or platform account, with access, credentials and a walkthrough handed over.",
  },
  {
    step: "08",
    title: "Post-Launch Support",
    description:
      "Where support is included in the agreement, the covered period and scope are stated in the proposal.",
  },
] as const;

const commonTimelineDrivers = [
  "The number of pages, screens or modules in the agreed scope",
  "How quickly content, images and brand assets are provided",
  "Review and approval turnaround at each stage",
  "Third-party dependencies such as payment gateways, APIs or platform approvals",
];

const websiteTierMatrix: TierMatrixRow[] = [
  {
    label: "Design approach",
    values: [
      "Standard layout, brand colours and typography applied",
      "Expanded layout with section-level design choices",
      "Custom UI built on a defined design system",
      "Custom UI with a motion-led presentation",
    ],
  },
  {
    label: "Scope of pages",
    values: [
      "Entry-level page set",
      "Expanded page set",
      "Expanded page set with custom sections",
      "Expanded page set with custom sections",
    ],
  },
  {
    label: "Content management",
    values: [
      "Core pages set up for you",
      "Editable content areas with a handover walkthrough",
      "Editable content areas with structured content models",
      "Editable content areas with structured content models",
    ],
  },
  {
    label: "Motion and interaction",
    values: [
      "Not included",
      "Light interface transitions",
      "Considered interaction detail",
      "Scroll and section animation as the focus of the build",
    ],
  },
  {
    label: "SEO setup",
    values: [
      "Titles, descriptions and a crawlable structure",
      "Adds per-page metadata and sitemap setup",
      "Adds structured data where relevant",
      "Adds structured data where relevant",
    ],
  },
  {
    label: "Integrations",
    values: [
      "Enquiry form",
      "Enquiry form, maps and messaging links",
      "Analytics and business tool integrations as scoped",
      "Analytics and business tool integrations as scoped",
    ],
  },
  {
    label: "Performance checks",
    values: [
      "Responsive layout and image optimisation",
      "Responsive layout and image optimisation",
      "Adds load-time tuning",
      "Adds load-time and animation performance tuning",
    ],
  },
];

const websiteTierTaglines = {
  basic: "A standard design with an entry-level scope, for getting a credible site live.",
  premium:
    "An expanded scope with content you can manage yourself after handover.",
  modern:
    "A custom interface built on a design system, for a distinct brand presence.",
  animated:
    "The Modern tier with motion design as the focus of the experience.",
} as const;

/**
 * Website development tiers, with the catalogue's indicative prices.
 *
 * These four figures are the only published amounts in the catalogue.
 * Every other service is quoted after a requirement assessment.
 */
const websiteTiers = (prices: [number, number, number, number]): ServiceTiers => ({
  note: `${PROJECT_PRICE_NOTE} ${SUBSCRIPTION_SEPARATION_NOTE}`,
  items: [
    {
      name: "Basic",
      tagline: websiteTierTaglines.basic,
      startingPrice: prices[0],
      highlights: [
        "Standard design applied to your brand",
        "Entry-level page set",
        "Responsive across mobile, tablet and desktop",
        "Enquiry form and basic SEO structure",
      ],
    },
    {
      name: "Premium",
      tagline: websiteTierTaglines.premium,
      startingPrice: prices[1],
      highlights: [
        "Everything in Basic",
        "Expanded page set and section-level design",
        "Content you can edit after handover",
        "Maps, messaging links and per-page metadata",
      ],
    },
    {
      name: "Modern",
      tagline: websiteTierTaglines.modern,
      startingPrice: prices[2],
      highlights: [
        "Everything in Premium",
        "Custom UI on a defined design system",
        "Structured content models",
        "Load-time tuning and structured data where relevant",
      ],
    },
    {
      name: "Animated",
      tagline: websiteTierTaglines.animated,
      startingPrice: prices[3],
      highlights: [
        "Everything in Modern",
        "Scroll and section animation as the design focus",
        "Interaction detail across key journeys",
        "Animation performance tuning and reduced-motion support",
      ],
    },
  ],
  matrix: websiteTierMatrix,
});

const frontendTech: TechItem[] = [
  {
    name: "HTML5",
    purpose: "The structure of every page, and what search engines read first.",
  },
  {
    name: "CSS3",
    purpose: "Layout, spacing and the responsive behaviour across screen sizes.",
  },
  {
    name: "JavaScript",
    purpose: "Interface behaviour such as menus, filters, sliders and form validation.",
  },
  {
    name: "React.js",
    purpose: "Builds the interface from reusable parts, which keeps larger screens consistent and cheaper to change.",
  },
  {
    name: "Next.js",
    purpose: "The React framework we use for routing, fast page loads and search-engine-friendly rendering.",
  },
];

export const TECH_SCOPE_NOTE =
  "The final stack is chosen per project, based on scope, budget, who will maintain the site and what it needs to connect to. Not every technology listed is used on every project.";

const services: ServiceDetail[] = [
  /* ------------------------------------------------------------------ */
  {
    slug: "web-development",
    title: "Web Development",
    icon: Globe2,
    short:
      "A responsive website or web application shaped around your customers and business goals.",
    deliverables: [
      "Responsive interface development",
      "Custom pages and business features",
      "Forms and third-party integrations",
    ],
    techBadges: ["React.js", "Next.js", "Node.js", "Laravel"],
    overview: [
      "A website is usually the first thing a customer checks before contacting you. This service covers both ends of that: a marketing website that explains your business clearly, and web applications where customers or staff actually do something — book, apply, order, or manage an account.",
      "We start from what the site has to achieve rather than from a template. The structure, the pages and the technology are then chosen to fit that scope, your budget and who will maintain the site after launch.",
    ],
    suitableFor: [
      "Businesses with no website, or one that no longer reflects what they do",
      "Companies whose current site is slow, hard to update or not usable on a phone",
      "Teams that need custom functionality a template cannot provide",
      "Organisations replacing a manual process with an online one",
    ],
    problems: [
      "Enquiries are lost because visitors cannot find what they need",
      "The site cannot be updated without going back to a developer",
      "Poor mobile experience and slow loading drive visitors away",
      "The website sits apart from the tools the business actually runs on",
    ],
    features: [
      {
        group: "Design and build",
        items: [
          "Responsive layouts for mobile, tablet and desktop",
          "Custom page templates built around your content",
          "Accessible markup, semantic headings and keyboard support",
          "Reusable interface components for consistent pages",
        ],
      },
      {
        group: "Functionality",
        items: [
          "Enquiry, booking and multi-step forms with validation",
          "Search, filtering and listing pages",
          "User accounts and authentication where the scope requires it",
          "Admin screens for managing your own data",
        ],
      },
      {
        group: "Platform and launch",
        items: [
          "CMS or e-commerce platform setup where that suits the project",
          "Third-party and API integrations as scoped",
          "Basic SEO structure, metadata and a sitemap",
          "Deployment to your hosting with a handover walkthrough",
        ],
      },
    ],
    tech: [
      { label: "Frontend", items: frontendTech },
      {
        label: "Backend",
        items: [
          {
            name: "Node.js",
            purpose: "Runs server-side logic and APIs for JavaScript-based projects.",
          },
          {
            name: "PHP",
            purpose: "A long-established server language, used where the project or hosting calls for it.",
          },
          {
            name: "Laravel",
            purpose: "A PHP framework we use for structured business logic, admin areas and authentication.",
          },
        ],
      },
      {
        label: "CMS and e-commerce",
        items: [
          {
            name: "WordPress",
            purpose: "For sites where your team needs to publish and edit content without a developer.",
          },
          {
            name: "WooCommerce",
            purpose: "Adds product listings, a cart and checkout to a WordPress site.",
          },
          {
            name: "Shopify",
            purpose: "A hosted store platform, when selling online is the main purpose of the site.",
          },
        ],
      },
    ],
    tiers: websiteTiers([70000, 120000, 180000, 240000]),
    addOns: [
      "Additional pages or modules beyond the agreed scope",
      "Copywriting, photography and custom illustration",
      "Multi-language setup",
      "Advanced SEO work and content strategy",
      "Ongoing maintenance through a monthly care plan",
    ],
    exclusions: [
      "Domain registration and hosting, paid directly by you unless stated otherwise",
      "Paid plugins, themes, stock assets and font licences",
      "Third-party API, gateway and subscription charges",
      "GST, where applicable, is charged additionally",
    ],
    timelineDrivers: commonTimelineDrivers,
    enquiryValue: "Web Development",
    metaTitle: "Web Development Services",
    metaDescription:
      "Custom website and web application development using React, Next.js, Node.js, Laravel and WordPress, with four project tiers from Busiserve Infotech Solution, Noida.",
    related: ["wordpress-development", "shopify-development", "ui-ux-design"],
  },

  /* ------------------------------------------------------------------ */
  {
    slug: "wordpress-development",
    title: "WordPress Website Development",
    cardTitle: "WordPress Development",
    icon: PanelsTopLeft,
    short:
      "A website your own team can keep up to date, built on WordPress and handed over with training.",
    deliverables: [
      "Business, corporate and portfolio sites",
      "Theme customisation and page building",
      "SEO setup, security and performance",
    ],
    techBadges: ["WordPress", "PHP", "WooCommerce", "MySQL"],
    overview: [
      "WordPress suits businesses that need a website and want to manage the content themselves. Once it is handed over, your team can add pages, publish posts, change text and swap images from an admin dashboard, without a developer in the loop for routine updates.",
      "We build on a customised theme rather than installing a stock one and leaving it. The structure is set up around your content, the editing experience is kept simple, and you receive a walkthrough of how to use it.",
    ],
    suitableFor: [
      "Businesses that publish content regularly — news, blogs, offers or case studies",
      "Teams that want to control their own website without a retainer",
      "Companies needing a credible site live within a predictable budget",
      "Shops selling a modest product range, using WooCommerce",
    ],
    problems: [
      "Every small text or image change has to be requested and waited on",
      "The current site has an unused or confusing admin area",
      "A theme-built site has become slow and cluttered with plugins",
      "Content is spread across pages with no consistent structure",
    ],
    features: [
      {
        group: "Website types",
        items: [
          "Business and corporate websites",
          "Landing pages for a campaign or single service",
          "Portfolio and gallery websites",
          "Blog and content-led websites",
        ],
      },
      {
        group: "Standard in every build",
        items: [
          "Theme customisation to your brand",
          "Responsive layouts across devices",
          "Content management setup and an editing walkthrough",
          "Contact and enquiry forms",
          "Basic SEO setup: titles, descriptions, sitemap and crawlable structure",
          "Performance optimisation including image handling and caching",
          "Security hardening: admin access, roles, updates and backups configured",
        ],
      },
      {
        group: "Scoped per project",
        items: [
          "Plugin selection and integration",
          "WooCommerce store setup with products and checkout",
          "Payment gateway integration",
          "Migration of an existing website to WordPress",
          "Maintenance after launch, where agreed",
        ],
      },
    ],
    tech: [
      {
        label: "Platform",
        items: [
          {
            name: "WordPress",
            purpose: "The content management system that gives your team the admin dashboard to edit the site.",
          },
          {
            name: "WooCommerce",
            purpose: "The WordPress e-commerce plugin, added only when the site needs to sell products.",
          },
        ],
      },
      {
        label: "Build",
        items: [
          {
            name: "PHP",
            purpose: "The language WordPress itself runs on, used for theme and custom functionality work.",
          },
          {
            name: "HTML5",
            purpose: "The page structure inside the theme templates.",
          },
          {
            name: "CSS3",
            purpose: "The visual design and responsive behaviour of the theme.",
          },
          {
            name: "JavaScript",
            purpose: "Interface behaviour such as menus, sliders, tabs and form checks.",
          },
        ],
      },
      {
        label: "Data",
        items: [
          {
            name: "MySQL",
            purpose: "The database behind every WordPress site, holding your pages, posts and settings. It is part of standard WordPress hosting rather than something added per project.",
          },
        ],
      },
    ],
    tiers: websiteTiers([70000, 120000, 180000, 240000]),
    addOns: [
      "WooCommerce store setup on a non-commerce build",
      "Payment gateway integration",
      "Migration from an existing platform",
      "Multi-language setup",
      "Paid premium plugins or themes, where a project needs them",
      "A monthly care plan for updates, backups and changes",
    ],
    exclusions: [
      "Domain, hosting and SSL, paid directly by you unless stated otherwise",
      "Premium plugin, theme and stock image licences",
      "Payment gateway fees and third-party subscriptions",
      "GST, where applicable, is charged additionally",
    ],
    timelineDrivers: commonTimelineDrivers,
    enquiryValue: "WordPress Website Development",
    metaTitle: "WordPress Website Development",
    metaDescription:
      "WordPress website development in Noida: theme customisation, content management, WooCommerce, SEO setup, performance and security hardening, across four project tiers.",
    related: ["web-development", "shopify-development", "cms-development"],
  },

  /* ------------------------------------------------------------------ */
  {
    slug: "shopify-development",
    title: "Shopify Store Development",
    cardTitle: "Shopify Development",
    icon: ShoppingBag,
    short:
      "An online store set up on Shopify, with products, payments and delivery configured and ready to sell.",
    deliverables: [
      "Store setup and theme customisation",
      "Products, variants and collections",
      "Payments, shipping and tax configuration",
    ],
    techBadges: ["Shopify", "Liquid", "Shopify Apps", "JavaScript"],
    overview: [
      "Shopify is a hosted e-commerce platform: it provides the store software, hosting and checkout, and you pay Shopify a subscription for it. That removes most of the server and payment-security work from an online store, which is why it suits businesses that want to start selling without building a platform first.",
      "This service covers the work around that platform — designing and customising the storefront, configuring products and variants, setting up payments, shipping and taxes, and connecting the apps your store needs. The Shopify subscription, transaction fees and any paid apps are billed to you by those providers directly.",
    ],
    suitableFor: [
      "Businesses selling physical products online for the first time",
      "Retailers moving from social-media or WhatsApp selling to a real storefront",
      "Brands whose existing store looks generic or converts poorly",
      "Sellers who want to run the store themselves after launch",
    ],
    problems: [
      "Orders are taken over chat and tracked by hand",
      "The store looks like an unmodified default theme",
      "Customers abandon a confusing cart or checkout",
      "Stock, variants and delivery charges are not set up correctly",
    ],
    features: [
      {
        group: "Store setup",
        items: [
          "Shopify store setup and configuration",
          "Storefront design and theme customisation",
          "Essential pages: about, contact, shipping, returns and policies",
          "Mobile-responsive layouts throughout",
        ],
      },
      {
        group: "Products and orders",
        items: [
          "Product and collection setup",
          "Variants, options and inventory configuration",
          "Cart and checkout configuration",
          "Payment gateway setup, where supported in your region",
          "Shipping, delivery zones and rate configuration",
          "Tax settings, where applicable to your business",
          "Discount codes and promotional offers",
        ],
      },
      {
        group: "Growth and integrations",
        items: [
          "Basic SEO setup for products and collections",
          "Analytics and tracking integration",
          "Email marketing integration",
          "Product filtering and search",
          "App integrations as scoped",
          "Migration from another platform, where agreed",
          "Post-launch support, where included in the agreement",
        ],
      },
    ],
    tech: [
      {
        label: "Platform",
        items: [
          {
            name: "Shopify",
            purpose: "The hosted platform that runs the store, the checkout and the admin you manage orders from.",
          },
          {
            name: "Liquid",
            purpose: "Shopify's own templating language, used to customise how theme pages are built and what they display.",
          },
          {
            name: "Shopify Apps",
            purpose: "Add-ons from the Shopify app store for reviews, filtering, email and similar needs. Paid apps carry their own subscription.",
          },
        ],
      },
      {
        label: "Storefront",
        items: [
          {
            name: "HTML5",
            purpose: "The page structure inside theme templates.",
          },
          {
            name: "CSS3",
            purpose: "The visual design and responsive behaviour of the storefront.",
          },
          {
            name: "JavaScript",
            purpose: "Storefront behaviour such as filtering, galleries and cart interactions.",
          },
        ],
      },
      {
        label: "Custom storefronts",
        items: [
          {
            name: "React.js and Next.js",
            purpose: "Used only for a headless or custom storefront, where a project has been assessed as needing one. A standard Shopify store does not require them.",
          },
        ],
      },
    ],
    tiers: {
      note: "Shopify store scope is quoted after a requirement assessment. The tiers below describe how much design and configuration work each level covers; they do not carry a published price, and they do not include your Shopify subscription.",
      items: [
        {
          name: "Basic",
          tagline: "A clean, working store on a customised standard theme.",
          startingPrice: null,
          highlights: [
            "Store setup on a customised standard theme",
            "An initial set of products and collections",
            "Payment and shipping configuration",
            "Essential pages and responsive layouts",
          ],
        },
        {
          name: "Premium",
          tagline: "A wider catalogue with the merchandising set up properly.",
          startingPrice: null,
          highlights: [
            "Everything in Basic",
            "Larger catalogue with variants and inventory setup",
            "Section-level design work across key pages",
            "Discounts, filtering and analytics integration",
          ],
        },
        {
          name: "Modern",
          tagline: "A custom storefront design on a defined design system.",
          startingPrice: null,
          highlights: [
            "Everything in Premium",
            "Custom storefront design and templates",
            "App integrations as scoped",
            "SEO setup across products and collections",
          ],
        },
        {
          name: "Animated",
          tagline: "The Modern tier with motion design through the storefront.",
          startingPrice: null,
          highlights: [
            "Everything in Modern",
            "Motion and interaction detail across key journeys",
            "Animated product and collection presentation",
            "Animation performance tuning and reduced-motion support",
          ],
        },
      ],
      matrix: [
        {
          label: "Store setup scope",
          values: [
            "Core store configuration",
            "Core configuration with merchandising setup",
            "Full configuration with custom templates",
            "Full configuration with custom templates",
          ],
        },
        {
          label: "Product configuration",
          values: [
            "Initial product set",
            "Larger catalogue with variants and inventory",
            "Larger catalogue with structured collections",
            "Larger catalogue with structured collections",
          ],
        },
        {
          label: "Design customisation",
          values: [
            "Standard theme customised to your brand",
            "Section-level design across key pages",
            "Custom storefront on a design system",
            "Custom storefront with motion design",
          ],
        },
        {
          label: "Integrations",
          values: [
            "Payments and shipping",
            "Adds analytics and email marketing",
            "Adds scoped app integrations",
            "Adds scoped app integrations",
          ],
        },
        {
          label: "Responsive design",
          values: [
            "Included",
            "Included",
            "Included",
            "Included",
          ],
        },
        {
          label: "SEO setup",
          values: [
            "Titles, descriptions and store structure",
            "Adds product and collection metadata",
            "Adds structured data where relevant",
            "Adds structured data where relevant",
          ],
        },
        {
          label: "Advanced functionality",
          values: [
            "Not included",
            "Filtering and discount setup",
            "Scoped custom functionality",
            "Scoped custom functionality with motion",
          ],
        },
      ],
    },
    addOns: [
      "Migration from WooCommerce, WordPress or another platform",
      "Bulk product data entry beyond the agreed set",
      "Product photography and copywriting",
      "Custom or headless storefront development",
      "Post-launch support beyond the included period",
    ],
    exclusions: [
      "Your Shopify subscription, billed to you by Shopify",
      "Paid theme and paid app subscriptions",
      "Payment gateway and transaction fees",
      "Domain registration, where not already held",
      "GST, where applicable, is charged additionally",
    ],
    timelineDrivers: [
      "The size of the product catalogue and how ready the product data is",
      "How quickly product images, descriptions and policy content are provided",
      "Payment gateway and business verification turnaround, which sits with the provider",
      "Review and approval turnaround at each stage",
    ],
    enquiryValue: "Shopify Store Development",
    metaTitle: "Shopify Store Development",
    metaDescription:
      "Shopify store setup and storefront design: products and variants, checkout, payment gateways, shipping, SEO and app integrations, from Busiserve Infotech Solution.",
    related: ["wordpress-development", "web-development", "ui-ux-design"],
  },

  /* ------------------------------------------------------------------ */
  {
    slug: "app-development",
    title: "Mobile App Development",
    cardTitle: "App Development",
    icon: Smartphone,
    short:
      "Bring your service to mobile with focused journeys and interfaces designed for smaller screens.",
    deliverables: [
      "Android and iOS apps",
      "User journeys and app interfaces",
      "Backend and API integration",
    ],
    techBadges: ["Flutter", "Dart", "React Native", "Node.js"],
    overview: [
      "A mobile app earns its place when customers or staff use a service often enough that a browser tab is friction — repeat ordering, field work, bookings, tracking or anything that needs notifications or offline access.",
      "We build cross-platform, so one codebase serves Android and iOS. That keeps the build and the later changes to one piece of work instead of two, which is usually the deciding factor on cost.",
    ],
    suitableFor: [
      "Businesses whose customers order, book or check status repeatedly",
      "Teams with field staff who need to record work on a phone",
      "Services that depend on notifications or location",
      "Products validated on the web and now moving to mobile",
    ],
    problems: [
      "A mobile website cannot do what the service needs",
      "Field data is collected on paper and entered again later",
      "There is no reliable way to reach customers after they leave the site",
      "Separate Android and iOS builds would double the cost",
    ],
    features: [
      {
        group: "App build",
        items: [
          "Android and iOS apps from one cross-platform codebase",
          "Screen design and user journeys for smaller screens",
          "Offline-tolerant behaviour where the scope requires it",
          "Store submission preparation and build configuration",
        ],
      },
      {
        group: "Functionality",
        items: [
          "Authentication and user accounts",
          "Backend and API integration",
          "Push notifications",
          "Forms, uploads and in-app media handling",
          "Payments inside the app, where the scope and platform rules allow",
        ],
      },
      {
        group: "Handover",
        items: [
          "Admin or backend screens where the app needs them",
          "Testing across a range of device sizes and OS versions",
          "Release builds handed over to your developer accounts",
          "Post-launch support, where included in the agreement",
        ],
      },
    ],
    tech: [
      {
        label: "Mobile",
        items: [
          {
            name: "Flutter",
            purpose: "Builds Android and iOS from one codebase, with close control over the interface.",
          },
          {
            name: "Dart",
            purpose: "The language Flutter apps are written in.",
          },
          {
            name: "React Native",
            purpose: "The alternative cross-platform option, chosen when a project already uses React on the web.",
          },
        ],
      },
      {
        label: "Backend",
        items: [
          {
            name: "Node.js",
            purpose: "Runs the APIs, authentication and notification services the app talks to.",
          },
          {
            name: "JavaScript",
            purpose: "The language used across React Native apps and Node.js services.",
          },
        ],
      },
    ],
    addOns: [
      "A separate admin web dashboard",
      "In-app chat or live tracking",
      "Analytics and crash reporting setup",
      "App store account setup and listing content",
      "Ongoing maintenance and OS-version updates",
    ],
    exclusions: [
      "Apple Developer and Google Play account fees, paid directly by you",
      "Backend hosting and push notification service charges",
      "Third-party API and SDK subscription costs",
      "App store review outcomes and timelines, which sit with the platforms",
      "GST, where applicable, is charged additionally",
    ],
    timelineDrivers: [
      "The number of screens and modules in the agreed scope",
      "Whether a backend already exists or has to be built",
      "App store review time, which is controlled by Apple and Google",
      "Review and approval turnaround at each stage",
    ],
    enquiryValue: "Mobile App Development",
    metaTitle: "Mobile App Development",
    metaDescription:
      "Android and iOS app development with Flutter and React Native: authentication, backend integration and push notifications, from Busiserve Infotech Solution, Noida.",
    related: ["web-development", "crm-development", "ui-ux-design"],
  },

  /* ------------------------------------------------------------------ */
  {
    slug: "game-design",
    title: "Game Design and Prototyping",
    cardTitle: "Game Design",
    icon: Gamepad2,
    short:
      "Turn an idea into an interactive experience with clear mechanics and a considered player journey.",
    deliverables: [
      "Game concepts and core mechanics",
      "Player flows and interface design",
      "Interactive prototypes",
    ],
    techBadges: ["Game design", "Prototyping", "UI mockups", "Art direction"],
    overview: [
      "This is a design and prototyping service. The work is the thinking a game needs before production: what the player does, why it stays interesting, how a level is shaped, and how it all looks and feels.",
      "The output is documentation and a playable prototype you can test an idea with, not a finished and published game. Full game production is confirmed with our engineering team against your specific requirements before anything is committed.",
    ],
    suitableFor: [
      "Studios and founders validating a concept before funding production",
      "Brands exploring a game or interactive campaign",
      "Teams that need a design document before hiring developers",
      "Educational and training products with game-style interaction",
    ],
    problems: [
      "The idea exists but nothing is written down to build or pitch from",
      "Mechanics have never been tested with a real player",
      "The art and interface direction is undecided",
      "There is no scope document to quote production against",
    ],
    features: [
      {
        group: "Design",
        items: [
          "Game concept development",
          "Core mechanics and progression design",
          "Game design documentation",
          "Level and scenario outlines",
        ],
      },
      {
        group: "Look and feel",
        items: [
          "Art direction and visual references",
          "UI and HUD mockups",
          "Motion direction for interface and feedback",
          "Sound direction and audio references",
        ],
      },
      {
        group: "Validation",
        items: [
          "Playable prototypes, where supported and confirmed for the project",
          "Player flow and onboarding design",
          "Review sessions against the design goals",
        ],
      },
    ],
    tech: [
      {
        label: "Design output",
        items: [
          {
            name: "Game design documentation",
            purpose: "The written specification a development team builds and quotes from.",
          },
          {
            name: "UI and HUD mockups",
            purpose: "Screen designs showing what the player sees and controls.",
          },
        ],
      },
      {
        label: "Prototyping",
        items: [
          {
            name: "HTML5, CSS3 and JavaScript",
            purpose: "Used for browser-playable prototypes that test a mechanic quickly.",
          },
          {
            name: "React.js",
            purpose: "Used where a prototype needs more interface structure than a single page.",
          },
        ],
      },
    ],
    addOns: [
      "Additional level or scenario design",
      "Extended art direction and asset production",
      "Pitch deck and investor material",
      "Full game production, subject to engineering confirmation",
    ],
    exclusions: [
      "Full game production and publishing, unless separately agreed",
      "Game engine, store and platform licence fees",
      "Paid asset, font and audio licences",
      "GST, where applicable, is charged additionally",
    ],
    timelineDrivers: [
      "The depth of mechanics and the number of levels in scope",
      "Whether a playable prototype is included",
      "Art direction rounds and approval turnaround",
      "How defined the concept is at the start",
    ],
    enquiryValue: "Game Design and Prototyping",
    metaTitle: "Game Design and Prototyping",
    metaDescription:
      "Game concepts, core mechanics, design documentation, level outlines, art direction, UI mockups and playable prototypes from Busiserve Infotech Solution.",
    related: ["ui-ux-design", "app-development", "web-development"],
  },

  /* ------------------------------------------------------------------ */
  {
    slug: "ui-ux-design",
    title: "UI/UX and Graphic Design",
    cardTitle: "UI/UX and Graphic Design",
    icon: PenTool,
    short:
      "Research, screen design and design systems that make a product clear to the people using it.",
    deliverables: [
      "Wireframes and screen design",
      "Design systems and components",
      "Clickable prototypes",
    ],
    techBadges: ["UI/UX", "Design systems", "Prototypes", "Brand assets"],
    overview: [
      "Design decides whether people can actually use what you have built. This service covers the work before and around development: understanding the user, structuring the screens, designing them, and documenting the result so it can be built consistently.",
      "It can run ahead of a build with us, or stand alone as a handover to your own development team.",
    ],
    suitableFor: [
      "Products where users get stuck, drop off or need support to complete a task",
      "Teams about to build and wanting the screens settled first",
      "Businesses whose interfaces have drifted apart visually",
      "Companies that need a design handover their own developers can build from",
    ],
    problems: [
      "Users cannot complete the task the product exists for",
      "Every screen looks slightly different from the last",
      "Development starts without agreed screens and gets reworked",
      "There is no shared reference for colour, type and components",
    ],
    features: [
      {
        group: "Research and structure",
        items: [
          "User research and review of existing journeys",
          "Information architecture and screen flows",
          "Wireframes for the agreed scope",
        ],
      },
      {
        group: "Design",
        items: [
          "Screen design for web and mobile",
          "Design systems: colour, typography, spacing and components",
          "Responsive layout behaviour across breakpoints",
          "Motion design for transitions and feedback, where applicable",
          "Graphic and brand assets as scoped",
        ],
      },
      {
        group: "Validation and handover",
        items: [
          "Clickable prototypes for review and testing",
          "Accessibility review of contrast, focus and hierarchy",
          "Developer handover with specifications and assets",
        ],
      },
    ],
    tech: [
      {
        label: "Coded prototypes",
        items: [
          {
            name: "HTML5 and CSS3",
            purpose: "Used for prototypes that need to behave like a real page in a browser.",
          },
          {
            name: "JavaScript",
            purpose: "Adds real interaction to a prototype so a journey can be tested properly.",
          },
        ],
      },
      {
        label: "Web handover",
        items: [
          {
            name: "React.js and Next.js",
            purpose: "Where the design is handed over as components for a React or Next.js build.",
          },
        ],
      },
      {
        label: "Mobile handover",
        items: [
          {
            name: "Flutter and React Native",
            purpose: "Where screens are prepared for a cross-platform mobile build.",
          },
        ],
      },
    ],
    addOns: [
      "Usability testing with participants",
      "Extended brand identity work",
      "Illustration and icon set production",
      "Marketing and social media design",
      "Front-end implementation of the approved design",
    ],
    exclusions: [
      "Paid font, stock image and icon licences",
      "Participant incentives for user testing",
      "Development, unless separately scoped",
      "GST, where applicable, is charged additionally",
    ],
    timelineDrivers: [
      "The number of screens and journeys in scope",
      "Whether research and testing are included",
      "Design review rounds and approval turnaround",
      "Availability of brand assets and existing material",
    ],
    enquiryValue: "UI/UX and Graphic Design",
    metaTitle: "UI/UX and Graphic Design Services",
    metaDescription:
      "User research, wireframes, screen design, design systems, clickable prototypes and motion design for web and mobile products, from Busiserve Infotech Solution.",
    related: ["web-development", "app-development", "game-design"],
  },

  /* ------------------------------------------------------------------ */
  {
    slug: "cms-development",
    title: "CMS Development",
    icon: LayoutGrid,
    short:
      "Make publishing and maintaining your content easier with an organised editing experience.",
    deliverables: [
      "WordPress, Drupal or custom CMS",
      "Content models and editing workflows",
      "Roles and publishing permissions",
    ],
    techBadges: ["WordPress", "Drupal", "Headless CMS", "Next.js"],
    overview: [
      "A content management system is what lets your team change the website without a developer. This service covers the structure behind that: how content is modelled, who can edit and publish it, and how it reaches the site.",
      "For a straightforward business website, that usually means WordPress — covered in detail under WordPress Website Development. This service is for the cases that need more: a headless setup feeding several front-ends, a custom editorial workflow, or content shared between a site and an app.",
    ],
    suitableFor: [
      "Teams with several editors and a real approval process",
      "Businesses publishing the same content to a website and an app",
      "Organisations with structured content such as products, courses or listings",
      "Companies outgrowing a page-builder site",
    ],
    problems: [
      "Content is duplicated by hand across pages and platforms",
      "Anyone with access can publish anything",
      "The content structure cannot express what the business sells",
      "Editors avoid the admin area because it is confusing",
    ],
    features: [
      {
        group: "Content structure",
        items: [
          "Content models for your real content types",
          "Taxonomies, categories and relationships",
          "Media library organisation",
          "Reusable content blocks and templates",
        ],
      },
      {
        group: "Workflow and access",
        items: [
          "Editing workflows with draft, review and publish states",
          "Roles and publishing permissions",
          "Scheduled publishing where needed",
          "Editor training and handover documentation",
        ],
      },
      {
        group: "Delivery",
        items: [
          "WordPress, Drupal or a custom CMS, chosen to fit the scope",
          "Headless CMS with an API-driven front-end",
          "Migration of existing content",
          "Search and listing pages driven by the content model",
        ],
      },
    ],
    tech: [
      {
        label: "Platforms",
        items: [
          {
            name: "WordPress",
            purpose: "The usual choice for business and content websites, with a familiar admin area.",
          },
          {
            name: "Drupal",
            purpose: "Used where structured content and fine-grained permissions matter more than simplicity.",
          },
          {
            name: "Headless CMS",
            purpose: "Content kept in one place and delivered by API to a website, an app or both.",
          },
        ],
      },
      {
        label: "Front-end",
        items: [
          {
            name: "React.js and Next.js",
            purpose: "Build the public site that reads from a headless CMS.",
          },
          {
            name: "PHP",
            purpose: "The language behind WordPress and Drupal, used for custom modules and templates.",
          },
        ],
      },
    ],
    addOns: [
      "Content migration beyond the agreed volume",
      "Multi-language and localisation setup",
      "Custom editor plugins or modules",
      "Editorial training sessions",
      "Ongoing maintenance through a care plan",
    ],
    exclusions: [
      "Hosting, CDN and CMS subscription costs",
      "Paid plugin, module and theme licences",
      "Content writing and editing",
      "GST, where applicable, is charged additionally",
    ],
    timelineDrivers: commonTimelineDrivers,
    enquiryValue: "CMS Development",
    metaTitle: "CMS Development Services",
    metaDescription:
      "Content management system development with WordPress, Drupal, headless CMS and Next.js: content models, editing workflows and publishing permissions.",
    related: ["wordpress-development", "web-development", "api-development"],
  },

  /* ------------------------------------------------------------------ */
  {
    slug: "crm-development",
    title: "CRM Development",
    cardTitle: "CRM Solutions",
    icon: Users,
    short:
      "Keep leads, customer history and follow-ups in one place so your team can act with context.",
    deliverables: [
      "Lead and customer management",
      "Sales pipelines and follow-ups",
      "Reports and workflow integrations",
    ],
    techBadges: ["React.js", "Next.js", "Node.js", "Laravel"],
    overview: [
      "A CRM is where your sales team keeps every lead, conversation and next step. Built around how your team actually sells, it replaces the spreadsheet and the memory of whoever spoke to the customer last.",
      "We build custom rather than configure a licensed product when the sales process has specifics an off-the-shelf tool fights against, or when per-user licensing stops making sense as the team grows.",
    ],
    suitableFor: [
      "Sales teams tracking leads in spreadsheets or WhatsApp",
      "Businesses where follow-ups depend on an individual remembering",
      "Companies needing visibility across several salespeople or branches",
      "Teams whose process does not fit a standard CRM product",
    ],
    problems: [
      "Leads go cold because nobody owns the follow-up",
      "Customer history is lost when a salesperson leaves",
      "Management has no reliable view of the pipeline",
      "The same customer is contacted twice by different people",
    ],
    features: [
      {
        group: "Core CRM",
        items: [
          "Lead capture and assignment",
          "Contact and company management",
          "Sales pipelines with configurable stages",
          "Activity history on every record",
          "Follow-up reminders and task lists",
        ],
      },
      {
        group: "Control and visibility",
        items: [
          "Role-based access for salespeople, managers and admins",
          "Reporting on pipeline, conversion and activity",
          "Dashboards per role",
          "Import and export of customer data",
        ],
      },
      {
        group: "Scoped per project",
        items: [
          "A mobile app for the sales team",
          "Email and messaging integrations",
          "Website and lead-form integration",
          "Quotation and invoice generation",
          "Integrations with the tools you already run",
        ],
      },
    ],
    tech: [
      {
        label: "Frontend",
        items: [
          {
            name: "React.js",
            purpose: "Builds the data-heavy screens a CRM needs — lists, filters and record views.",
          },
          {
            name: "Next.js",
            purpose: "The framework around React, handling routing, access control and performance.",
          },
        ],
      },
      {
        label: "Backend",
        items: [
          {
            name: "Node.js",
            purpose: "Runs the APIs, permissions and business rules for JavaScript-based builds.",
          },
          {
            name: "PHP and Laravel",
            purpose: "The alternative backend, used where it suits your hosting or existing systems.",
          },
        ],
      },
      {
        label: "Sales app",
        items: [
          {
            name: "React Native or Flutter",
            purpose: "For a field sales app on Android and iOS, where the scope includes one.",
          },
        ],
      },
    ],
    addOns: [
      "A mobile app for field sales",
      "Call, email or WhatsApp integration",
      "Advanced reporting and forecasting",
      "Data migration from an existing CRM",
      "Staff training sessions",
    ],
    exclusions: [
      "Hosting, database and infrastructure costs",
      "Third-party API, messaging and email service charges",
      "Licence fees for any commercial product being integrated",
      "GST, where applicable, is charged additionally",
    ],
    timelineDrivers: [
      "The number of modules and user roles in the agreed scope",
      "How clearly the current sales process is defined",
      "Data migration volume and quality",
      "Integration dependencies with existing systems",
    ],
    enquiryValue: "CRM Development",
    metaTitle: "CRM Development Services",
    metaDescription:
      "Custom CRM development with React, Next.js, Node.js and Laravel: lead management, sales pipelines, follow-up reminders, role-based access and reporting.",
    related: ["erp-development", "app-development", "api-development"],
  },

  /* ------------------------------------------------------------------ */
  {
    slug: "erp-development",
    title: "ERP Development",
    icon: Building2,
    short:
      "Connect key business functions and reduce the friction of working across disconnected tools.",
    deliverables: [
      "Inventory and operational modules",
      "Finance and HR workflows",
      "Role-based dashboards and reporting",
    ],
    techBadges: ["React.js", "Next.js", "Node.js", "Laravel"],
    overview: [
      "An ERP is the system the business runs on: stock, sales, purchasing, accounts and the approvals between them, in one place instead of several spreadsheets and ledgers that never quite agree.",
      "ERP work is scoped in modules. We start with the part causing the most pain — usually inventory or purchasing — and extend from there, so the business gets something working early rather than waiting for everything.",
    ],
    suitableFor: [
      "Businesses running operations across disconnected spreadsheets",
      "Companies with stock across several locations or branches",
      "Teams where approvals happen over calls and messages",
      "Organisations that cannot get a reliable current picture of the business",
    ],
    problems: [
      "Stock figures on paper do not match what is in the warehouse",
      "Purchase and sales records have to be reconciled by hand",
      "Approvals stall because nobody knows what is pending",
      "Month-end reporting takes days of manual collation",
    ],
    features: [
      {
        group: "Operations",
        items: [
          "Inventory and stock management",
          "Sales orders and invoicing",
          "Purchasing and supplier management",
          "Warehouse and location handling",
        ],
      },
      {
        group: "Finance and control",
        items: [
          "Accounts and ledger modules as scoped",
          "Approval workflows with role-based limits",
          "Role-based access across departments",
          "Reporting and dashboards per role",
          "Audit trails on business-critical records",
        ],
      },
      {
        group: "Scoped per project",
        items: [
          "HR and payroll modules",
          "Multi-branch and multi-warehouse capability",
          "A staff app for stock, attendance or field work",
          "Integrations with accounting software or a CRM",
        ],
      },
    ],
    tech: [
      {
        label: "Frontend",
        items: [
          {
            name: "React.js",
            purpose: "Builds the dense data screens, tables and forms an ERP depends on.",
          },
          {
            name: "Next.js",
            purpose: "Handles routing, role-based access and performance across modules.",
          },
        ],
      },
      {
        label: "Backend",
        items: [
          {
            name: "Node.js",
            purpose: "Runs the business rules, approvals and APIs for JavaScript-based builds.",
          },
          {
            name: "PHP and Laravel",
            purpose: "The alternative backend, used where it suits your hosting or existing systems.",
          },
        ],
      },
      {
        label: "Staff app",
        items: [
          {
            name: "React Native or Flutter",
            purpose: "For a staff app on Android and iOS, where the scope includes one.",
          },
        ],
      },
    ],
    addOns: [
      "Additional modules beyond the agreed scope",
      "HR and payroll",
      "A mobile app for staff",
      "Data migration from existing systems",
      "Staff training and rollout support",
    ],
    exclusions: [
      "Hosting, database and infrastructure costs",
      "Licence fees for third-party systems being integrated",
      "Statutory and compliance certification, where required",
      "GST, where applicable, is charged additionally",
    ],
    timelineDrivers: [
      "The number of modules and departments in the agreed scope",
      "How well current processes are documented",
      "Data migration volume and quality",
      "Approval turnaround across the departments involved",
    ],
    enquiryValue: "ERP Development",
    metaTitle: "ERP Development Services",
    metaDescription:
      "Custom ERP development with React, Next.js, Node.js and Laravel: inventory, sales, purchasing, accounts, approvals, reporting and optional HR and multi-branch modules.",
    related: ["crm-development", "api-development", "app-development"],
  },

  /* ------------------------------------------------------------------ */
  {
    slug: "api-development",
    title: "API Development",
    icon: Code2,
    short:
      "Build the connections your products need to exchange information and support new functionality.",
    deliverables: [
      "Custom API endpoints",
      "Third-party service integrations",
      "Authentication and API documentation",
    ],
    techBadges: ["Node.js", "Laravel", "REST", "Webhooks"],
    overview: [
      "An API is how two systems talk to each other. This service covers building the ones your products expose, and connecting to the ones your business depends on — payment gateways, messaging, logistics, accounting or an internal system.",
      "The work includes the parts that are easy to leave out and expensive to retrofit: authentication, rate limits, error handling and documentation a developer can actually work from.",
    ],
    suitableFor: [
      "Businesses whose website, app and internal tools cannot share data",
      "Companies integrating a payment, messaging or logistics provider",
      "Teams exposing data to partners or a mobile app",
      "Organisations replacing manual data transfer between systems",
    ],
    problems: [
      "Data is exported from one system and imported into another by hand",
      "Each integration was built differently and breaks unpredictably",
      "There is no documentation for an existing API",
      "Access to business data is not properly controlled",
    ],
    features: [
      {
        group: "Build",
        items: [
          "Custom REST endpoints designed around real use",
          "Authentication, tokens and permission scopes",
          "Validation, error handling and rate limiting",
          "Webhooks for event-driven updates",
        ],
      },
      {
        group: "Integration",
        items: [
          "Third-party service and gateway integration",
          "System-to-system data synchronisation",
          "Scheduled jobs and retry handling",
        ],
      },
      {
        group: "Handover",
        items: [
          "API documentation for your developers",
          "Test environment and sample requests",
          "Monitoring and logging setup as scoped",
        ],
      },
    ],
    tech: [
      {
        label: "Backend",
        items: [
          {
            name: "Node.js",
            purpose: "Runs the API services and handles concurrent requests.",
          },
          {
            name: "PHP and Laravel",
            purpose: "The alternative backend, used where it suits your hosting or existing systems.",
          },
        ],
      },
      {
        label: "Interfaces",
        items: [
          {
            name: "REST",
            purpose: "The standard request-and-response style most services and apps expect.",
          },
          {
            name: "Webhooks",
            purpose: "Lets another system notify yours the moment something happens, instead of polling for changes.",
          },
        ],
      },
    ],
    addOns: [
      "Additional integrations beyond the agreed scope",
      "A developer portal for partners",
      "Monitoring, alerting and uptime dashboards",
      "Migration or versioning of an existing API",
    ],
    exclusions: [
      "Hosting and infrastructure costs",
      "Third-party API, gateway and subscription charges",
      "Changes required by a provider's own API updates after handover",
      "GST, where applicable, is charged additionally",
    ],
    timelineDrivers: [
      "The number of endpoints and integrations in the agreed scope",
      "Quality of the third-party provider's documentation and sandbox",
      "Provider approval or verification steps, which sit with them",
      "Access to the systems being connected",
    ],
    enquiryValue: "API Development",
    metaTitle: "API Development and Integration",
    metaDescription:
      "Custom API development and third-party integration with Node.js and Laravel: REST endpoints, authentication, webhooks and developer documentation.",
    related: ["web-development", "crm-development", "automation-n8n"],
  },

  /* ------------------------------------------------------------------ */
  {
    slug: "ai-agent-development",
    title: "AI Agent Development",
    icon: Bot,
    short:
      "Build assistants around your knowledge and tools, with review and controls suited to the task.",
    deliverables: [
      "Knowledge-connected assistants",
      "Business tool and API connections",
      "Human review and approval steps",
    ],
    techBadges: ["LLM APIs", "RAG", "Node.js", "Next.js"],
    overview: [
      "An AI assistant is useful when it is grounded in your own material — your documents, products, policies or records — rather than answering from general knowledge. This service covers connecting a model to that material and to the tools it needs to act.",
      "How much the assistant is allowed to do on its own is a scoping decision, not a default. Anything that touches a customer, a payment or a record is built with a human approval step unless you decide otherwise.",
    ],
    suitableFor: [
      "Teams answering the same questions repeatedly from known material",
      "Businesses with documentation customers cannot navigate",
      "Support functions handling high volumes of routine enquiries",
      "Companies wanting internal staff assistance over their own systems",
    ],
    problems: [
      "Staff time goes to questions already answered in a document",
      "Information is spread across files nobody can search",
      "A generic chatbot gives answers that are wrong for your business",
      "Routine requests queue behind work that needs a person",
    ],
    features: [
      {
        group: "Grounding",
        items: [
          "Connecting the assistant to your documents and data",
          "Retrieval setup so answers cite your own material",
          "Handling for questions it should refuse or escalate",
        ],
      },
      {
        group: "Action and control",
        items: [
          "Business tool and API connections",
          "Human review and approval steps before an action",
          "Access control over what the assistant can see and do",
          "Logging of conversations and actions taken",
        ],
      },
      {
        group: "Delivery",
        items: [
          "Chat interface on your website or inside an internal tool",
          "Evaluation against real questions before launch",
          "Handover with guidance on monitoring and limits",
        ],
      },
    ],
    tech: [
      {
        label: "AI layer",
        items: [
          {
            name: "LLM APIs",
            purpose: "The language model behind the assistant, accessed through a provider API and billed by usage.",
          },
          {
            name: "Retrieval (RAG)",
            purpose: "Feeds the model your own documents at question time, so answers come from your material.",
          },
        ],
      },
      {
        label: "Application",
        items: [
          {
            name: "Node.js",
            purpose: "Runs the services, tool connections and access control around the model.",
          },
          {
            name: "React.js and Next.js",
            purpose: "Build the chat interface and any admin screens for reviewing conversations.",
          },
        ],
      },
    ],
    addOns: [
      "Additional knowledge sources or tool connections",
      "Ongoing evaluation and prompt tuning",
      "Multi-language support",
      "Voice or telephony channels",
    ],
    exclusions: [
      "AI model provider usage charges, which are metered and billed to you",
      "Hosting, vector database and infrastructure costs",
      "Third-party subscription charges",
      "GST, where applicable, is charged additionally",
    ],
    timelineDrivers: [
      "The volume and state of the knowledge being connected",
      "The number of tools or systems the assistant must reach",
      "How much review and evaluation the use case requires",
      "Approval turnaround on answer quality",
    ],
    enquiryValue: "AI Agent Development",
    metaTitle: "AI Agent Development Services",
    metaDescription:
      "Build AI assistants grounded in your own documents and connected to your business tools, with human review steps, from Busiserve Infotech Solution.",
    related: ["automation-n8n", "api-development", "crm-development"],
  },

  /* ------------------------------------------------------------------ */
  {
    slug: "automation-n8n",
    title: "Automation (n8n)",
    icon: Workflow,
    short:
      "Connect the apps you already use and reduce manual work across recurring business processes.",
    deliverables: [
      "n8n workflow development",
      "Lead routing and notifications",
      "Data syncing and scheduled tasks",
    ],
    techBadges: ["n8n", "Webhooks", "APIs", "Scheduled jobs"],
    overview: [
      "Automation removes the copy-and-paste work between the tools you already pay for: a form submission that has to reach a sheet, a CRM and a WhatsApp notification, or a report that someone assembles every Monday.",
      "We build these as n8n workflows, which keeps them visible and editable rather than buried in code. You can see what each workflow does, and where it failed when something upstream changes.",
    ],
    suitableFor: [
      "Teams moving the same data between apps by hand",
      "Businesses where new leads are not routed quickly enough",
      "Companies running recurring manual reports",
      "Operations with steps that are regularly forgotten",
    ],
    problems: [
      "The same information is entered into three systems",
      "Leads sit unassigned because nobody saw the email",
      "Recurring tasks depend on someone remembering",
      "Failures in a manual process are only noticed later",
    ],
    features: [
      {
        group: "Workflows",
        items: [
          "n8n workflow design and development",
          "Lead capture, routing and assignment",
          "Notifications over email, chat or messaging",
          "Scheduled and recurring tasks",
        ],
      },
      {
        group: "Data movement",
        items: [
          "Synchronisation between apps and databases",
          "Document and report generation",
          "Data transformation between system formats",
        ],
      },
      {
        group: "Reliability",
        items: [
          "Error handling and retry logic",
          "Failure alerts so a broken workflow is noticed",
          "Workflow documentation and handover",
        ],
      },
    ],
    tech: [
      {
        label: "Automation platform",
        items: [
          {
            name: "n8n",
            purpose: "The workflow tool the automations run on. It can be self-hosted on your own server or used on n8n's cloud.",
          },
          {
            name: "Webhooks",
            purpose: "Trigger a workflow the moment something happens in another system.",
          },
        ],
      },
      {
        label: "Connections",
        items: [
          {
            name: "APIs",
            purpose: "How workflows read from and write to the applications you already use.",
          },
          {
            name: "Node.js",
            purpose: "Used for custom logic inside a workflow where the standard nodes are not enough.",
          },
        ],
      },
    ],
    addOns: [
      "Additional workflows beyond the agreed scope",
      "Self-hosted n8n setup on your infrastructure",
      "Monitoring dashboard for workflow health",
      "Team training on editing workflows",
    ],
    exclusions: [
      "n8n cloud subscription or server hosting costs",
      "Third-party app subscription and API charges",
      "Messaging and email delivery charges",
      "GST, where applicable, is charged additionally",
    ],
    timelineDrivers: [
      "The number of workflows and connected apps in scope",
      "API access and credentials for each application",
      "How clearly the current manual process is defined",
      "Rate limits or restrictions on the connected services",
    ],
    enquiryValue: "Automation (n8n)",
    metaTitle: "Business Automation with n8n",
    metaDescription:
      "n8n workflow automation: lead routing, notifications, data synchronisation between apps and scheduled tasks, from Busiserve Infotech Solution, Noida.",
    related: ["api-development", "ai-agent-development", "crm-development"],
  },
];

/**
 * Display order on the services page.
 *
 * The ids are the anchor targets the page has always used, so links
 * to #business-systems and the rest keep working.
 */
export const serviceCategories: ServiceCategory[] = [
  {
    id: "digital-products",
    number: "01",
    label: "Digital products",
    title: "Build something people want to use.",
    description:
      "Create your next customer experience, from a business website or online store to a mobile app.",
    services: [
      "web-development",
      "wordpress-development",
      "shopify-development",
      "app-development",
    ],
  },
  {
    id: "design-experience",
    number: "02",
    label: "Design & experience",
    title: "Make it clear before it is built.",
    description:
      "Research, screen design and prototypes that settle how a product looks and behaves before development starts.",
    services: ["ui-ux-design", "game-design"],
  },
  {
    id: "business-systems",
    number: "03",
    label: "Business systems",
    title: "Give your operations a better foundation.",
    description:
      "Organise your content, customer relationships and internal processes with software built for your team.",
    services: ["cms-development", "crm-development", "erp-development"],
  },
  {
    id: "connected-platforms",
    number: "04",
    label: "Connected platforms",
    title: "Connect your tools. Strengthen your systems.",
    description:
      "Help applications work together while taking a considered approach to access, reliability and security.",
    services: ["api-development"],
  },
  {
    id: "intelligence-automation",
    number: "05",
    label: "Intelligence & automation",
    title: "Less repetitive work. Smarter assistance.",
    description:
      "Intelligent assistants and connected workflows that take the manual steps out of everyday processes.",
    services: ["ai-agent-development", "automation-n8n"],
  },
];

const bySlug = new Map(services.map((service) => [service.slug, service]));

export const serviceCatalogue = services;

export const getService = (slug: string) => bySlug.get(slug);

export const serviceSlugs = services.map((service) => service.slug);

export const servicePath = (slug: string) => `/services/${slug}`;

/** Card label, which may be shorter than the full page title. */
export const serviceCardTitle = (service: ServiceDetail) =>
  service.cardTitle ?? service.title;

/**
 * Options for the enquiry and contact selects.
 *
 * Generated from the catalogue so a new service cannot appear on the
 * site without being selectable in the form.
 */
export const enquiryOptions = [
  ...services.map((service) => service.enquiryValue),
  "Other / Not Sure",
];

/** Resolves a service title used elsewhere in the site to its detail route. */
export function servicePathForTitle(title: string): string | null {
  const needle = title.trim().toLowerCase();

  const match = services.find(
    (service) =>
      service.title.toLowerCase() === needle ||
      serviceCardTitle(service).toLowerCase() === needle ||
      service.enquiryValue.toLowerCase() === needle,
  );

  return match ? servicePath(match.slug) : null;
}

/**
 * Budget bands for the enquiry form.
 *
 * Deliberately broad: the point is to route an enquiry to the right
 * conversation, not to quote from a dropdown.
 */
export const budgetRanges = [
  "Not sure yet",
  "Under ₹50,000",
  "₹50,000 – ₹1,00,000",
  "₹1,00,000 – ₹2,50,000",
  "₹2,50,000 – ₹5,00,000",
  "Above ₹5,00,000",
];
