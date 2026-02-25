"use client";

import { useState, useTransition } from "react";
import {
  Image,
  Megaphone,
  Newspaper,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";
import { useHasPermission } from "@/hooks/use-permissions";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
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
    description: "Show the image carousel on the homepage.",
    icon: Image,
    iconColor: "text-violet-500",
    iconBg: "bg-violet-500/10",
  },
  {
    key: SETTING_KEYS.ANNOUNCEMENT_BAR_ENABLED,
    label: "Announcement Bar",
    description: "Show the scrolling announcement bar at the top of the page.",
    icon: Megaphone,
    iconColor: "text-amber-500",
    iconBg: "bg-amber-500/10",
  },
  {
    key: SETTING_KEYS.ARTICLES_ENABLED,
    label: "Articles",
    description: "Show the articles section on the site.",
    icon: Newspaper,
    iconColor: "text-blue-500",
    iconBg: "bg-blue-500/10",
  },
] as const;

export function SettingsClient({ settings }: SettingsClientProps) {
  const canEdit = useHasPermission("app_settings", "edit");
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
    <div className="flex flex-col gap-6">
      {/* Feature Toggles Section */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
          Feature Toggles
        </p>
        {TOGGLE_SETTINGS.map((setting) => {
          const Icon = setting.icon;
          const checked = settings[setting.key] === "true";
          const isThisPending = isPending && pendingKey === setting.key;

          return (
            <label
              key={setting.key}
              className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3 transition-colors hover:bg-muted/50 cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-lg",
                    setting.iconBg,
                  )}
                >
                  <Icon className={cn("size-4", setting.iconColor)} />
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
                  disabled={isPending || !canEdit}
                />
              )}
            </label>
          );
        })}
      </div>

      {/* Currency Section */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
          Currency
        </p>
        <div className="rounded-lg border px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
              <DollarSign className="size-4 text-emerald-500" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium">Exchange Rate</p>
              <p className="text-muted-foreground text-xs">
                USD to MMK conversion rate used across the platform.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3 ml-11">
            <Label htmlFor="exchange-rate" className="text-xs text-muted-foreground shrink-0">
              1 USD =
            </Label>
            <Input
              id="exchange-rate"
              type="number"
              min={1}
              step={1}
              value={exchangeRate}
              onChange={(e) => setExchangeRate(e.target.value)}
              onWheel={(e) => e.currentTarget.blur()}
              disabled={isPending || !canEdit}
              className="w-28 text-right"
            />
            <span className="text-muted-foreground text-xs shrink-0">MMK</span>
            <Button
              size="xs"
              onClick={handleExchangeRateSave}
              disabled={isPending || !exchangeRateChanged || !canEdit}
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
    </div>
  );
}
