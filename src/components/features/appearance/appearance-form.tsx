"use client";

import { Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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

export function AppearanceForm() {
  const { customTheme, setCustomTheme, resetTheme } = useCustomTheme();

  const activePrimary = customTheme.primary ?? "#fbb811";
  const activeSidebarDark = customTheme.sidebarDark ?? "#0A0A0A";

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
                    ? "border-foreground shadow-sm"
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
                    ? "border-foreground shadow-sm"
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
