/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,md,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,md,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,md,mdx}",
    "./context/**/*.{js,ts,jsx,tsx,md,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,md,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "Plus Jakarta Sans", "Inter", "Arial", "sans-serif"],
        serif: ["var(--font-sans)", "Plus Jakarta Sans", "Inter", "Arial", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      letterSpacing: {
        tight: "-0.02em",
        display: "-0.025em",
      },
      transitionDuration: {
        "motion-fast": "var(--vt-motion-press)",
        "motion-hover": "var(--vt-motion-hover)",
        "motion-reveal": "var(--vt-motion-reveal)",
      },
      transitionTimingFunction: {
        natural: "var(--ease-smooth)",
        smooth: "var(--ease-smooth)",
        snappy: "var(--ease-snappy)",
      },
      colors: {
        // ViciTech palette — legacy shell aliases collapsed onto DESIGN.md semantic tokens.
        paper: {
          DEFAULT: "var(--bg-canvas)",
          deep: "var(--bg-subtle)",
        },
        ink: "var(--text-primary)",
        gunmetal: "var(--text-primary)",
        pewter: "var(--text-secondary)",
        faint: "var(--text-secondary)",
        hairline: "var(--border-default)",
        signal: {
          DEFAULT: "var(--accent-primary)",
          orange: "var(--accent-primary)",
          deep: "var(--accent-cta)",
          hover: "var(--accent-cta-hover)",
          wash: "var(--vt-signal-wash)",
        },
        brick: "var(--status-danger)",
        // DESIGN.md v2.0 semantic tokens.
        canvas: "var(--bg-canvas)",
        surface: "var(--bg-surface)",
        subtle: "var(--bg-subtle)",
        obsidian: {
          DEFAULT: "var(--bg-obsidian)",
          border: "var(--border-obsidian)",
        },
        primary: "var(--text-primary)",
        secondary: "var(--text-secondary)",
        default: "var(--border-default)",
        border: {
          DEFAULT: "var(--border-default)",
          strong: "var(--border-strong)",
        },
        accent: {
          primary: "var(--accent-primary)",
          cta: "var(--accent-cta)",
          "cta-hover": "var(--accent-cta-hover)",
          hover: "var(--accent-hover)",
          subtle: "var(--accent-subtle)",
          foreground: "var(--accent-foreground)",
        },
        status: {
          live: "var(--status-live)",
          simulated: "var(--status-simulated)",
          sample: "var(--status-sample)",
          danger: "var(--status-danger)",
        },
      },
      borderRadius: {
        "4xl": "1.75rem",
      },
      boxShadow: {
        card: "0 1px 2px rgba(20,20,22,0.04), 0 2px 6px rgba(20,20,22,0.03)",
        "card-hover": "0 8px 24px -6px rgba(20,20,22,0.08), 0 2px 6px rgba(20,20,22,0.04)",
        floating: "0 20px 40px -12px rgba(20,20,22,0.14)",
        unibody: "inset 0 1.5px 1px rgba(255,255,255,0.95), 0 12px 32px -8px rgba(20,21,24,0.08)",
        "unibody-hover": "inset 0 1.5px 1px rgba(255,255,255,0.95), 0 20px 40px -12px rgba(20,21,24,0.12)",
        signal: "0 8px 22px -10px rgba(234,88,12,0.45)",
        lift: "0 1px 2px rgba(20,21,24,0.05), 0 18px 40px -24px rgba(20,21,24,0.26)",
      },
      maxWidth: {
        shell: "80rem",
      },
    },
  },
  plugins: [],
};
