"use client";

import { useState, useTransition } from "react";
import {
  Image,
  Megaphone,
  Newspaper,
  DollarSign,
  Phone,
  Mail,
  UserCircle2,
  Smartphone,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useHasPermission } from "@/hooks/use-permissions";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { updateSettings } from "@/lib/actions/setting";
import { SETTING_KEYS, READONLY_SETTING_KEYS } from "@/types/setting";

interface AdminOption {
  user_id: number;
  username: string;
}

interface SettingsClientProps {
  settings: Record<string, string>;
  admins: AdminOption[];
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

const APP_VERSION_KEYS = [
  SETTING_KEYS.IOS_LATEST_BUILD,
  SETTING_KEYS.IOS_MIN_BUILD,
  SETTING_KEYS.IOS_STORE_URL,
  SETTING_KEYS.ANDROID_LATEST_BUILD,
  SETTING_KEYS.ANDROID_MIN_BUILD,
  SETTING_KEYS.ANDROID_STORE_URL,
  SETTING_KEYS.UPDATE_MESSAGE_EN,
  SETTING_KEYS.UPDATE_MESSAGE_MY,
] as const;

type AppVersionKey = (typeof APP_VERSION_KEYS)[number];

const APP_VERSION_PLATFORMS: {
  name: string;
  latestKey: AppVersionKey;
  minKey: AppVersionKey;
  urlKey: AppVersionKey;
  urlPlaceholder: string;
}[] = [
  {
    name: "iOS",
    latestKey: SETTING_KEYS.IOS_LATEST_BUILD,
    minKey: SETTING_KEYS.IOS_MIN_BUILD,
    urlKey: SETTING_KEYS.IOS_STORE_URL,
    urlPlaceholder: "https://apps.apple.com/...",
  },
  {
    name: "Android",
    latestKey: SETTING_KEYS.ANDROID_LATEST_BUILD,
    minKey: SETTING_KEYS.ANDROID_MIN_BUILD,
    urlKey: SETTING_KEYS.ANDROID_STORE_URL,
    urlPlaceholder: "https://play.google.com/store/apps/details?id=...",
  },
];

export function SettingsClient({ settings, admins }: SettingsClientProps) {
  const canEdit = useHasPermission("app_settings", "edit");
  const [isPending, startTransition] = useTransition();
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [exchangeRate, setExchangeRate] = useState(
    settings[SETTING_KEYS.EXCHANGE_RATE] ?? "3200",
  );
  const [contactPhone, setContactPhone] = useState(
    settings[SETTING_KEYS.CONTACT_PHONE] ?? "",
  );
  const [contactEmails, setContactEmails] = useState({
    info: settings[SETTING_KEYS.CONTACT_EMAIL_INFO] ?? "",
    support: settings[SETTING_KEYS.CONTACT_EMAIL_SUPPORT] ?? "",
    sales: settings[SETTING_KEYS.CONTACT_EMAIL_SALES] ?? "",
    privacy: settings[SETTING_KEYS.CONTACT_EMAIL_PRIVACY] ?? "",
  });
  const [welcomeAdminId, setWelcomeAdminId] = useState(
    settings[SETTING_KEYS.CHAT_WELCOME_ADMIN_ID] ?? "",
  );
  const [appVersions, setAppVersions] = useState<Record<AppVersionKey, string>>(
    () =>
      Object.fromEntries(
        APP_VERSION_KEYS.map((key) => [key, settings[key] ?? ""]),
      ) as Record<AppVersionKey, string>,
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

  function handleContactPhoneSave() {
    if (!contactPhone.trim()) {
      toast.error("Phone number is required");
      return;
    }

    setPendingKey(SETTING_KEYS.CONTACT_PHONE);
    startTransition(async () => {
      const result = await updateSettings({
        [SETTING_KEYS.CONTACT_PHONE]: contactPhone.trim(),
      });
      if (result.success) {
        toast.success("Contact phone updated");
      } else {
        toast.error(result.error ?? "Failed to update contact phone");
      }
      setPendingKey(null);
    });
  }

  function handleEmailSave(
    key: typeof SETTING_KEYS.CONTACT_EMAIL_INFO
      | typeof SETTING_KEYS.CONTACT_EMAIL_SUPPORT
      | typeof SETTING_KEYS.CONTACT_EMAIL_SALES
      | typeof SETTING_KEYS.CONTACT_EMAIL_PRIVACY,
    value: string,
  ) {
    const trimmed = value.trim();
    if (!trimmed) {
      toast.error("Email is required");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error("Invalid email address");
      return;
    }

    setPendingKey(key);
    startTransition(async () => {
      const result = await updateSettings({ [key]: trimmed });
      if (result.success) {
        toast.success("Email updated");
      } else {
        toast.error(result.error ?? "Failed to update email");
      }
      setPendingKey(null);
    });
  }

  function handleWelcomeAdminChange(value: string) {
    setWelcomeAdminId(value);
    setPendingKey(SETTING_KEYS.CHAT_WELCOME_ADMIN_ID);
    startTransition(async () => {
      const result = await updateSettings({
        [SETTING_KEYS.CHAT_WELCOME_ADMIN_ID]: value,
      });
      if (result.success) {
        toast.success("Chat welcome admin updated");
      } else {
        toast.error(result.error ?? "Failed to update chat welcome admin");
      }
      setPendingKey(null);
    });
  }

  function setAppVersionField(key: AppVersionKey, value: string) {
    setAppVersions((prev) => ({ ...prev, [key]: value }));
  }

  function handleAppVersionsSave() {
    // Build fields: empty = rule off; non-empty must be a positive integer.
    for (const platform of APP_VERSION_PLATFORMS) {
      for (const { key, label } of [
        { key: platform.latestKey, label: `${platform.name} latest build` },
        { key: platform.minKey, label: `${platform.name} minimum build` },
      ]) {
        const value = appVersions[key].trim();
        if (value && (!/^\d+$/.test(value) || Number(value) <= 0)) {
          toast.error(`${label} must be a positive whole number`);
          return;
        }
      }
    }

    setPendingKey("app_versions");
    startTransition(async () => {
      const payload = Object.fromEntries(
        APP_VERSION_KEYS.map((key) => [key, appVersions[key].trim()]),
      );
      const result = await updateSettings(payload);
      if (result.success) {
        toast.success("App versions updated");
        setAppVersions(
          Object.fromEntries(
            APP_VERSION_KEYS.map((key) => [key, payload[key] ?? ""]),
          ) as Record<AppVersionKey, string>,
        );
      } else {
        toast.error(result.error ?? "Failed to update app versions");
      }
      setPendingKey(null);
    });
  }

  const exchangeRateChanged =
    exchangeRate !== (settings[SETTING_KEYS.EXCHANGE_RATE] ?? "3200");
  const contactPhoneChanged =
    contactPhone !== (settings[SETTING_KEYS.CONTACT_PHONE] ?? "");
  const appVersionsChanged = APP_VERSION_KEYS.some(
    (key) => appVersions[key] !== (settings[key] ?? ""),
  );
  const iosStoreVersionName =
    settings[READONLY_SETTING_KEYS.IOS_STORE_VERSION_NAME];

  const EMAIL_FIELDS: {
    key:
      | typeof SETTING_KEYS.CONTACT_EMAIL_INFO
      | typeof SETTING_KEYS.CONTACT_EMAIL_SUPPORT
      | typeof SETTING_KEYS.CONTACT_EMAIL_SALES
      | typeof SETTING_KEYS.CONTACT_EMAIL_PRIVACY;
    field: keyof typeof contactEmails;
    label: string;
    description: string;
    placeholder: string;
  }[] = [
    {
      key: SETTING_KEYS.CONTACT_EMAIL_INFO,
      field: "info",
      label: "General Inquiries",
      description: "Shown on the About page for general contact.",
      placeholder: "info@shweloader.com.mm",
    },
    {
      key: SETTING_KEYS.CONTACT_EMAIL_SUPPORT,
      field: "support",
      label: "Account Support",
      description: "Used when a suspended user taps Contact Support.",
      placeholder: "support@shweloader.com.mm",
    },
    {
      key: SETTING_KEYS.CONTACT_EMAIL_SALES,
      field: "sales",
      label: "Sales / Parent Company",
      description: "Shown in the VMSN block on the home screen.",
      placeholder: "sales@shweloader.com.mm",
    },
    {
      key: SETTING_KEYS.CONTACT_EMAIL_PRIVACY,
      field: "privacy",
      label: "Privacy Requests",
      description: "Shown in the Privacy Policy page.",
      placeholder: "privacy@shweloader.com.mm",
    },
  ];

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

      {/* Contact Section */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
          Contact
        </p>
        <div className="rounded-lg border px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sky-500/10">
              <Phone className="size-4 text-sky-500" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium">Phone Number</p>
              <p className="text-muted-foreground text-xs">
                Contact phone number shown in the mobile app.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3 ml-11">
            <Input
              id="contact-phone"
              type="tel"
              placeholder="+959xxxxxxxxx"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              disabled={isPending || !canEdit}
              className="w-44"
            />
            <Button
              size="xs"
              onClick={handleContactPhoneSave}
              disabled={isPending || !contactPhoneChanged || !canEdit}
            >
              {pendingKey === SETTING_KEYS.CONTACT_PHONE ? (
                <Spinner className="size-3" />
              ) : settings[SETTING_KEYS.CONTACT_PHONE] ? (
                "Update"
              ) : (
                "Add"
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Contact Emails Section */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
          Contact Emails
        </p>
        <div className="rounded-lg border divide-y">
          {EMAIL_FIELDS.map((f) => {
            const current = settings[f.key] ?? "";
            const changed = contactEmails[f.field] !== current;
            return (
              <div key={f.key} className="px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10">
                    <Mail className="size-4 text-indigo-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{f.label}</p>
                    <p className="text-muted-foreground text-xs">
                      {f.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3 ml-11">
                  <Input
                    id={`email-${f.field}`}
                    type="email"
                    placeholder={f.placeholder}
                    value={contactEmails[f.field]}
                    onChange={(e) =>
                      setContactEmails((prev) => ({
                        ...prev,
                        [f.field]: e.target.value,
                      }))
                    }
                    disabled={isPending || !canEdit}
                    className="w-72"
                  />
                  <Button
                    size="xs"
                    onClick={() => handleEmailSave(f.key, contactEmails[f.field])}
                    disabled={isPending || !changed || !canEdit}
                  >
                    {pendingKey === f.key ? (
                      <Spinner className="size-3" />
                    ) : current ? (
                      "Update"
                    ) : (
                      "Add"
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chat Section */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
          Chat
        </p>
        <div className="rounded-lg border px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-rose-500/10">
              <UserCircle2 className="size-4 text-rose-500" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium">Welcome Face</p>
              <p className="text-muted-foreground text-xs">
                The admin whose name and avatar appear on the chat welcome
                message. Falls back to the super admin if unset.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3 ml-11">
            <Select
              value={welcomeAdminId || undefined}
              onValueChange={handleWelcomeAdminChange}
              disabled={isPending || !canEdit}
            >
              <SelectTrigger className="w-56">
                <SelectValue placeholder="(Super admin — default)" />
              </SelectTrigger>
              <SelectContent>
                {admins.map((a) => (
                  <SelectItem key={a.user_id} value={String(a.user_id)}>
                    {a.username}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {pendingKey === SETTING_KEYS.CHAT_WELCOME_ADMIN_ID ? (
              <Spinner className="size-4" />
            ) : null}
          </div>
        </div>
      </div>

      {/* App Versions Section */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
          App Versions
        </p>
        <div className="rounded-lg border px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-teal-500/10">
              <Smartphone className="size-4 text-teal-500" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium">App Versions</p>
              <p className="text-muted-foreground text-xs">
                Controls the in-app update prompt. Latest = dismissible nudge,
                Minimum = forced update. Leave blank to disable.
              </p>
            </div>
          </div>
          <div className="mt-3 ml-11 flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {APP_VERSION_PLATFORMS.map((platform) => (
                <div key={platform.name} className="flex flex-col gap-2">
                  <p className="text-xs font-semibold text-muted-foreground">
                    {platform.name}
                  </p>
                  {platform.name === "iOS" && iosStoreVersionName ? (
                    <p className="text-muted-foreground text-xs">
                      App Store is currently serving: {iosStoreVersionName}
                    </p>
                  ) : null}
                  <div className="flex items-center gap-2">
                    <Label
                      htmlFor={`${platform.latestKey}-input`}
                      className="text-xs text-muted-foreground w-24 shrink-0"
                    >
                      Latest build
                    </Label>
                    <Input
                      id={`${platform.latestKey}-input`}
                      type="text"
                      inputMode="numeric"
                      placeholder="e.g. 12"
                      value={appVersions[platform.latestKey]}
                      onChange={(e) =>
                        setAppVersionField(platform.latestKey, e.target.value)
                      }
                      disabled={isPending || !canEdit}
                      className="w-28"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label
                      htmlFor={`${platform.minKey}-input`}
                      className="text-xs text-muted-foreground w-24 shrink-0"
                    >
                      Minimum build
                    </Label>
                    <Input
                      id={`${platform.minKey}-input`}
                      type="text"
                      inputMode="numeric"
                      placeholder="e.g. 10"
                      value={appVersions[platform.minKey]}
                      onChange={(e) =>
                        setAppVersionField(platform.minKey, e.target.value)
                      }
                      disabled={isPending || !canEdit}
                      className="w-28"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label
                      htmlFor={`${platform.urlKey}-input`}
                      className="text-xs text-muted-foreground w-24 shrink-0"
                    >
                      Store URL
                    </Label>
                    <Input
                      id={`${platform.urlKey}-input`}
                      type="url"
                      placeholder={platform.urlPlaceholder}
                      value={appVersions[platform.urlKey]}
                      onChange={(e) =>
                        setAppVersionField(platform.urlKey, e.target.value)
                      }
                      disabled={isPending || !canEdit}
                      className="min-w-0 flex-1"
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor="update-message-en"
                  className="text-xs text-muted-foreground"
                >
                  Update message (English)
                </Label>
                <Textarea
                  id="update-message-en"
                  placeholder="Optional — custom prompt copy. Blank uses the app's default."
                  value={appVersions[SETTING_KEYS.UPDATE_MESSAGE_EN]}
                  onChange={(e) =>
                    setAppVersionField(
                      SETTING_KEYS.UPDATE_MESSAGE_EN,
                      e.target.value,
                    )
                  }
                  disabled={isPending || !canEdit}
                  rows={2}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor="update-message-my"
                  className="text-xs text-muted-foreground"
                >
                  Update message (Burmese)
                </Label>
                <Textarea
                  id="update-message-my"
                  placeholder="Optional — custom prompt copy. Blank uses the app's default."
                  value={appVersions[SETTING_KEYS.UPDATE_MESSAGE_MY]}
                  onChange={(e) =>
                    setAppVersionField(
                      SETTING_KEYS.UPDATE_MESSAGE_MY,
                      e.target.value,
                    )
                  }
                  disabled={isPending || !canEdit}
                  rows={2}
                />
              </div>
            </div>
            <div>
              <Button
                size="xs"
                onClick={handleAppVersionsSave}
                disabled={isPending || !appVersionsChanged || !canEdit}
              >
                {pendingKey === "app_versions" ? (
                  <Spinner className="size-3" />
                ) : (
                  "Save"
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
