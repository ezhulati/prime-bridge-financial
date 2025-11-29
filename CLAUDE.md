# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PrimeBridge Finance is a two-sided private credit marketplace connecting:
- **Borrowers**: Businesses seeking $500K–$10M in non-bank credit
- **Investors**: Accredited investors reviewing and funding deals
- **Admins**: Credit team managing applications and publishing deals

This is an MVP - no real money movement, only data collection and workflow handling.

## Tech Stack

- **Frontend**: Astro 5 + React Islands + TypeScript + Tailwind CSS
- **Backend**: Supabase (Postgres, Auth, Storage, Row-Level Security)
- **Deployment**: Node.js SSR + Supabase Cloud

## Brand Assets

| Asset | File | Usage |
|-------|------|-------|
| Full Logo | `PrimeBridgeFinance.png` | Main navigation, header, footer |
| Icon/Favicon | `pbf_icon.png` | Favicon, app icon, social sharing |

**Brand Color**: Deep navy blue `#1B365D` (extract from logo)

**Logo Usage Rules:**
- Nav logo: Use full `PrimeBridgeFinance.png` with adequate padding
- Favicon: Use `pbf_icon.png` - generate favicon sizes (16x16, 32x32, 180x180)
- Minimum clear space: Height of the "P" on all sides
- Never stretch, rotate, or alter colors

## Design System

**IMPORTANT**: All UI work must follow `DESIGN-SYSTEM.md` - the evidence-based design system based on Practical UI principles.

### Critical Rules (Always Follow)

**Buttons:**
- ONE primary button per screen maximum
- Button hierarchy: Primary (solid) → Secondary (outline) → Tertiary (text+underline)
- Labels must be Verb + Noun ("Apply for financing", not "Submit")
- Min touch target: 48px × 48px

**Forms:**
- Single column layout ALWAYS
- Labels ABOVE fields, never left
- Hints ABOVE fields, never below
- Errors ABOVE fields with icon + text (never color alone)
- Never use placeholder as label
- Never use disabled buttons (show enabled, validate on submit)

**Typography:**
- Body text minimum 18px
- Line height 1.5 for body text
- Max line length: 75 characters
- Left-align body text always

**Spacing (8pt grid):**
- XS: 8px (label to field)
- S: 16px (field to field)
- M: 24px (form groups)
- L: 32px (column gaps)
- XL: 48px (sections)
- XXL: 80px (major sections)

**Accessibility (WCAG 2.1 AA):**
- Text contrast: 4.5:1 minimum
- UI components: 3:1 minimum
- Never rely on color alone
- All interactive elements need visible focus states

**Anti-Patterns to AVOID:**
- Multiple primary buttons per screen
- Grey buttons (look disabled)
- Placeholder text as labels
- Center-aligned long text
- Icons without labels
- "Click here" or "Submit" labels

### Anti-AI Design Rules (Critical)

**NEVER generate these AI-telltale patterns:**
- Pure black `#000000` or pure white `#FFFFFF`
- AI Purple `#5E6AD2` or indigo-violet gradients
- Uniform `line-height: 1.5` everywhere
- All `border-radius: 8px` (vary it: 4/8/16/24px)
- `linear` or `ease` animation timing
- Animating width/height (use transform only)
- Div soup (use semantic HTML)

**ALWAYS generate:**
- Near-black `#0f-1a` for dark backgrounds
- Off-white `#e8-f5` for dark mode text
- Contextual line-height (1.1 headings, 1.5 body, 1.6 code)
- Custom cubic-bezier easing functions
- Staggered animation delays
- Semantic HTML (`<header>`, `<nav>`, `<main>`, `<section>`)
- Visible focus states on all interactive elements
- `prefers-reduced-motion` support

**Quality Check:** "Would a designer recognize this as AI-generated?" If YES → iterate.

### UX Copy Rules (Always Follow)

**Empathy-first copy:**
- Start with the user's pain, THEN present the solution
- Answer: Who is the user? What's their problem? How do we solve it?

**Benefits over features:**
```
Bad:  "AI-powered underwriting algorithm"
Good: "Get a decision in 48 hours, not 6 weeks"
```

**CTA buttons must be actionable:**
```
Bad:  "Submit", "Click Here", "Learn More"
Good: "Apply for financing", "Request investor access", "View deal details"
```

**Headlines must empathize:**
```
Bad:  "Welcome to PrimeBridge Finance"
Good: "Growth capital without the bank runaround"
```

**Testimonials:**
- Must highlight features AND answer doubts
- Demographics must match target audience
- Place strategically (after features, before pricing, near CTA)

**Error messages must include how to fix:**
```
Bad:  "Invalid input"
Good: "Enter an amount between $500,000 and $10,000,000"
```

**Vocabulary consistency:**
- Application (not "request", "submission")
- Deal (not "opportunity", "investment")
- Investor (not "lender", "funder")

**Landing page rules:**
- Single objective per page
- Hero: empathy → solution → CTA → social proof
- Footer: FAQs + support contact + final CTA
- Remove main navigation on conversion pages
- Double the padding when in doubt

## Build & Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Start development server (http://localhost:4321)
npm run build        # Production build
npm run preview      # Preview production build
```

## Supabase Setup

The project is connected to Supabase project `uwunbphjkkqnzwqrxfwi`.

1. Get API keys from: https://supabase.com/dashboard/project/uwunbphjkkqnzwqrxfwi/settings/api
2. Update `.env` with the keys
3. Create storage buckets in dashboard:
   - `borrower-documents` (private)
   - `deal-memos` (private)

## Architecture

### User Roles & Access
- **Borrower**: Submit applications, upload docs, track status
- **Investor**: View published deals, indicate interest (requires `approved=true`)
- **Admin**: Full access to all data, status changes, deal publishing

### Database Tables
- `users` - All users with role (borrower/investor/admin)
- `companies` - Borrower company profiles
- `applications` - Credit applications with status workflow
- `documents` - Files uploaded by borrowers
- `investors` - Investor profiles and approval status
- `deals` - Published deals visible to approved investors
- `investor_interest` - Interest indications from investors

### Application Status Flow
`draft` → `submitted` → `under_review` → `term_sheet` → `in_funding` → `funded` (or `rejected`)

### Storage Buckets
- `borrower-documents`: `applications/<application_id>/<filename>`
- `deal-memos`: `deals/<deal_id>/memo.pdf`

### Route Structure
- `/` - Marketing homepage
- `/apply`, `/invest`, `/login`, `/signup` - Public pages
- `/dashboard`, `/application/*` - Borrower portal
- `/investor/*`, `/deals/*` - Investor portal
- `/admin/*` - Admin portal

## Environment Variables

```
PUBLIC_SUPABASE_URL=https://uwunbphjkkqnzwqrxfwi.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

## Key Implementation Notes

- Use Supabase Auth with email/password
- Implement RLS policies: borrowers see only their data, investors see only published deals
- Investors require `approved=true` to access deal room
- All server actions must verify role/permission before executing
- Use Zod for input validation on server actions
