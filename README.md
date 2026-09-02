# Busiserve — Next.js + Tailwind + Firebase

A production-ready starting point for the Busiserve corporate website shown in the supplied prototype.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Framer Motion
- Lucide React
- React Hook Form + Zod
- Firebase Firestore through Firebase Admin SDK
- API routes for contact and quote submissions

## 1. Install

```bash
npm install
```

## 2. Configure Firebase

Create a Firebase project and enable Firestore.

Then create a service account:

Firebase Console → Project settings → Service accounts → Generate new private key.

Copy the values into `.env.local`:

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

The Firebase Admin credentials are server-only. Never expose them through `NEXT_PUBLIC_*`.

## 3. Run

```bash
npm run dev
```

Open http://localhost:3000.

## 4. Firestore collections

The API creates:

- `contactSubmissions`
- `quoteRequests`

Each document stores form data, status, and timestamps.

## 5. Production Firebase rules

Because writes are performed through the server Admin SDK, you can keep direct browser access closed.

Use `firestore.rules` in this project and deploy:

```bash
firebase deploy --only firestore:rules
```

## 6. Deploy

Recommended:

- Vercel for Next.js
- Firebase for Firestore
- Firebase Storage later if you want a CMS/admin upload system

Add the same environment variables to your deployment provider.

## Prototype assets

The prototype supplied Google-hosted image URLs. This implementation keeps those image references in `src/lib/site-data.ts` so the UI closely follows the prototype.

For production, replace those URLs with local `/public/images/*` assets or Firebase Storage URLs.

## Routes

- `/`
- `/services`
- `/case-studies`
- `/pricing`
- `/about`
- `/contact`
- `/privacy`
- `/terms`

## API

- `POST /api/contact`
- `POST /api/quote`

## Architecture

```text
Browser
  |
  v
Next.js App Router
  |
  +--> Static pages/components
  |
  +--> API Route: /api/contact
  |        |
  |        v
  |    Firebase Admin
  |        |
  |        v
  |    Firestore
  |
  +--> API Route: /api/quote
           |
           v
       Firebase Admin
           |
           v
       Firestore
```
