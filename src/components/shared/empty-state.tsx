/**
 * Empty state component for tables and lists
 */

import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  /** Expands to fill page height and visually centers content (default: true) */
  fullPage?: boolean;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  fullPage = true,
}: EmptyStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center px-8 text-center",
      fullPage ? "flex-1 pt-4 pb-24" : "flex-1 pb-24"
    )}>
      {Icon && (
        <div className="rounded-full bg-muted p-3 mb-4">
          <Icon className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
        </div>
      )}
      <h3 className="text-lg font-semibold mb-1 text-pretty">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mb-4 max-w-sm">
          {description}
        </p>
      )}
      {action}
    </div>
  );
}
