"use client";

import { Fragment } from "react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { ComponentType, SVGProps } from "react";

interface ActionItem {
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  onClick: () => void;
  variant?: "destructive";
  disabled?: boolean;
  /** Show a separator before this item in the mobile dropdown */
  separatorBefore?: boolean;
}

interface RowActionsProps {
  actions: ActionItem[];
}

export function RowActions({ actions }: RowActionsProps) {
  return (
    <div className="flex justify-end">
      {/* Desktop: inline icon buttons with tooltips */}
      <TooltipProvider>
        <div className="hidden items-center gap-1 md:flex">
          {actions.map((action) => (
            <Tooltip key={action.label}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={action.onClick}
                  disabled={action.disabled}
                  className={cn(
                    "text-muted-foreground hover:text-foreground",
                    action.variant === "destructive" &&
                      "hover:bg-destructive/10 hover:text-destructive",
                  )}
                >
                  <action.icon aria-hidden="true" />
                  <span className="sr-only">{action.label}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">{action.label}</TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>

      {/* Mobile: dropdown menu */}
      <div className="md:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground"
            >
              <MoreHorizontal aria-hidden="true" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {actions.map((action) => (
              <Fragment key={action.label}>
                {action.separatorBefore && <DropdownMenuSeparator />}
                <DropdownMenuItem
                  onSelect={action.onClick}
                  disabled={action.disabled}
                  variant={action.variant}
                >
                  <action.icon aria-hidden="true" />
                  {action.label}
                </DropdownMenuItem>
              </Fragment>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export type { ActionItem };
