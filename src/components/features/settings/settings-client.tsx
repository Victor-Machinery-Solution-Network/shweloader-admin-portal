"use client";

import { useState, useTransition } from "react";
import {
  Image,
  Megaphone,
  Newspaper,
  DollarSign,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { updateSettings } from "@/lib/actions/setting";
import { SETTING_KEYS } from "@/types/setting";

interface SettingsClientProps {
  settings: Record<string, string>;
}

const TOGGLE_SETTINGS = [
  {
    key: SETTING_KEYS.CAROUSEL_ENABLED,
    label: "Carousel",
    description:
      "Show the image carousel on the homepage. When disabled, the carousel section is hidden from visitors.",
    icon: Image,
  },
  {
    key: SETTING_KEYS.ANNOUNCEMENT_BAR_ENABLED,
    label: "Announcement Bar",
    description:
      "Show the scrolling announcement bar at the top of the page. When disabled, the bar is hidden.",
    icon: Megaphone,
  },
  {
    key: SETTING_KEYS.ARTICLES_ENABLED,
    label: "Articles",
    description:
      "Show the articles section on the site. When disabled, articles are hidden from visitors.",
    icon: Newspaper,
  },
] as const;

export function SettingsClient({ settings }: SettingsClientProps) {
  const [isPending, startTransition] = useTransition();

  const [toggles, setToggles] = useState(() => {
    const map: Record<string, boolean> = {};
    for (const s of TOGGLE_SETTINGS) {
      map[s.key] = settings[s.key] === "true";
    }
    return map;
  });

  const [exchangeRate, setExchangeRate] = useState(
    settings[SETTING_KEYS.EXCHANGE_RATE] ?? "3200",
  );

  function hasChanges() {
    for (const s of TOGGLE_SETTINGS) {
      const original = settings[s.key] === "true";
      if (toggles[s.key] !== original) return true;
    }
    if (exchangeRate !== (settings[SETTING_KEYS.EXCHANGE_RATE] ?? "3200")) {
      return true;
    }
    return false;
  }

  function handleSave() {
    const rate = Number(exchangeRate);
    if (!exchangeRate.trim() || isNaN(rate) || rate <= 0) {
      toast.error("Exchange rate must be a positive number");
      return;
    }

    startTransition(async () => {
      const payload: Record<string, string> = {};
      for (const s of TOGGLE_SETTINGS) {
        payload[s.key] = String(toggles[s.key]);
      }
      payload[SETTING_KEYS.EXCHANGE_RATE] = String(rate);

      const result = await updateSettings(payload);
      if (result.success) {
        toast.success("Settings saved");
      } else {
        toast.error(result.error ?? "Failed to save settings");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Toggle settings */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TOGGLE_SETTINGS.map((setting) => {
          const Icon = setting.icon;
          const checked = toggles[setting.key];

          return (
            <Card key={setting.key} size="sm">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-lg">
                    <Icon className="size-4" />
                  </div>
                  <CardTitle>{setting.label}</CardTitle>
                </div>
                <CardAction>
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(v) =>
                      setToggles((prev) => ({
                        ...prev,
                        [setting.key]: v === true,
                      }))
                    }
                    disabled={isPending}
                  />
                </CardAction>
              </CardHeader>
              <CardContent>
                <CardDescription>{setting.description}</CardDescription>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Exchange rate */}
      <Card size="sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-lg">
              <DollarSign className="size-4" />
            </div>
            <div>
              <CardTitle>Exchange Rate</CardTitle>
              <CardDescription>
                System exchange rate used for USD to MMK conversion across the
                platform.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 max-w-sm">
            <Label htmlFor="exchange-rate" className="shrink-0">
              1 USD =
            </Label>
            <Input
              id="exchange-rate"
              type="number"
              min={1}
              step={1}
              value={exchangeRate}
              onChange={(e) => setExchangeRate(e.target.value)}
              disabled={isPending}
              className="max-w-40"
            />
            <span className="text-muted-foreground text-sm shrink-0">MMK</span>
          </div>
        </CardContent>
      </Card>

      {/* Save button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={isPending || !hasChanges()}
        >
          {isPending ? <Spinner /> : <Save className="size-4" />}
          Save Changes
        </Button>
      </div>
    </div>
  );
}
