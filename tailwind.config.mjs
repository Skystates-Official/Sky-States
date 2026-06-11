/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
  "colors": {
    "surface-container-low": "#f3f3f4",
    "on-background": "#1a1c1c",
    "background": "#f9f9f9",
    "on-tertiary": "#ffffff",
    "tertiary": "#515872",
    "on-surface": "#1a1c1c",
    "on-surface-variant": "#404850",
    "surface-container": "#eeeeee",
    "primary-fixed": "#cde5ff",
    "on-tertiary-container": "#f7f6ff",
    "on-secondary-fixed-variant": "#3b4951",
    "on-secondary-fixed": "#0f1d25",
    "tertiary-fixed-dim": "#bfc5e4",
    "surface-tint": "#006399",
    "on-primary-fixed": "#001d32",
    "surface-dim": "#dadada",
    "on-primary-container": "#f3f7ff",
    "surface-variant": "#e2e2e2",
    "on-tertiary-fixed": "#141a32",
    "inverse-primary": "#94ccff",
    "on-primary-fixed-variant": "#004b74",
    "surface-container-highest": "#e2e2e2",
    "error": "#ba1a1a",
    "tertiary-fixed": "#dce1ff",
    "on-error": "#ffffff",
    "surface-bright": "#f9f9f9",
    "secondary-fixed-dim": "#bac9d3",
    "outline-variant": "#bfc7d1",
    "surface-container-lowest": "#ffffff",
    "on-error-container": "#93000a",
    "on-secondary-container": "#56656e",
    "secondary": "#526069",
    "outline": "#707881",
    "inverse-on-surface": "#f0f1f1",
    "on-primary": "#ffffff",
    "secondary-container": "#d3e2ed",
    "on-secondary": "#ffffff",
    "on-tertiary-fixed-variant": "#3f465f",
    "primary": "#005d90",
    "tertiary-container": "#6a708c",
    "surface": "#f9f9f9",
    "error-container": "#ffdad6",
    "primary-fixed-dim": "#94ccff",
    "primary-container": "#0077b6",
    "surface-container-high": "#e8e8e8",
    "secondary-fixed": "#d6e5ef",
    "inverse-surface": "#2f3131"
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
      "18px",
      {
        "lineHeight": "28px",
        "fontWeight": "400"
      }
    ],
    "headline-lg-mobile": [
      "28px",
      {
        "lineHeight": "36px",
        "fontWeight": "700"
      }
    ],
    "headline-md": [
      "24px",
      {
        "lineHeight": "32px",
        "fontWeight": "600"
      }
    ],
    "headline-xl": [
      "48px",
      {
        "lineHeight": "56px",
        "letterSpacing": "-0.02em",
        "fontWeight": "700"
      }
    ],
    "headline-lg": [
      "32px",
      {
        "lineHeight": "40px",
        "letterSpacing": "-0.01em",
        "fontWeight": "700"
      }
    ],
    "body-lg": [
      "20px",
      {
        "lineHeight": "30px",
        "fontWeight": "400"
      }
    ],
    "label-sm": [
      "14px",
      {
        "lineHeight": "20px",
        "fontWeight": "600"
      }
    ]
  }
}
  },
  plugins: [],
}
