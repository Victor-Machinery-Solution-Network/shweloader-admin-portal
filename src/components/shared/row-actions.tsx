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
  variant?: "destructive" | "success";
  disabled?: boolean;
  /** Show a separator before this item in the mobile dropdown */
  separatorBefore?: boolean;
}

interface RowActionsProps {
  actions: ActionItem[];
}

export function RowActions({ actions }: RowActionsProps) {
  return (
    <>
      {/* Desktop: inline icon buttons with tooltips */}
      <TooltipProvider>
        <div className="hidden items-center justify-end gap-1 md:flex">
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
                    action.variant === "success" &&
                      "bg-green-600/10 text-green-700 hover:bg-green-600/20 hover:text-green-700 dark:text-green-400 dark:hover:text-green-400",
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
      <div className="flex justify-end md:hidden">
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
                  variant={action.variant === "destructive" ? "destructive" : undefined}
                  className={cn(
                    action.variant === "success" &&
                      "text-green-700 focus:bg-green-600/10 focus:text-green-700 dark:text-green-400 dark:focus:text-green-400",
                  )}
                >
                  <action.icon aria-hidden="true" />
                  {action.label}
                </DropdownMenuItem>
              </Fragment>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}
