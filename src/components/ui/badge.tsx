import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "h-5 gap-1 rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium transition-colors has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&>svg]:size-3! inline-flex items-center justify-center w-fit whitespace-nowrap shrink-0 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive overflow-hidden group/badge",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        secondary: "bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80",
        destructive: "bg-destructive/10 [a]:hover:bg-destructive/20 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 text-destructive dark:bg-destructive/20 border-destructive/20 dark:border-destructive/30",
        success: "bg-emerald-600/10 [a]:hover:bg-emerald-600/20 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-600/20 dark:border-emerald-500/30",
        warning: "bg-amber-500/10 [a]:hover:bg-amber-500/20 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 border-amber-500/20 dark:border-amber-500/30",
        equipment: "bg-blue-500/10 [a]:hover:bg-blue-500/20 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 border-blue-500/20 dark:border-blue-500/30",
        attachment: "bg-amber-500/10 [a]:hover:bg-amber-500/20 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 border-amber-500/20 dark:border-amber-500/30",
        "field-text": "bg-blue-500/10 [a]:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/20 dark:border-blue-500/30",
        "field-number": "bg-emerald-500/10 [a]:hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 dark:border-emerald-500/30",
        "field-dropdown": "bg-violet-500/10 [a]:hover:bg-violet-500/20 text-violet-600 dark:text-violet-400 border-violet-500/20 dark:border-violet-500/30",
        "field-boolean": "bg-amber-500/10 [a]:hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/20 dark:border-amber-500/30",
        "field-date": "bg-rose-500/10 [a]:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/20 dark:border-rose-500/30",
        "field-url": "bg-cyan-500/10 [a]:hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border-cyan-500/20 dark:border-cyan-500/30",
        outline: "border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground bg-input/30",
        ghost: "hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
