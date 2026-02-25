"use client";

import { useRef } from "react";
import { Handshake } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { formatDate } from "@/lib/utils";
import type { AppUser } from "@/types/app-user";
import type { BusinessTypeInfo } from "./columns";

interface UserDetailSheetProps {
  user: AppUser | null;
  onClose: () => void;
  businessTypeMap: Map<number, BusinessTypeInfo>;
}

export function UserDetailSheet({
  user,
  onClose,
  businessTypeMap,
}: UserDetailSheetProps) {
  // Keep last user data visible during close animation
  const prevRef = useRef<AppUser | null>(null);
  if (user) prevRef.current = user;
  const data = user ?? prevRef.current;

  const verified = data?.is_verified === 1;
  const businessTypeInfo = data?.business_type_id
    ? businessTypeMap.get(data.business_type_id)
    : null;

  return (
    <Sheet open={!!user} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent className="sm:max-w-md">
        {data && (
          <>
            <SheetHeader className="text-left">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 text-primary flex size-11 items-center justify-center rounded-full text-base font-semibold shrink-0">
                  {data.username.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <SheetTitle className="truncate">
                      {data.username}
                    </SheetTitle>
                    <Badge
                      variant={verified ? "success" : "destructive"}
                      className="text-xs shrink-0"
                    >
                      {verified ? "Verified" : "Unverified"}
                    </Badge>
                    {data.is_approved_partner === 1 && (
                      <Badge variant="success" className="text-xs shrink-0">
                        <Handshake className="size-3" />
                        Partner
                      </Badge>
                    )}
                  </div>
                  <SheetDescription className="truncate">
                    {data.email}
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto overscroll-contain">
              <Separator />
              <div className="p-6 space-y-5">
                <DetailSection title="Contact">
                  <DetailRow label="Email" value={data.email} />
                  <DetailRow label="Phone" value={data.phone} />
                </DetailSection>

                <Separator />

                <DetailSection title="Business">
                  <DetailRow label="Company" value={data.company_name} />
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground text-sm">Type</span>
                    {businessTypeInfo ? (
                      <Badge
                        variant={businessTypeInfo.isListed ? "outline" : "secondary"}
                        className="text-xs"
                      >
                        {businessTypeInfo.name}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </div>
                  <DetailRow label="Address" value={data.office_address} />
                </DetailSection>

                <Separator />

                <DetailSection title="Account">
                  <DetailRow
                    label="User ID"
                    value={`#${data.app_user_id}`}
                  />
                  <DetailRow
                    label="Joined"
                    value={formatDate(data.created_at)}
                  />
                </DetailSection>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      <div className="space-y-2.5">{children}</div>
    </section>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-muted-foreground text-sm shrink-0">{label}</span>
      <span
        className={`text-sm text-right ${value ? "" : "text-muted-foreground"}`}
      >
        {value ?? "—"}
      </span>
    </div>
  );
}
