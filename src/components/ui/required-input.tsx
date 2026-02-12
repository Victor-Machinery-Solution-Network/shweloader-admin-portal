"use client";

import { useState, useCallback, useRef } from "react";
import { Input } from "@/components/ui/input";

interface RequiredInputProps extends React.ComponentProps<typeof Input> {
  errorMessage?: string;
}

/**
 * Input that shows an inline error message on blur when the field is empty.
 * Uses `aria-invalid` to trigger the red border styling from the Input component.
 */
export function RequiredInput({
  errorMessage = "This field is required",
  onBlur,
  onChange,
  ...props
}: RequiredInputProps) {
  const [touched, setTouched] = useState(false);
  const [empty, setEmpty] = useState(!props.defaultValue && !props.value);
  const mountedRef = useRef(false);

  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      mountedRef.current = true;
      setTouched(true);
      setEmpty(!e.target.value.trim());
      onBlur?.(e);
    },
    [onBlur],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (touched) {
        setEmpty(!e.target.value.trim());
      }
      onChange?.(e);
    },
    [touched, onChange],
  );

  const showError = touched && empty;

  return (
    <div className="space-y-1">
      <Input
        {...props}
        required
        aria-invalid={showError || undefined}
        onBlur={handleBlur}
        onChange={handleChange}
      />
      {showError && <p className="text-xs text-destructive">{errorMessage}</p>}
    </div>
  );
}
