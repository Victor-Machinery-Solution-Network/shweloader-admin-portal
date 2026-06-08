"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import {
  ArrowLeft,
  Pencil,
  Mail,
  Phone,
  MapPin,
  Star,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  FileDown,
  ArrowRightLeft,
  ShieldCheck,
  ExternalLink,
  Package,
  UserRound,
  Clock,
  CalendarCheck,
  BadgeCheck,
  Layers,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { assetUrl } from "@/lib/r2-url";
import type { ListingDetail, ProductImage } from "@/types/listing";
import type { CustomFieldValue } from "@/types/custom-field";

function fmtPrice(v: number | null) { return v == null ? "—" : v.toLocaleString(); }
function hasPositivePrice(v: number | null) { return Number(v ?? 0) > 0; }
function fmtDate(s: string | null) { if (!s) return "—"; try { return format(new Date(s), "d MMM yyyy"); } catch { return s; } }
function fmtDateTime(s: string | null) { if (!s) return "—"; try { return format(new Date(s), "d MMM yyyy, h:mm a"); } catch { return s; } }

interface Props { listing: ListingDetail; images: ProductImage[]; }

export function ListingDetailView({ listing, images }: Props) {
  const [idx, setIdx] = useState(0);

  const backHref = listing.listing_type === "sale" ? "/listings/for-sale" : "/listings/for-rent";
  const backLabel = listing.listing_type === "sale" ? "Listings For Sale" : "Listings For Rent";
  const editHref = listing.listing_type === "sale"
    ? `/listings/for-sale/${listing.id}/edit`
    : `/listings/for-rent/${listing.id}/edit`;

  const gallery = images.length > 0 ? images : null;
  const activeImage = gallery ? assetUrl(gallery[idx]?.url) : assetUrl(listing.thumbnail_url);
  const hasMmkPrice = hasPositivePrice(listing.mmk_price);
  const hasUsdPrice = hasPositivePrice(listing.usd_price);
  const shouldCheckWithSupplier = !hasMmkPrice && !hasUsdPrice;

  // Parse custom fields (array of { key, label, type, value })
  const customFields: CustomFieldValue[] = listing.custom_fields
    ? (() => { try { const p = JSON.parse(listing.custom_fields); return Array.isArray(p) ? p.filter((f: CustomFieldValue) => f.value) : []; } catch { return []; } })()
    : [];

  const categoryParts: string[] = [];
  if (listing.product_type === "equipment") {
    if (listing.main_category_name) categoryParts.push(listing.main_category_name);
    if (listing.sub_category_name) categoryParts.push(listing.sub_category_name);
  } else if (listing.attachment_category_name) {
    categoryParts.push(listing.attachment_category_name);
  }

  const pdfSrc = assetUrl(listing.pdf_url);

  return (
    <div className="space-y-5 pb-8">
      {/* Nav */}
      <div className="flex items-center justify-between">
        <Link href={backHref} className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors">
          <ArrowLeft className="size-4" />
          {backLabel}
        </Link>
        <div className="flex items-center gap-2">
          {pdfSrc && (
            <Button variant="ghost" size="sm" asChild>
              <a href={pdfSrc} target="_blank" rel="noopener noreferrer"><FileDown className="mr-1.5 size-4" />Spec Sheet</a>
            </Button>
          )}
          <Button variant="outline" size="sm" asChild>
            <Link href={editHref}><Pencil className="mr-1.5 size-4" />Edit</Link>
          </Button>
        </div>
      </div>

      {/* ── Hero ── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[5fr_4fr]">
        {/* Gallery */}
        <div className="space-y-2">
          <div className="bg-muted relative aspect-[16/9] overflow-hidden rounded-xl">
            {activeImage ? (
              <Image src={activeImage} alt={listing.model_name ?? "Product"} fill className="object-cover" sizes="(max-width: 1024px) 100vw, 50vw" />
            ) : (
              <div className="text-muted-foreground flex h-full items-center justify-center text-sm">No image</div>
            )}
            {gallery && gallery.length > 1 && (
              <>
                <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2.5 py-0.5 font-mono text-xs tabular-nums text-white">{idx + 1}/{gallery.length}</span>
                <button onClick={() => setIdx((p) => (p === 0 ? gallery.length - 1 : p - 1))} className="absolute top-1/2 left-2 -translate-y-1/2 rounded-full bg-black/40 p-1.5 text-white hover:bg-black/60"><ChevronLeft className="size-4" /></button>
                <button onClick={() => setIdx((p) => (p === gallery.length - 1 ? 0 : p + 1))} className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full bg-black/40 p-1.5 text-white hover:bg-black/60"><ChevronRight className="size-4" /></button>
              </>
            )}
          </div>
          {gallery && gallery.length > 1 && (
            <div className="flex gap-1.5 overflow-x-auto p-1">
              {gallery.map((img, i) => {
                const src = assetUrl(img.url);
                return (
                  <button key={img.image_id} onClick={() => setIdx(i)} className={`relative size-14 flex-shrink-0 overflow-hidden rounded-lg transition-all ${i === idx ? "ring-primary ring-2 ring-offset-1 ring-offset-background" : "opacity-50 hover:opacity-100"}`}>
                    {src ? <Image src={src} alt="" fill className="object-cover" sizes="56px" /> : <div className="bg-muted size-full" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="flex flex-col">
          {/* Title block */}
          {listing.brand_name && (
            <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-widest">{listing.brand_name}</p>
          )}
          <h1 className="text-xl font-bold tracking-tight lg:text-2xl mt-0.5">{listing.model_name ?? "Untitled"}</h1>
          <div className="mt-1 flex items-center gap-2 flex-wrap">
            {listing.custom_id && <span className="text-muted-foreground bg-muted rounded px-1.5 py-0.5 font-mono text-[11px]">{listing.custom_id}</span>}
            {listing.main_category_name && <span className="text-muted-foreground text-xs">{listing.main_category_name}{listing.sub_category_name ? ` / ${listing.sub_category_name}` : ""}</span>}
            {listing.attachment_category_name && <span className="text-muted-foreground text-xs">{listing.attachment_category_name}</span>}
            {listing.approve_status_name && <Badge variant={listing.approve_status_name === "Approved" ? "success" : listing.approve_status_name === "Pending" ? "warning" : "destructive"}>{listing.approve_status_name}</Badge>}
            {listing.featured_id && <Badge variant="default" className="gap-1"><Star className="size-3" />Featured</Badge>}
          </div>

          {/* Price */}
          <div className="mt-3">
            {shouldCheckWithSupplier ? (
              <p className="text-2xl font-bold tracking-tight">
                Price <span className="text-muted-foreground text-sm font-normal">(Check with Supplier)</span>
              </p>
            ) : (
              <p className="text-2xl font-bold tabular-nums tracking-tight">
                {fmtPrice(listing.mmk_price)} <span className="text-muted-foreground text-sm font-normal">MMK</span>
              </p>
            )}
            {hasUsdPrice && (
              <p className="text-muted-foreground text-xs tabular-nums">≈ ${fmtPrice(listing.usd_price)} USD{listing.use_system_rate ? " (system rate)" : ""}</p>
            )}
            {listing.hide_price ? <p className="text-muted-foreground mt-0.5 text-[11px] italic">Price hidden from public</p> : null}
          </div>

          {/* Info grid */}
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t pt-3">
            <KV label="Listing Type" value={listing.listing_type === "sale" ? "For Sale" : "For Rent"} />
            <KV label="Product Type" value={listing.product_type === "equipment" ? "Equipment" : "Attachment"} />
            {listing.listing_type === "sale" && listing.condition_name && <KV label="Condition" value={listing.condition_name} />}
            <div>
              <p className="text-muted-foreground text-[11px]">Visibility</p>
              <div className="flex items-center gap-1 mt-0.5">
                {listing.is_hidden
                  ? <><EyeOff className="text-destructive size-3.5" /><span className="text-destructive text-xs font-medium">Hidden</span></>
                  : <><Eye className="text-emerald-500 size-3.5" /><span className="text-emerald-500 text-xs font-medium">Visible</span></>}
              </div>
            </div>
            <div>
              <p className="text-muted-foreground text-[11px]">{listing.listing_type === "sale" ? "Sold Status" : "Rent Status"}</p>
              <div className="flex items-center gap-1 mt-0.5">
                {listing.listing_type === "sale"
                  ? listing.is_sold_out
                    ? <><Package className="text-destructive size-3.5" /><span className="text-destructive text-xs font-medium">Sold Out</span></>
                    : <><Package className="text-emerald-500 size-3.5" /><span className="text-emerald-500 text-xs font-medium">Available</span></>
                  : listing.is_rented
                    ? <><Package className="text-amber-500 size-3.5" /><span className="text-amber-500 text-xs font-medium">Rented</span></>
                    : <><Package className="text-emerald-500 size-3.5" /><span className="text-emerald-500 text-xs font-medium">Available</span></>}
              </div>
            </div>
            <KV label="Currency" value={listing.display_currency} />
            <KV label="System Rate" value={listing.use_system_rate ? "Yes" : "No"} />
            {(listing.address || listing.township_name || listing.district_name || listing.state_region_name) && (
              <div className="col-span-2 pt-1">
                <p className="text-muted-foreground text-[11px]">Location</p>
                <div className="mt-0.5 space-y-0.5">
                  {listing.address && (
                    <LocationRow value={listing.address} hidden={!!listing.hide_address} primary />
                  )}
                  {listing.township_name && (
                    <LocationRow value={listing.township_name} hidden={!!listing.hide_township} />
                  )}
                  {listing.district_name && (
                    <LocationRow value={listing.district_name} hidden={!!listing.hide_district} />
                  )}
                  {listing.state_region_name && (
                    <LocationRow value={listing.state_region_name} hidden={!!listing.hide_state_region} />
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Cross-listing */}
          {listing.other_listing_id && listing.other_listing_type && (
            <div className="mt-3 flex items-center gap-1.5 text-xs">
              <ArrowRightLeft className="text-blue-500 size-3.5" />
              <span className="text-muted-foreground">Also listed</span>
              <Link href={`/listings/${listing.product_list_id}`} className="text-blue-500 hover:underline font-medium inline-flex items-center gap-0.5">
                for {listing.other_listing_type}<ExternalLink className="size-3" />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ── Info grid: 2 columns ── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Partner (most important for enquiries) */}
        <div className="rounded-xl border p-4">
          <SectionHeader icon={<UserRound className="size-3.5" />} title="Partner / Seller" />
          <div className="mt-3 flex items-start gap-3">
            <div className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-full text-xs font-bold shrink-0">
              {(listing.partner_name ?? "?")[0]?.toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate">{listing.partner_name ?? "—"}</p>
              {listing.partner_company && <p className="text-muted-foreground text-xs truncate">{listing.partner_company}</p>}
              <div className="mt-2 space-y-1">
                {listing.partner_email && <ContactRow icon={<Mail className="size-3" />} text={listing.partner_email} />}
                {listing.partner_phone && <ContactRow icon={<Phone className="size-3" />} text={listing.partner_phone} />}
                {listing.partner_address && <ContactRow icon={<MapPin className="size-3" />} text={listing.partner_address} />}
              </div>
              {(listing.partner_type_name || listing.partner_business_type) && (
                <div className="mt-2 grid grid-cols-2 gap-2 pt-2 border-t">
                  {listing.partner_type_name && <KV label="Type" value={listing.partner_type_name} />}
                  {listing.partner_status && <KV label="Status" value={listing.partner_status} />}
                  {listing.partner_business_type && <KV label="Business" value={listing.partner_business_type} />}
                  {listing.partner_joined && <KV label="Joined" value={fmtDate(listing.partner_joined)} />}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Product */}
        <div className="rounded-xl border p-4">
          <SectionHeader icon={<Layers className="size-3.5" />} title="Product" />
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
            {listing.main_category_name && <KV label="Main Category" value={listing.main_category_name} />}
            {listing.sub_category_name && <KV label="Sub Category" value={listing.sub_category_name} />}
            {listing.attachment_category_name && <KV label="Category" value={listing.attachment_category_name} />}
            {listing.model_name && <KV label="Model" value={listing.model_name} />}
            {listing.brand_name && <KV label="Brand" value={listing.brand_name} />}
            <KV label="Type" value={listing.product_type === "equipment" ? "Equipment" : "Attachment"} />
            {listing.hide_partner ? <KV label="Partner Visibility" value="Hidden from listing" /> : null}
          </div>
        </div>
      </div>

      {/* ── Specifications (high priority for enquiries) ── */}
      {customFields.length > 0 && (
        <div className="rounded-xl border p-4">
          <SectionHeader icon={<Package className="size-3.5" />} title="Specifications" />
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {customFields.map((field) => (
              <div key={field.key} className="rounded-lg bg-muted/40 px-3 py-2.5">
                <p className="text-muted-foreground text-[11px] font-medium uppercase tracking-wider">{field.label}</p>
                <p className="mt-0.5 text-sm font-semibold">{field.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Description ── */}
      {listing.description && (
        <div>
          <SectionHeader icon={<Layers className="size-3.5" />} title="Description" />
          <p className="text-muted-foreground mt-2 whitespace-pre-wrap text-sm leading-relaxed">{listing.description}</p>
        </div>
      )}

      {/* ── Approval row ── */}
      <div className="rounded-xl border p-4">
        <SectionHeader icon={<ShieldCheck className="size-3.5" />} title="Approval & Admin" />
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KV label="Status" value={listing.approve_status_name ?? "—"} />
          {listing.approved_by_name && <KV label="Approved By" value={listing.approved_by_name} />}
          {listing.approved_at && <KV label="Approved At" value={fmtDateTime(listing.approved_at)} />}
          {listing.created_by_name && <KV label="Created By" value={listing.created_by_name} />}
        </div>
      </div>

      {/* ── Rejection ── */}
      {listing.rejection_reason && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
          <p className="text-destructive mb-1 text-[11px] font-semibold uppercase tracking-wider">Rejection Reason</p>
          <p className="text-sm leading-relaxed">{listing.rejection_reason}</p>
        </div>
      )}

      {/* ── Timeline ── */}
      <div className="text-muted-foreground flex flex-wrap gap-x-6 gap-y-1 border-t pt-3 text-xs">
        {listing.approved_at && <Ts icon={<CalendarCheck className="size-3" />} label="Listed" value={fmtDate(listing.approved_at)} />}
        <Ts icon={<Clock className="size-3" />} label="Created" value={fmtDateTime(listing.created_at)} />
        <Ts icon={<Pencil className="size-3" />} label="Updated" value={fmtDateTime(listing.updated_at)} />
        {listing.approved_by_name && <Ts icon={<BadgeCheck className="size-3" />} label="By" value={listing.approved_by_name} />}
      </div>
    </div>
  );
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="text-muted-foreground flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider">
      {icon}{title}
    </div>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground text-[11px]">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

function LocationRow({ value, hidden, primary }: { value: string; hidden: boolean; primary?: boolean }) {
  const sizing = primary ? "text-sm font-medium" : "text-xs";
  const color = hidden ? "text-muted-foreground" : primary ? "text-foreground" : "text-muted-foreground";
  return (
    <p className={`${sizing} ${color} flex items-center gap-1.5`}>
      <span className={hidden ? "line-through" : undefined}>{value}</span>
      {hidden ? (
        <span className="text-[10px] italic font-normal text-muted-foreground">(hidden)</span>
      ) : null}
    </p>
  );
}

function ContactRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
      {icon}<span className="truncate">{text}</span>
    </div>
  );
}

function Ts({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      {icon}{label}: <span className="text-foreground font-medium">{value}</span>
    </span>
  );
}
