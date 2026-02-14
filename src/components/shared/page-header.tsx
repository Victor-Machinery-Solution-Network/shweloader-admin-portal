/**
 * Reusable page header component
 * Shows page title, description, and optional actions
 */

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-balance">{title}</h1>
        {description && (
          <p className="text-muted-foreground mt-1 text-pretty">{description}</p>
        )}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}
