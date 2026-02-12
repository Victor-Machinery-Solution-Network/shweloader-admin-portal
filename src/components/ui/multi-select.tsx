'use client'

import * as React from 'react'
import { X, ChevronDown, Check } from 'lucide-react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'

const multiSelectVariants = cva('m-1 transition-colors', {
  variants: {
    variant: {
      default:
        'border-foreground/10 text-foreground bg-card hover:bg-card/80',
      secondary:
        'border-foreground/10 bg-secondary text-secondary-foreground hover:bg-secondary/80',
      destructive:
        'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
})

interface MultiSelectOption {
  label: string
  value: string
  icon?: React.ComponentType<{ className?: string }>
  disabled?: boolean
}

interface MultiSelectProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'defaultValue'>,
    VariantProps<typeof multiSelectVariants> {
  options: MultiSelectOption[]
  onValueChange: (value: string[]) => void
  defaultValue?: string[]
  placeholder?: string
  maxCount?: number
  searchable?: boolean
  disabled?: boolean
  className?: string
}

const MultiSelect = React.forwardRef<HTMLButtonElement, MultiSelectProps>(
  (
    {
      options,
      onValueChange,
      variant,
      defaultValue = [],
      placeholder = 'Select options',
      maxCount = 3,
      searchable = true,
      disabled = false,
      className,
      ...props
    },
    ref
  ) => {
    const [selectedValues, setSelectedValues] =
      React.useState<string[]>(defaultValue)
    const [isPopoverOpen, setIsPopoverOpen] = React.useState(false)

    const toggleOption = (optionValue: string) => {
      const option = options.find((o) => o.value === optionValue)
      if (option?.disabled) return
      const newSelected = selectedValues.includes(optionValue)
        ? selectedValues.filter((v) => v !== optionValue)
        : [...selectedValues, optionValue]
      setSelectedValues(newSelected)
      onValueChange(newSelected)
    }

    const handleClear = () => {
      setSelectedValues([])
      onValueChange([])
    }

    const toggleAll = () => {
      const enabledOptions = options.filter((o) => !o.disabled)
      if (selectedValues.length === enabledOptions.length) {
        handleClear()
      } else {
        const allValues = enabledOptions.map((o) => o.value)
        setSelectedValues(allValues)
        onValueChange(allValues)
      }
    }

    return (
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
          <button
            ref={ref}
            disabled={disabled}
            onClick={() => !disabled && setIsPopoverOpen((prev) => !prev)}
            className={cn(
              'border-input bg-background ring-offset-background placeholder:text-muted-foreground focus:ring-ring flex min-h-9 w-full items-center justify-between rounded-xl border px-3 py-1.5 text-sm focus:ring-1 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50',
              className
            )}
            {...props}
          >
            {selectedValues.length > 0 ? (
              <div className="flex flex-1 flex-wrap items-center gap-1">
                {selectedValues.slice(0, maxCount).map((value) => {
                  const option = options.find((o) => o.value === value)
                  return (
                    <Badge
                      key={value}
                      variant="secondary"
                      className={cn(multiSelectVariants({ variant }))}
                    >
                      {option?.icon && (
                        <option.icon className="mr-1 size-3" />
                      )}
                      {option?.label}
                      <span
                        role="button"
                        tabIndex={-1}
                        aria-label="Remove"
                        className="ml-1 rounded-full outline-none hover:opacity-60"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleOption(value)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault()
                            e.stopPropagation()
                            toggleOption(value)
                          }
                        }}
                      >
                        <X className="size-3" aria-hidden="true" />
                      </span>
                    </Badge>
                  )
                })}
                {selectedValues.length > maxCount && (
                  <Badge
                    variant="secondary"
                    className={cn(multiSelectVariants({ variant }))}
                  >
                    +{selectedValues.length - maxCount} more
                  </Badge>
                )}
              </div>
            ) : (
              <span className="text-muted-foreground text-sm">
                {placeholder}
              </span>
            )}
            <div className="flex shrink-0 items-center gap-1 self-stretch">
              {selectedValues.length > 0 && (
                <span
                  role="button"
                  tabIndex={-1}
                  aria-label="Clear all"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleClear()
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      e.stopPropagation()
                      handleClear()
                    }
                  }}
                >
                  <X className="size-4" aria-hidden="true" />
                </span>
              )}
              <Separator orientation="vertical" className="h-full" />
              <ChevronDown className="text-muted-foreground size-4" />
            </div>
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
        >
          <Command>
            {searchable && <CommandInput placeholder="Search\u2026" />}
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup>
                <CommandItem onSelect={toggleAll} className="cursor-pointer">
                  <div
                    className={cn(
                      'border-primary mr-2 flex size-4 items-center justify-center rounded-sm border',
                      selectedValues.length ===
                        options.filter((o) => !o.disabled).length
                        ? 'bg-primary text-primary-foreground'
                        : 'opacity-50 [&_svg]:invisible'
                    )}
                  >
                    <Check className="size-3" />
                  </div>
                  <span>Select All</span>
                </CommandItem>
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup>
                {options.map((option) => {
                  const isSelected = selectedValues.includes(option.value)
                  return (
                    <CommandItem
                      key={option.value}
                      onSelect={() => toggleOption(option.value)}
                      disabled={option.disabled}
                      className="cursor-pointer"
                    >
                      <div
                        className={cn(
                          'border-primary mr-2 flex size-4 items-center justify-center rounded-sm border',
                          isSelected
                            ? 'bg-primary text-primary-foreground'
                            : 'opacity-50 [&_svg]:invisible'
                        )}
                      >
                        <Check className="size-3" />
                      </div>
                      {option.icon && (
                        <option.icon className="text-muted-foreground mr-2 size-4" />
                      )}
                      <span>{option.label}</span>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    )
  }
)
MultiSelect.displayName = 'MultiSelect'

export { MultiSelect, multiSelectVariants }
export type { MultiSelectOption, MultiSelectProps }
