# Color System Reference

## HSB Color Model
- **Hue (H)**: 0-360° representing colors of the rainbow
- **Saturation (S)**: 0-100% intensity/richness
- **Brightness (B)**: 0-100% lightness (0 = black)

## Light Mode Palette Creation

Starting from brand color hue (H):

| Variation | HSB Values | Usage | Contrast Req |
|-----------|------------|-------|--------------|
| Primary | H, 70, 80 | Actions, buttons, links | 4.5:1 vs lightest |
| Darkest | H, 60, 20 | Headings, primary text | 4.5:1 vs lightest |
| Dark | H, 30, 45 | Secondary text | 4.5:1 vs lightest |
| Medium | H, 20, 66 | Non-decorative borders | 3:1 vs lightest |
| Light | H, 10, 95 | Decorative borders | None |
| Lightest | H, 2, 98 | Alt backgrounds | Must support above |
| White | 0, 0, 100 | Main background | Must support above |

## Dark Mode Palette Creation

Invert the brightness logic:

| Variation | HSB Values | Usage | Contrast Req |
|-----------|------------|-------|--------------|
| Primary | H, 50, 90 | Actions, buttons, links | 4.5:1 vs dark |
| White | 0, 0, 100 | Headings | 4.5:1 vs dark |
| Lightest | H, 4, 80 | Secondary text | 4.5:1 vs dark |
| Light | H, 6, 65 | Non-decorative borders | 3:1 vs dark |
| Medium | H, 8, 33 | Decorative borders | None |
| Dark | H, 10, 23 | Alt backgrounds | Must support above |
| Darkest | H, 12, 15 | Main background | Must support above |

## System Colors (Status)

| Status | Color | Usage |
|--------|-------|-------|
| Error | Red | Errors, destructive actions, urgent alerts |
| Warning | Amber/Yellow | Caution, risky actions |
| Success | Green | Positive confirmations, completed actions |
| Info | Blue | Informational, interactive |

Always pair system colors with icons for colorblind accessibility.

## APCA vs WCAG 2.1

APCA (newer, WCAG 3 draft) provides better perceptual accuracy:
- 90: Preferred body text (14px+)
- 75: Minimum body text (18px+)
- 60: Minimum other text (24px or 16px bold+)
- 45: Large text and UI elements
- 30: Placeholder text, disabled states
- 15: Non-text elements

For commercial projects requiring compliance, use WCAG 2.1 until WCAG 3 releases.

## Brand Color Edge Cases

**Light brand color (e.g., yellow)**:
- Use darkest variation for button text instead of white
- Add border to buttons (3:1 contrast)
- Consider using in dark interface

**Dark brand color**:
- Use white for button text
- Add light border to buttons (3:1 contrast)
- May need to lighten slightly for accessibility

**Color with strong meaning (red/green/amber)**:
- Consider using darkest variation instead for actions
- Or use blue for interactive elements to avoid confusion
