import { Phone, Mail, Building2, MapPin, AtSign, Briefcase, Calendar, BadgeCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { assetUrl } from "@/lib/r2-url";
import { format } from "date-fns";
import type { ChatSessionWithDetails, ProductDiscussed } from "@/types/chat";

interface ContextPanelProps {
  session: ChatSessionWithDetails | null;
  products: ProductDiscussed[];
}

const STATUS_VARIANT = {
  pending: "equipment",
  active: "success",
  resolved: "secondary",
} as const;

const STATUS_LABEL = {
  pending: "Pending",
  active: "Active",
  resolved: "Resolved",
} as const;

function formatPrice(
  mmkPrice: number | null,
  usdPrice: number | null,
  displayCurrency: string | null,
): string {
  if (displayCurrency === "USD" && usdPrice != null) {
    return `$${usdPrice.toLocaleString()}`;
  }
  if (mmkPrice != null) {
    return `${mmkPrice.toLocaleString()} MMK`;
  }
  if (usdPrice != null) {
    return `$${usdPrice.toLocaleString()}`;
  }
  return "Price on request";
}

function formatDate(dateStr: string): string {
  try {
    const date = dateStr.endsWith("Z") ? new Date(dateStr) : new Date(dateStr + "Z");
    return format(date, "MMM d, yyyy");
  } catch {
    return "";
  }
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();
}

export function ContextPanel({ session, products }: ContextPanelProps) {
  if (!session) {
    return (
      <div className="w-[260px] shrink-0 border-l bg-muted/10 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Select a conversation</p>
      </div>
    );
  }

  return (
    <div className="w-[260px] shrink-0 border-l bg-muted/10 overflow-y-auto">
      {/* User Info */}
      <div className="flex flex-col items-center gap-2 p-4 border-b">
        <div className="size-14 rounded-full bg-secondary flex items-center justify-center">
          <span className="text-lg font-semibold text-secondary-foreground">
            {getInitials(session.user_name)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <p className="font-semibold text-sm text-center">{session.user_name}</p>
          {session.user_is_verified === 1 && (
            <BadgeCheck className="size-3.5 text-emerald-500 shrink-0" />
          )}
        </div>
        <p className="text-[11px] text-muted-foreground">@{session.user_username}</p>
        <div className="flex flex-col gap-1.5 w-full mt-1">
          {session.user_phone && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Phone className="size-3 shrink-0" />
              <span className="truncate">{session.user_phone}</span>
            </div>
          )}
          {session.user_email && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Mail className="size-3 shrink-0" />
              <span className="truncate">{session.user_email}</span>
            </div>
          )}
          {session.user_company && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Building2 className="size-3 shrink-0" />
              <span className="truncate">{session.user_company}</span>
            </div>
          )}
          {session.user_address && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin className="size-3 shrink-0" />
              <span className="truncate">{session.user_address}</span>
            </div>
          )}
          {session.user_business_type && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Briefcase className="size-3 shrink-0" />
              <span className="truncate">{session.user_business_type}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="size-3 shrink-0" />
            <span className="truncate">Joined {formatDate(session.user_joined)}</span>
          </div>
        </div>
      </div>

      {/* Products Discussed */}
      <div className="p-4 border-b">
        <h3 className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-3">
          Products Discussed ({products.length})
        </h3>
        {products.length === 0 ? (
          <p className="text-xs text-muted-foreground">No products discussed</p>
        ) : (
          <div className="flex flex-col gap-2">
            {products.map((product) => {
              const url = `/listings/for-${product.listingType}/${product.listingId}/edit`;
              return (
                <a
                  key={`${product.listingType}-${product.listingId}`}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex gap-2 items-center rounded-lg p-2 hover:bg-muted/50 transition-colors"
                >
                  <div className="size-10 rounded-md overflow-hidden bg-muted shrink-0 flex items-center justify-center">
                    {product.productThumbnail ? (
                      <img
                        src={assetUrl(product.productThumbnail) ?? undefined}
                        alt={product.productName ?? "Product"}
                        className="object-cover size-full"
                      />
                    ) : (
                      <div className="size-full bg-muted" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    {product.brandName && (
                      <p className="text-[10px] uppercase text-muted-foreground truncate">
                        {product.brandName}
                      </p>
                    )}
                    <p className="text-xs font-medium truncate">
                      {product.productName ?? "Unnamed"}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] text-muted-foreground">
                        {formatPrice(product.mmkPrice, product.usdPrice, product.displayCurrency)}
                      </span>
                      <Badge
                        variant={product.listingType === "sale" ? "equipment" : "attachment"}
                        className="text-[10px] h-4 px-1"
                      >
                        {product.listingType === "sale" ? "Sale" : "Rent"}
                      </Badge>
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </div>

      {/* Session Info */}
      <div className="p-4">
        <h3 className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-3">
          Session Info
        </h3>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Status</span>
            <Badge variant={STATUS_VARIANT[session.status]}>
              {STATUS_LABEL[session.status]}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Started</span>
            <span className="text-xs">{formatDate(session.created_at)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
