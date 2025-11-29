---
name: practical-ui
description: Evidence-based UI design system from Practical UI by Adham Dannaway. Use when designing interfaces, reviewing UI, creating mockups, building components, or applying design principles. Covers visual hierarchy, spacing systems, color palettes, typography scales, form design, button patterns, accessibility (WCAG 2.1 AA), and reducing cognitive load. Triggers on UI design, interface design, component design, design system, accessibility, WCAG, visual hierarchy, spacing, typography, color palette, forms, buttons, or layout questions.
---

# Practical UI Design System

Evidence-based guidelines for intuitive, accessible, and beautiful interfaces.

## Core Principles

### Minimize Usability Risks
- Meet WCAG 2.1 level AA minimum
- Consider vision impairments, motor disabilities, cognitive load
- Common risks: low contrast text, icons without labels, colored text mistaken for links

### Minimize Interaction Cost
- **Fitts's Law**: Closer + larger targets = faster clicks. Keep related actions close. Min 48pt touch target.
- **Hick's Law**: More choices = slower decisions. Reduce options, highlight recommended items.
- Remove distractions (animations, pop-ups, unnecessary elements)

### Minimize Cognitive Load
- Remove unnecessary styles and information
- Break up info into smaller groups
- Use familiar patterns (Jakob's Law)
- Create clear visual hierarchy
- Be consistent

## Design System Components

### Spacing System (8pt Grid)
```
XS: 8pt   (closely related)
S:  16pt  (related)
M:  24pt  (somewhat related)
L:  32pt  (column gaps)
XL: 48pt  (section spacing)
XXL: 80pt (major sections)
```
Apply smaller spacing inside rectangles, larger as you move outward.

### Typography Scale (1.25 Major Third)
```
Heading 1: 44px bold
Heading 2: 36px bold
Heading 3: 28px bold
Heading 4: 22px bold
Body:      18px regular (min for long text)
Small:     15px regular
```
- Line height: ≥1.5 for body, 1.1-1.3 for headings (decrease as size increases)
- Line length: 45-75 characters
- Use regular + bold weights only
- Decrease letter spacing for large headings

### Text on Photos
- Never place text directly on busy photos
- Options for legibility:
  - Linear gradient overlay (90% → 0% opacity)
  - Semi-transparent solid overlay (50% opacity)
  - Blurred background + overlay
  - Solid background behind text

### Monochromatic Color Palette (HSB System)

**Light Interface:**
```
Primary:  HSB(H, 70, 80)  - Actions, buttons, links
Darkest:  HSB(H, 60, 20)  - Headings
Dark:     HSB(H, 30, 45)  - Secondary text
Medium:   HSB(H, 20, 66)  - Borders (3:1 contrast)
Light:    HSB(H, 10, 95)  - Decorative borders
Lightest: HSB(H, 2, 98)   - Alt backgrounds
```

**Contrast Requirements:**
- Small text: 4.5:1 minimum
- Large text (18px bold+ or 24px+): 3:1 minimum
- UI components: 3:1 minimum

### Button System
```
Primary:   Solid fill + white text (one per screen)
Secondary: Border + no fill + action color text
Tertiary:  Underlined text (like a link)
```
- Min 48pt × 48pt target
- 16pt spacing between buttons
- Left-align buttons (primary first)
- Verb + Noun labels ("Save post", "Delete message")

## Layout Patterns

### Grouping (4 Methods)
1. **Containers**: Borders, shadows, backgrounds (strongest)
2. **Proximity**: Related = close; unrelated = far
3. **Similarity**: Same look = same function
4. **Continuity**: Aligned in a line = related

### Visual Hierarchy
Use variations in:
- Size (larger = more important)
- Color (saturated, high contrast = important)
- Spacing (more whitespace = emphasis)
- Position (top/left = read first)
- Depth (shadows elevate)

Test with **Squint Test**: Blur design—hierarchy should remain clear.

### 12-Column Grid
- Flexible columns, fixed gutters (32pt desktop, 16pt mobile)
- Margins: 80pt desktop, 16pt mobile

## Form Design

### Layout Rules
- Single column layout (reduces errors, maintains momentum)
- Labels on TOP of fields (never left)
- Stack radio buttons/checkboxes vertically
- Match field width to expected input

### Field Marking
- Mark required with asterisk * OR "(required)"
- Mark optional with "(optional)"
- Include instruction: "Required fields are marked with an asterisk *"

### Input Selection
- ≤10 options: Radio buttons
- >10 options: Dropdown or autocomplete
- Small number adjustments: Steppers (+/- buttons)
- Binary on/off: Checkbox (needs submit) or Toggle (immediate effect)

### Validation
- Validate on submit (not inline)
- Display errors ABOVE fields
- Use color + icon + text for errors (not color alone)

### Critical Rules
- Never use placeholder as label
- Hints above fields, not below
- Field borders: ≥3:1 contrast
- Labels close to fields (<8pt gap)

## Copywriting

- **Be concise**: Remove "actually", "basically", "would you like to"
- **Sentence case**: Only capitalize first word + proper nouns
- **Front-load**: Key info at start of sentences
- **Use numerals**: "5 items" not "Five items"
- **Descriptive links**: "View pricing" not "Click here"
- **Consistent vocabulary**: Don't alternate "cart"/"bag"

## Accessibility Checklist

### Color
- [ ] Text contrast ≥4.5:1 (≥3:1 for large text)
- [ ] UI components ≥3:1
- [ ] Don't rely on color alone (add icons, underlines)
- [ ] Avoid pure black (#000) on white—use dark gray

### Typography
- [ ] Body text ≥18px
- [ ] Line height ≥1.5 for body text
- [ ] Line length 45-75 characters
- [ ] Left-align body text

### Interactive Elements
- [ ] Touch targets ≥48pt × 48pt
- [ ] Buttons have clear visual hierarchy
- [ ] Links are underlined OR in navigation context
- [ ] Form fields have visible labels

### Content
- [ ] Important content visible (not hidden in menus)
- [ ] Headings are descriptive
- [ ] Error messages explain how to fix

## Photography: Rule of Thirds
- Divide image into 3×3 grid
- Place focal points at intersections (not center)
- Align horizons with grid lines
- Creates natural motion and balance

## Typography Selection

### Typeface Classification
- **Sans serif**: Neutral, modern, legible at all sizes (safest default)
- **Serif**: Traditional, classic, formal
- **Script**: Personal, handmade (large sizes only)
- **Display**: Decorative (large sizes only)
- **Monospace**: Code, numbers for comparison

### Typeface Guidelines
- Use single sans serif for most interfaces
- Add second typeface for headings only (for personality)
- Choose popular, well-tested typefaces
- Look for multiple weights and tall x-height
- Use default system fonts when in doubt

## Destructive Action Friction

Scale friction to severity of data loss:

**Initial (prevention)**
- Use tertiary buttons (low prominence)
- Move action further away
- Don't color red (too prominent)

**Light friction** (minor data loss)
- Simple confirmation dialog

**Medium friction** (moderate data loss)
- Red button + warning icon
- Clear explanation of consequences

**Heavy friction** (major data loss)
- Confirmation checkbox required
- Explicit warning about permanent loss

**Best practice**: Allow undo instead of friction when possible.

## Anti-Patterns to Avoid

- Multiple primary buttons per screen
- Light grey buttons (look disabled)
- Icons without labels
- Placeholder text as labels
- Hints below form fields
- Center-aligned long text
- Justified text
- Pure black text on white
- Right-aligned buttons (get missed)
- Inline validation (distracting)
- Disabled buttons (no feedback)
- Color-only meaning
- Hidden important content
- "Click here" or "Learn more" links
- Inconsistent vocabulary (cart vs bag)
- Abbreviations without explanation
