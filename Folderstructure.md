busiserve-nextjs/
│
├── public/
│   ├── favicon.svg
│   └── logo.svg
│
├── src/
│   │
│   ├── app/
│   │   ├── api/
│   │   │   ├── contact/
│   │   │   │   └── route.ts
│   │   │   │
│   │   │   └── quote/
│   │   │       └── route.ts
│   │   │
│   │   ├── about/
│   │   │   └── page.tsx
│   │   │
│   │   ├── case-studies/
│   │   │   └── page.tsx
│   │   │
│   │   ├── contact/
│   │   │   └── page.tsx
│   │   │
│   │   ├── pricing/
│   │   │   └── page.tsx
│   │   │
│   │   ├── privacy/
│   │   │   └── page.tsx
│   │   │
│   │   ├── services/
│   │   │   └── page.tsx
│   │   │
│   │   ├── terms/
│   │   │   └── page.tsx
│   │   │
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   ├── not-found.tsx
│   │   ├── page.tsx
│   │   ├── robots.ts
│   │   └── sitemap.ts
│   │
│   ├── components/
│   │   ├── CaseStudyCard.tsx
│   │   ├── ContactForm.tsx
│   │   ├── FAQ.tsx
│   │   ├── Footer.tsx
│   │   ├── Header.tsx
│   │   ├── Motion.tsx
│   │   ├── PricingToggle.tsx
│   │   ├── QuoteForm.tsx
│   │   ├── SectionHeading.tsx
│   │   ├── ServiceCard.tsx
│   │   └── icons.tsx
│   │
│   └── lib/
│       ├── firebase-admin.ts
│       ├── site-data.ts
│       └── validation.ts
│
├── .env.example
├── .gitignore
├── eslint.config.mjs
├── firebase.json
├── firestore.indexes.json
├── firestore.rules
├── next-env.d.ts
├── next.config.ts
├── package.json
├── postcss.config.mjs
├── README.md
└── tsconfig.json



updated: Updated folder structure

src/
├── app/
│   ├── login/
│   │   └── page.tsx
│   ├── register/
│   │   └── page.tsx
│   ├── forgot-password/
│   │   └── page.tsx
│   │
│   ├── dashboard/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── profile/
│   │   │   └── page.tsx
│   │   └── payments/
│   │       └── page.tsx
│   │
│   ├── admin/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── users/
│   │   │   └── page.tsx
│   │   └── payments/
│   │       └── page.tsx
│   │
│   ├── checkout/
│   │   └── page.tsx                 ← existing
│   ├── payment/
│   │   └── success/
│   │       └── page.tsx             ← existing
│   │
│   └── api/
│       ├── auth/
│       │   ├── session/
│       │   │   └── route.ts
│       │   └── logout/
│       │       └── route.ts
│       ├── user/
│       │   ├── profile/
│       │   │   └── route.ts
│       │   ├── subscription/
│       │   │   └── route.ts
│       │   └── payments/
│       │       └── route.ts
│       ├── admin/
│       │   ├── stats/
│       │   │   └── route.ts
│       │   ├── users/
│       │   │   └── route.ts
│       │   └── payments/
│       │       └── route.ts
│       └── razorpay/
│           ├── create-order/
│           │   └── route.ts
│           ├── verify-payment/
│           │   └── route.ts
│           └── webhook/
│               └── route.ts
│
├── components/
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   ├── RegisterForm.tsx
│   │   └── ForgotPasswordForm.tsx
│   ├── dashboard/
│   │   ├── DashboardNav.tsx
│   │   ├── SubscriptionCard.tsx
│   │   └── ExpiryCountdown.tsx
│   ├── admin/
│   │   ├── AdminNav.tsx
│   │   └── AdminCharts.tsx
│   ├── PricingToggle.tsx           ← existing
│   └── RazorpayCheckout.tsx        ← existing
│
└── lib/
    ├── firebase/                  ← existing; inspect before editing
    ├── firebase-admin.ts          ← existing
    ├── razorpay.ts                ← existing
    ├── orders.ts                  ← existing
    ├── auth.ts
    ├── plans.ts
    └── subscriptions.ts