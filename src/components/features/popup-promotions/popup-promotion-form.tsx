"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Search, X, Info } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Spinner } from "@/components/ui/spinner";
import { ImageInput } from "@/components/ui/image-input";
import { Field, FieldLabel, FieldContent } from "@/components/ui/field";
import { ROUTES } from "@/lib/constants";
import type {
  PopupPromotion,
  PopupTargetScreen,
  PopupTriggerType,
} from "@/types/popup-promotion";
import { TARGET_SCREEN_LABELS } from "@/types/popup-promotion";
import type { PopupListingOption } from "@/lib/cache";
import {
  createPopupPromotion,
  updatePopupPromotion,
} from "@/lib/actions/popup-promotion";

interface PopupPromotionFormProps {
  promotion?: PopupPromotion;
  listings: PopupListingOption[];
}

const ALL_SCREENS: PopupTargetScreen[] = ["home", "browse", "subcategory"];

export function PopupPromotionForm({
  promotion,
  listings,
}: PopupPromotionFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);
  const isEditing = !!promotion;

  const [name, setName] = useState(promotion?.name ?? "");
  const [active, setActive] = useState<boolean>(promotion?.active === 1);
  const [imageKey, setImageKey] = useState<string | null>(
    promotion?.image_url ?? null,
  );
  const [ctaLabel, setCtaLabel] = useState(promotion?.cta_label ?? "");
  const [targetScreens, setTargetScreens] = useState<PopupTargetScreen[]>(
    promotion?.target_screens ?? [],
  );
  const [triggerType, setTriggerType] = useState<PopupTriggerType>(
    promotion?.trigger_type ?? "screen_entry",
  );
  const [delaySeconds, setDelaySeconds] = useState<number>(
    promotion?.trigger_delay_seconds ?? 3,
  );
  const [scrollPercent, setScrollPercent] = useState<number>(
    promotion?.trigger_scroll_percent ?? 50,
  );
  const [linkedIds, setLinkedIds] = useState<number[]>(
    promotion?.linked_listing_ids ?? [],
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [startAt, setStartAt] = useState(promotion?.start_at ?? "");
  const [endAt, setEndAt] = useState(promotion?.end_at ?? "");

  function selectScreen(screen: PopupTargetScreen) {
    // Single-select: the active screen for this promo. To target multiple
    // screens, the admin creates a separate promo per screen (cleaner mental
    // model + each promo gets its own 2-launches-per-day budget).
    setTargetScreens([screen]);
  }

  function toggleLinkedListing(id: number) {
    setLinkedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function removeLinkedListing(id: number) {
    setLinkedIds((prev) => prev.filter((x) => x !== id));
  }

  const filteredListings = searchQuery
    ? listings.filter(
        (l) =>
          l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          l.brand_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          l.model_name?.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : [];

  const linkedListings = listings.filter((l) =>
    linkedIds.includes(l.listing_id),
  );

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    // Synthesized fields (not present as native form inputs)
    formData.set("name", name);
    formData.set("cta_label", ctaLabel);
    formData.set("trigger_type", triggerType);
    formData.set("trigger_delay_seconds", String(delaySeconds));
    formData.set("trigger_scroll_percent", String(scrollPercent));
    formData.set("start_at", startAt);
    formData.set("end_at", endAt);
    formData.set("active", active ? "1" : "0");
    formData.set("screens", targetScreens.join(","));
    formData.set("listing_ids", linkedIds.join(","));

    startTransition(async () => {
      const result = promotion
        ? await updatePopupPromotion(promotion.popup_promotion_id, formData)
        : await createPopupPromotion(formData);

      if (result.success) {
        toast.success(promotion ? "Promotion updated" : "Promotion created");
        router.push(ROUTES.POPUP_PROMOTIONS);
        router.refresh();
      } else {
        toast.error(result.error ?? "Save failed");
      }
    });
  }

  const submitDisabled = isPending || isUploading;

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-24">
      {/* Top bar with back button and active toggle */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => router.push(ROUTES.POPUP_PROMOTIONS)}
          >
            <ArrowLeft className="size-4" />
            Back
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">
            {isEditing ? "Edit Popup Promotion" : "New Popup Promotion"}
          </h1>
        </div>
        <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-2">
          <Label htmlFor="active-toggle" className="text-sm font-medium">
            {active ? "Active" : "Inactive"}
          </Label>
          <Switch
            id="active-toggle"
            checked={active}
            onCheckedChange={setActive}
          />
        </div>
      </div>

      {/* Section: Promotion name */}
      <section className="rounded-xl border bg-card p-6">
        <Field orientation="vertical">
          <FieldLabel>Promotion name (internal)</FieldLabel>
          <FieldContent>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Lunar New Year Sale 2026"
              maxLength={120}
            />
            <p className="text-xs text-muted-foreground">
              Internal label only — never shown to mobile app users.
            </p>
          </FieldContent>
        </Field>
      </section>

      {/* Section 1: Popup Design */}
      <section className="rounded-xl border bg-card p-6">
        <div className="mb-5">
          <h2 className="text-base font-semibold">1. Popup design</h2>
          <p className="text-sm text-muted-foreground">
            Image-only popup. The image IS the ad — design it with all text and
            branding included.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-[280px_1fr]">
          <div>
            <Label className="mb-2 block text-sm font-medium">Popup image</Label>
            <ImageInput
              name="image"
              value={imageKey}
              onChange={setImageKey}
              feature="popup_promotions"
              permission={isEditing ? "edit" : "create"}
              onUploadingChange={setIsUploading}
              aspectRatio={3 / 4}
              aspectClassName="aspect-[3/4]"
              placeholder="Upload popup image"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              3:4 ratio recommended. PNG or JPG.
            </p>
          </div>

          <div className="space-y-4">
            <Field orientation="vertical">
              <FieldLabel>CTA button label</FieldLabel>
              <FieldContent>
                <Input
                  value={ctaLabel}
                  onChange={(e) => setCtaLabel(e.target.value)}
                  placeholder="e.g. Shop Now, View Deals, Learn More"
                  maxLength={32}
                />
                <p className="text-xs text-muted-foreground">
                  Tapping this button takes the user to a promotion landing page
                  showing all linked products (configured below).
                </p>
              </FieldContent>
            </Field>
          </div>
        </div>
      </section>

      {/* Section 2: Targeting */}
      <section className="rounded-xl border bg-card p-6">
        <div className="mb-5">
          <h2 className="text-base font-semibold">
            2. Where to show this popup
          </h2>
          <p className="text-sm text-muted-foreground">
            Pick the screen this popup appears on. To target multiple
            screens, create a separate promo for each.
          </p>
        </div>

        <div
          role="radiogroup"
          aria-label="Target screen"
          className="flex flex-wrap gap-2"
        >
          {ALL_SCREENS.map((screen) => {
            const selected = targetScreens[0] === screen;
            return (
              <button
                type="button"
                role="radio"
                aria-checked={selected}
                key={screen}
                onClick={() => selectScreen(screen)}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                  selected
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-foreground hover:bg-muted",
                )}
              >
                {selected && "✓ "}
                {TARGET_SCREEN_LABELS[screen]}
              </button>
            );
          })}
        </div>
      </section>

      {/* Section 3: Trigger */}
      <section className="rounded-xl border bg-card p-6">
        <div className="mb-5">
          <h2 className="text-base font-semibold">3. When to show this popup</h2>
          <p className="text-sm text-muted-foreground">
            Pick how the popup is triggered.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <TriggerCard
            selected={triggerType === "screen_entry"}
            onClick={() => setTriggerType("screen_entry")}
            title="On screen entry"
            description="Fires when the user lands on the screen."
          >
            {triggerType === "screen_entry" && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                    Delay
                  </Label>
                  <span className="text-sm font-semibold tabular-nums">
                    {delaySeconds}s
                  </span>
                </div>
                <Slider
                  min={0}
                  max={30}
                  step={1}
                  value={[delaySeconds]}
                  onValueChange={(v) => setDelaySeconds(v[0])}
                />
                <p className="text-xs text-muted-foreground">
                  0s = immediate. Recommended: 2–5s so the user sees the page
                  first.
                </p>
              </div>
            )}
          </TriggerCard>

          <TriggerCard
            selected={triggerType === "scroll"}
            onClick={() => setTriggerType("scroll")}
            title="On scroll"
            description="Fires after the user scrolls past N% of the screen."
          >
            {triggerType === "scroll" && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                    Scroll position
                  </Label>
                  <span className="text-sm font-semibold tabular-nums">
                    {scrollPercent}%
                  </span>
                </div>
                <Slider
                  min={10}
                  max={90}
                  step={5}
                  value={[scrollPercent]}
                  onValueChange={(v) => setScrollPercent(v[0])}
                />
                <p className="text-xs text-muted-foreground">
                  Recommended: 40–60% — engaged users who scroll past the fold.
                </p>
              </div>
            )}
          </TriggerCard>
        </div>
      </section>

      {/* Section 4: Linked Listings */}
      <section className="rounded-xl border bg-card p-6">
        <div className="mb-5">
          <h2 className="text-base font-semibold">4. Linked products</h2>
          <p className="text-sm text-muted-foreground">
            Tapping the CTA opens a landing page that shows these products as a
            grid.
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-3 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search listings by title, brand, or model..."
            className="pl-9"
          />
        </div>

        {/* Search results */}
        {searchQuery && (
          <div className="mb-4 max-h-60 overflow-auto rounded-lg border bg-background">
            {filteredListings.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">
                No listings match your search.
              </div>
            ) : (
              <ul className="divide-y">
                {filteredListings.map((l) => {
                  const checked = linkedIds.includes(l.listing_id);
                  return (
                    <li key={l.listing_id}>
                      <button
                        type="button"
                        onClick={() => toggleLinkedListing(l.listing_id)}
                        className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm hover:bg-muted"
                      >
                        <div>
                          <div className="font-medium">{l.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {l.brand_name} · {l.model_name}
                          </div>
                        </div>
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                            checked
                              ? "bg-primary text-primary-foreground"
                              : "border bg-background text-muted-foreground",
                          )}
                        >
                          {checked ? "✓ Added" : "+ Add"}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {/* Selected chips */}
        <div className="rounded-lg border bg-muted/40 p-3">
          {linkedListings.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No products linked yet. Use the search above to add products.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {linkedListings.map((l) => (
                <div
                  key={l.listing_id}
                  className="flex items-center gap-2 rounded-md border bg-background px-2.5 py-1 text-xs"
                >
                  <span className="font-medium">{l.title}</span>
                  <button
                    type="button"
                    onClick={() => removeLinkedListing(l.listing_id)}
                    className="rounded p-0.5 hover:bg-muted"
                    aria-label={`Remove ${l.title}`}
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
              <p className="ml-auto self-center text-xs text-muted-foreground">
                {linkedListings.length} product
                {linkedListings.length === 1 ? "" : "s"} linked
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Section 5: Schedule */}
      <section className="rounded-xl border bg-card p-6">
        <div className="mb-5">
          <h2 className="text-base font-semibold">5. Schedule</h2>
          <p className="text-sm text-muted-foreground">
            Promotion auto-activates between these dates. Outside this range the
            popup will not show even if &quot;Active&quot; is on. Leave blank
            for no schedule limit.
          </p>
        </div>

        <div className="grid max-w-xl gap-4 md:grid-cols-2">
          <Field orientation="vertical">
            <FieldLabel>Start</FieldLabel>
            <FieldContent>
              <Input
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
              />
            </FieldContent>
          </Field>
          <Field orientation="vertical">
            <FieldLabel>End</FieldLabel>
            <FieldContent>
              <Input
                type="datetime-local"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
              />
            </FieldContent>
          </Field>
        </div>
      </section>

      {/* Hard-coded rules info banner */}
      <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
        <div className="flex gap-3">
          <Info className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="space-y-1.5 text-sm text-amber-900 dark:text-amber-200">
            <p className="font-medium">Built-in rules (not configurable)</p>
            <ul className="ml-4 list-disc space-y-1 text-[13px]">
              <li>
                Each promotion shows max <strong>2 times per day</strong> per
                user.
              </li>
              <li>
                If the user taps the CTA button → that promotion is{" "}
                <strong>never shown again</strong> to that user.
              </li>
              <li>
                If multiple promotions are eligible on the same screen, they
                appear as a <strong>swipable carousel</strong>.
              </li>
              <li>
                Tracking stored locally on each device (no analytics dashboard).
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Sticky footer */}
      <div className="fixed bottom-0 left-[var(--sidebar-width,16rem)] right-0 z-10 flex items-center justify-end gap-2 border-t bg-background/95 px-6 py-3 backdrop-blur">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(ROUTES.POPUP_PROMOTIONS)}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={submitDisabled}>
          {isPending && <Spinner className="size-4" />}
          {isEditing ? "Update promotion" : "Create promotion"}
        </Button>
      </div>
    </form>
  );
}

interface TriggerCardProps {
  selected: boolean;
  onClick: () => void;
  title: string;
  description: string;
  children?: React.ReactNode;
}

function TriggerCard({
  selected,
  onClick,
  title,
  description,
  children,
}: TriggerCardProps) {
  return (
    <div
      className={cn(
        "cursor-pointer rounded-xl border p-4 transition-colors",
        selected
          ? "border-primary bg-primary/5"
          : "border-border bg-background hover:bg-muted/50",
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-2.5">
        <div
          className={cn(
            "flex size-4 shrink-0 items-center justify-center rounded-full border-2",
            selected ? "border-primary" : "border-muted-foreground/40",
          )}
        >
          {selected && <div className="size-2 rounded-full bg-primary" />}
        </div>
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <p className="mt-1 ml-6 text-xs text-muted-foreground">{description}</p>
      <div className="ml-6">{children}</div>
    </div>
  );
}
