"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";

// ─── Color presets ──────────────────────────────────────────────────────────

export interface ThemePreset {
  name: string;
  primary: string;
  primaryForeground: string;
}

export const COLOR_PRESETS: ThemePreset[] = [
  { name: "Gold", primary: "#fbb811", primaryForeground: "#1A1A1A" },
  { name: "Purple", primary: "#8B5CF6", primaryForeground: "#ffffff" },
  { name: "Teal", primary: "#14B8A6", primaryForeground: "#ffffff" },
  { name: "Dark Teal", primary: "#0D9488", primaryForeground: "#ffffff" },
  { name: "Blue", primary: "#3B82F6", primaryForeground: "#ffffff" },
  { name: "Indigo", primary: "#6366F1", primaryForeground: "#ffffff" },
  { name: "Green", primary: "#22C55E", primaryForeground: "#ffffff" },
  { name: "Rose", primary: "#F43F5E", primaryForeground: "#ffffff" },
  { name: "Orange", primary: "#F97316", primaryForeground: "#ffffff" },
  { name: "Cyan", primary: "#06B6D4", primaryForeground: "#ffffff" },
];

export const SIDEBAR_PRESETS = [
  { name: "Default Dark", light: "#f9fafb", dark: "#0A0A0A" },
  { name: "Charcoal", light: "#1f2937", dark: "#111827" },
  { name: "Navy", light: "#1e293b", dark: "#0f172a" },
  { name: "Slate", light: "#334155", dark: "#1e293b" },
  { name: "Dark Purple", light: "#3b0764", dark: "#2e1065" },
  { name: "Dark Teal", light: "#134e4a", dark: "#042f2e" },
  { name: "Dark Brown", light: "#451a03", dark: "#3b0d00" },
  { name: "Pure Black", light: "#000000", dark: "#000000" },
];

// ─── Storage key ────────────────────────────────────────────────────────────

const STORAGE_KEY = "shweloader-custom-theme";

export interface CustomTheme {
  primary?: string;
  primaryForeground?: string;
  sidebarLight?: string;
  sidebarDark?: string;
}

// ─── Derived colors from primary ────────────────────────────────────────────

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

function mixWithWhite(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const r = Math.round(rgb.r + (255 - rgb.r) * amount);
  const g = Math.round(rgb.g + (255 - rgb.g) * amount);
  const b = Math.round(rgb.b + (255 - rgb.b) * amount);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function mixWithBlack(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const r = Math.round(rgb.r * (1 - amount));
  const g = Math.round(rgb.g * (1 - amount));
  const b = Math.round(rgb.b * (1 - amount));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

// ─── Context ────────────────────────────────────────────────────────────────

interface CustomThemeContextType {
  customTheme: CustomTheme;
  setCustomTheme: (theme: CustomTheme) => void;
  resetTheme: () => void;
}

const CustomThemeContext = createContext<CustomThemeContextType>({
  customTheme: {},
  setCustomTheme: () => {},
  resetTheme: () => {},
});

export function useCustomTheme() {
  return useContext(CustomThemeContext);
}

// ─── Provider ───────────────────────────────────────────────────────────────

function applyThemeToDOM(theme: CustomTheme) {
  const root = document.documentElement;
  const isDark = root.classList.contains("dark");

  if (theme.primary) {
    const fg = theme.primaryForeground ?? "#ffffff";
    // Primary color and all derived variables
    root.style.setProperty("--primary", theme.primary);
    root.style.setProperty("--primary-foreground", fg);
    root.style.setProperty("--ring", theme.primary);
    root.style.setProperty("--sidebar-primary", theme.primary);
    root.style.setProperty("--sidebar-primary-foreground", fg);
    root.style.setProperty("--sidebar-ring", theme.primary);
    // Chart colors — gradient from primary
    root.style.setProperty("--chart-1", theme.primary);
    root.style.setProperty("--chart-2", mixWithBlack(theme.primary, 0.15));
    root.style.setProperty("--chart-3", mixWithBlack(theme.primary, 0.3));
    root.style.setProperty("--chart-4", mixWithBlack(theme.primary, 0.45));
    root.style.setProperty("--chart-5", mixWithBlack(theme.primary, 0.6));
    // Accent colors — adapt to dark/light mode
    if (isDark) {
      root.style.setProperty("--accent", mixWithBlack(theme.primary, 0.8));
      root.style.setProperty("--accent-foreground", mixWithWhite(theme.primary, 0.5));
      root.style.setProperty("--sidebar-accent", mixWithBlack(theme.primary, 0.85));
      root.style.setProperty("--sidebar-accent-foreground", mixWithWhite(theme.primary, 0.5));
    } else {
      root.style.setProperty("--accent", mixWithWhite(theme.primary, 0.92));
      root.style.setProperty("--accent-foreground", mixWithBlack(theme.primary, 0.6));
      root.style.setProperty("--sidebar-accent", mixWithWhite(theme.primary, 0.92));
      root.style.setProperty("--sidebar-accent-foreground", mixWithBlack(theme.primary, 0.6));
    }
  } else {
    // Remove overrides
    const vars = [
      "--primary", "--primary-foreground", "--ring",
      "--sidebar-primary", "--sidebar-primary-foreground", "--sidebar-ring",
      "--chart-1", "--chart-2", "--chart-3", "--chart-4", "--chart-5",
      "--accent", "--accent-foreground", "--sidebar-accent", "--sidebar-accent-foreground",
    ];
    vars.forEach((v) => root.style.removeProperty(v));
  }

  if (theme.sidebarLight || theme.sidebarDark) {
    const sidebarColor = isDark ? theme.sidebarDark : theme.sidebarLight;
    if (sidebarColor) {
      root.style.setProperty("--sidebar", sidebarColor);
      root.style.setProperty("--background", sidebarColor);
      // Derive sidebar foreground based on brightness
      const rgb = hexToRgb(sidebarColor);
      if (rgb) {
        const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
        const fg = brightness < 128 ? "#E8E8E8" : "#262626";
        root.style.setProperty("--foreground", fg);
        root.style.setProperty("--sidebar-foreground", fg);
        root.style.setProperty("--sidebar-hover", brightness < 128 ? mixWithWhite(sidebarColor, 0.15) : mixWithBlack(sidebarColor, 0.08));
        root.style.setProperty("--sidebar-hover-foreground", fg);
        root.style.setProperty("--sidebar-border", brightness < 128 ? mixWithWhite(sidebarColor, 0.2) : mixWithBlack(sidebarColor, 0.15));
      }
    }
  } else {
    const sidebarVars = [
      "--sidebar", "--sidebar-foreground", "--sidebar-hover",
      "--sidebar-hover-foreground", "--sidebar-border",
      "--background", "--foreground",
    ];
    sidebarVars.forEach((v) => root.style.removeProperty(v));
  }
}

export function CustomThemeProvider({ children }: { children: React.ReactNode }) {
  const [customTheme, setCustomThemeState] = useState<CustomTheme>({});
  const [mounted, setMounted] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as CustomTheme;
        setCustomThemeState(parsed);
        applyThemeToDOM(parsed);
      }
    } catch {}
    setMounted(true);
  }, []);

  // Re-apply sidebar colors when dark/light mode changes
  useEffect(() => {
    if (!mounted) return;
    const observer = new MutationObserver(() => {
      applyThemeToDOM(customTheme);
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, [mounted, customTheme]);

  const setCustomTheme = useCallback((theme: CustomTheme) => {
    setCustomThemeState(theme);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(theme));
    applyThemeToDOM(theme);
  }, []);

  const resetTheme = useCallback(() => {
    setCustomThemeState({});
    localStorage.removeItem(STORAGE_KEY);
    // Remove all inline style overrides
    const root = document.documentElement;
    root.removeAttribute("style");
  }, []);

  return (
    <CustomThemeContext.Provider value={{ customTheme, setCustomTheme, resetTheme }}>
      {children}
    </CustomThemeContext.Provider>
  );
}
