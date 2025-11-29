# PrimeBridge Finance Design System

Evidence-based design system for building intuitive, accessible, and professional financial interfaces.

**Research Sources**: Practical UI by Adham Dannaway, Rob Hope's Landing Page Hot Tips, Baymard Institute, Nielsen Norman Group, TetraLogical.

---

## Anti-AI Design Warning

AI-generated designs have an **81% failure rate** on UX recommendations (Baymard Institute). This system exists to prevent:

- Statistical homogenization toward "median SaaS aesthetic"
- The "AI Purple Problem" (#5E6AD2 indigo-violet gradients)
- Uniform styling that lacks visual hierarchy
- Generic, forgettable interfaces

**Quality Check**: "Would a designer immediately recognize this as AI-generated?" If YES → iterate.

---

## Core Principles

### 1. Minimize Usability Risks
- Meet WCAG 2.1 Level AA minimum
- Consider vision impairments, motor disabilities, cognitive load
- Never rely on color alone for meaning

### 2. Minimize Interaction Cost
- **Fitts's Law**: Closer + larger targets = faster clicks. Min 48pt touch target.
- **Hick's Law**: More choices = slower decisions. Reduce options, highlight recommended.
- Remove distractions (animations, pop-ups, unnecessary elements)

### 3. Minimize Cognitive Load
- Remove unnecessary styles and information
- Break info into smaller groups
- Use familiar patterns (Jakob's Law)
- Create clear visual hierarchy
- Be consistent

---

## Spacing System (8pt Grid)

```
XS:  8px   - Closely related elements (label to field)
S:   16px  - Related elements (field to field)
M:   24px  - Somewhat related (form groups)
L:   32px  - Column gaps
XL:  48px  - Section spacing
XXL: 80px  - Major sections
```

**Tailwind mapping:**
```
XS:  space-2, gap-2, p-2, m-2
S:   space-4, gap-4, p-4, m-4
M:   space-6, gap-6, p-6, m-6
L:   space-8, gap-8, p-8, m-8
XL:  space-12, gap-12, p-12, m-12
XXL: space-20, gap-20, p-20, m-20
```

**Rule**: Apply smaller spacing inside containers, larger spacing as you move outward.

---

## Color System

### Critical Color Rules

**NEVER use:**
- Pure black `#000000` (causes halation, screams amateur)
- Pure white `#FFFFFF` for text on dark backgrounds
- AI Purple `#5E6AD2` or indigo-violet gradients
- 80-100% saturation neon accents

**ALWAYS use:**
- Near-black for dark backgrounds: `#0f0f0f` to `#1a1a1a`
- Off-white for dark mode text: `#e8e8e8` to `#f5f5f5`
- Off-white for light backgrounds: `#FAFAFA` to `#F8FAFC`

### Brand Colors (HSB-Based)

PrimeBridge uses a professional deep navy palette conveying trust, stability, and financial expertise.

**Primary Brand Color**: `#1B365D` (Deep Navy from logo)
**Primary Hue**: 213 (Deep Navy Blue) - NOT indigo/violet

#### Light Mode Palette

| Token | HSB | Hex | Usage |
|-------|-----|-----|-------|
| `primary` | 213, 71, 36 | `#1B365D` | Buttons, links, CTAs (brand color) |
| `primary-hover` | 213, 71, 28 | `#152A48` | Button hover states |
| `primary-light` | 213, 30, 55 | `#627A8E` | Secondary buttons |
| `darkest` | 213, 60, 15 | `#0F1826` | Headings, primary text |
| `dark` | 213, 30, 40 | `#475669` | Secondary text, labels |
| `medium` | 213, 15, 60 | `#828D99` | Borders (3:1 contrast) |
| `light` | 213, 8, 90 | `#D4D9E0` | Decorative borders |
| `lightest` | 213, 4, 97 | `#F8F9FC` | Alt backgrounds (not pure white) |
| `white` | 0, 0, 98 | `#FAFAFA` | Main background (off-white) |

#### Dark Mode Palette

| Token | HSB | Hex | Usage |
|-------|-----|-----|-------|
| `primary` | 213, 50, 65 | `#5278A6` | Buttons, links, CTAs |
| `text-primary` | 0, 0, 91 | `#E8E8E8` | Headings (off-white) |
| `text-secondary` | 213, 6, 80 | `#C4C9D8` | Secondary text |
| `border` | 213, 8, 55 | `#7F8899` | Borders |
| `border-decorative` | 213, 10, 30 | `#444B5C` | Decorative borders |
| `surface` | 213, 12, 18 | `#272C38` | Alt backgrounds |
| `bg` | 213, 15, 10 | `#151820` | Main background (near-black) |

### Darkening Colors Correctly

```css
/* WRONG: Just decrease lightness (looks muddy) */
--primary: hsl(220, 50%, 50%);
--primary-dark: hsl(220, 50%, 30%);

/* CORRECT: Increase saturation while decreasing lightness */
--primary: hsl(220, 50%, 50%);
--primary-dark: hsl(220, 70%, 35%); /* Richer, more vibrant */
```

### System/Status Colors

| Status | Color | Hex | Usage |
|--------|-------|-----|-------|
| Error | Red | `#DC2626` | Errors, destructive actions |
| Warning | Amber | `#D97706` | Caution, risky actions |
| Success | Green | `#059669` | Confirmations, funded status |
| Info | Blue | `#2563EB` | Informational messages |

**Always pair status colors with icons** for colorblind accessibility.

### Contrast Requirements

| Element | Minimum Ratio |
|---------|---------------|
| Body text | 4.5:1 |
| Large text (18px bold+ or 24px+) | 3:1 |
| UI components & borders | 3:1 |
| Placeholder text | 4.5:1 (never use as label) |

---

## Typography Scale (1.25 Major Third)

**Use Major Third (1.25) or Perfect Fourth (1.333) - NOT the timid 1.125 ratio.**

```
Display:   56px  - Hero headlines only
H1:        44px  - Page titles
H2:        36px  - Section headers
H3:        28px  - Subsection headers
H4:        22px  - Card titles, form section headers
Body:      18px  - Primary content (minimum for long text)
Small:     15px  - Captions, helper text
XS:        13px  - Legal text, timestamps
```

**Tailwind mapping:**
```
Display: text-6xl (56px)
H1:      text-5xl (44px)
H2:      text-4xl (36px)
H3:      text-3xl (28px)
H4:      text-xl (22px)
Body:    text-lg (18px)
Small:   text-base (15px)
XS:      text-sm (13px)
```

### Line Height (Contextual - NOT Uniform)

```css
/* WRONG: Uniform 1.5 everywhere */
* { line-height: 1.5; }

/* CORRECT: Contextual line heights */
h1, h2, h3     { line-height: 1.1; }  /* Headings tight */
h4, .subtitle  { line-height: 1.3; }  /* Subheads medium */
p, li          { line-height: 1.5; }  /* Body text comfortable */
code, pre      { line-height: 1.6; }  /* Code needs more space */
```

### Line Length

```css
/* Body text: 65ch optimal (45-75 range) */
.prose { max-width: 65ch; }

/* Headings: 40ch maximum */
h1, h2, h3 { max-width: 40ch; }

/* Sidebars: 50ch */
aside { max-width: 50ch; }
```

### Font Weights (Use Extremes)

```css
/* WRONG: Middle weights lack contrast */
h1 { font-weight: 500; }
p  { font-weight: 400; }

/* CORRECT: Extremes create visual hierarchy */
h1       { font-weight: 900; }  /* Black */
.subtitle { font-weight: 300; } /* Light */
p        { font-weight: 400; }  /* Regular */
strong   { font-weight: 700; }  /* Bold */
```

### Letter Spacing

```css
.display     { letter-spacing: -0.02em; }  /* Large text tighter */
body         { letter-spacing: 0; }         /* Normal text default */
.small-caps  { letter-spacing: 0.05em; }   /* Small text wider */
.overline    { letter-spacing: 0.1em; }    /* Labels/eyebrows */
```

### Typography Rules Summary

- **Line height**: Contextual (1.1 headings → 1.6 code)
- **Line length**: 45-75 characters max (use `max-w-prose`)
- **Weights**: Use extremes (300/400/700/900) not middle (500)
- **Alignment**: Left-align body text always
- **Letter spacing**: Tighter for large, wider for small
- **Font stack**: System fonts or Inter for UI

### Text on Photos

Never place text directly on busy photos. Use:
- Linear gradient overlay (90% to 0% opacity)
- Semi-transparent solid overlay (50% opacity)
- Solid background behind text

---

## Button System

### Three-Weight Hierarchy

#### Primary Button
```tsx
// One per screen maximum
<Button className="bg-primary text-white hover:bg-primary-hover">
  Apply for financing
</Button>
```
- Solid fill with primary color
- White text
- Used for the most important action on screen
- **ONE per screen maximum**

#### Secondary Button
```tsx
<Button variant="outline" className="border-primary text-primary">
  View sample deals
</Button>
```
- Border only, no fill
- Primary color for text and border
- For alternative or equal-importance actions
- Never use grey fill (looks disabled)

#### Tertiary Button
```tsx
<Button variant="link" className="text-primary underline">
  Learn more
</Button>
```
- Text only with underline
- Primary color
- Least prominent
- Good for: destructive actions, navigation, cancel

### Button Requirements

| Requirement | Value |
|-------------|-------|
| Min touch target | 48px x 48px |
| Min spacing between buttons | 16px |
| Shape contrast vs background | 3:1 |
| Text contrast | 4.5:1 |

### Button Placement

**Desktop:**
- Left-align buttons
- Order: Primary → Secondary → Tertiary (left to right)
- Primary button closest to form content

**Mobile:**
- Stack vertically: Primary on top
- Full-width buttons for one-handed use

### Button Labels

**Format**: Verb + Noun
```
Good: "Apply for financing", "Submit application", "Create account"
Bad:  "Submit", "OK", "Click here", "Yes"
```

Labels must make sense out of context (screen readers).

### Destructive Actions

Scale friction to severity:

| Severity | Treatment |
|----------|-----------|
| Initial | Tertiary button, NOT red (too prominent) |
| Light (minor data loss) | Simple confirmation dialog |
| Medium (moderate loss) | Red button + warning icon + consequence text |
| Heavy (major loss) | Checkbox confirmation required |

**Best practice**: Allow undo instead of friction when possible.

---

## Form Design

### Layout Rules

1. **Single column layout** - Always (reduces errors, maintains momentum)
2. **Labels on TOP of fields** - Never left-aligned
3. **Stack radio/checkboxes vertically**
4. **Match field width to expected input**
5. **Label gap to field**: 8px max

### Required/Optional Marking

```tsx
// Mark both for clarity
<Label>Email <span className="text-error">*</span></Label>
<Label>Nickname <span className="text-dark">(optional)</span></Label>

// Include instruction at form top
<p className="text-sm text-dark">Required fields are marked with *</p>
```

### Field Width Guide

| Field Type | Width |
|------------|-------|
| Name, Email, Address | Full width |
| Phone | Medium (200px) |
| Postcode/ZIP | 120px |
| CVV | 80px |
| Card Expiry | 100px |
| Amount (currency) | 200px |

### Input Selection

| Scenario | Input Type |
|----------|------------|
| ≤5 options | Radio buttons |
| 6-10 options | Radio or dropdown |
| >10 known options | Autocomplete search |
| Yes/No with submit | Checkbox |
| Yes/No immediate | Toggle switch |
| Small number (±5) | Stepper (+/-) |
| Large number | Number input |
| Date | Date picker |

### Hint Text Placement

**Always ABOVE the field:**
```tsx
<div className="space-y-1">
  <Label>Annual revenue</Label>
  <p className="text-sm text-dark">Enter your company's total revenue for the last 12 months</p>
  <Input type="text" />
</div>
```

Never place hints below fields (covered by autofill, breaks momentum).

### Error States

```tsx
// Error summary at form top
<Alert variant="destructive">
  <AlertCircle className="h-4 w-4" />
  <AlertDescription>
    <ul className="list-disc pl-4">
      <li>Enter a valid email address</li>
      <li>Amount must be between $500K and $10M</li>
    </ul>
  </AlertDescription>
</Alert>

// Individual field error (ABOVE field)
<div className="space-y-1">
  <Label>Email</Label>
  <p className="text-sm text-error flex items-center gap-1">
    <AlertCircle className="h-4 w-4" />
    Enter a valid email address
  </p>
  <Input className="border-error" />
</div>
```

**Rules:**
- Display errors ABOVE fields
- Use color + icon + text (never color alone)
- Be specific: "Enter email address" not "Invalid"
- Focus first error field

### Multi-Step Forms (Application Flow)

1. Show time/requirements before starting
2. 5-7 fields max per step
3. Group related questions
4. Show progress indicator
5. Order: easiest → hardest
6. Allow back navigation without data loss
7. Show summary before final submit
8. Confirm completion with next steps

### Critical Form Anti-Patterns

- Never use placeholder as label
- Never place hints below fields
- Never use disabled buttons (no feedback)
- Never validate inline while typing
- Never have field borders below 3:1 contrast

---

## Layout System

### 12-Column Grid

| Breakpoint | Columns | Gutter | Margin |
|------------|---------|--------|--------|
| Mobile (<640px) | 4 | 16px | 16px |
| Tablet (640-1024px) | 8 | 24px | 32px |
| Desktop (>1024px) | 12 | 32px | 80px |

### Border Radius (Varied, Not Uniform)

```css
/* WRONG: Everything 8px */
* { border-radius: 8px; }

/* CORRECT: Varied for visual interest */
:root {
  --radius-sm: 4px;     /* Buttons, inputs */
  --radius-md: 8px;     /* Cards */
  --radius-lg: 16px;    /* Large containers */
  --radius-xl: 24px;    /* Hero sections, modals */
  --radius-full: 9999px; /* Pills, avatars */
}

.button { border-radius: var(--radius-sm); }
.card   { border-radius: var(--radius-md); }
.modal  { border-radius: var(--radius-lg); }
.avatar { border-radius: var(--radius-full); }
```

### Grouping Methods (Strongest to Weakest)

1. **Containers**: Borders, shadows, backgrounds
2. **Proximity**: Related = close; unrelated = far
3. **Similarity**: Same look = same function
4. **Continuity**: Aligned in a line = related

### Visual Hierarchy Tools

| Tool | Effect |
|------|--------|
| Size | Larger = more important |
| Color | Saturated, high contrast = important |
| Spacing | More whitespace = emphasis |
| Position | Top/left = read first |
| Depth | Shadows elevate |

**Test**: Use the Squint Test - blur your design, hierarchy should remain clear.

---

## Animation System

### Custom Easing Functions (Required)

```css
:root {
  /* NEVER use these */
  --ease-wrong: linear;
  --ease-wrong-2: ease;

  /* ALWAYS use custom cubic-bezier */
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-out-quart: cubic-bezier(0.25, 1, 0.5, 1);
  --ease-spring: cubic-bezier(0.68, -0.55, 0.265, 1.55);
}
```

### Duration System

```css
:root {
  --duration-instant: 100ms;  /* Micro-interactions */
  --duration-fast: 200ms;     /* Buttons, hovers */
  --duration-base: 300ms;     /* Modals, dropdowns */
  --duration-slow: 400ms;     /* Page transitions */
}

button {
  transition: all var(--duration-fast) var(--ease-out-expo);
}

.modal {
  transition: opacity var(--duration-base) var(--ease-out-quart);
}
```

### Staggered Animations

```css
/* WRONG: All animate simultaneously */
.item { animation: fadeIn 0.3s; }

/* CORRECT: Staggered delays for interest */
.item:nth-child(1) { animation-delay: 0.1s; }
.item:nth-child(2) { animation-delay: 0.2s; }
.item:nth-child(3) { animation-delay: 0.3s; }

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### Performant Properties

```css
/* NEVER animate (causes reflow) */
.slow {
  transition: width 0.3s, height 0.3s, top 0.3s, left 0.3s;
}

/* ONLY animate transform and opacity */
.fast {
  transition: transform 0.3s var(--ease-out-expo),
              opacity 0.3s var(--ease-out-expo);
  will-change: transform, opacity;
}

.fast:hover {
  transform: scale(1.02) translateY(-2px);
}
```

### Reduced Motion Support (Required)

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Focus States (Required)

```css
/* All interactive elements need visible focus */
button:focus-visible,
a:focus-visible,
input:focus-visible {
  outline: 3px solid var(--primary);
  outline-offset: 2px;
}

/* High contrast mode */
@media (prefers-contrast: high) {
  button:focus-visible {
    outline: 4px solid;
  }
}
```

---

## Components (shadcn/ui Patterns)

### Cards

```tsx
<Card className="p-6 space-y-4">
  <CardHeader className="p-0">
    <CardTitle className="text-xl font-semibold text-darkest">
      Deal title
    </CardTitle>
    <CardDescription className="text-dark">
      Brief description
    </CardDescription>
  </CardHeader>
  <CardContent className="p-0 space-y-2">
    {/* Content */}
  </CardContent>
  <CardFooter className="p-0 pt-4 flex gap-4">
    <Button>Primary action</Button>
    <Button variant="outline">Secondary</Button>
  </CardFooter>
</Card>
```

### Data Tables

- Align numbers right
- Align text left
- Use monospace for numbers (`font-mono`)
- Zebra striping optional (if more than 5 rows)
- Highlight interactive rows on hover

### Status Badges

```tsx
// Application statuses
const statusStyles = {
  draft: "bg-light text-dark",
  submitted: "bg-blue-100 text-blue-800",
  under_review: "bg-amber-100 text-amber-800",
  term_sheet: "bg-purple-100 text-purple-800",
  in_funding: "bg-primary/10 text-primary",
  funded: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
}
```

### Empty States

```tsx
<div className="text-center py-12 space-y-4">
  <FileText className="mx-auto h-12 w-12 text-medium" />
  <div className="space-y-2">
    <h3 className="text-lg font-semibold text-darkest">No applications yet</h3>
    <p className="text-dark max-w-sm mx-auto">
      Start your first application to begin the funding process.
    </p>
  </div>
  <Button>Start application</Button>
</div>
```

---

## Accessibility Checklist

### Color
- [ ] Text contrast ≥4.5:1 (≥3:1 for large text)
- [ ] UI components ≥3:1
- [ ] Don't rely on color alone (add icons, underlines)
- [ ] Avoid pure black (#000) on white—use `darkest`

### Typography
- [ ] Body text ≥18px
- [ ] Line height ≥1.5 for body text
- [ ] Line length 45-75 characters
- [ ] Left-align body text

### Interactive Elements
- [ ] Touch targets ≥48px × 48px
- [ ] Buttons have clear visual hierarchy
- [ ] Links are underlined OR in navigation context
- [ ] Form fields have visible labels
- [ ] Focus states are visible

### Content
- [ ] Important content visible (not hidden in menus)
- [ ] Headings are descriptive
- [ ] Error messages explain how to fix
- [ ] Forms have clear instructions

---

## UX Copy & Conversion Guidelines

Based on Rob Hope's Landing Page Hot Tips - 101 evidence-based conversion optimization principles.

### Core Philosophy

Before writing ANY copy, answer these three questions:
1. **Who** is the target user? (Borrower seeking growth capital? Investor seeking yield?)
2. **What** is their problem? (Can't get bank financing? Can't access quality deal flow?)
3. **How** does PrimeBridge solve it? (Fast, transparent process; pre-vetted, analyzed deals)

### Empathy-First Copy

**Start with their pain, THEN present your solution.**

```
Bad:  "PrimeBridge Finance is an innovative private credit marketplace
       using cutting-edge technology to connect borrowers and investors..."

Good: "Wasting time with banks that won't fund your growth?
       PrimeBridge connects you with investors who understand your business."
```

### PrimeBridge Voice

- **Professional but approachable**: Finance expertise without jargon
- **Direct**: Get to the point, respect user's time
- **Confident**: Definitive statements, not hedging
- **Positive**: Position as solution, not competitor critique
- **Supportive**: Guide users through complex processes

```
Negative (avoid): "Unlike those slow banks that waste your time..."
Positive (use):   "Get answers in days, not months"
```

### Benefits Over Features

```
Feature:  "AI-powered underwriting algorithm"
Benefit:  "Get a decision in 48 hours, not 6 weeks"

Feature:  "Standardized credit memo format"
Benefit:  "Every deal comes with consistent, comparable analysis"

Feature:  "Secure document portal"
Benefit:  "Your sensitive financials stay private and protected"
```

### CTA Button Copy

**Format**: Actionable verb + specific outcome

```
Bland (avoid):
- "Submit"
- "Sign Up"
- "Click Here"
- "Learn More"
- "Get Started"

Actionable (use):
- "Apply for financing"
- "Request investor access"
- "View deal details"
- "Start my application"
- "See if you qualify"
- "Download credit memo"
```

### Headline Patterns

**Hero headlines should empathize with the problem:**

For Borrowers:
```
"Institutional-grade private credit for real businesses"
"Growth capital without the bank runaround"
"Financing that moves at the speed of your business"
```

For Investors:
```
"Private credit deals with real underwriting"
"Access deal flow the big funds ignore"
"Yield with transparency, not black boxes"
```

### Value Proposition Framework

**State the benefit, quantify when possible:**

```
Weak:   "Fast process"
Strong: "Get a term sheet in 5 business days"

Weak:   "Good yields"
Strong: "Target 10-14% returns on secured credit"

Weak:   "We help businesses"
Strong: "Funding $500K-$10M for growing companies"
```

### Social Proof Copy

**Curate testimonials that highlight features AND answer doubts:**

```
Weak:   "Great platform, highly recommend!" - Anonymous

Strong: "We closed our $2M facility in 3 weeks. The process was
        transparent and the team actually understood our business."
        - Sarah Chen, CFO at TechCorp (matches target demographic)
```

**Strategic placement:**
- After explaining a feature → proves it works
- Before pricing → justifies the cost
- Near CTA → final conversion push
- Addressing specific objection → overcomes doubt

### Establishing Trust Copy

**Show you're established (when applicable):**

```
"Trusted by X businesses"
"$XM in deals funded"
"Y years connecting businesses with capital"
"Investors in Z states"
```

### Pricing Copy

**Never use "cheap" - use:**
- More affordable
- Cost-effective
- Better value
- Competitive rates

**For pricing pages:**
- Highlight recommended option with "Most Popular" badge
- Tier UP with more features, not down by stripping
- Show what's included, not what's excluded

### Error Messages

**Always include how to fix + support contact:**

```
Bad:  "Error"
Bad:  "Invalid input"
Bad:  "Something went wrong"

Good: "Enter an amount between $500,000 and $10,000,000"
Good: "Please enter a valid email address (e.g., name@company.com)"
Good: "Something went wrong. Please try again or contact support@primebridge.com"
```

### Empty States

**Explain what's missing AND how to proceed:**

```
Bad:  "No data"
Bad:  "Nothing here"

Good: "No applications yet. Start your first application to begin the funding process."
Good: "No deals available. New opportunities are added weekly - check back soon or adjust your criteria."
```

### Success Messages

**Personalize and set expectations:**

```
Generic: "Thank you for your submission."

Personal: "Thanks, [Name]! We've received your application and will
          review it within 2 business days. Check your email for
          confirmation and next steps."
```

### Copy Hierarchy Rules

1. **Deconstruct verbose paragraphs** to core message
2. **Front-load** key information
3. **Use numerals** for numbers ("$500K" not "five hundred thousand")
4. **Keep capitalization consistent** throughout
5. **Avoid center-aligned paragraphs** - left-align body text always
6. **Max 75 characters per line** for readability

### Word Choice

**Consistent vocabulary - pick one and stick with it:**
- Application (not "request", "submission", "form")
- Deal (not "opportunity", "investment", "loan")
- Investor (not "lender", "funder", "capital provider")

**Avoid jargon visitors might not know:**
```
Instead of:          Use:
"Term sheet"         "Preliminary offer" (or define on first use)
"Due diligence"      "Review process"
"Facility"           "Credit line" or "loan"
```

---

## Landing Page Design Principles

### Single Objective Per Page

One landing page = one goal. Don't dilute focus.

```
Wrong: Homepage trying to: sell borrowers + attract investors + collect newsletter signups
Right: Separate pages for borrower acquisition, investor acquisition, general awareness
```

### Hero Section Requirements

1. **Empathize** with the problem (their pain)
2. **State the solution** clearly (your value)
3. **Single primary CTA** (the one action you want)
4. **Social proof** nearby (trust signal)

```tsx
// Hero structure
<section className="py-20">
  <h1>Empathetic headline addressing their problem</h1>
  <p>Clear explanation of how you solve it</p>
  <Button>Primary action CTA</Button>
  <p className="text-sm">Trust signal: "Trusted by X companies"</p>
</section>
```

### Navigation Rules

**Remove main navigation on conversion-focused landing pages.**

If navigation is needed on long pages:
- Sticky header with section links only
- CTA button always visible
- Minimal: just sections + primary CTA

### Visual Hierarchy

Not everything is equally important. Show it.

**Hierarchy tools:**
| Tool | Effect |
|------|--------|
| Size | Bigger = more important |
| Color | Saturated/high contrast = attention |
| Position | Top/left = read first |
| Whitespace | More isolation = more emphasis |

**Test with Squint Test**: Blur your screen - hierarchy should remain clear.

### When in Doubt, Double the Padding

Whitespace is breathing room for content AND users.

If a section feels overwhelming or crowded, double the padding. You'll be surprised how much better it looks.

### Image Guidelines

**Fewer images, better images.** Quality builds trust.

- Invest in professional photography for team, product, service
- Hero images should have negative space for text overlay
- Wrap products/screenshots in device mockups
- Export at 2x resolution for retina displays

**For product screenshots:**
- Add subtle radial gradient behind product imagery
- Use device mockups (phone frame, laptop, browser window)
- Show the product in action, not static screens

### Section Design

**Alternate background colors** for visual separation:
```tsx
<section className="bg-white py-12">...</section>
<section className="bg-lightest py-12">...</section>
<section className="bg-white py-12">...</section>
```

### Footer as Conversion Tool

Visitor hasn't converted by footer = they still have doubts.

**Footer should include:**
- FAQs addressing pre-sale concerns (ordered by frequency)
- Support email/contact
- Final CTA
- Trust signals (payment logos, security badges)

### Testimonial Placement Strategy

Don't dump all testimonials in one section.

| Location | Purpose |
|----------|---------|
| After feature explanation | Proves it works |
| Before pricing | Justifies the cost |
| Near CTA | Final conversion push |
| Addressing objection | Overcomes specific doubt |

**Demographics must match target audience:**
- Enterprise software? Feature enterprise customers with titles
- Small business tool? Feature small business owners

### Reducing Conversion Friction

**Every step between visitor and conversion is a leak.**

Audit your flows:
- Can they try without signing up?
- How many fields in the form? (Only essential)
- Is credit card required upfront? (Avoid if possible)
- Does form embed on page or load new page? (Embed is better)

### Creating Urgency (Ethically)

**Genuine scarcity drives action:**

```
"Early bird pricing ends Friday"
"Only accepting 10 new borrowers this quarter"
"Limited investor spots available"
```

**Must be genuine** - false scarcity destroys trust permanently.

### Risk Reduction Copy

Address commitment fears directly near CTA:

```
"No commitment required"
"Free to apply - only pay when funded"
"Cancel anytime"
"Your data stays private"
```

### Mobile-First Content

On mobile, visitors see what loads first.

**Rules:**
- Copy before decorative images
- Value proposition above the fold
- CTAs reachable with thumb
- Forms simplified for mobile input

### Animation Guidelines

**Subtle animations are timeless. Gratuitous scroll transitions are not.**

Acceptable:
- Subtle hover states
- Loading transitions
- Micro-interactions on buttons
- Scroll-triggered fade-ins (subtle)

Avoid:
- Parallax overkill
- Custom cursors
- Aggressive scroll hijacking
- Flashing or auto-playing video with sound

### Speed Requirements

Speed directly impacts conversions and SEO.

**Non-negotiables:**
- Optimize all images (WebP, proper compression)
- Minimize JavaScript
- Use CDN
- Lazy load below-fold content
- Target <3 second load time

### Accessibility as Conversion Tool

Accessibility = more customers + legal compliance.

**Minimum requirements (WCAG 2.1 AA):**
- Sufficient color contrast (covered in Color System)
- Alt text on images
- Keyboard navigation
- Screen reader compatibility
- Focus states on interactive elements
- No flashing content

---

## Anti-Patterns to Avoid

### AI Design Failures (NEVER Generate)

| Pattern | Why It Fails |
|---------|--------------|
| Pure black `#000000` | Causes halation, screams amateur |
| Pure white `#FFFFFF` on dark | Too harsh, causes eye strain |
| AI Purple `#5E6AD2` | Instantly recognizable as AI-generated |
| Indigo-violet gradients | Statistical homogenization signal |
| 80-100% saturation neon | Looks like a template |
| Uniform `line-height: 1.5` | Lacks typographic sophistication |
| All `border-radius: 8px` | Generic, no visual interest |
| `linear` or `ease` timing | Mechanical, not natural |
| Animating width/height | Performance killer |
| Div soup | Inaccessible, unprofessional |

### Buttons
- Multiple primary buttons per screen
- Light grey buttons (look disabled)
- Same style for primary/secondary (color-only difference)
- Tertiary without underline (colorblind issue)
- Right-aligned buttons (get missed)
- Vague labels ("OK", "Submit", "Yes")

### Forms
- Placeholder text as labels
- Hints below form fields
- Inline validation while typing
- Disabled submit buttons
- Left-aligned labels
- Multi-column form layouts

### Typography
- Center-aligned long text
- Justified text
- Pure black text on white
- Text directly on busy photos
- Line length >75 characters
- Uniform line-height everywhere
- Middle font weights (500) lacking contrast

### Layout
- Everything centered and symmetric
- Uniform border-radius on all elements
- No visual hierarchy (everything same size/weight)
- Touch targets < 44px

### Animation
- `linear` or default `ease` timing
- All items animating simultaneously
- Animating width, height, top, left (use transform)
- No reduced-motion support

### General
- Icons without labels
- Color-only meaning
- Hidden important content
- Inconsistent vocabulary
- Abbreviations without explanation
- Low contrast UI elements
- Removed focus outlines
- Hardcoded color values (not tokens)

---

## File Organization

```
/app
  /globals.css          # Tailwind base + custom tokens
  /components
    /ui                 # shadcn/ui components
    /forms              # Form-specific components
    /layout             # Layout components
```

### Tailwind Config Tokens

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#264480',
          hover: '#1E3666',
        },
        darkest: '#0F172A',
        dark: '#475569',
        medium: '#82899A',
        light: '#D4D8E0',
        lightest: '#F8FAFC',
        error: '#DC2626',
        warning: '#D97706',
        success: '#059669',
        info: '#2563EB',
      },
      spacing: {
        '18': '4.5rem', // 72px
        '22': '5.5rem', // 88px
      },
      fontSize: {
        'display': ['3.5rem', { lineHeight: '1.1', fontWeight: '700' }],
      },
      maxWidth: {
        'form': '32rem', // 512px - optimal form width
      },
    },
  },
}
```

---

## Quick Reference

### Spacing
- Related elements: 8-16px
- Form fields: 16-24px
- Sections: 48-80px

### Typography
- Body: 18px, line-height 1.5
- Headings: 22-44px, line-height 1.1-1.3
- Max width: 45-75 characters

### Buttons
- Min size: 48x48px
- Spacing: 16px apart
- One primary per screen

### Forms
- Single column always
- Labels above fields
- Errors above fields with icon
- Field borders: 3:1 contrast

### Colors
- Text: 4.5:1 contrast
- Large text: 3:1 contrast
- UI elements: 3:1 contrast

---

## Pre-Delivery Verification Checklist

### Accessibility (10 items)
- [ ] Touch targets ≥44×44px with 8px spacing
- [ ] Focus indicators visible (3px outline, 2px offset)
- [ ] All images have alt text
- [ ] All form inputs have associated labels
- [ ] Semantic HTML (`<header>`, `<nav>`, `<main>`, `<section>`, `<footer>`)
- [ ] Heading hierarchy correct (no skipped levels)
- [ ] Color contrast meets WCAG AA (4.5:1 text, 3:1 UI)
- [ ] Keyboard navigation works
- [ ] Reduced-motion media query implemented
- [ ] No color-only meaning

### Typography (7 items)
- [ ] Line-height contextual (1.1 headings, 1.5 body)
- [ ] Line length 45-75 characters
- [ ] Type scale uses Major Third (1.25)
- [ ] Font weights use extremes (300/700/900, not 500)
- [ ] Letter-spacing adjusted for size
- [ ] Body text ≥18px
- [ ] Left-aligned body text

### Color (6 items)
- [ ] No pure black `#000000`
- [ ] No pure white `#FFFFFF` on dark backgrounds
- [ ] No AI purple `#5E6AD2` or indigo gradients
- [ ] Dark mode uses near-black (#0f-1a)
- [ ] All contrast verified (WCAG AA)
- [ ] Colors defined as CSS variables

### Layout (5 items)
- [ ] 8-point grid system used
- [ ] Border-radius varied (not all same)
- [ ] Visual hierarchy clear (squint test)
- [ ] Touch target spacing ≥8px
- [ ] Mobile-first responsive

### Animation (6 items)
- [ ] Custom cubic-bezier easing (not linear/ease)
- [ ] Duration system defined
- [ ] Staggered animation delays
- [ ] Only transform/opacity animated
- [ ] will-change on animated elements
- [ ] prefers-reduced-motion support

### UX Copy (7 items)
- [ ] Empathy-first headlines
- [ ] Benefits over features
- [ ] CTA buttons are Verb + Noun
- [ ] Error messages explain fix
- [ ] Consistent vocabulary
- [ ] Single objective per page
- [ ] Testimonials strategically placed

### Code Quality (5 items)
- [ ] Reusable components (no duplicated code)
- [ ] Design tokens centralized (CSS variables)
- [ ] No inline styles
- [ ] Semantic HTML (no div soup)
- [ ] No hardcoded values

**Total: 46 verification points**

### Success Criteria

✅ **You succeeded when:**
- Design feels professionally crafted, not template-generated
- Users complete actions without confusion
- Accessibility audit passes 100%
- "Would a designer recognize this as AI-generated?" = NO

❌ **You failed when:**
- User asks "which button do I click?"
- Design looks like every other SaaS landing page
- AI purple gradients appear
- Touch targets too small
- Everything is uniform (same radius, same line-height)
