"use client";

import {
  lazy,
  Suspense,
  useState,
  useEffect,
  useMemo,
  useRef,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import {
  Package,
  MapPin,
  Camera,
  ChevronRight,
  ArrowUpDown,
  ArrowLeft,
  ArrowRight,
  Check,
  Wrench,
  Puzzle,
  Tag,
  RotateCcw,
  ShoppingCart,
  Sparkles,
  ClipboardList,
  FileText,
  Handshake,
  EyeOff,
  Map as MapIcon,
  Image as ImageIcon,
  XCircle,
  CheckCircle,
  Pencil,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn, convertUsdToMmk, convertMmkToUsd } from "@/lib/utils";
import { SESSION_KEYS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
import { useHasPermission } from "@/hooks/use-permissions";
import { FormDialog } from "@/components/shared/form-dialog";
import { Field, FieldLabel, FieldContent } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createListing,
  updateSaleListing,
  updateRentListing,
  saveDraft,
  updateDraft,
  submitDraft,
  resubmitSaleListing,
  resubmitRentListing,
  requestReworkSale,
  requestReworkRent,
  approveListingSale,
  approveListingRent,
} from "@/lib/actions/listing";
import type {
  SaleListingWithDetails,
  RentListingWithDetails,
  DraftListingWithDetails,
  ProductImage,
  ApprovedPartner,
  ConditionType,
} from "@/types/listing";
import type {
  EquipmentModel,
  EquipmentMainCategory,
  EquipmentSubCategory,
} from "@/types/equipment";
import type { AttachmentModel, AttachmentCategory } from "@/types/attachment";
import type { ProductBrand } from "@/types/brand";
import type { StateRegion, District, Township } from "@/types/location";
import type {
  CustomFieldTemplateWithFields,
  CustomFieldValue,
} from "@/types/custom-field";
import { assetUrl } from "@/lib/r2-url";
import { CustomFieldsSection } from "./custom-fields-section";
import { ModelPickerDialog } from "./model-picker-dialog";

const LazySortableImageGallery = lazy(() =>
  import("@/components/shared/sortable-image-gallery").then((mod) => ({
    default: mod.SortableImageGallery,
  })),
);
type GalleryItem =
  import("@/components/shared/sortable-image-gallery").GalleryItem;

// ─── Types ───────────────────────────────────────────────────────────────────

type ListingDetails = SaleListingWithDetails | RentListingWithDetails;

interface ListingEditorProps {
  pageType: "sale" | "rent";
  listing?: ListingDetails;
  draft?: DraftListingWithDetails;
  existingImages?: ProductImage[];
  partners: ApprovedPartner[];
  equipmentModels: EquipmentModel[];
  attachmentModels: AttachmentModel[];
  brands: ProductBrand[];
  mainCategories: EquipmentMainCategory[];
  subCategories: EquipmentSubCategory[];
  subCategoryBrandLinks: { sub_category_id: number; brand_id: number }[];
  attachmentCategories: AttachmentCategory[];
  categoryBrandLinks: { category_id: number; brand_id: number }[];
  stateRegions: StateRegion[];
  districts: District[];
  townships: Township[];
  conditionTypes: ConditionType[];
  exchangeRate: number;
  templates?: CustomFieldTemplateWithFields[];
}

// ─── Wizard config ──────────────────────────────────────────────────────────

const STEP_META = [
  {
    label: "Product",
    stepLabel: "Product",
    subtitle: "What is it?",
    icon: Package,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    label: "Seller & Deal",
    stepLabel: "Deal",
    subtitle: "Who, where, and how much?",
    icon: MapPin,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  {
    label: "Photos",
    stepLabel: "Photos",
    subtitle: "Show me the product",
    icon: Camera,
    color: "text-violet-500",
    bg: "bg-violet-500/10",
  },
] as const;

const TOTAL_STEPS = STEP_META.length;

// ─── Auto-save ──────────────────────────────────────────────────────────────

const AUTOSAVE_KEY = SESSION_KEYS.LISTING_AUTOSAVE;
const DRAFT_FOR_SALE_KEY = "__draft_for_sale";
const DRAFT_FOR_RENT_KEY = "__draft_for_rent";
const DRAFT_CONDITION_ID_KEY = "__draft_condition_id";
const DRAFT_SALE_USD_PRICE_KEY = "__draft_sale_usd_price";
const DRAFT_SALE_MMK_PRICE_KEY = "__draft_sale_mmk_price";
const DRAFT_RENT_USD_PRICE_KEY = "__draft_rent_usd_price";
const DRAFT_RENT_MMK_PRICE_KEY = "__draft_rent_mmk_price";
const DRAFT_SALE_HIDE_PRICE_KEY = "__draft_sale_hide_price";
const DRAFT_RENT_HIDE_PRICE_KEY = "__draft_rent_hide_price";
const DRAFT_RENTAL_UNIT_KEY = "__draft_rental_unit";
const DRAFT_SALE_DISPLAY_CURRENCY_KEY = "__draft_sale_display_currency";
const DRAFT_RENT_DISPLAY_CURRENCY_KEY = "__draft_rent_display_currency";
const DRAFT_SALE_USE_SYSTEM_RATE_KEY = "__draft_sale_use_system_rate";
const DRAFT_RENT_USE_SYSTEM_RATE_KEY = "__draft_rent_use_system_rate";
const DRAFT_STATE_REGION_ID_KEY = "__draft_state_region_id";
const DRAFT_DISTRICT_ID_KEY = "__draft_district_id";

const ALL_DRAFT_META_KEYS = new Set<string>([
  DRAFT_FOR_SALE_KEY,
  DRAFT_FOR_RENT_KEY,
  DRAFT_CONDITION_ID_KEY,
  DRAFT_SALE_USD_PRICE_KEY,
  DRAFT_SALE_MMK_PRICE_KEY,
  DRAFT_RENT_USD_PRICE_KEY,
  DRAFT_RENT_MMK_PRICE_KEY,
  DRAFT_SALE_HIDE_PRICE_KEY,
  DRAFT_RENT_HIDE_PRICE_KEY,
  DRAFT_RENTAL_UNIT_KEY,
  DRAFT_SALE_DISPLAY_CURRENCY_KEY,
  DRAFT_RENT_DISPLAY_CURRENCY_KEY,
  DRAFT_SALE_USE_SYSTEM_RATE_KEY,
  DRAFT_RENT_USE_SYSTEM_RATE_KEY,
  DRAFT_STATE_REGION_ID_KEY,
  DRAFT_DISTRICT_ID_KEY,
]);

interface AutoSaveState {
  currentStep: number;
  productType: "equipment" | "attachment";
  forSale: boolean;
  forRent: boolean;
  selectedModel: string;
  selectedPartner: string;
  selectedStateRegionId: string;
  selectedDistrictId: string;
  selectedTownshipId: string;
  saleUsdPrice: string;
  saleMmkPrice: string;
  rentUsdPrice: string;
  rentMmkPrice: string;
  saleUseSystemRate: boolean;
  saleCustomRate: string;
  rentUseSystemRate: boolean;
  rentCustomRate: string;
  rentalUnit: string;
  address: string;
  hideAddress: boolean;
  hidePartner: boolean;
  saleHidePrice: boolean;
  rentHidePrice: boolean;
  saleDisplayCurrency: string;
  rentDisplayCurrency: string;
  conditionId: string;
  customFieldValues: CustomFieldValue[];
  thumbnailUrl: string | null;
  description: string;
}

interface DraftMeta {
  forSale: boolean;
  forRent: boolean;
  conditionId: string;
  saleUsdPrice: string;
  saleMmkPrice: string;
  rentUsdPrice: string;
  rentMmkPrice: string;
  saleHidePrice: boolean;
  rentHidePrice: boolean;
  rentalUnit: string;
  saleDisplayCurrency: string;
  rentDisplayCurrency: string;
  saleUseSystemRate: boolean;
  rentUseSystemRate: boolean;
  stateRegionId: string;
  districtId: string;
}

const EMPTY_DRAFT_META: DraftMeta = {
  forSale: false,
  forRent: false,
  conditionId: "",
  saleUsdPrice: "",
  saleMmkPrice: "",
  rentUsdPrice: "",
  rentMmkPrice: "",
  saleHidePrice: false,
  rentHidePrice: false,
  rentalUnit: "",
  saleDisplayCurrency: "",
  rentDisplayCurrency: "",
  saleUseSystemRate: false,
  rentUseSystemRate: false,
  stateRegionId: "",
  districtId: "",
};

function readDraftMeta(customFields: string | null | undefined): DraftMeta {
  if (!customFields) return EMPTY_DRAFT_META;
  try {
    const parsed = JSON.parse(customFields);
    if (!Array.isArray(parsed)) return EMPTY_DRAFT_META;
    const map = new Map<string, string>();
    for (const f of parsed) {
      if (
        f &&
        typeof f === "object" &&
        typeof f.key === "string" &&
        typeof f.value === "string"
      ) {
        map.set(f.key, f.value);
      }
    }
    const flag = (k: string) => map.get(k) === "1";
    const str = (k: string) => map.get(k) ?? "";
    return {
      forSale: flag(DRAFT_FOR_SALE_KEY),
      forRent: flag(DRAFT_FOR_RENT_KEY),
      conditionId: str(DRAFT_CONDITION_ID_KEY),
      saleUsdPrice: str(DRAFT_SALE_USD_PRICE_KEY),
      saleMmkPrice: str(DRAFT_SALE_MMK_PRICE_KEY),
      rentUsdPrice: str(DRAFT_RENT_USD_PRICE_KEY),
      rentMmkPrice: str(DRAFT_RENT_MMK_PRICE_KEY),
      saleHidePrice: flag(DRAFT_SALE_HIDE_PRICE_KEY),
      rentHidePrice: flag(DRAFT_RENT_HIDE_PRICE_KEY),
      rentalUnit: str(DRAFT_RENTAL_UNIT_KEY),
      saleDisplayCurrency: str(DRAFT_SALE_DISPLAY_CURRENCY_KEY),
      rentDisplayCurrency: str(DRAFT_RENT_DISPLAY_CURRENCY_KEY),
      saleUseSystemRate: flag(DRAFT_SALE_USE_SYSTEM_RATE_KEY),
      rentUseSystemRate: flag(DRAFT_RENT_USE_SYSTEM_RATE_KEY),
      stateRegionId: str(DRAFT_STATE_REGION_ID_KEY),
      districtId: str(DRAFT_DISTRICT_ID_KEY),
    };
  } catch {
    return EMPTY_DRAFT_META;
  }
}

// ─── Reusable pieces ─────────────────────────────────────────────────────────

function OptionCard({
  selected,
  onSelect,
  icon: Icon,
  iconColor,
  iconBg,
  label,
  description,
  variant = "radio",
}: {
  selected: boolean;
  onSelect: () => void;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  label: string;
  description?: string;
  variant?: "radio" | "checkbox";
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "relative flex flex-col items-center gap-2.5 rounded-xl border-2 p-5 transition-all duration-200",
        selected
          ? "border-primary bg-primary/10 shadow-sm"
          : "border-border bg-muted/50 hover:bg-muted",
      )}
    >
      {variant === "checkbox" && (
        <span
          className={cn(
            "absolute top-3 right-3 flex size-[18px] items-center justify-center rounded-[5px] border-2 transition-all duration-200",
            selected
              ? "border-primary bg-primary"
              : "border-muted-foreground/30",
          )}
        >
          {selected && (
            <Check className="text-primary-foreground size-3" strokeWidth={3} />
          )}
        </span>
      )}
      <div
        className={cn(
          "flex size-10 items-center justify-center rounded-lg",
          iconBg,
        )}
      >
        <Icon className={cn("size-5", iconColor)} />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium">{label}</p>
        {description && (
          <p className="text-muted-foreground text-xs">{description}</p>
        )}
      </div>
    </button>
  );
}

function StepHeader({ step }: { step: (typeof STEP_META)[number] }) {
  const Icon = step.icon;
  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          "flex size-10 items-center justify-center rounded-xl",
          step.bg,
        )}
      >
        <Icon className={cn("size-5", step.color)} />
      </div>
      <div>
        <h2 className="text-sm font-medium">{step.label}</h2>
        <p className="text-muted-foreground text-xs">{step.subtitle}</p>
      </div>
    </div>
  );
}

function SubSectionLabel({
  icon: Icon,
  children,
}: {
  icon?: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <p className="flex items-center gap-1.5 text-sm font-medium">
      {Icon && <Icon className="size-4 text-muted-foreground" />}
      {children}
    </p>
  );
}

function PricingCard({
  icon,
  label,
  usdPrice,
  mmkPrice,
  onUsdChange,
  onMmkChange,
  activeRate,
  useSystemRate,
  onToggleSystemRate,
  customRate,
  onCustomRateChange,
  systemRate,
  displayCurrency,
  onDisplayCurrencyChange,
  hidePrice,
  onHidePriceChange,
  error,
}: {
  icon?: LucideIcon;
  label: string;
  usdPrice: string;
  mmkPrice: string;
  onUsdChange: (value: string) => void;
  onMmkChange: (value: string) => void;
  activeRate: number;
  useSystemRate: boolean;
  onToggleSystemRate: (v: boolean) => void;
  customRate: string;
  onCustomRateChange: (v: string) => void;
  systemRate: number;
  displayCurrency: string;
  onDisplayCurrencyChange: (v: string) => void;
  hidePrice: boolean;
  onHidePriceChange: (v: boolean) => void;
  error?: string;
}) {
  const [showRateSettings, setShowRateSettings] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <SubSectionLabel icon={icon}>
        {label} <span className="text-destructive">*</span>
      </SubSectionLabel>

      {/* Currency inputs — side by side */}
      <div className="grid grid-cols-2 gap-3">
        {/* USD */}
        <div
          className={cn(
            "group rounded-xl border bg-background transition-colors focus-within:border-foreground/30 focus-within:ring-1 focus-within:ring-foreground/10",
            error && "border-destructive",
          )}
        >
          <div className="flex items-center gap-3 px-3 py-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-sm font-bold text-emerald-600">
              $
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-muted-foreground text-[11px] font-medium tracking-wide">
                USD
              </p>
              <input
                type="number"
                inputMode="decimal"
                placeholder="0.00"
                value={usdPrice}
                onChange={(e) => onUsdChange(e.target.value)}
                onWheel={(e) => e.currentTarget.blur()}
                autoComplete="off"
                className="placeholder:text-muted-foreground/25 w-full min-w-0 bg-transparent text-lg font-semibold tabular-nums outline-none"
              />
            </div>
          </div>
        </div>

        {/* MMK */}
        <div
          className={cn(
            "group rounded-xl border bg-background transition-colors focus-within:border-foreground/30 focus-within:ring-1 focus-within:ring-foreground/10",
            error && "border-destructive",
          )}
        >
          <div className="flex items-center gap-3 px-3 py-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-xs font-bold text-amber-600">
              K
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-muted-foreground text-[11px] font-medium tracking-wide">
                MMK
              </p>
              <input
                type="number"
                inputMode="numeric"
                placeholder="0"
                value={mmkPrice}
                onChange={(e) => onMmkChange(e.target.value)}
                onWheel={(e) => e.currentTarget.blur()}
                autoComplete="off"
                className="placeholder:text-muted-foreground/25 w-full min-w-0 bg-transparent text-lg font-semibold tabular-nums outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {error && <p className="text-destructive text-xs">{error}</p>}

      {/* Rate + Display currency — compact row */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        {/* Exchange rate pill (click to configure) */}
        <button
          type="button"
          onClick={() => setShowRateSettings(!showRateSettings)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-medium transition-colors",
            showRateSettings
              ? "border-foreground/20 bg-foreground/5 text-foreground"
              : "text-muted-foreground hover:border-foreground/20 hover:text-foreground",
          )}
        >
          <ArrowUpDown className="size-3" />
          <span>1 USD = {activeRate.toLocaleString()} MMK</span>
          <Pencil className="size-2.5 opacity-50" />
        </button>

        {/* Display currency */}
        <div className="ml-auto flex items-center gap-1.5">
          <span className="text-muted-foreground">Show as</span>
          <div className="inline-flex rounded-full border p-0.5">
            {["MMK", "USD"].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => onDisplayCurrencyChange(c)}
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-xs font-medium transition-all",
                  displayCurrency === c
                    ? "bg-foreground text-background shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Rate settings (expandable) */}
      {showRateSettings && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed bg-muted/30 px-3 py-2.5 text-sm animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="inline-flex rounded-full border bg-background p-0.5">
            {[
              {
                label: `System (${systemRate.toLocaleString()})`,
                value: "system",
              },
              { label: "Custom", value: "custom" },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onToggleSystemRate(opt.value === "system")}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-all",
                  (useSystemRate ? "system" : "custom") === opt.value
                    ? "bg-foreground text-background shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {!useSystemRate && (
            <Input
              type="number"
              placeholder="Enter rate"
              value={customRate}
              onChange={(e) => onCustomRateChange(e.target.value)}
              onWheel={(e) => e.currentTarget.blur()}
              autoComplete="off"
              className="h-7 w-28 text-xs"
            />
          )}
        </div>
      )}

      {/* Hide price toggle */}
      <label className="flex items-center justify-between rounded-lg border px-4 py-2.5">
        <div className="flex items-center gap-2">
          <EyeOff className="size-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            Hide price from buyers
          </span>
        </div>
        <Switch checked={hidePrice} onCheckedChange={onHidePriceChange} />
      </label>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function ListingEditor({
  pageType,
  listing,
  draft,
  existingImages = [],
  partners,
  equipmentModels,
  attachmentModels,
  brands,
  mainCategories,
  subCategories,
  subCategoryBrandLinks,
  attachmentCategories,
  categoryBrandLinks,
  stateRegions,
  districts,
  townships,
  conditionTypes,
  exchangeRate,
  templates = [],
}: ListingEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const isEditing = !!listing;
  const isDraftMode = !!draft;
  const backUrl = isDraftMode
    ? `/listings/for-${pageType}?tab=drafts`
    : pageType === "sale"
      ? "/listings/for-sale"
      : "/listings/for-rent";

  // Submit action: set by button onClick, read in form onSubmit
  const submitActionRef = useRef<
    "save-draft" | "submit" | "save" | "resubmit" | "approve"
  >("save");

  // Approval / rework state
  const feature = pageType === "sale" ? "sale_listings" : "rent_listings";
  const canApprove = useHasPermission(feature, "approve");
  const isRework = listing?.approve_status_name === "Rework";
  const isPendingReview = listing?.approve_status_name === "Pending";
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [showReworkDialog, setShowReworkDialog] = useState(false);

  // Initialize review mode for approvers viewing pending listings
  useEffect(() => {
    if (isPendingReview && canApprove) setIsReviewMode(true);
  }, [isPendingReview, canApprove]);

  // Source data: use draft or listing for initialization
  const sourceData = draft ?? listing;
  const isCreateMode = !isEditing && !isDraftMode;
  const draftMeta = useMemo(
    () => readDraftMeta(draft?.custom_fields),
    [draft?.custom_fields],
  );

  // ── Auto-save: read saved state once on initial mount (create mode only) ──
  const [savedState] = useState<AutoSaveState | null>(() => {
    if (!isCreateMode || typeof window === "undefined") return null;
    try {
      const raw = sessionStorage.getItem(AUTOSAVE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as AutoSaveState;
    } catch {
      return null;
    }
  });

  // ── Wizard state ──────────────────────────────────────────────────────
  const [currentStep, setCurrentStep] = useState(savedState?.currentStep ?? 0);
  const [step0Attempted, setStep0Attempted] = useState(false);
  const [step1Attempted, setStep1Attempted] = useState(false);
  const [modelPickerOpen, setModelPickerOpen] = useState(false);

  // ── Classification state ────────────────────────────────────────────────

  const defaultProductType = sourceData
    ? sourceData.equipment_model_id
      ? "equipment"
      : "attachment"
    : "equipment";
  const [productType, setProductType] = useState<"equipment" | "attachment">(
    savedState?.productType ?? defaultProductType,
  );

  // In create mode, read the sidebar "+" click intent — it always takes priority
  // over auto-saved state since it reflects the user's latest action.
  const newListingDefault = useMemo(() => {
    if (isEditing || isDraftMode || typeof window === "undefined") return null;
    return sessionStorage.getItem(SESSION_KEYS.NEW_LISTING_DEFAULT);
  }, [isEditing, isDraftMode]);

  const [forSale, setForSale] = useState(() => {
    if (newListingDefault === "sale") return true;
    if (newListingDefault === "rent") return false;
    if (isDraftMode) return draftMeta.forSale;
    return savedState?.forSale ?? (isEditing ? pageType === "sale" : false);
  });
  const [forRent, setForRent] = useState(() => {
    if (newListingDefault === "rent") return true;
    if (newListingDefault === "sale") return false;
    if (isDraftMode) return draftMeta.forRent;
    return savedState?.forRent ?? (isEditing ? pageType === "rent" : false);
  });

  // Clear the one-shot signal after it's been consumed
  useEffect(() => {
    if (newListingDefault) {
      sessionStorage.removeItem(SESSION_KEYS.NEW_LISTING_DEFAULT);
    }
  }, [newListingDefault]);

  // ── Product info state ──────────────────────────────────────────────────

  const initPartnerLabel = useMemo(() => {
    if (!sourceData?.partner_id) return "";
    const partner = partners.find((p) => p.id === sourceData.partner_id);
    if (!partner) return "";
    return partner.company_name
      ? `${partner.user_name} (${partner.company_name})`
      : partner.user_name;
  }, [sourceData, partners]);

  const [selectedPartner, setSelectedPartner] = useState<string>(
    savedState?.selectedPartner ?? initPartnerLabel,
  );
  const [selectedModel, setSelectedModel] = useState<string>(
    savedState?.selectedModel ?? sourceData?.model_name ?? "",
  );
  // ── Cascading location state ───────────────────────────────────────────
  // Derive initial hierarchy. Drafts persist state/district directly in
  // custom_fields meta as a safety net in case the township-only reverse
  // lookup misses (e.g. when only state/district was filled before saving).
  const initLocation = useMemo(() => {
    const fromMeta = isDraftMode
      ? {
          stateRegionId: draftMeta.stateRegionId,
          districtId: draftMeta.districtId,
        }
      : { stateRegionId: "", districtId: "" };

    if (!sourceData?.township_id) {
      return {
        stateRegionId: fromMeta.stateRegionId,
        districtId: fromMeta.districtId,
        townshipId: "",
      };
    }
    const township = townships.find(
      (t) => t.township_id === sourceData.township_id,
    );
    if (!township) {
      return {
        stateRegionId: fromMeta.stateRegionId,
        districtId: fromMeta.districtId,
        townshipId: "",
      };
    }
    const district = districts.find(
      (d) => d.district_id === township.district_id,
    );
    if (!district) {
      return {
        stateRegionId: fromMeta.stateRegionId,
        districtId: String(township.district_id),
        townshipId: String(township.township_id),
      };
    }
    return {
      stateRegionId: String(district.state_region_id),
      districtId: String(township.district_id),
      townshipId: String(township.township_id),
    };
  }, [sourceData, townships, districts, isDraftMode, draftMeta]);

  const [selectedStateRegionId, setSelectedStateRegionId] = useState(
    savedState?.selectedStateRegionId ?? initLocation.stateRegionId,
  );
  const [selectedDistrictId, setSelectedDistrictId] = useState(
    savedState?.selectedDistrictId ?? initLocation.districtId,
  );
  const [selectedTownshipId, setSelectedTownshipId] = useState(
    savedState?.selectedTownshipId ?? initLocation.townshipId,
  );

  // Sync partner label when partners load after initial render
  useEffect(() => {
    if (initPartnerLabel) setSelectedPartner(initPartnerLabel);
  }, [initPartnerLabel]);

  // ── Media state ─────────────────────────────────────────────────────────

  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(
    savedState?.thumbnailUrl ?? sourceData?.thumbnail_url ?? null,
  );
  const [thumbnailFocalPoint, setThumbnailFocalPoint] = useState<{ x: number; y: number } | null>(null);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>(() =>
    existingImages.map((img, i) => ({
      id: `img-${i}`,
      url: img.url,
      preview: assetUrl(img.url) ?? "",
      focalX: img.focal_x ?? undefined,
      focalY: img.focal_y ?? undefined,
    })),
  );
  // Submit must wait for any gallery upload still in flight, otherwise
  // the FormData would ship an item without its pendingKey.
  const anyGalleryUploading = galleryItems.some((item) => item.uploading);

  // ── Price state (separate for sale / rent) ──────────────────────────────

  const [saleUsdPrice, setSaleUsdPrice] = useState<string>(
    savedState?.saleUsdPrice ??
      (isEditing && pageType === "sale"
        ? (listing?.usd_price?.toString() ?? "")
        : isDraftMode
          ? draftMeta.saleUsdPrice
          : ""),
  );
  const [saleMmkPrice, setSaleMmkPrice] = useState<string>(
    savedState?.saleMmkPrice ??
      (isEditing && pageType === "sale"
        ? (listing?.mmk_price?.toString() ?? "")
        : isDraftMode
          ? draftMeta.saleMmkPrice
          : ""),
  );
  const [rentUsdPrice, setRentUsdPrice] = useState<string>(
    savedState?.rentUsdPrice ??
      (isEditing && pageType === "rent"
        ? (listing?.usd_price?.toString() ?? "")
        : isDraftMode
          ? draftMeta.rentUsdPrice
          : ""),
  );
  const [rentMmkPrice, setRentMmkPrice] = useState<string>(
    savedState?.rentMmkPrice ??
      (isEditing && pageType === "rent"
        ? (listing?.mmk_price?.toString() ?? "")
        : isDraftMode
          ? draftMeta.rentMmkPrice
          : ""),
  );
  // Independent rate controls per listing type
  const [saleUseSystemRate, setSaleUseSystemRate] = useState(
    savedState?.saleUseSystemRate ??
      (isEditing && pageType === "sale"
        ? listing?.use_system_rate !== 0
        : isDraftMode
          ? draftMeta.saleUseSystemRate
          : true),
  );
  const [saleCustomRate, setSaleCustomRate] = useState<string>(
    savedState?.saleCustomRate ?? String(exchangeRate),
  );
  const [rentUseSystemRate, setRentUseSystemRate] = useState(
    savedState?.rentUseSystemRate ??
      (isEditing && pageType === "rent"
        ? listing?.use_system_rate !== 0
        : isDraftMode
          ? draftMeta.rentUseSystemRate
          : true),
  );
  const [rentCustomRate, setRentCustomRate] = useState<string>(
    savedState?.rentCustomRate ?? String(exchangeRate),
  );
  const [rentalUnit, setRentalUnit] = useState<string>(
    savedState?.rentalUnit ??
      (isEditing && pageType === "rent" && "rental_unit" in (listing ?? {})
        ? ((listing as any)?.rental_unit ?? "per_day")
        : isDraftMode && draftMeta.rentalUnit
          ? draftMeta.rentalUnit
          : "per_day"),
  );

  // ── Address ─────────────────────────────────────────────────────────────
  const [address, setAddress] = useState(
    savedState?.address ?? sourceData?.address ?? "",
  );

  // ── Visibility toggles ──────────────────────────────────────────────────
  const [hideAddress, setHideAddress] = useState(
    savedState?.hideAddress ?? sourceData?.hide_address === 1,
  );
  const [hidePartner, setHidePartner] = useState(
    savedState?.hidePartner ?? sourceData?.hide_partner === 1,
  );
  const [saleHidePrice, setSaleHidePrice] = useState(
    savedState?.saleHidePrice ??
      (isEditing && pageType === "sale"
        ? listing?.hide_price === 1
        : isDraftMode
          ? draftMeta.saleHidePrice
          : false),
  );
  const [rentHidePrice, setRentHidePrice] = useState(
    savedState?.rentHidePrice ??
      (isEditing && pageType === "rent"
        ? listing?.hide_price === 1
        : isDraftMode
          ? draftMeta.rentHidePrice
          : false),
  );

  // ── Display currency (controls which currency the mobile app shows) ────
  const [saleDisplayCurrency, setSaleDisplayCurrency] = useState<string>(
    savedState?.saleDisplayCurrency ??
      (listing?.display_currency as string) ??
      (isDraftMode && draftMeta.saleDisplayCurrency
        ? draftMeta.saleDisplayCurrency
        : "MMK"),
  );
  const [rentDisplayCurrency, setRentDisplayCurrency] = useState<string>(
    savedState?.rentDisplayCurrency ??
      (listing?.display_currency as string) ??
      (isDraftMode && draftMeta.rentDisplayCurrency
        ? draftMeta.rentDisplayCurrency
        : "MMK"),
  );

  const saleActiveRate = saleUseSystemRate
    ? exchangeRate
    : parseFloat(saleCustomRate) || 0;
  const rentActiveRate = rentUseSystemRate
    ? exchangeRate
    : parseFloat(rentCustomRate) || 0;

  const convertSaleUsdToMmk = (usd: string) =>
    convertUsdToMmk(usd, saleActiveRate);
  const convertSaleMmkToUsd = (mmk: string) =>
    convertMmkToUsd(mmk, saleActiveRate);
  const convertRentUsdToMmk = (usd: string) =>
    convertUsdToMmk(usd, rentActiveRate);
  const convertRentMmkToUsd = (mmk: string) =>
    convertMmkToUsd(mmk, rentActiveRate);

  // Recalculate sale MMK when sale rate changes
  useEffect(() => {
    const mmk = convertUsdToMmk(saleUsdPrice, saleActiveRate);
    if (mmk) setSaleMmkPrice(mmk);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saleActiveRate]);

  // Recalculate rent MMK when rent rate changes
  useEffect(() => {
    const mmk = convertUsdToMmk(rentUsdPrice, rentActiveRate);
    if (mmk) setRentMmkPrice(mmk);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rentActiveRate]);

  // ── Lookup maps ─────────────────────────────────────────────────────────

  const partnerMap = useMemo(
    () =>
      new Map(
        partners.map((p) => {
          const label = p.company_name
            ? `${p.user_name} (${p.company_name})`
            : p.user_name;
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

  const partnerNames = useMemo(
    () => Array.from(partnerMap.keys()),
    [partnerMap],
  );

  // ── Cascading location lookups ──────────────────────────────────────
  const stateRegionNames = useMemo(
    () => stateRegions.map((sr) => sr.name),
    [stateRegions],
  );
  const stateRegionIdByName = useMemo(
    () =>
      new Map(stateRegions.map((sr) => [sr.name, String(sr.state_region_id)])),
    [stateRegions],
  );
  const stateRegionNameById = useMemo(
    () =>
      new Map(stateRegions.map((sr) => [String(sr.state_region_id), sr.name])),
    [stateRegions],
  );

  const filteredDistricts = useMemo(
    () =>
      selectedStateRegionId
        ? districts.filter(
            (d) => String(d.state_region_id) === selectedStateRegionId,
          )
        : [],
    [districts, selectedStateRegionId],
  );
  const districtNames = useMemo(
    () => filteredDistricts.map((d) => d.name),
    [filteredDistricts],
  );
  const districtIdByName = useMemo(
    () =>
      new Map(filteredDistricts.map((d) => [d.name, String(d.district_id)])),
    [filteredDistricts],
  );
  const districtNameById = useMemo(
    () => new Map(districts.map((d) => [String(d.district_id), d.name])),
    [districts],
  );

  const filteredTownships = useMemo(
    () =>
      selectedDistrictId
        ? townships.filter((t) => String(t.district_id) === selectedDistrictId)
        : [],
    [townships, selectedDistrictId],
  );
  const townshipNames = useMemo(
    () => filteredTownships.map((t) => t.name),
    [filteredTownships],
  );
  const townshipIdByName = useMemo(
    () =>
      new Map(filteredTownships.map((t) => [t.name, String(t.township_id)])),
    [filteredTownships],
  );

  // ── Custom fields state ────────────────────────────────────────────────

  const [customFieldValues, setCustomFieldValues] = useState<
    CustomFieldValue[]
  >(() => {
    if (savedState?.customFieldValues) return savedState.customFieldValues;
    if (!sourceData?.custom_fields) return [];
    try {
      const parsed = JSON.parse(sourceData.custom_fields) as CustomFieldValue[];
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((field) => !ALL_DRAFT_META_KEYS.has(field.key));
    } catch {
      return [];
    }
  });

  const saleDefaults =
    listing && "condition_type_id" in listing ? listing : null;
  const [conditionId, setConditionId] = useState<string>(
    savedState?.conditionId ??
      saleDefaults?.condition_type_id?.toString() ??
      (isDraftMode ? draftMeta.conditionId : ""),
  );

  // ── Description state (tracked for auto-save) ─────────────────────────
  const [description, setDescription] = useState<string>(
    savedState?.description ?? sourceData?.description ?? "",
  );

  // ── Auto-save: persist form state to sessionStorage on every change ───
  useEffect(() => {
    if (!isCreateMode) return;
    const snapshot: AutoSaveState = {
      currentStep,
      productType,
      forSale,
      forRent,
      selectedModel,
      selectedPartner,
      selectedStateRegionId,
      selectedDistrictId,
      selectedTownshipId,
      saleUsdPrice,
      saleMmkPrice,
      rentUsdPrice,
      rentMmkPrice,
      saleUseSystemRate,
      saleCustomRate,
      rentUseSystemRate,
      rentCustomRate,
      rentalUnit,
      address,
      hideAddress,
      hidePartner,
      saleHidePrice,
      rentHidePrice,
      saleDisplayCurrency,
      rentDisplayCurrency,
      conditionId,
      customFieldValues,
      thumbnailUrl,
      description,
    };
    sessionStorage.setItem(AUTOSAVE_KEY, JSON.stringify(snapshot));
  }, [
    isCreateMode,
    currentStep,
    productType,
    forSale,
    forRent,
    selectedModel,
    selectedPartner,
    selectedStateRegionId,
    selectedDistrictId,
    selectedTownshipId,
    saleUsdPrice,
    saleMmkPrice,
    rentUsdPrice,
    rentMmkPrice,
    saleUseSystemRate,
    saleCustomRate,
    rentUseSystemRate,
    rentCustomRate,
    rentalUnit,
    hidePartner,
    saleHidePrice,
    rentHidePrice,
    saleDisplayCurrency,
    rentDisplayCurrency,
    conditionId,
    customFieldValues,
    thumbnailUrl,
    description,
  ]);

  function clearAutoSave() {
    sessionStorage.removeItem(AUTOSAVE_KEY);
    sessionStorage.removeItem(SESSION_KEYS.NEW_LISTING_DEFAULT);
  }

  // ── Wizard navigation ─────────────────────────────────────────────────

  const modelMap =
    productType === "equipment" ? equipmentModelMap : attachmentModelMap;

  const conditionRequired = forSale && conditionTypes.length > 0;
  const step0Valid =
    !!modelMap.get(selectedModel) &&
    (isEditing || forSale || forRent) &&
    (!conditionRequired || !!conditionId);
  const salePriceValid =
    !forSale || (!!saleUsdPrice && parseFloat(saleUsdPrice) > 0);
  const rentPriceValid =
    !forRent || (!!rentUsdPrice && parseFloat(rentUsdPrice) > 0);
  const step1Valid =
    !!partnerMap.get(selectedPartner) && salePriceValid && rentPriceValid;

  // Edit mode is fully populated; drafts should still reflect actual progress.
  const stepDone = isEditing
    ? [true, true, true]
    : [step0Valid, step1Valid, true];

  function goNext() {
    if (currentStep === 0) {
      setStep0Attempted(true);
      if (!step0Valid) {
        if (!modelMap.get(selectedModel)) toast.error("Please select a model");
        else if (!forSale && !forRent)
          toast.error("Select at least one listing type");
        else if (conditionRequired && !conditionId)
          toast.error("Please select a condition");
        return;
      }
    }
    if (currentStep === 1) {
      setStep1Attempted(true);
      if (!step1Valid) {
        if (!partnerMap.get(selectedPartner))
          toast.error("Please select a partner");
        else if (!salePriceValid) toast.error("Please enter a sale price");
        else if (!rentPriceValid) toast.error("Please enter a rental price");
        return;
      }
    }
    setCurrentStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
    scrollToFormTop();
  }

  function goPrev() {
    setCurrentStep((s) => Math.max(s - 1, 0));
    scrollToFormTop();
  }

  function scrollToFormTop() {
    setTimeout(() => {
      scrollBodyRef.current?.scrollTo(0, 0);
    }, 0);
  }

  const scrollBodyRef = useRef<HTMLDivElement>(null);

  function goToStep(idx: number) {
    if (isEditing || isDraftMode || idx < currentStep) {
      setCurrentStep(idx);
      return;
    }
    // Only allow forward jumps if all previous steps are valid
    const allPreviousDone = stepDone.slice(0, idx).every(Boolean);
    if (allPreviousDone) {
      setCurrentStep(idx);
    }
  }

  // ── Form submission ─────────────────────────────────────────────────────

  // ── Rework dialog handler ────────────────────────────────────────────
  function handleRequestRework(formData: FormData) {
    const reason = formData.get("rework_reason") as string;
    const reworkFn =
      pageType === "sale" ? requestReworkSale : requestReworkRent;
    startTransition(async () => {
      const result = await reworkFn(listing!.id, reason);
      if (result.success) {
        toast.success("Listing sent for rework");
        setShowReworkDialog(false);
        router.push(backUrl);
      } else {
        toast.error(result.error ?? "Failed to request rework");
      }
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const action = submitActionRef.current;
    const isSavingDraft = action === "save-draft";

    setSubmitted(true);

    // Build formData from current state
    const formData = new FormData(e.currentTarget);

    // For drafts, skip strict validation — all fields optional
    if (!isSavingDraft) {
      const modelId = modelMap.get(selectedModel);
      if (!modelId) {
        setCurrentStep(0);
        toast.error("Please select a model");
        return;
      }
      if (!isEditing && !forSale && !forRent) {
        setCurrentStep(0);
        toast.error("Select at least one listing type");
        return;
      }
      if (conditionRequired && !conditionId) {
        setCurrentStep(0);
        toast.error("Please select a condition");
        return;
      }
      const partnerId = partnerMap.get(selectedPartner);
      if (!partnerId) {
        setCurrentStep(1);
        toast.error("Please select a partner");
        return;
      }
      if (forSale && (!saleUsdPrice || parseFloat(saleUsdPrice) <= 0)) {
        setCurrentStep(1);
        toast.error("Please enter a sale price");
        return;
      }
      if (forRent && (!rentUsdPrice || parseFloat(rentUsdPrice) <= 0)) {
        setCurrentStep(1);
        toast.error("Please enter a rental price");
        return;
      }
      if (isCreateMode && !thumbnailUrl) {
        setCurrentStep(2);
        toast.error("Please upload a thumbnail image");
        return;
      }
      if (isCreateMode && galleryItems.length === 0) {
        setCurrentStep(2);
        toast.error("Please add at least one product photo");
        return;
      }
    }

    // Populate common form fields
    formData.set("product_type", productType);
    const modelId = modelMap.get(selectedModel);
    if (modelId) formData.set("model_id", String(modelId));
    const partnerId = partnerMap.get(selectedPartner);
    if (partnerId) formData.set("partner_id", String(partnerId));
    if (selectedTownshipId) formData.set("township_id", selectedTownshipId);
    if (selectedStateRegionId)
      formData.set("state_region_id", selectedStateRegionId);
    if (selectedDistrictId) formData.set("district_id", selectedDistrictId);
    formData.set("sale_usd_price", saleUsdPrice || "");
    formData.set("sale_mmk_price", saleMmkPrice || "0");
    formData.set("rent_usd_price", rentUsdPrice || "");
    formData.set("rent_mmk_price", rentMmkPrice || "0");
    formData.set("for_sale", forSale ? "1" : "0");
    formData.set("for_rent", forRent ? "1" : "0");
    formData.set("is_hidden", "0");
    formData.set("sale_hide_price", saleHidePrice ? "1" : "0");
    formData.set("rent_hide_price", rentHidePrice ? "1" : "0");
    formData.set("rental_unit", rentalUnit);
    formData.set("address", address);
    formData.set("hide_address", hideAddress ? "1" : "0");
    formData.set("hide_partner", hidePartner ? "1" : "0");
    formData.set("sale_display_currency", saleDisplayCurrency);
    formData.set("rent_display_currency", rentDisplayCurrency);
    formData.set("sale_use_system_rate", saleUseSystemRate ? "1" : "0");
    formData.set("rent_use_system_rate", rentUseSystemRate ? "1" : "0");
    formData.set("add_to_featured", "0");
    if (forSale && conditionId) {
      formData.set("condition_type_id", conditionId);
    }
    if (customFieldValues.length > 0) {
      formData.set("custom_fields", JSON.stringify(customFieldValues));
    }

    // Append thumbnail focal point
    if (thumbnailFocalPoint) {
      formData.set("thumbnail_focal_x", String(thumbnailFocalPoint.x));
      formData.set("thumbnail_focal_y", String(thumbnailFocalPoint.y));
    }

    // Append product photos. Existing items send their R2 url; newly
    // added items send the pending keys produced by the gallery's
    // direct-to-R2 upload — the server commits them on save.
    galleryItems.forEach((item, i) => {
      if (item.url) formData.set(`photo_url_${i}`, item.url);
      if (item.pendingKey) {
        formData.set(`photo_pending_key_${i}`, item.pendingKey);
        if (item.thumbPendingKey) {
          formData.set(`photo_thumb_pending_key_${i}`, item.thumbPendingKey);
        }
        if (item.blurhash) {
          formData.set(`photo_blurhash_${i}`, item.blurhash);
        }
      }
      if (item.focalX != null) formData.set(`photo_focal_x_${i}`, String(item.focalX));
      if (item.focalY != null) formData.set(`photo_focal_y_${i}`, String(item.focalY));
    });

    startTransition(async () => {
      let result: { success: boolean; error?: string; draftId?: number };

      switch (action) {
        case "save-draft":
          result = isDraftMode
            ? await updateDraft(draft!.id, formData)
            : await saveDraft(formData);
          break;

        case "submit":
          if (isDraftMode) {
            result = await submitDraft(draft!.id, formData);
          } else {
            result = await createListing(formData);
          }
          break;

        case "resubmit":
          result =
            pageType === "sale"
              ? await resubmitSaleListing(listing!.id)
              : await resubmitRentListing(listing!.id);
          break;

        case "approve": {
          // Save first, then approve
          const saveResult =
            pageType === "sale"
              ? await updateSaleListing(listing!.id, formData)
              : await updateRentListing(listing!.id, formData);
          if (!saveResult.success) {
            result = saveResult;
            break;
          }
          result =
            pageType === "sale"
              ? await approveListingSale(listing!.id)
              : await approveListingRent(listing!.id);
          break;
        }

        default: // "save"
          result = isEditing
            ? pageType === "sale"
              ? await updateSaleListing(listing!.id, formData)
              : await updateRentListing(listing!.id, formData)
            : await createListing(formData);
          break;
      }

      if (result.success) {
        const messages: Record<string, string> = {
          "save-draft": "Draft saved",
          submit: "Listing submitted",
          resubmit: "Listing resubmitted for review",
          approve: "Listing approved",
          save: isEditing ? "Listing updated" : "Listing created",
        };
        toast.success(messages[action] ?? "Success");
        if (isCreateMode) clearAutoSave();

        // After save-draft, land on the Drafts tab so the user sees the saved
        // entry. When the draft is for both sale and rent, prefer the For Sale
        // table (a single draft creates entries in both lists once submitted).
        if (action === "save-draft") {
          const draftsUrl = forSale
            ? "/listings/for-sale?tab=drafts"
            : "/listings/for-rent?tab=drafts";
          if (isCreateMode) {
            // Hard nav to fully reset component state
            window.location.href = draftsUrl;
          } else {
            router.push(draftsUrl);
          }
        } else if (isCreateMode) {
          // Hard navigation to fully reset component state
          window.location.href = backUrl;
        } else {
          router.push(backUrl);
        }
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
      className="-m-6 flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <FormSubmittedContext value={submitted}>
        {/* ── Sticky Header ─────────────────────────────────────── */}
        <header className="bg-background/80 sticky top-0 z-10 border-b px-6 py-3 backdrop-blur-sm">
          <nav className="text-muted-foreground mb-1 flex items-center gap-1 text-xs">
            {isCreateMode ? (
              <span>Listings</span>
            ) : (
              <Link
                href={backUrl}
                className="hover:text-foreground transition-colors"
              >
                {isDraftMode
                  ? "Drafts"
                  : pageType === "sale"
                    ? "For Sale"
                    : "For Rent"}
              </Link>
            )}
            <ChevronRight className="size-3 opacity-40" />
            <span className="text-foreground font-medium">
              {isDraftMode
                ? "Draft"
                : isEditing
                  ? (listing?.custom_id ?? "Edit")
                  : "New"}
            </span>
          </nav>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight">
                  {isDraftMode
                    ? "Edit Draft"
                    : isRework
                      ? "Rework Listing"
                      : isPendingReview && isReviewMode
                        ? "Review Listing"
                        : isEditing
                          ? "Edit Listing"
                          : "New Listing"}
                </h1>
                {isEditing && listing?.approve_status_name && (
                  <Badge
                    variant={
                      listing.approve_status_name === "Approved"
                        ? "default"
                        : listing.approve_status_name === "Rework"
                          ? "destructive"
                          : listing.approve_status_name === "Pending"
                            ? "outline"
                            : "secondary"
                    }
                  >
                    {listing.approve_status_name}
                  </Badge>
                )}
              </div>
              {isPendingReview && isReviewMode && (
                <p className="text-muted-foreground mt-0.5 text-sm">
                  Review and approve or request rework on this listing.
                </p>
              )}
              {isRework && (
                <p className="text-muted-foreground mt-0.5 text-sm">
                  This listing was returned for rework. Edit and resubmit.
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isPending || isUploading || anyGalleryUploading}
                onClick={() => {
                  if (isCreateMode) {
                    clearAutoSave();
                    // Hard navigation to fully unmount and reset component state
                    window.location.href = backUrl;
                    return;
                  }
                  router.push(backUrl);
                }}
              >
                {isPendingReview && isReviewMode ? "Close" : "Discard"}
              </Button>

              {/* ── Context-dependent action buttons ── */}
              {(() => {
                // Create or draft mode — only Save as Draft in top bar (Submit is in step footer)
                if (isCreateMode || isDraftMode) {
                  return (
                    <Button
                      type="submit"
                      variant="outline"
                      size="sm"
                      disabled={isPending || isUploading || anyGalleryUploading}
                      onClick={() => {
                        submitActionRef.current = "save-draft";
                      }}
                    >
                      {isPending && submitActionRef.current === "save-draft" ? (
                        <>
                          <Spinner className="mr-1" /> Saving{"\u2026"}
                        </>
                      ) : (
                        "Save as Draft"
                      )}
                    </Button>
                  );
                }

                // Rework mode: save + resubmit
                if (isRework) {
                  return (
                    <>
                      <Button
                        type="submit"
                        variant="outline"
                        size="sm"
                        disabled={isPending || isUploading || anyGalleryUploading}
                        onClick={() => {
                          submitActionRef.current = "save";
                        }}
                      >
                        Save
                      </Button>
                      <Button
                        type="submit"
                        size="sm"
                        disabled={isPending || isUploading || anyGalleryUploading}
                        onClick={() => {
                          submitActionRef.current = "resubmit";
                        }}
                      >
                        {isPending && submitActionRef.current === "resubmit" ? (
                          <>
                            <Spinner className="mr-1" /> Resubmitting{"\u2026"}
                          </>
                        ) : (
                          "Resubmit"
                        )}
                      </Button>
                    </>
                  );
                }

                // Pending review mode (approver)
                if (isPendingReview && canApprove) {
                  if (isReviewMode) {
                    return (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isPending || isUploading || anyGalleryUploading}
                          onClick={() => setShowReworkDialog(true)}
                          className="gap-1.5"
                        >
                          <XCircle className="size-4" />
                          Request Rework
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setIsReviewMode(false)}
                          className="gap-1.5"
                        >
                          <Pencil className="size-4" />
                          Edit
                        </Button>
                        <Button
                          type="submit"
                          size="sm"
                          disabled={isPending || isUploading || anyGalleryUploading}
                          onClick={() => {
                            submitActionRef.current = "approve";
                          }}
                          className="gap-1.5"
                        >
                          {isPending &&
                          submitActionRef.current === "approve" ? (
                            <>
                              <Spinner className="mr-1" /> Approving{"\u2026"}
                            </>
                          ) : (
                            <>
                              <CheckCircle className="size-4" />
                              Approve
                            </>
                          )}
                        </Button>
                      </>
                    );
                  }
                  // Edit mode for approver on pending listing
                  return (
                    <>
                      <Button
                        type="submit"
                        variant="outline"
                        size="sm"
                        disabled={isPending || isUploading || anyGalleryUploading}
                        onClick={() => {
                          submitActionRef.current = "save";
                        }}
                      >
                        Save
                      </Button>
                      <Button
                        type="submit"
                        size="sm"
                        disabled={isPending || isUploading || anyGalleryUploading}
                        onClick={() => {
                          submitActionRef.current = "approve";
                        }}
                        className="gap-1.5"
                      >
                        {isPending && submitActionRef.current === "approve" ? (
                          <>
                            <Spinner className="mr-1" /> Approving{"\u2026"}
                          </>
                        ) : (
                          <>
                            <CheckCircle className="size-4" />
                            Approve
                          </>
                        )}
                      </Button>
                    </>
                  );
                }

                // Default: normal edit (Approved listing)
                return (
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isPending || isUploading || anyGalleryUploading}
                    onClick={() => {
                      submitActionRef.current = "save";
                    }}
                  >
                    {isPending ? (
                      <>
                        <Spinner className="mr-1" /> Saving{"\u2026"}
                      </>
                    ) : (
                      "Save"
                    )}
                  </Button>
                );
              })()}
            </div>
          </div>

          {/* ── Step Indicator ──────────────────────────────────── */}
          <nav aria-label="Wizard steps" className="mx-auto mt-3 max-w-sm pb-6">
            <ol className="flex items-center">
              {STEP_META.map((meta, idx) => {
                const Icon = meta.icon;
                const isCompleted = isEditing
                  ? idx !== currentStep
                  : stepDone[idx] && idx < currentStep;
                const isCurrent = idx === currentStep;
                const isClickable =
                  isEditing ||
                  isDraftMode ||
                  idx < currentStep ||
                  stepDone[idx];

                return (
                  <li
                    key={meta.label}
                    className={cn(
                      "flex items-center",
                      idx < TOTAL_STEPS - 1 && "flex-1",
                    )}
                  >
                    {/* Step circle + label */}
                    <button
                      type="button"
                      disabled={!isClickable}
                      onClick={() => goToStep(idx)}
                      className="flex flex-col items-center gap-1.5 disabled:cursor-default"
                    >
                      <div
                        className={cn(
                          "flex size-9 items-center justify-center rounded-full border-2 transition-all duration-300",
                          isCompleted &&
                            "border-primary bg-primary text-primary-foreground",
                          isCurrent &&
                            "border-primary bg-primary/10 text-primary ring-4 ring-primary/20",
                          !isCompleted &&
                            !isCurrent &&
                            "border-muted-foreground/20 bg-muted/50 text-muted-foreground",
                        )}
                      >
                        {isCompleted ? (
                          <Check className="size-3.5" strokeWidth={3} />
                        ) : (
                          <Icon className="size-3.5" />
                        )}
                      </div>
                      <span
                        className={cn(
                          "text-[11px] font-medium transition-colors",
                          isCurrent
                            ? "text-primary"
                            : isCompleted
                              ? "text-foreground"
                              : "text-muted-foreground",
                        )}
                      >
                        {meta.stepLabel}
                      </span>
                    </button>

                    {/* Connector line */}
                    {idx < TOTAL_STEPS - 1 && (
                      <div className="mx-3 mb-5 h-0.5 flex-1 overflow-hidden rounded-full bg-border">
                        <div
                          className={cn(
                            "h-full rounded-full bg-primary transition-all duration-500",
                            (
                              isEditing
                                ? idx < currentStep
                                : stepDone[idx] && idx < currentStep
                            )
                              ? "w-full"
                              : "w-0",
                          )}
                        />
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        </header>

        {/* ── Scrollable Body ───────────────────────────────────── */}
        <div ref={scrollBodyRef} className="min-h-0 flex-1 overflow-y-auto">
          {/* ──────────────────────────────────────────────────────
              STEP 0: PRODUCT
             ────────────────────────────────────────────────────── */}
          <div
            className={cn(
              "mx-auto max-w-2xl flex flex-col gap-6 px-6 py-8 pb-6",
              currentStep !== 0 && "hidden",
            )}
          >
            <StepHeader step={STEP_META[0]} />

            {/* Product Type */}
            <div className="flex flex-col gap-3">
              <SubSectionLabel icon={Wrench}>Product Type</SubSectionLabel>
              <div className="grid grid-cols-2 gap-3">
                <OptionCard
                  selected={productType === "equipment"}
                  onSelect={() => {
                    setProductType("equipment");
                    setSelectedModel("");
                  }}
                  icon={Wrench}
                  iconColor="text-blue-500"
                  iconBg="bg-blue-500/10"
                  label="Equipment"
                  description="Heavy machines"
                />
                <OptionCard
                  selected={productType === "attachment"}
                  onSelect={() => {
                    setProductType("attachment");
                    setSelectedModel("");
                  }}
                  icon={Puzzle}
                  iconColor="text-amber-500"
                  iconBg="bg-amber-500/10"
                  label="Attachment"
                  description="Add-on parts"
                />
              </div>
            </div>

            {/* Model */}
            <div className="flex flex-col gap-3">
              <label className="flex items-center gap-1.5 text-sm font-medium">
                <Package className="size-4 text-muted-foreground" />
                Model
              </label>
              <Button
                type="button"
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !selectedModel && "text-muted-foreground",
                  step0Attempted && !selectedModel && "border-destructive",
                )}
                onClick={() => setModelPickerOpen(true)}
              >
                <Package className="mr-2 size-4" />
                {selectedModel || `Select ${productType} model\u2026`}
              </Button>
              <ModelPickerDialog
                open={modelPickerOpen}
                onOpenChange={setModelPickerOpen}
                productType={productType}
                brands={brands}
                equipmentModels={equipmentModels}
                mainCategories={mainCategories}
                subCategories={subCategories}
                subCategoryBrandLinks={subCategoryBrandLinks}
                attachmentModels={attachmentModels}
                attachmentCategories={attachmentCategories}
                categoryBrandLinks={categoryBrandLinks}
                currentModel={selectedModel}
                onSelect={(name) => setSelectedModel(name)}
              />
              {step0Attempted && !selectedModel && (
                <p className="text-destructive text-xs">
                  Please select a model.
                </p>
              )}
            </div>

            {/* Listing Type — create/draft mode only */}
            {(!isEditing || isDraftMode) && (
              <div className="flex flex-col gap-3">
                <SubSectionLabel icon={ShoppingCart}>
                  Listing Type
                </SubSectionLabel>
                <div className="grid grid-cols-2 gap-3">
                  <OptionCard
                    selected={forSale}
                    onSelect={() => setForSale(!forSale)}
                    icon={Tag}
                    iconColor="text-emerald-500"
                    iconBg="bg-emerald-500/10"
                    label="For Sale"
                    variant="checkbox"
                  />
                  <OptionCard
                    selected={forRent}
                    onSelect={() => setForRent(!forRent)}
                    icon={RotateCcw}
                    iconColor="text-sky-500"
                    iconBg="bg-sky-500/10"
                    label="For Rent"
                    variant="checkbox"
                  />
                </div>

                {/* Condition — appears below grid when For Sale is checked */}
                {forSale && conditionTypes.length > 0 && (
                  <div className="flex flex-col gap-3">
                    <p className="flex items-center gap-1.5 text-sm font-medium">
                      <Sparkles className="size-4 text-muted-foreground" />
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
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "ring-border text-muted-foreground hover:text-foreground bg-background ring-1",
                          )}
                        >
                          {ct.name}
                        </button>
                      ))}
                    </div>
                    {step0Attempted && conditionRequired && !conditionId && (
                      <p className="text-destructive text-xs">
                        Please select a condition.
                      </p>
                    )}
                  </div>
                )}

                {step0Attempted && !forSale && !forRent && (
                  <p className="text-destructive text-xs">
                    Select at least one listing type.
                  </p>
                )}
              </div>
            )}

            {/* Condition — edit mode, sale only */}
            {isEditing && pageType === "sale" && conditionTypes.length > 0 && (
              <div className="flex flex-col gap-3">
                <SubSectionLabel icon={Sparkles}>Condition</SubSectionLabel>
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

            {/* Custom Fields */}
            <div className="flex flex-col gap-3">
              <label className="flex items-center gap-1.5 text-sm font-medium">
                <ClipboardList className="size-4 text-muted-foreground" />
                Specifications{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </label>
              <CustomFieldsSection
                templates={templates}
                initialValues={customFieldValues}
                onChange={setCustomFieldValues}
              />
            </div>

            {/* Description */}
            <div className="flex flex-col gap-3">
              <label className="flex items-center gap-1.5 text-sm font-medium">
                <FileText className="size-4 text-muted-foreground" />
                Description{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </label>
              <MarkdownEditor
                name="description"
                placeholder={"Describe the product\u2026"}
                defaultValue={description}
                onChange={setDescription}
              />
            </div>

            {/* Step footer */}
            <div className="flex items-center justify-end pt-2">
              <Button type="button" size="sm" onClick={goNext}>
                Next <ArrowRight className="ml-1 size-3.5" />
              </Button>
            </div>
          </div>

          {/* ──────────────────────────────────────────────────────
              STEP 1: SELLER & DEAL
             ────────────────────────────────────────────────────── */}
          <div
            className={cn(
              "mx-auto max-w-2xl flex flex-col gap-8 px-6 py-8 pb-4",
              currentStep !== 1 && "hidden",
            )}
          >
            <StepHeader step={STEP_META[1]} />

            {/* ── Seller sub-section ─────────────────────────────── */}
            <div className="flex flex-col gap-3">
              <SubSectionLabel icon={Handshake}>Seller</SubSectionLabel>
              <div className="flex flex-col gap-3">
                <Combobox
                  value={selectedPartner}
                  defaultInputValue={
                    savedState?.selectedPartner ?? initPartnerLabel
                  }
                  onValueChange={(val) => setSelectedPartner(val ?? "")}
                  items={partnerNames}
                >
                  <ComboboxInput
                    placeholder={"Search partner\u2026"}
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
                {step1Attempted && !selectedPartner && (
                  <p className="text-destructive text-xs">
                    Please select a partner.
                  </p>
                )}
                <label className="flex items-center justify-between rounded-lg border px-4 py-3">
                  <div className="flex items-center gap-2">
                    <EyeOff className="size-4 text-muted-foreground" />
                    <span className="text-sm">
                      Hide seller info from buyers
                    </span>
                  </div>
                  <Switch
                    checked={hidePartner}
                    onCheckedChange={setHidePartner}
                  />
                </label>
              </div>
            </div>

            <hr className="border-border" />

            {/* ── Location sub-section ───────────────────────────── */}
            <div className="flex flex-col gap-3">
              <SubSectionLabel icon={MapPin}>
                Location{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </SubSectionLabel>

              <div className="flex flex-col gap-3 rounded-xl border p-4">
                {/* State / Region */}
                <div className="flex flex-col gap-3">
                  <p className="flex items-center gap-1.5 text-sm font-medium">
                    <MapIcon className="size-4 text-muted-foreground" />
                    State / Region
                  </p>
                  <Combobox
                    value={stateRegionNameById.get(selectedStateRegionId) ?? ""}
                    defaultInputValue={
                      stateRegionNameById.get(
                        savedState?.selectedStateRegionId ??
                          initLocation.stateRegionId,
                      ) ?? ""
                    }
                    onValueChange={(val) => {
                      const id = val
                        ? (stateRegionIdByName.get(val) ?? "")
                        : "";
                      setSelectedStateRegionId(id);
                      setSelectedDistrictId("");
                      setSelectedTownshipId("");
                    }}
                    items={stateRegionNames}
                  >
                    <ComboboxInput
                      placeholder={"Select state / region\u2026"}
                      showClear={!!selectedStateRegionId}
                    />
                    <ComboboxContent>
                      <ComboboxList>
                        <ComboboxEmpty>No state/region found</ComboboxEmpty>
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

                {/* District */}
                {selectedStateRegionId && (
                  <div className="flex flex-col gap-3">
                    <p className="flex items-center gap-1.5 text-sm font-medium">
                      <MapPin className="size-4 text-muted-foreground" />
                      District
                    </p>
                    <Combobox
                      value={districtNameById.get(selectedDistrictId) ?? ""}
                      defaultInputValue={
                        districtNameById.get(
                          savedState?.selectedDistrictId ??
                            initLocation.districtId,
                        ) ?? ""
                      }
                      onValueChange={(val) => {
                        const id = val ? (districtIdByName.get(val) ?? "") : "";
                        setSelectedDistrictId(id);
                        setSelectedTownshipId("");
                      }}
                      items={districtNames}
                    >
                      <ComboboxInput
                        placeholder={"Select district\u2026"}
                        showClear={!!selectedDistrictId}
                      />
                      <ComboboxContent>
                        <ComboboxList>
                          <ComboboxEmpty>No district found</ComboboxEmpty>
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
                )}

                {/* Township */}
                {selectedDistrictId && (
                  <div className="flex flex-col gap-3">
                    <p className="flex items-center gap-1.5 text-sm font-medium">
                      <MapPin className="size-4 text-muted-foreground" />
                      Township
                    </p>
                    <Combobox
                      value={
                        filteredTownships.find(
                          (t) => String(t.township_id) === selectedTownshipId,
                        )?.name ?? ""
                      }
                      defaultInputValue={
                        savedState
                          ? (filteredTownships.find(
                              (t) =>
                                String(t.township_id) ===
                                savedState.selectedTownshipId,
                            )?.name ?? "")
                          : selectedTownshipId === initLocation.townshipId
                            ? (sourceData?.township_name ?? "")
                            : ""
                      }
                      onValueChange={(val) => {
                        const id = val ? (townshipIdByName.get(val) ?? "") : "";
                        setSelectedTownshipId(id);
                      }}
                      items={townshipNames}
                    >
                      <ComboboxInput
                        placeholder={"Select township\u2026"}
                        showClear={!!selectedTownshipId}
                      />
                      <ComboboxContent>
                        <ComboboxList>
                          <ComboboxEmpty>No township found</ComboboxEmpty>
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
                )}

                {/* Address */}
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Address (optional)"
                />
                <label className="flex items-center gap-2 cursor-pointer -mt-1">
                  <Switch
                    checked={hideAddress}
                    onCheckedChange={setHideAddress}
                  />
                  <span className="text-xs text-muted-foreground">Hide address from buyers</span>
                </label>
              </div>
            </div>

            <hr className="border-border" />

            {/* ── Pricing sub-section ────────────────────────────── */}
            {(() => {
              // Edit mode: show one card based on pageType
              if (isEditing) {
                return pageType === "sale" ? (
                  <PricingCard
                    icon={Tag}
                    label="Sale Price"
                    usdPrice={saleUsdPrice}
                    mmkPrice={saleMmkPrice}
                    onUsdChange={(v) => {
                      setSaleUsdPrice(v);
                      setSaleMmkPrice(convertSaleUsdToMmk(v));
                    }}
                    onMmkChange={(v) => {
                      setSaleMmkPrice(v);
                      setSaleUsdPrice(convertSaleMmkToUsd(v));
                    }}
                    activeRate={saleActiveRate}
                    useSystemRate={saleUseSystemRate}
                    onToggleSystemRate={setSaleUseSystemRate}
                    customRate={saleCustomRate}
                    onCustomRateChange={setSaleCustomRate}
                    systemRate={exchangeRate}
                    displayCurrency={saleDisplayCurrency}
                    onDisplayCurrencyChange={setSaleDisplayCurrency}
                    hidePrice={saleHidePrice}
                    onHidePriceChange={setSaleHidePrice}
                  />
                ) : (
                  <div className="flex flex-col gap-6">
                    <PricingCard
                      icon={RotateCcw}
                      label="Rental Price"
                      usdPrice={rentUsdPrice}
                      mmkPrice={rentMmkPrice}
                      onUsdChange={(v) => {
                        setRentUsdPrice(v);
                        setRentMmkPrice(convertRentUsdToMmk(v));
                      }}
                      onMmkChange={(v) => {
                        setRentMmkPrice(v);
                        setRentUsdPrice(convertRentMmkToUsd(v));
                      }}
                      activeRate={rentActiveRate}
                      useSystemRate={rentUseSystemRate}
                      onToggleSystemRate={setRentUseSystemRate}
                      customRate={rentCustomRate}
                      onCustomRateChange={setRentCustomRate}
                      systemRate={exchangeRate}
                      displayCurrency={rentDisplayCurrency}
                      onDisplayCurrencyChange={setRentDisplayCurrency}
                      hidePrice={rentHidePrice}
                      onHidePriceChange={setRentHidePrice}
                    />
                    <Field>
                      <FieldLabel>Rental Unit</FieldLabel>
                      <FieldContent>
                        <Select value={rentalUnit} onValueChange={setRentalUnit}>
                          <SelectTrigger className="w-48">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="per_day">Per Day</SelectItem>
                            <SelectItem value="per_month">Per Month</SelectItem>
                            <SelectItem value="per_duty">Per Duty</SelectItem>
                          </SelectContent>
                        </Select>
                      </FieldContent>
                    </Field>
                  </div>
                );
              }

              // Create mode: show card(s) based on checked listing types
              return (
                <div className="flex flex-col gap-6">
                  {forSale && (
                    <PricingCard
                      icon={Tag}
                      label="Sale Price"
                      usdPrice={saleUsdPrice}
                      mmkPrice={saleMmkPrice}
                      onUsdChange={(v) => {
                        setSaleUsdPrice(v);
                        setSaleMmkPrice(convertSaleUsdToMmk(v));
                      }}
                      onMmkChange={(v) => {
                        setSaleMmkPrice(v);
                        setSaleUsdPrice(convertSaleMmkToUsd(v));
                      }}
                      activeRate={saleActiveRate}
                      useSystemRate={saleUseSystemRate}
                      onToggleSystemRate={setSaleUseSystemRate}
                      customRate={saleCustomRate}
                      onCustomRateChange={setSaleCustomRate}
                      systemRate={exchangeRate}
                      displayCurrency={saleDisplayCurrency}
                      onDisplayCurrencyChange={setSaleDisplayCurrency}
                      hidePrice={saleHidePrice}
                      onHidePriceChange={setSaleHidePrice}
                      error={
                        step1Attempted && !salePriceValid
                          ? "Please enter a sale price"
                          : undefined
                      }
                    />
                  )}
                  {forRent && (
                    <>
                      <PricingCard
                        icon={RotateCcw}
                        label="Rental Price"
                        usdPrice={rentUsdPrice}
                        mmkPrice={rentMmkPrice}
                        onUsdChange={(v) => {
                          setRentUsdPrice(v);
                          setRentMmkPrice(convertRentUsdToMmk(v));
                        }}
                        onMmkChange={(v) => {
                          setRentMmkPrice(v);
                          setRentUsdPrice(convertRentMmkToUsd(v));
                        }}
                        activeRate={rentActiveRate}
                        useSystemRate={rentUseSystemRate}
                        onToggleSystemRate={setRentUseSystemRate}
                        customRate={rentCustomRate}
                        onCustomRateChange={setRentCustomRate}
                        systemRate={exchangeRate}
                        displayCurrency={rentDisplayCurrency}
                        onDisplayCurrencyChange={setRentDisplayCurrency}
                        hidePrice={rentHidePrice}
                        onHidePriceChange={setRentHidePrice}
                        error={
                          step1Attempted && !rentPriceValid
                            ? "Please enter a rental price"
                            : undefined
                        }
                      />
                      <Field>
                        <FieldLabel>Rental Unit</FieldLabel>
                        <FieldContent>
                          <Select value={rentalUnit} onValueChange={setRentalUnit}>
                            <SelectTrigger className="w-48">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="per_day">Per Day</SelectItem>
                              <SelectItem value="per_month">Per Month</SelectItem>
                              <SelectItem value="per_duty">Per Duty</SelectItem>
                            </SelectContent>
                          </Select>
                        </FieldContent>
                      </Field>
                    </>
                  )}
                  {!forSale && !forRent && (
                    <p className="text-muted-foreground text-sm">
                      Select a listing type to set pricing
                    </p>
                  )}
                </div>
              );
            })()}
            {/* Step footer */}
            <div className="flex items-center justify-between pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={goPrev}
              >
                <ArrowLeft className="mr-1 size-3.5" /> Back
              </Button>
              <Button type="button" size="sm" onClick={goNext}>
                Next <ArrowRight className="ml-1 size-3.5" />
              </Button>
            </div>
          </div>

          {/* ──────────────────────────────────────────────────────
              STEP 2: PHOTOS
             ────────────────────────────────────────────────────── */}
          <div
            className={cn(
              "mx-auto max-w-3xl flex flex-col gap-6 px-6 py-8 pb-4",
              currentStep !== 2 && "hidden",
            )}
          >
            <StepHeader step={STEP_META[2]} />

            {/* Thumbnail */}
            <div className="flex flex-col gap-3">
              <label className="flex items-center gap-1.5 text-sm font-medium">
                <ImageIcon className="size-4 text-muted-foreground" />
                Thumbnail
                {isCreateMode && (
                  <span className="text-destructive text-xs font-normal">
                    *
                  </span>
                )}
              </label>
              <ImageInput
                name="thumbnail_url"
                value={thumbnailUrl}
                onChange={setThumbnailUrl}
                placeholder="Upload cover"
                aspectClassName="aspect-video w-full max-w-xs"
                aspectRatio={1}
                focalPoint={thumbnailFocalPoint ?? undefined}
                onFocalPointChange={setThumbnailFocalPoint}
                feature={pageType === "sale" ? "sale_listings" : "rent_listings"}
                permission={isEditing ? "edit" : "create"}
                onUploadingChange={setIsUploading}
              />
              {submitted && isCreateMode && !thumbnailUrl && (
                <p className="text-destructive text-xs">
                  Thumbnail is required.
                </p>
              )}
            </div>

            {/* Product Photos */}
            <div className="flex flex-col gap-3">
              <label className="flex items-center gap-1.5 text-sm font-medium">
                <Camera className="size-4 text-muted-foreground" />
                Product Photos
                {isCreateMode && (
                  <span className="text-destructive text-xs font-normal">
                    *
                  </span>
                )}
              </label>
              <Suspense
                fallback={
                  <div className="flex items-center justify-center p-8">
                    <Spinner className="size-5" />
                  </div>
                }
              >
                <LazySortableImageGallery
                  items={galleryItems}
                  onChange={setGalleryItems}
                  aspectRatio={4 / 3}
                  feature={pageType === "sale" ? "sale_listings" : "rent_listings"}
                  permission={isEditing ? "edit" : "create"}
                />
              </Suspense>
              {submitted && isCreateMode && galleryItems.length === 0 && (
                <p className="text-destructive text-xs">
                  At least one photo is required.
                </p>
              )}
            </div>

            {/* Step footer */}
            <div className="flex items-center justify-between pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={goPrev}
              >
                <ArrowLeft className="mr-1 size-3.5" /> Back
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isPending || isUploading || anyGalleryUploading}
                onClick={() => {
                  submitActionRef.current = isRework
                    ? "resubmit"
                    : isEditing
                      ? "save"
                      : "submit";
                }}
              >
                {isPending ? (
                  <>
                    <Spinner className="mr-1" /> Saving{"\u2026"}
                  </>
                ) : isRework ? (
                  "Resubmit"
                ) : isEditing ? (
                  "Save"
                ) : (
                  "Submit for Review"
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* ── Rework Request Dialog ── */}
        {showReworkDialog && (
          <FormDialog
            open={showReworkDialog}
            onOpenChange={setShowReworkDialog}
            title="Request Rework"
            description={`Request rework for listing "${listing?.model_name ?? "Unknown"}".`}
            icon={<XCircle className="text-primary-foreground size-6" />}
            onSubmit={handleRequestRework}
            isPending={isPending}
            submitLabel="Request Rework"
          >
            <div className="space-y-4">
              <Field orientation="vertical">
                <FieldLabel>Reason (optional)</FieldLabel>
                <FieldContent>
                  <Input
                    name="rework_reason"
                    placeholder="e.g. Incomplete listing details"
                  />
                </FieldContent>
              </Field>
            </div>
          </FormDialog>
        )}
      </FormSubmittedContext>
    </form>
  );
}
