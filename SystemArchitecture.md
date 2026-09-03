                         ┌─────────────────────┐
                         │       User          │
                         │ Browser / Mobile    │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │      Next.js        │
                         │     App Router      │
                         └──────────┬──────────┘
                                    │
              ┌─────────────────────┼──────────────────────┐
              │                     │                      │
              ▼                     ▼                      ▼
        Static Pages          Client Components       API Routes
              │                     │                      │
              │                     │              ┌───────┴────────┐
              │                     │              │                │
              │                     │              ▼                ▼
              │                     │       /api/contact      /api/quote
              │                     │              │                │
              │                     │              └───────┬────────┘
              │                     │                      │
              │                     │                      ▼
              │                     │             Firebase Admin SDK
              │                     │                      │
              │                     │                      ▼
              │                     │                  Firestore
              │                     │                      │
              │                     │              ┌───────┴────────┐
              │                     │              ▼                ▼
              │                     │        Contact Leads     Quote Leads
              │                     │
              ▼                     ▼
          SEO / SSR             Animations
          Metadata              Forms / UI


##############################################################################################
          Firebase
│
├── Firestore
│   ├── contactSubmissions
│   └── quoteRequests
│
├── Authentication
│   └── Future Admin Dashboard
│
└── Storage
    └── Future CMS / Images / Documents



##############################################################################################

contactSubmissions
│
├── fullName
├── email
├── subject
├── message
├── status
├── createdAt
└── userAgent

#####################################################################################

quoteRequests
│
├── firstName
├── lastName
├── email
├── interest
├── status
├── createdAt
└── userAgent