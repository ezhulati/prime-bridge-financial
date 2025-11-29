Specification Document

Below is **the complete, end-to-end specification** your **Codex / Cline / “coding agent”** needs in order to build a *fully functional* version of **PrimeBridge Finance** as an MVP.

This spec is written exactly the way engineers want it:
structured, deterministic, implementable, no fluff.

If you want, I can convert this into a *single .md spec file*, or break it into *JIRA tickets*, or produce the **full folder structure + boilerplate code**.

---

# ✅ PRIMEBRIDGE FINANCE — FULL ENGINEERING SPEC (MVP v1)

---

# 1. SYSTEM OVERVIEW

PrimeBridge Finance is a **two-sided private credit platform**:

* **Borrowers** apply for credit, upload docs, track status.
* **Investors** request access, review deals, indicate interest.
* **Admins** manage both sides, underwrite, publish deals.

**Tech Stack (recommended):**

* **Frontend:** Next.js 14 + App Router + Tailwind
* **Backend:** Supabase (Auth, Postgres DB, Storage, RLS)
* **Deploy:** Vercel (frontend), Supabase cloud (backend)
* **File uploads:** Supabase storage
* **Bank connections (later):** Plaid
* **Email notifications:** Supabase Edge Functions + Resend (optional)

MVP does **not** include payments, actual funding rails, or legal entity formation. Everything investor → borrower is “indication of interest” only.

---

# 2. USER ROLES

### 1. **Borrower**

* Create account
* Submit credit application
* Upload financial docs
* Track underwriting status
* Chat with admin (optional in MVP)

### 2. **Investor**

* Request access
* Admin must approve
* View deal room
* Indicate interest

### 3. **Admin**

* See all borrower applications
* Update statuses
* Upload credit memos
* Approve investors
* Publish deals
* Download all documents

---

# 3. DATABASE SCHEMA (SUPABASE POSTGRES)

```
TABLE users (
  id uuid PRIMARY KEY,
  role text CHECK (role IN ('borrower','investor','admin')),
  name text,
  email text UNIQUE,
  created_at timestamptz default now()
);

TABLE companies (
  id uuid PRIMARY KEY,
  owner_user_id uuid REFERENCES users(id),
  legal_name text,
  industry text,
  revenue numeric,
  ebitda numeric,
  address text,
  phone text,
  created_at timestamptz default now()
);

TABLE applications (
  id uuid PRIMARY KEY,
  company_id uuid REFERENCES companies(id),
  amount_requested numeric,
  purpose text,
  status text CHECK (status IN ('draft','submitted','under_review','term_sheet','in_funding','funded','rejected')),
  created_at timestamptz default now()
);

TABLE documents (
  id uuid PRIMARY KEY,
  application_id uuid REFERENCES applications(id),
  type text,               -- "financials", "tax_returns", "bank_statements", etc.
  file_url text,
  uploaded_at timestamptz default now()
);

TABLE investors (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES users(id),
  firm_name text,
  check_size_min numeric,
  check_size_max numeric,
  accredited boolean,
  approved boolean default false,
  created_at timestamptz default now()
);

TABLE deals (
  id uuid PRIMARY KEY,
  application_id uuid REFERENCES applications(id),
  title text,
  summary text,
  interest_rate numeric,
  term_months integer,
  funding_needed numeric,
  memo_url text,               -- admin uploads credit memo PDF
  published boolean default false,
  created_at timestamptz default now()
);

TABLE investor_interest (
  id uuid PRIMARY KEY,
  investor_id uuid REFERENCES investors(id),
  deal_id uuid REFERENCES deals(id),
  amount_indicated numeric,
  status text CHECK (status IN ('interested','committed','withdrawn')),
  created_at timestamptz default now()
);
```

---

# 4. AUTHENTICATION & ACCESS CONTROL

### Supabase Auth:

* Email/password or magic link
* Each user has a `role` stored in `users` table
* RLS policies:

**Borrowers** can only see:

* Their own company
* Their own application
* Their own uploaded docs
* Publicly published deals (read-only)

**Investors** can only see:

* Their own investor profile
* Only deals where `published = true`
* Only documents admin attaches in deal room
* Only their own interest entries

**Admins**:

* Full access

---

# 5. FRONTEND PAGES (FULL SITE MAP)

## Public pages

```
/               – Homepage (marketing)
/apply          – Borrower application start
/invest         – Investor access request page
/login
/signup
```

## Borrower portal (requires borrower role)

```
/dashboard
/application
/application/upload
/application/status
/profile
```

## Investor portal (requires investor role + approved=true)

```
/investor/dashboard
/deals
/deals/[dealId]
/interest/[dealId]
/profile
```

## Admin portal (requires admin role)

```
/admin
/admin/applications
/admin/applications/[id]
/admin/investors
/admin/investors/[id]
/admin/deals
/admin/deals/new
/admin/deals/[id]
```

---

# 6. FRONTEND COMPONENTS TO BUILD

### Borrower components

* Application form (multi-step):

  * Company details
  * Financial info
  * Loan request
  * Document upload (Supabase Storage)
* Status tracker
* Document list

### Investor components

* Investor request access form
* Deal cards
* Deal detail page
* “Indicate interest” modal
* Investor profile page

### Admin components

* Table: Applications
* Table: Investors
* Table: Deals
* Admin panel for updating status
* File upload for credit memo
* Publish/unpublish toggle

---

# 7. API ENDPOINTS (SERVER ACTIONS OR EDGE FUNCTIONS)

### Borrower actions

```
POST /api/application/create
POST /api/application/upload-doc
PATCH /api/application/update
```

### Investor actions

```
POST /api/investor/request-access
PATCH /api/investor/update
POST /api/investor/interest
```

### Admin actions

```
PATCH /api/admin/application-status
PATCH /api/admin/approve-investor
POST  /api/admin/deal/create
PATCH /api/admin/deal/update
PATCH /api/admin/deal/publish
```

---

# 8. DOCUMENT UPLOAD WORKFLOW (Supabase Storage)

Buckets:

```
documents/<applicationId>/<filename>
credit-memos/<dealId>/<memo.pdf>
```

Set bucket policies:

* Borrowers can upload to `/documents/<their_application>` only.
* Investors get *read-only* access to `/credit-memos`.
* Only admins can upload to `/credit-memos`.

---

# 9. DEAL ROOM LOGIC

A deal becomes visible to investors ONLY if:

```
deals.published = true
AND investor.approved = true
```

Deal page includes:

* Title
* Summary
* Terms
* Uploaded credit memo (download link)
* Borrower financial summary
* Button: “Indicate interest”

---

# 10. INDICATE INTEREST LOGIC

Frontend → POST → `/api/investor/interest`

Payload:

```
deal_id
investor_id
amount_indicated
```

Validations:

* Investor must be approved
* Deal must be published
* amount_indicated > 0

Creates row in `investor_interest`.

---

# 11. NOTIFICATION SYSTEM (Optional MVP+)

Events to trigger email:

* Borrower submits application
* Admin updates application status
* Investor approved
* New deal published
* Investor indicates interest

Use Resend or Supabase Edge Functions.

---

# 12. ADMIN CREDIT MEMO WORKFLOW

Admin uploads PDF to `/credit-memos/<dealId>/memo.pdf`

Deal room automatically shows:

```
Download Credit Memo (PDF)
```

Memo is not visible unless:

```
deal.published = true
```

---

# 13. UI/UX GUIDELINES (For Cline agent / your dev)

* Use Tailwind
* Use Next.js server components
* Use shadcn/ui for form components
* Keep layout minimal, clean, professional
* Dashboard layout with left sidebar for borrower, investor, admin
* Buttons: rounded-md
* Colors: neutral, finance-like (navy, steel, white)

---

# 14. DEPLOYMENT STEPS

1. Create Supabase project
2. Run schema SQL
3. Create storage buckets
4. Set RLS policies
5. Add ENV variables to Vercel:

   * NEXT_PUBLIC_SUPABASE_URL
   * SUPABASE_SERVICE_ROLE_KEY
   * SUPABASE_ANON_KEY
6. Deploy Next.js app to Vercel
7. Test full borrower → admin → investor flow
8. Add email sending (optional)

---

# 15. WHAT THE CODING AGENT BUILDS FIRST (ORDER)

1. Create full DB schema
2. Scaffold Next.js project
3. Implement Supabase Auth
4. Build borrower application flow
5. Build admin dashboard + status updating
6. Build investor onboarding and approval
7. Build deal room + indicate interest
8. Add file uploads
9. Deploy
10. Polish UI

---

# 16. WHAT I CAN PROVIDE NEXT (you choose)

I can give you any of the following:

### ✅ The full **folder structure** + boilerplate code

### ✅ All the **Next.js files** (pages, components, API handlers)

### ✅ All the **SQL** for Supabase tables

### ✅ All the **RLS policies** to paste into Supabase

### ✅ All the **UI components** written out

### ✅ A fully generated **Cline Agent prompt** to build *everything above* automatically

### ✅ AWS / Supabase architecture diagram

### ✅ A staged roadmap for v2 (payments, deal syndication, blockchain ledger, etc.)

---

## 🔥 Tell me this:

**Do you want me to generate the full *Codex/Cline Agent build script* next —
meaning a single, long prompt that makes it build the entire platform end-to-end?**

Just say **“Yes. Build the agent prompt.”**

Got you. Let’s give your coding agent **everything** it needs in one place.

I’ll assume:

* **Stack**: Next.js 14 (App Router) + TypeScript + Tailwind
* **Backend**: Supabase (Postgres, Auth, Storage, RLS)
* **Deploy**: Vercel (web) + Supabase (DB & auth)

If you want a different stack later, we can translate this, but this will work great with Cline / “code agent.”

---

## A. Product Summary (for the agent)

> Build **PrimeBridge Finance**, a private-credit marketplace with 3 roles (borrower, investor, admin).
> Borrowers apply for loans and upload documents. Admins review and publish approved applications as “deals.”
> Approved investors can view deals and indicate their interest (amount they’d be willing to fund).
> No real money movement; this v1 only collects data and handles workflows.

---

## B. Functional Requirements (by role)

### 1. Borrower

* Can sign up and log in.
* Can create a **Company Profile**.
* Can create and submit **one or more Applications**:

  * Amount requested
  * Purpose / use of funds
  * Basic business financials
* Can **upload documents** tied to an application (financials, tax returns, bank statements).
* Can see a **status timeline**:

  * Draft → Submitted → Under review → Term sheet → In funding → Funded → Rejected
* Can see decisions / notes admin adds to their application (read-only).
* Cannot see investor data or other companies’ applications.

### 2. Investor

* Can submit a **request for access** form (public page).
* Once an admin marks them as **approved**, they can:

  * Log in as investor.
  * See a dashboard of **published deals**.
  * Click into a **deal detail view**:

    * Deal summary
    * Terms (rate, term, amount)
    * Basic anonymized borrower financial summary
    * Downloadable credit memo PDF (if uploaded)
  * **Indicate interest** in a deal (enter a dollar amount).
  * See their own past indications and statuses.

Investors cannot:

* See non-published deals.
* See borrower docs directly (only what admin exposes in the deal).

### 3. Admin

* Can log in to an **admin dashboard**.
* Can see:

  * All companies
  * All applications
  * All investors
  * All deals
  * All investor interests
* Can:

  * Change application statuses.
  * Add internal notes on applications.
  * Approve / reject investors.
  * Create a **deal** from an application:

    * Set deal title, summary, interest rate, term, funding_needed.
    * Upload a credit memo PDF.
    * Set published=true/false.
  * View all investor interest entries per deal.

---

## C. Data Model (Postgres schema for Supabase)

Have the agent create these tables (TypeScript + SQL migrations or Supabase Dashboard):

```sql
-- USERS
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid UNIQUE,          -- maps to Supabase auth.users.id
  role text NOT NULL CHECK (role IN ('borrower','investor','admin')),
  name text,
  email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- COMPANIES (borrower side)
CREATE TABLE companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES users(id),
  legal_name text NOT NULL,
  industry text,
  revenue numeric,       -- last FY revenue
  ebitda numeric,        -- last FY EBITDA
  address text,
  phone text,
  created_at timestamptz DEFAULT now()
);

-- APPLICATIONS
CREATE TABLE applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  amount_requested numeric NOT NULL,
  purpose text,  -- freeform use-of-funds
  status text NOT NULL CHECK (
    status IN ('draft','submitted','under_review','term_sheet','in_funding','funded','rejected')
  ) DEFAULT 'draft',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- DOCUMENTS (borrower uploads)
CREATE TABLE documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES applications(id),
  type text,           -- 'financials','tax_returns','bank_statements','other'
  file_url text NOT NULL,
  uploaded_at timestamptz DEFAULT now()
);

-- INVESTORS
CREATE TABLE investors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  firm_name text,
  check_size_min numeric,
  check_size_max numeric,
  accredited boolean DEFAULT false,
  approved boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- DEALS (what investors see)
CREATE TABLE deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES applications(id),
  title text NOT NULL,
  summary text,
  interest_rate numeric,       -- e.g. 0.12 for 12%
  term_months integer,
  funding_needed numeric,
  memo_url text,               -- path to credit memo PDF in storage
  published boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- INVESTOR INTEREST (responses)
CREATE TABLE investor_interest (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id uuid NOT NULL REFERENCES investors(id),
  deal_id uuid NOT NULL REFERENCES deals(id),
  amount_indicated numeric NOT NULL,
  status text NOT NULL CHECK (status IN ('interested','committed','withdrawn')) DEFAULT 'interested',
  created_at timestamptz DEFAULT now()
);
```

---

## D. Auth & Role Handling

### Auth

* Use **Supabase Auth** with email/password.
* On sign-up, create record in `users` with:

  * `auth_user_id` = Supabase auth user id
  * `email` from auth
  * `role` chosen during sign-up (borrower or investor). Admins will be seeded manually.

### Role:

* Store in JWT via Supabase or fetch from `users` table on every request.
* On the frontend, protect routes with middleware:

  * Borrower routes only if `role === 'borrower'`.
  * Investor routes only if `role === 'investor' AND investor.approved=true`.
  * Admin routes only if `role === 'admin'`.

---

## E. Row-Level Security (RLS) Rules (high-level)

1. **users**

   * Borrower / investor can only read their own row.
   * Admin can read all.

2. **companies**

   * Borrower can insert & update companies where `owner_user_id = current_user`.
   * Borrower can read only their company/companies.
   * Admin can read all.

3. **applications**

   * Borrower can insert application where company belongs to them.
   * Borrower can read + update applications for their companies.
   * Investor cannot access this table directly.
   * Admin can read/update all.

4. **documents**

   * Borrower can insert & read docs for their applications.
   * Admin can read all.
   * Investors: no direct access (only see memo_url from deals).

5. **investors**

   * Investor user: can read/update row where `user_id = current_user`.
   * Admin: full access.

6. **deals**

   * Investors: can read rows where `published = true`.
   * Borrowers: can read deals connected to their applications (optional).
   * Admin: full access.

7. **investor_interest**

   * Investor: can read/write rows where `investor_id` belongs to them.
   * Admin: full access.

(Agent should implement RLS via Supabase policies; it can generate the corresponding SQL from this logic.)

---

## F. Storage Requirements

Use Supabase Storage with two buckets:

1. `borrower-documents`

   * Path convention: `applications/<application_id>/<filename>`
   * Access:

     * Borrower (owner) & admin: read/write.
     * Investors: no access.

2. `deal-memos`

   * Path: `deals/<deal_id>/memo.pdf`
   * Access:

     * Admin: read/write.
     * Approved investors: read-only.
     * Borrowers: no access (or admin-only, your call; MVP: admin+investors only).

Agent should implement storage upload/download helpers using Supabase client.

---

## G. Frontend Routes & Behavior

### Public

1. `/` – **Marketing homepage**

   * Use copy we wrote earlier (PrimeBridge Finance positioning).
   * Two CTAs: “Apply for financing” → `/apply`, “Request investor access” → `/invest`.

2. `/apply` – **Borrower signup/redirect**

   * If not logged in: show sign-up form for borrower.
   * If logged in as borrower: redirect to `/dashboard`.

3. `/invest` – **Investor request access**

   * If not logged in: show basic investor “request access” form.
   * On submit, create `users` row (role=investor) and `investors` row with `approved=false`.
   * Show confirmation message “We’ll review your info.”

4. `/login` & `/signup`

   * Standard auth forms.
   * On signup, user chooses role = borrower or investor.

---

### Borrower Portal (role=borrower)

1. `/dashboard`

   * Show:

     * Company summary.
     * List of applications with statuses.
     * Button “Start new application”.

2. `/application` (create/edit)

   * Multi-step form:

     * Step 1: Company details (if not already created).
     * Step 2: Financial overview (revenue, EBITDA, etc.).
     * Step 3: Loan info (amount_requested, purpose).
   * Save as `status = 'draft'`.
   * Button “Submit application” → set status to `submitted`.

3. `/application/upload`

   * For the current (or chosen) application:

     * Upload files to `borrower-documents` bucket.
     * Create `documents` rows with `file_url` and `type`.
     * Show list of already uploaded docs.

4. `/application/status`

   * Show status timeline and any admin notes (if you add a notes field later).
   * Read-only.

---

### Investor Portal (role=investor & approved=true)

1. `/investor/dashboard`

   * Show:

     * “Approved investor” badge.
     * Summary: # deals available, total indicated amount, etc.
   * Link to `/deals`.

2. `/deals`

   * List of published deals (`deals.published = true`):

     * Title
     * Yield (interest_rate)
     * Term_months
     * Funding_needed
     * CTA: “View deal”

3. `/deals/[dealId]`

   * Details for a single deal:

     * Title, summary, terms
     * Basic anonymized financial summary (application.company & application data)
     * Download credit memo (memo_url)
     * Button “Indicate interest”

4. `/interest/[dealId]`

   * Simple form:

     * Input `amount_indicated`.
     * POST → create row in `investor_interest`.
   * On success: redirect back to deal page or `/investor/dashboard`.

---

### Admin Portal (role=admin)

1. `/admin`

   * Overview cards:

     * # applications by status
     * # approved investors
     * # published deals

2. `/admin/applications`

   * Table listing:

     * company, amount_requested, status, created_at.
   * Each row links to `/admin/applications/[id]`.

3. `/admin/applications/[id]`

   * Show:

     * Company info
     * Application details
     * List of documents with download links
   * Controls:

     * Dropdown to change `status`.
     * Button “Create deal from this application” → `/admin/deals/new?application_id=...`.

4. `/admin/investors`

   * Table:

     * name, firm_name, accredited, approved.
   * Each row links to `/admin/investors/[id]`.

5. `/admin/investors/[id]`

   * Show investor details, accreditation flag.
   * Toggle `approved` true/false.

6. `/admin/deals`

   * Table of deals: title, funding_needed, published flag.
   * Each row → `/admin/deals/[id]`.

7. `/admin/deals/new`

   * If `application_id` query param exists:

     * Pre-fill summary info from that application.
   * Fields:

     * title, summary, interest_rate, term_months, funding_needed.
   * On submit: create `deal` row, `published=false`.

8. `/admin/deals/[id]`

   * Show deal info, link back to application.
   * Upload zone for credit memo:

     * Post to `deal-memos` bucket, update `memo_url`.
   * Toggle `published` flag.
   * List all `investor_interest` rows for this deal.

---

## H. API / Server Actions Requirements

Whether you use Next.js API routes or Server Actions, implement:

### Borrower

* `createOrUpdateCompany(companyData)`
* `createOrUpdateApplication(applicationData)`
* `submitApplication(applicationId)` → sets status `submitted`.
* `uploadApplicationDocument(applicationId, file, type)` → returns `file_url`.

### Investor

* `requestInvestorAccess(userData, investorData)` (from `/invest`).
* `updateInvestorProfile(investorData)` (optional).
* `createInvestorInterest(dealId, investorId, amount)`.

### Admin

* `setApplicationStatus(applicationId, status)`
* `approveInvestor(investorId, approvedBoolean)`
* `createDealFromApplication(applicationId, dealData)`
* `updateDeal(dealId, dealData)`
* `setDealPublished(dealId, boolean)`
* `uploadDealMemo(dealId, file)` → returns `memo_url`.

All of these should:

* Verify role/permission.
* Validate input.
* Return JSON for the client.

---

## I. Non-Functional Requirements

* **TypeScript everywhere** (no implicit any).
* Use **Zod** or similar for input validation on server actions.
* Use **Tailwind CSS** with a simple design system (primary color, neutral background).
* Mobile-friendly (stack during small viewport).
* Handle basic error states:

  * Failed upload
  * Unauthorized access
  * No deals yet / no applications yet

---

## J. Environment Variables (for agent to wire up)

On the Next.js side:

* `NEXT_PUBLIC_SUPABASE_URL`
* `NEXT_PUBLIC_SUPABASE_ANON_KEY`
* `SUPABASE_SERVICE_ROLE_KEY` (server-side only)

On Supabase:

* Standard keys from project.

---

## K. A Single “Agent Prompt” You Can Paste

You can literally give your coding agent this:

> You are building the MVP for **PrimeBridge Finance**, a private-credit marketplace with three roles: borrower, investor, admin. Use Next.js 14 App Router + TypeScript + Tailwind on the frontend and Supabase (Postgres, Auth, Storage, RLS) for the backend. Implement the full product as per the following requirements:
>
> [Then paste sections A–J above.]

---

If you want, next step I can:

* Generate the **project folder structure + key files** (e.g. `app/(borrower)/dashboard/page.tsx`, `lib/supabaseClient.ts`, etc.), or
* Write the **SQL + RLS policies** as copy-paste-ready scripts for Supabase.

Nice. Let’s turn this into something your coding agent can *actually* build without guessing.

I’ll give you:

1. Project structure for a Next.js 14 + Supabase app
2. Key config files
3. Supabase SQL schema + example RLS policies
4. Core frontend pages (borrower, investor, admin) as scaffolds
5. A single “agent prompt” you can paste into Cline / Code agent

You can literally copy chunks of this into files.

---

## 1. Project structure

Assume: `create-next-app@latest` with App Router, TypeScript, Tailwind.

```txt
primebridge-finance/
  package.json
  next.config.mjs
  postcss.config.mjs
  tailwind.config.mjs
  tsconfig.json
  .env.local

  /app
    layout.tsx
    globals.css

    (public)
      page.tsx               # homepage
      apply/page.tsx         # borrower apply
      invest/page.tsx        # investor request access
      login/page.tsx
      signup/page.tsx

    (borrower)
      dashboard/page.tsx
      application/page.tsx
      application/upload/page.tsx
      application/status/page.tsx

    (investor)
      investor/dashboard/page.tsx
      deals/page.tsx
      deals/[dealId]/page.tsx
      interest/[dealId]/page.tsx

    (admin)
      admin/page.tsx
      admin/applications/page.tsx
      admin/applications/[id]/page.tsx
      admin/investors/page.tsx
      admin/investors/[id]/page.tsx
      admin/deals/page.tsx
      admin/deals/new/page.tsx
      admin/deals/[id]/page.tsx

    api/                    # if you use route handlers
      auth/callback/route.ts
      ... (optional)

  /components
    Navbar.tsx
    Footer.tsx
    ProtectedRoute.tsx
    forms/
      BorrowerApplicationForm.tsx
      InvestorRequestForm.tsx
      DealInterestForm.tsx
    ui/
      Button.tsx
      Input.tsx
      Select.tsx
      Textarea.tsx
      Card.tsx

  /lib
    supabaseClient.ts
    auth.ts
    types.ts
    validators.ts

  /supabase
    schema.sql
    policies.sql
```

---

## 2. Key config files

### `package.json` (core deps)

```json
{
  "name": "primebridge-finance",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.45.0",
    "next": "14.2.5",
    "react": "18.3.1",
    "react-dom": "18.3.1",
    "zod": "^3.23.8",
    "clsx": "^2.1.1"
  },
  "devDependencies": {
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.4",
    "typescript": "^5.5.3",
    "@types/react": "^18.2.74",
    "@types/node": "^20.14.12",
    "eslint": "^8.57.0"
  }
}
```

### `tailwind.config.mjs`

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        pbPrimary: "#0f172a", // slate-900, adjust later
        pbAccent: "#0ea5e9"   // sky-500
      }
    }
  },
  plugins: []
};
```

### `lib/supabaseClient.ts`

```ts
import { createBrowserClient, createServerClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export function createSupabaseBrowserClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

export function createSupabaseServerClient() {
  const cookieStore = cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      }
    }
  });
}
```

### `lib/types.ts` (core TS types)

```ts
export type UserRole = "borrower" | "investor" | "admin";

export interface User {
  id: string;
  auth_user_id: string;
  role: UserRole;
  name: string | null;
  email: string;
}

export interface Company {
  id: string;
  owner_user_id: string;
  legal_name: string;
  industry?: string | null;
  revenue?: number | null;
  ebitda?: number | null;
  address?: string | null;
  phone?: string | null;
}

export type ApplicationStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "term_sheet"
  | "in_funding"
  | "funded"
  | "rejected";

export interface Application {
  id: string;
  company_id: string;
  amount_requested: number;
  purpose: string | null;
  status: ApplicationStatus;
}

export interface Investor {
  id: string;
  user_id: string;
  firm_name: string | null;
  check_size_min: number | null;
  check_size_max: number | null;
  accredited: boolean;
  approved: boolean;
}

export interface Deal {
  id: string;
  application_id: string;
  title: string;
  summary: string | null;
  interest_rate: number | null;
  term_months: number | null;
  funding_needed: number | null;
  memo_url: string | null;
  published: boolean;
}
```

---

## 3. Supabase schema (SQL)

Put this into `supabase/schema.sql` and run it in the Supabase SQL editor.

```sql
-- USERS
CREATE TABLE public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid UNIQUE NOT NULL,
  role text NOT NULL CHECK (role IN ('borrower','investor','admin')),
  name text,
  email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- COMPANIES
CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES public.users(id),
  legal_name text NOT NULL,
  industry text,
  revenue numeric,
  ebitda numeric,
  address text,
  phone text,
  created_at timestamptz DEFAULT now()
);

-- APPLICATIONS
CREATE TABLE public.applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  amount_requested numeric NOT NULL,
  purpose text,
  status text NOT NULL CHECK (
    status IN ('draft','submitted','under_review','term_sheet','in_funding','funded','rejected')
  ) DEFAULT 'draft',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- DOCUMENTS
CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id),
  type text,
  file_url text NOT NULL,
  uploaded_at timestamptz DEFAULT now()
);

-- INVESTORS
CREATE TABLE public.investors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id),
  firm_name text,
  check_size_min numeric,
  check_size_max numeric,
  accredited boolean DEFAULT false,
  approved boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- DEALS
CREATE TABLE public.deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id),
  title text NOT NULL,
  summary text,
  interest_rate numeric,
  term_months integer,
  funding_needed numeric,
  memo_url text,
  published boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- INVESTOR INTEREST
CREATE TABLE public.investor_interest (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id uuid NOT NULL REFERENCES public.investors(id),
  deal_id uuid NOT NULL REFERENCES public.deals(id),
  amount_indicated numeric NOT NULL,
  status text NOT NULL CHECK (
    status IN ('interested','committed','withdrawn')
  ) DEFAULT 'interested',
  created_at timestamptz DEFAULT now()
);
```

---

## 4. Example RLS policies (high level, copyable)

First, enable RLS:

```sql
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investor_interest ENABLE ROW LEVEL SECURITY;
```

Link `auth.uid()` to `users.auth_user_id`. For policies, assume a helper function or join; simplest is to use `auth.uid()` and a mapping view, but for MVP:

### `users` table

```sql
CREATE POLICY "Users can view themselves"
ON public.users FOR SELECT
USING (auth_user_id = auth.uid());

-- Admin override (you can mark some auth_user_ids as admin manually and relax later)
```

### `companies`

```sql
CREATE POLICY "Borrower read own companies"
ON public.companies FOR SELECT
USING (
  owner_user_id IN (
    SELECT id FROM public.users WHERE auth_user_id = auth.uid() AND role = 'borrower'
  )
);

CREATE POLICY "Borrower insert companies"
ON public.companies FOR INSERT
WITH CHECK (
  owner_user_id IN (
    SELECT id FROM public.users WHERE auth_user_id = auth.uid() AND role = 'borrower'
  )
);

CREATE POLICY "Borrower update own companies"
ON public.companies FOR UPDATE
USING (
  owner_user_id IN (
    SELECT id FROM public.users WHERE auth_user_id = auth.uid() AND role = 'borrower'
  )
)
WITH CHECK (
  owner_user_id IN (
    SELECT id FROM public.users WHERE auth_user_id = auth.uid() AND role = 'borrower'
  )
);
```

### `applications`

```sql
CREATE POLICY "Borrower read own applications"
ON public.applications FOR SELECT
USING (
  company_id IN (
    SELECT id FROM public.companies
    WHERE owner_user_id IN (
      SELECT id FROM public.users WHERE auth_user_id = auth.uid() AND role = 'borrower'
    )
  )
);

CREATE POLICY "Borrower insert own applications"
ON public.applications FOR INSERT
WITH CHECK (
  company_id IN (
    SELECT id FROM public.companies
    WHERE owner_user_id IN (
      SELECT id FROM public.users WHERE auth_user_id = auth.uid() AND role = 'borrower'
    )
  )
);

CREATE POLICY "Borrower update own applications"
ON public.applications FOR UPDATE
USING (
  company_id IN (
    SELECT id FROM public.companies
    WHERE owner_user_id IN (
      SELECT id FROM public.users WHERE auth_user_id = auth.uid() AND role = 'borrower'
    )
  )
)
WITH CHECK (
  company_id IN (
    SELECT id FROM public.companies
    WHERE owner_user_id IN (
      SELECT id FROM public.users WHERE auth_user_id = auth.uid() AND role = 'borrower'
    )
  )
);
```

### `investors`

```sql
CREATE POLICY "Investor reads own profile"
ON public.investors FOR SELECT
USING (
  user_id IN (
    SELECT id FROM public.users WHERE auth_user_id = auth.uid() AND role = 'investor'
  )
);

CREATE POLICY "Investor updates own profile"
ON public.investors FOR UPDATE
USING (
  user_id IN (
    SELECT id FROM public.users WHERE auth_user_id = auth.uid() AND role = 'investor'
  )
)
WITH CHECK (
  user_id IN (
    SELECT id FROM public.users WHERE auth_user_id = auth.uid() AND role = 'investor'
  )
);
```

### `deals` (investor read published only)

```sql
CREATE POLICY "Investors read published deals"
ON public.deals FOR SELECT
USING (published = true);
```

### `investor_interest`

```sql
CREATE POLICY "Investor insert interest"
ON public.investor_interest FOR INSERT
WITH CHECK (
  investor_id IN (
    SELECT id FROM public.investors
    WHERE user_id IN (
      SELECT id FROM public.users WHERE auth_user_id = auth.uid() AND role = 'investor'
    )
  )
);

CREATE POLICY "Investor read own interest"
ON public.investor_interest FOR SELECT
USING (
  investor_id IN (
    SELECT id FROM public.investors
    WHERE user_id IN (
      SELECT id FROM public.users WHERE auth_user_id = auth.uid() AND role = 'investor'
    )
  )
);
```

Admins can be given bypass policies or handled via service key from server.

---

## 5. Core page scaffolds

### `/app/layout.tsx`

```tsx
import "./globals.css";
import type { ReactNode } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-6">
          {children}
        </div>
      </body>
    </html>
  );
}
```

### Homepage `/app/page.tsx`

```tsx
export default function HomePage() {
  return (
    <main className="space-y-10">
      <section className="grid gap-10 md:grid-cols-2 items-center">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight">
            PrimeBridge Finance
          </h1>
          <p className="mt-4 text-slate-300">
            Institutional-grade private credit for real businesses and accredited investors.
          </p>
          <div className="mt-6 flex gap-4">
            <a
              href="/apply"
              className="rounded-md bg-pbAccent px-4 py-2 text-sm font-medium text-slate-950"
            >
              Apply for financing
            </a>
            <a
              href="/invest"
              className="rounded-md border border-slate-600 px-4 py-2 text-sm font-medium text-slate-100"
            >
              Request investor access
            </a>
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 p-6 text-sm text-slate-300">
          {/* Placeholder dashboard illustration */}
          <p className="font-medium text-slate-100 mb-2">Deal pipeline snapshot</p>
          <ul className="space-y-2">
            <li>• 6 applications under review</li>
            <li>• 3 deals in funding</li>
            <li>• Avg. target yield: 12.4%</li>
          </ul>
        </div>
      </section>
    </main>
  );
}
```

### Borrower dashboard `/app/(borrower)/dashboard/page.tsx` (concept)

```tsx
import { createSupabaseServerClient } from "@/lib/supabaseClient";

export default async function BorrowerDashboard() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  // fetch mapped user row
  const { data: appData } = await supabase
    .from("applications")
    .select("id, amount_requested, status, created_at")
    .order("created_at", { ascending: false });

  return (
    <main className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Borrower dashboard</h1>
          <p className="text-sm text-slate-400">
            Track your applications and upload documents.
          </p>
        </div>
        <a
          href="/application"
          className="rounded-md bg-pbAccent px-3 py-2 text-sm font-medium text-slate-950"
        >
          Start new application
        </a>
      </header>

      <section className="rounded-lg border border-slate-800 p-4">
        <h2 className="text-sm font-semibold text-slate-200 mb-3">Your applications</h2>
        <div className="space-y-2 text-sm">
          {appData?.length ? (
            appData.map((app) => (
              <div
                key={app.id}
                className="flex items-center justify-between rounded-md bg-slate-900 px-3 py-2"
              >
                <div>
                  <div className="font-medium">
                    ${Number(app.amount_requested).toLocaleString()}
                  </div>
                  <div className="text-xs text-slate-400">
                    Status: {app.status}
                  </div>
                </div>
                <a
                  href="/application/status"
                  className="text-xs text-pbAccent underline"
                >
                  View status
                </a>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-500">
              No applications yet. Start your first one.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
```

You’ll do similar scaffolds for:

* `/investor/dashboard` (list deals + interest)
* `/admin/applications` (table of apps)
* `/admin/deals` (table of deals)

---

## 6. Single “Agent Prompt” you can feed to Cline / code agent

You can grab this and paste it into your coding agent as the *project-level instruction*:

> Build a web application called **PrimeBridge Finance** using Next.js 14 with the App Router, TypeScript, and Tailwind CSS on the frontend and Supabase (Postgres, Auth, Storage, RLS) on the backend.
>
> The app is a private-credit marketplace with three roles: `borrower`, `investor`, and `admin`. Implement the schema, RLS, storage, and frontend routes exactly as described in the following specification. Then scaffold the UI with simple, clean Tailwind components:
>
> [paste everything from this message: project structure, config files, Supabase schema, RLS, page scaffolds]

---
