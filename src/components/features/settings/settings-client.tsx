"use client";

import { useState, useTransition } from "react";
import {
  Image,
  Megaphone,
  Newspaper,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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
      "Show the image carousel on the homepage.",
    icon: Image,
  },
  {
    key: SETTING_KEYS.ANNOUNCEMENT_BAR_ENABLED,
    label: "Announcement Bar",
    description:
      "Show the scrolling announcement bar at the top of the page.",
    icon: Megaphone,
  },
  {
    key: SETTING_KEYS.ARTICLES_ENABLED,
    label: "Articles",
    description:
      "Show the articles section on the site.",
    icon: Newspaper,
  },
] as const;

export function SettingsClient({ settings }: SettingsClientProps) {
  const [isPending, startTransition] = useTransition();
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const [exchangeRate, setExchangeRate] = useState(
    settings[SETTING_KEYS.EXCHANGE_RATE] ?? "3200",
  );

  function handleToggle(key: string, value: boolean) {
    setPendingKey(key);
    startTransition(async () => {
      const result = await updateSettings({ [key]: String(value) });
      if (result.success) {
        toast.success("Setting updated");
      } else {
        toast.error(result.error ?? "Failed to update setting");
      }
      setPendingKey(null);
    });
  }

  function handleExchangeRateSave() {
    const rate = Number(exchangeRate);
    if (!exchangeRate.trim() || isNaN(rate) || rate <= 0) {
      toast.error("Exchange rate must be a positive number");
      return;
    }

    setPendingKey(SETTING_KEYS.EXCHANGE_RATE);
    startTransition(async () => {
      const result = await updateSettings({
        [SETTING_KEYS.EXCHANGE_RATE]: String(rate),
      });
      if (result.success) {
        toast.success("Exchange rate updated");
      } else {
        toast.error(result.error ?? "Failed to update exchange rate");
      }
      setPendingKey(null);
    });
  }

  const exchangeRateChanged =
    exchangeRate !== (settings[SETTING_KEYS.EXCHANGE_RATE] ?? "3200");

  return (
    <div className="rounded-xl border bg-card">
      {/* Feature toggles */}
      {TOGGLE_SETTINGS.map((setting, index) => {
        const Icon = setting.icon;
        const checked = settings[setting.key] === "true";
        const isThisPending = isPending && pendingKey === setting.key;

        return (
          <div key={setting.key}>
            {index > 0 && <Separator />}
            <div className="flex items-center justify-between gap-4 px-4 py-3.5">
              <div className="flex items-center gap-3 min-w-0">
                <div className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-lg">
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{setting.label}</p>
                  <p className="text-muted-foreground text-xs">
                    {setting.description}
                  </p>
                </div>
              </div>
              {isThisPending ? (
                <Spinner className="size-4" />
              ) : (
                <Switch
                  checked={checked}
                  onCheckedChange={(v) => handleToggle(setting.key, v === true)}
                  disabled={isPending}
                />
              )}
            </div>
          </div>
        );
      })}

      <Separator />

      {/* Exchange rate */}
      <div className="flex items-center justify-between gap-4 px-4 py-3.5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-lg">
            <DollarSign className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium">Exchange Rate</p>
            <p className="text-muted-foreground text-xs">
              USD to MMK conversion rate used across the platform.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Label htmlFor="exchange-rate" className="text-xs text-muted-foreground">
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
            className="w-28 text-right"
          />
          <span className="text-muted-foreground text-xs">MMK</span>
          <Button
            size="xs"
            onClick={handleExchangeRateSave}
            disabled={isPending || !exchangeRateChanged}
          >
            {pendingKey === SETTING_KEYS.EXCHANGE_RATE ? (
              <Spinner className="size-3" />
            ) : (
              "Set"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
