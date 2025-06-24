# Demo Company Branding

This directory contains the complete branding system for the flows-app-demo application, following the structure outlined in the [Customer Brand Extraction Guide](../../../../branding/CUSTOMER-BRAND-EXTRACTION.md).

## Structure

```
src/branding/
├── assets/
│   └── logos/
│       ├── logo.svg              # Primary demo company logo
│       ├── logo-dark.svg         # Dark theme variant
│       └── logo-icon.svg         # Icon/symbol only
├── tokens/
│   ├── colors.json               # Brand color system
│   ├── typography.json           # Font families and styles
│   └── sizes.json                # Spacing and dimensions
├── design-tokens.css             # Generated CSS custom properties
├── build-tokens.js               # Token build system
└── README.md                     # This file
```

## Brand Overview

- **Primary Color**: #0066cc (Demo Blue)
- **Accent Color**: #ed8b00 (Demo Orange)  
- **Font Family**: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto...
- **Generated**: 2025-01-23

## Token Structure

The design tokens follow Thepia's simplified naming convention:
- **Numerical hierarchy**: `color.text.1`, `color.text.2` for clear importance order
- **Semantic aliases**: `color.text.primary` references `color.text.1` for readability
- **Cross-format compatibility**: Works in CSS, JSON, and JavaScript

## Usage

### CSS Custom Properties

The generated `design-tokens.css` file provides CSS custom properties:

```css
.my-component {
  background: var(--color-brand-primary);
  color: var(--color-text-inverse);
  padding: var(--size-space-4);
  border-radius: var(--size-radius-md);
  font-family: var(--typography-fontFamily-brand-primary);
}
```

### Logo Usage

```html
<!-- Primary logo -->
<img src="/src/branding/assets/logos/logo.svg" alt="Demo Company" height="40">

<!-- Dark theme -->
<img src="/src/branding/assets/logos/logo-dark.svg" alt="Demo Company" height="40">

<!-- Icon only -->
<img src="/src/branding/assets/logos/logo-icon.svg" alt="Demo Company" width="40" height="40">
```

### Brand Theme Classes

The CSS includes theme classes for easy brand switching:

```html
<!-- Default demo branding -->
<body class="brand-demo">

<!-- Alternative themes -->
<body class="brand-emerald">
<body class="brand-purple">
<body class="brand-rose">
```

## Build System

### Building Tokens

To regenerate the CSS from JSON tokens:

```bash
npm run build:tokens
```

This runs `src/branding/build-tokens.js` which:
1. Loads all JSON token files
2. Resolves token references (e.g., `{color.brand.primary}`)
3. Generates CSS custom properties
4. Outputs to `design-tokens.css`

### Integration with Build

The main build process automatically rebuilds tokens:

```bash
npm run build  # Runs build:tokens first, then vite build
```

## Token Categories

### Colors
- **Text**: Hierarchy from primary to quaternary
- **Backgrounds**: Surface colors for different contexts
- **Borders**: Strength progression for visual separation
- **Brand**: Primary and accent colors with states
- **Interactive**: Hover, active, focus, disabled states

### Typography
- **Font families**: System font stack
- **Font weights**: Normal to bold
- **Font sizes**: xs to 4xl scale
- **Line heights**: Tight to relaxed

### Sizes
- **Spacing**: 0.25rem to 6rem scale
- **Border radius**: Small to full rounded
- **Shadows**: Subtle to dramatic depth
- **Containers**: Responsive max-widths
- **Transitions**: Fast to slow timing

## Customization

### Adding New Tokens

1. Add tokens to appropriate JSON file (`colors.json`, `typography.json`, `sizes.json`)
2. Run `npm run build:tokens` to regenerate CSS
3. Use new tokens via CSS custom properties

### Creating Brand Variants

Add new theme classes to the build script or CSS:

```css
.brand-custom {
  --color-brand-primary: #your-color;
  --color-brand-primaryHover: #your-hover-color;
  --color-brand-primarySubtle: #your-subtle-color;
}
```

## Validation

### Accessibility
- Text colors meet WCAG AA contrast ratios (4.5:1) against backgrounds
- Interactive elements have sufficient contrast
- Focus states are clearly visible

### Consistency
- Font sizes follow mathematical progression (1.125+ ratio)
- Spacing uses consistent scale based on 0.25rem increments
- Color palettes maintain proper lightness progression

## Future Enhancements

- **Asset optimization**: Compress and optimize logo files
- **Icon system**: Expand to include custom brand icons
- **Animation tokens**: Add motion and timing values
- **Responsive tokens**: Breakpoint-specific token values
- **Dark mode**: Complete dark theme implementation