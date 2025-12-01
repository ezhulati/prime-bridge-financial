# Form Design Patterns Reference

## Single Column Layout Rationale
- Maintains consistent downward momentum
- Reduces missed fields (critical for screen magnifier users)
- Decreases cognitive load
- Works on all screen sizes

## Label Positioning

### On Top (Recommended)
- Label and field visible in single focus
- Consistent left edge for scanning
- Works on mobile without layout changes

### Left (Avoid)
- Creates zig-zag reading pattern
- Inconsistent gap between label and field
- Long labels wrap awkwardly
- Right-aligned labels create jagged left edge

## Field Width Guidance

| Field Type | Width |
|------------|-------|
| Name | Full width |
| Email | Full width |
| Postcode | 4-6 characters |
| Phone | Medium (varies by country) |
| CVV | 3-4 characters |
| Expiry | 5 characters (MM/YY) |
| Card Number | Full width |

## Required/Optional Marking

**Mark Both** (safest):
```
Email * OR Email (required)
Nickname (optional)
```

**Include instruction**: "Required fields are marked with an asterisk *"

**Skip marking when**:
- No optional fields exist
- Very short familiar forms (login, single-field subscribe)
- Single question per screen with clear explanation

## Input Type Selection Guide

| Scenario | Recommended Input |
|----------|-------------------|
| ≤5 options | Radio buttons |
| 6-10 options | Radio buttons or dropdown |
| >10 known options | Autocomplete search |
| >10 browseable options | Split into multiple dropdowns |
| Yes/No with submit | Checkbox |
| Yes/No immediate | Toggle switch |
| Small number (±5) | Stepper (+/-) |
| Large number | Number input |
| Date selection | Date picker |
| Time selection | Time picker or dropdown |

## Stepper Design Rules
- Buttons horizontal (not vertical)
- +/- symbols (not arrows)
- Min 48pt × 48pt touch targets
- Sufficient spacing between buttons
- Allow direct number entry

## Hint/Helper Text Placement

**Above field** (recommended):
- Visible before user fills field
- Not covered by autofill/keyboard
- Natural reading flow

**Below field** (avoid):
- Can be covered by autofill menus
- User may enter wrong value first
- Breaks downward momentum

## Error State Design

**Summary at top**:
```
There are some errors
- Enter street address
- Enter suburb, town or city
```

**Individual field errors**:
- Position ABOVE the field
- Red text + error icon
- Specific message: "Enter email address" not "Invalid"
- Focus first error field

**Never rely on color alone** - always include icon.

## Multi-Step Form Rules

1. Tell users time/requirements before starting
2. 5-7 fields max per step
3. Group related questions
4. Show progress indicator
5. Order questions easiest→hardest
6. Allow back navigation without data loss
7. Show summary before final submit
8. Confirm completion with next steps

## Checkbox Phrasing

**Positive (correct)**:
- "Send me updates"
- "Allow automatic updates"
- "Remember my preferences"

**Negative (avoid)**:
- "Don't send me updates"
- "Disable automatic updates"

Test: Replace checkbox with "Yes" - should make sense.

## Progressive Disclosure in Forms

Instead of optional field:
```
Mobile number (optional)
```

Use opt-in:
```
[ ] Receive updates via text message
    └─ Mobile number *  (appears on check)
```

Benefits:
- Simpler form for those who don't need feature
- Clear why information is needed
- Required field when shown (no ambiguity)
