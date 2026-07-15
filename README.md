# Duo Funds

> Mobile-first shared expense tracker for two people — with AI-powered slip scanning, real-time sync, and per-person balance breakdown.

[![Nuxt](https://img.shields.io/badge/Nuxt-4-00DC82?logo=nuxt&labelColor=020420)](https://nuxt.com)
[![Firebase](https://img.shields.io/badge/Firebase-12-FFCA28?logo=firebase&labelColor=1a1a1a)](https://firebase.google.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&labelColor=1a1a1a)](https://www.typescriptlang.org)

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Tech Stack](#tech-stack)
4. [Project Structure](#project-structure)
5. [Data Model](#data-model)
6. [Key Design Decisions](#key-design-decisions)
7. [Local Development](#local-development)
8. [Environment Variables](#environment-variables)
9. [Firebase Setup](#firebase-setup)
10. [Deployment](#deployment)
11. [Scripts](#scripts)

---

## Overview

Duo Funds is a **2-person shared money management app** (couples, partners, roommates). The core flow:

1. User uploads a bank transfer slip (photo)
2. AI (Gemini) or fallback OCR (Tesseract.js) analyzes the slip and **pre-fills** amount, date, time, and bank
3. User reviews and confirms — optionally editing any field
4. Transaction is saved to Firestore and synced in real-time to both users
5. The dashboard shows a live balance summary with per-person breakdown and date-range filtering

**Pages (MVP):**
| Route | Description |
|---|---|
| `/login` | Firebase Email/Password sign-in |
| `/` | Dashboard — balance hero, upload slip, transaction list, date filter |
| `/transactions/:id` | Transaction detail with slip image |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser)                         │
│                                                                   │
│  ┌──────────────┐   ┌─────────────────┐   ┌─────────────────┐   │
│  │  Nuxt Pages  │ → │  Pinia Stores   │ → │  Composables    │   │
│  │  (app/pages) │   │  auth           │   │  useFirebase    │   │
│  │              │   │  transactions   │   │  useFirebaseAuth│   │
│  │  Components  │   │  slip-upload    │   │  useFirestoreDB │   │
│  └──────────────┘   └────────┬────────┘   └────────┬────────┘   │
│                               │                      │            │
│                    ┌──────────▼──────────────────────▼────────┐  │
│                    │         Firebase SDK (client)             │  │
│                    │  Auth · Firestore · Storage               │  │
│                    └──────────────────────────────────────────┘  │
└───────────────────────────────┬─────────────────────────────────┘
                                │ HTTPS (server route)
┌───────────────────────────────▼─────────────────────────────────┐
│                       NUXT SERVER (Nitro)                         │
│                                                                   │
│  POST /api/analyze-slip                                           │
│  ├── validate request (Zod)                                       │
│  ├── try Gemini API  → structured JSON response                   │
│  └── fallback: Tesseract.js OCR → regex field extraction         │
└─────────────────────────────────────────────────────────────────┘
```

### State Management Flow

```
Firebase onAuthStateChanged
        │
        ▼
   useFirebaseAuth.watchAuthState()          ← called in app.vue onMounted
        │
        ├── authStore.setFirebaseUser()      ← updates user + pairId
        │
        └── transactionStore.loadFromFirestore()
                 │
                 └── useFirestoreDB.subscribeToTransactions()
                          │
                          └── onSnapshot (real-time listener)   ← auto-updates transactions[]
```

### Firebase Auth Race Condition Protection

All Firestore **write** operations (`setDoc`, `deleteDoc`) and Storage uploads await `auth.authStateReady()` before executing. This prevents `Missing or insufficient permissions` errors that occur when Pinia restores user state from `localStorage` faster than the Firebase SDK restores its auth session from IndexedDB.

---

## Tech Stack

| Layer            | Technology                                | Notes                                                   |
| ---------------- | ----------------------------------------- | ------------------------------------------------------- |
| Framework        | **Nuxt 4**                                | SSR enabled, file-based routing                         |
| UI               | **Nuxt UI v4**                            | Tailwind CSS v4, Reka UI primitives                     |
| State            | **Pinia** + `pinia-plugin-persistedstate` | Stores persisted to `localStorage`                      |
| Backend/BaaS     | **Firebase 12**                           | Auth, Firestore, Storage                                |
| AI Slip Analysis | **Google Gemini API**                     | Via Nuxt server route (API key never exposed to client) |
| OCR Fallback     | **Tesseract.js**                          | Used when Gemini key is not configured                  |
| Validation       | **Zod**                                   | Server-side request validation                          |
| Language         | **TypeScript** (strict)                   | Full type coverage                                      |
| Package Manager  | **Bun**                                   |                                                         |
| Linting          | **ESLint** (`@nuxt/eslint`)               |                                                         |

---

## Project Structure

```
duo-funds/
├── app/
│   ├── app.vue                    # Root layout — mounts auth state watcher
│   ├── app.config.ts              # Nuxt UI theme overrides
│   ├── assets/css/main.css        # Global CSS (Tailwind imports)
│   │
│   ├── components/
│   │   ├── AppLogo.vue
│   │   └── dashboard/
│   │       ├── BalanceHero.vue          # Green hero card with balance summary
│   │       ├── SummaryCard.vue          # Per-person totals
│   │       ├── TransactionItem.vue      # Single transaction row
│   │       ├── CreateTransactionModal.vue  # Upload + AI prefill + confirm form
│   │       └── ConfirmDeleteModal.vue
│   │
│   ├── composables/
│   │   ├── firebase/
│   │   │   └── useFirebase.ts     # Module-level Firebase app singleton
│   │   ├── useFirebaseAuth.ts     # Auth (sign-in, sign-out, watchAuthState)
│   │   └── useFirestoreDB.ts      # Firestore CRUD + real-time listener
│   │
│   ├── constants/
│   │   └── banks.ts               # Thai banks: SWIFT codes + display labels + AI name mapper
│   │
│   ├── middleware/
│   │   ├── auth.ts                # Redirect to /login if not authenticated
│   │   └── guest.ts               # Redirect to / if already authenticated
│   │
│   ├── pages/
│   │   ├── index.vue              # Dashboard
│   │   ├── login.vue              # Sign-in page
│   │   └── transactions/[id].vue  # Transaction detail
│   │
│   ├── stores/
│   │   ├── auth.ts                # User session, pairId (persisted)
│   │   ├── transactions.ts        # Transaction list, filters, summary, CRUD
│   │   └── slip-upload.ts         # Upload state, AI analysis, Firebase Storage
│   │
│   ├── types/
│   │   └── duo-funds.ts           # Shared TypeScript interfaces and types
│   │
│   └── utils/
│       └── duo-funds.ts           # Pure helpers: formatCurrency, date utils, normalizePairCode
│
├── server/
│   ├── api/
│   │   └── analyze-slip.post.ts   # AI slip analysis endpoint (Gemini → Tesseract fallback)
│   └── utils/
│       └── ocr.ts                 # Tesseract.js OCR + regex field extraction
│
├── scripts/
│   └── seed.ts                    # Firebase seed script (dev data)
│
├── firestore.rules                # Firestore security rules
├── firestore.indexes.json         # Composite indexes for queries
├── nuxt.config.ts
└── package.json
```

---

## Data Model

```
Firestore
│
├── /users/{uid}
│   ├── displayName: string
│   ├── pairId: string
│   └── createdAt: timestamp
│
├── /pairs/{pairId}
│   ├── name: string
│   ├── memberIds: string[]        // exactly 2 UIDs
│   ├── memberNames: Record<uid, string>
│   └── createdAt: timestamp
│
└── /pairs/{pairId}/transactions/{transactionId}
    ├── uploaderId: string          // UID of the person who uploaded
    ├── uploaderName: string
    ├── amount: number
    ├── transactionDate: string     // "YYYY-MM-DD" — date on the slip
    ├── transactionTime: string     // "HH:mm"
    ├── bankName: string            // SWIFT code (e.g. "KASITHBK")
    ├── slipImageUrl: string        // Firebase Storage download URL
    ├── aiRawResponse: object       // raw AI JSON — kept for audit/debug
    ├── status: "pending" | "confirmed" | "edited"
    ├── note: string | null
    ├── createdAt: string           // ISO 8601
    └── updatedAt: string
```

**Security Rules summary:** users can only read/write transactions that belong to a `pairId` where their UID is listed in `memberIds`. See [`firestore.rules`](./firestore.rules).

---

## Key Design Decisions

### Firebase Singleton Composable

Instead of a `firebase.client.ts` plugin, Firebase is initialized via a **module-level singleton** in `composables/firebase/useFirebase.ts`. This avoids timing issues with Nuxt plugin ordering and makes the Firebase app accessible in any composable or store without coupling to the plugin lifecycle.

### Auth State Watcher in `app.vue`

`useFirebaseAuth().watchAuthState()` is called once in `app.vue`'s `onMounted`. It sets up `onAuthStateChanged`, fetches the user's `pairId` from Firestore, and starts the real-time transaction listener — replacing what was previously scattered across a plugin.

### AI Analysis on the Server

`POST /api/analyze-slip` runs on Nitro (server-side). The Gemini API key is never sent to the browser. The endpoint validates requests with Zod, calls Gemini with a strict JSON schema prompt, and falls back to Tesseract.js OCR + regex when the API key is absent.

### Optimistic Updates

`transactionStore.addTransaction` inserts the transaction locally first, then persists to Firestore. On failure it rolls back and re-throws so the caller (in `index.vue`) can show a toast.

---

## Local Development

### Prerequisites

- [Bun](https://bun.sh) ≥ 1.3
- [Firebase CLI](https://firebase.google.com/docs/cli) (`bun add -g firebase-tools`)
- A Firebase project with **Auth**, **Firestore**, and **Storage** enabled

### Install & Run

```bash
bun install
bun dev
```

App starts at `http://localhost:3000`.

### Type-check

```bash
bun run typecheck
```

### Lint

```bash
bun run lint
```

---

## Environment Variables

Create a `.env` file at the project root (never commit this file):

```env
# Firebase client config (exposed to browser via runtimeConfig.public)
NUXT_PUBLIC_FIREBASE_API_KEY=
NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NUXT_PUBLIC_FIREBASE_PROJECT_ID=
NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NUXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NUXT_PUBLIC_FIREBASE_APP_ID=
NUXT_PUBLIC_FIREBASE_MEASUREMENT_ID=

# Gemini API key — server-side only, never sent to browser
NUXT_GEMINI_API_KEY=
```

`runtimeConfig` key mapping (defined in `nuxt.config.ts`):

| env key                        | runtimeConfig path           |
| ------------------------------ | ---------------------------- |
| `NUXT_PUBLIC_FIREBASE_API_KEY` | `public.firebaseApiKey`      |
| `NUXT_GEMINI_API_KEY`          | `geminiApiKey` (server-only) |

---

## Firebase Setup

### 1. Create a project

```bash
firebase login
firebase projects:create duo-funds-<yourname>
```

### 2. Enable services

In the Firebase Console: **Authentication → Email/Password**, **Firestore Database**, **Storage**.

### 3. Deploy rules & indexes

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

### 4. Seed development data (optional)

Add your Firebase service account JSON as `serviceaccount.json`, then:

```bash
bun run seed
```

---

## Deployment

### Vercel (recommended)

```bash
vercel --prod
```

Set all `NUXT_PUBLIC_*` and `NUXT_GEMINI_API_KEY` environment variables in the Vercel project settings.

### Firebase Hosting

```bash
nuxt build
firebase deploy --only hosting
```

---

## Scripts

| Script              | Description                                                      |
| ------------------- | ---------------------------------------------------------------- |
| `bun dev`           | Start dev server with hot reload                                 |
| `bun build`         | Production build                                                 |
| `bun preview`       | Preview production build locally                                 |
| `bun run typecheck` | TypeScript type check                                            |
| `bun run lint`      | ESLint                                                           |
| `bun run seed`      | Seed Firestore with sample data (requires `serviceaccount.json`) |

Make sure to install the dependencies:

```bash
pnpm install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
pnpm dev
```

## Production

Build the application for production:

```bash
pnpm build
```

Locally preview production build:

```bash
pnpm preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.

## Renovate integration

Install [Renovate GitHub app](https://github.com/apps/renovate/installations/select_target) on your repository and you are good to go.
