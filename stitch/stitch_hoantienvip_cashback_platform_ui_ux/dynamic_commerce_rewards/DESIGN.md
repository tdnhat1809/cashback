---
name: Dynamic Commerce & Rewards
colors:
  surface: '#fff8f6'
  surface-dim: '#f0d4ce'
  surface-bright: '#fff8f6'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#fff0ed'
  surface-container: '#ffe9e5'
  surface-container-high: '#ffe2dc'
  surface-container-highest: '#f9dcd6'
  on-surface: '#271814'
  on-surface-variant: '#5b403a'
  inverse-surface: '#3e2c28'
  inverse-on-surface: '#ffede9'
  outline: '#8f7069'
  outline-variant: '#e3beb6'
  surface-tint: '#b52603'
  primary: '#b52603'
  on-primary: '#ffffff'
  primary-container: '#ff5a36'
  on-primary-container: '#5a0c00'
  inverse-primary: '#ffb4a3'
  secondary: '#565e74'
  on-secondary: '#ffffff'
  secondary-container: '#d7dff9'
  on-secondary-container: '#5a6278'
  tertiary: '#006c49'
  on-tertiary: '#ffffff'
  tertiary-container: '#00a773'
  on-tertiary-container: '#003320'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdad2'
  primary-fixed-dim: '#ffb4a3'
  on-primary-fixed: '#3d0600'
  on-primary-fixed-variant: '#8c1900'
  secondary-fixed: '#dae2fc'
  secondary-fixed-dim: '#bec6df'
  on-secondary-fixed: '#131b2e'
  on-secondary-fixed-variant: '#3f465b'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#fff8f6'
  on-background: '#271814'
  surface-variant: '#f9dcd6'
typography:
  display-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Be Vietnam Pro
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
  headline-md:
    fontFamily: Be Vietnam Pro
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  title-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Be Vietnam Pro
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Be Vietnam Pro
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Be Vietnam Pro
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
  3xl: 64px
  container-max: 1280px
  gutter: 24px
---

## Brand & Style
The design system for this cashback platform balances the precision of a fintech tool with the high-energy excitement of e-commerce deal hunting. The brand personality is **reliable, rewarding, and frictionless**.

The aesthetic follows a **Modern Minimalist** approach with subtle **Tactile** influences. It prioritizes clarity through generous whitespace and a "content-first" hierarchy, ensuring users can track their financial rewards without cognitive overload. The interface should feel "bouncy" and responsive—using subtle transitions and bright accents to celebrate successful transactions and cashback milestones.

Key attributes:
- **Optimistic Professionalism:** Serious about money, but enthusiastic about savings.
- **Visual Breathability:** High use of negative space to prevent "deal fatigue."
- **Clarity & Trust:** Sharp typography and consistent status indicators to build user confidence in the cashback tracking process.

## Colors
The palette is led by a high-visibility **Vibrant Orange-Red (#FF5A36)**, used strategically for primary actions and brand presence. This is grounded by **Deep Navy (#182033)** for text and structural elements, ensuring high contrast and professional readability.

- **Primary (#FF5A36):** Energy, deals, and key calls-to-action.
- **Secondary/Text (#182033):** Trust, depth, and information hierarchy.
- **Success (#10B981):** "Cashback Confirmed" and positive balance updates.
- **Pending (#F59E0B):** "Transaction Tracking" and waiting states.
- **Surface/Background:** A warm **Cream-White (#FFF9F6)** in Light Mode to feel more inviting than pure white, switching to a deep, desaturated navy in Dark Mode to maintain legibility.

## Typography
**Be Vietnam Pro** is selected for its exceptional rendering of Vietnamese diacritics and its modern, geometric character that aligns with the "tech-forward" brand.

- **Headlines:** Use Bold (700) weights with tight tracking for a strong "deal" presence.
- **Body:** Use Regular (400) for long-form content to ensure maximum legibility.
- **Numerical Data:** For cashback amounts and percentages, use Medium (500) or SemiBold (600) to ensure the financial value stands out.
- **Labels:** Uppercase styling for small labels (like category chips) helps differentiate metadata from body content.

## Layout & Spacing
The design system utilizes a **12-column fluid grid** for desktop and a **4-column grid** for mobile. A strict **8px spatial system** governs all margins and padding.

- **Margins:** Desktop uses a 24px minimum side margin; Mobile uses 16px.
- **Gutters:** Fixed at 24px for desktop to provide ample breathing room between product cards.
- **Vertical Rhythm:** Larger sections (like Hero vs. Categories) are separated by 64px (3xl) to maintain the "Minimalist" feel.
- **Safe Zones:** Cards and containers use a standard 16px (md) internal padding for content.

## Elevation & Depth
Depth is created through **Ambient Shadows** and **Tonal Layering** rather than heavy lines.

- **Level 0 (Base):** The main background color.
- **Level 1 (Cards):** Uses a very soft shadow (Y: 4px, Blur: 12px, 4% Opacity of Navy) to appear subtly lifted.
- **Level 2 (Interactive):** Hover states on cards increase the shadow spread and slightly shift the Y-offset (Y: 8px, Blur: 20px, 8% Opacity).
- **Level 3 (Modals/Toasts):** High-diffusion shadows to signify importance and separation from the layout (Y: 12px, Blur: 32px, 12% Opacity).
- **Glassmorphism:** Use a subtle backdrop blur (8px) on sticky navigation bars and bottom sheets to maintain context of the content underneath.

## Shapes
The shape language is **friendly and modern**, characterized by generous corner radii that soften the professional navy/finance aesthetic.

- **Components:** Standard buttons, input fields, and small cards use a **16px** radius.
- **Large Containers:** Product cards and Modals utilize a **20px** (rounded-xl) radius.
- **Chips/Badges:** These are fully pill-shaped (999px) to contrast against the more structural card shapes.
- **Icons:** Use **Lucide** icons with a 2px stroke weight and "round" join/cap settings to match the UI's softness.

## Components
Consistent implementation of core UI elements:

- **Buttons:**
    - *Primary:* Solid #FF5A36 with white text. 16px radius.
    - *Secondary:* Ghost style with #FF5A36 border and text.
    - *Size:* Large (56px height) for mobile CTA; Medium (44px) for desktop.
- **Product Cards:**
    - Must feature a "Cashback Badge" in the top-right corner using the Primary color.
    - Title in Navy, Cashback amount in Green (Success).
- **Stat Cards:**
    - Used in user dashboards for "Available Balance" or "Pending Rewards."
    - High contrast text with large display typography for the currency.
- **Status Badges (Chips):**
    - *Success:* Light Green background (10% opacity) with #10B981 text.
    - *Pending:* Light Amber background (10% opacity) with #F59E0B text.
- **Bottom Sheets (Mobile):**
    - High-rounded top corners (24px).
    - Features a handle indicator at the top for "drag-to-close" affordance.
- **Toasts:**
    - Minimalist floating bars at the bottom-center. Use a 12px blur backdrop if overlapping content.
- **Tables:**
    - Clean, no vertical borders. Use 1px #E2E8F0 horizontal dividers only.