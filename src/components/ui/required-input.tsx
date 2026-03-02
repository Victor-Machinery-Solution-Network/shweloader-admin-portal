"use client";

import { useState, useCallback, createContext, useContext } from "react";
import { Input } from "@/components/ui/input";

/** Context provided by FormDialog — true after the user clicks submit. */
export const FormSubmittedContext = createContext(false);

interface RequiredInputProps extends React.ComponentProps<typeof Input> {
  errorMessage?: string;
  /** Custom validator — return an error string to show, or "" / undefined to pass. */
  validate?: (value: string) => string | undefined;
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
 * Input that shows an inline error when the form is submitted and validation fails.
 * Checks: empty → custom `validate` → `minLength`. Uses `aria-invalid` for red border.
 */
export function RequiredInput({
  errorMessage = "This field is required",
  validate,
  onChange,
  ...props
}: RequiredInputProps) {
  const submitted = useContext(FormSubmittedContext);
  const initialValue = String(props.defaultValue ?? props.value ?? "");
  const [error, setError] = useState<string>(() => {
    if (!initialValue.trim()) return errorMessage;
    if (validate) return validate(initialValue) ?? "";
    if (props.minLength && initialValue.length < props.minLength)
      return errorMessage;
    return "";
  });

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      if (!v.trim()) {
        setError(errorMessage);
      } else if (validate) {
        setError(validate(v) ?? "");
      } else if (props.minLength && v.length < props.minLength) {
        setError(errorMessage);
      } else {
        setError("");
      }
      onChange?.(e);
    },
    [onChange, errorMessage, validate, props.minLength],
  );

  const showError = submitted && !!error;

  return (
    <div className="space-y-1">
      <Input
        {...props}
        required
        aria-invalid={showError || undefined}
        onChange={handleChange}
      />
      {showError && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
