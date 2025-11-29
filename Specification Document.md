**PrimeBridge is now 100% Model 1 — a fintech lender loan-pool marketplace.**

I’ll give you a *clean rebuilt spec* you can hand to a coding agent and investors, and a short note on how it differs from what you already built.

---

## 0. What Model 1 *is* in one line

> **PrimeBridge is a marketplace where fintech lenders sell bank-originated loan pools to accredited investors through a compliant, automated platform.**

No SMB borrowers applying on the site.
Your *customers* are **lenders and investors**, not end-borrowers.

---

## 1. Core entities (mental model)

We’re dealing with:

* **Lenders** – fintech companies originating loans (credit builder, BNPL, POS, etc.)
* **Loan Pools** – batches of loans they want funded/sold
* **Documents** – tapes, performance, agreements, credit memos
* **Deals** – investor-facing representations of a pool
* **Investors** – accredited investors buying exposure to the pools
* **Commitments** – investor “I’ll take $X of this deal”
* **Ledger Events** – on-chain proof that docs/events weren’t tampered with

No “companies applying for loans”. That’s gone.

---

## 2. New data model (Supabase, Model 1)

This replaces your “applications/companies” schema.

### 2.1 `users`

Same idea, different roles:

```sql
CREATE TABLE public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid UNIQUE NOT NULL,         -- maps to supabase.auth.users.id
  role text NOT NULL CHECK (role IN ('lender','investor','admin')),
  name text,
  email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);
```

### 2.2 `lenders`

One row per fintech lender org:

```sql
CREATE TABLE public.lenders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id),
  company_name text NOT NULL,
  website text,
  vertical text,              -- e.g. "BNPL", "credit_builder", "medical"
  jurisdiction text,
  avg_loan_size numeric,
  status text NOT NULL CHECK (status IN ('pending','approved','rejected'))
    DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);
```

### 2.3 `investors`

```sql
CREATE TABLE public.investors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id),
  firm_name text,
  accreditation_doc_url text,
  check_size_min numeric,
  check_size_max numeric,
  accredited boolean DEFAULT false,
  status text NOT NULL CHECK (status IN ('pending','approved','rejected'))
    DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);
```

### 2.4 `loan_pools`

These are *pools of loans* submitted by lenders:

```sql
CREATE TABLE public.loan_pools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lender_id uuid NOT NULL REFERENCES public.lenders(id),
  title text NOT NULL,            -- "Q1 2025 Credit Builder Pool"
  description text,
  asset_class text,               -- "consumer_unsecured", "auto_refi", etc.
  total_principal numeric NOT NULL,
  num_loans integer,
  avg_apr numeric,
  avg_term_months integer,
  vintage_start date,
  vintage_end date,
  status text NOT NULL CHECK (
    status IN ('draft','submitted','under_review','approved','rejected','live','closed')
  ) DEFAULT 'draft',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### 2.5 `loan_pool_documents`

```sql
CREATE TABLE public.loan_pool_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_pool_id uuid NOT NULL REFERENCES public.loan_pools(id),
  type text NOT NULL,           -- 'tape','performance','agreements','memo','other'
  file_url text NOT NULL,
  chain_doc_hash bytes32,       -- optional, link to blockchain record
  created_at timestamptz DEFAULT now()
);
```

### 2.6 `deals`

What investors see (linked 1:1 to a pool):

```sql
CREATE TABLE public.deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_pool_id uuid NOT NULL REFERENCES public.loan_pools(id),
  title text NOT NULL,
  summary text,
  target_yield numeric,         -- e.g. 0.16 for 16%
  term_months integer,
  raise_amount numeric,         -- how much capital needed
  min_investment numeric,
  memo_url text,                -- investor-friendly memo (PDF)
  published boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### 2.7 `deal_commitments`

Investor interest:

```sql
CREATE TABLE public.deal_commitments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id),
  investor_id uuid NOT NULL REFERENCES public.investors(id),
  amount_committed numeric NOT NULL,
  status text NOT NULL CHECK (
    status IN ('indicated','soft_committed','final_committed','withdrawn')
  ) DEFAULT 'indicated',
  created_at timestamptz DEFAULT now()
);
```

### 2.8 `activity_log` + `ledger_events` (for audit)

You already have this pattern, just adapt to Model 1 names.

---

## 3. Roles & flows (Model 1)

### 3.1 Lender flow (your GTM customer)

1. **Sign up as lender**

   * Choose role = lender on signup
   * Complete lender profile (company, vertical, website, jurisdictions, etc.)

2. **Create loan pool**

   * “New loan pool” form
   * Input:

     * pool name
     * total principal
     * number of loans
     * avg APR
     * avg term
     * vintage dates
     * high-level credit box

3. **Upload documents**

   * Loan tape (CSV / XLSX)
   * Performance history (cohorts)
   * Standard form agreement / borrower T&Cs
   * Servicing agreement (optional)

4. **Submit for review**

   * `status` flips from `draft` → `submitted`
   * Triggers admin review

5. **Iterate with admin**

   * Admin may ask for more data
   * Once approved → admin creates a `deal` tied to this pool

6. **Monitor investor interest**

   * See aggregated commitments:

     * number of investors
     * amount indicated vs raise_amount

---

### 3.2 Investor flow

1. **Sign up as investor**

   * Choose role = investor
   * Fill firm info, check size prefs
   * Upload accreditation document

2. **Get approved by admin**

   * `status` changes from `pending` → `approved`
   * Now can see live deals

3. **Browse deals**

   * `/investor/deals` → list:

     * title
     * asset class
     * target yield
     * term
     * raise size
     * % filled

4. **View deal details**

   * Download memo
   * View summary stats for pool
   * See top-level risk factors

5. **Commit capital**

   * Enter `$ amount`
   * Create `deal_commitments` row with `status = indicated`

6. **Later phases**

   * Convert to legal docs + wiring (off-platform or via integrated rails)

---

### 3.3 Admin flow

1. **Approve lenders & investors**

   * Manage KYC/eligibility
2. **Review loan pools**

   * Check docs, tapes, performance
   * Approve or reject
3. **Create deals from pools**

   * Set economics & investor-facing summary
4. **Publish deals**

   * `published = true` → visible to all approved investors
5. **Monitor commitments**

   * See progress vs raise_amount
   * Decide when to “close” a deal

---

### 3.4 Bank partner (conceptual for now)

Bank is *off-platform* at MVP:

* They handle origination and 5-day hold
* You record the pool after the fact (loan tape includes bank-originated IDs)

Later, you can:

* Add fields for bank partner
* Add “5-day hold completed at timestamp”
* Add deeper bank integration

---

## 4. RLS / access logic (short)

* **Lenders**:

  * Can only see/update their own `lenders` row.
  * Can CRUD `loan_pools` where `lender_id` = theirs.
  * Can upload docs for their pools.

* **Investors**:

  * Can only see/update their own `investors` row.
  * Can view `deals` where `published = true`.
  * Can CRUD `deal_commitments` for themselves.

* **Admin**:

  * Can see everything.

---

## 5. Blockchain layer, adapted to Model 1

Same principle, different entities:

### What gets hashed:

* Loan pool tape file contents
* Performance file
* Credit memo (PDF)
* Key pool metadata (JSON)
* Key deal metadata (JSON)

### Events you record on-chain:

* `POOL_SUBMITTED`
* `POOL_APPROVED`
* `DEAL_CREATED_FROM_POOL`
* `DEAL_PUBLISHED`
* `DEAL_CLOSED`
* `DOCUMENT_ATTACHED`

The rest of the spec we already wrote for `PrimeBridgeLedger` still applies; you just use `entityType` = `LOAN_POOL` or `DEAL` and map pool/deal IDs to bytes32.

---

## 6. Homepage & messaging for Model 1

Think from **lender + investor**, not SMB borrower.

### Hero

> **Headline:**
> The marketplace for fintech loan pools
>
> **Subheadline:**
> PrimeBridge connects fintech lenders who need reliable capital with accredited investors looking for high-yield, data-rich loan pools – all through a compliant, bank-backed infrastructure.

**Primary CTA:**

> Apply as a lender

**Secondary CTA:**

> Request investor access

### For Lenders section

* “Turn your originations into a repeatable capital engine.”
* Bullets:

  * Sell whole loan pools to qualified investors
  * Keep origination and servicing economics
  * No need to raise your own fund or warehouse line

### For Investors section

* “Access deals that used to live inside private credit funds.”
* Bullets:

  * Loan-tape level transparency
  * Target mid-teens yields, short duration
  * Diversify by lender, asset class, and vintage

---

## 7. Pitch framing (Model 1)

Your clean pitch line now:

> **PrimeBridge is a marketplace where fintech lenders sell bank-originated loan pools to accredited investors, with underwriting, documents, and on-chain audit trails all in one place.**

And the analogy:

> **“We’re AngelList for private credit — lenders bring loan pools, investors bring capital, PrimeBridge runs the infrastructure.”**

---

## 8. Migration from what you already built (Model 2 → Model 1)

Right now you likely have:

* `companies`, `applications`, `documents`, etc. (borrower-facing)
* Borrower-facing forms and dashboards

To pivot cleanly:

1. **Drop the borrower concept**

   * Deprecate `companies`, `applications` tables
   * Remove “Apply for credit” flows from the UI

2. **Migrate relevant code**

   * Reuse upload components → now for `loan_pool_documents`
   * Reuse “application review” views → now “loan pool review” views
   * Reuse “deal” + “investor indication” pieces almost 1:1

3. **Update copy everywhere**

   * “Business” → “Fintech lender”
   * “Apply for funding” → “Submit a loan pool”
   * “Borrower” → remove; not a platform user

If you want, I can write **explicit refactor instructions**: “rename this table to that, change these columns, here’s an SQL migration block,” etc.

---

If you tell me **“write the migration plan”**, I’ll give you step-by-step: DB migrations, code-level renames, and which UX pieces to keep, swap, or delete so your existing app becomes PrimeBridge Model 1 with minimal waste.

Alright, we’re doing it.
Let’s pivot this thing properly.

I’ll give you **everything in one go**:

1. **Migration plan** – how to move from Business-Credit model → Fintech Lender Loan-Pool model
2. **Clean, updated spec for your coding agent (Model 1)**
3. **Rewritten homepage copy for PrimeBridge (Model 1)**

You can literally copy/paste pieces from here into your dev agent / Claude Code / Git.

---

## 1️⃣ Migration Plan: Model 2 → Model 1

Assumption: your current app looks roughly like this:

* Auth + `users`
* `companies` (borrowers)
* `applications` (loan applications)
* `documents` (company/app docs)
* `investors`
* `deals`
* `investor_interest` or `commitments`
* Admin dashboard for reviewing applications, turning them into deals, etc.

We want to end up with:

* `users` (roles: lender / investor / admin)
* `lenders`
* `investors`
* `loan_pools`
* `loan_pool_documents`
* `deals` (linked to `loan_pools`)
* `deal_commitments`
* `activity_log` / `ledger_events` (optional but nice)

### STEP 0 – Conceptual flip

Stop thinking:

> borrowers apply → we underwrite → we create deals

Start thinking:

> **lenders** submit loan pools → we structure → **investors** buy exposure

So:

* “Borrower” disappears as a user.
* “Company” becomes “Lender” (totally different persona).
* “Application” becomes “Loan Pool.”

---

### STEP 1 – Roles: update `users` + auth

If you don’t already, make sure `users` has `role`:

```sql
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS role text;

-- Optional: normalize existing roles
UPDATE public.users
SET role = 'investor'
WHERE role IS NULL; -- or whatever makes sense

ALTER TABLE public.users
ALTER COLUMN role SET NOT NULL;
```

Accepted values now:

* `'lender'`
* `'investor'`
* `'admin'`

(You can enforce via CHECK constraint going forward.)

---

### STEP 2 – Rename / repurpose “company” → `lenders`

If you have something like `companies` that represented business borrowers, you can:

```sql
ALTER TABLE public.companies
RENAME TO lenders;

-- Rename columns as needed:
ALTER TABLE public.lenders
RENAME COLUMN company_name TO company_name; -- maybe already correct
-- Drop borrower-specific stuff you don't need anymore
ALTER TABLE public.lenders
DROP COLUMN IF EXISTS requested_amount,
DROP COLUMN IF EXISTS industry_code;  -- keep what’s still relevant
```

Then add lender-specific fields:

```sql
ALTER TABLE public.lenders
ADD COLUMN IF NOT EXISTS vertical text,
ADD COLUMN IF NOT EXISTS jurisdiction text,
ADD COLUMN IF NOT EXISTS avg_loan_size numeric,
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';
```

And make sure there’s a relation to `users`:

```sql
ALTER TABLE public.lenders
ADD COLUMN IF NOT EXISTS user_id uuid;

-- If you can, backfill user_id from existing data; otherwise future-only
ALTER TABLE public.lenders
ADD CONSTRAINT lenders_user_fk FOREIGN KEY (user_id)
  REFERENCES public.users(id);
```

If your `companies` table was used heavily as SMB borrowers, it might be cleaner to **create a fresh `lenders` table** and migrate only what makes sense. Either way is fine.

---

### STEP 3 – Rename / repurpose “applications” → `loan_pools`

If you had `applications` (borrower credit applications), transform to `loan_pools`:

```sql
ALTER TABLE public.applications
RENAME TO loan_pools;

ALTER TABLE public.loan_pools
ADD COLUMN IF NOT EXISTS lender_id uuid,
ADD COLUMN IF NOT EXISTS asset_class text,
ADD COLUMN IF NOT EXISTS total_principal numeric,
ADD COLUMN IF NOT EXISTS num_loans integer,
ADD COLUMN IF NOT EXISTS avg_apr numeric,
ADD COLUMN IF NOT EXISTS avg_term_months integer,
ADD COLUMN IF NOT EXISTS vintage_start date,
ADD COLUMN IF NOT EXISTS vintage_end date,
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft';
```

Wire `lender_id` back to `lenders.id` and drop borrower-specific junk:

```sql
ALTER TABLE public.loan_pools
ADD CONSTRAINT loan_pools_lender_fk FOREIGN KEY (lender_id)
  REFERENCES public.lenders(id);

ALTER TABLE public.loan_pools
DROP COLUMN IF EXISTS borrower_company_id,
DROP COLUMN IF EXISTS requested_amount;  -- now part of total_principal
```

---

### STEP 4 – Documents: reuse as `loan_pool_documents`

If you have a generic `documents` table (company/application docs), rename it:

```sql
ALTER TABLE public.documents
RENAME TO loan_pool_documents;

ALTER TABLE public.loan_pool_documents
ADD COLUMN IF NOT EXISTS loan_pool_id uuid,
ADD COLUMN IF NOT EXISTS type text,
ADD COLUMN IF NOT EXISTS chain_doc_hash bytea;

ALTER TABLE public.loan_pool_documents
ADD CONSTRAINT loan_pool_documents_pool_fk FOREIGN KEY (loan_pool_id)
  REFERENCES public.loan_pools(id);
```

Later, you’ll enforce types: `'tape' | 'performance' | 'agreements' | 'memo' | 'other'`.

---

### STEP 5 – `deals` & `investor_interest` → `deals` & `deal_commitments`

Your current `deals` table probably already works. You just need to make sure it ties to `loan_pools`:

```sql
ALTER TABLE public.deals
ADD COLUMN IF NOT EXISTS loan_pool_id uuid;

ALTER TABLE public.deals
ADD CONSTRAINT deals_loan_pool_fk FOREIGN KEY (loan_pool_id)
  REFERENCES public.loan_pools(id);

ALTER TABLE public.deals
ADD COLUMN IF NOT EXISTS target_yield numeric,
ADD COLUMN IF NOT EXISTS term_months integer,
ADD COLUMN IF NOT EXISTS raise_amount numeric,
ADD COLUMN IF NOT EXISTS min_investment numeric,
ADD COLUMN IF NOT EXISTS published boolean DEFAULT false;
```

Then rename `investor_interest` to `deal_commitments`:

```sql
ALTER TABLE public.investor_interest
RENAME TO deal_commitments;

ALTER TABLE public.deal_commitments
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'indicated';
```

You’ll keep the `investor_id` foreign key as-is.

---

### STEP 6 – UX / copy updates

Frontend changes:

* Remove or hide:

  * “Apply for funding” / “Business application” flows
  * Borrower dashboards
* Replace with:

  * “Submit a loan pool” (lender portal)
  * “Loan pool details” (instead of “Application details”)
* Update all copy:

  * “Borrower” → “Lender”
  * “Application” → “Loan pool”
  * “We’ll evaluate your company” → “We’ll evaluate your collateral/performance data”

The components for:

* document upload
* admin review
* deal creation
* investor commit

…are all still useful — only labels / binding change.

---

## 2️⃣ New Spec for Your Coding Agent (Model 1)

Here’s a **short, no-fluff implementation brief** you can paste directly into your dev agent:

---

> **Project:** PrimeBridge Finance – Fintech Lender Loan Pool Marketplace
> **Stack:** Next.js 14 (App Router, TypeScript), Tailwind, Supabase (Auth, Postgres, Storage, RLS)

### Goal

Build a **two-sided marketplace** where:

* **Lenders (fintechs)** submit loan pools with tapes + performance docs.
* **Admins** review pools, approve them, and turn them into investor-facing deals.
* **Investors (accredited)** browse deals and indicate capital commitments.

No money movement yet. MVP is purely:

* user onboarding
* data collection & review
* deals publishing
* investor commitment tracking

---

### Core roles

* `lender` – submits loan pools
* `investor` – commits to deals
* `admin` – approves lenders/investors, reviews pools, creates & publishes deals

---

### Data model (tables)

Implement these tables in Supabase:

* `users (id, auth_user_id, role, email, name, created_at)`
* `lenders (id, user_id, company_name, website, vertical, jurisdiction, avg_loan_size, status)`
* `investors (id, user_id, firm_name, accreditation_doc_url, check_size_min, check_size_max, accredited, status)`
* `loan_pools (id, lender_id, title, description, asset_class, total_principal, num_loans, avg_apr, avg_term_months, vintage_start, vintage_end, status, created_at, updated_at)`
* `loan_pool_documents (id, loan_pool_id, type, file_url, chain_doc_hash, created_at)`
* `deals (id, loan_pool_id, title, summary, target_yield, term_months, raise_amount, min_investment, memo_url, published, created_at, updated_at)`
* `deal_commitments (id, deal_id, investor_id, amount_committed, status, created_at)`
* `activity_log (id, user_id, entity_type, entity_id, action, metadata, created_at)` (optional but nice)

Enforce foreign keys, add created_at timestamps.

---

### Auth & RLS

Use Supabase Auth:

* On signup, user chooses: `lender` or `investor`.
* Create corresponding row in `lenders` or `investors`.

RLS:

* Lenders: can only access their own lender row + their loan_pools + their documents.
* Investors: can only access their own investor row + `deals` where `published = true` + their own `deal_commitments`.
* Admin: can access everything (simplest: check admin via a list of allowed `auth_user_id`s or `role='admin'`).

---

### Buckets

Create Supabase storage buckets:

* `loan-pool-documents` → for tapes, performance files, documents
* `deal-memos` → credit memos for investors

Implement signed upload + download URLs.

---

### Routes (Next.js App Router)

Public:

* `/` – marketing homepage (we’ll handle copy)
* `/login`
* `/signup`
* `/lenders/apply` – optional dedicated page
* `/investors/apply` – optional

Lender:

* `/lender/dashboard`
* `/lender/loan-pools`
* `/lender/loan-pools/new`
* `/lender/loan-pools/[id]`

Investor:

* `/investor/dashboard`
* `/investor/deals`
* `/investor/deals/[id]`

Admin:

* `/admin`
* `/admin/lenders`
* `/admin/lenders/[id]`
* `/admin/investors`
* `/admin/investors/[id]`
* `/admin/loan-pools`
* `/admin/loan-pools/[id]`
* `/admin/deals`
* `/admin/deals/new?loan_pool_id=...`
* `/admin/deals/[id]`

---

### Core flows

**Lender:**

1. Signup as lender
2. Complete profile
3. Create loan pool:

   * fill metadata
   * upload docs
   * submit → status = `submitted`
4. View review status and feedback (basic).

**Admin:**

1. View new lenders/investors, approve them.
2. Review `loan_pools` with `status = submitted`:

   * download docs
   * inspect data
   * set status: `approved` / `rejected`
3. For `approved` pools:

   * create `deal` (pre-fill from pool)
   * upload memo (PDF)
   * publish (set `published = true`)

**Investor:**

1. Signup as investor, upload accreditation.
2. Wait for admin approval.
3. Browse `/investor/deals`:

   * filter by target_yield, term, asset_class
4. View a deal, click through to:

   * view summary
   * download memo
5. Enter `amount_committed` → Save as `deal_commitments` row.

---

### Validation & UX

* Use Zod for forms.
* Tailwind for simple, clean design.
* Optimistic UI where possible.

---

That’s enough to get your agent building **exactly the right product**.

---

## 3️⃣ Homepage Copy for Model 1 (PrimeBridge)

Use this as your main page content.

### HERO

**Headline:**
**The marketplace for fintech loan pools**

**Subheadline:**
PrimeBridge connects fintech lenders who need reliable capital with accredited investors looking for high-yield, data-rich loan pools — all built on a compliant, bank-backed infrastructure.

**Primary CTA:**

> Apply as a lender

**Secondary CTA:**

> Request investor access

Small line under CTAs:

> For institutional and accredited investors only.

---

### Section: How PrimeBridge Works

**Title:**
How PrimeBridge works

**Step 1 – Lenders submit pools**
Fintech lenders upload loan pools with performance data, loan tapes, and standard agreements after bank origination.

**Step 2 – We structure the deal**
PrimeBridge reviews the pool, applies underwriting frameworks, and packages it into a clear investor-facing deal with transparent metrics.

**Step 3 – Investors commit capital**
Accredited investors browse live deals, review memos and data, and indicate commitments that fund the lender’s ongoing originations.

---

### Section: For Fintech Lenders

**Title:**
For fintech lenders

**Copy:**
Turn your origination engine into a repeatable, scalable funding channel. PrimeBridge lets you sell loan pools directly to qualified investors without building your own fund or negotiating a new warehouse line every quarter.

**Bullets:**

* Sell whole loan pools or participations
* Keep origination and servicing economics
* Access a growing network of credit investors
* Standardized workflow for pool review, memos, and reporting

CTA: **Start lender application**

---

### Section: For Investors

**Title:**
For accredited investors

**Copy:**
Access private-credit opportunities that historically lived inside closed funds and internal securitization desks. PrimeBridge brings you curated loan pools from specialist fintech originators with clear data and documentation.

**Bullets:**

* Loan-tape and cohort-level transparency
* Target mid-teens yields (deal-dependent, not guaranteed)
* Diversify across lenders, verticals, and vintages
* No 2-and-20 fund structure — direct deal exposure

CTA: **Request investor access**

---

### Section: Infrastructure & Compliance

**Title:**
Infrastructure built for regulators and risk teams

**Copy:**
PrimeBridge is designed to sit between regulated bank originators, fintech lenders, and sophisticated capital providers. We standardize documentation, track lifecycle events, and create an immutable audit trail for every pool and deal.

**Bullets:**

* Bank-originated loans (5-day hold model, where applicable)
* Centralized document and data room per pool
* Role-based access for lenders, investors, and admins
* On-chain proof-of-integrity layer (roadmap)

---

### Section: FAQ (short)

**Q: Is PrimeBridge a lender?**
A: No. Lenders originate loans through bank partners. PrimeBridge provides the marketplace and infrastructure layer connecting those loans to investors.

**Q: Who can invest through PrimeBridge?**
A: At launch, only accredited and institutional investors. Over time, we may add additional structures to broaden access.

**Q: Does PrimeBridge move or custody funds?**
A: The initial platform focuses on deal flow, documentation, and commitments. Payment rails and servicing integrations are planned in later phases and will be built with regulated partners.

---
Got you. I’ll just do **all three** so you’re not stuck deciding:

1. A **practical migration sketch** (SQL-ish + steps)
2. **Sprint 1 tickets** (dev-ready)
3. A short **pivot note** you can send to cofounders/advisors

---

## 1️⃣ Migration Sketch (DB-level)

I have to make a few assumptions about your current schema, so treat this as a **pattern**, not copy-paste production SQL.

### Assumed existing tables (Model 2)

* `users` (id, auth_user_id, email, role?, name, created_at)
* `companies` (id, user_id, name, website, etc.) → SMB borrowers
* `applications` (id, company_id, requested_amount, status, etc.)
* `documents` (id, application_id or company_id, url, type)
* `investors` (id, user_id, firm_name, etc.)
* `deals` (id, application_id, title, summary, etc.)
* `investor_interest` (id, deal_id, investor_id, amount, status)

### Target tables (Model 1)

* `users` (same, but roles: lender/investor/admin)
* `lenders`
* `investors` (same table; semantics shift a bit)
* `loan_pools`
* `loan_pool_documents`
* `deals` (linked to loan_pools)
* `deal_commitments`
* `activity_log` (optional)

---

### Step A – Normalize users.role

If `role` is missing or messy, clean it up:

```sql
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS role text;

-- Example: default everyone with investor-like behavior to 'investor'
UPDATE public.users
SET role = 'investor'
WHERE role IS NULL;

ALTER TABLE public.users
ALTER COLUMN role SET NOT NULL;
```

Going forward, valid roles in code: `'lender' | 'investor' | 'admin'`.

---

### Step B – Create fresh `lenders` table

Even if you reuse data from `companies`, create a **clean lender table**:

```sql
CREATE TABLE public.lenders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id),
  company_name text NOT NULL,
  website text,
  vertical text,
  jurisdiction text,
  avg_loan_size numeric,
  status text NOT NULL CHECK (status IN ('pending','approved','rejected'))
    DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);
```

Then, if some of your old “companies” should actually be lenders, you can manually migrate them later with an `INSERT INTO lenders SELECT ... FROM companies`.

---

### Step C – Convert `applications` → `loan_pools` (or create new)

Safest approach: create a *new* `loan_pools` table and copy over any useful data from `applications`:

```sql
CREATE TABLE public.loan_pools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lender_id uuid NOT NULL REFERENCES public.lenders(id),
  title text NOT NULL,
  description text,
  asset_class text,
  total_principal numeric NOT NULL,
  num_loans integer,
  avg_apr numeric,
  avg_term_months integer,
  vintage_start date,
  vintage_end date,
  status text NOT NULL CHECK (
    status IN ('draft','submitted','under_review','approved','rejected','live','closed')
  ) DEFAULT 'draft',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

If there’s no clean mapping from `applications` → `loan_pools`, **don’t force it**. Just start fresh and only migrate if something is obviously reusable.

---

### Step D – Convert `documents` → `loan_pool_documents`

If you have a `documents` table:

```sql
CREATE TABLE public.loan_pool_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_pool_id uuid NOT NULL REFERENCES public.loan_pools(id),
  type text NOT NULL,         -- 'tape','performance','agreement','memo','other'
  file_url text NOT NULL,
  chain_doc_hash bytea,       -- optional, for blockchain
  created_at timestamptz DEFAULT now()
);
```

You can later backfill the `loan_pool_id` and `type` if some existing docs correspond to pools.

---

### Step E – Adapt `deals` and `investor_interest`

Make sure `deals` ties to `loan_pools`:

```sql
ALTER TABLE public.deals
ADD COLUMN IF NOT EXISTS loan_pool_id uuid REFERENCES public.loan_pools(id),
ADD COLUMN IF NOT EXISTS target_yield numeric,
ADD COLUMN IF NOT EXISTS term_months integer,
ADD COLUMN IF NOT EXISTS raise_amount numeric,
ADD COLUMN IF NOT EXISTS min_investment numeric,
ADD COLUMN IF NOT EXISTS memo_url text,
ADD COLUMN IF NOT EXISTS published boolean DEFAULT false;
```

Then convert `investor_interest` → `deal_commitments`:

```sql
ALTER TABLE public.investor_interest
RENAME TO deal_commitments;

ALTER TABLE public.deal_commitments
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'indicated';
```

If needed, rename columns for clarity:

```sql
ALTER TABLE public.deal_commitments
RENAME COLUMN amount TO amount_committed;
```

---

That’s enough DB work to support the new flows. The rest is **frontend + copy refactor**, which we’ll tackle next via tickets.

---

## 2️⃣ Sprint 1 Tickets (Dev-Ready)

You can paste these into Linear / Jira / Notion.

---

### TICKET 1 – Update Auth Roles to Lender/Investor/Admin

**Goal:** Normalize `users.role` and enforce roles in auth flows.

* Enforce `role` on signup:

  * `/signup` must require user to pick `lender` or `investor`
* Create initial admin user manually (SQL or seed script)
* Add a simple `isAdmin` helper in frontend (checks role or email)
* Update route guards:

  * `/lender/*` → `role === 'lender'`
  * `/investor/*` → `role === 'investor'`
  * `/admin/*` → `role === 'admin'`

**Done when:**

* A new user can sign up as lender or investor and be routed to the correct dashboard.
* Admin login works.

---

### TICKET 2 – Implement Lender Profile & Dashboard

**Goal:** Lenders can complete their profile and see a dashboard.

* Build `/lender/dashboard`:

  * Show profile summary (company_name, website, vertical, status)
  * Show list of their loan pools (empty state initially)
* Add `/lender/profile` or inline form to:

  * Edit company_name, website, vertical, jurisdiction, avg_loan_size
* Connect to `lenders` table (user_id foreign key).

**Done when:**

* A lender can log in, complete their profile, and see it persist.
* Dashboard shows 0 pools initially without errors.

---

### TICKET 3 – Implement Loan Pool Creation Flow

**Goal:** Lender can create and submit a new loan pool.

* New page: `/lender/loan-pools`

  * List all loan_pools for that lender (title, status, total_principal)
* New page: `/lender/loan-pools/new`

  * Form fields:

    * title
    * description
    * asset_class (dropdown)
    * total_principal
    * num_loans
    * avg_apr
    * avg_term_months
    * vintage_start / vintage_end
  * On submit:

    * Insert into `loan_pools` with `status = 'draft'`
    * Redirect to `/lender/loan-pools/[id]`
* On `/lender/loan-pools/[id]`:

  * Show pool data
  * Button “Submit for review” → sets `status = 'submitted'`

**Done when:**

* A lender can create a pool and submit it; status changes and displays correctly.

---

### TICKET 4 – Loan Pool Document Upload

**Goal:** Lenders can upload tapes/performance files to a pool.

* On `/lender/loan-pools/[id]`:

  * “Upload documents” section
  * Upload input bound to Supabase Storage bucket `loan-pool-documents`
  * On upload complete:

    * Insert row into `loan_pool_documents` with:

      * loan_pool_id
      * type (selected from dropdown: tape / performance / agreements / other)
      * file_url (returned from Supabase)
* Show a table of existing documents with type + link.

**Done when:**

* Lender can upload at least one tape file and see it listed under the pool.

---

### TICKET 5 – Admin: Review Loan Pools

**Goal:** Admin can see submitted pools and change their status.

* New page: `/admin/loan-pools`

  * Table of all pools with filter by status
* New page: `/admin/loan-pools/[id]`

  * Show full pool info + documents
  * Buttons:

    * “Approve pool” → status = `approved`
    * “Reject pool” → status = `rejected`
* When status updated, insert row in `activity_log` (if table exists).

**Done when:**

* Admin can view and approve a lender’s submitted pool.

---

### TICKET 6 – Admin: Create & Publish Deals from Pools

**Goal:** Admin can turn an approved pool into a deal.

* On `/admin/loan-pools/[id]`:

  * If `status = 'approved'`, show button “Create deal from this pool”
  * Takes admin to `/admin/deals/new?loan_pool_id=...`
* `/admin/deals/new`:

  * Pre-fill title from pool (editable)
  * Fields:

    * summary
    * target_yield
    * term_months
    * raise_amount
    * min_investment
  * On submit:

    * Inserts into `deals` with `published = false`
    * Redirects to `/admin/deals/[id]`
* `/admin/deals/[id]`:

  * Show deal info
  * Upload memo PDF to `deal-memos` bucket; store `memo_url`
  * Toggle switch “Published” → sets `published = true/false`

**Done when:**

* Admin can fully create and publish a deal linked to a pool.

---

### TICKET 7 – Investor Deal Browsing & Commitments

**Goal:** Investors can see published deals and indicate interest.

* `/investor/deals`:

  * List all `deals` with `published = true`
  * Columns: title, asset_class (from pool), target_yield, term_months, raise_amount, % filled
* `/investor/deals/[id]`:

  * Show:

    * deal summary
    * pool stats
    * link to memo PDF
  * Commit form:

    * amount input
    * submit button → insert/update `deal_commitments` row
* `/investor/dashboard`:

  * List investor’s own commitments with status, deal title, amount_committed.

**Done when:**

* An investor can log in, see live deals, and submit a commitment that persists.

---

That’s a **full Sprint 1–2 worth of real work**, all aligned with Model 1.

---

## 3️⃣ Pivot Note (Internal / Advisors)

You can send this via email or Slack.

> **Subject:** PrimeBridge Product Pivot – Moving Fully to Fintech Loan Pools
>
> Quick update on PrimeBridge.
>
> We’re making a deliberate product pivot from a generic business credit marketplace to a focused **fintech lender loan pool marketplace**.
>
> The original direction was effectively a “borrower marketplace”: businesses apply for funding, we underwrite them, and investors back individual deals. After mapping out the regulatory, capital, and competitive realities, it became clear that this path would push us toward becoming a lending company with high CAC and heavy compliance, competing with well-funded players like ClearCo, Capchase, and others.
>
> Instead, we are repositioning PrimeBridge as **infrastructure for fintech lenders**:
>
> * Lenders originate loans via bank partners
> * They submit loan pools (with tapes + performance data) to PrimeBridge
> * We standardize and structure those pools into investor-ready deals
> * Accredited investors browse curated pools and commit capital
>
> This model plays to our strengths (marketplaces, infrastructure, underwriting workflows), avoids us becoming a direct lender, and aligns with how capital is actually searching for yield in private credit. It’s also the model that can support a true “AngelList for private credit” vision with better scalability and defensibility.
>
> Practically, much of what we’ve already built carries over:
>
> * Auth, role-based dashboards
> * Document upload and data rooms
> * Admin review workflows
> * Deal creation and investor commitments
>
> The main changes are in **positioning, data model, and UX**: “companies/applications” are becoming “lenders/loan pools,” and we are explicitly building for fintech lenders and accredited investors rather than SMB borrowers.
>
> Over the next 4–8 weeks, we’ll:
>
> * Finalize the lender and loan pool schema
> * Ship lender-facing pool submission flows
> * Upgrade the admin review tools
> * Release an investor-facing deal browsing and commitment experience tied to pools
>
> I’ll share a product spec and early screenshots as we work through the updated build. If you have feedback on lender verticals or investor segments we should prioritize first (e.g., credit-builder, BNPL, medical, etc.), I’m all ears.
>
> – Enri

---

If you want the **actual Solidity contract + TS helper file** for the blockchain ledger next, say “blockchain code next” and I’ll write the contract + ethers.js integration in one shot.

Alright, blockchain time. I’ll give you:

1. **Solidity contract**: `PrimeBridgeLedger.sol`
2. **TypeScript helper** for your Next.js/Supabase backend using `ethers`
3. Notes on **env vars + usage** so you can wire it into your server actions

You can hand this straight to your coding agent.

---

## 1️⃣ Solidity Contract – `PrimeBridgeLedger.sol`

This is a **permissioned-writer, public-reader** ledger:

* Only your backend wallet(s) can write
* Anyone can read / verify
* Stores:

  * document records (hashes + metadata)
  * lifecycle events (entity-level events + metadata hash)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title PrimeBridgeLedger
/// @notice On-chain audit ledger for loan pools, deals, and related documents/events.
///         Only authorized backend signers can write; anyone can read/verify.
contract PrimeBridgeLedger {
    // -------------------------
    // Roles & Access Control
    // -------------------------
    address public owner;
    mapping(address => bool) public authorizedSigners;

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyAuthorized() {
        require(authorizedSigners[msg.sender], "Not authorized");
        _;
    }

    // -------------------------
    // Enums / Types
    // -------------------------

    // You can standardize these enums in your TypeScript layer
    // entityType: 0 = LOAN_POOL, 1 = DEAL, 2 = COMMITMENT, 3 = OTHER
    // eventType:  0 = CREATED, 1 = SUBMITTED, 2 = APPROVED, 3 = REJECTED,
    //             4 = PUBLISHED, 5 = CLOSED, 6 = DOCUMENT_ATTACHED

    struct DocumentRecord {
        bytes32 docId;          // keccak256(entityId, offChainUri, docType)
        bytes32 entityId;       // keccak256(UUID string or other canonical id)
        uint8 entityType;       // see comment above
        uint8 docType;          // e.g. PROMISSORY_NOTE, MEMO, TAPE, PERFORMANCE
        string offChainUri;     // Supabase URL or pointer
        bytes32 hash;           // hash of document contents (keccak256 or SHA256)
        address issuer;         // backend signer
        uint256 blockNumber;
        uint256 blockTimestamp;
    }

    struct EventRecord {
        bytes32 eventId;        // keccak256(entityId, eventType, blockNumber, timestamp)
        bytes32 entityId;
        uint8 entityType;       // LOAN_POOL, DEAL, COMMITMENT, ...
        uint8 eventType;        // CREATED, APPROVED, PUBLISHED, ...
        bytes32 metadataHash;   // hash of JSON metadata snapshot
        address issuer;         // backend signer
        uint256 blockNumber;
        uint256 blockTimestamp;
    }

    // -------------------------
    // Storage
    // -------------------------

    mapping(bytes32 => DocumentRecord) private documents;
    mapping(bytes32 => EventRecord) private events;

    // -------------------------
    // Events
    // -------------------------

    event AuthorizedSignerUpdated(address signer, bool authorized);
    event DocumentRecorded(
        bytes32 indexed docId,
        bytes32 indexed entityId,
        uint8 entityType,
        uint8 docType,
        string offChainUri,
        bytes32 hash,
        address indexed issuer,
        uint256 blockNumber,
        uint256 blockTimestamp
    );

    event LedgerEventRecorded(
        bytes32 indexed eventId,
        bytes32 indexed entityId,
        uint8 entityType,
        uint8 eventType,
        bytes32 metadataHash,
        address indexed issuer,
        uint256 blockNumber,
        uint256 blockTimestamp
    );

    // -------------------------
    // Constructor
    // -------------------------

    constructor(address _initialOwner) {
        require(_initialOwner != address(0), "Owner cannot be zero");
        owner = _initialOwner;
        authorizedSigners[_initialOwner] = true;
        emit AuthorizedSignerUpdated(_initialOwner, true);
    }

    // -------------------------
    // Owner functions
    // -------------------------

    function setAuthorizedSigner(address signer, bool authorized) external onlyOwner {
        authorizedSigners[signer] = authorized;
        emit AuthorizedSignerUpdated(signer, authorized);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Owner cannot be zero");
        owner = newOwner;
    }

    // -------------------------
    // Write functions (backend only)
    // -------------------------

    /// @notice Record a new document hash anchored to an entity (loan pool, deal, etc.)
    /// @param entityId   keccak256(UUID string or canonical ID)
    /// @param entityType See enum comment
    /// @param docType    Application-defined doc type
    /// @param offChainUri Pointer to off-chain storage (Supabase, s3, etc.)
    /// @param hash       Hash of document contents (keccak256 or SHA256)
    function recordDocument(
        bytes32 entityId,
        uint8 entityType,
        uint8 docType,
        string calldata offChainUri,
        bytes32 hash
    ) external onlyAuthorized {
        bytes32 docId = keccak256(abi.encodePacked(entityId, offChainUri, docType));

        DocumentRecord memory rec = DocumentRecord({
            docId: docId,
            entityId: entityId,
            entityType: entityType,
            docType: docType,
            offChainUri: offChainUri,
            hash: hash,
            issuer: msg.sender,
            blockNumber: block.number,
            blockTimestamp: block.timestamp
        });

        documents[docId] = rec;

        emit DocumentRecorded(
            docId,
            entityId,
            entityType,
            docType,
            offChainUri,
            hash,
            msg.sender,
            block.number,
            block.timestamp
        );
    }

    /// @notice Record a lifecycle event for an entity (pool approved, deal published, etc.)
    /// @param entityId     keccak256(UUID string or canonical ID)
    /// @param entityType   See enum comment
    /// @param eventType    Application-defined event type
    /// @param metadataHash Hash of JSON metadata snapshot
    function recordEvent(
        bytes32 entityId,
        uint8 entityType,
        uint8 eventType,
        bytes32 metadataHash
    ) external onlyAuthorized {
        bytes32 eventId = keccak256(
            abi.encodePacked(entityId, eventType, block.number, block.timestamp)
        );

        EventRecord memory rec = EventRecord({
            eventId: eventId,
            entityId: entityId,
            entityType: entityType,
            eventType: eventType,
            metadataHash: metadataHash,
            issuer: msg.sender,
            blockNumber: block.number,
            blockTimestamp: block.timestamp
        });

        events[eventId] = rec;

        emit LedgerEventRecorded(
            eventId,
            entityId,
            entityType,
            eventType,
            metadataHash,
            msg.sender,
            block.number,
            block.timestamp
        );
    }

    // -------------------------
    // Read functions
    // -------------------------

    function getDocument(bytes32 docId) external view returns (DocumentRecord memory) {
        return documents[docId];
    }

    function getEvent(bytes32 eventId) external view returns (EventRecord memory) {
        return events[eventId];
    }
}
```

That’s the core contract. You’d:

* deploy it (e.g. on Polygon Amoy or mainnet)
* set your backend wallet(s) as `authorizedSigners`
* call `recordDocument` and `recordEvent` from your server code

---

## 2️⃣ TypeScript Helper – `ledgerClient.ts`

This is a simple wrapper around `ethers` you can use in server actions / API routes.

Assumptions:

* You’re using **Node 18+** / Next.js 14
* `ethers` v6
* You have env vars set:

```bash
# .env.local (server only)
LEDGER_RPC_URL="https://polygon-amoy.g.alchemy.com/v2/..."
LEDGER_PRIVATE_KEY="0x..."
LEDGER_CONTRACT_ADDRESS="0xYourDeployedLedgerAddress"
```

Here’s the helper:

```ts
// lib/ledgerClient.ts
import { ethers } from "ethers";

// --- Types for convenience ---

export enum EntityType {
  LOAN_POOL = 0,
  DEAL = 1,
  COMMITMENT = 2,
  OTHER = 3,
}

export enum EventType {
  CREATED = 0,
  SUBMITTED = 1,
  APPROVED = 2,
  REJECTED = 3,
  PUBLISHED = 4,
  CLOSED = 5,
  DOCUMENT_ATTACHED = 6,
}

// You can define your own doc types
export enum DocType {
  UNKNOWN = 0,
  PROMISSORY_NOTE = 1,
  CREDIT_MEMO = 2,
  TAPE = 3,
  PERFORMANCE = 4,
  AGREEMENT = 5,
}

// --- ABI (minimal) ---

const PRIMEBRIDGE_LEDGER_ABI = [
  "function recordDocument(bytes32 entityId,uint8 entityType,uint8 docType,string offChainUri,bytes32 hash) external",
  "function recordEvent(bytes32 entityId,uint8 entityType,uint8 eventType,bytes32 metadataHash) external",
  "function getDocument(bytes32 docId) external view returns (tuple(bytes32 docId,bytes32 entityId,uint8 entityType,uint8 docType,string offChainUri,bytes32 hash,address issuer,uint256 blockNumber,uint256 blockTimestamp))",
  "function getEvent(bytes32 eventId) external view returns (tuple(bytes32 eventId,bytes32 entityId,uint8 entityType,uint8 eventType,bytes32 metadataHash,address issuer,uint256 blockNumber,uint256 blockTimestamp))",
];

// --- Setup provider + signer + contract ---

const rpcUrl = process.env.LEDGER_RPC_URL!;
const privateKey = process.env.LEDGER_PRIVATE_KEY!;
const contractAddress = process.env.LEDGER_CONTRACT_ADDRESS!;

if (!rpcUrl || !privateKey || !contractAddress) {
  console.warn("[ledgerClient] Missing one or more env vars: LEDGER_RPC_URL / LEDGER_PRIVATE_KEY / LEDGER_CONTRACT_ADDRESS");
}

const provider = new ethers.JsonRpcProvider(rpcUrl);
const signer = new ethers.Wallet(privateKey, provider);
const ledgerContract = new ethers.Contract(
  contractAddress,
  PRIMEBRIDGE_LEDGER_ABI,
  signer
);

// --- Helper: convert your UUID/string ID to bytes32 entityId ---

export function toEntityId(id: string): string {
  // We'll standardize on keccak256 of the UTF-8 bytes of the UUID string
  return ethers.keccak256(ethers.toUtf8Bytes(id));
}

// --- Helper: hash JSON metadata to bytes32 ---

export function hashJson(json: unknown): string {
  const jsonString = JSON.stringify(json, Object.keys(json as any).sort());
  return ethers.keccak256(ethers.toUtf8Bytes(jsonString));
}

// --- Main write functions ---

interface RecordDocumentParams {
  entityId: string; // UUID string or similar
  entityType: EntityType;
  docType: DocType;
  offChainUri: string;
  // rawBytes OR pre-hashed document content. If you already have a hash from elsewhere,
  // pass it via docHashHex; otherwise pass raw bytes.
  rawDocumentBytes?: Uint8Array;
  docHashHex?: string; // 0x-prefixed bytes32
}

/**
 * Record a document hash on-chain.
 * Returns the transaction hash.
 */
export async function recordDocumentOnChain(params: RecordDocumentParams): Promise<string> {
  const { entityId, entityType, docType, offChainUri, rawDocumentBytes, docHashHex } = params;

  if (!docHashHex && !rawDocumentBytes) {
    throw new Error("Must provide either rawDocumentBytes or docHashHex");
  }

  const entityIdBytes32 = toEntityId(entityId);

  const hash =
    docHashHex ??
    ethers.keccak256(rawDocumentBytes as Uint8Array);

  const tx = await ledgerContract.recordDocument(
    entityIdBytes32,
    entityType,
    docType,
    offChainUri,
    hash
  );

  const receipt = await tx.wait();
  return receipt.transactionHash;
}

interface RecordEventParams {
  entityId: string; // UUID string
  entityType: EntityType;
  eventType: EventType;
  metadata: unknown; // any JSON-serializable payload
}

/**
 * Record a lifecycle event on-chain.
 * Returns the transaction hash.
 */
export async function recordEventOnChain(params: RecordEventParams): Promise<string> {
  const { entityId, entityType, eventType, metadata } = params;

  const entityIdBytes32 = toEntityId(entityId);
  const metadataHash = hashJson(metadata);

  const tx = await ledgerContract.recordEvent(
    entityIdBytes32,
    entityType,
    eventType,
    metadataHash
  );

  const receipt = await tx.wait();
  return receipt.transactionHash;
}

// --- Optional: read helpers ---

export async function getDocument(docIdHex: string) {
  const doc = await ledgerContract.getDocument(docIdHex);
  return doc;
}

export async function getEvent(eventIdHex: string) {
  const ev = await ledgerContract.getEvent(eventIdHex);
  return ev;
}
```

---

## 3️⃣ How this plugs into your Supabase flows

Concrete example: when a **loan pool is approved**, you:

1. Build a metadata snapshot
2. Hash + record event on-chain
3. Store `tx_hash` in your Postgres row

### Example server action (pseudo-code)

```ts
// app/(admin)/admin/loan-pools/[id]/actions.ts
"use server";

import { recordEventOnChain, EntityType, EventType } from "@/lib/ledgerClient";
import { createClient } from "@supabase/supabase-js";

export async function approveLoanPool(poolId: string, adminUserId: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1) Update status in DB
  const { data: pool, error } = await supabase
    .from("loan_pools")
    .update({ status: "approved", updated_at: new Date().toISOString() })
    .eq("id", poolId)
    .select("*")
    .single();

  if (error || !pool) {
    throw new Error("Failed to approve pool");
  }

  // 2) Build metadata snapshot (minimal version)
  const metadata = {
    poolId: pool.id,
    lenderId: pool.lender_id,
    totalPrincipal: pool.total_principal,
    numLoans: pool.num_loans,
    avgApr: pool.avg_apr,
    status: pool.status,
    timestamp: new Date().toISOString(),
  };

  // 3) Record on-chain event
  const txHash = await recordEventOnChain({
    entityId: pool.id,
    entityType: EntityType.LOAN_POOL,
    eventType: EventType.APPROVED,
    metadata,
  });

  // 4) Store txHash for reference (optional)
  await supabase
    .from("loan_pools")
    .update({ approved_tx_hash: txHash })
    .eq("id", poolId);

  // 5) Optionally log internally
  await supabase.from("activity_log").insert({
    user_id: adminUserId,
    entity_type: "loan_pool",
    entity_id: pool.id,
    action: "approved",
    metadata: { txHash },
  });

  return { pool, txHash };
}
```

Same pattern for:

* `POOL_SUBMITTED`
* `DEAL_CREATED_FROM_POOL`
* `DEAL_PUBLISHED`
* `DOCUMENT_ATTACHED` (when you upload tapes/performance docs)

---

If you want, next I can:

* write a **hard-coded deployment script** (using `hardhat` or `forge`) for `PrimeBridgeLedger`, or
* give you the **exact enum mapping** to keep consistent between Solidity + TS + DB, or
* show how to expose a small **“Proof” widget** in the UI that links to Polygonscan for a given deal/pool.
