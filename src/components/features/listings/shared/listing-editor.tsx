"use client";

import { lazy, Suspense, useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import {
  Layers,
  Package,
  CircleDollarSign,
  Camera,
  FileText,
  ChevronRight,
  ArrowUpDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { ImageInput } from "@/components/ui/image-input";
import { MarkdownEditor } from "@/components/ui/markdown-editor";
import { FormSubmittedContext } from "@/components/ui/required-input";
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
  ComboboxCollection,
} from "@/components/ui/combobox";
import {
  createListing,
  updateSaleListing,
  updateRentListing,
} from "@/lib/actions/listing";
import type {
  SaleListingWithDetails,
  RentListingWithDetails,
  ProductImage,
  ApprovedPartner,
  ConditionType,
} from "@/types/listing";
import type { EquipmentModel } from "@/types/equipment";
import type { AttachmentModel } from "@/types/attachment";
import type { Location } from "@/types/location";
import type {
  CustomFieldTemplateWithFields,
  CustomFieldValue,
} from "@/types/custom-field";
import { CustomFieldsSection } from "./custom-fields-section";

const LazySortableImageGallery = lazy(() =>
  import("@/components/shared/sortable-image-gallery").then((mod) => ({
    default: mod.SortableImageGallery,
  })),
);

// ─── Types ───────────────────────────────────────────────────────────────────

type ListingDetails = SaleListingWithDetails | RentListingWithDetails;

interface ListingEditorProps {
  pageType: "sale" | "rent";
  listing?: ListingDetails;
  existingImages?: ProductImage[];
  partners: ApprovedPartner[];
  equipmentModels: EquipmentModel[];
  attachmentModels: AttachmentModel[];
  locations: Location[];
  conditionTypes: ConditionType[];
  exchangeRate: number;
  templates?: CustomFieldTemplateWithFields[];
}

// ─── Reusable pieces ─────────────────────────────────────────────────────────

function SectionHeader({
  icon,
  iconColor,
  title,
}: {
  icon: React.ReactNode;
  iconColor: string;
  title: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          "flex size-8 items-center justify-center rounded-lg",
          iconColor,
        )}
      >
        {icon}
      </div>
      <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
    </div>
  );
}

function SegmentedPill({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="bg-muted/80 inline-flex rounded-full p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "rounded-full px-5 py-1.5 text-sm font-medium transition-all duration-200",
            value === opt.value
              ? "bg-foreground text-background shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function CheckCard({
  checked,
  onToggle,
  label,
  children,
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      onClick={onToggle}
      className={cn(
        "flex cursor-pointer select-none items-center justify-between rounded-xl border-2 px-4 py-3 transition-all duration-200",
        checked
          ? "border-primary/40 bg-primary/5"
          : "border-transparent bg-muted/40 hover:bg-muted/60",
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex size-[18px] shrink-0 items-center justify-center rounded-[5px] border-2 transition-all duration-200",
            checked
              ? "border-primary bg-primary"
              : "border-muted-foreground/30",
          )}
        >
          {checked && (
            <svg
              className="text-primary-foreground size-3"
              viewBox="0 0 12 12"
              fill="none"
            >
              <path
                d="M2.5 6L5 8.5L9.5 3.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </span>
        <span className="text-sm font-medium">{label}</span>
      </div>
      {children}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function ListingEditor({
  pageType,
  listing,
  existingImages = [],
  partners,
  equipmentModels,
  attachmentModels,
  locations,
  conditionTypes,
  exchangeRate,
  templates = [],
}: ListingEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);
  const isEditing = !!listing;
  const backUrl =
    pageType === "sale" ? "/listings/for-sale" : "/listings/for-rent";

  // ── Classification state ────────────────────────────────────────────────

  const defaultProductType = listing?.equipment_model_id
    ? "equipment"
    : "attachment";
  const [productType, setProductType] = useState<"equipment" | "attachment">(
    defaultProductType,
  );
  const [forSale, setForSale] = useState(
    isEditing ? pageType === "sale" : pageType === "sale",
  );
  const [forRent, setForRent] = useState(
    isEditing ? pageType === "rent" : pageType === "rent",
  );

  // ── Product info state ──────────────────────────────────────────────────

  const initPartnerLabel = useMemo(() => {
    if (!listing) return "";
    const partner = partners.find((p) => p.id === listing.partner_id);
    if (!partner) return "";
    return partner.company_name
      ? `${partner.customer_name} (${partner.company_name})`
      : partner.customer_name;
  }, [listing, partners]);

  const [selectedPartner, setSelectedPartner] =
    useState<string>(initPartnerLabel);
  const [selectedModel, setSelectedModel] = useState<string>(
    listing?.model_name ?? "",
  );
  const [selectedLocation, setSelectedLocation] = useState<string>(
    listing?.location_name ?? "",
  );

  // ── Media state ─────────────────────────────────────────────────────────

  const [imageUrls, setImageUrls] = useState<string[]>(
    existingImages.length > 0 ? existingImages.map((img) => img.url) : [],
  );
  const [thumbnail, setThumbnail] = useState<string | null>(
    listing?.thumbnail_url ?? null,
  );

  // ── Price state ─────────────────────────────────────────────────────────

  const [usdPrice, setUsdPrice] = useState<string>(
    listing?.usd_price?.toString() ?? "",
  );
  const [mmkPrice, setMmkPrice] = useState<string>(
    listing?.mmk_price?.toString() ?? "",
  );
  const [useSystemRate, setUseSystemRate] = useState(true);
  const [customRate, setCustomRate] = useState<string>(String(exchangeRate));

  function handleUsdChange(value: string) {
    setUsdPrice(value);
    const usd = parseFloat(value);
    if (!isNaN(usd) && usd > 0) {
      const rate = useSystemRate
        ? exchangeRate
        : parseFloat(customRate) || 0;
      setMmkPrice(String(Math.round(usd * rate)));
    }
  }

  function handleRateToggle(system: boolean) {
    setUseSystemRate(system);
    const usd = parseFloat(usdPrice);
    if (!isNaN(usd) && usd > 0) {
      const rate = system ? exchangeRate : parseFloat(customRate) || 0;
      setMmkPrice(String(Math.round(usd * rate)));
    }
  }

  function handleCustomRateChange(value: string) {
    setCustomRate(value);
    const usd = parseFloat(usdPrice);
    const rate = parseFloat(value) || 0;
    if (!isNaN(usd) && usd > 0 && rate > 0) {
      setMmkPrice(String(Math.round(usd * rate)));
    }
  }

  // ── Lookup maps ─────────────────────────────────────────────────────────

  const partnerMap = useMemo(
    () =>
      new Map(
        partners.map((p) => {
          const label = p.company_name
            ? `${p.customer_name} (${p.company_name})`
            : p.customer_name;
          return [label, p.id];
        }),
      ),
    [partners],
  );

  const equipmentModelMap = useMemo(
    () => new Map(equipmentModels.map((m) => [m.name, m.model_id])),
    [equipmentModels],
  );

  const attachmentModelMap = useMemo(
    () => new Map(attachmentModels.map((m) => [m.name, m.model_id])),
    [attachmentModels],
  );

  const locationMap = useMemo(
    () => new Map(locations.map((l) => [l.city_name, l.location_id])),
    [locations],
  );

  const partnerNames = useMemo(
    () => Array.from(partnerMap.keys()),
    [partnerMap],
  );
  const modelNames = useMemo(
    () =>
      productType === "equipment"
        ? equipmentModels.map((m) => m.name)
        : attachmentModels.map((m) => m.name),
    [productType, equipmentModels, attachmentModels],
  );
  const locationNames = useMemo(
    () => locations.map((l) => l.city_name),
    [locations],
  );

  // ── Custom fields state ────────────────────────────────────────────────

  const [customFieldValues, setCustomFieldValues] = useState<
    CustomFieldValue[]
  >(() => {
    if (!listing?.custom_fields) return [];
    try {
      return JSON.parse(listing.custom_fields) as CustomFieldValue[];
    } catch {
      return [];
    }
  });

  const saleDefaults =
    listing && "condition_type_id" in listing ? listing : null;
  const [conditionId, setConditionId] = useState<string>(
    saleDefaults?.condition_type_id?.toString() ?? "",
  );

  // ── Form submission ─────────────────────────────────────────────────────

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitted(true);

    const partnerId = partnerMap.get(selectedPartner);
    if (!partnerId) {
      toast.error("Please select a partner");
      return;
    }
    const modelMap =
      productType === "equipment" ? equipmentModelMap : attachmentModelMap;
    const modelId = modelMap.get(selectedModel);
    if (!modelId) {
      toast.error("Please select a model");
      return;
    }
    if (!isEditing && !forSale && !forRent) {
      toast.error("Select at least one listing type");
      return;
    }

    const formData = new FormData(e.currentTarget);
    const locationId = locationMap.get(selectedLocation);

    formData.set("product_type", productType);
    formData.set("partner_id", String(partnerId));
    formData.set("model_id", String(modelId));
    if (locationId) formData.set("location_id", String(locationId));
    formData.set("usd_price", usdPrice || "");
    formData.set("mmk_price", mmkPrice || "0");
    formData.set("for_sale", forSale ? "1" : "0");
    formData.set("for_rent", forRent ? "1" : "0");
    formData.set("is_hidden", "0");
    formData.set("hide_price", "0");
    formData.set("hide_partner", "0");
    formData.set("add_to_featured", "0");
    if (forSale && conditionId) {
      formData.set("condition_type_id", conditionId);
    }
    if (customFieldValues.length > 0) {
      formData.set("custom_fields", JSON.stringify(customFieldValues));
    }

    imageUrls.forEach((url, i) => {
      formData.set(`image_url_${i}`, url);
    });

    startTransition(async () => {
      let result;
      if (isEditing) {
        result =
          pageType === "sale"
            ? await updateSaleListing(listing!.id, formData)
            : await updateRentListing(listing!.id, formData);
      } else {
        result = await createListing(formData);
      }

      if (result.success) {
        toast.success(isEditing ? "Listing updated" : "Listing created");
        router.push(backUrl);
      } else {
        toast.error(result.error ?? "Something went wrong");
      }
    });
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      className="-m-6 flex min-h-0 flex-1 flex-col"
    >
      <FormSubmittedContext value={submitted}>
        {/* ── Sticky Header ─────────────────────────────────────── */}
        <header className="bg-background/80 sticky top-0 z-10 border-b px-6 py-3 backdrop-blur-sm">
          <nav className="text-muted-foreground mb-1 flex items-center gap-1 text-xs">
            <Link
              href={backUrl}
              className="hover:text-foreground transition-colors"
            >
              {pageType === "sale" ? "For Sale" : "For Rent"}
            </Link>
            <ChevronRight className="size-3 opacity-40" />
            <span className="text-foreground font-medium">
              {isEditing ? (listing?.custom_id ?? "Edit") : "New"}
            </span>
          </nav>
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold tracking-tight">
              {isEditing ? "Edit Listing" : "New Listing"}
            </h1>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isPending}
                onClick={() => router.push(backUrl)}
              >
                Discard
              </Button>
              <Button type="submit" size="sm" disabled={isPending}>
                {isPending ? (
                  <>
                    <Spinner className="mr-1" /> Saving{"\u2026"}
                  </>
                ) : isEditing ? (
                  "Save"
                ) : (
                  "Create"
                )}
              </Button>
            </div>
          </div>
        </header>

        {/* ── Scrollable Body ───────────────────────────────────── */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-2xl space-y-10 px-6 py-8">
            {/* ────────────────────────────────────────────────────
                1. CLASSIFICATION
               ──────────────────────────────────────────────────── */}
            <section className="space-y-5">
              <SectionHeader
                icon={<Layers className="size-4 text-amber-500" />}
                iconColor="bg-amber-500/10"
                title="Classification"
              />

              {/* Product Type */}
              <div>
                <p className="text-muted-foreground mb-2.5 text-xs font-medium uppercase tracking-wider">
                  Product Type
                </p>
                <SegmentedPill
                  options={[
                    { label: "Equipment", value: "equipment" },
                    { label: "Attachment", value: "attachment" },
                  ]}
                  value={productType}
                  onChange={(val) => {
                    setProductType(val as "equipment" | "attachment");
                    setSelectedModel("");
                  }}
                />
              </div>

              {/* Listing Type — create only */}
              {!isEditing && (
                <div>
                  <p className="text-muted-foreground mb-2.5 text-xs font-medium uppercase tracking-wider">
                    Listing Type
                  </p>
                  <div className="space-y-2">
                    <CheckCard
                      checked={forSale}
                      onToggle={() => setForSale(!forSale)}
                      label="For Sale"
                    />

                    {/* Condition — connected below For Sale */}
                    {forSale && conditionTypes.length > 0 && (
                      <div className="ml-9 space-y-1.5">
                        <p className="text-muted-foreground text-xs font-medium">
                          Condition
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {conditionTypes.map((ct) => (
                            <button
                              key={ct.id}
                              type="button"
                              onClick={() => setConditionId(String(ct.id))}
                              className={cn(
                                "rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200",
                                conditionId === String(ct.id)
                                  ? "bg-foreground text-background shadow-sm"
                                  : "ring-border text-muted-foreground hover:text-foreground bg-background ring-1",
                              )}
                            >
                              {ct.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <CheckCard
                      checked={forRent}
                      onToggle={() => setForRent(!forRent)}
                      label="For Rent"
                    />
                  </div>
                </div>
              )}

              {/* Condition — edit mode, sale only */}
              {isEditing && pageType === "sale" && (
                <div>
                  <p className="text-muted-foreground mb-2.5 text-xs font-medium uppercase tracking-wider">
                    Condition
                  </p>
                  <SegmentedPill
                    options={conditionTypes.map((ct) => ({
                      label: ct.name,
                      value: String(ct.id),
                    }))}
                    value={conditionId}
                    onChange={setConditionId}
                  />
                </div>
              )}
            </section>

            <hr className="border-border/40" />

            {/* ────────────────────────────────────────────────────
                2. PRODUCT
               ──────────────────────────────────────────────────── */}
            <section className="space-y-5">
              <SectionHeader
                icon={<Package className="size-4 text-blue-500" />}
                iconColor="bg-blue-500/10"
                title="Product"
              />

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Model</label>
                  <Combobox
                    value={selectedModel}
                    onValueChange={(val) => setSelectedModel(val ?? "")}
                    items={modelNames}
                  >
                    <ComboboxInput
                      placeholder={`Search ${productType} model\u2026`}
                      showClear={!!selectedModel}
                    />
                    <ComboboxContent>
                      <ComboboxList>
                        <ComboboxEmpty>No model found</ComboboxEmpty>
                        <ComboboxCollection>
                          {(name) => (
                            <ComboboxItem key={name} value={name}>
                              {name}
                            </ComboboxItem>
                          )}
                        </ComboboxCollection>
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Partner</label>
                  <Combobox
                    value={selectedPartner}
                    onValueChange={(val) => setSelectedPartner(val ?? "")}
                    items={partnerNames}
                  >
                    <ComboboxInput
                      placeholder="Search partner\u2026"
                      showClear={!!selectedPartner}
                    />
                    <ComboboxContent>
                      <ComboboxList>
                        <ComboboxEmpty>No partner found</ComboboxEmpty>
                        <ComboboxCollection>
                          {(name) => (
                            <ComboboxItem key={name} value={name}>
                              {name}
                            </ComboboxItem>
                          )}
                        </ComboboxCollection>
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">
                    Location{" "}
                    <span className="text-muted-foreground font-normal">
                      (optional)
                    </span>
                  </label>
                  <Combobox
                    value={selectedLocation}
                    onValueChange={(val) => setSelectedLocation(val ?? "")}
                    items={locationNames}
                  >
                    <ComboboxInput
                      placeholder="Search location\u2026"
                      showClear={!!selectedLocation}
                    />
                    <ComboboxContent>
                      <ComboboxList>
                        <ComboboxEmpty>No location found</ComboboxEmpty>
                        <ComboboxCollection>
                          {(name) => (
                            <ComboboxItem key={name} value={name}>
                              {name}
                            </ComboboxItem>
                          )}
                        </ComboboxCollection>
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                </div>

                {templates.length > 0 && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Custom Fields</label>
                    <CustomFieldsSection
                      templates={templates}
                      initialValues={customFieldValues}
                      onChange={setCustomFieldValues}
                    />
                  </div>
                )}
              </div>
            </section>

            <hr className="border-border/40" />

            {/* ────────────────────────────────────────────────────
                3. PRICING
               ──────────────────────────────────────────────────── */}
            <section className="space-y-5">
              <SectionHeader
                icon={
                  <CircleDollarSign className="size-4 text-emerald-500" />
                }
                iconColor="bg-emerald-500/10"
                title="Pricing"
              />

              {/* Currency converter card */}
              <div className="overflow-hidden rounded-2xl border">
                {/* USD row */}
                <div className="flex items-center gap-3 px-4 py-4 transition-colors focus-within:bg-muted/30">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-sm font-bold text-emerald-600">
                    $
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-muted-foreground text-xs font-medium">
                      USD
                    </p>
                    <input
                      type="number"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={usdPrice}
                      onChange={(e) => handleUsdChange(e.target.value)}
                      onWheel={(e) => e.currentTarget.blur()}
                      autoComplete="off"
                      className="placeholder:text-muted-foreground/30 w-full bg-transparent text-lg font-semibold outline-none"
                    />
                  </div>
                </div>

                {/* Rate divider */}
                <div className="relative">
                  <div className="border-t" />
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                    <span className="text-muted-foreground flex items-center gap-1.5 rounded-full border bg-background px-3 py-1 text-xs font-medium shadow-sm">
                      <ArrowUpDown className="size-3" />
                      {"1 USD = "}
                      {(useSystemRate
                        ? exchangeRate
                        : parseFloat(customRate) || 0
                      ).toLocaleString()}
                      {" MMK"}
                    </span>
                  </div>
                </div>

                {/* MMK row */}
                <div className="flex items-center gap-3 px-4 py-4 transition-colors focus-within:bg-muted/30">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-xs font-bold text-amber-600">
                    K
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-muted-foreground text-xs font-medium">
                      MMK
                    </p>
                    <input
                      type="number"
                      inputMode="numeric"
                      placeholder="0"
                      value={mmkPrice}
                      onChange={(e) => setMmkPrice(e.target.value)}
                      onWheel={(e) => e.currentTarget.blur()}
                      autoComplete="off"
                      className="placeholder:text-muted-foreground/30 w-full bg-transparent text-lg font-semibold outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Rate controls */}
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-muted-foreground text-xs font-medium">
                  Rate
                </span>
                <SegmentedPill
                  options={[
                    {
                      label: `System (${exchangeRate.toLocaleString()})`,
                      value: "system",
                    },
                    { label: "Custom", value: "custom" },
                  ]}
                  value={useSystemRate ? "system" : "custom"}
                  onChange={(val) => handleRateToggle(val === "system")}
                />
                {!useSystemRate && (
                  <Input
                    type="number"
                    placeholder="Custom rate"
                    value={customRate}
                    onChange={(e) =>
                      handleCustomRateChange(e.target.value)
                    }
                    onWheel={(e) => e.currentTarget.blur()}
                    autoComplete="off"
                    className="w-32"
                  />
                )}
              </div>
            </section>

            <hr className="border-border/40" />

            {/* ────────────────────────────────────────────────────
                4. MEDIA
               ──────────────────────────────────────────────────── */}
            <section className="space-y-5">
              <SectionHeader
                icon={<Camera className="size-4 text-violet-500" />}
                iconColor="bg-violet-500/10"
                title="Media"
              />

              <div className="flex flex-col gap-5 sm:flex-row sm:gap-6">
                {/* Thumbnail — compact left column */}
                <div className="shrink-0 space-y-1.5">
                  <label className="text-sm font-medium">
                    Thumbnail
                    <span className="text-muted-foreground ml-1.5 text-xs font-normal">
                      Cover
                    </span>
                  </label>
                  <ImageInput
                    name="thumbnail_url"
                    value={thumbnail}
                    onChange={setThumbnail}
                    placeholder="Upload cover"
                    aspectClassName="aspect-square w-36"
                  />
                </div>

                {/* Product Photos — fills remaining space */}
                <div className="min-w-0 flex-1 space-y-1.5">
                  <label className="text-sm font-medium">Product Photos</label>
                  <Suspense
                    fallback={
                      <div className="flex items-center justify-center p-8">
                        <Spinner className="size-5" />
                      </div>
                    }
                  >
                    <LazySortableImageGallery
                      images={imageUrls}
                      onChange={setImageUrls}
                    />
                  </Suspense>
                </div>
              </div>
            </section>

            <hr className="border-border/40" />

            {/* ────────────────────────────────────────────────────
                5. DETAILS
               ──────────────────────────────────────────────────── */}
            <section className="space-y-5">
              <SectionHeader
                icon={<FileText className="size-4 text-slate-500" />}
                iconColor="bg-slate-500/10"
                title="Details"
              />

              <div className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Description</label>
                  <MarkdownEditor
                    name="description"
                    placeholder="Describe the product\u2026"
                    defaultValue={listing?.description ?? ""}
                  />
                </div>
              </div>
            </section>
          </div>
        </div>
      </FormSubmittedContext>
    </form>
  );
}
