/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
  "colors": {
    "surface-container-low": "var(--surface-container-low)",
    "on-background": "var(--on-background)",
    "background": "var(--background)",
    "on-tertiary": "var(--on-tertiary)",
    "tertiary": "var(--tertiary)",
    "on-surface": "var(--on-surface)",
    "on-surface-variant": "var(--on-surface-variant)",
    "surface-container": "var(--surface-container)",
    "primary-fixed": "var(--primary-fixed)",
    "on-tertiary-container": "var(--on-tertiary-container)",
    "on-secondary-fixed-variant": "var(--on-secondary-fixed-variant)",
    "on-secondary-fixed": "var(--on-secondary-fixed)",
    "tertiary-fixed-dim": "var(--tertiary-fixed-dim)",
    "surface-tint": "var(--surface-tint)",
    "on-primary-fixed": "var(--on-primary-fixed)",
    "surface-dim": "var(--surface-dim)",
    "on-primary-container": "var(--on-primary-container)",
    "surface-variant": "var(--surface-variant)",
    "on-tertiary-fixed": "var(--on-tertiary-fixed)",
    "inverse-primary": "var(--inverse-primary)",
    "on-primary-fixed-variant": "var(--on-primary-fixed-variant)",
    "surface-container-highest": "var(--surface-container-highest)",
    "error": "var(--error)",
    "tertiary-fixed": "var(--tertiary-fixed)",
    "on-error": "var(--on-error)",
    "surface-bright": "var(--surface-bright)",
    "secondary-fixed-dim": "var(--secondary-fixed-dim)",
    "outline-variant": "var(--outline-variant)",
    "surface-container-lowest": "var(--surface-container-lowest)",
    "on-error-container": "var(--on-error-container)",
    "on-secondary-container": "var(--on-secondary-container)",
    "secondary": "var(--secondary)",
    "outline": "var(--outline)",
    "inverse-on-surface": "var(--inverse-on-surface)",
    "on-primary": "var(--on-primary)",
    "secondary-container": "var(--secondary-container)",
    "on-secondary": "var(--on-secondary)",
    "on-tertiary-fixed-variant": "var(--on-tertiary-fixed-variant)",
    "primary": "var(--primary)",
    "tertiary-container": "var(--tertiary-container)",
    "surface": "var(--surface)",
    "error-container": "var(--error-container)",
    "primary-fixed-dim": "var(--primary-fixed-dim)",
    "primary-container": "var(--primary-container)",
    "surface-container-high": "var(--surface-container-high)",
    "secondary-fixed": "var(--secondary-fixed)",
    "inverse-surface": "var(--inverse-surface)"
  },
  "borderRadius": {
    "DEFAULT": "0.25rem",
    "lg": "0.5rem",
    "xl": "0.75rem",
    "full": "9999px"
  },
  "spacing": {
    "margin-mobile": "16px",
    "margin-desktop": "64px",
    "gutter": "24px",
    "section-gap": "80px",
    "unit": "8px"
  },
  "fontFamily": {
    "label-md": [
      "Inter"
    ],
    "body-md": [
      "Inter"
    ],
    "headline-lg-mobile": [
      "Inter"
    ],
    "headline-md": [
      "Inter"
    ],
    "headline-xl": [
      "Inter"
    ],
    "headline-lg": [
      "Inter"
    ],
    "body-lg": [
      "Inter"
    ],
    "label-sm": [
      "Inter"
    ]
  },
    "fontSize": {
      "label-md": [
        "16px",
        {
          "lineHeight": "24px",
          "letterSpacing": "0.01em",
          "fontWeight": "600"
        }
      ],
      "body-md": [
        "16px",
        {
          "lineHeight": "26px",
          "fontWeight": "400"
        }
      ],
      "headline-lg-mobile": [
        "24px",
        {
          "lineHeight": "32px",
          "fontWeight": "700"
        }
      ],
      "headline-md": [
        "clamp(20px, 4vw, 24px)",
        {
          "lineHeight": "32px",
          "fontWeight": "600"
        }
      ],
      "headline-xl": [
        "clamp(30px, 6vw, 48px)",
        {
          "lineHeight": "clamp(38px, 7vw, 56px)",
          "letterSpacing": "-0.02em",
          "fontWeight": "700"
        }
      ],
      "headline-lg": [
        "clamp(24px, 5vw, 32px)",
        {
          "lineHeight": "clamp(32px, 6vw, 40px)",
          "letterSpacing": "-0.01em",
          "fontWeight": "700"
        }
      ],
      "body-lg": [
        "clamp(16px, 3vw, 18px)",
        {
          "lineHeight": "28px",
          "fontWeight": "400"
        }
      ],
      "label-sm": [
        "13px",
        {
          "lineHeight": "18px",
          "fontWeight": "600"
        }
      ]
    }
}
  },
  plugins: [],
}
