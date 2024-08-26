import { type Config } from "tailwindcss";
import { fontFamily } from "tailwindcss/defaultTheme";

export default {
  content: ["./src/**/*.tsx"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-geist-sans)", ...fontFamily.sans],
      },
      colors: {
        "org-primary": "var(--org-primary-color)",
        "org-secondary": "var(--org-secondary-color)",
        "off-white": "#FCFCFC",
      },
    },
  },
  plugins: [],
} satisfies Config;
