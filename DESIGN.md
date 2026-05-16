# OmniVault Design System — Matrix Hacker Terminal

## Design Philosophy
OmniVault uses a **Matrix Hacker Terminal** aesthetic — void-black surfaces, electric green phosphor text and borders, CRT scanline textures, and terminal grid backgrounds. The design communicates raw technical power, deep AI intelligence, and hacker-grade precision. Every element looks like it belongs on a high-security terminal.

## Color Palette

### Backgrounds
| Token | Hex | Usage |
|-------|-----|-------|
| `void` | `#000000` | Root background, full-bleed surfaces |
| `terminal` | `#0a0f0a` | Card/panel base (barely-green black) |
| `panel` | `rgba(0, 15, 0, 0.85)` | Panel fill (dark green tint) |
| `panel-hover` | `rgba(0, 25, 0, 0.9)` | Panel hover state |
| `panel-border` | `rgba(0, 255, 136, 0.15)` | Default panel border |
| `panel-border-hover` | `rgba(0, 255, 136, 0.4)` | Panel border on hover |

### Accent Colors
| Token | Hex | Usage |
|-------|-----|-------|
| `matrix-green` | `#00ff88` | Primary accent — borders, active states, glow, CTA |
| `matrix-green-dim` | `#335533` | Muted green — gridlines, dim text, subtle borders |
| `matrix-green-glow` | `rgba(0, 255, 136, 0.25)` | Glow/shadow behind primary elements |
| `matrix-green-faint` | `rgba(0, 255, 136, 0.05)` | Background tints, hover fills |
| `phosphor-text` | `#00ff88` | Glowing text, headings, active labels |
| `amber` | `#ffaa00` | Warning, processing states |
| `red-alert` | `#ff0044` | Error, destructive actions |
| `blue-data` | `#0088ff` | Info, data visualization |

### Text
| Token | Hex | Usage |
|-------|-----|-------|
| `text-bright` | `#00ff88` | Headings, active text (phosphor glow) |
| `text-normal` | `#a0b0a0` | Body text, descriptions |
| `text-dim` | `#4a5a4a` | Placeholders, disabled text |
| `text-ghost` | `#1a2a1a` | Barely visible, decorative |

### Texture Constants
| Property | Value |
|----------|-------|
| `scanline-size` | `2px` |
| `scanline-color` | `rgba(0, 0, 0, 0.15)` |
| `grid-size` | `40px` |
| `grid-color` | `rgba(0, 255, 136, 0.04)` |
| `grid-color-strong` | `rgba(0, 255, 136, 0.08)` |

## Typography

### Font Stack
- **Headings/Labels**: `Geist Mono` (700, 600) — terminal monospace, uppercase, tracked
- **Body**: `Geist` (400, 500) — clean readability on dark backgrounds
- **Code/Status**: `Geist Mono` (400) — raw data display

### Scale
| Level | Size | Weight | Transform | Letter Spacing | Usage |
|-------|------|--------|-----------|----------------|-------|
| `display` | 32px | 700 | `uppercase` | `0.15em` | Hero headings |
| `h1` | 24px | 700 | `uppercase` | `0.1em` | Page titles |
| `h2` | 18px | 600 | `uppercase` | `0.08em` | Section headers |
| `h3` | 14px | 600 | `uppercase` | `0.06em` | Card titles |
| `body` | 14px | 400 | `none` | `0.02em` | Body text |
| `caption` | 11px | 500 | `uppercase` | `0.1em` | Labels, badges |

## Signature Effects

### Neon Glow
```css
box-shadow: 0 0 5px matrix-green-glow, 0 0 15px rgba(0, 255, 136, 0.1);
border: 1px solid rgba(0, 255, 136, 0.3);
```

### Glitch Jitter (hover only — reactive, not constant)
```css
@keyframes glitch-jitter {
  0%, 100% { transform: translate(0); }
  20% { transform: translate(-1px, 1px); }
  40% { transform: translate(1px, -1px); }
  60% { transform: translate(-1px, 0); }
  80% { transform: translate(1px, 1px); }
}
/* Applied via: hover:animate-glitch */
```

### CRT Scanlines
```css
.crt-scanlines::after {
  content: '';
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 1px,
    rgba(0, 0, 0, 0.15) 1px,
    rgba(0, 0, 0, 0.15) 2px
  );
  pointer-events: none;
  z-index: 50;
}
```

### Terminal Grid Background
```css
.grid-bg {
  background-image:
    linear-gradient(rgba(0, 255, 136, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 255, 136, 0.04) 1px, transparent 1px);
  background-size: 40px 40px;
}
```

### Matrix Data Shimmer (loading skeletons)
```css
@keyframes matrix-fall {
  0% { opacity: 0; transform: translateY(-100%); }
  50% { opacity: 1; }
  100% { opacity: 0; transform: translateY(100%); }
}
/* Staggered delays per column to simulate cascading data */
```

## Border Radius
| Element | Radius |
|---------|--------|
| Buttons | `4px` (sharp, terminal feel) |
| Cards/Panels | `6px` |
| Inputs | `4px` |
| Badges | `2px` (pill: `9999px`) |
| Modals | `8px` |

## Spacing
- Base unit: `4px`
- Component padding: `12px` to `20px`
- Section gaps: `16px` to `24px`

## Component Specs

### Panel
```
background: panel
border: 1px solid panel-border
border-radius: 6px
backdrop-filter: blur(4px)  /* subtle */
hover: border → panel-border-hover + glow
```

### Primary Button
```
background: transparent
border: 1px solid matrix-green
color: matrix-green
font: mono, uppercase, tracked
hover: bg matrix-green-faint + glow + glitch-jitter
active: scale(0.98)
```

### Ghost Button
```
background: transparent
border: 1px solid matrix-green-dim
color: text-dim
hover: border → matrix-green + color → matrix-green
```

### Input Field
```
background: rgba(0, 5, 0, 0.8)
border: 1px solid matrix-green-dim
border-radius: 4px
color: text-normal
placeholder: text-dim
focus: border → matrix-green + glow + glitch-jitter
```

### Status Badge
- Mono font, uppercase, 10px
- Pill shape
- Color-coded border + faint background

### Modal
```
overlay: rgba(0,0,0,0.9) + backdrop-blur(4px)
panel: Panel + neon border glow
```

## Animation Rules
1. **No constant animations** — everything is reactive (hover, focus, state change)
2. **Glitch-jitter** on hover for buttons, inputs, links (80ms duration)
3. **Glow pulse** only on active/processing states (2s ease-in-out alternate)
4. **Matrix-fall** shimmer for loading states only
5. **Transitions**: `100ms ease` for micro-interactions, `200ms` for panels
6. Respect `prefers-reduced-motion` — disable all animations

## UX Rules
1. **Void depth**: Black → Terminal → Panels → Floating elements
2. **Green hierarchy**: Bright green = interactive, dim green = decorative, no green = inactive
3. **Terminal feel**: All labels uppercase mono, all status text explicit
4. **Content readability**: Body text must be `#a0b0a0` or brighter against void
5. **Mobile**: Panels stack, sidebar collapses to bottom nav
6. **Status visibility**: Processing = amber pulse, success = green, error = red
