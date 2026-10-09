/**
 * @fileoverview Configuración del framework de estilos Tailwind CSS
 * @author JIMMY LOPEZ
 * @date 2026-05-28
 */
import type { Config } from "tailwindcss";
import { heroui } from "@heroui/react";

const config: Config = {
  // Variante `dark` a medida: además de requerir un ancestro `.dark` (en
  // <html>), se anula dentro de cualquier subárbol `.theme-light`.
  //
  // Por qué: las pantallas de acceso muestran su propio fondo claro con
  // tokens de tema claro (`app/(auth)/layout.tsx` fuerza `.theme-light`), pero
  // las utilidades `dark:*` dependen de `<html class="dark">`, no de esos
  // tokens. Con `darkMode: "class"` un `dark:text-yellow-400` seguía
  // aplicándose sobre el fondo claro y dejaba texto amarillo casi invisible
  // (contraste 1.47:1). Con esta variante, dentro de `.theme-light` los
  // `dark:*` quedan inertes y solo cuenta el estilo base.
  darkMode: ["variant", "&:is(.dark *):not(:is(.theme-light *))"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
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
        brand: {
          DEFAULT: "#FACC15",   // amarillo dorado (golden yellow)
          hover: "#EAB308",     // dorado profundo para hover
          accent: "#FDE68A",    // dorado claro para fondos suaves
          ink: "#0A0A0A",       // carbón: texto sobre amarillo (WCAG AAA)
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        heading: ["var(--font-plus-jakarta-sans)", "var(--font-inter)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [
    heroui({
      themes: {
        light: {
          colors: {
            background: "#F7F4F0",
            foreground: "#1C1917",
            primary: {
              DEFAULT: "#FACC15", // amarillo dorado + texto carbón = contraste AAA
              foreground: "#1C1917",
            },
            secondary: {
              DEFAULT: "#EAB308",
              foreground: "#1C1917",
            },
            focus: "#CA8A04", // dorado oscuro: visible sobre fondos claros (≥3:1)
          },
        },
        dark: {
          colors: {
            background: "#0F0F0F",
            foreground: "#F5F5F4",
            primary: {
              DEFAULT: "#FACC15",
              foreground: "#1C1917",
            },
            secondary: {
              DEFAULT: "#EAB308",
              foreground: "#1C1917",
            },
            focus: "#EAB308",
          },
        },
      },
    }),
  ],
};

export default config;
