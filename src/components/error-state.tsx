"use client";

import { useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type ErrorLike = Error & { digest?: string };

export function getErrorCode(error: ErrorLike): string | null {
  const nextCode = (error as unknown as { __NEXT_ERROR_CODE?: string })
    .__NEXT_ERROR_CODE;
  const parts = [nextCode, error.digest].filter(Boolean) as string[];
  return parts.length ? parts.join(" · ") : null;
}

export function ErrorState({
  error,
  reset,
  fallback,
}: {
  error: ErrorLike;
  reset: () => void;
  fallback?: string;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const code = getErrorCode(error);

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="bg-destructive/10 mb-4 rounded-full p-3">
        <AlertCircle className="text-destructive h-6 w-6" />
      </div>
      <h3 className="mb-1 text-lg font-semibold">
        Something went wrong{code ? ` (${code})` : ""}
      </h3>
      <p className="text-muted-foreground mb-4 max-w-sm text-sm">
        {error.message || fallback || "Please try again."}
      </p>
      <Button onClick={reset} variant="outline">
        Try again
      </Button>
    </div>
  );
}
