import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        /* Apple DS Surfaces */
        canvas: 'var(--bg-canvas)',
        surface: 'var(--bg-surface)',
        elevated: 'var(--bg-elevated)',
        immersive: 'var(--bg-immersive)',

        /* Text */
        fg: {
          DEFAULT: 'var(--fg-default)',
          secondary: 'var(--fg-secondary)',
          tertiary: 'var(--fg-tertiary)',
          inverse: 'var(--fg-inverse)',
        },

        /* The singular accent */
        accent: {
          DEFAULT: 'var(--accent)',
          link: 'var(--accent-link)',
          bright: 'var(--color-blue-bright)',
        },

        /* Feedback (sparingly used) */
        success: 'var(--color-success)',
        danger: 'var(--color-danger)',
        warning: 'var(--color-warning)',

        /* Surfaces */
        'near-black': 'var(--color-near-black)',
        'light-gray': 'var(--color-light-gray)',
        'dark-surface': {
          1: 'var(--color-dark-surface-1)',
          2: 'var(--color-dark-surface-2)',
          3: 'var(--color-dark-surface-3)',
          4: 'var(--color-dark-surface-4)',
          5: 'var(--color-dark-surface-5)',
        },

        /* Button states */
        'btn-active': 'var(--color-btn-active)',
        'btn-default': 'var(--color-btn-default)',

        /* Border */
        border: 'var(--border-default)',
        'border-subtle': 'var(--border-subtle)',
        ring: 'var(--ring)',
        input: 'var(--border-default)',

        /* Legacy compat */
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--color-white)',
        },
        destructive: {
          DEFAULT: 'var(--color-danger)',
          foreground: '#ffffff',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },

      borderRadius: {
        micro: 'var(--radius-micro)',
        standard: 'var(--radius-standard)',
        comfortable: 'var(--radius-comfortable)',
        lg: 'var(--radius-large)',
        pill: 'var(--radius-pill)',
      },

      /* Apple typography: tight headlines, open body */
      fontSize: {
        nano: ['0.625rem', { lineHeight: '1.47', letterSpacing: '-0.08px' }],     // 10px
        micro: ['0.75rem', { lineHeight: '1.33', letterSpacing: '-0.12px' }],      // 12px
        caption: ['0.875rem', { lineHeight: '1.29', letterSpacing: '-0.224px' }],  // 14px
        body: ['1.0625rem', { lineHeight: '1.47', letterSpacing: '-0.374px' }],    // 17px
        'body-emphasis': ['1.0625rem', { lineHeight: '1.24', letterSpacing: '-0.374px' }],
        subheading: ['1.3125rem', { lineHeight: '1.19', letterSpacing: '0.231px' }], // 21px
        tile: ['1.75rem', { lineHeight: '1.14', letterSpacing: '0.196px' }],       // 28px
        section: ['2.5rem', { lineHeight: '1.10' }],                               // 40px
        hero: ['3.5rem', { lineHeight: '1.07', letterSpacing: '-0.28px' }],        // 56px
      },

      boxShadow: {
        card: 'var(--shadow-card)',
        none: 'none',
      },

      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out both',
        'slide-up': 'slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) both',
        'scale-in': 'scale-in 0.3s ease-out both',
      },
    },
  },
  plugins: [],
}

export default config
