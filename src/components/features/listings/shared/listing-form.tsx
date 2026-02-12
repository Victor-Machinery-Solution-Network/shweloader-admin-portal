"use client";

import { useState, useMemo, useTransition, useRef, useCallback } from "react";
import { ShoppingCart, Home } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel, FieldContent } from "@/components/ui/field";
import { ImageInput } from "@/components/ui/image-input";
import { SortableImageGallery } from "@/components/shared/sortable-image-gallery";
import { SYSTEM_EXCHANGE_RATE } from "@/lib/constants";
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
  ComboboxCollection,
} from "@/components/ui/combobox";
import { FormDialog } from "@/components/shared/form-dialog";
import {
  createListing,
  updateSaleListing,
  updateRentListing,
} from "@/lib/actions/listing";
import type { EquipmentModel } from "@/types/equipment";
import type { AttachmentModel } from "@/types/attachment";
import type { Location } from "@/types/location";
import type {
  SaleListingWithDetails,
  RentListingWithDetails,
  ProductImage,
  ApprovedPartner,
} from "@/types/listing";

type ListingDetails = SaleListingWithDetails | RentListingWithDetails;

interface ListingFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Which page opened this form — determines defaults and edit behavior */
  pageType: "sale" | "rent";
  listing?: ListingDetails;
  existingImages?: ProductImage[];
  partners: ApprovedPartner[];
  equipmentModels: EquipmentModel[];
  attachmentModels: AttachmentModel[];
  locations: Location[];
}

export function ListingForm({
  open,
  onOpenChange,
  pageType,
  listing,
  existingImages = [],
  partners,
  equipmentModels,
  attachmentModels,
  locations,
}: ListingFormProps) {
  const [isPending, startTransition] = useTransition();
  const isEditing = !!listing;
  const containerRef = useRef<HTMLDivElement>(null);

  // Product type state
  const defaultProductType = listing?.equipment_model_id
    ? "equipment"
    : "attachment";
  const [productType, setProductType] = useState<"equipment" | "attachment">(
    defaultProductType,
  );

  // Listing type checkboxes (for create only)
  const [forSale, setForSale] = useState(pageType === "sale");
  const [forRent, setForRent] = useState(pageType === "rent");

  // Combobox selections - partner label needs proper format
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

  // Image URLs state
  const [imageUrls, setImageUrls] = useState<string[]>(
    existingImages.length > 0 ? existingImages.map((img) => img.url) : [],
  );

  // Thumbnail state
  const [thumbnail, setThumbnail] = useState<string | null>(
    listing?.thumbnail_url ?? null,
  );

  // Price calculation state
  const [usdPrice, setUsdPrice] = useState<string>(
    listing?.usd_price?.toString() ?? "",
  );
  const [useSystemRate, setUseSystemRate] = useState<boolean>(true);
  const [customRate, setCustomRate] = useState<string>("3200");

  // Calculate MMK price
  const mmkPrice = useMemo(() => {
    const usd = parseFloat(usdPrice);
    const rate = useSystemRate
      ? SYSTEM_EXCHANGE_RATE
      : parseFloat(customRate) || 0;
    return isNaN(usd) ? 0 : Math.round(usd * rate);
  }, [usdPrice, useSystemRate, customRate]);

  // Build maps for ID lookups
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

  // Combobox item lists
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

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        setProductType(defaultProductType);
        setSelectedPartner(initPartnerLabel);
        setSelectedModel(listing?.model_name ?? "");
        setSelectedLocation(listing?.location_name ?? "");
        setImageUrls(
          existingImages.length > 0 ? existingImages.map((img) => img.url) : [],
        );
        setThumbnail(listing?.thumbnail_url ?? null);
        setUsdPrice(listing?.usd_price?.toString() ?? "");
        setUseSystemRate(true);
        setCustomRate("3200");
        setForSale(pageType === "sale");
        setForRent(pageType === "rent");
      }
      onOpenChange(nextOpen);
    },
    [
      defaultProductType,
      initPartnerLabel,
      listing,
      existingImages,
      onOpenChange,
      pageType,
    ],
  );

  function handleSubmit(formData: FormData) {
    // Resolve IDs from combobox selections
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

    const locationId = locationMap.get(selectedLocation);

    formData.set("product_type", productType);
    formData.set("partner_id", String(partnerId));
    formData.set("model_id", String(modelId));
    if (locationId) formData.set("location_id", String(locationId));

    // Set prices
    formData.set("usd_price", usdPrice || "");
    formData.set("mmk_price", mmkPrice.toString());

    // Listing type flags
    formData.set("for_sale", forSale ? "1" : "0");
    formData.set("for_rent", forRent ? "1" : "0");

    // Append image URLs
    imageUrls.forEach((url, i) => {
      formData.set(`image_url_${i}`, url);
    });

    startTransition(async () => {
      let result;
      if (isEditing) {
        // Edit mode: update the specific listing type for this page
        result =
          pageType === "sale"
            ? await updateSaleListing(listing!.id, formData)
            : await updateRentListing(listing!.id, formData);
      } else {
        // Create mode: use unified create that supports both
        result = await createListing(formData);
      }

      if (result.success) {
        toast.success(isEditing ? "Listing updated" : "Listing created");
        handleOpenChange(false);
      } else {
        toast.error(result.error ?? "Something went wrong");
      }
    });
  }

  const showCondition = forSale;
  const saleDefaults = listing && "condition" in listing ? listing : null;

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={isEditing ? "Edit Listing" : "Add Listing"}
      description={
        isEditing ? "Update the listing details." : "Create a new listing."
      }
      icon={
        pageType === "sale" ? (
          <ShoppingCart className="text-muted-foreground size-6" />
        ) : (
          <Home className="text-muted-foreground size-6" />
        )
      }
      onSubmit={handleSubmit}
      isPending={isPending}
      submitLabel={isEditing ? "Update" : "Create"}
      className="sm:max-w-2xl max-h-[90vh]"
    >
      <div ref={containerRef} className="space-y-4">
        {/* Listing Type Selection (create only) */}
        {!isEditing && (
          <Field orientation="vertical">
            <FieldLabel>Listing Type</FieldLabel>
            <FieldContent>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={forSale ? "default" : "outline"}
                  onClick={() => setForSale(!forSale)}
                >
                  For Sale
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={forRent ? "default" : "outline"}
                  onClick={() => setForRent(!forRent)}
                >
                  For Rent
                </Button>
              </div>
              <p className="text-muted-foreground text-xs mt-1">
                Select one or both
              </p>
            </FieldContent>
          </Field>
        )}

        {/* Product Type Selection */}
        <Field orientation="vertical">
          <FieldLabel>Product Type</FieldLabel>
          <FieldContent>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={productType === "equipment" ? "default" : "outline"}
                onClick={() => {
                  setProductType("equipment");
                  setSelectedModel("");
                }}
              >
                Equipment
              </Button>
              <Button
                type="button"
                size="sm"
                variant={productType === "attachment" ? "default" : "outline"}
                onClick={() => {
                  setProductType("attachment");
                  setSelectedModel("");
                }}
              >
                Attachment
              </Button>
            </div>
          </FieldContent>
        </Field>

        {/* Model */}
        <Field orientation="vertical">
          <FieldLabel>Model</FieldLabel>
          <FieldContent>
            <Combobox
              value={selectedModel}
              onValueChange={(val) => setSelectedModel(val ?? "")}
              items={modelNames}
            >
              <ComboboxInput
                placeholder={`Search ${productType} model...`}
                showClear={!!selectedModel}
              />
              <ComboboxContent container={containerRef}>
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
          </FieldContent>
        </Field>

        {/* Partner */}
        <Field orientation="vertical">
          <FieldLabel>Partner</FieldLabel>
          <FieldContent>
            <Combobox
              value={selectedPartner}
              onValueChange={(val) => setSelectedPartner(val ?? "")}
              items={partnerNames}
            >
              <ComboboxInput
                placeholder="Search partner..."
                showClear={!!selectedPartner}
              />
              <ComboboxContent container={containerRef}>
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
          </FieldContent>
        </Field>

        {/* Location */}
        <Field orientation="vertical">
          <FieldLabel>Location</FieldLabel>
          <FieldContent>
            <Combobox
              value={selectedLocation}
              onValueChange={(val) => setSelectedLocation(val ?? "")}
              items={locationNames}
            >
              <ComboboxInput
                placeholder="Search location (optional)..."
                showClear={!!selectedLocation}
              />
              <ComboboxContent container={containerRef}>
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
          </FieldContent>
        </Field>

        {/* Custom ID */}
        <Field orientation="vertical">
          <FieldLabel>Custom ID</FieldLabel>
          <FieldContent>
            <Input
              name="custom_id"
              placeholder="e.g. SL-001"
              defaultValue={listing?.custom_id ?? ""}
            />
          </FieldContent>
        </Field>

        {/* Condition (sale only) */}
        {showCondition && (
          <Field orientation="vertical">
            <FieldLabel>Condition</FieldLabel>
            <FieldContent>
              <Input
                name="condition"
                placeholder="e.g. Used - Good"
                defaultValue={saleDefaults?.condition ?? ""}
              />
            </FieldContent>
          </Field>
        )}

        {/* Prices */}
        <div className="space-y-4">
          <Field orientation="vertical">
            <FieldLabel>USD Price</FieldLabel>
            <FieldContent>
              <Input
                name="usd_price"
                type="number"
                placeholder="0"
                value={usdPrice}
                onChange={(e) => setUsdPrice(e.target.value)}
                onWheel={(e) => {
                  // Prevent mouse wheel from incrementing the number input;
                  // let the dialog scroll instead.
                  e.currentTarget.blur();
                }}
              />
            </FieldContent>
          </Field>

          <Field orientation="vertical">
            <FieldLabel>Exchange Rate</FieldLabel>
            <FieldContent className="space-y-2">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={useSystemRate ? "default" : "outline"}
                  size="sm"
                  onClick={() => setUseSystemRate(true)}
                >
                  System Rate ({SYSTEM_EXCHANGE_RATE})
                </Button>
                <Button
                  type="button"
                  variant={!useSystemRate ? "default" : "outline"}
                  size="sm"
                  onClick={() => setUseSystemRate(false)}
                >
                  Custom Rate
                </Button>
              </div>
              {!useSystemRate && (
                <Input
                  type="number"
                  placeholder="Enter custom rate"
                  value={customRate}
                  onChange={(e) => setCustomRate(e.target.value)}
                  onWheel={(e) => {
                    e.currentTarget.blur();
                  }}
                />
              )}
            </FieldContent>
          </Field>

          <Field orientation="vertical">
            <FieldLabel>MMK Price (Calculated)</FieldLabel>
            <FieldContent>
              <Input
                type="text"
                value={mmkPrice.toLocaleString()}
                readOnly
                className="bg-muted"
              />
            </FieldContent>
          </Field>
        </div>

        {/* Thumbnail */}
        <Field orientation="vertical">
          <FieldLabel>Thumbnail</FieldLabel>
          <FieldContent>
            <ImageInput
              name="thumbnail_url"
              value={thumbnail}
              onChange={setThumbnail}
              placeholder="Upload a thumbnail image"
            />
          </FieldContent>
        </Field>

        {/* Description */}
        <Field orientation="vertical">
          <FieldLabel>Description</FieldLabel>
          <FieldContent>
            <Textarea
              name="description"
              placeholder="Describe the product..."
              rows={3}
              defaultValue={listing?.description ?? ""}
            />
          </FieldContent>
        </Field>

        {/* Product Photos */}
        <Field orientation="vertical">
          <FieldLabel>Product Photos</FieldLabel>
          <FieldContent>
            <SortableImageGallery
              images={imageUrls}
              onChange={setImageUrls}
              maxImages={20}
            />
          </FieldContent>
        </Field>
      </div>
    </FormDialog>
  );
}
