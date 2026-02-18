"use client";

import { User, Building2, Calendar } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatDate } from "@/lib/utils";
import type { Customer } from "@/types/customer";
import type { BusinessTypeInfo } from "./columns";

interface CustomerDetailDialogProps {
  customer: Customer | null;
  onClose: () => void;
  businessTypeMap: Map<number, BusinessTypeInfo>;
}

export function CustomerDetailDialog({
  customer,
  onClose,
  businessTypeMap,
}: CustomerDetailDialogProps) {
  if (!customer) return null;

  const verified = customer.is_verified === 1;
  const businessTypeInfo = customer.business_type_id
    ? businessTypeMap.get(customer.business_type_id)
    : null;

  return (
    <Dialog open={!!customer} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>{customer.username}</DialogTitle>
            <Badge
              variant={verified ? "success" : "destructive"}
              className="text-xs"
            >
              {verified ? "Verified" : "Unverified"}
            </Badge>
          </div>
          <DialogDescription>{customer.email}</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain space-y-4 pr-1">
          {/* Contact */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <User className="size-4 text-muted-foreground" />
              Contact
            </div>
            <div className="space-y-2.5">
              <DetailRow label="Email" value={customer.email} />
              <DetailRow label="Phone" value={customer.phone} />
            </div>
          </section>

          <Separator />

          {/* Business */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Building2 className="size-4 text-muted-foreground" />
              Business
            </div>
            <div className="space-y-2.5">
              <DetailRow label="Company" value={customer.company_name} />
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground text-sm shrink-0">Type</span>
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
              <DetailRow label="Address" value={customer.office_address} />
            </div>
          </section>

          <Separator />

          {/* Account */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Calendar className="size-4 text-muted-foreground" />
              Account
            </div>
            <div className="space-y-2.5">
              <DetailRow label="Customer ID" value={`#${customer.customer_id}`} />
              <DetailRow label="Joined" value={formatDate(customer.created_at)} />
            </div>
          </section>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
