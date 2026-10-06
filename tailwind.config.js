/** @type {import('tailwindcss').Config} */
export default {
  // Class-based dark mode (the app toggles `.dark` on <html>), extended so a
  // public event theme can force a scheme for its subtree with
  // `data-color-scheme="light" | "dark"` regardless of the visitor's setting.
  darkMode: [
    "variant",
    [
      "&:is(.dark *):not([data-color-scheme=light] *)",
      "&:is([data-color-scheme=dark] *)",
    ],
  ],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        // Public event pages (Champion theme). Colours come from the CSS
        // variables the event shell sets, so these follow `brand_color`.
        // Always apply via `motion-safe:` — they loop forever.
        "event-glow": {
          "0%, 100%": {
            boxShadow:
              "0 0 22px -8px var(--event-brand-glow), inset 0 1px 0 rgba(255,255,255,0.45)",
          },
          "50%": {
            boxShadow:
              "0 0 40px -4px var(--event-brand-glow), inset 0 1px 0 rgba(255,255,255,0.45)",
          },
        },
        // Seamless strip: render the item list twice and translate by half.
        "event-marquee": {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "event-glow": "event-glow 3.2s ease-in-out infinite",
        "event-marquee": "event-marquee var(--event-marquee-duration, 40s) linear infinite",
      },
    },
  },
  plugins: [],
}
