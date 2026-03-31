"use client";

import { Check, RotateCcw, Monitor, Sun, Moon, Pipette } from "lucide-react";
import { useTheme } from "next-themes";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  useCustomTheme,
  COLOR_PRESETS,
  SIDEBAR_PRESETS,
} from "@/components/providers/custom-theme-provider";
import { cn } from "@/lib/utils";

const THEME_OPTIONS = [
  {
    value: "system",
    label: "System",
    description: "Follow your device settings",
    icon: Monitor,
  },
  {
    value: "light",
    label: "Light",
    description: "Light background with dark text",
    icon: Sun,
  },
  {
    value: "dark",
    label: "Dark",
    description: "Dark background with light text",
    icon: Moon,
  },
] as const;

export function AppearanceForm() {
  const { customTheme, setCustomTheme, resetTheme } = useCustomTheme();
  const { theme, setTheme } = useTheme();

  const colorInputRef = useRef<HTMLInputElement>(null);
  const sidebarColorInputRef = useRef<HTMLInputElement>(null);
  const activePrimary = customTheme.primary ?? "#fbb811";
  const activeSidebarDark = customTheme.sidebarDark ?? "#0A0A0A";
  const isCustomColor = activePrimary && !COLOR_PRESETS.some((p) => p.primary === activePrimary);
  const isCustomSidebar = activeSidebarDark && !SIDEBAR_PRESETS.some((p) => p.dark === activeSidebarDark);

  function getForeground(hex: string): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness < 128 ? "#ffffff" : "#1A1A1A";
  }

  function handleCustomColor(hex: string) {
    setCustomTheme({
      ...customTheme,
      primary: hex,
      primaryForeground: getForeground(hex),
    });
  }

  function handleCustomSidebar(hex: string) {
    setCustomTheme({
      ...customTheme,
      sidebarLight: hex,
      sidebarDark: hex,
    });
  }

  function handlePrimarySelect(preset: (typeof COLOR_PRESETS)[number]) {
    setCustomTheme({
      ...customTheme,
      primary: preset.primary,
      primaryForeground: preset.primaryForeground,
    });
  }

  function handleSidebarSelect(preset: (typeof SIDEBAR_PRESETS)[number]) {
    setCustomTheme({
      ...customTheme,
      sidebarLight: preset.light,
      sidebarDark: preset.dark,
    });
  }

  const isDefault = !customTheme.primary && !customTheme.sidebarLight;

  return (
    <>
      {/* Theme Mode */}
      <Card>
        <CardHeader>
          <CardTitle>Theme Mode</CardTitle>
          <CardDescription>
            Choose between light, dark, or system-based appearance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {THEME_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isSelected = theme === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTheme(option.value)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-lg border px-4 py-4 transition-all cursor-pointer",
                    isSelected
                      ? "border-primary bg-primary/5 ring-1 ring-primary shadow-sm"
                      : "border-border hover:bg-muted/50",
                  )}
                >
                  <div
                    className={cn(
                      "flex size-10 items-center justify-center rounded-full",
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    <Icon className="size-5" />
                  </div>
                  <div className="text-center">
                    <p className={cn("text-sm font-medium", isSelected && "text-primary")}>
                      {option.label}
                    </p>
                    <p className="text-muted-foreground text-xs mt-0.5">
                      {option.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Primary Color */}
      <Card>
        <CardHeader>
          <CardTitle>Primary Color</CardTitle>
          <CardDescription>
            Used for buttons, active states, links, and accents throughout the portal
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-3">
            {COLOR_PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => handlePrimarySelect(preset)}
                className={cn(
                  "group relative flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all",
                  activePrimary === preset.primary
                    ? "border-primary shadow-sm"
                    : "border-transparent hover:border-border",
                )}
              >
                <div
                  className="size-10 rounded-full shadow-sm transition-transform group-hover:scale-110"
                  style={{ backgroundColor: preset.primary }}
                >
                  {activePrimary === preset.primary && (
                    <div className="flex items-center justify-center size-full">
                      <Check
                        className="size-5"
                        style={{ color: preset.primaryForeground }}
                        strokeWidth={3}
                      />
                    </div>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">{preset.name}</span>
              </button>
            ))}
            {/* Custom color picker */}
            <button
              type="button"
              onClick={() => colorInputRef.current?.click()}
              className={cn(
                "group relative flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all",
                isCustomColor
                  ? "border-primary shadow-sm"
                  : "border-transparent hover:border-border",
              )}
            >
              <div
                className={cn(
                  "size-10 rounded-full shadow-sm transition-transform group-hover:scale-110 flex items-center justify-center",
                  !isCustomColor && "bg-muted",
                )}
                style={isCustomColor ? { backgroundColor: activePrimary } : undefined}
              >
                {isCustomColor ? (
                  <Check className="size-5" style={{ color: getForeground(activePrimary) }} strokeWidth={3} />
                ) : (
                  <Pipette className="size-5 text-muted-foreground" />
                )}
              </div>
              <span className="text-xs text-muted-foreground">Custom</span>
              <input
                ref={colorInputRef}
                type="color"
                value={activePrimary}
                onChange={(e) => handleCustomColor(e.target.value)}
                className="sr-only"
              />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Sidebar Color */}
      <Card>
        <CardHeader>
          <CardTitle>Sidebar</CardTitle>
          <CardDescription>
            Background color of the navigation sidebar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-3">
            {SIDEBAR_PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => handleSidebarSelect(preset)}
                className={cn(
                  "group relative flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all",
                  activeSidebarDark === preset.dark
                    ? "border-primary shadow-sm"
                    : "border-transparent hover:border-border",
                )}
              >
                <div
                  className="w-full h-10 rounded-lg shadow-sm border border-border/50 transition-transform group-hover:scale-105"
                  style={{ backgroundColor: preset.dark }}
                >
                  {activeSidebarDark === preset.dark && (
                    <div className="flex items-center justify-center size-full">
                      <Check className="size-5 text-white" strokeWidth={3} />
                    </div>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">{preset.name}</span>
              </button>
            ))}
            {/* Custom sidebar color picker */}
            <button
              type="button"
              onClick={() => sidebarColorInputRef.current?.click()}
              className={cn(
                "group relative flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all",
                isCustomSidebar
                  ? "border-primary shadow-sm"
                  : "border-transparent hover:border-border",
              )}
            >
              <div
                className={cn(
                  "w-full h-10 rounded-lg shadow-sm border border-border/50 transition-transform group-hover:scale-105 flex items-center justify-center",
                  !isCustomSidebar && "bg-muted",
                )}
                style={isCustomSidebar ? { backgroundColor: activeSidebarDark } : undefined}
              >
                {isCustomSidebar ? (
                  <Check className="size-5 text-white" strokeWidth={3} />
                ) : (
                  <Pipette className="size-5 text-muted-foreground" />
                )}
              </div>
              <span className="text-xs text-muted-foreground">Custom</span>
              <input
                ref={sidebarColorInputRef}
                type="color"
                value={activeSidebarDark}
                onChange={(e) => handleCustomSidebar(e.target.value)}
                className="sr-only"
              />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Reset */}
      <Card>
        <CardHeader>
          <CardTitle>Reset</CardTitle>
          <CardDescription>
            Restore the default black and gold theme
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" disabled={isDefault}>
                <RotateCcw className="size-4 mr-1.5" />
                Reset to default
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset to default theme?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will restore the original black and gold color scheme.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={resetTheme}>Reset</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </>
  );
}
