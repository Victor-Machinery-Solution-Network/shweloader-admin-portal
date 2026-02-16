"use client";

import { useState, useCallback, createContext, useContext } from "react";
import { Input } from "@/components/ui/input";

/** Context provided by FormDialog — true after the user clicks submit. */
export const FormSubmittedContext = createContext(false);

interface RequiredInputProps extends React.ComponentProps<typeof Input> {
  errorMessage?: string;
}

/**
 * Inline error for non-native fields (e.g. Combobox).
 * Must be rendered inside FormDialog's children so it reads the correct context.
 */
export function FieldError({ show, message }: { show: boolean; message: string }) {
  const submitted = useContext(FormSubmittedContext);
  if (!submitted || !show) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

/**
 * Input that shows an inline error message when the form is submitted and the field is empty.
 * Uses `aria-invalid` to trigger the red border styling from the Input component.
 */
export function RequiredInput({
  errorMessage = "This field is required",
  onChange,
  ...props
}: RequiredInputProps) {
  const submitted = useContext(FormSubmittedContext);
  const [empty, setEmpty] = useState(!props.defaultValue && !props.value);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setEmpty(!e.target.value.trim());
      onChange?.(e);
    },
    [onChange],
  );

  const showError = submitted && empty;

  return (
    <div className="space-y-1">
      <Input
        {...props}
        required
        aria-invalid={showError || undefined}
        onChange={handleChange}
      />
      {showError && <p className="text-xs text-destructive">{errorMessage}</p>}
    </div>
  );
}
