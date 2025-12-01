# Button Design Patterns Reference

## Three-Weight System

### Primary Button
- Solid fill with primary/action color
- White text (or darkest if light brand color)
- Most prominent - use for most important action
- **ONE per screen maximum**

### Secondary Button
- Unfilled with border
- Primary/action color for text and border
- For alternative actions or equal-importance multiple actions
- Avoid grey fill (looks disabled)

### Tertiary Button
- Text only with underline
- Primary/action color
- Least prominent
- Good for destructive actions, navigation, multiple actions

## Accessibility Requirements

| Element | Minimum Contrast |
|---------|------------------|
| Button shape vs background | 3:1 |
| Button text | 4.5:1 |
| Between similar buttons | 3:1 |

**Target size**: 48pt × 48pt minimum
**Spacing between buttons**: 8pt minimum (16pt recommended)

## Button Placement

### Desktop
- Left-align buttons
- Order: Primary → Secondary → Tertiary (left to right)
- Primary button closest to form content

### Mobile
- Stack vertically: Primary on top
- Full-width buttons for one-handed use
- Primary button closest to form content

### Multi-Step Forms
- Primary "Next" left-aligned at form bottom
- "Back" as tertiary at top-left (like breadcrumbs)
- Reduces accidental back-clicks

### Exceptions
- Single-field forms: button right of field
- Small dialogs: either alignment acceptable

## Button Labels

**Format**: Verb + Noun
- "Save post"
- "Delete message"
- "Create account"
- "Send invite"

**Avoid**:
- "OK", "Yes", "No"
- "Submit"
- "Click here"

Labels must make sense out of context (screen readers).

## Disabled Buttons - Alternatives

### Problems
- No feedback on why unavailable
- Low contrast (inaccessible)
- Not keyboard accessible

### Better Approaches

1. **Enable + validate on submit**
   - Show errors when pressed
   - User gets immediate feedback

2. **Remove unavailable actions**
   - Explain why: "Request to follow to see contact options"

3. **Lock icon on normal button**
   - Indicates unavailable but discoverable
   - Good for premium features

4. **If must use disabled**:
   - Add visible explanation nearby
   - Make keyboard accessible
   - Show tooltip on focus

## Destructive Action Friction

**Initial** (before action):
- Make less prominent (tertiary)
- Don't color red (too prominent)
- Progressively disclose

**Light** (small data loss):
- Simple confirmation dialog
- "Delete message?" → [Delete message] [Cancel]

**Medium** (moderate loss):
- Red button in confirmation
- Warning icon
- Clear consequence: "You won't be able to recover this"

**Heavy** (major loss):
- Require checkbox selection
- [ ] I confirm I want to delete my account
- Explain all consequences

**Best**: Allow undo instead of friction
- "Message deleted" with [Restore] option

## Icon + Text Pairing

### Balance Visual Weight
- Match icon weight to text weight
- Match icon size to text size
- If icons are heavier, reduce their contrast

### Icon Position
- Leading icon (left of text): Actions, navigation
- Trailing icon (right of text): External links, dropdowns

## Common Mistakes

1. Multiple primary buttons competing
2. Secondary that looks disabled (grey)
3. Same style for primary/secondary (color-only difference)
4. Tertiary without underline (colorblind can't identify)
5. Inconsistent button shapes
6. Right-aligned buttons (get missed on large screens)
7. Vague labels ("OK", "Submit")
8. Small touch targets (<48pt)
9. No spacing between buttons
