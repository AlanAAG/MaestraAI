# MaestraAI Design System

> This file is the single source of truth for all visual decisions in MaestraAI.
> Claude Code: read this before writing any CSS, component, or layout code.
> Stack: Next.js 14, Tailwind CSS, Supabase

---

## Brand identity

MaestraAI is a lesson-planning copilot for preschool English teachers in Mexico. The brand persona is "La Maestra": the experienced senior colleague who hands you exactly what you need. Warm, professional, trustworthy. Never playful-cute, never corporate-cold.

The mascot is a stylized woman teacher with round glasses, hair in a bun, presenting a small star. Golden-brown line art with cream fills. The glasses are the single most recognizable element.

---

## Color tokens

Paste this into your global CSS or tailwind.config.ts. Every color in the app comes from these tokens. No hardcoded hex values anywhere else.

```css
:root {
  /* Surfaces */
  --color-page: #faf7f2;
  --color-card: #ffffff;
  --color-inset: #f3ede4;
  --color-overlay: rgba(61, 52, 39, 0.4);

  /* Brand gold (from logo linework) */
  --color-brand: #b8860b;
  --color-brand-hover: #c9973c;
  --color-brand-light: #deba6f;
  --color-brand-subtle: #fdf3e4;

  /* Text */
  --color-text-primary: #3d3427;
  --color-text-secondary: #5c4e3c;
  --color-text-muted: #8a7d6b;
  --color-text-on-brand: #ffffff;

  /* Borders */
  --color-border: #e8e2d9;
  --color-border-strong: #d4ccc0;
  --color-border-stronger: #c2b9ab;

  /* Semantic: success */
  --color-success: #2d7d5f;
  --color-success-light: #ebf5f0;
  --color-success-text: #1b5e45;

  /* Semantic: warning */
  --color-warning: #c17817;
  --color-warning-light: #fdf3e4;
  --color-warning-text: #8a5610;

  /* Semantic: error */
  --color-error: #c0392b;
  --color-error-light: #fdeeec;
  --color-error-text: #922b20;

  /* Semantic: info */
  --color-info: #2e6b8a;
  --color-info-light: #e9f1f5;
  --color-info-text: #1d4f68;

  /* Shadows (warm-tinted, not gray) */
  --shadow-sm: 0 1px 2px rgba(61, 52, 39, 0.06);
  --shadow-md: 0 2px 8px rgba(61, 52, 39, 0.08);
  --shadow-lg: 0 8px 24px rgba(61, 52, 39, 0.12);

  /* Radius */
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-full: 9999px;

  /* Spacing scale */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;
  --space-2xl: 48px;
  --space-3xl: 64px;
}
```

## Tailwind config extension

```js
// tailwind.config.ts - extend the theme
module.exports = {
  theme: {
    extend: {
      colors: {
        page: '#FAF7F2',
        card: '#FFFFFF',
        inset: '#F3EDE4',
        brand: {
          DEFAULT: '#B8860B',
          hover: '#C9973C',
          light: '#DEBA6F',
          subtle: '#FDF3E4',
        },
        text: {
          primary: '#3D3427',
          secondary: '#5C4E3C',
          muted: '#8A7D6B',
        },
        border: {
          DEFAULT: '#E8E2D9',
          strong: '#D4CCC0',
          stronger: '#C2B9AB',
        },
        success: {
          DEFAULT: '#2D7D5F',
          light: '#EBF5F0',
          text: '#1B5E45',
        },
        warning: {
          DEFAULT: '#C17817',
          light: '#FDF3E4',
          text: '#8A5610',
        },
        error: {
          DEFAULT: '#C0392B',
          light: '#FDEEEC',
          text: '#922B20',
        },
        info: {
          DEFAULT: '#2E6B8A',
          light: '#E9F1F5',
          text: '#1D4F68',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['DM Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        sm: '6px',
        md: '8px',
        lg: '12px',
      },
      boxShadow: {
        sm: '0 1px 2px rgba(61, 52, 39, 0.06)',
        md: '0 2px 8px rgba(61, 52, 39, 0.08)',
        lg: '0 8px 24px rgba(61, 52, 39, 0.12)',
      },
      backgroundColor: {
        page: '#FAF7F2',
      },
    },
  },
}
```

---

## Typography

Two fonts. No more.

- **Display/headings:** DM Sans (Google Fonts). Warm, rounded, modern. Used for h1-h3, buttons, nav items.
- **Body:** Inter (Google Fonts). Clean, highly readable, works at small sizes. Used for everything else.

Type scale:

| Role               | Size             | Weight | Font    | Color              |
| ------------------ | ---------------- | ------ | ------- | ------------------ |
| Page title (h1)    | 28px / 1.75rem   | 600    | DM Sans | text-primary       |
| Section title (h2) | 22px / 1.375rem  | 600    | DM Sans | text-primary       |
| Subsection (h3)    | 18px / 1.125rem  | 500    | DM Sans | text-primary       |
| Body               | 15px / 0.9375rem | 400    | Inter   | text-secondary     |
| Small / caption    | 13px / 0.8125rem | 400    | Inter   | text-muted         |
| Label              | 13px / 0.8125rem | 500    | Inter   | text-secondary     |
| Button             | 14px / 0.875rem  | 500    | DM Sans | depends on variant |

Line heights: headings 1.3, body 1.6, small 1.4.

Never use font-weight 700 or 800. The heaviest weight is 600, and only for h1 and h2. Everything else is 400 or 500.

---

## Component specs

### Buttons

Primary (brand action, one per view max):

```
background: var(--color-brand)
color: var(--color-text-on-brand)
border: none
border-radius: var(--radius-sm)
padding: 10px 20px
font: 14px/1 DM Sans, weight 500
hover: background var(--color-brand-hover)
active: transform scale(0.98)
```

Secondary (default for most buttons):

```
background: transparent
color: var(--color-text-secondary)
border: 1px solid var(--color-border-strong)
border-radius: var(--radius-sm)
padding: 10px 20px
font: 14px/1 DM Sans, weight 500
hover: background var(--color-inset)
active: transform scale(0.98)
```

Ghost (tertiary, for less important actions):

```
background: transparent
color: var(--color-text-muted)
border: none
border-radius: var(--radius-sm)
padding: 10px 20px
font: 14px/1 DM Sans, weight 500
hover: background var(--color-inset), color var(--color-text-secondary)
```

Danger (destructive actions):

```
background: transparent
color: var(--color-error)
border: 1px solid var(--color-error)
border-radius: var(--radius-sm)
padding: 10px 20px
hover: background var(--color-error-light)
```

### Cards

Standard card:

```
background: var(--color-card)
border: 1px solid var(--color-border)
border-radius: var(--radius-lg)
padding: 20px
```

Inset card (for nested content inside cards):

```
background: var(--color-inset)
border: none
border-radius: var(--radius-md)
padding: 16px
```

Highlighted card (for featured content):

```
background: var(--color-card)
border: 2px solid var(--color-brand)
border-radius: var(--radius-lg)
padding: 20px
```

### Form inputs

Text input / textarea:

```
background: var(--color-card)
border: 1px solid var(--color-border)
border-radius: var(--radius-sm)
padding: 10px 14px
font: 15px Inter
color: var(--color-text-primary)
placeholder color: var(--color-text-muted)
focus: border-color var(--color-brand), box-shadow 0 0 0 3px var(--color-brand-subtle)
```

Select:

```
Same as text input, plus:
appearance: none
background-image: chevron-down icon in var(--color-text-muted)
```

### Badges / pills

Status badge:

```
font: 12px/1 Inter, weight 500
padding: 4px 10px
border-radius: var(--radius-full)
```

Variants:

- Default: bg var(--color-inset), color var(--color-text-secondary)
- Success: bg var(--color-success-light), color var(--color-success-text)
- Warning: bg var(--color-warning-light), color var(--color-warning-text)
- Error: bg var(--color-error-light), color var(--color-error-text)
- Brand: bg var(--color-brand-subtle), color var(--color-brand)

### Navigation (dashboard sidebar)

```
Sidebar background: var(--color-card)
Sidebar border-right: 1px solid var(--color-border)
Sidebar width: 240px

Nav item:
  padding: 10px 16px
  border-radius: var(--radius-sm)
  font: 14px Inter, weight 400
  color: var(--color-text-secondary)

Nav item hover:
  background: var(--color-inset)
  color: var(--color-text-primary)

Nav item active:
  background: var(--color-brand-subtle)
  color: var(--color-brand)
  font-weight: 500
```

### Toasts / notifications

```
background: var(--color-card)
border: 1px solid var(--color-border)
border-left: 3px solid [semantic color]
border-radius: var(--radius-md)
padding: 14px 18px
box-shadow: var(--shadow-lg)
```

Success toast: border-left color var(--color-success)
Warning toast: border-left color var(--color-warning)
Error toast: border-left color var(--color-error)

---

## Layout rules

### Page structure

Landing page:

```
body background: var(--color-page)
max-width: 1200px, centered
section padding: 80px 0 (desktop), 48px 0 (mobile)
```

Dashboard:

```
body background: var(--color-page)
sidebar: fixed left, 240px wide, full height
main content: margin-left 240px, padding 32px
```

### Spacing rules

- Between sections: 64px (desktop), 40px (mobile)
- Between cards in a grid: 16px
- Between elements inside a card: 12px-16px
- Between a label and its input: 6px
- Between a heading and its body text: 8px
- Between buttons in a group: 8px

### Responsive breakpoints

```
sm: 640px
md: 768px
lg: 1024px
xl: 1280px
```

Mobile sidebar: hidden by default, slides in from left on hamburger tap.
Mobile cards: single column, full width with 16px horizontal padding.

---

## Iconography

Use Lucide React icons (already common in Next.js projects). Outline style only.

Default icon size: 18px for inline, 20px for buttons, 24px for empty states.
Icon color: inherit from parent text color. Never color icons independently unless they carry semantic meaning (success checkmark in green, etc.).

---

## Writing in the UI

Voice: warm, direct, professional. Like a colleague, not a corporation.

- Sentence case everywhere. "Create lesson plan" not "Create Lesson Plan"
- No exclamation marks in UI text
- No "please" in buttons or labels
- Buttons say what happens: "Generate plan" not "Submit"
- Errors say what went wrong and what to do: "That grade level isn't supported yet. Try preescolar 1, 2, or 3."
- Empty states invite action: "Your first lesson plan is one click away" not "No plans found"
- Use Spanish terms where teachers expect them: PDA, campo formativo, aprendizaje esperado. Don't translate these to English in the Mexican product.

---

## The star motif

The star from La Maestra's hand is a recurring brand element. Use it:

- As the favicon (star alone, filled brand gold on transparent)
- As a loading indicator (star with a subtle pulse animation)
- As a success state (star appears when a lesson plan is generated)
- As a decorative element on the landing page hero (2-3 small stars scattered)

Do not overuse it. Maximum 3 visible stars on any single screen. The star should feel like a reward, not wallpaper.

---

## What NOT to do

- No pure black (#000000) anywhere. Darkest color is var(--color-text-primary) which is #3D3427.
- No pure gray borders. Always use the warm taupe border tokens.
- No blue links. Links use var(--color-brand) for the underline/color, matching the warm palette.
- No gradients on surfaces or buttons. Flat fills only.
- No drop shadows on cards unless they're floating (modals, dropdowns). In-page cards use border only.
- No rounded corners on single-sided borders (left accent lines are square).
- No more than one primary (brand-colored) button per view. Everything else is secondary or ghost.
- No stock photography. Illustrations only, matching the La Maestra line-art style.
- No dark mode (yet). Build light-only. Dark mode is a future project.
- No em dashes or en dashes in copy. Use periods, commas, or line breaks.

---

## File this lives in

Place this file at the root of the MaestraAI repo as `DESIGN_SYSTEM.md` and reference it in your `CLAUDE.md` so Claude Code reads it before any UI work.

---

_Last updated: 2026-07-10_
_Connected: [[maestraia.com]] . [[La Maestra mascot]] . [[MaestraAI repo]]_
