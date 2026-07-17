// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // ---- La Maestra tokens (MAESTRA_DESIGN_SYSTEM.md) ----
        page: 'var(--color-page)',
        inset: 'var(--color-inset)',
        brand: {
          DEFAULT: 'var(--color-brand)',
          hover: 'var(--color-brand-hover)',
          light: 'var(--color-brand-light)',
          subtle: 'var(--color-brand-subtle)',
        },
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          muted: 'var(--color-text-muted)',
          disabled: 'var(--color-text-disabled)',
        },
        success: {
          DEFAULT: 'var(--color-success)',
          light: 'var(--color-success-light)',
          text: 'var(--color-success-text)',
        },
        warning: {
          DEFAULT: 'var(--color-warning)',
          light: 'var(--color-warning-light)',
          text: 'var(--color-warning-text)',
        },
        error: {
          DEFAULT: 'var(--color-error)',
          light: 'var(--color-error-light)',
          text: 'var(--color-error-text)',
        },
        info: {
          DEFAULT: 'var(--color-info)',
          light: 'var(--color-info-light)',
          text: 'var(--color-info-text)',
        },
        // ---- Legacy aliases (existing classes keep working, remapped to the palette) ----
        primary: {
          DEFAULT: 'var(--color-primary)',
          light: 'var(--color-primary-light)',
          dark: 'var(--color-primary-dark)',
        },
        accent: 'var(--color-accent)',
        destructive: 'var(--color-destructive)',
        bg: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        border: {
          DEFAULT: 'hsl(var(--border))',
          strong: 'var(--color-border-strong)',
          stronger: 'var(--color-border-stronger)',
        },
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
      },
      borderRadius: {
        sm: '6px',
        md: '8px',
        lg: 'var(--radius)',
        xl: '12px',
        '2xl': '16px',
      },
      boxShadow: {
        sm: '0 1px 2px rgba(61, 52, 39, 0.06)',
        md: '0 2px 8px rgba(61, 52, 39, 0.08)',
        lg: '0 8px 24px rgba(61, 52, 39, 0.12)',
        DEFAULT: '0 1px 2px rgba(61, 52, 39, 0.06)',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-dm-sans)', 'var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        app: '1200px',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
